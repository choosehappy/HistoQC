from .WSIImageHandle import WSIImageHandle
from histoqc._import_openslide import openslide
from typing import Union
class OpenSlideHandle(WSIImageHandle):
    def __init__(self, fname):
        self.fname = fname
        self.osh = openslide.OpenSlide(fname)
        self._has_bounding_box = True
        self._bounding_box = self.__get_bounding_box()
        
        # get magnification factor from wsi slide
        self._magnification_factor = self.osh.properties.get("openslide.objective-power") or \
            self.osh.properties.get("aperio.AppMag")
        
        # get background color 
        self._backfround_color = f"#{self.osh.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')}"

    
    def __get_bounding_box(self):
        (dim_width, dim_height) = self.osh.dimensions
    
        try:
            x = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_X, 'NA'))
            y = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_Y, 'NA'))
            width = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_WIDTH, 'NA'))
            height = int(self.osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_HEIGHT, 'NA'))
            return (x, y, width, height)
        except:
            self._has_bounding_box = False
            return (0, 0, dim_width, dim_height)

    @property
    def background_color(self):
        return self._background_color
    @property
    def has_bounding_box(self):
        return self._has_bounding_box
    
    @property
    def bounding_box(self):
        return self._bounding_box

    @property
    def dimensions(self):
        return self.osh.dimensions

    @property
    def magnification(self) -> Union[float, None]:
        return self._magnification_factor

    @property
    def level_count(self):
        return self.osh.level_count

    @property
    def level_dimensions(self):
        return self.osh.level_dimensions

    @property
    def level_downsamples(self):
        return self.osh.level_downsamples

    @property
    def vendor(self):
        return self.osh.properties.get("openslide.vendor", "NA")

    @property
    def mpp_x(self):
        return self.osh.properties.get("openslide.mpp-x", "NA")

    @property
    def mpp_y(self):
        return self.osh.properties.get("openslide.mpp-y", "NA")

    @property
    def comment(self):
        return self.osh.properties.get("openslide.comment", "NA")

    def get_thumbnail(self, new_dim):
        return self.osh.get_thumbnail(new_dim)

    def get_best_level_for_downsample(self, down_factor):
        return self.osh.get_best_level_for_downsample(down_factor)

    def read_region(self, location, level, size):
        return self.osh.read_region(location, level, size)

    def read_label(self):
        return self.osh.associated_images["label"]

    def read_macro(self):
        return self.osh.associated_images["macro"]
