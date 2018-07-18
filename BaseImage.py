import logging
import os
import numpy as np
import inspect

# os.environ['PATH'] = '.\\openslide\\bin' + ';' + os.environ['PATH'] #can either specify openslide bin path in PATH, or add it dynamically
import openslide


def printMaskHelper(type, prev_mask, curr_mask):
    if type == "relative2mask":
        return str(1-len(curr_mask.nonzero()[0])/len(prev_mask.nonzero()[0]))
    elif type == "relative2image":
        return str(len(curr_mask.nonzero()[0]) / np.prod(curr_mask.shape))
    elif type == "absolute":
        return str(len(curr_mask.nonzero()[0]))
    else:
        return str(-1)


class BaseImage(dict):

    def __init__(self, fname, fname_outdir, params):
        dict.__init__(self)

        self["warnings"] = []  # this needs to be first key in case anything else wants to add to it
        self["filename"] = os.path.basename(fname)
        self["outdir"] = fname_outdir

        self["os_handle"] = openslide.OpenSlide(fname)
        self["image_work_size"] = params.get("image_work_size", "1.25x")
        self["mask_statistics"] = params.get("mask_statistics", "relative2mask")

        mask_statistics_types=["relative2mask", "absolute", "relative2image"]
        if(self["mask_statistics"] not in mask_statistics_types):
            logging.error(
                f"mask_statistic type '{self['mask_statistics']}' is not one of the 3 supported options relative2mask, absolute, relative2image!")
            exit()

        self["img_mask_use"] = np.ones(self.getImgThumb(self["image_work_size"]).shape[0:2], dtype=bool)

        self["comments"] = " "

        self["output"] = ["filename", "comments"]  # these 2 need to be first for UI to work

        self["completed"] = []

    def addToPrintList(self, name, val):
        self[name] = val
        self["output"].append(name)

    def getImgThumb(self, dim):
        key = "img_" + str(dim)
        if key not in self:
            osh = self["os_handle"]
            if dim.isdigit():
                dim = float(dim)
                if dim < 1 and not dim.is_integer():  # specifying a downscale factor from base
                    new_dim = np.asarray(osh.dimensions) * dim
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
                    logging.info(
                        f"{self['filename']} - \t\tloading image from level {dim} of size {osh.level_dimensions[dim]}")
                    img = osh.read_region((0, 0), dim, osh.level_dimensions[dim])
                    self[key] = np.asarray(img)[:, :, 0:3]
                else:  # assume its an explicit size, *WARNING* this will likely cause different images to have different
                    # perceived magnifications!
                    logging.info(f"{self['filename']} - \t\tcreating image thumb of size {str(dim)}")
                    self[key] = np.array(osh.get_thumbnail((dim, dim)))
            elif "X" in dim.upper():  # specifies a desired operating magnification
                os = self["os_handle"]
                base_mag = 40  # float(os.properties["openslide.objective-power"])
                target_mag = float(dim.upper().split("X")[0])

                down_factor = base_mag / target_mag
                level = os.get_best_level_for_downsample(down_factor)
                relative_down = down_factor / os.level_downsamples[level]
                win_size = 2048
                win_size_down = int(win_size * 1 / relative_down)
                dim_base = os.level_dimensions[0]
                output = []
                for x in range(0, dim_base[0], round(win_size * os.level_downsamples[level])):
                    row_piece = []
                    for y in range(0, dim_base[1], round(win_size * os.level_downsamples[level])):
                        aa = os.read_region((x, y), level, (win_size, win_size))
                        bb = aa.resize((win_size_down, win_size_down))
                        row_piece.append(bb)
                    row_piece = np.concatenate(row_piece, axis=0)[:, :, 0:3]
                    output.append(row_piece)

                output = np.concatenate(output, axis=1)
                output = output[0:round(dim_base[1] * 1 / down_factor), 0:round(dim_base[0] * 1 / down_factor), :]
                self[key] = output
            else:
                logging.error(
                    f"{self['filename']}: Unknown image level setting: {dim}!")
                return -1
        return self[key]
