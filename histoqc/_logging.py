from __future__ import annotations
import multiprocessing
import dask
import threading
import os
from contextlib import contextmanager
from logging.handlers import QueueHandler
from typing import Dict, cast, Optional, List
from typing_extensions import Literal, Self
import warnings
from dask.distributed import WorkerPlugin
import logging
from logging.config import dictConfig
from dask.distributed import get_worker
from histoqc._log_conf import LoggerConfigBuilder
DEFAULT_LOG_FN = 'error.log'
FMT_DFT = cast(Literal['default'], 'default')
HDL_CONSOLE = 'console'
HDL_FILE = 'file'
HDL_OUT_FIELD = 'filename'
MAIN_CONF_BUILD = (LoggerConfigBuilder(version=1).add_formatter_by_type(formatter_type=FMT_DFT)
                   .add_handler_by_type(handler_type=HDL_CONSOLE, level='DEBUG', formatter=FMT_DFT)
                   .add_handler_by_type(handler_type=HDL_FILE, level='WARNING', formatter=FMT_DFT)
                   .add_root(level="INFO", handlers=[HDL_CONSOLE, HDL_FILE])
                   .set_handler_target(handler_name=HDL_FILE, out_field=HDL_OUT_FIELD, out_value=DEFAULT_LOG_FN))

WORKER_CONF_BUILD = (LoggerConfigBuilder(version=1).add_formatter_by_type(formatter_type=FMT_DFT)
                     .add_handler_by_type(handler_type=HDL_CONSOLE, level='DEBUG', formatter=FMT_DFT)
                     .add_root(level="INFO", handlers=[HDL_CONSOLE]))


def handle_warning(capture_warnings: bool = True, filter_warnings: str = 'ignore'):
    # configure warnings too...
    filter_type = Literal["default", "error", "ignore", "always", "module", "once"]
    warnings.filterwarnings(cast(filter_type, filter_warnings))
    logging.captureWarnings(capture_warnings)


class DaskLogHandler(logging.Handler):
    """Custom Handler, which emits the topic/message from builtin logging.Logger to dask's centralized logging.

    Could be useful for future if we need to migrate from builtin logger to dask's logger
    """
    topic: str

    def emit(self, record):
        worker = get_worker()
        log_entry = self.format(record)
        worker.log_event(self.topic, log_entry)

    def __init__(self, topic: str = 'logs'):
        super().__init__()
        self.topic = topic


class WorkerInitializer(WorkerPlugin):
    """Worker Initializer

    """
    worker_config: Dict
    logger_names: List[Optional[str]]

    def __init__(self, worker_config: Dict, capture_warnings: bool = True, filter_warnings: str = 'ignore'):
        self.worker_config = worker_config
        self.capture_warnings = capture_warnings
        self.filter_warnings = filter_warnings

    def setup(self, worker):
        logging.config.dictConfig(self.worker_config)
        handle_warning(capture_warnings=self.capture_warnings, filter_warnings=self.filter_warnings)

    @classmethod
    def build(cls, worker_config: Dict,
              capture_warnings: bool = True, filter_warnings: str = 'ignore') -> Self:
        return cls(worker_config, capture_warnings, filter_warnings)


