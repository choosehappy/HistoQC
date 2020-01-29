import logging
import os

import skimage
from BaseImage import printMaskHelper
from skimage import io
from skimage.color import rgb2gray
from skimage.filters import rank
import numpy as np

import matplotlib.pyplot as plt


# Analysis of focus measure operators for shape-from-focus
# Said Pertuza,, Domenec Puiga, Miguel Angel Garciab, 2012
# https://pdfs.semanticscholar.org/8c67/5bf5b542b98bf81dcf70bd869ab52ab8aae9.pdf


def identifyBlurryRegions(s, params):
    logging.info(f"{s['filename']} - \tidentifyBlurryRegions")

    blur_radius = int(params.get("blur_radius", 7))
    blur_threshold = float(params.get("blur_threshold", .1))

    img = s.getImgThumb(params.get("image_work_size", "2.5x"))
    img = rgb2gray(img)
    img_laplace = np.abs(skimage.filters.laplace(rgb2gray(img)))
    mask = skimage.filters.gaussian(img_laplace, sigma=blur_radius) <= blur_threshold

    mask = skimage.transform.resize(mask, s.getImgThumb(s["image_work_size"]).shape, order=0)[:, :,
           1]  # for some reason resize takes a grayscale and produces a 3chan
    mask = s["img_mask_use"] & (mask > 0)

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_blurry.png", mask * 255)
    s["img_mask_blurry"] = (mask * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_blurry"]

    s.addToPrintList("percent_blurry",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if (len(s["img_mask_use"].nonzero()[0])*len(prev_mask.nonzero()[0])) == 0:  # add warning in case the final tissue is empty or the prev_mask is empty
        logging.warning(
            f"{s['filename']} - After BlurDectionModule.identifyBlurryRegions NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(
            f"After BlurDectionModule.identifyBlurryRegions NO tissue remains detectable! Downstream modules likely to be incorrect/fail")

    return
