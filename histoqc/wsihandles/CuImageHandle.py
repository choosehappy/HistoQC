from PIL.Image import Image as PILImage
from cucim.clara import CuImage
from .WSIImageHandle import WSIImageHandle
from PIL import Image
from ..import_wrapper.openslide import openslide
import cupy as cp
from typing import List, Union, Tuple
from lazy_property import LazyProperty
import numpy as np
from cucim import skimage as c_skimage


class CuImageHandle(WSIImageHandle[CuImage, CuImage, cp.ndarray]):

    osh: CuImage
    fname: str

    # TODO: standalone parser of vendor information
    dummy_handle: openslide.OpenSlide

    def backend_rgba2rgb(self, img: CuImage) -> CuImage:
        # todo: verify
        # todo: it appears that CuImage does not take care of the alpha channel at all.
        return img

    @classmethod
    def region_resize_arr(cls, data: CuImage, new_size_wh: Tuple[int, int]) -> cp.ndarray:
        w, h, *_ = new_size_wh
        arr = cp.array(data)
        return c_skimage.transform.resize(arr, output_shape=(h, w))

    def __init__(self, fname: str):
        self.fname = fname
        self.osh = CuImage(fname)
        self.dummy_handle = openslide.OpenSlide(fname)

    @LazyProperty
    def background_color(self):
        return f"#{self.dummy_handle.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')}"

    @LazyProperty
    def bounding_box(self):
        dim_width, dim_height = self.dimensions
        x = int(self.dummy_handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_X, 0))
        y = int(self.dummy_handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_Y, 0))
        width = int(self.dummy_handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_WIDTH, dim_width))
        height = int(self.dummy_handle.properties.get(openslide.PROPERTY_NAME_BOUNDS_HEIGHT, dim_height))
        return x, y, width, height

    @LazyProperty
    def has_bounding_box(self):
        return (openslide.PROPERTY_NAME_BOUNDS_X in self.dummy_handle.properties
                and openslide.PROPERTY_NAME_BOUNDS_X in self.dummy_handle.properties
                and openslide.PROPERTY_NAME_BOUNDS_WIDTH in self.dummy_handle.properties
                and openslide.PROPERTY_NAME_BOUNDS_HEIGHT in self.dummy_handle.properties
                )

    @LazyProperty
    def dimensions(self):
        return tuple(self.osh.metadata['cucim']['shape'][:2][::-1])

    @LazyProperty
    def magnification(self):
        return self.dummy_handle.properties.get("openslide.objective-power") or \
            self.dummy_handle.properties.get("aperio.AppMag")

    @property
    def level_count(self):
        return self.osh.metadata['cucim']['resolutions']['level_count']

    @property
    def level_dimensions(self):
        return self.osh.metadata['cucim']['resolutions']['level_dimensions']

    @property
    def level_downsamples(self):
        return self.osh.metadata['cucim']['resolutions']['level_downsamples']

    @property
    def vendor(self):
        return self.dummy_handle.properties.get("openslide.vendor", "NA")

    @property
    def mpp_x(self):
        return self.dummy_handle.properties.get("openslide.mpp-x", "NA")

    @property
    def mpp_y(self):
        return self.dummy_handle.properties.get("openslide.mpp-y", "NA")

    @property
    def comment(self):
        return self.dummy_handle.properties.get("openslide.comment", "NA")

    @staticmethod
    def _curate_max_wh(width, height, max_size, aspect_ratio):
        if height > width:
            height = max(height, max_size)
            width = round(height * aspect_ratio)
        else:
            width = max(width, max_size)
            height = round(width / aspect_ratio)
        return width, height

    def get_thumbnail(self, new_dim):
        # from openslide
        downsample = max(*(dim / thumb for dim, thumb in zip(self.dimensions, new_dim)))
        level = self.get_best_level_for_downsample(downsample)
        thumb = self.backend_rgba2rgb(self.region_backend((0, 0), level, self.level_dimensions[level]))
        # resize
        thumb_cp = cp.array(thumb, copy=False)
        target_w, target_h = (x // int(downsample) for x in self.dimensions)
        aspect_ratio = self.dimensions[0] / self.dimensions[1]

        target_w, target_h = self.__class__._curate_max_wh(target_w, target_h, max(new_dim), aspect_ratio)
        return c_skimage.transform.resize(thumb_cp, output_shape=(target_h, target_w))

    def get_best_level_for_downsample(self, down_factor: float) -> int:
        """Return the largest level that's smaller than the target downsample factor, consistent with openslide.

        Args:
            down_factor:

        Returns:

        """
        level_downsamples_arr = np.asarray(self.level_downsamples)
        # not exceeding the current downsample level
        down_indices = np.where(level_downsamples_arr <= down_factor)[0]
        down_values = level_downsamples_arr[down_indices]
        # find the indices of the down_indices that points to the best downsample factor value
        return down_indices[down_values.argmax()]

    def region_backend(self, location, level, size, **kwargs):
        return self.osh.read_region(location=location, level=level, size=size, **kwargs)

    @staticmethod
    def backend_to_array(region: Union[CuImage, cp.ndarray]) -> cp.ndarray:
        return cp.array(region, copy=False)

    @classmethod
    def backend_to_pil(cls, region: CuImage) -> PILImage:
        return Image.fromarray(cls.backend_to_array(region).get())

    def read_label(self) -> CuImage:
        return self.osh.associated_image("label")

    def read_macro(self) -> CuImage:
        return self.osh.associated_image("macro")

    @staticmethod
    def grid_stack(grid: List[List[cp.ndarray]]):
        return cp.concatenate([cp.concatenate(row, axis=0) for row in grid], axis=1)