class LoggingSetup:
    _plugin: WorkerPlugin
    _main_build: LoggerConfigBuilder
    _worker_build_list = List[LoggerConfigBuilder]

    def __init__(self, main_build: LoggerConfigBuilder,
                 *worker_builds: LoggerConfigBuilder,
                 capture_warnings: bool = True, filter_warnings: str = 'ignore'):
        self._main_build = main_build
        self._worker_build_list = list(worker_builds)
        self._capture_warnings = capture_warnings
        self._filter_warnings = filter_warnings

    def is_main_proc(self):
        return multiprocessing.current_process().name == "MainProcess"

    @classmethod
    def client_setup_plugin(cls, client: dask.distributed.Client,
                            conf_build: LoggerConfigBuilder,
                            capture_warnings: bool,
                            filter_warnings: str) -> dask.distributed.Client:
        plugin = WorkerInitializer.build(conf_build.config, capture_warnings=capture_warnings,
                                         filter_warnings=filter_warnings)
        client.register_plugin(plugin)
        return client

    def setup_client(self, client: dask.distributed.Client, forward_name: Optional[str]):
        # todo fill-in
        if not self.is_main_proc():
            return client
        # main logger setup
        for wb in self._worker_build_list:
            client = self.client_setup_plugin(client, wb, self._capture_warnings, self._filter_warnings)
        # forward to the main process logger
        client.forward_logging(logger_name=forward_name)
        return client

    def curate_filename(self, *, output_dir: Optional[str], fname: Optional[str],
                        handler_name: Optional[str], out_field: Optional[str]):
        # do nothing if any of below is None:
        if handler_name is None or fname is None or out_field is None:
            return
        dest = fname
        if output_dir is not None:
            os.makedirs(output_dir, exist_ok=True)
            dest = os.path.join(output_dir, fname)
        assert dest is not None and handler_name is not None and out_field is not None
        self._main_build = self._main_build.set_handler_target(handler_name=handler_name,
                                                               out_field=out_field, out_value=dest)
        return self._main_build

    def setup_main_logger(self, *, output_dir: Optional[str],
                          fname: Optional[str],
                          handler_name: Optional[str],
                          out_field: Optional[str]):
        if not self.is_main_proc():
            return
        # main logger
        self._main_build = self.curate_filename(output_dir=output_dir, fname=fname,
                                                handler_name=handler_name, out_field=out_field)

        logging.config.dictConfig(self._main_build.config)

    def setup(self, *,
              client: dask.distributed.Client,
              forward_name: Optional[str],
              output_dir: Optional[str],
              fname: str = DEFAULT_LOG_FN,
              handler_name: Optional[str] = HDL_FILE,
              out_field: Optional[str] = HDL_OUT_FIELD
              ):
        if not self.is_main_proc():
            return
        self.setup_main_logger(output_dir=output_dir, fname=fname, handler_name=handler_name, out_field=out_field)
        self.setup_client(client, forward_name)


class MultiProcessingLogManager:
    """Adapted from Andreas Poehlmann's implementation.

    Under the hood of dask, worker loggers can be forwarded
        to client directly for both local and distributed clusters. No need

    """
    def __init__(self, logger_name, *, manager):
        """create a MultiProcessingLogManager

        Note: this uses a multiprocessing Queue to correctly transfer
          logging information from worker processes to the main
          process logging instance

        Parameters
        ----------
        logger_name : str
            the name of the logger instance
        manager : multiprocessing.Manager
            the mp Manager instance used for creating sharable context
        """
        self._logger_name = logger_name
        self._log_queue = manager.Queue()
        self._log_thread_active = False

    @property
    def is_main_process(self):
        return multiprocessing.current_process().name == "MainProcess"

    @property
    def logger(self):
        """returns the logger instance"""
        if self.is_main_process:
            return logging.getLogger(self._logger_name)
        else:
            root = logging.getLogger()
            if not root.hasHandlers():
                qh = QueueHandler(self._log_queue)
                root.setLevel(logging.INFO)
                root.addHandler(qh)
                # note: this should be revisited and set by the main process
                warnings.filterwarnings('ignore')
                logging.captureWarnings(True)
            return root

    @contextmanager
    def logger_thread(self):
        """context manager for multiprocess logging

        Note: this starts the thread responsible for handing the log records
          emitted by child processes to the main logger instance
        """
        assert self.is_main_process
        assert not self._log_thread_active  # not reentrant...
        self._log_thread_active = True

        def process_queue(q, ln):
            main_logger = logging.getLogger(ln)
            while True:
                log_record = q.get()
                if log_record is None:
                    break
                main_logger.handle(log_record)

        lt = threading.Thread(target=process_queue, args=(self._log_queue, self._logger_name))
        lt.start()
        try:
            yield self
        finally:
            self._log_queue.put(None)
            lt.join()
            self._log_thread_active = False
