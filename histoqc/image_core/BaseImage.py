import dill
import inspect
import logging
import os
import zlib
from distutils.util import strtobool
from abc import ABC, abstractmethod
import numpy as np
from typing import List, Tuple, Union, Dict, Any, Literal

# os.environ['PATH'] = 'C:\\research\\openslide\\bin' + ';' + os.environ['PATH'] #can either specify openslide bin path in PATH, or add it dynamically
import openslide


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


# this function is seperated out because in the future we hope to have automatic detection of
# magnification if not present in open slide, and/or to confirm openslide base magnification
def getMag(s, params):
    logging.info(f"{s['filename']} - \tgetMag")
    osh = s["os_handle"]
    mag = osh.properties.get("openslide.objective-power", "NA")
    if mag == "NA":  # openslide doesn't set objective-power for all SVS files:
        # https://github.com/openslide/openslide/issues/247
        mag = osh.properties.get("aperio.AppMag", "NA")
    if (mag == "NA" or strtobool(
            params.get("confirm_base_mag", "False"))):
        # do analysis work here
        logging.warning(f"{s['filename']} - Unknown base magnification for file")
        s["warnings"].append(f"{s['filename']} - Unknown base magnification for file")
    else:
        mag = float(mag)

    return mag


# Personally I would either avoid inheriting from built-in dict at all
# and instead use attributes or an associated dict member but I assume it is easier to serialize a dict in future?
# For type checkers of literal key values in the codings -- get warnings if I make mistakes
# Ideally I may use const variables to replace any hardcoded literal values, but it may interfere with the coding
# styles of other contributors -- so instead I use the hardcoded literal type annotation for get and set items
ATTR_TYPE_BASE = Literal["in_memory_compression", "warnings", "output", "outdir", "dir",
                         "os_handle", "image_base_size", "image_work_size", "mask_statistics", "base_mag",
                         "img_mask_use", "img_mask_force", "completed", 'filename'
]

ATTR_TYPE_EXTRA = Literal['filename', 'name']
ATTR_TYPE_PLUGIN = Literal['base_mag', 'pil_handle']
ATTR_TYPE = Literal[ATTR_TYPE_BASE, ATTR_TYPE_EXTRA, ATTR_TYPE_PLUGIN]


class BaseImage(dict, ABC):
    mask_statistics_types: List[str] = ["relative2mask", "absolute", "relative2image"]

    def addToPrintList(self, name, val):
        self[name] = val
        self["output"].append(name)

    @property
    def base_mag(self):
        return self["base_mag"]

    @abstractmethod
    def getImgThumb(self, dim):
        raise NotImplementedError

    @property
    @abstractmethod
    def resource_handle(self):
        raise NotImplementedError

    @abstractmethod
    def init_resource(self, *args, **kwargs):
        raise NotImplementedError

    @classmethod
    @abstractmethod
    def build(cls, fname: str, fname_outdir: str, params: Dict[ATTR_TYPE, Any]):
        raise NotImplementedError

    def __getitem__(self, key: ATTR_TYPE):
        value = super().__getitem__(key)
        if hasattr(self, "in_memory_compression") and self.in_memory_compression and key.startswith("img"):
            value = dill.loads(zlib.decompress(value))
        return value

    def __setitem__(self, key: ATTR_TYPE, value):
        if hasattr(self, "in_memory_compression") and self.in_memory_compression and key.startswith("img"):
            value = zlib.compress(dill.dumps(value), level=5)

        return super().__setitem__(key, value)

    def _default_config_common(self, fname: str, fname_outdir: str, params: Dict[str, Any]):
        self.in_memory_compression = strtobool(params.get("in_memory_compression", "False"))

        self["warnings"] = ['']  # this needs to be first key in case anything else wants to add to it
        self["output"] = []

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

    def __init__(self, fname: str, fname_outdir: str, params: Dict[str, Any]):
        super().__init__()
        self._default_config_common(fname, fname_outdir, params)

