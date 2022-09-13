import re
from skimage.measure import regionprops
import dill
import logging
import os
import zlib
from distutils.util import strtobool
from abc import ABC, abstractmethod
import numpy as np
from PIL import Image, ImageDraw
from typing import List, Dict, Any, TypeVar, Generic, Union, Tuple, Literal, Callable, get_args

# os.environ['PATH'] = 'C:\\research\\openslide\\bin' + ';'
# + os.environ['PATH'] #can either specify openslide bin path in PATH, or add it dynamically

# for python 3.8, Openslide should be loaded by:
from histoqc.image_core.image_handle.base_class import ImageHandle
from histoqc.image_core.image_handle import OSHandle
from histoqc._import_openslide import openslide
from histoqc.image_core.meta import ATTR_TYPE


# it is so stupid that there is no branch reset group in re
# compatible with the previous definition of valid input: leading zero and leading decimals are supported
__REGEX_SIMPLE_LEADING_DEC = r"^(\.\d+X?)$"
__REGEX_SIMPLE_LEADING_NUMERIC = r"^(\d+\.?\d*X?)"
_PATTERN_DIM_LEADING_DEC: re.Pattern = re.compile(__REGEX_SIMPLE_LEADING_DEC, flags=re.IGNORECASE)
_PATTERN_DIM_LEADING_NUMERIC: re.Pattern = re.compile(__REGEX_SIMPLE_LEADING_NUMERIC, flags=re.IGNORECASE)

__REGEX_FLOAT_DEC_SHORT = r"^(\.\d+)$"
__REGEX_FLOAT_FULL = r"^(\d+\.?\d*)"
_PATTERN_FLOAT_DEC_SHORT = re.compile(__REGEX_FLOAT_DEC_SHORT, flags=re.IGNORECASE)
_PATTERN_FLOAT_FULL = re.compile(__REGEX_FLOAT_FULL, flags=re.IGNORECASE)

MAG_NA: str = "NA"


def printMaskHelper(type, prev_mask, curr_mask):
    if type == "relative2mask":
        if len(prev_mask.nonzero()[0]) == 0:
            return str(-100)
        else:
            return str(1 - len(curr_mask.nonzero()[0]) / len(prev_mask.nonzero()[0]))
    elif type == "relative2image":
        return str(len(curr_mask.nonzero()[0]) / np.prod(curr_mask.shape))
    elif type == "absolute":
        return str(len(curr_mask.nonzero()[0]))
    else:
        return str(-1)


