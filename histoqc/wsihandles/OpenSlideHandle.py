import PIL.Image
import numpy as np

from .WSIImageHandle import WSIImageHandle
from histoqc.import_wrapper.openslide import openslide
from typing import Union, Tuple, Sequence, List
from PIL.Image import Image as PILImage
from .utils import rgba2rgb_pil
from PIL import Image


class OpenSlideHandle(WSIImageHandle[openslide.OpenSlide, PILImage, np.ndarray]):
    _background_color: str
    _magnification_factor: str
    _has_bounding_box: bool
    fname: str
    osh: openslide.OpenSlide

    def backend_rgba2rgb(self, img) -> PILImage:
        return rgba2rgb_pil(img, self.background_color)

    def __init__(self, fname):
        self.fname = fname
        self.osh = openslide.OpenSlide(fname)
        self._has_bounding_box = True
        self._bounding_box = self.__get_bounding_box()
        
        # get magnification factor from wsi slide
        self._magnification_factor = self.osh.properties.get("openslide.objective-power") or \
            self.osh.properties.get("aperio.AppMag")
        
        # get background color 
        self._background_color = f"#{self.osh.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')}"

    def __get_bounding_box(self) -> Tuple[int, int, int, int]:
        (dim_width, dim_height) = self.osh.dimensions
    
        try:
            x = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_X, 'NA'))
            y = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_Y, 'NA'))
            width = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_WIDTH, 'NA'))
            height = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_HEIGHT, 'NA'))
            return x, y, width, height
        # if any attribute is 'NA' and fails the int() cast
        except ValueError:
            self._has_bounding_box = False
            return 0, 0, dim_width, dim_height

    @property
    def background_color(self):
        return self._background_color

    @property
    def has_bounding_box(self) -> bool:
        return self._has_bounding_box
    
    @property
    def bounding_box(self) -> Tuple[int, int, int, int]:
        return self._bounding_box

    @property
    def dimensions(self) -> Tuple[int, int]:
        return self.osh.dimensions

    @property
    def magnification(self) -> Union[str, None]:
        return self._magnification_factor

    @property
    def level_count(self) -> int:
        return self.osh.level_count

    @property
    def level_dimensions(self) -> Sequence[Tuple[int, int]]:
        return self.osh.level_dimensions

    @property
    def level_downsamples(self):
        return self.osh.level_downsamples

    @property
    def vendor(self):
        return self.osh.properties.get("openslide.vendor", "NA")

    @property
    def mpp_x(self) -> str:
        return self.osh.properties.get("openslide.mpp-x", "NA")

    @property
    def mpp_y(self) -> str:
        return self.osh.properties.get("openslide.mpp-y", "NA")

    @property
    def comment(self) -> str:
        return self.osh.properties.get("openslide.comment", "NA")

    @classmethod
    def region_resize_arr(cls, data: np.ndarray, new_size_wh: Tuple[int, int]):
        return np.array(Image.fromarray(data).resize(new_size_wh), copy=False)

    def get_thumbnail(self, new_dim):
        return self.osh.get_thumbnail(new_dim)

    def get_best_level_for_downsample(self, down_factor):
        return self.osh.get_best_level_for_downsample(down_factor)

    def region_backend(self, location, level, size, **kwargs):
        return self.osh.read_region(location, level, size)

    @staticmethod
    def backend_to_pil(region: Union[PILImage, np.ndarray]) -> PILImage:
        if isinstance(region, np.ndarray):
            return PIL.Image.fromarray(region)
        return region

    @staticmethod
    def backend_to_array(region: PILImage) -> np.ndarray:
        return np.array(region)

    def read_label(self):
        return self.osh.associated_images["label"]

    def read_macro(self):
        return self.osh.associated_images["macro"]

    @staticmethod
    def grid_stack(grid: List[List[np.ndarray]]):
        return np.concatenate([np.concatenate(row, axis=0) for row in grid], axis=1)
 