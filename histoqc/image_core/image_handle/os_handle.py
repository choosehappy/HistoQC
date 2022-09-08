from .base_class import ImageHandle
from histoqc._import_openslide import openslide
from typing import Tuple, Dict, Any
from histoqc.image_core.meta import ATTR_TYPE
from PIL.Image import Image


class OSHandle(ImageHandle[openslide.OpenSlide]):

    @property
    def properties(self):
        return self.handle.properties

    @property
    def base_size_wh(self) -> Tuple[int, int]:
        # width height
        return self.handle.dimensions

    @property
    def _level_dimensions(self) -> Tuple[Tuple[int, int]]:
        return self.handle.level_dimensions

    @classmethod
    def build(cls, fname: str, params: Dict[ATTR_TYPE, Any], **kwargs):
        osh = openslide.OpenSlide(fname)
        return cls(osh, fname)

    def read_region(self, location: Tuple[int, int], level: int, size: Tuple[int, int]) -> Image:
        return self.handle.read_region(location, level, size)
