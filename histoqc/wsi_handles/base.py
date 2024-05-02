from __future__ import annotations
from abc import ABC, abstractmethod

from histoqc.import_wrapper import dynamic_import
import logging
from typing import Sequence, TypeVar, Tuple, List, Union, Dict, Callable, Mapping, Generic
import numpy as np
from PIL.Image import Image as PILImage
from typing_extensions import final
from histoqc.array_adapter import ArrayDevice, ArrayAdapter
import os

from histoqc.wsi_handles.constants import WSI_HANDLES, HANDLE_DELIMITER

T = TypeVar('T')
Backend = TypeVar('Backend')
ARRAY = TypeVar('ARRAY')


class WSIImageHandle(ABC, Generic[T, Backend, ARRAY]):

    handle: T
    fname: str
    _adapter: ArrayAdapter

    @staticmethod
    def curate_shorter_edge(width, height, limit, aspect_ratio):
        """Simulate the PIL.Image.Image.thumbnail approach to curate the size.

         The target size should preserve the aspect ratio.

        Args:
            width:
            height:
            limit:
            aspect_ratio:

        Returns:

        """
        if height > width:
            # limit the shorter one
            width = max(width, limit)
            height = round(width / aspect_ratio)
        else:
            height = max(height, limit)
            width = round(height * aspect_ratio)
        return width, height

    @staticmethod
    def curate_to_max_dim(width, height, max_size, aspect_ratio):
        """Set the longer one of width and height to max_size while preserving the aspect ratio.

        Args:
            width:
            height:
            max_size:
            aspect_ratio:

        Returns:
            width, height tuple
        """
        if height > width:
            height = max_size
            width = round(height * aspect_ratio)
        else:
            width = max_size
            height = round(width / aspect_ratio)
        return width, height

    @property
    @abstractmethod
    def associated_images(self) -> Mapping[str, Backend]:
        ...

    @property
    @abstractmethod
    def background_color(self) -> str:
        ...
        
    @property
    @abstractmethod
    def bounding_box(self) -> Tuple[int, int, int, int]:
        ...

    @property
    @abstractmethod
    def has_bounding_box(self) -> bool:
        ...
    
    @property
    @abstractmethod
    def dimensions(self) -> Tuple[int, int]:
        """

        Returns:
            (width, height) tuple
        """
        ...

    @property
    @abstractmethod
    def magnification(self) -> str:
        ...

    @property
    @abstractmethod
    def level_count(self) -> int:
        ...

    @property
    @abstractmethod
    def level_dimensions(self) -> Sequence[Tuple[int, int]]:
        ...

    @property
    @abstractmethod
    def level_downsamples(self) -> Sequence[float]:
        ...

    @property
    @abstractmethod
    def vendor(self) -> str:
        ...

    @property
    @abstractmethod
    def mpp_x(self) -> str:
        ...

    @property
    @abstractmethod
    def mpp_y(self) -> str:
        ...

    @property
    @abstractmethod
    def comment(self) -> str:
        ...

    @abstractmethod
    def get_thumbnail(self, new_dim) -> Union[ARRAY, Backend]:
        ...

    @abstractmethod
    def backend_rgba2rgb(self, img) -> Backend:
        """Remove the alpha channel with a predefined background color blended into the image.

        Args:
            img:

        Returns:
            R
        """
        ...

    @abstractmethod
    def region_backend(self, location, level, size, **kwargs):
        ...

    @staticmethod
    @abstractmethod
    def backend_to_pil(region: Union[Backend, ARRAY]) -> PILImage:
        ...

    @staticmethod
    @abstractmethod
    def array_to_numpy(arr: ARRAY) -> np.ndarray:
        ...

    @staticmethod
    @abstractmethod
    def backend_dim(region: Backend) -> Tuple[int, int]:
        """
        Defines the unified interface to obtain BACKEND handle type.
        Args:
            region:

        Returns:

        """
        ...

    @staticmethod
    @abstractmethod
    def array_shape(arr: ARRAY) -> Tuple[int, int]:
        ...

    @staticmethod
    @abstractmethod
    def backend_to_array(region: Union[Backend, ARRAY]) -> ARRAY:
        ...
    
    def read_region(self, location, level, size, **kwargs) -> PILImage:
        region = self.region_backend(location=location, level=level, size=size, **kwargs)
        return self.__class__.backend_to_pil(region)

    @abstractmethod
    def read_label(self) -> Backend:
        ...

    @abstractmethod
    def read_macro(self) -> Backend:
        ...

    @classmethod
    @abstractmethod
    def region_resize_arr(cls, data: ARRAY, new_size_wh: Tuple[int, int]) -> ARRAY:
        ...

    @abstractmethod
    def get_best_level_for_downsample(self, downsample_factor: float):
        ...

    def curated_best_level_for_downsample(self, downsample_factor: float) -> Tuple[int, bool]:
        relative_down_factors_idx = [np.isclose(i / downsample_factor, 1, atol=.01) for i in self.level_downsamples]
        level = np.where(relative_down_factors_idx)[0]
        if level.size:
            return level[0], True
        return self.get_best_level_for_downsample(downsample_factor), False

    @staticmethod
    @abstractmethod
    def grid_stack(grid: List[List[ARRAY]]):
        ...

    def resize_tile_downward(self, target_downsampling_factor, level,
                             win_size: int = 2048, **read_region_kwargs) -> List[List[ARRAY]]:

        (bx, by, bwidth, bheight) = self.bounding_box
        end_x = bx + bwidth
        end_y = by + bheight

        closest_downsampling_factor = self.level_downsamples[level]

        # create a new img
        grid = []
        for x in range(bx, end_x, win_size):
            row_piece = []
            for y in range(by, end_y, win_size):
                win_width, win_height = [win_size] * 2
                # Adjust extraction size for endcut
                if end_x < x + win_width:
                    win_width = end_x - x
                if end_y < y + win_height:
                    win_height = end_y - y

                win_down_width = int(round(win_width / target_downsampling_factor))
                win_down_height = int(round(win_height / target_downsampling_factor))

                win_width = int(round(win_width / closest_downsampling_factor))
                win_height = int(round(win_height / closest_downsampling_factor))

                # TODO Note: this isn't very efficient, and if more efficiency isneeded

                # TODO cont. Separate the public interface read_region -> PIL.Image to the internal data backend
                # TODO (data_from_region)
                # TODO e.g., cupy is far more efficient for resize w/ interpolation and antialiasing.
                closest_region = self.region_backend(location=(x, y), level=level, size=(win_width, win_height),
                                                     **read_region_kwargs)
                if np.shape(closest_region)[-1] == 4:
                    closest_region = self.backend_rgba2rgb(closest_region)
                closest_region_arr = self.__class__.backend_to_array(closest_region)
                target_region = self.__class__.region_resize_arr(closest_region_arr,
                                                                 (win_down_width, win_down_height))
                row_piece.append(target_region)
            # row_piece = np.concatenate(row_piece, axis=0)
            grid.append(row_piece)
        # grid = np.concatenate(output, axis=1)
        #
        return self.__class__.grid_stack(grid)

    def best_thumb(self, x: int, y: int, dims: Tuple[int, int],
                   target_sampling_factor: float, **read_region_kwargs) -> ARRAY:

        # get thumb from og
        if not self.has_bounding_box:
            max_dim = dims[0] if dims[0] > dims[1] else dims[1]
            return self.__class__.backend_to_array(self.get_thumbnail((max_dim, max_dim)))

        (level, is_exact_level) = self.curated_best_level_for_downsample(target_sampling_factor)

        # check if to get the existing level
        if is_exact_level:
            backend: Backend = self.read_region((x, y), level, dims)
            return self.__class__.backend_to_array(self.backend_rgba2rgb(backend)) \
                if np.shape(backend)[-1] == 4 else self.__class__.backend_to_array(backend)
        # scale down the thumb img from the next high level
        else:
            return self.resize_tile_downward(target_sampling_factor, level, win_size=2048, **read_region_kwargs)

    @staticmethod
    def parse_wsi_handles(handle_list: str | List[str], delimiter: str,
                          wsi_handle_dict: Dict[str, Tuple[str, str]]) -> Tuple[List[str], List[str]]:
        if isinstance(handle_list, str):
            handle_list = handle_list.split(delimiter)
        module_list = []
        attr_list = []
        for handle_type in handle_list:
            handle_type = handle_type.strip()
            if handle_type not in wsi_handle_dict:
                msg = f"WSIImageHandle: \"{handle_type}\" is not a registered handle"
                logging.warning(msg)
                continue
            result = wsi_handle_dict[handle_type]
            assert len(result) == 2, f"{result}"
            module, attr = wsi_handle_dict[handle_type]
            module_list.append(module)
            attr_list.append(attr)
        return module_list, attr_list

    @classmethod
    def __create_handle(cls, fname: str,
                        handle_class_list: List[Callable[[str], "WSIImageHandle"]]) -> "WSIImageHandle":
        image_handle = None
        assert fname is None or os.path.exists(fname), f"fname should either be None or point to an existing file"
        for handle_class in handle_class_list:
            # noinspection PyBroadException
            try:
                image_handle = handle_class(fname)
                break
            except Exception:
                # current wsi handle class doesn't support this file
                msg = f"WSIImageHandle: \"{handle_class}\" doesn't support {fname}"
                logging.warning(msg)
                continue
        if image_handle is None:
            # error: no handles support this file
            msg = f"WSIImageHandle: can't find the support wsi handles - {fname}"
            logging.error(msg)
            raise NotImplementedError(msg)
        return image_handle

    @classmethod
    @final
    def build_handle(cls, fname: str, handles: str) -> "WSIImageHandle":
        # get handles list
        module_list, attr_list = cls.parse_wsi_handles(handles, delimiter=HANDLE_DELIMITER, wsi_handle_dict=WSI_HANDLES)
        handle_class_list = dynamic_import(module_list, attr_list, return_first=False)
        image_handle = cls.__create_handle(fname, handle_class_list)
        return image_handle

    def __init__(self, fname: str):
        self.fname = fname
        self._adapter = ArrayAdapter.build(input_device=self.device, output_device=self.device)

    @abstractmethod
    def close_handle(self):
        ...

    def close(self):
        self.close_handle()
        self.handle = None

    def is_closed(self):
        return not hasattr(self, "handle") or self.handle is None

    @property
    @abstractmethod
    def device(self) -> ArrayDevice:
        raise NotImplementedError

    @property
    def adapter(self) -> ArrayAdapter:
        return self._adapter
