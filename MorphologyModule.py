import logging
import os
import numpy as np
from BaseImage import printMaskHelper
from skimage import io, morphology

from scipy import ndimage as ndi

import matplotlib.pyplot as plt

from SaveModule import blend2Images

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


def remove_large_objects(img, max_size):
    #code taken from morphology.remove_small_holes, except switched < with >
    selem = ndi.generate_binary_structure(img.ndim, 1)
    ccs = np.zeros_like(img, dtype=np.int32)
    ndi.label(img, selem, output=ccs)
    component_sizes = np.bincount(ccs.ravel())
    too_big = component_sizes > max_size
    too_big_mask = too_big[ccs]
    img_out=img.copy()
    img_out[too_big_mask] = 0
    return img_out



def removeFatlikeTissue(s,params):
    logging.info(f"{s['filename']} - \tremoveFatlikeTissue")
    fat_cell_size = int(params.get("fat_cell_size ", 64))
    kernel_size=int(params.get("kernel_size", 3))
    max_keep_size=int(params.get("max_keep_size", 1000))


    img_reduced=morphology.remove_small_holes(s["img_mask_use"], min_size=fat_cell_size )
    img_small= img_reduced &  np.invert(s["img_mask_use"])
    img_small = ~morphology.remove_small_holes(~img_small, min_size=9)

    mask_dilate = morphology.dilation(img_small, selem=np.ones((kernel_size, kernel_size)))
    mask_dilate_removed = remove_large_objects(mask_dilate, max_keep_size)

    mask_fat=mask_dilate & ~mask_dilate_removed

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_fatlike.png",mask_fat*255)
    s["img_mask_fatlike"]=(mask_fat*255)>0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = prev_mask & ~mask_fat

    s.addToPrintList("percent_fatlike_tissue_removed",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))


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