import logging
import os
import numpy as np
import zlib, dill
from distutils.util import strtobool
from PIL import Image

#os.environ['PATH'] = 'C:\\research\\openslide\\bin' + ';' + os.environ['PATH'] #can either specify openslide bin path in PATH, or add it dynamically
import openslide
def getBestThumb(s, x, y, size):
    osh = s["os_handle"]

    # get thumb from og
    if not s["enable_bounding_box"]:
        return osh.get_thumbnail(size)
    
    # generate the thumbnail with bounding box at the highest/best level
    downsample_factor = max(*(dim / thumb for dim, thumb in zip(osh.dimensions, size)))
    level = s.getBestLevelForDownsample(downsample_factor)
    size = tuple((np.array([s["img_bbox"][2],s["img_bbox"][3]])/osh.level_downsamples[level]).astype(int))
    tile = osh.read_region((x, y), level, size)
    return rgba2rgb(s, tile)
        

def rgba2rgb(s, img):
    bg_color = "#" + s["os_handle"].properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, "ffffff")
    thumb = Image.new("RGB", img.size, bg_color)
    thumb.paste(img, None, img)
    return thumb

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
    if (
            mag == "NA"):  # openslide doesn't set objective-power for all SVS files: https://github.com/openslide/openslide/issues/247
        mag = osh.properties.get("aperio.AppMag", "NA")
    if (mag == "NA" or strtobool(
            params.get("confirm_base_mag", "False"))):
        # do analysis work here
        logging.warning(f"{s['filename']} - Unknown base magnification for file")
        s["warnings"].append(f"{s['filename']} - Unknown base magnification for file")
    else:
        mag = float(mag)

    return mag


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

    def getBestLevelForDownsample(self, downsample_factor):
        osh = self["os_handle"]
        relative_down_factors_idx=[np.isclose(i/downsample_factor,1,atol=.01) for i in osh.level_downsamples]
        level=np.where(relative_down_factors_idx)[0]
        if level.size:
            return level[0]
        else:
            return osh.get_best_level_for_downsample(downsample_factor)        

    def getImgThumb(self, dim):
        key = "img_" + str(dim)
        if key not in self:
            osh = self["os_handle"]
            (bx, by, bwidth, bheight) = self["img_bbox"]
            img_base_size = (bwidth, bheight)
            if dim.replace(".", "0", 1).isdigit(): #check to see if dim is a number
                downscale_factor = float(dim)
                if downscale_factor < 1 and not dim.is_integer():  # specifying a downscale factor from base
                    new_dim = np.asarray(img_base_size) * downscale_factor
                    self[key] = np.array(getBestThumb(self, bx, by, new_dim))
                elif downscale_factor < 100:  # assume it is a level in the openslide pyramid instead of a direct request
                    level = int(dim)
                    if level >= osh.level_count:
                        level = osh.level_count - 1
                        logging.error(
                            f"{self['filename']}: Desired Image Level {dim+1} does not exist! Instead using level {osh.level_count-1}! Downstream output may not be correct")
                        self["warnings"].append(
                            f"Desired Image Level {dim+1} does not exist! Instead using level {osh.level_count-1}! Downstream output may not be correct")
                    size = (tuple((np.array(img_base_size)/osh.level_downsamples[level]).astype(int))
                            if self["enable_bounding_box"]
                            else osh.level_downsamples[level])
                    logging.info(
                        f"{self['filename']} - \t\tloading image from level {dim} of size {osh.level_dimensions[level]}")
                    tile = osh.read_region((bx, by), level, size)                
                    self[key] = (np.asarray(rgba2rgb(self, tile))
                                if np.shape(tile)[-1]==4 
                                else np.asarray(tile))
                else:  # assume its an explicit size, *WARNING* this will likely cause different images to have different
                    # perceived magnifications!
                    logging.info(f"{self['filename']} - \t\tcreating image thumb of size {str(dim)}")

                    self[key] = np.array(getBestThumb(self, bx, by, (float(dim), float(dim))))
            elif "X" in dim.upper():  # specifies a desired operating magnification
                base_mag = self["base_mag"]
                if base_mag != "NA":  # if base magnification is not known, it is set to NA by basic module
                    base_mag = float(base_mag)
                else:  # without knowing base mag, can't use this scaling, push error and exit
                    logging.error(
                        f"{self['filename']}: Has unknown or uncalculated base magnification, cannot specify magnification scale: {base_mag}! Did you try getMag?")
                    return -1

                target_mag = float(dim.upper().split("X")[0])
                downsample_factor = base_mag / target_mag
                level = self.getBestLevelForDownsample(downsample_factor)
                relative_down = downsample_factor/osh.level_downsamples[level]
                size=(tuple((np.array(img_base_size)/osh.level_downsamples[level]).astype(int))
                        if self["enable_bounding_box"]
                        else osh.level_dimensions[level])
                if np.isclose(relative_down, 1, atol=.01): #there exists an open slide level exactly for this requested mag
                    output = osh.read_region((bx, by), level, size)
                    output = (np.asarray(rgba2rgb(self, output))
                                if np.shape(output)[-1]==4
                                else np.asarray(output))
                else: #there does not exist an openslide level for this mag, need to create ony dynamically
                    win_size = 2048
                    win_size_down = int(win_size * 1 / relative_down)
                    
                    output = []
                    for x in range(bx, bwidth, round(win_size * osh.level_downsamples[level])):
                        row_piece = []
                        for y in range(by, bheight, round(win_size * osh.level_downsamples[level])):
                            aa = osh.read_region((x, y), level, (win_size, win_size))
                            if np.shape(aa)[-1]==4:
                                aa = rgba2rgb(self, aa)
                            bb = aa.resize((win_size_down, win_size_down))
                            row_piece.append(bb)
                        row_piece = np.concatenate(row_piece, axis=0)
                        output.append(row_piece)
                    output = np.concatenate(output, axis=1)
                    output = output[0:round(bwidth * 1 / downsample_factor), 0:round(bheight * 1 / downsample_factor), :]
                self[key] = output
            else:
                logging.error(
                    f"{self['filename']}: Unknown image level setting: {dim}!")
                return -1
        return self[key]