class MaskTileWindows:

    __rp_list: List
    __mask: np.ndarray
    __mask_pil: Image.Image
    __tissue_thresh: float
    __windows_on_mask: List[List[Tuple[int, int, int, int]]]
    __windows_on_original_image: List[List[Tuple[int, int, int, int]]]

    @property
    def mask_pil(self) -> Image.Image:
        return self.__mask_pil

    @property
    def _mask(self) -> np.ndarray:
        return self.__mask

    @property
    def _rp_list(self) -> List:
        # hmmm
        attr_name = '__rp_list'
        if not hasattr(self, attr_name) or getattr(self, attr_name) is None:
            setattr(self, attr_name, regionprops(self.__mask))
        return getattr(self, attr_name)

    def _tile_windows_on_mask(self) -> List[List[Tuple[int, int, int, int]]]:
        result_list: List[List[Tuple[int, int, int, int]]] = []
        for region in self._rp_list:
            rp_bbox = region.bbox
            windows: List[Tuple[int, int, int, int]] = MaskTileWindows.rp_tile_windows_on_mask(self.mask_pil,
                                                                                               rp_bbox,
                                                                                               self.work_tile_size,
                                                                                               self.work_stride,
                                                                                               self.__tissue_thresh)
            # result_list += windows
            result_list.append(windows)
        return result_list

    @property
    def windows_on_mask(self) -> List[List[Tuple[int, int, int, int]]]:
        if not hasattr(self, '__windows_on_mask') or self.__windows_on_mask is None:
            self.__windows_on_mask = self._tile_windows_on_mask()
        return self.__windows_on_mask

    @property
    def windows_on_original_image(self) -> List[List[Tuple[int, int, int, int]]]:
        if not hasattr(self, '__windows_on_original_image') or self.__windows_on_original_image is None:
            self.__windows_on_original_image = MaskTileWindows.__window_list_resize(self.windows_on_mask,
                                                                                    self.__size_factor)
        return self.__windows_on_original_image

    def __init_mask(self, mask: np.ndarray):
        self.__mask = mask
        self.__mask_pil = Image.fromarray(mask)

    def __init__(self, mask: np.ndarray, *, work_tile_size: int, work_stride: int,
                 size_factor: float,
                 tissue_thresh: float):
        """
        Args:
            mask:
            work_tile_size:
            work_stride:
            size_factor: size ratio of image to mask
        """
        self.__init_mask(mask.astype(np.int32))
        self.work_tile_size = work_tile_size
        self.work_stride = work_stride
        self.__size_factor = size_factor
        self.__tissue_thresh = tissue_thresh

    @staticmethod
    def max_tile_bbox_top_left_coord(rp_bbox: Tuple[int, int, int, int], work_tile_size: int, work_stride: int):
        """
        Args:
            rp_bbox: [top, left, bottom, right]. Half-open -- [Left, Right) and [Top, Bottom)
            work_tile_size:
            work_stride:

        Returns:

        """
        assert work_stride > 0
        assert work_tile_size > 0

        # not for skimage regionprops, the bbox is half-open at the bottom / right coordinates.
        # [left, right) and [top, bottom). Hence, the "+1" operation is already priced-in
        top_rp, left_rp, bottom_rp, right_rp = rp_bbox
        # start + n_step * stride + tile_size = bottom/rightmost -->  (rp_limit - tile_size) // stride = max step
        max_step_horiz = (right_rp - left_rp - work_tile_size) // work_stride
        max_step_vert = (bottom_rp - top_rp - work_tile_size) // work_stride
        tile_max_left = left_rp + max_step_horiz * work_stride
        tile_max_top = top_rp + max_step_vert * work_stride

        assert tile_max_left + work_tile_size - 1 <= right_rp
        assert tile_max_top + work_tile_size - 1 <= bottom_rp
        return tile_max_top, tile_max_left

    @staticmethod
    def region_tile_cand_pil_window_on_mask(rp_bbox: Tuple[int, int, int, int],
                                            work_tile_size: int,
                                            work_stride: int) -> List[Tuple[int, int, int, int]]:
        """
        Args:
            rp_bbox: [top, left, bottom, right]. Half-open -- [Left, Right) and [Top, Bottom)
            work_tile_size:
            work_stride:

        Returns:
            List of (left, top, right, bottom) tuples.
        """
        top_rp, left_rp, bottom_rp, right_rp = rp_bbox
        tile_max_top, tile_max_left = MaskTileWindows.max_tile_bbox_top_left_coord(rp_bbox,
                                                                                   work_tile_size,
                                                                                   work_stride)
        all_tops = np.arange(top_rp, tile_max_top + 1, work_stride, dtype=int)
        all_lefts = np.arange(left_rp, tile_max_left + 1, work_stride, dtype=int)
        def window(left, top, size): return int(left), int(top), int(left + size), int(top + size)
        all_tile_pil_window = [window(left, top, work_tile_size) for left in all_lefts for top in all_tops]
        return all_tile_pil_window

    @staticmethod
    def validate_tile_mask_area_thresh(mask_pil: Image.Image,
                                       tile_window_on_mask: Tuple[int, int, int, int],
                                       tissue_thresh: float) -> bool:
        # left, top, right, bottom = tile_window
        window_pil = mask_pil.crop(tile_window_on_mask)
        window_np = np.array(window_pil, copy=False)
        window_bool = window_np > 0
        return window_bool.mean() >= tissue_thresh

    @staticmethod
    def _valid_tile_windows_on_mask_helper(mask_pil: Image.Image,
                                           tile_cand_pil_window_on_mask: List[Tuple[int, int, int, int]],
                                           tissue_thresh: float) -> List[Tuple[int, int, int, int]]:
        """ Potential tile windows with sufficient usable tissue
        Args:
            mask_pil:
            tile_cand_pil_window_on_mask: left, top, right, bottom
            tissue_thresh
        Returns:
        """
        # output = []
        # for window in tile_cand_pil_window:
        #     has_enough_usable_tissue = _MaskTileLocator.validate_tile_mask_area_thresh(mask_pil, window,
        #                                                                                tissue_thresh)
        #     if not has_enough_usable_tissue:
        #         continue
        return [window for window in tile_cand_pil_window_on_mask
                if MaskTileWindows.validate_tile_mask_area_thresh(mask_pil, window, tissue_thresh)]

    @staticmethod
    def rp_tile_windows_on_mask(mask_pil, rp_bbox: Tuple[int, int, int, int],
                                work_tile_size: int,
                                work_stride: int,
                                tissue_thresh: float) -> List[Tuple[int, int, int, int]]:
        cand = MaskTileWindows.region_tile_cand_pil_window_on_mask(rp_bbox, work_tile_size, work_stride)
        return MaskTileWindows._valid_tile_windows_on_mask_helper(mask_pil, cand, tissue_thresh)

    @staticmethod
    def __window_resize_helper(window_on_mask: Tuple[int, int, int, int], size_factor) -> Tuple[int, int, int, int]:
        """
        Args:
            window_on_mask:  (left, top, right, bottom)
            size_factor:  size_factor = img_size / mask_size

        Returns:
            Resized (left, top, right, bottom)
        """
        return tuple(int(r * size_factor) for r in window_on_mask)

    @staticmethod
    def __window_list_resize(window_on_mask: List[List[Tuple[int, int, int, int]]],
                             size_factor: float) -> List[List[Tuple[int, int, int, int]]]:
        """
        Args:
            window_on_mask:  list of list of (left, top, right, bottom), nested at region-level.
            size_factor:  size_factor = img_size / mask_size

        Returns:
            Resized (left, top, right, bottom)
        """
        return [
                    [
                        MaskTileWindows.__window_resize_helper(win, size_factor)
                        for win in win_list_region
                    ]
                    for win_list_region in window_on_mask
              ]

