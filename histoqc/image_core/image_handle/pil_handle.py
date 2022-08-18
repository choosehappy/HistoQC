from .base_class import ImageHandle
from histoqc._import_openslide import openslide
from typing import Tuple, Dict, Any, List, Union, get_args
from histoqc.image_core.meta import ATTR_TYPE
from PIL import Image
from PIL.Image import Image as PILImage
from histoqc.image_core.meta import ATTR_TYPE_ARRAY_INPUT
import logging


class PILHandle(ImageHandle[PILImage]):

    __level_dimensions: Union[Tuple[Tuple[int, ...]], None]
    KEY_IMAGE_DATA = get_args(ATTR_TYPE_ARRAY_INPUT)[0]

    @property
    def properties(self):
        return self.__property_placeholder

    @property
    def base_size(self) -> Tuple[int, ...]:
        return self.handle.size

    @property
    def level_dimensions(self) -> Tuple[Tuple[int, ...]]:
        if self.__level_dimensions is None:
            self.__level_dimensions = (self.base_size, )
        return self.__level_dimensions

    @staticmethod
    def __new_pil_handle(fname: str, params: Dict[ATTR_TYPE, Any]):
        if fname is not None:
            return Image.open(fname)
        img_data = params.get(PILHandle.KEY_IMAGE_DATA, None)
        assert img_data is not None, f"No valid array data or fname"
        return img_data

    @classmethod
    def build(cls, fname: str, params: Dict[ATTR_TYPE, Any], **kwargs):
        handle = PILHandle.__new_pil_handle(fname, params)
        return cls(handle, fname)

    def read_region(self, location: Tuple[int, int], level: int, size: Tuple[int, int]) -> Image:
        if level > 0:
            logging.warning(f"{self.fname}: PIL-based Image - No pyramids defined but level is {level}."
                            f"Ignore the current level settings.")
        left, upper = location
        width, height = size
        right = left + width
        lower = upper + height
        bbox = (left, upper, right, lower)
        return self.handle.crop(bbox)

    def __init__(self, handle, fname: str):
        super().__init__(handle, fname)
        self.__level_dimensions = None
        self.__property_placeholder = dict()
