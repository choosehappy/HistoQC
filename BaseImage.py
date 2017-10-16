import os
import numpy as np

os.environ['PATH'] = '.\\openslide\\bin' + ';' + os.environ['PATH']
import openslide


class BaseImage():
    global_holder = {}
    s = {}

    def __init__(self, fname , fname_outdir):
        self.s = {}  # will hold everything for the image
        self.s["filename"] = fname
        self.s["outdir"] = fname_outdir
        self.s["os_handle"] = openslide.OpenSlide(fname)
        self.s["image_work_size"] = 1000
        self.s["img_mask_use"] = np.ones(self.getImgThumb(self.s["image_work_size"]).shape[0:2], dtype=bool)

        self.s["output"] = []
        self.s["output"].append("filename")
        self.s["output"].append("outdir")

        self.s["completed"] = []
        self.s["warnings"] = []

    def __getitem__(self, item):
        return self.s[item]
    def __setitem__(self, key, value):
        self.s[key]= value
    def __delitem__(self, key):
        self.s.pop(key,None)

    def addToPrintList(self, name, val):
        self.s[name] = val
        self.s["output"].append(name)

    def getImgThumb(self,dim):
        key="img_"+str(dim)
        if self.s.get(key) is None:
            print "creating image thumb of size " + str(dim)
            osh = self.s["os_handle"]
            self.s[key] = np.array(osh.get_thumbnail((dim, dim)))
        return self.s[key]