# osh = s["os_handle"]
# dim_base = osh.level_dimensions[0]
# dims = osh.level_dimensions[level]


HandleType = TypeVar("HandleType", bound=ImageHandle)
DRAW_TARGET_IMG_THUMB = Literal['img_thumb']
DRAW_TARGET_MASK = Literal['mask_thumb']
# DRAW_TARGET_TYPE = Literal[DRAW_TARGET_IMG, DRAW_TARGET_MASK]


class BaseImage(dict, ABC, Generic[HandleType]):
    mask_statistics_types: List[str] = ["relative2mask", "absolute", "relative2image"]
    __image_handle: Union[HandleType, None]

    __tile_window_cache: Dict[str, MaskTileWindows]

    @staticmethod
    def validate_dim(dim: str):
        matched = _PATTERN_DIM_LEADING_DEC.match(dim) or _PATTERN_DIM_LEADING_NUMERIC.match(dim)
        if matched:
            return dim
        return None

    @abstractmethod
    def new_image_handle(self, fname, params) -> HandleType:
        raise NotImplementedError

    @classmethod
    @abstractmethod
    def build(cls, fname: str, fname_outdir: str, params: Dict[ATTR_TYPE, Any]):
        raise NotImplementedError

    @abstractmethod
    def getImgThumb(self, dim) -> np.ndarray:
        raise NotImplementedError

    def addToPrintList(self, name, val):
        self[name] = val
        self["output"].append(name)

    @property
    def base_mag(self):
        return self["base_mag"]

    def __getitem__(self, key: ATTR_TYPE):
        value = super().__getitem__(key)
        if hasattr(self, "in_memory_compression") and self.in_memory_compression and key.startswith("img"):
            value = dill.loads(zlib.decompress(value))
        return value

    def __setitem__(self, key: ATTR_TYPE, value):
        if hasattr(self, "in_memory_compression") and self.in_memory_compression and key.startswith("img"):
            value = zlib.compress(dill.dumps(value), level=5)

        return super().__setitem__(key, value)

    def _default_dict_config(self, fname: str, fname_outdir: str, params: Dict[str, Any]):
        self.in_memory_compression = strtobool(params.get("in_memory_compression", "False"))

        self["warnings"]: str = ['']  # this needs to be first key in case anything else wants to add to it
        self["output"]: List[str] = []
        # these 2 need to be first for UI to work
        self.addToPrintList("filename", os.path.basename(fname))
        self.addToPrintList("comments", " ")

        self["outdir"] = fname_outdir
        self["dir"] = os.path.dirname(fname)

        self["image_work_size"] = params.get('image_work_size', "1.25x")
        self["mask_statistics"] = params.get("mask_statistics", "relative2mask")

        if self["mask_statistics"] not in BaseImage.mask_statistics_types:
            logging.error(
                f"mask_statistic type '{self['mask_statistics']}' "
                f"is not one of the 3 supported options relative2mask, absolute, relative2image!")
            exit()

        self["img_mask_force"] = []

        self["completed"] = []

    # starting to decouple the resource handle and dimensions to their literal keys
    @property
    def image_handle(self) -> Union[HandleType, None]:
        return self.__image_handle

    # I want to keep the dict keys of BaseImage untouched for now, avoiding too much refactoring.
    # For PILImage, base_mag is given by the config.ini or None
    def _init_resource(self, fname, params):
        handle = self.new_image_handle(fname, params)
        self.__image_handle = handle
        # for backward compatibility only
        self["os_handle"] = handle.handle
        self["image_base_size"] = handle.base_size_wh
        self["base_mag"] = getMag(self, params)
        self.addToPrintList("base_mag", self["base_mag"])

    def _init_mask_use(self):
        self["img_mask_use"] = np.ones(self.getImgThumb(self["image_work_size"]).shape[0:2], dtype=bool)

    def _init_tile_window_cache(self):
        self.__tile_window_cache = dict()

    def __init__(self, fname: str, fname_outdir: str, params: Dict[str, Any]):
        super().__init__()
        self._default_dict_config(fname, fname_outdir, params)
        self._init_resource(fname, params)
        self._init_mask_use()
        self._init_tile_window_cache()

    def clear_handles(self):
        self["os_handle"] = None
        self.__image_handle = None

    # for type checker only
    def get(self, key: ATTR_TYPE, default: Any = None):
        return super().get(key, default)

    def _tile_windows_helper(self,
                             tile_size: int = 256, tile_stride: int = 256,
                             tissue_thresh: float = 0.5) -> MaskTileWindows:
        mask = self._mask_use_for_tiles
        assert mask is not None, f"{self['filename']}: mask is not initialized"
        assert isinstance(mask, np.ndarray), f"The mask is expected to be a Numpy NDArray"
        img_w, img_h = self.image_handle.base_size_wh
        # shape --> row column --> height width
        mask_w, mask_h = mask.shape[1], mask.shape[0]
        size_factor = img_w / mask_w
        size_factor_ref = img_h / mask_h
        assert size_factor > 0
        if round(size_factor) != round(size_factor_ref):
            logging.warning(f"{self['filename']}: Aspect Ratio Mismatch: {self.image_handle.base_size_wh} vs. "
                            f"{mask_w, mask_h}")
        logging.debug(f"{self['filename']}: size ratio between img and thumb: {size_factor}")
        work_tile_size = tile_size / size_factor
        work_stride = tile_stride / size_factor
        mask_tile_windows = MaskTileWindows(mask, work_tile_size=work_tile_size,
                                            work_stride=work_stride,
                                            size_factor=size_factor, tissue_thresh=tissue_thresh)

        return mask_tile_windows

    @property
    def _img_use_for_tiles(self):
        return self.getImgThumb(self["image_work_size"])

    @property
    def _mask_use_for_tiles(self):
        return self['img_mask_use']

    def tile_windows(self,
                     tile_size: int = 256, tile_stride: int = 256,
                     tissue_thresh: float = 0.5, *, force_rewrite: bool = False) -> MaskTileWindows:
        key = f"{tile_size}_{tile_stride}_{tissue_thresh}"
        root_dict = self.__tile_window_cache
        entry = root_dict.get(key, None)
        if entry is None or force_rewrite:
            root_dict[key] = self._tile_windows_helper(tile_size, tile_stride, tissue_thresh)
        return root_dict[key]

    @staticmethod
    def __bbox_overlay_helper(img: np.ndarray, windows_grouped_by_region: List[List[Tuple[int, int, int, int]]],
                              outline: str = 'green', width: int = 2) -> Image.Image:
        # avoid inplace change
        copy = np.array(img, copy=True)
        draw_pil = Image.fromarray(copy, mode="RGB")
        draw_context = ImageDraw.Draw(draw_pil, mode="RGB")
        for window_list in windows_grouped_by_region:
            for window in window_list:
                # ImageDraw accepts x0 y0 x1 y1
                left, top, right, bottom = window
                draw_context.rectangle((left, top, right, bottom), outline=outline, width=width)

        return draw_pil

    def bbox_overlay(self,
                     target: Literal[DRAW_TARGET_IMG_THUMB, DRAW_TARGET_MASK] = 'img_thumb',
                     tile_size_on_img: int = 256, tile_stride_on_img: int = 256,
                     tissue_thresh: float = 0.5, *, force_rewrite: bool = False, outline='green', width=2
                     ) -> Image.Image:
        # note that the window_on_image corresponding to the orignal image at base-mag.
        # the thumb image is at the same size of masks
        tile_windows: MaskTileWindows = self.tile_windows(tile_size_on_img, tile_stride_on_img, tissue_thresh,
                                                          force_rewrite=force_rewrite)
        windows_on_mask: List[List[Tuple[int, int, int, int]]] = tile_windows.windows_on_mask

        # all properties below are cached
        mapping: Dict[Literal[DRAW_TARGET_IMG_THUMB, DRAW_TARGET_MASK], np.ndarray] = {
            get_args(DRAW_TARGET_IMG_THUMB)[0]: self._img_use_for_tiles,
            get_args(DRAW_TARGET_MASK)[0]: self._mask_use_for_tiles,
        }
        target_img_arr = mapping[target]
        return self.__bbox_overlay_helper(target_img_arr, windows_grouped_by_region=windows_on_mask, outline=outline,
                                          width=width)

    @staticmethod
    def default_screen_identity(img: np.ndarray):
        return True

    @staticmethod
    def __window_convert(window: Tuple[int, int, int, int]) -> Tuple[Tuple[int, int], Tuple[int, int]]:
        """TO OpenSlide style (left, top) + (width, height)
        Args:
            window:

        Returns:

        """
        left, top, right, bottom = window

        left = int(left)
        top = int(top)
        right = int(right)
        bottom = int(bottom)

        location = (left, top)
        width = right - left
        height = bottom - top
        size = (width, height)
        return location, size

    def valid_tile_extraction(self,
                              path, *, prefix='', suffix='.png',
                              screen_callbacks: Callable = default_screen_identity.__func__,
                              tile_size: int = 256,
                              tile_stride: int = 256, tissue_thresh: float = 0.5, force_rewrite: bool = False):
        tw: MaskTileWindows = self.tile_windows(tile_size, tile_stride, tissue_thresh, force_rewrite=force_rewrite)
        window_list_of_regions = tw.windows_on_original_image
        for region_windows in window_list_of_regions:
            for window in region_windows:
                # just to make the convention clear
                location, size = BaseImage.__window_convert(window)
                region = self.image_handle.read_region(location, 0, size)
                tile_np = np.array(region, copy=False)
                valid_flag = screen_callbacks(tile_np)
                if not valid_flag:
                    continue
                # prefix can be the slide name
                full_export_dest = os.path.join(path, f"{prefix}_{window}{suffix}")
                actual_path, actual_base = os.path.split(full_export_dest)
                os.makedirs(actual_path, exist_ok=True)
                region.save(full_export_dest)


