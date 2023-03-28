import logging
import os
import numpy as np
import zlib, dill
from distutils.util import strtobool
from PIL import Image
from typing import Union, Tuple
#os.environ['PATH'] = 'C:\\research\\openslide\\bin' + ';' + os.environ['PATH'] #can either specify openslide bin path in PATH, or add it dynamically
import openslide

class BaseImage(dict):

    def __init__(self, fname, fname_outdir, params):
        dict.__init__(self)

        self.in_memory_compression = strtobool(params.get("in_memory_compression", "False"))

        self["warnings"] = ['']  # this needs to be first key in case anything else wants to add to it
        self["output"] = []

        # these 2 need to be first for UI to work
        self.addToPrintList("filename", os.path.basename(fname))
        self.addToPrintList("comments", " ")

        self["outdir"] = fname_outdir
        self["dir"] = os.path.dirname(fname)

        self["os_handle"] = openslide.OpenSlide(fname)
        self["image_base_size"] = self["os_handle"].dimensions
        self["enable_bounding_box"] = strtobool(params.get("enable_bounding_box","False"))
        # check if the bbox if doesn't have bbox set enable_bounding_box to False
        self.setBBox()
        self.addToPrintList("image_bounding_box", self["img_bbox"])
        self["image_work_size"] = params.get("image_work_size", "1.25x")
        self["mask_statistics"] = params.get("mask_statistics", "relative2mask")
        
        self["base_mag"] = getMag(self, params)

        if not self["base_mag"]:
            logging.error(f"{self['filename']}: Has unknown or uncalculated base magnification, cannot specify magnification scale! Did you try getMag?")
            return -1

        self.addToPrintList("base_mag", self["base_mag"])

        mask_statistics_types = ["relative2mask", "absolute", "relative2image"]
        if (self["mask_statistics"] not in mask_statistics_types):
            logging.error(
                f"mask_statistic type '{self['mask_statistics']}' is not one of the 3 supported options relative2mask, absolute, relative2image!")
            exit()

        self["img_mask_use"] = np.ones(self.getImgThumb(self["image_work_size"]).shape[0:2], dtype=bool)
        self["img_mask_force"] = []

        self["completed"] = []

    def __getitem__(self, key):
        value = super(BaseImage, self).__getitem__(key)
        if hasattr(self,"in_memory_compression") and  self.in_memory_compression and key.startswith("img"):
            value = dill.loads(zlib.decompress(value))
        return value

    def __setitem__(self, key, value):
        if hasattr(self,"in_memory_compression") and self.in_memory_compression and key.startswith("img"):
            value = zlib.compress(dill.dumps(value), level=5)

        return super(BaseImage, self).__setitem__(key,value)

    # setbounding box start coordinate and size
    def setBBox(self):
        # add self["img_bbox"] = (x, y, width, heigh)
        osh = self["os_handle"]
        # set default bbox
        (dim_width, dim_height) = osh.dimensions
        self["img_bbox"] = (0, 0, dim_width, dim_height)
        # try to get bbox if bounding_box is ture
        if self["enable_bounding_box"]:
            # try get bbox from os handle properties
            try:
                x = int(osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_X, 'NA'))
                y = int(osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_Y, 'NA'))
                width = int(osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_WIDTH, 'NA'))
                height = int(osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_HEIGHT, 'NA'))
                self["img_bbox"] = (x, y, width, height)
            except:
                # no bbox info in slide set enable_bounding_box as Flase
                self["enable_bounding_box"] = False
                logging.warning(f"{self['filename']}: Bounding Box requested but could not read")
                self["warnings"].append("Bounding Box requested but could not read")

    def addToPrintList(self, name, val):
        self[name] = val
        self["output"].append(name)

    # find the next higher level by giving a downsample factor 
    # return (level, isFindCloseLevel)
    def getBestLevelForDownsample(self, downsample_factor: float) -> Tuple[int, bool]: 
        osh = self["os_handle"]
        relative_down_factors_idx=[np.isclose(i/downsample_factor,1,atol=.01) for i in osh.level_downsamples]
        level=np.where(relative_down_factors_idx)[0]
        if level.size:
            return (level[0], True)
        else:
            return (osh.get_best_level_for_downsample(downsample_factor), False)

    def getImgThumb(self, size: str):
        # get img key with size
        key = "img_" + str(size)
        # return the img if it exists
        if key in self:
            return self[key]
        
        # get open slide handle
        osh = self["os_handle"]

        # get the size of view on current img - the current size of view by using the bounding box.
        # bounding box could be the size of whole img or read the size from the slide mate data.
        (bx, by, bwidth, bheight) = self["img_bbox"]
        img_base_size = (bwidth, bheight)

        # specifies a desired operating magnification
        if size.endswith(("X","x")) and size[:-1].replace(".", "0", 1).isdigit():
            target_mag = float(size.upper().split("X")[0])
            # magnification
            base_mag = self["base_mag"]
            target_sampling_factor = base_mag / target_mag
            target_dims = tuple(np.rint(np.asarray(img_base_size) / target_sampling_factor).astype(int))
            
            # generate the thumb img
            self[key] = getBestThumb(self, bx, by, target_dims, target_sampling_factor)
        
        # the size of the img is number 
        elif size.replace(".", "0", 1).isdigit():
            size = float(size)
            # specifies a desired downscaling factor 
            if size < 1:
                target_downscaling_factor = size
                target_sampling_factor = 1 / target_downscaling_factor
                target_dims = tuple(np.rint(np.asarray(img_base_size) * target_downscaling_factor).astype(int))
                
                # generate the thumb img
                self[key] = getBestThumb(self, bx, by, target_dims, target_sampling_factor)

            # specifies a desired level of open slide
            elif size < 100:
                target_level = int(size)
                if target_level >= osh.level_count:
                    target_level = osh.level_count - 1
                    msg = f"Desired Image Level {size+1} does not exist! Instead using level {osh.level_count-1}! Downstream output may not be correct"
                    logging.error(f"{self['filename']}: {msg}" )
                    self["warnings"].append(msg)
                size = (tuple((np.array(img_base_size)/osh.level_downsamples[target_level]).astype(int))
                        if self["enable_bounding_box"]
                        else osh.level_dimensions[target_level])
                logging.info(
                    f"{self['filename']} - \t\tloading image from level {target_level} of size {osh.level_dimensions[target_level]}")
                tile = osh.read_region((bx, by), target_level, size)                
                self[key] = (np.asarray(rgba2rgb(self, tile))
                            if np.shape(tile)[-1]==4 
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
                self[key] = getBestThumb(self, bx, by, target_dims, target_sampling_factor)

        # can't determine operation.
        else:
            # print out error message
            err_msg = f"{self['filename']}: invalid arguments - {size}"
            logging.error(err_msg)
            self["warnings"].append(err_msg)
            return
        
        return self[key]

def getBestThumb(s: BaseImage, x: int, y: int, dims: Tuple[int, int], target_sampling_factor: float):
    osh = s["os_handle"]
    
    # get thumb from og
    if not s["enable_bounding_box"]:
        max_dim = dims[0] if dims[0] > dims[1] else dims[1]
        return np.array(osh.get_thumbnail((max_dim, max_dim)))
    
    (level, isExactLevel) = s.getBestLevelForDownsample(target_sampling_factor)
    
    # check if get the existing level
    if isExactLevel:
        tile = osh.read_region((x, y), level, dims)
        return np.asarray(rgba2rgb(s, tile)) if np.shape(tile)[-1]==4 else np.asarray(tile)
    # scale down the thumb img from the next high level
    else:
        return resizeTileDownward(s, target_sampling_factor, level)
        
'''
the followings are helper functions 
'''

def resizeTileDownward(self, target_downsampling_factor, level):
    osh = self["os_handle"]
    (bx, by, bwidth, bheight) = self["img_bbox"]
    end_x = bx + bwidth
    end_y = by + bheight
    
    closest_downsampling_factor = osh.level_downsamples[level]
    win_size = 2048
    
    output = []
    for x in range(bx, end_x, win_size):
        row_piece = []
        for y in range(by, end_y, win_size):
            win_width = win_size
            win_height = win_size
            if end_x < x + win_width:
                win_width = end_x - x
            if end_y < y + win_height:
                win_height = end_y - y
            
            region = osh.read_region((x, y), level, (win_width, win_height))
            if np.shape(region)[-1] == 4:
                region = rgba2rgb(self, region)
            
            resized_region = resize_numpy(region, target_downsampling_factor / closest_downsampling_factor)
            row_piece.append(resized_region)
        
        row_piece = np.concatenate(row_piece, axis=1)
        output.append(row_piece)
    
    output = np.concatenate(output, axis=0)
    return output

def resize_numpy(img, factor):
    w, h = img.shape[:2]
    w_new, h_new = int(round(w/factor)), int(round(h/factor))
    resized = np.empty((w_new, h_new, 3), dtype=np.uint8)
    for i in range(3):
        channel = img[..., i]
        resized[..., i] = np.round(resize(channel, (w_new, h_new), order=3, mode='reflect') * 255).astype(np.uint8)
    return resized

def rgba2rgb(self, img):
    return np.array(Image.fromarray(img).convert('RGB'))

def rgba2rgb(s: BaseImage, img):
    bg_color = "#" + s["os_handle"].properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, "ffffff")
    thumb = Image.new("RGB", img.size, bg_color)
    thumb.paste(img, None, img)
    return thumb

def printMaskHelper(type: str, prev_mask, curr_mask):
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
def getMag(s: BaseImage, params) -> Union[float, None]:
    logging.info(f"{s['filename']} - \tgetMag")
    osh = s["os_handle"]
    mag = osh.properties.get("openslide.objective-power") or \
            osh.properties.get("aperio.AppMag") or None
    # if mag or strtobool(params.get("confirm_base_mag", "False")):
    #     # do analysis work here
    #     logging.warning(f"{s['filename']} - Unknown base magnification for file")
    #     s["warnings"].append(f"{s['filename']} - Unknown base magnification for file")
    #     return None
    # else:
    return float(mag)

def getDimensionsByOneDim(s: BaseImage, dim: int) -> Tuple[int, int]:
    (x, y, width, height) = s["img_bbox"]
    # calulate the width or height depends on dim
    if width > height:
        h = int(dim * height / width)
        return (dim, h)
    else:
        w = int(dim * width / height)
        return (w, dim)
