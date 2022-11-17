import logging
import os
import numpy as np
import inspect
import zlib, dill
from distutils.util import strtobool
from PIL import Image

#os.environ['PATH'] = 'C:\\research\\openslide\\bin' + ';' + os.environ['PATH'] #can either specify openslide bin path in PATH, or add it dynamically
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
        self["bounding_box"] = strtobool(params.get("bounding_box",'False'))
        if self["bounding_box"] == True:
            try:
                self["image_base_size"] = (int(self["os_handle"].properties.get(openslide.PROPERTY_NAME_BOUNDS_WIDTH,'NA')),
                                           int(self["os_handle"].properties.get(openslide.PROPERTY_NAME_BOUNDS_HEIGHT,'NA')))
            except:
                logging.error(f"{self['filename']}: could not read the size of the bounding box")
                exit()
        else:
            self["image_base_size"] = self["os_handle"].dimensions
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

    def addToPrintList(self, name, val):
        self[name] = val
        self["output"].append(name)

    def getImgThumb(self, dim):
        key = "img_" + str(dim)
        if key not in self:
            osh = self["os_handle"]
            xc=yc=0
            if self["bounding_box"] == True:
                try:
                    xc=int(osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_X,'NA'))
                    yc=int(osh.properties.get(openslide.PROPERTY_NAME_BOUNDS_Y,'NA'))
                except:
                    logging.error(f"{self['filename']}: could not find bounding box coordinates")
                    return -1
            if dim.replace(".", "0", 1).isdigit(): #check to see if dim is a number
                dim = float(dim)
                if dim < 1 and not dim.is_integer():  # specifying a downscale factor from base
                    new_dim = np.asarray(osh.dimensions) * dim
                    if self["bounding_box"] == True:
                        downsample = max(*(dim / thumb for dim, thumb in zip(osh.dimensions, new_dim)))
                        level = osh.get_best_level_for_downsample(downsample)
                        size=tuple((np.array(self["image_base_size"])/osh.level_downsamples[level]).astype(int))
                        tile = osh.read_region((xc, yc), level, size)
                        bg_color = '#' + osh.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')
                        thumb = Image.new('RGB', tile.size, bg_color)
                        thumb.paste(tile, None, tile)
                        thumb.thumbnail(size, getattr(Image, 'Resampling', Image).LANCZOS)
                        self[key] = np.array(thumb)
                    else:
                        self[key] = np.array(osh.get_thumbnail(new_dim))
                elif dim < 100:  # assume it is a level in the openslide pyramid instead of a direct request
                    dim = int(dim)
                    if dim >= osh.level_count:
                        dim = osh.level_count - 1
                        calling_class = inspect.stack()[1][3]
                        logging.error(
                            f"{self['filename']}: Desired Image Level {dim+1} does not exist! Instead using level {osh.level_count-1}! Downstream output may not be correct")
                        self["warnings"].append(
                            f"Desired Image Level {dim+1} does not exist! Instead using level {osh.level_count-1}! Downstream output may not be correct")
                    if self["bounding_box"] == True:
                        size=tuple((np.array(self["image_base_size"])/osh.level_downsamples[dim]).astype(int))
                    else:
                        size=osh.level_downsamples[dim]
                    logging.info(
                        f"{self['filename']} - \t\tloading image from level {dim} of size {osh.level_dimensions[dim]}")
                    tile = osh.read_region((xc, yc), dim, size)
                    if np.shape(tile)[-1]==4:
                        bg_color = '#' + osh.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')
                        img = Image.new('RGB', size, bg_color)
                        img.paste(tile, None, tile)
                    else:
                        img=tile
                    img = np.asarray(img)
                    self[key] = img
                else:  # assume its an explicit size, *WARNING* this will likely cause different images to have different
                    # perceived magnifications!
                    logging.info(f"{self['filename']} - \t\tcreating image thumb of size {str(dim)}")
                    if self["bounding_box"] == True:
                        downsample = max(*(dim / thumb for dim, thumb in zip(osh.dimensions, (dim, dim))))
                        level = osh.get_best_level_for_downsample(downsample)
                        size=tuple((np.array(self["image_base_size"])/osh.level_downsamples[level]).astype(int))
                        tile = osh.read_region((xc, yc), level, size)
                        bg_color = '#' + osh.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')
                        thumb = Image.new('RGB', tile.size, bg_color)
                        thumb.paste(tile, None, tile)
                        thumb.thumbnail(size, getattr(Image, 'Resampling', Image).LANCZOS)
                        self[key] = np.array(thumb)
                    else:
                        self[key] = np.array(osh.get_thumbnail((dim, dim)))
            elif "X" in dim.upper():  # specifies a desired operating magnification

                base_mag = self["base_mag"]
                if base_mag != "NA":  # if base magnification is not known, it is set to NA by basic module
                    base_mag = float(base_mag)
                else:  # without knowing base mag, can't use this scaling, push error and exit
                    logging.error(
                        f"{self['filename']}: Has unknown or uncalculated base magnification, cannot specify magnification scale: {base_mag}! Did you try getMag?")
                    return -1

                target_mag = float(dim.upper().split("X")[0])

                down_factor = base_mag / target_mag
                relative_down_factors_idx=[np.isclose(i/down_factor,1,atol=.01) for i in osh.level_downsamples]
                level=np.where(relative_down_factors_idx)[0]
                if level.size:
                    level=level[0]
                else:
                    level = osh.get_best_level_for_downsample(down_factor)
                
                relative_down = down_factor / osh.level_downsamples[level]
                if self["bounding_box"] == True:
                    size=tuple((np.array(self["image_base_size"])/osh.level_downsamples[level]).astype(int))
                else:
                    size=osh.level_dimensions[level]
                if relative_down == 1.0: #there exists an open slide level exactly for this requested mag
                    output = osh.read_region((xc, yc), level, size)
                    if np.shape(output)[-1]==4:
                        bg_color = '#' + osh.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')
                        img = Image.new('RGB', size, bg_color)
                        img.paste(output, None, output)
                        output=img
                    output = np.asarray(output)
                else: #there does not exist an openslide level for this mag, need to create ony dynamically
                    win_size = 2048
                    win_size_down = int(win_size * 1 / relative_down)
                    dim_base = self["image_base_size"]
                    output = []
                    for x in range(xc, dim_base[0], round(win_size * osh.level_downsamples[level])):
                        row_piece = []
                        for y in range(yc, dim_base[1], round(win_size * osh.level_downsamples[level])):
                            aa = osh.read_region((x, y), level, (win_size, win_size))
                            if np.shape(aa)[-1]==4:
                                bg_color = '#' + osh.properties.get(openslide.PROPERTY_NAME_BACKGROUND_COLOR, 'ffffff')
                                img = Image.new('RGB', tuple((win_size, win_size)), bg_color)
                                img.paste(aa, None, aa)
                                aa=img
                            bb = aa.resize((win_size_down, win_size_down))
                            row_piece.append(bb)
                        row_piece = np.concatenate(row_piece, axis=0)
                        output.append(row_piece)

                    output = np.concatenate(output, axis=1)
                    output = output[0:round(dim_base[1] * 1 / down_factor), 0:round(dim_base[0] * 1 / down_factor), :]
                self[key] = output
            else:
                logging.error(
                    f"{self['filename']}: Unknown image level setting: {dim}!")
                return -1
        return self[key]