# Utils
def __validate_mag_values(s: BaseImage, mag, params, warning_str):
    if (mag == MAG_NA or strtobool(
            params.get("confirm_base_mag", "False"))):
        # do analysis work here
        logging.warning(warning_str)
        s["warnings"].append(warning_str)
        return mag
    else:
        mag = float(mag)
    return mag


def validateSizeFactors(mag: Union[str, int, float]):
    """Validate size factors, e.g., magnification, explicit size, or downsample ratios.
    Args:
        mag:

    Returns:
        Validated size factor either as a float number or "NA" (MAG_NA)
    """
    if isinstance(mag, (int, float)):
        return float(mag)
    numeric_mag_str_flag = (_PATTERN_DIM_LEADING_DEC.match(mag) or _PATTERN_DIM_LEADING_NUMERIC.match(mag))
    invalid_flag = mag == MAG_NA or not numeric_mag_str_flag
    if invalid_flag:
        return MAG_NA
    # regex determines X must either be abscent or at the end of the string
    if "X" in mag.upper():
        mag = mag[0:-1]
    return float(mag)


# this function is seperated out because in the future we hope to have automatic detection of
# magnification if not present in open slide, and/or to confirm openslide base magnification
def getMagOS(s: BaseImage, params, warning_str):
    osh: openslide.OpenSlide = s.image_handle
    mag = osh.properties.get("openslide.objective-power", MAG_NA)
    if mag == MAG_NA:  # openslide doesn't set objective-power for all SVS files:
        # https://github.com/openslide/openslide/issues/247
        mag = osh.properties.get("aperio.AppMag", MAG_NA)
    mag = __validate_mag_values(s, mag, params, warning_str)
    return mag


def getMagPredefined(s: BaseImage, params, warning_str):
    mag = params.get("base_mag", MAG_NA)
    mag = validateSizeFactors(mag)
    return __validate_mag_values(s, mag, params, warning_str)


def getMag(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tgetMag")
    warning_str_wsi = f"{s['filename']} - Unknown base magnification for file"
    warning_str_roi = f"{s['filename']} - Mag of PIL BaseImage must be specified manually"
    if isinstance(s.image_handle, OSHandle):
        mag = getMagOS(s, params, warning_str_wsi)
    else:
        mag = getMagPredefined(s, params, warning_str_roi)
    return validateSizeFactors(mag)
