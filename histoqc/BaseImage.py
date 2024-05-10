from __future__ import annotations
import logging
import os
import sys

import numpy as np
import zlib
import traceback
import dill
from distutils.util import strtobool
import re
from typing import Union, Tuple, cast, Optional
from histoqc.wsi_handles.base import WSIImageHandle
from histoqc.wsi_handles.constants import KEY_CUCIM
from histoqc.array_adapter.typing import TYPE_ARRAY
from histoqc.array_adapter import ArrayDeviceType
_REGEX_MAG = r"^(\d?\.?\d*X?)"
_PATTERN_MAG: re.Pattern = re.compile(_REGEX_MAG, flags=re.IGNORECASE)
MAG_NA = None

# todo either document or regularize the fields of BaseImage
# class BaseImageData(TypedDict):
#     warnings: List[str]
#     output: List
#     filename: str
#     comments: str
#     outdir: str
#     dir: str
#     # width, height
#     image_base_size: Tuple[int, int]
#     enable_bounding_box: bool
#     image_work_size: str | float
#     mask_statistics: str
#     base_mag: Optional[float]
#     img_mask_use: np.ndarray
#     img_mask_force: List[str]
#     completed: List[str]
#     img_bbox: Tuple[int, int, int, int]


class BaseImage(dict):

    _image_handle: Optional[WSIImageHandle]
    _device_id: Optional[int]

    @property
    def image_handle(self) -> Optional[WSIImageHandle]:
        if hasattr(self, "_image_handle"):
            return self._image_handle
        return None

    @image_handle.setter
    def image_handle(self, image_handle: WSIImageHandle):
        self._image_handle = image_handle

    def __init__(self, fname, fname_outdir, params, device_id: Optional[int] = None, num_threads: Optional[int] = 1):
        dict.__init__(self)
        # init
        self._device_id = device_id
        self._image_handle = None
        handles = params.get("handles", KEY_CUCIM)

        # dynamically load wsi image handle
        try:
            self.image_handle: WSIImageHandle = WSIImageHandle.build_handle(fname,
                                                                            handles, device_id=device_id,
                                                                            num_threads=num_threads)
        except Exception:
            trace_string = traceback.format_exc()
            logging.error(f"{__name__}: {fname} -- Error Creating Handle - Traceback: {trace_string}")
            sys.exit(1)
        self.in_memory_compression = strtobool(params.get("in_memory_compression", "False"))

        self["warnings"] = ['']  # this needs to be first key in case anything else wants to add to it
        self["output"] = []

        # these 2 need to be first for UI to work
        self.addToPrintList("filename", os.path.basename(fname))
        self.addToPrintList("comments", " ")

        self["outdir"] = fname_outdir
        self["dir"] = os.path.dirname(fname)

        # get handles from config

        self["image_base_size"] = self.image_handle.dimensions
        self["enable_bounding_box"] = strtobool(params.get("enable_bounding_box", "False"))
        # check: if it doesn't have bbox set enable_bounding_box to False
        self.setBBox()
        self.addToPrintList("image_bounding_box", self["img_bbox"])
        self["image_work_size"] = params.get("image_work_size", "1.25x")
        self["mask_statistics"] = params.get("mask_statistics", "relative2mask")

        self["base_mag"] = getMag(self, params)

        if not self["base_mag"]:
            logging.error(
                f"{self['filename']}: Has unknown or uncalculated base magnification,"
                f" cannot specify magnification scale! Did you try getMag?")
            return

        self.addToPrintList("base_mag", self["base_mag"])

        mask_statistics_types = ["relative2mask", "absolute", "relative2image"]
        if self["mask_statistics"] not in mask_statistics_types:
            logging.error(
                f"mask_statistic type '{self['mask_statistics']}'"
                f" is not one of the 3 supported options relative2mask, absolute, relative2image!")
            exit()

        self["img_mask_use"] = np.ones(self.getImgThumb(self["image_work_size"]).shape[0:2], dtype=bool)
        self["img_mask_force"] = []

        self["completed"] = []

    @staticmethod
    def is_img_data(key: str) -> bool:
        return key.startswith("img") and key != "img_bbox"

    def _sync_to_handle(self, key, value, device: Optional[ArrayDeviceType] = None):
        if not self.__class__.is_img_data(key):
            return value
        if hasattr(self, "_image_handle") and self.image_handle is not None:
            device = device if device is not None else self.image_handle.device
            value = self.image_handle.adapter.__class__.curate_arrays_device(value,
                                                                             device=device, copy=False)
        return value

    def __getitem__(self, key):
        value = super(BaseImage, self).__getitem__(key)
        if hasattr(self, "in_memory_compression") and self.in_memory_compression and self.__class__.is_img_data(key):
            value = dill.loads(zlib.decompress(value))

        value = self._sync_to_handle(key, value)
        return value

    def __setitem__(self, key, value):
        value = self._sync_to_handle(key, value)
        if hasattr(self, "in_memory_compression") and self.in_memory_compression and self.__class__.is_img_data(key):
            value = zlib.compress(dill.dumps(value), level=5)
        return super(BaseImage, self).__setitem__(key, value)

    # setbounding box start coordinate and size
    def setBBox(self):
        # add self["img_bbox"] = (x, y, width, heigh)
        image_handle = self.image_handle
        # set default bbox
        (dim_width, dim_height) = image_handle.dimensions
        self["img_bbox"] = (0, 0, dim_width, dim_height)
        # try to get bbox if bounding_box is ture

        # Does WSI have bounding box
        if self["enable_bounding_box"] and image_handle.has_bounding_box:
            self["img_bbox"] = image_handle.bounding_box
        elif self["enable_bounding_box"] and not image_handle.has_bounding_box:
            self["enable_bounding_box"] = False
            logging.warning(f"{self['filename']}: Bounding Box requested but could not read")
            self["warnings"].append("Bounding Box requested but could not read")

    def addToPrintList(self, name, val):
        self[name] = val
        self["output"].append(name)

    # find the next higher level by giving a downsample factor 
    # return (level, isFindCloseLevel)
    def getBestLevelForDownsample(self, downsample_factor: float) -> Tuple[int, bool]:
        osh = self.image_handle
        relative_down_factors_idx = [np.isclose(i / downsample_factor, 1, atol=.01) for i in osh.level_downsamples]
        level = np.where(relative_down_factors_idx)[0]
        if level.size:
            return cast(int, level[0]), True
        else:
            return osh.get_best_level_for_downsample(downsample_factor), False

    @staticmethod
    def is_valid_size(size: str):
        size = str(size)
        return _PATTERN_MAG.fullmatch(size) is not None

    @staticmethod
    def validate_slide_size(size: str, assertion: bool = False):
        size = str(size)
        if assertion:
            assert BaseImage.is_valid_size(size), f"{size}: does not match pattern {_REGEX_MAG}"
        # for now just cast it to str
        return size

    def getImgThumb(self, size: str) -> Optional[TYPE_ARRAY]:
        # note that while size is annotated as str, a bunch of functions in process Modules like SaveModule doesn't
        # really handle it that way, and trace of previous coding also suggest that there actually lack a params
        # type protocol in xxxModules. I think an extra layer of data sanitizing is necessary here.
        size = BaseImage.validate_slide_size(size, assertion=False)
        # get img key with size
        key = "img_" + str(size)
        # return the img if it exists
        if key in self:
            return self[key]

        # get open slide handle
        image_handle = self.image_handle

        # get the size of view on current img - the current size of view by using the bounding box.
        # bounding box could be the size of whole img or read the size from the slide mate data.
        (bx, by, bwidth, bheight) = self["img_bbox"]
        img_base_size = (bwidth, bheight)

        # barricade the invalid input first
        # can't determine operation.
        if not BaseImage.is_valid_size(size):
            # print out error message
            err_msg = f"{self['filename']}: invalid arguments - {size}"
            logging.error(err_msg)
            self["warnings"].append(err_msg)
            return

        # specifies a desired operating magnification
        if size.endswith(("X", "x")) and size[:-1].replace(".", "0", 1).isdigit():
            target_mag = float(size.upper().split("X")[0])
            # magnification
            base_mag = self["base_mag"]
            target_sampling_factor = base_mag / target_mag
            target_dims = cast(Tuple[int, int],
                               tuple(np.rint(np.asarray(img_base_size) / target_sampling_factor).astype(int)))

            # generate the thumb img
            self[key] = self.image_handle.best_thumb(bx, by, target_dims, target_sampling_factor)

        # the size of the img is number 
        elif size.replace(".", "0", 1).isdigit():
            size = float(size)
            # specifies a desired downscaling factor 
            if size < 1:
                target_downscaling_factor = size
                target_sampling_factor = 1 / target_downscaling_factor
                target_dims = cast(Tuple[int, int],
                                   tuple(np.rint(np.asarray(img_base_size) * target_downscaling_factor).astype(int)))

                # generate the thumb img
                self[key] = self.image_handle.best_thumb(bx, by, target_dims, target_sampling_factor)

            # specifies a desired level of open slide
            elif size < 100:
                target_level = int(size)
                if target_level >= image_handle.level_count:
                    target_level = image_handle.level_count - 1
                    msg = (f"Desired Image Level {size + 1} does not exist!"
                           f" Instead using level {image_handle.level_count - 1}! Downstream output may not be correct")
                    logging.error(f"{self['filename']}: {msg}")
                    self["warnings"].append(msg)
                size = (tuple((np.array(img_base_size) / image_handle.level_downsamples[target_level]).astype(int))
                        if self["enable_bounding_box"]
                        else image_handle.level_dimensions[target_level])
                logging.info(
                    f"{self['filename']} - \t\tloading image from level {target_level} of size"
                    f" {image_handle.level_dimensions[target_level]}")
                # PILLOW
                tile = image_handle.read_region((bx, by), target_level, size)

                self[key] = (np.asarray(self.image_handle.backend_rgba2rgb(tile))
                             if len(tile.getbands()) == 4
                             else np.asarray(tile))

                # specifies a desired size of thumbnail
            else:
                # recommend having the dimension is less than 10k     
                if size > 10000:
                    # warning message for the memory overhead
                    msg = f"Suggest using the smaller dimension thumbnail image because of the memory overhead."
                    logging.warning(msg)
                    self["warnings"].append(msg)
                target_dims = getDimensionsByOneDim(self, int(size))
                target_sampling_factor = img_base_size[0] / target_dims[0]
                self[key] = self.image_handle.best_thumb(bx, by, target_dims, target_sampling_factor)
        return self[key]


