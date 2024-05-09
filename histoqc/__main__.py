import argparse
import configparser
import datetime
import glob
import logging
import multiprocessing
import os
import sys
import time
# from functools import partial
from typing import Tuple, Optional, List

import dask.distributed

from histoqc._pipeline import BatchedResultFile
# from histoqc._pipeline import MultiProcessingLogManager
from copy import deepcopy
from histoqc._logging import LoggingSetup, MAIN_CONF_BUILD, WORKER_CONF_BUILD, DEFAULT_LOG_FN, HDL_FILE, HDL_OUT_FIELD
from histoqc._pipeline import load_pipeline
from histoqc._pipeline import log_pipeline
from histoqc._pipeline import move_logging_file_handler
# from histoqc._pipeline import setup_logging
from histoqc._pipeline import setup_plotting_backend
from histoqc._worker import (worker, worker_setup, worker_success, worker_error, worker_single_process,
                             PARAM_SHARE, KEY_ASSIGN)

from histoqc.config import read_config_template
from histoqc.data import managed_pkg_data
from histoqc.wsi_handles.constants import KEY_CUCIM
from histoqc.import_wrapper.cupy_extra import cp, cupy_installed
from histoqc.import_wrapper.dask_cuda import dask_cuda_installed, dask_cuda
from dask.distributed import Client, as_completed


def parse_config(args: argparse.Namespace) -> Tuple[configparser.ConfigParser, Optional[str]]:
    config = configparser.ConfigParser()
    msg = None
    if not args.config:
        msg = f"Configuration file not set (--config), using default"
        config.read_string(read_config_template('default'))
    elif os.path.exists(args.config):
        config.read(args.config)  # Will read the config file
    else:
        msg = f"Configuration file {args.config} assuming to be a template...checking."
        config.read_string(read_config_template(args.config))
    return config, msg


def _get_device_list(n_proc: int):
    return list(range(n_proc)) if n_proc > 0 else [0]


def parse_multiprocessing(args: argparse.Namespace,
                          config: configparser.ConfigParser) -> Tuple[argparse.Namespace, bool]:  # List[int],
    is_multiproc = args.nprocesses >= 0
    is_cuda = KEY_CUCIM in config["BaseImage.BaseImage"].get("handles", "")

    # if use cuda but without installation of dependencies - return
    if not is_cuda or not (cupy_installed() and dask_cuda_installed()):
        return args, False  # _get_device_list(args.nprocesses),
    # guard
    assert is_cuda and cp is not None and dask_cuda is not None, f"Enable CUDA but Dep is not installed"
    # set spawn
    if is_multiproc:
        multiprocessing.set_start_method("spawn", force=True)
    num_devices = cp.cuda.runtime.getDeviceCount()
    # n_proc cannot exceed num of GPUs.
    assert num_devices > 0, f"Fail to detect usable CUDA devices"
    if args.nprocesses > num_devices:
        logging.warning(f"{__name__}: CUDA enabled but number of processes is greater than number of devices:"
                        f"{args.nprocesses} > {num_devices}. Cutoff the number of processes to {num_devices}")
    args.nprocesses = min(args.nprocesses, num_devices)
    # device list --> if
    # device_list = _get_device_list(args.nprocesses)
    return args, is_cuda


def new_cluster(name: str, is_cuda: bool, nprocesses: int, gpu_ids: Optional[List[int]]):
    assert nprocesses > 0, f"Expect number of processes > 0 to launch the cluster. Get {nprocesses}"
    if not is_cuda:
        return dask.distributed.LocalCluster(name=name, n_workers=nprocesses, )
    assert cp is not None and dask_cuda is not None
    return dask_cuda.LocalCUDACluster(name=name, CUDA_VISIBLE_DEVICES=gpu_ids, n_workers=nprocesses)


