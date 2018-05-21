import logging
import os
from skimage import io
from distutils.util import strtobool
from skimage import color
import numpy as np


def saveFinalMask(s, params):
    logging.info(f"{s['filename']} - \tsaveUsableRegion")
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_mask_use.png", s["img_mask_use"] * 255)

    if strtobool(params.get("use_mask", "True")): #should we create and save the fusion mask?
        img = s.getImgThumb(s["image_work_size"])
        img = color.rgb2gray(img)[:, :, None]
        mask = s["img_mask_use"][:, :, None] * 1.0
        out = np.concatenate((mask, img, mask), 2)
        io.imsave(s["outdir"] + os.sep + s["filename"] + "_fuse.png", out)

    return


def saveThumbnails(s, params):
    logging.info(f"{s['filename']} - \tsaveThumbnail")
    # we create 2 thumbnails for usage in the front end, one relatively small one, and one larger one
    img = s.getImgThumb(params.get("image_work_size",  "1.25x"))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb.png", img)

    img = s.getImgThumb(params.get("small_dim", 500))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb_small.png", img)
    return