def printMaskHelper(statistic_type: str, prev_mask, curr_mask):
    if statistic_type == "relative2mask":
        if len(prev_mask.nonzero()[0]) == 0:
            return str(-100)
        else:
            return str(1 - len(curr_mask.nonzero()[0]) / len(prev_mask.nonzero()[0]))
    elif statistic_type == "relative2image":
        return str(len(curr_mask.nonzero()[0]) / np.prod(curr_mask.shape))
    elif statistic_type == "absolute":
        return str(len(curr_mask.nonzero()[0]))
    else:
        return str(-1)


def parsed_mag(mag: Union[str, int, float]) -> Union[None, float]:
    """Parse magnification to float
    Args:
        mag:

    Returns:
        Validated size factor either as a float number or "NA" (MAG_NA)
    """
    if isinstance(mag, (int, float)):
        return float(mag)
    numeric_mag_str_flag = BaseImage.is_valid_size(mag)
    invalid_flag = mag == MAG_NA or not numeric_mag_str_flag
    if invalid_flag:
        return MAG_NA
    # regex determines X must either be abscent or at the end of the string
    if "X" in mag.upper():
        mag = mag[0: -1]
    return float(mag)


# this function is seperated out because in the future we hope to have automatic detection of
# magnification if not present in open slide, and/or to confirm openslide base magnification
def getMag(s: BaseImage, params) -> Union[float, None]:
    osh = s.image_handle
    mag = osh.magnification or MAG_NA
    # workaround for unspecified mag -- with or without automatic detection it might be preferred to have
    # mag predefined
    mag = mag or parsed_mag(params.get("base_mag"))
    # mag is santized after invoking getMag regarding whether it's None. Therefore, it should not raise
    # the exception here.
    mag = float(mag) if mag is not MAG_NA else MAG_NA
    logging.info(f"{s['filename']} - \tgetMag = {mag}")
    return mag


def getDimensionsByOneDim(s: BaseImage, dim: int) -> Tuple[int, int]:
    (x, y, width, height) = s["img_bbox"]
    # calulate the width or height depends on dim
    if width > height:
        h = int(dim * height / width)
        return dim, h
    else:
        w = int(dim * width / height)
        return w, dim
