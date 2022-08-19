from abc import ABC, abstractmethod
from typing import Tuple, Dict, Any, Generic, TypeVar, Mapping
from histoqc.image_core.meta import ATTR_TYPE
from PIL.Image import Image
import logging
T = TypeVar("T")


def validate_boundary(msg_body=""):
    def _wrapper(func):
        def _factory(self: "ImageHandle", level: int):
            minimum_index = len(self._level_dimensions) - 1
            # exceeds max level index
            if level > minimum_index:
                logging.warning(f"{self.fname}: {msg_body}. Level: {level} vs. max level idx allowed: {minimum_index}")
                level = minimum_index
            return func(self, level)
        _factory.__name__ = func.__name__
        return _factory
    return _wrapper


class ImageHandle(ABC, Generic[T]):
    """Since most of your codes memorize the image information (e.g., base size / level dimension etc.) from the
    os_handle. To minimize the changes in BaseImage, class _ImageHandle works as a temporary wrapper of all designated
    type of input e.g., OpenSlide, PIL, extract and log image information into the BaseImage through
    a unified interface.
    """
    __handle: T
    __fname: str

    @property
    def handle(self) -> T:
        return self.__handle

    @property
    def fname(self) -> str:
        return self.__fname

    @property
    @abstractmethod
    def properties(self) -> Mapping:
        raise NotImplementedError

    @property
    @abstractmethod
    def base_size(self) -> Tuple[int, int]:
        raise NotImplementedError

    @property
    @abstractmethod
    def _level_dimensions(self) -> Tuple[Tuple[int, int]]:
        raise NotImplementedError

    @validate_boundary(msg_body="Current level idx exceeds the max idx of the level_dimensions")
    def get_level_dimensions(self, level: int) -> Tuple[int, int]:
        """A wrapper to handle the cases of the level.
        Args:
            level:

        Returns:

        """
        return self._level_dimensions[level]

    def __init__(self, handle: T, fname: str):
        self.__handle = handle
        self.__fname = fname

    @classmethod
    @abstractmethod
    def build(cls, fname: str, params: Dict[ATTR_TYPE, Any], **kwargs):
        raise NotImplementedError

    @abstractmethod
    def read_region(self, location: Tuple[int, int], level: int, size: Tuple[int, int]) -> Image:
        ...