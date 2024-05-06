"""histoqc worker functions"""
import multiprocessing
import os
import shutil
import traceback
from histoqc.BaseImage import BaseImage
from histoqc._pipeline import load_pipeline
from histoqc._pipeline import setup_plotting_backend
from typing import Dict, List, Optional
from multiprocessing import managers

KEY_ASSIGN: str = 'device_assign'
PARAM_SHARE: str = 'shared_dict'


# --- worker functions --------------------------------------------------------
def id_assign_helper(device_id_list: List[int], assign_dict: managers.DictProxy):
    pid = os.getpid()
    for device_id in device_id_list:
        if device_id not in assign_dict.values():
            assign_dict[pid] = device_id
            return


def device_assign(device_id_list: List[int], shared_dict: managers.DictProxy):
    """Initializer to configure each worker with a specific GPU."""
    shared_dict[KEY_ASSIGN] = shared_dict.get(KEY_ASSIGN, None)
    assert shared_dict[KEY_ASSIGN] is not None
    assert KEY_ASSIGN in shared_dict
    id_assign_helper(device_id_list, shared_dict[KEY_ASSIGN])


def worker_setup(c, device_id_list: List[int], state: Dict):
    """needed for multiprocessing worker setup"""
    setup_plotting_backend()
    shared_dict = state[PARAM_SHARE]
    load_pipeline(config=c)
    device_assign(device_id_list, shared_dict)


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
    # create output dir
    os.makedirs(fname_outdir)

    log_manager.logger.info(f"-----Working on:\t{file_name}\t\t{idx+1} of {num_files}")
    device_id = shared_dict[KEY_ASSIGN].get(os.getpid(), None)
    if device_id is None:
        log_manager.logger.warning(f"{__name__}: {file_name}\t\t{idx+1} of {num_files}: Unspecified device_id."
                                   f"Default: use 0 for CUDA devices.")
    s: Optional[BaseImage] = None

    try:
        s: BaseImage = BaseImage(file_name, fname_outdir, dict(config.items("BaseImage.BaseImage")),
                                 device_id=device_id)
        for process, process_params in process_queue:
            process_params["lock"] = lock
            process_params["shared_dict"] = shared_dict
            process(s, process_params)
            s["completed"].append(process.__name__)
    except Exception as exc:
        # reproduce histoqc error string
        if s is not None:
            s.image_handle.release()
        print(f"DBG: {__name__}: {exc}")
        _oneline_doc_str = exc.__doc__.replace('\n', '') if exc.__doc__ is not None else ''
        err_str = f"{exc.__class__} {_oneline_doc_str} {exc}"
        trace_string = traceback.format_exc()
        log_manager.logger.error(
            f"{file_name} - Error analyzing file (skipping): \t {err_str}. Traceback: {trace_string}"
        )
        if exc.__traceback__.tb_next is not None:
            func_tb_obj = str(exc.__traceback__.tb_next.tb_frame.f_code)
        else:
            func_tb_obj = str(exc.__traceback__)

        exc.__histoqc_err__ = (file_name, err_str, func_tb_obj)
        raise exc

    else:
        # So long as the gc is triggered to delete the handle, the close is called to release the resources,
        # as documented in the openslide and cuimage's source code.
        # todo: should simply handle the __del__
        s.image_handle.close()
        # s.image_handle.handle = None
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
