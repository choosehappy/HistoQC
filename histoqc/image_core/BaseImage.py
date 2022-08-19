import re

import dill
import logging
import os
import zlib
from distutils.util import strtobool
from abc import ABC, abstractmethod
import numpy as np
from typing import List, Dict, Any, TypeVar, Generic, Union

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


# osh = s["os_handle"]
# dim_base = osh.level_dimensions[0]
# dims = osh.level_dimensions[level]

HandleType = TypeVar("HandleType", bound=ImageHandle)


class BaseImage(dict, ABC, Generic[HandleType]):
    mask_statistics_types: List[str] = ["relative2mask", "absolute", "relative2image"]
    __image_handle: Union[HandleType, None]

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
        self["image_base_size"] = handle.base_size
        self["base_mag"] = getMag(self, params)
        self.addToPrintList("base_mag", self["base_mag"])

    def _init_mask_use(self):
        self["img_mask_use"] = np.ones(self.getImgThumb(self["image_work_size"]).shape[0:2], dtype=bool)

    def __init__(self, fname: str, fname_outdir: str, params: Dict[str, Any]):
        super().__init__()
        self._default_dict_config(fname, fname_outdir, params)
        self._init_resource(fname, params)
        self._init_mask_use()

    def clear_handles(self):
        self["os_handle"] = None
        self.__image_handle = None

    # for type checker only
    def get(self, key: ATTR_TYPE, default: Any = None):
        return super().get(key, default)


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