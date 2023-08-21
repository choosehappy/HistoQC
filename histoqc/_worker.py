"""histoqc worker functions"""
import os
import shutil
import numpy as np

import ray

import logging
from histoqc._pipeline import setup_logging


from histoqc.BaseImage import BaseImage
from histoqc._pipeline import load_pipeline
from histoqc._pipeline import setup_plotting_backend


# --- worker functions --------------------------------------------------------
#
# def worker_setup(c):
#     """needed for multiprocessing worker setup"""
#     setup_plotting_backend()
#     load_pipeline(config=c)
#
def clean_s(s: dict):
    out = {}
    out['output'] = s['output']
    out['warnings'] = s['warnings']
    for field in s['output']:
        out[field] = s[field]

    return out

@ray.remote
def worker(idx, file_name, process_queue, config, outdir, num_files, force, sharedStore_actor): #log_manager, lock, shared_dict, ):
    """pipeline worker function"""
    setup_logging(capture_warnings=True, filter_warnings='ignore')


    # --- output directory preparation --------------------------------
    fname_outdir = os.path.join(outdir, os.path.basename(file_name))
    if os.path.isdir(fname_outdir):  # directory exists
        if not force:
            logging.warning(
                f"{file_name} already seems to be processed (output directory exists),"
                " skipping. To avoid this behavior use --force"
            )
            return
        else:
            # remove entire directory to ensure no old files are present
            shutil.rmtree(fname_outdir)
    # create output dir
    os.makedirs(fname_outdir)

    logging.info(f"-----Working on:\t{file_name}\t\t{idx+1} of {num_files}")

    try:
        breakpoint()
        s = BaseImage(file_name, fname_outdir, dict(config.items("BaseImage.BaseImage")))
        for process, process_params in process_queue:
            #process_params["lock"] = lock
            process_params["sharedStore_actor"] = sharedStore_actor
            process(s, process_params)
            s["completed"].append(process.__name__)

    except Exception as exc:
        # reproduce histoqc error string
        _oneline_doc_str = exc.__doc__.replace('\n', '')
        err_str = f"{exc.__class__} {_oneline_doc_str} {exc}"

        logging.error(
            f"{file_name} - Error analyzing file (skipping): \t {err_str}"
        )
        if exc.__traceback__.tb_next is not None:
            func_tb_obj = str(exc.__traceback__.tb_next.tb_frame.f_code)
        else:
            func_tb_obj = str(exc.__traceback__)

        exc.__histoqc_err__ = (file_name, err_str, func_tb_obj)
        # raise exc

    else:
        # TODO:
        #   the histoqc workaround below is due an implementation detail in BaseImage:
        #   BaseImage keeps an OpenSlide instance stored under os_handle and leaks a
        #   file handle. This will need fixing in BaseImage.
        #   -> best solution would be to make BaseImage a contextmanager and close
        #      and cleanup the OpenSlide handle on __exit__
        s["os_handle"] = None  # need to get rid of handle because it can't be pickled

        s = clean_s(s)
        return s


def worker_success(s, result_file):
    """success callback"""
    if s is None:
        return

    with result_file:
        if result_file.is_empty_file():
            result_file.write_headers(s)

        _fields = '\t'.join([str(s[field]) for field in s['output']])
        _warnings = '|'.join(s['warnings'])
        result_file.write_line("\t".join([_fields, _warnings]))


def worker_error(e, failed):
    """error callback"""
    if hasattr(e, '__histoqc_err__'):
        file_name, err_str, tb = e.__histoqc_err__
    else:
        # error outside of pipeline
        # todo: it would be better to handle all of this as a decorator
        #   around the worker function
        file_name, err_str, tb = "N/A", f"error outside of pipeline {e!r}", None
    failed.append((file_name, err_str, tb))
