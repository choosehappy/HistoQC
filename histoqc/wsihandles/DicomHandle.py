from .WSIImageHandle import WSIImageHandle
from wsidicom import WsiDicom
import numpy as np
from typing import Union

class DicomHandle(WSIImageHandle):
    def __init__(self, fname):
        self.fname = fname
        self.osh = WsiDicom.open(fname)

        
        # get mmp
        self._mpp_x = self.osh.mpp.width
        self._mpp_y = self.osh.mpp.height
        
        # get magnification factor
        mpp = self._mpp_x or self._mpp_y or None
        if mpp:
            self._magnification_factor = round(1 / mpp * 10, -1)
        else:
            self._magnification_factor = None
        
        # The number of levels in the slide. Levels are numbered from 0
        self._level_count = len(self.osh.levels)

        # A list of (width, height) tuples, one for each level of the slide. level_dimensions[k] are the dimensions of level k.
        self._level_dimensions = [(l.size.width, l.size.height) for l in self.osh.levels]

        # A list of downsample factors for each level of the slide. level_downsamples[k] is the downsample factor of level k.
        self._level_downsamples = [self._level_dimensions[0][0] / dim[0] for dim in self._level_dimensions]

        # TODO set bounding box as whole image view
        self._has_bounding_box = False
        self._bounding_box = (0, 0, self.osh.size.width, self.osh.size.height)


    @property
    def has_bounding_box(self):
        return self._has_bounding_box

    # using #ffffff as default background color
    @property
    def background_color(self):
        return "#ffffff"
        
    @property
    def bounding_box(self):
        return self._bounding_box

    @property
    def dimensions(self):
        return (self.osh.size.width, self.osh.size.height) 

    @property
    def magnification(self) -> Union[float, None]:
        return self._magnification_factor

    @property
    def level_count(self):
        return self._level_count

    @property
    def level_dimensions(self):
        return self._level_dimensions

    @property
    def level_downsamples(self):
        return self._level_downsamples

    # TODO
    @property
    def vendor(self):
        return "Dicom Image - vendor #TODO"

    @property
    def mpp_x(self):
        return self._mpp_x

    @property
    def mpp_y(self):
        return self._mpp_y
    
    # TODO
    @property
    def comment(self):
        return "Dciom Image - comment #TODO"
    
    @property
    def bounding_box(self):
        return super().bounding_box    

    def get_thumbnail(self, new_dim):
        return self.osh.read_thumbnail(new_dim)

    def get_best_level_for_downsample(self, down_factor):
        return np.argmin(np.abs(np.asarray(self._level_downsamples) - down_factor))
        
    
    def read_region(self, location, level, size):
        return self.osh.read_region(location, level, size)
    
    def read_label(self):
        return self.osh.read_label()

    def read_macro(self):
        return self.osh.read_overview()