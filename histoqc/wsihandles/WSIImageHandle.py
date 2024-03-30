from abc import ABC, abstractmethod
from importlib import import_module
import logging
from typing import Sequence, TypeVar, Tuple, List, Union
from typing_extensions import Generic
import numpy as np
from PIL.Image import Image as PILImage

T = TypeVar('T')
Backend = TypeVar('Backend')
ARRAY = TypeVar('ARRAY')

WSI_HANDLES = {
    "openslide": "histoqc.wsihandles.OpenSlideHandle",
    "wsidicom": "histoqc.wsihandles.DicomHandle",
    "cucim": "histoqc.wsihandles.CuImageHandle",
}


class WSIImageHandle(ABC, Generic[T, Backend, ARRAY]):

    osh: T
    fname: str

    @staticmethod
    def create_wsi_handle(fname, handles) -> "WSIImageHandle":
        osh = None
        # get handles list
        handle_list = handles.split(",")
        for handle_type in handle_list:
            handle_type = handle_type.strip()
            try:
                handle_name = WSI_HANDLES[handle_type]
            except KeyError:
                msg = f"WSIImageHandle: \"{handle_type}\" is not a registered handle"
                logging.warning(msg)
                continue
            class_name = handle_name.split(".")[-1]
            # dynamically import module by using module name
            try:
                module = import_module(handle_name)
            except ImportError:
                msg = f"WSIImageHandle: can't import wsi handle module - \"{handle_name}\" "
                logging.warning(msg)
                continue

            # dynamically create the instance of wsi handle class
            try:
                cls = getattr(module, class_name)
            except AttributeError:
                msg = f"WSIImageHandle: can't get wsi handle class - \"{class_name}\" "
                logging.warning(msg)
                continue

            # try to read the files by using seleted handle
            # noinspection PyBroadException
            try:
                osh = cls(fname)
            except Exception:
                # current wsi handle class doesn't support this file
                msg = f"WSIImageHandle: \"{class_name}\" doesn't support {fname}"
                logging.warning(msg)
                continue
        if osh is None:
            # error: no handles support this file
            msg = f"WSIImageHandle: can't find the support wsi handles - {fname}"
            logging.error(msg)
            raise NotImplementedError(msg)
        return osh

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
    def backend_to_array(region: Union[Backend, ARRAY]) -> ARRAY:
        ...
    
    def read_region(self, location, level, size, **kwargs) -> PILImage:
        region = self.region_backend(location=location, level=level, size=size, **kwargs)
        return self.__class__.backend_to_pil(region)

    @abstractmethod
    def read_label(self):
        ...

    @abstractmethod
    def read_macro(self):
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

        # check if get the existing level
        if is_exact_level:
            backend: Backend = self.read_region((x, y), level, dims)
            return self.__class__.backend_to_array(self.backend_rgba2rgb(backend)) \
                if np.shape(backend)[-1] == 4 else self.__class__.backend_to_array(backend)
        # scale down the thumb img from the next high level
        else:
            return self.resize_tile_downward(target_sampling_factor, level, win_size=2048, **read_region_kwargs)