@managed_pkg_data
def main(argv=None):
    """main entry point for histoqc pipelines"""
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(prog="histoqc",
                                     description='Run HistoQC main quality control pipeline'
                                                 ' for digital pathology images')
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
    parser.add_argument('--gpu_ids',
                        type=int,
                        nargs='+',
                        help="GPU Devices to use (None=use all). Default: None",
                        default=None)
    args = parser.parse_args(argv)

    # --- multiprocessing and logging setup -----------------------------------

    # --- parse the pipeline configuration ------------------------------------
    config, conf_warn_msg = parse_config(args)
    args, is_cuda = parse_multiprocessing(args, config)

    # --- create output directory and move log --------------------------------
    args.outdir = os.path.expanduser(args.outdir)
    os.makedirs(args.outdir, exist_ok=True)
    # move_logging_file_handler(logging.getLogger(), args.outdir)

    logging_setup = LoggingSetup(deepcopy(MAIN_CONF_BUILD),
                                 deepcopy(WORKER_CONF_BUILD),
                                 capture_warnings=True, filter_warnings='ignore')
    # setup main proc logger config and file handler.
    logging_setup.setup_main_logger(output_dir=args.outdir, fname=DEFAULT_LOG_FN,
                                    handler_name=HDL_FILE, out_field=HDL_OUT_FIELD)

    # Inherit from the root logger.
    main_logger = logging.getLogger(__name__)
    if conf_warn_msg:
        main_logger.warning(conf_warn_msg)

    # --- provide models, pen and templates as fallbacks from package data ----

    managed_pkg_data.inject_pkg_data_fallback(config)

    # --- load the process queue (error early) --------------------------------

    _steps = log_pipeline(config, logger=main_logger)
    process_queue = load_pipeline(config)

    # --- check symlink target ------------------------------------------------
    if args.symlink is not None:
        if not os.path.isdir(args.symlink):
            main_logger.error("error: --symlink {args.symlink} is not a directory")
            return -1

    if BatchedResultFile.results_in_path(args.outdir):
        if args.force:
            main_logger.info("Previous run detected....overwriting (--force set)")
        else:
            main_logger.info("Previous run detected....skipping completed (--force not set)")
    # for writing the results after workers succeed.
    mpm = multiprocessing.Manager()
    # results only utilize the lock and sync list from mpm. mpm is not saved.
    results = BatchedResultFile(args.outdir,
                                manager=mpm,
                                batch_size=args.batch,
                                force_overwrite=args.force)

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

    main_logger.info("-" * 80)
    num_files = len(files)
    main_logger.info(f"Number of files detected by pattern:\t{num_files}")

    # --- start worker processes ----------------------------------------------

    _shared_state = {
        'process_queue': process_queue,
        'config': config,
        'outdir': args.outdir,
        'lock': mpm.Lock(),  # todo transit to Dask's Lock
        PARAM_SHARE: mpm.dict(),  # todo transit to Dask's Variable
        'num_files': num_files,
        'force': args.force,
    }
    # init the dict of device assignment
    _shared_state[PARAM_SHARE][KEY_ASSIGN] = mpm.dict()
    failed = mpm.list()
    setup_plotting_backend(main_logger)

    try:

        if args.nprocesses > 0:
            local_cluster = new_cluster('histoqc', is_cuda=is_cuda,
                                        nprocesses=args.nprocesses, gpu_ids=args.gpu_ids)
            with Client(local_cluster) as client:
                # register the worker side
                logging_setup.setup_client(client, forward_name="root")

                # noinspection PyTypeChecker
                futures_list = [client.submit(worker, idx, file_name, **_shared_state)
                                for idx, file_name in enumerate(files)]

                for future in as_completed(futures_list):
                    try:
                        base_img_finished = future.result()
                    except Exception as exc:
                        worker_error(exc, failed)
                    else:
                        worker_success(base_img_finished, result_file=results)
        else:
            worker_setup()
            worker_single_process(files, failed, results, **_shared_state)

    except KeyboardInterrupt:
        main_logger.info("-----REQUESTED-ABORT-----\n")

    else:
        main_logger.info("----------Done-----------\n")

    finally:
        main_logger.info(f"There are {len(failed)} explicitly failed images (available also in error.log),"
                         " warnings are listed in warnings column in output")

        for file_name, error, tb in failed:
            main_logger.info(f"{file_name}\t{error}\n{tb}")

    if args.symlink is not None:
        origin = os.path.realpath(args.outdir)
        target = os.path.join(
            os.path.realpath(args.symlink),
            os.path.basename(origin)
        )
        try:
            os.symlink(origin, target, target_is_directory=True)
            main_logger.info("Symlink to output directory created")
        except (FileExistsError, FileNotFoundError):
            main_logger.error(
                f"Error creating symlink to output in '{args.symlink}', "
                f"Please create manually: ln -s {origin} {target}"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
