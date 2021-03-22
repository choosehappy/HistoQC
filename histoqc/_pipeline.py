"""histoqc._pipeline

helper utilities for running the HistoQC pipelines

"""
import logging
import os
import platform
import shutil
import warnings
from contextlib import ExitStack
from contextlib import nullcontext
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


# --- worker process helpers ------------------------------------------

def setup_plotting_backend(logger=None):
    """loads the correct matplotlib backend

    Parameters
    ----------
    logger :
        the logging.Logger instance
    """
    import matplotlib
    if platform.system() != "Windows" and not os.environ.get('DISPLAY'):
        if logger is not None:
            logger.info('no display found. Using non-interactive Agg backend')
        matplotlib.use('Agg')
    else:
        matplotlib.use('TkAgg')


class BatchedResultFile:
    """BatchedResultFile encapsulates the results writing

    Note: this is multiprocessing safe
    """
    FILENAME_GLOB = "results*.tsv"
    FILENAME_NO_BATCH = "results.tsv"
    FILENAME_BATCH = "results_{:d}.tsv"

    def __init__(self, dst, *, manager, batch_size=None, force_overwrite=False):
        """create a BatchedResultFile instance

        Parameters
        ----------
        dst : os.PathLike
            the output directory for the result files
        manager : multiprocessing.Manager
            the mp Manager instance used for creating sharable context
        batch_size : int or None
            after `batch_size` calls to increment_counter() the results
            file will be rotated
        force_overwrite : bool
            overwrite result files if they are already present. default
            is to append.
        """
        if not os.path.isdir(dst):
            raise ValueError(f"dst {dst!r} is not a directory or does not exist")
        if batch_size is not None:
            batch_size = int(batch_size)
            if batch_size < 1:
                raise ValueError(f"batch_size must be > 0, got {batch_size}")
        self.dst = os.path.abspath(dst)
        self.batch_size = batch_size
        self.force_overwrite = bool(force_overwrite)

        # multiprocessing safety
        self._headers = manager.list()
        self._rlock = manager.RLock()

        # internal state
        self._batch = 0
        self._completed = 0
        self._first = True

        # contextmanager
        self._f = None
        self._stack = None

    def __enter__(self):
        self._stack = ExitStack()
        self._stack.callback(self.increment_counter)
        self._stack.enter_context(self._rlock)
        self._f = nullcontext(self._stack.enter_context(self._file))
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._stack.close()
        self._stack = None
        self._f = None

    def _file(self):
        if self._f is not None:
            return self._f  # we're in the context manager

        if self.batch_size is None:
            fn = self.FILENAME_NO_BATCH
        else:
            fn = self.FILENAME_BATCH.format(self._batch)
        pth = os.path.join(self.dst, fn)

        mode = "a"
        if self._first and os.path.isfile(pth):
            # todo: expose logging a message here
            if self.force_overwrite:
                mode = "w"
            else:
                mode = "a"
        self._first = False
        return open(fn, mode=mode)

    def add_header(self, header):
        """add a new header to the results file

        Parameters
        ----------
        header :
            a string that can be written to the file by calling the
            write_headers method
        """
        self._headers.append(header)

    def is_empty_file(self):
        """return if the current file is empty

        Note: this is useful to determine if you want to write_headers
          ... technically the name is incorrect, but in this use case
              pos 0 is equivalent to an empty file
        """
        with self._rlock, self._file as f:
            return f.tell() == 0

    def write_headers(self, *args):
        """write the internally collected headers to the current file

        Parameters
        ----------
        state : dict
            the current histoqc implementation writes the outputs to
            the header files, so *args supports `state` for now.
            overwrite in subclass to control header output behavior
        """
        with self._rlock:
            # write headers
            for line in self._headers:
                self.write_line(f"#{line}")
            # histoqc specific
            _state, = args
            _outputs = '\t'.join(_state['output'])
            line = f"#dataset:{_outputs}\twarnings"
            self.write_line(line)

    def write_line(self, text, end="\n"):
        """write text to the file

        Parameters
        ----------
        text : str
        end : str
            defaults to newline
        """
        with self._rlock, self._file as f:
            f.write(text)
            if end:
                f.write(end)

    def increment_counter(self):
        """increment the completed counter

        moves to the next batch as determined by batch_size
        """
        # move on to the next batch if needed
        with self._rlock:
            self._completed += 1
            if self._completed and self.batch_size and self._completed % self.batch_size == 0:
                self._batch += 1
                self._first = True
