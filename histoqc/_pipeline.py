"""histoqc._pipeline

helper utilities for running the HistoQC pipelines

"""
import logging
import os
import shutil
import warnings
from logging.config import dictConfig


# --- logging helpers -------------------------------------------------

DEFAULT_LOG_FN = "error.log"


def setup_logging(*, capture_warnings, filter_warnings):
    """configure histoqc's logging instance

    Parameters
    ----------
    capture_warnings: `bool`
        flag if warnings should be captured by the logging system
    filter_warnings: `str`
        action for warnings.filterwarnings
    """
    dictConfig({
        'version': 1,
        'formatters': {
            'default': {
                'class': 'logging.Formatter',
                'format': '%(asctime)s - %(levelname)s - %(message)s',
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'INFO',
                'formatter': 'default',
            },
            'logfile': {
                'class': 'logging.FileHandler',
                'level': 'WARNING',
                'filename': DEFAULT_LOG_FN,
                'mode': 'w',  # we initially start overwriting existing logs
                'formatter': 'default',
            },
        },
        'root': {
            'level': 'INFO',
            'handlers': ['console', 'logfile']
        }
    })

    # configure warnings too...
    warnings.filterwarnings(filter_warnings)
    logging.captureWarnings(capture_warnings)


def move_logging_file_handler(logger, destination):
    """point the logging file handlers to the new destination

    Parameters
    ----------
    logger :
        the Logger instance for which the default file handler should be moved
    destination :
        destination directory for the new file handler
    """
    for handler in reversed(logger.handlers):
        if not isinstance(handler, logging.FileHandler):
            continue
        if handler.baseFilename != os.path.join(os.getcwd(), DEFAULT_LOG_FN):
            continue

        if not destination.endswith(handler.baseFilename):
            destination = os.path.join(destination, os.path.relpath(handler.baseFilename, os.getcwd()))
        logger.info(f'moving fileHandler {handler.baseFilename!r} to {destination!r}')

        # remove handler
        logger.removeHandler(handler)
        handler.close()
        # copy error log to destination
        new_filename = shutil.move(handler.baseFilename, destination)

        new_handler = logging.FileHandler(new_filename, mode='a')
        new_handler.setLevel(handler.level)
        new_handler.setFormatter(handler.formatter)
        logger.addHandler(new_handler)
