import argparse
import configparser
import datetime
import glob
import logging
import copy

#import multiprocessing

import ray
from ray.util.multiprocessing import Pool

import os
import sys
import time
from functools import partial

from histoqc._pipeline import BatchedResultFile
from histoqc._pipeline import MultiProcessingLogManager
from histoqc._pipeline import load_pipeline
from histoqc._pipeline import log_pipeline
from histoqc._pipeline import move_logging_file_handler
from histoqc._pipeline import setup_logging
from histoqc._pipeline import setup_plotting_backend
from histoqc._worker import worker
#from histoqc._worker import worker_setup
from histoqc._worker import worker_success
from histoqc._worker import worker_error
from histoqc.config import read_config_template
from histoqc.data import managed_pkg_data


@ray.remote
class SharedStore:
    def __init__(self):
        self.global_dict = {}

    def set_global_var(self, key,var):
        self.global_dict[key] = var

    def get_global_var(self,key):
        return self.global_dict.get(key)


@managed_pkg_data
def main(argv=None):
    """main entry point for histoqc pipelines"""
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(prog="histoqc", description='Run HistoQC main quality control pipeline for digital pathology images')
    parser.add_argument('input_pattern',
                        help="input filename pattern (try: *.svs or target_path/*.svs ),"
                             " or tsv file containing list of files to analyze",
                        nargs="+")
    parser.add_argument('-o', '--outdir',
                        help="outputdir, default ./histoqc_output_YYMMDD-hhmmss",
                        default=f"./histoqc_output_{time.strftime('%Y%m%d-%H%M%S')}",
                        type=str)
    parser.add_argument('-p', '--basepath',
                        help="base path to add to file names,"
                             " helps when producing data using existing output file as input",
                        default="",
                        type=str)
    parser.add_argument('-c', '--config',
                        help="config file to use, either by name supplied by histoqc.config (e.g., v2.1) or filename",
                        type=str)
    parser.add_argument('-f', '--force',
                        help="force overwriting of existing files",
                        action="store_true")
    parser.add_argument('-b', '--batch',
                        help="break results file into subsets of this size",
                        type=int,
                        default=None)
    parser.add_argument('-n', '--nprocesses',
                        help="number of processes to launch",
                        type=int,
                        default=1)
    parser.add_argument('--symlink', metavar="TARGET_DIR",
                        help="create symlink to outdir in TARGET_DIR",
                        default=None)
    args = parser.parse_args(argv)

    # --- multiprocessing and logging setup -----------------------------------

    setup_logging(capture_warnings=True, filter_warnings='ignore')
    # mpm = multiprocessing.Manager()
    # lm = MultiProcessingLogManager('histoqc', manager=mpm)

    # --- parse the pipeline configuration ------------------------------------

    config = configparser.ConfigParser()
    if not args.config:
        logging.warning(f"Configuration file not set (--config), using default")
        config.read_string(read_config_template('default'))
    elif os.path.exists(args.config):
        config.read(args.config) #Will read the config file
    else:
        logging.warning(f"Configuration file {args.config} assuming to be a template...checking.")
        config.read_string(read_config_template(args.config))

    # --- provide models, pen and templates as fallbacks from package data ----

    managed_pkg_data.inject_pkg_data_fallback(config)

    # --- load the process queue (error early) --------------------------------

    _steps = log_pipeline(config)
    process_queue = load_pipeline(config)

    # --- check symlink target ------------------------------------------------

    if args.symlink is not None:
        if not os.path.isdir(args.symlink):
            logging.error("error: --symlink {args.symlink} is not a directory")
            return -1

    # --- create output directory and move log --------------------------------
    args.outdir = os.path.expanduser(args.outdir)
    os.makedirs(args.outdir, exist_ok=True)
    move_logging_file_handler(logging.getLogger(), args.outdir)

    if BatchedResultFile.results_in_path(args.outdir):
        if args.force:
            logging.info("Previous run detected....overwriting (--force set)")
        else:
            logging.info("Previous run detected....skipping completed (--force not set)")

    results = BatchedResultFile(args.outdir, force_overwrite=args.force)

    # --- document configuration in results -----------------------------------

    results.add_header(f"start_time:\t{datetime.datetime.now()}")
    results.add_header(f"pipeline:\t{' '.join(_steps)}")
    results.add_header(f"outdir:\t{os.path.realpath(args.outdir)}")
    results.add_header(f"config_file:\t{os.path.realpath(args.config) if args.config is not None else 'default'}")
    results.add_header(f"command_line_args:\t{' '.join(argv)}")

    # --- receive input file list (there are 3 options) -----------------------
    args.basepath = os.path.expanduser(args.basepath)
    if len(args.input_pattern) > 1:
        # more than one input_pattern is interpreted as a list of files
        # (basepath is ignored)
        files = list(args.input_pattern)

    elif args.input_pattern[0].endswith('.tsv'):
        # input_pattern is a tsv file containing a list of files
        files = []
        with open(args.input_pattern[0], 'rt') as f:
            for line in f:
                if line[0] == "#":
                    continue
                fn = line.strip().split("\t")[0]
                files.append(os.path.join(args.basepath, fn))

    else:
        # input_pattern is a glob pattern
        pth = os.path.join(args.basepath, args.input_pattern[0])
        files = glob.glob(pth, recursive=True)

    logging.info("-" * 80)
    num_files = len(files)
    logging.info(f"Number of files detected by pattern:\t{num_files}")

    # --- start worker processes ----------------------------------------------



    failed = [] # mpm.list()
    setup_plotting_backend(logging)

    ray.init()
    sharedStore_actor = SharedStore.remote()
    ray.get(sharedStore_actor.set_global_var.remote('test','my-test-worked')) #need to call get so it executes

    try:
        '''MAX_NUMBER_PENDING_TASKS = 50
        # To clarify the difference between result_refs, result_data, and results:
        # result_refs is a list of references to the results of the tasks.
        # result_data is a list of the actual results of the tasks.
        # results is the BatchedResultsFile object that we use to store the results.
        result_refs = []
        # result_data = []
        for idx, file_name in enumerate(files):
            if len(result_refs) > MAX_NUMBER_PENDING_TASKS:
                # update result_refs to only
                # track the remaining tasks.
                ready_refs, result_refs = ray.wait(result_refs, num_returns=10) # minimize overhead of ray.get() by increasing num_returns

                # get the results from the finished tasks
                for r in ray.get(ready_refs):
                    worker_success(r, results)

            result_refs.append(worker.remote(idx, file_name, process_queue=process_queue, config=config, outdir=args.outdir,
                   num_files=num_files, force=args.force , sharedStore_actor=sharedStore_actor))
        #breakpoint()
        for r in ray.get(result_refs):
            worker_success(r, results)'''
        #breakpoint()
        # for r in result_data:
        #     worker_success(r, results)

        # del result_data # free up memory. Might be done automatically by python garbage collector.


        futures = []
        for idx, file_name in enumerate(files):
            futures.append(worker.remote(idx, file_name, process_queue=process_queue, config=config, outdir=args.outdir,
                   num_files=num_files, force=args.force , sharedStore_actor=sharedStore_actor))

        for f in futures:
            s = ray.get(f)
            worker_success(s, results)  # figure out if success or failure, here i only deal with the success case



    except KeyboardInterrupt:
        logging.info("-----REQUESTED-ABORT-----\n")

    else:
        logging.info("----------Done-----------\n")

    finally:
        logging.info(f"There are {len(failed)} explicitly failed images (available also in error.log),"
                       " warnings are listed in warnings column in output")

        for file_name, error, tb in failed:
            logging.info(f"{file_name}\t{error}\n{tb}")

    if args.symlink is not None:
        origin = os.path.realpath(args.outdir)
        target = os.path.join(
            os.path.realpath(args.symlink),
            os.path.basename(origin)
        )
        try:
            os.symlink(origin, target, target_is_directory=True)
            logging.info("Symlink to output directory created")
        except (FileExistsError, FileNotFoundError):
            logging.error(
                f"Error creating symlink to output in '{args.symlink}', "
                f"Please create manually: ln -s {origin} {target}"
            )
    return 0

if __name__ == "__main__":
    sys.exit(main())
