import PIL.Image
import numpy as np

from .base import WSIImageHandle
from histoqc.import_wrapper.openslide import openslide
from typing import Union, Tuple, Sequence, List, Mapping
from typing import cast
from PIL.Image import Image as PILImage
from .utils import rgba2rgb_pil
from PIL import Image


class OpenSlideHandle(WSIImageHandle[openslide.OpenSlide, PILImage, np.ndarray]):
    _background_color: str
    _magnification_factor: str
    _has_bounding_box: bool
    fname: str
    handle: openslide.OpenSlide

    def backend_rgba2rgb(self, img) -> PILImage:
        return rgba2rgb_pil(img, self.background_color)

    def __init__(self, fname):
        super().__init__(fname)
        self.handle = openslide.OpenSlide(fname)
        self._has_bounding_box = True
        self._bounding_box = self.__get_bounding_box()
        
        # get magnification factor from wsi slide
        self._magnification_factor = self.handle.properties.get("openslide.objective-power") or \
            self.handle.properties.get("aperio.AppMag")
        
        # get background color 
        self._background_color = f"#{self.handle.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')}"

    def __get_bounding_box(self) -> Tuple[int, int, int, int]:
        (dim_width, dim_height) = self.handle.dimensions
    
        try:
            x = int(self.handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_X, 'NA'))
            y = int(self.handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_Y, 'NA'))
            width = int(self.handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_WIDTH, 'NA'))
            height = int(self.handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_HEIGHT, 'NA'))
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
        return self.handle.dimensions

    @property
    def magnification(self) -> Union[str, None]:
        return self._magnification_factor

    @property
    def level_count(self) -> int:
        return self.handle.level_count

    @property
    def level_dimensions(self) -> Sequence[Tuple[int, int]]:
        return self.handle.level_dimensions

    @property
    def level_downsamples(self):
        return self.handle.level_downsamples

    @property
    def vendor(self):
        return self.handle.properties.get("openslide.vendor", "NA")

    @property
    def mpp_x(self) -> str:
        return self.handle.properties.get("openslide.mpp-x", "NA")

    @property
    def mpp_y(self) -> str:
        return self.handle.properties.get("openslide.mpp-y", "NA")

    @property
    def comment(self) -> str:
        return self.handle.properties.get("openslide.comment", "NA")

    @classmethod
    def region_resize_arr(cls, data: np.ndarray, new_size_wh: Tuple[int, int]):
        return np.array(Image.fromarray(data).resize(new_size_wh), copy=False)

    def get_thumbnail(self, new_dim):
        return self.handle.get_thumbnail(new_dim)

    def get_best_level_for_downsample(self, down_factor):
        return self.handle.get_best_level_for_downsample(down_factor)

    def region_backend(self, location, level, size, **kwargs):
        return self.handle.read_region(location, level, size)

    @staticmethod
    def backend_to_pil(region: Union[PILImage, np.ndarray]) -> PILImage:
        if isinstance(region, np.ndarray):
            return PIL.Image.fromarray(region)
        return region

    @staticmethod
    def backend_to_array(region: PILImage) -> np.ndarray:
        return np.array(region)

    @staticmethod
    def array_to_numpy(arr: np.ndarray) -> np.ndarray:
        return np.array(arr)

    def read_label(self):
        return self.handle.associated_images["label"]

    def read_macro(self):
        return self.handle.associated_images["macro"]

    @property
    def associated_images(self) -> Mapping[str, PILImage]:
        return self.handle.associated_images

    @staticmethod
    def grid_stack(grid: List[List[np.ndarray]]):
        return np.concatenate([np.concatenate(row, axis=0) for row in grid], axis=1)

    @staticmethod
    def backend_dim(region: PILImage) -> Tuple[int, int]:
        return cast(Tuple[int, int], region.size)

    @staticmethod
    def array_shape(arr: np.ndarray) -> Tuple[int, ...]:
        return arr.shape
