import logging
import os
import numpy as np
import inspect

os.environ['PATH'] = '.\\openslide\\bin' + ';' + os.environ['PATH']
import openslide


class BaseImage():

    def __init__(self, fname, fname_outdir, params):
        self.s = {}  # will hold everything for the image

        self.s["warnings"] = []  # this needs to be first key in case anything else wants to add to it
        self.s["filename"] = os.path.basename(fname)
        self.s["outdir"] = fname_outdir

        self.s["os_handle"] = openslide.OpenSlide(fname)
        self.s["image_work_size"] = float(params.get("image_work_size", 3))
        self.s["img_mask_use"] = np.ones(self.getImgThumb(self.s["image_work_size"]).shape[0:2], dtype=bool)

        self.s["comments"] = " "

        self.s["output"] = []
        self.s["output"].append("filename")
        self.s["output"].append("outdir")
        self.s["output"].append("comments")

        self.s["completed"] = []

    def __contains__(self, key):
        return key in self.s.keys()

    def __getitem__(self, key):
        return self.s[key]

    def __setitem__(self, key, value):
        self.s[key] = value

    def __delitem__(self, key):
        self.s.pop(key, None)

    def addToPrintList(self, name, val):
        self.s[name] = val
        self.s["output"].append(name)

    def getImgThumb(self, dim):
        key = "img_" + str(dim)
        if self.s.get(key) is None:
            osh = self.s["os_handle"]
            if dim < 1 and not dim.is_integer():  # specifying a downscale factor from base
                new_dim = np.asarray(osh.dimensions) * dim
                self.s[key] = np.array(osh.get_thumbnail(new_dim))
            elif dim < 100:  # assume it is a level in the openslide pyramid instead of a direct request
                dim = int(dim)
                if dim >= osh.level_count:
                    dim = osh.level_count - 1
                    calling_class=inspect.stack()[1][3]
                    logging.error(f"{self.s['filename']}: Desired Image Level {dim+1} does not exist! Instead using level {osh.level_count-1}! Downstream output may not be correct")
                    self.s["warnings"].append(
                        f"Desired Image Level {dim+1} does not exist! Instead using level {osh.level_count-1}! Downstream output may not be correct")
                logging.info(f"{self.s['filename']} - \t\tloading image from level {dim} of size {osh.level_dimensions[dim]}")
                img = osh.read_region((0, 0), dim, osh.level_dimensions[dim])
                self.s[key] = np.asarray(img)[:, :, 0:3]
            else:  # assume its an explicit size, *WARNING* this will likely cause different images to have different
                # perceived magnifications!
                logging.info(f"{self.s['filename']} - \t\tcreating image thumb of size ", str(dim))
                self.s[key] = np.array(osh.get_thumbnail((dim, dim)))
        return self.s[key]
