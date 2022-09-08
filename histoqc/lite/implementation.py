"""
A temporary workaround interface to load pipelines in existing scripts
"""
from typing import List, Tuple, Callable, Dict, Any
from histoqc._pipeline import load_pipeline
import configparser
from multiprocessing import Manager


class Pipeline(Callable):
    _process_queue: List[Tuple[Callable, Dict[str, Any]]]
    __mpm: Manager

    @property
    def mpm(self):
        return self.__mpm

    def _init_default_mp(self, mpm):
        if mpm is None:
            mpm = Manager()
        self.__mpm = mpm
        self.__lock = mpm.Lock()

    def __init__(self, process_queue, mpm: Manager = None):
        self._process_queue = process_queue
        self._init_default_mp(mpm)

    @classmethod
    def from_config(cls, config: configparser.ConfigParser, mpm: Manager):
        process_queue = load_pipeline(config)
        return cls.from_funcs(process_queue, mpm)

    @classmethod
    def from_funcs(cls, process_params: List[Tuple[Callable, Dict[str, Any]]], mpm: Manager):
        return cls(process_params, mpm)

    def __call__(self, s):
        new_lock = self.mpm.Lock()
        for process, process_params in self._process_queue:
            process_params["lock"] = process_params.get("lock", new_lock)
            process_params["shared_dict"] = process_params.get("shared_dict", self.mpm.dict())
            process(s, process_params)
            s["completed"].append(process.__name__)
