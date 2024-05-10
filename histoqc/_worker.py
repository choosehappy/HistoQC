"""histoqc worker functions"""
import logging
import os
import shutil
import traceback
from histoqc.BaseImage import BaseImage
from histoqc._pipeline import BatchedResultFile
from histoqc._worker_setup import setup_plotting_backend
from typing import List, Optional
KEY_ASSIGN: str = 'device_assign'
PARAM_SHARE: str = 'shared_dict'


# --- worker functions --------------------------------------------------------

# c: configparser.Parser, cuda: bool, device_id_list: List[int], state: Dict
def worker_setup():
    """needed for multiprocessing worker setup"""
    setup_plotting_backend()
    # shared_dict = state[PARAM_SHARE]
    # load_pipeline(config=c)
    # device_assign(cuda, device_id_list, shared_dict)


def worker(idx, file_name, *,
           process_queue, config, outdir, lock, shared_dict, num_files, force):
    """pipeline worker function"""
    logger = logging.getLogger()
    # --- output directory preparation --------------------------------
    fname_outdir = os.path.join(outdir, os.path.basename(file_name))
    if os.path.isdir(fname_outdir):  # directory exists
        if not force:
            logger.warning(
                f"{file_name} already seems to be processed (output directory exists),"
                " skipping. To avoid this behavior use --force"
            )
            return
        else:
            # remove entire directory to ensure no old files are present
            shutil.rmtree(fname_outdir)
    # create output dir
    os.makedirs(fname_outdir)

    logger.info(f"-----Working on:\t{file_name}\t\t{idx+1} of {num_files}")
    # let Dask handle the device visibility/assignment
    device_id = 0  # shared_dict[KEY_ASSIGN].get(os.getpid(), None)
    # logger.info(f"{__name__} - {file_name}: Device ID: {dict(shared_dict[KEY_ASSIGN])}")
    if device_id is None:
        logger.warning(f"{__name__}: {file_name}\t\t{idx+1} of {num_files}: Unspecified device_id."
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
        logger.info(f"{file_name}: Error Block")
        if s is not None:
            # s.image_handle.release()
            s.image_handle.close()
        # print(f"DBG: {__name__}: {exc}")
        _oneline_doc_str = exc.__doc__.replace('\n', '') if exc.__doc__ is not None else ''
        err_str = f"{exc.__class__} {_oneline_doc_str} {exc}"
        trace_string = traceback.format_exc()
        logger.error(
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


def worker_error(e, failed: List):
    """error callback"""
    if hasattr(e, '__histoqc_err__'):
        file_name, err_str, tb = e.__histoqc_err__
    else:
        # error outside of pipeline
        # todo: it would be better to handle all of this as a decorator
        #   around the worker function
        file_name, err_str, tb = "N/A", f"error outside of pipeline {e!r}", None
    failed.append((file_name, err_str, tb))


def worker_flow_for_file(idx: int, file_name: str,
                         failed: List, results: BatchedResultFile, **kwargs) -> Optional[BaseImage]:
    try:
        base_image = worker(idx, file_name, **kwargs)
    except Exception as exc:
        base_image = None
        worker_error(exc, failed)
    else:
        worker_success(base_image, results)
    return base_image


def worker_single_process(files, failed: List, results: BatchedResultFile, **kwargs) -> Optional[BaseImage]:
    for idx, file_name in enumerate(files):
        return worker_flow_for_file(idx, file_name, failed, results, **kwargs)

