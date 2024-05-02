from __future__ import annotations
from PIL.Image import Image as PILImage
from cucim.clara import CuImage
from .base import WSIImageHandle
from PIL import Image
from ..import_wrapper.openslide import openslide
import cupy as cp
from typing import List, Union, Tuple, Mapping
from typing import cast
from lazy_property import LazyProperty
import numpy as np
from cucim import skimage as c_skimage
from histoqc.array_adapter import ArrayDevice


class CuImageHandle(WSIImageHandle[CuImage, CuImage, cp.ndarray]):

    handle: CuImage
    fname: str

    # TODO: standalone parser of vendor information
    dummy_handle: openslide.OpenSlide

    def backend_rgba2rgb(self, img: CuImage) -> CuImage:
        # todo: it appears that CuImage does not take care of the alpha channel at all.
        return img

    @classmethod
    def region_resize_arr(cls, data: CuImage, new_size_wh: Tuple[int, int]) -> cp.ndarray:
        w, h, *_ = new_size_wh
        arr = cp.array(data)
        return c_skimage.transform.resize(arr, output_shape=(h, w))

    def __init__(self, fname: str):
        super().__init__(fname)
        self.handle = CuImage(fname)
        # todo - this is only created for parsing the image header/metadata, as the CuCIM v24.02 does not have a
        # todo - native unified metadata interface for different vendors.
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
        return tuple(self.handle.metadata['cucim']['shape'][:2][::-1])

    @LazyProperty
    def magnification(self):
        return self.dummy_handle.properties.get("openslide.objective-power") or \
            self.dummy_handle.properties.get("aperio.AppMag")

    @property
    def level_count(self):
        return self.handle.metadata['cucim']['resolutions']['level_count']

    @property
    def level_dimensions(self):
        return self.handle.metadata['cucim']['resolutions']['level_dimensions']

    @property
    def level_downsamples(self):
        return self.handle.metadata['cucim']['resolutions']['level_downsamples']

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

    def get_thumbnail(self, new_dim):
        """Get thumbnail

        Args:
            new_dim: Tuple

        Returns:

        """
        # from openslide
        downsample = max(*(dim / thumb for dim, thumb in zip(self.dimensions, new_dim)))
        level = self.get_best_level_for_downsample(downsample)
        thumb = self.backend_rgba2rgb(self.region_backend((0, 0), level, self.level_dimensions[level]))
        # resize
        thumb_cp = cp.array(thumb, copy=False)
        target_w, target_h = (x // int(downsample) for x in self.dimensions)
        aspect_ratio = self.dimensions[0] / self.dimensions[1]

        target_w, target_h = self.__class__.curate_to_max_dim(target_w, target_h, max(new_dim), aspect_ratio)
        resized = c_skimage.transform.resize(thumb_cp, output_shape=(target_h, target_w))

        return c_skimage.util.img_as_ubyte(resized)

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
        return self.handle.read_region(location=location, level=level, size=size, **kwargs)

    @staticmethod
    def backend_to_array(region: Union[CuImage, cp.ndarray]) -> cp.ndarray:
        return cp.array(region, copy=False)

    @staticmethod
    def array_to_numpy(arr: cp.ndarray) -> np.ndarray:
        return arr.get()

    @classmethod
    def backend_to_pil(cls, region: CuImage) -> PILImage:
        return Image.fromarray(cls.backend_to_array(region).get())

    def read_label(self) -> CuImage:
        return self.handle.associated_image("label")

    def read_macro(self) -> CuImage:
        return self.handle.associated_image("macro")

    @LazyProperty
    def associated_images(self) -> Mapping:
        keys = self.handle.associated_images
        return {k: self.handle.associated_image(k) for k in keys}

    @staticmethod
    def grid_stack(grid: List[List[cp.ndarray]]):
        return cp.concatenate([cp.concatenate(row, axis=0) for row in grid], axis=1)

    @staticmethod
    def backend_dim(region: CuImage) -> Tuple[int, int]:
        return cast(Tuple[int, int], tuple(region.size()[:2][::-1]))

    @staticmethod
    def array_shape(arr: cp.ndarray) -> Tuple[int, ...]:
        return arr.shape

    def close_handle(self):
        if hasattr(self, "handle") and self.handle is not None:
            self.handle.close()
            self.handle = None
        if self.dummy_handle is not None:
            self.dummy_handle.close()
            self.dummy_handle = None

    @property
    def device(self) -> ArrayDevice:
        return ArrayDevice.CUDA
