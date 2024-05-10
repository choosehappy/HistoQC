from __future__ import annotations

import skimage.util
from PIL.Image import Image as PILImage
from cucim.clara import CuImage
from .base import WSIImageHandle
import traceback
from PIL import Image
from ..import_wrapper.openslide import openslide
import cupy as cp
from typing import List, Union, Tuple, Mapping, Optional
from typing import cast
from lazy_property import LazyProperty
import numpy as np
from cucim import skimage as c_skimage
from histoqc.array_adapter import ArrayDeviceType, Device
from types import MappingProxyType
import logging
# import os


DEFAULT_DEVICE = Device.build(Device.DEVICE_CUDA)


class CuImageHandle(WSIImageHandle[CuImage, CuImage, cp.ndarray]):

    # todo: implement GPU-accelerated LANCZOS filter
    USE_LANCZOS: bool = False

    handle: Optional[CuImage]
    fname: str
    _associated_images: Optional[Mapping]

    # TODO: standalone parser of vendor information
    dummy_handle_spill: Optional[openslide.OpenSlide]

    def backend_rgba2rgb(self, img: CuImage) -> CuImage:
        # todo: it appears that CuImage does not take care of the alpha channel at all.
        return img

    @classmethod
    def validate_device(cls, device: Optional[Device]):
        device = DEFAULT_DEVICE if device is None else device
        assert isinstance(device, Device)
        return device

    @classmethod
    def region_resize_arr(cls, data: CuImage, new_size_wh: Tuple[int, int], device: Optional[Device]) -> cp.ndarray:
        device = cls.validate_device(device)
        with cp.cuda.Device(device.device_id):
            w, h, *_ = new_size_wh
            arr = cp.array(data)
            return c_skimage.transform.resize(arr, output_shape=(h, w), order=3, anti_aliasing=True)

    def __init__(self, fname: str, device_id: Optional[int], num_threads: Optional[int] = 2):
        super().__init__(fname, device_id, num_threads)
        self._associated_images = None
        self.handle = CuImage(fname)
        # todo - this is only created for parsing the image header/metadata, as the CuCIM v24.02 does not have a
        # todo - native unified metadata interface for different vendors.
        # todo - workaround as memory spilling option
        self.dummy_handle_spill = openslide.OpenSlide(fname)
        logging.info(f"{__name__}: {fname}: Create CuImageHandle at {device_id}. {self.device}."
                     f"Corresponding CUDA device PID: {cp.cuda.runtime.deviceGetPCIBusId(device_id)}")

    @LazyProperty
    def background_color(self):
        return f"#{self.dummy_handle_spill.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')}"

    @LazyProperty
    def bounding_box(self):
        dim_width, dim_height = self.dimensions
        x = int(self.dummy_handle_spill.properties.get(openslide.PROPERTY_NAME_BOUNDS_X, 0))
        y = int(self.dummy_handle_spill.properties.get(openslide.PROPERTY_NAME_BOUNDS_Y, 0))
        width = int(self.dummy_handle_spill.properties.get(openslide.PROPERTY_NAME_BOUNDS_WIDTH, dim_width))
        height = int(self.dummy_handle_spill.properties.get(openslide.PROPERTY_NAME_BOUNDS_HEIGHT, dim_height))
        return x, y, width, height

    @LazyProperty
    def has_bounding_box(self):
        return (openslide.PROPERTY_NAME_BOUNDS_X in self.dummy_handle_spill.properties
                and openslide.PROPERTY_NAME_BOUNDS_X in self.dummy_handle_spill.properties
                and openslide.PROPERTY_NAME_BOUNDS_WIDTH in self.dummy_handle_spill.properties
                and openslide.PROPERTY_NAME_BOUNDS_HEIGHT in self.dummy_handle_spill.properties
                )

    @LazyProperty
    def dimensions(self):
        return tuple(self.handle.metadata['cucim']['shape'][:2][::-1])

    @LazyProperty
    def magnification(self):
        return self.dummy_handle_spill.properties.get("openslide.objective-power") or \
            self.dummy_handle_spill.properties.get("aperio.AppMag")

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
        return self.dummy_handle_spill.properties.get("openslide.vendor", "NA")

    @property
    def mpp_x(self):
        return self.dummy_handle_spill.properties.get("openslide.mpp-x", "NA")

    @property
    def mpp_y(self):
        return self.dummy_handle_spill.properties.get("openslide.mpp-y", "NA")

    @property
    def comment(self):
        return self.dummy_handle_spill.properties.get("openslide.comment", "NA")

    @staticmethod
    def _resize_osh(thumb_cp: cp.ndarray, width: int, height: int) -> cp.ndarray:
        resized_pil = Image.fromarray(thumb_cp.get()
                                      ).convert("RGB").resize((width, height),
                                                              resample=Image.Resampling.LANCZOS)
        return c_skimage.util.img_as_ubyte(cp.array(resized_pil, copy=False), force_copy=False)

    @staticmethod
    def _resize_skimage(thumb_cp: cp.ndarray, width: int, height: int):

        resized = c_skimage.transform.resize(thumb_cp, output_shape=(height, width), order=0)
        return c_skimage.util.img_as_ubyte(resized)

    def get_thumbnail(self, new_dim) -> cp.ndarray:
        """Get thumbnail

        Args:
            new_dim: Tuple

        Returns:

        """
        # from openslide
        with (cp.cuda.Device(self.device.device_id)):
            downsample = max(*(dim / thumb for dim, thumb in zip(self.dimensions, new_dim)))
            level = self.get_best_level_for_downsample(downsample)
            target_w, target_h = (x // int(downsample) for x in self.dimensions)

            # aspect_ratio = self.dimensions[0] / self.dimensions[1]
            # target_w, target_h = self.__class__.curate_to_max_dim(target_w, target_h, max(new_dim), aspect_ratio)

            # resize
            # thumb = self.backend_rgba2rgb(self.region_backend(location=None, level=level))
            #
            # try:
            thumb = self.region_backend(level=level)
            thumb_cp: cp.ndarray = cp.array(thumb, copy=False)
            try:
                if CuImageHandle.USE_LANCZOS:
                    return CuImageHandle._resize_osh(thumb_cp, target_w, target_h)
                else:
                    return CuImageHandle._resize_skimage(thumb_cp, target_w, target_h)
            except Exception:
                # self.reload()
                logging.error(f"{__name__} - {self.fname}: OOM on {self.device.device_id}."
                              f"Use CPU"
                              f"Error Message Dumped: {traceback.format_exc()}. Try CPU method...")
                resized_pil = self.dummy_handle_spill.get_thumbnail(new_dim).convert("RGB")
                return cp.array(resized_pil, copy=False)

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
        return cast(int, down_indices[down_values.argmax()])

    def region_backend(self, location=None, level=None, size=None, **kwargs) -> CuImage:
        assert level is not None
        with cp.cuda.Device(self.device.device_id):
            if location is not None and size is not None:
                return self.handle.read_region(location=location, level=level, size=size,
                                               num_workers=self._num_threads,
                                               **kwargs)
            assert location is None and size is None
            return self.handle.read_region(level=level, num_workers=self._num_threads, **kwargs)

    @staticmethod
    def backend_to_array(region: Union[CuImage, cp.ndarray], device: Optional[Device]) -> cp.ndarray:
        device = CuImageHandle.validate_device(device)
        with cp.cuda.Device(device.device_id):
            result = cp.array(region, copy=False)

            logging.debug(f"{__name__} - {device.device_id} == {result.device}")
            return result

    @staticmethod
    def array_to_numpy(arr: cp.ndarray) -> np.ndarray:
        return arr.get()

    @classmethod
    def backend_to_pil(cls, region: CuImage) -> PILImage:
        return Image.fromarray(cls.backend_to_array(region, None).get())

    def read_label(self) -> CuImage:
        return self.handle.associated_image("label")

    def read_macro(self) -> CuImage:
        return self.handle.associated_image("macro")

    @classmethod
    def new_associated_images(cls, handle: CuImage) -> Mapping:
        if handle is None or not hasattr(handle, "associated_images"):
            return MappingProxyType(dict())
        keys = handle.associated_images
        return MappingProxyType({k: handle.associated_image(k) for k in keys})

    @property
    def associated_images(self) -> Mapping:
        handle = getattr(self, "handle", None)
        if not hasattr(self, "_associated_images") or self._associated_images is None:
            self._associated_images = self.__class__.new_associated_images(handle)
        return self._associated_images

    def clear_associated_images(self):
        self._associated_images = None

    @staticmethod
    def grid_stack(grid: List[List[cp.ndarray]], device: Optional[Device]):
        device = CuImageHandle.validate_device(device)
        with cp.cuda.Device(device.device_id):
            return cp.concatenate([cp.concatenate(row, axis=0) for row in grid], axis=1)

    @staticmethod
    def backend_dim(region: CuImage) -> Tuple[int, int]:
        return cast(Tuple[int, int], tuple(region.size()[:2][::-1]))

    @staticmethod
    def array_shape(arr: cp.ndarray) -> Tuple[int, ...]:
        return arr.shape

    def release(self):
        # todo - what's the better practice? This forces to free everything and can lock up the kernel for a couple
        # todo - of seconds
        cp.get_default_memory_pool().free_all_blocks()
        cp.get_default_pinned_memory_pool().free_all_blocks()

    def close_handle(self):
        logging.debug(f"{__name__}: {self.fname} - closed")
        if hasattr(self, "handle") and self.handle is not None:
            self.handle.close()
            del self.handle
            self.handle = None
        if self.dummy_handle_spill is not None:
            self.dummy_handle_spill.close()
            self.dummy_handle_spill = None
        # clear the cached map
        self.clear_associated_images()
        # self.release()

    def reload(self):
        self.release()
        self.handle = CuImage(self.fname)

    @property
    def device_type(self) -> ArrayDeviceType:
        return ArrayDeviceType.CUDA
