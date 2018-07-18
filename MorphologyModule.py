import logging
import os
import numpy as np
from BaseImage import printMaskHelper
from skimage import io, morphology


def removeSmallObjects(s,params):
    logging.info(f"{s['filename']} - \tremoveSmallObjects")
    min_size=int(params.get("min_size",64))
    img_reduced=morphology.remove_small_objects(s["img_mask_use"], min_size=min_size)
    img_small= np.invert(img_reduced) &  s["img_mask_use"]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_small_remove.png",img_small*255)
    s["img_mask_small_filled"]=(img_small*255)>0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = img_reduced

    s.addToPrintList("percent_small_tissue_removed",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    return


def fillSmallHoles(s,params):
    logging.info(f"{s['filename']} - \tfillSmallHoles")
    min_size=int(params.get("min_size",64))
    img_reduced=morphology.remove_small_holes(s["img_mask_use"], min_size=min_size)
    img_small= img_reduced &  np.invert(s["img_mask_use"])

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_small_fill.png",img_small*255)
    s["img_mask_small_removed"]=(img_small*255)>0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = img_reduced

    s.addToPrintList("percent_small_tissue_filled",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    return