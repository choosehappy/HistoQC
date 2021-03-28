import argparse
import configparser
import datetime
import glob
import logging
import multiprocessing
import os
import shutil
import sys
import time
from functools import partial

from histoqc.BaseImage import BaseImage
from histoqc._pipeline import BatchedResultFile
from histoqc._pipeline import MultiProcessingLogManager
from histoqc._pipeline import load_pipeline
from histoqc._pipeline import log_pipeline
from histoqc._pipeline import move_logging_file_handler
from histoqc._pipeline import setup_logging
from histoqc._pipeline import setup_plotting_backend
from histoqc.config import read_config_template


# --- setup worker functions --------------------------------------------------

def worker(idx, file_name, *,
           process_queue, config, outdir, log_manager, lock, shared_dict, num_files, force):
    """pipeline worker function"""

    # --- output directory preparation --------------------------------
    fname_outdir = os.path.join(outdir, os.path.basename(file_name))
    if os.path.isdir(fname_outdir):  # directory exists
        if not force:
            log_manager.logger.warning(
                f"{file_name} already seems to be processed (output directory exists),"
                " skipping. To avoid this behavior use --force"
            )
            return
        else:
            # remove entire directory to ensure no old files are present
            shutil.rmtree(fname_outdir)
            os.makedirs(fname_outdir)

    log_manager.logger.info(f"-----Working on:\t{file_name}\t\t{idx+1} of {num_files}")

    try:
        s = BaseImage(file_name, fname_outdir, dict(config.items("BaseImage.BaseImage")))

        for process, process_params in process_queue:
            process_params["lock"] = lock
            process_params["shared_dict"] = shared_dict
            process(s, process_params)
            s["completed"].append(process.__name__)

    except Exception as exc:
        # reproduce histoqc error string
        _oneline_doc_str = exc.__doc__.replace('\n', '')
        err_str = f"{exc.__class__} {_oneline_doc_str} {exc}"

        log_manager.logger.error(
            f"{file_name} - Error analyzing file (skipping): \t {err_str}"
        )
        func_tb_obj = (file_name, str(exc.__traceback__.tb_next.tb_frame.f_code))
        exc.__histoqc_err__ = (file_name, err_str, func_tb_obj)
        raise exc

    else:
        # TODO:
        #   the histoqc workaround below is due an implementation detail in BaseImage:
        #   BaseImage keeps an OpenSlide instance stored under os_handle and leaks a
        #   file handle. This will need fixing in BaseImage.
        #   -> best solution would be to make BaseImage a contextmanager and close
        #      and cleanup the OpenSlide handle on __exit__
        s["os_handle"] = None  # need to get rid of handle because it can't be pickled
        return s


def worker_success(s, result_file):
    """success callback"""
    if s is None:
        return

    with result_file:
        if result_file.is_empty_file():
            result_file.write_headers(s)

        _fields = '\t'.join(str(s[field]) for field in s['output'])
        _warnings = '|'.join(s['warnings'])
        result_file.write_line("\t".join([*_fields, _warnings]))


def worker_error(e, failed):
    """error callback"""
    if hasattr(e, '__histoqc_err__'):
        file_name, err_str, _ = e.__histoqc_err__
    else:
        # error outside of pipeline
        # todo: it would be better to handle all of this as a decorator
        #   around the worker function
        file_name, err_str = "N/A", "error outside of pipeline"
    failed.append((file_name, err_str))


def main(argv=None):
    """main entry point for histoqc pipelines"""
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(description='')
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
                        help="config file to use",
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
    parser.add_argument('-s', '--symlinkoff',
                        help="turn OFF symlink creation",
                        action="store_true")
    args = parser.parse_args(argv)

    # --- multiprocessing and logging setup -----------------------------------

    setup_logging(capture_warnings=True, filter_warnings='ignore')
    mpm = multiprocessing.Manager()
    lm = MultiProcessingLogManager('histoqc', manager=mpm)

    # --- parse the pipeline configuration ------------------------------------

    config = configparser.ConfigParser()
    if args.config is None:
        lm.logger.warning(f"Configuration file not set (--config), using default")
        config.read_string(read_config_template())
    else:
        config.read_file(args.config)

    # --- load the process queue (error early) --------------------------------

    _steps = log_pipeline(config, log_manager=lm)
    process_queue = load_pipeline(config)

    # --- create output directory and move log --------------------------------

    os.makedirs(args.outdir, exist_ok=True)
    move_logging_file_handler(lm.logger, args.outdir)

    if BatchedResultFile.results_in_path(args.outdir):
        if args.force:
            lm.logger.info("Previous run detected....overwriting (--force set)")
        else:
            lm.logger.info("Previous run detected....skipping completed (--force not set)")

    results = BatchedResultFile(args.outdir,
                                manager=mpm,
                                batch_size=args.batch_size,
                                force_overwrite=args.force)

    # --- document configuration in results -----------------------------------

    results.add_header(f"start_time:\t{datetime.datetime.now()}")
    results.add_header(f"pipeline: {' '.join(_steps)}")
    results.add_header(f"outdir:\t{os.path.realpath(args.outdir)}")
    results.add_header(f"config_file:\t{os.path.realpath(args.config)}")
    results.add_header(f"command_line_args:\t{' '.join(argv)}")

    # --- receive input file list (there are 3 options) -----------------------

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

    lm.logger.info("-" * 80)
    num_files = len(files)
    lm.logger.info(f"Number of files detected by pattern:\t{num_files}")

    # --- start worker processes ----------------------------------------------

    _shared_state = {
        'process_queue': process_queue,
        'config': config,
        'results_file': results,
        'log_manager': lm,
        'lock': mpm.Lock(),
        'shared_dict': mpm.dict(),
        'num_files': num_files,
        'force': args.force,
    }
    failed = mpm.list()
    setup_plotting_backend(lm.logger)

    if args.nprocesses > 1:
        def _worker_setup(c):
            setup_plotting_backend()
            load_pipeline(config=c)

        with multiprocessing.Pool(processes=args.nprocesses,
                                  initializer=_worker_setup,
                                  initargs=(config,)) as pool:
            for idx, file_name in enumerate(files):
                _ = pool.apply_async(
                    func=worker,
                    args=(idx, file_name),
                    kwds=_shared_state,
                    callback=worker_success,
                    error_callback=partial(worker_error, failed),
                )

            pool.close()
            pool.join()

    else:
        for idx, file_name in enumerate(files):
            try:
                _success = worker(idx, file_name, **_shared_state)
            except Exception as exc:
                worker_error(exc, failed)
                continue
            else:
                worker_success(_success, results)

    # --- processing finished -------------------------------------------------

    lm.logger.info("------------Done---------\n")
    lm.logger.info("These images failed (available also in error.log),"
                   " warnings are listed in warnings column in output:")

    for file_name, error in failed:
        lm.logger.info(f"{file_name}\t{error}")

    if not args.symlinkoff:
        # FIXME: this needs to be refactored to work...
        origin = os.path.realpath(args.outdir)
        target = os.path.normpath(os.path.dirname(os.path.realpath(__file__)) + "/UserInterface/Data/" +
                                  os.path.basename(os.path.normpath(args.outdir)))
        try:
            os.symlink(origin, target, target_is_directory=True)
            logging.info("Symlink to output directory created")

        except (FileExistsError, FileNotFoundError):
            logging.error(f"Error creating symlink to output in UserInterface/Data,"
                          " need to perform this manually for output to work! ln -s {origin} {target}")


if __name__ == "__main__":
    main()
