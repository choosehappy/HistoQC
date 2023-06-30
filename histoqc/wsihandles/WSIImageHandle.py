from abc import ABC, abstractmethod
from typing import Union
from enum import Enum
from pathlib import Path
import os, logging


class WSIHandles(Enum):
    OPENSLIDE = 'openslide'
    WSIDICOM = 'dicom'

class WSIFileExtension(Enum):
    OPENSLIDE = ['.bif', '.mrxs', '.ndpi', '.scn', '.svs', '.svslide', '.tif', '.tiff', '.vms', '.vmu']
    WSIDICOM = ['.dcm']

class WSIImageHandle(ABC):

    @property
    @abstractmethod
    def background_color(self):
        ...
        
    @property
    @abstractmethod
    def bounding_box(self):
        ...

    @property
    @abstractmethod
    def has_bounding_box(self):
        ...
    
    @property
    @abstractmethod
    def dimensions(self):
        ...

    @property
    @abstractmethod
    def magnification(self):
        ...

    @property
    @abstractmethod
    def level_count(self):
        ...

    @property
    @abstractmethod
    def level_dimensions(self):
        ...

    @property
    @abstractmethod
    def level_downsamples(self):
        ...

    @property
    @abstractmethod
    def vendor(self):
        ...

    @property
    @abstractmethod
    def level_count(self):
        ...

    @property
    @abstractmethod
    def mpp_x(self):
        ...

    @property
    @abstractmethod
    def mpp_y(self):
        ...

    @property
    @abstractmethod
    def comment(self):
        ...

    @property
    @abstractmethod
    def bounding_box(self):
        ...

    @abstractmethod
    def get_thumbnail(self, new_dim):
        ...

    @abstractmethod
    def get_best_level_for_downsample(self, down_factor):
        ...

    @abstractmethod
    def read_region(self, location, level, size):
        ...

    @abstractmethod
    def read_label(self):
        ...

    @abstractmethod
    def read_macro(self):
        ...

    
    @staticmethod
    def create_wsi_handle(fname):
        # determine the file type
        if is_dicom(fname):
            # 
            # if WSIHandles.WSIDICOM.value not in handles:
            #     raise ValueError(f"Please add \"{WSIHandles.WSIDICOM.value}\" into \"handles\" list  ")
            # import and create
            from .DicomHandle import DicomHandle
            return DicomHandle(fname)    
        elif is_openslide(fname):
            # if WSIHandles.OPENSLIDE.value not in handles:
            #     raise ValueError(f"Please add \"{WSIHandles.OPENSLIDE.value}\" into \"handles\" ")
            # import and create 
            from .OpenSlideHandle import OpenSlideHandle
            return OpenSlideHandle(fname)
        else:
            # file type don't support
            msg = f"WSIImageHanlde: Not Support - {fname}"
            logging.error(msg)
            raise NotImplementedError(msg)
    
def is_dicom(path: Union[str, Path]) -> bool:
    # Return rrue if the file at `path` is a DICOM dir.

    # is dicom file
    def __is_dicom(f):
        with open(f, 'rb') as fp:
            fp.read(128)  # preamble
            return fp.read(4) == b"DICM"
        
    # is dicom dir
    if os.path.isdir(path):
        files = os.listdir(path)
        # has dicom file
        for file in files:
            return __is_dicom(os.path.join(path, file))
        return False
    # is dicom file
    elif os.path.isfile(path) and __is_dicom(path):
        return True
    else:
        return False

def is_openslide(path: Union[str, Path]) -> bool:
    return os.path.isfile(path) and \
        Path(path).suffix.lower() in WSIFileExtension.OPENSLIDE.value