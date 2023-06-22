import os
from abc import ABC, abstractmethod
# from .DicomHandle import DicomHandle
# from .OpenSlideHandle import OpenSlideHandle

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