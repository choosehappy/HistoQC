from abc import ABC, abstractmethod
from importlib import import_module
import logging

WSI_HANDLES = {
    "openslide" : "histoqc.wsihandles.OpenSlideHandle",
    "wsidicom" : "histoqc.wsihandles.DicomHandle"
}

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
    def create_wsi_handle(fname, handles):
        osh = None
        # get handles list
        handle_list = handles.split(",")
        for handle_type in handle_list:
            handle_name = WSI_HANDLES.get(handle_type.strip())
            class_name = handle_name.split(".")[-1]
            # dynamically import module by using module name
            try:
                module = import_module(handle_name)
            except ImportError:
                msg = f"WSIImageHanlde: can't import wsi handle module - \"{handle_name}\" "
                logging.warning(msg)
                continue
            
            # dynamically create the instance of wsi handle class
            try:
                cls = getattr(module, class_name)
            except AttributeError:
                msg = f"WSIImageHanlde: can't get wsi handle class - \"{class_name}\" "
                logging.warning(msg)
                continue
            
            # try to read the files by using seleted handle
            try:
                osh = cls(fname)
            except:
                # current wsi handle class doesn't support this file
                msg = f"WSIImageHanlde: \"{class_name}\" doesn't support {fname}"
                logging.warning(msg)
                continue
        if osh == None:
            #error: no handles support this file 
            msg = f"WSIImageHanlde: can't find the support wsi handles - {fname}"
            logging.error(msg)
            raise NotImplementedError(msg)
        return osh
