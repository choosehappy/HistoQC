from .base_class import ImageHandle
from histoqc._import_openslide import openslide
from typing import Tuple, Dict, Any, List, Union, get_args, Optional
from histoqc.image_core.meta import ATTR_TYPE
from PIL import Image
from PIL.Image import Image as PILImage
from histoqc.image_core.meta import ATTR_TYPE_ARRAY_INPUT
import logging
import numpy as np


class PILHandle(ImageHandle[PILImage]):

    __CURR_MAX_LEVEL = 0
    __level_dimensions: Union[Tuple[Tuple[int, ...]], None]
    KEY_IMAGE_DATA = get_args(ATTR_TYPE_ARRAY_INPUT)[0]

    @property
    def properties(self):
        return self.__property_placeholder

    @property
    def base_size_wh(self) -> Tuple[int, ...]:
        # width height
        return self.handle.size

    @property
    def _level_dimensions(self) -> Tuple[Tuple[int, ...]]:
        if self.__level_dimensions is None:
            self.__level_dimensions = (self.base_size_wh,)
        return self.__level_dimensions

    def get_level_dimensions(self, level: int) -> Tuple[int, int]:
        if level > PILHandle.__CURR_MAX_LEVEL:
            logging.warning(f"{self.fname}, for now PIL-based data only support single level images."
                            f"Force level to be 0 from {level}")
            level = 0
        return super().get_level_dimensions(level)

    @staticmethod
    def __new_pil_handle(fname: Optional[str], params: Dict[ATTR_TYPE, Any]):
        if fname is not None:
            return Image.open(fname)
        img_data = params.get(PILHandle.KEY_IMAGE_DATA, None)
        assert img_data is not None, f"No valid array data or fname"
        if isinstance(img_data, PILImage):
            return img_data
        assert isinstance(img_data, np.ndarray), f"Only numpy.ndarray is accepted: {type(img_data)}"
        return Image.fromarray(img_data)

    @classmethod
    def build(cls, fname: Optional[str], params: Dict[ATTR_TYPE, Any], **kwargs):
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
