import logging
import os
import numpy as np
from BaseImage import printMaskHelper
from skimage import io, color, img_as_ubyte
from distutils.util import strtobool
from skimage.filters import threshold_otsu, rank
from skimage.morphology import disk

import matplotlib.pyplot as plt


def getIntensityThresholdOtsu(s, params):
    logging.info(f"{s['filename']} - \tLightDarkModule.getIntensityThresholdOtsu")
    name = "otsu"
    local = strtobool(params.get("local", "False"))
    radius = float(params.get("radius", 15))
    selem = disk(radius)

    img = s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)

    if local:
        thresh = rank.otsu(img, selem)
        name += "local"
    else:
        thresh = threshold_otsu(img)

    map = img < thresh

    s["img_mask_" + name] = map > 0
    if strtobool(params.get("invert", "False")):
        s["img_mask_" + name] = ~s["img_mask_" + name]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", img_as_ubyte(s["img_mask_" + name]))

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = s["img_mask_use"] & s["img_mask_" + name]

    s.addToPrintList(name,
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.getIntensityThresholdOtsu:{name} NO tissue remains "
                        f"detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.getIntensityThresholdOtsu:{name} NO tissue remains detectable! "
                             f"Downstream modules likely to be incorrect/fail")

    return


def getIntensityThresholdPercent(s, params):
    name = params.get("name", "classTask")
    logging.info(f"{s['filename']} - \tLightDarkModule.getIntensityThresholdPercent:\t {name}")

    lower_thresh = float(params.get("lower_threshold", -float("inf")))
    upper_thresh = float(params.get("upper_threshold", float("inf")))

    lower_var = float(params.get("lower_variance", -float("inf")))
    upper_var = float(params.get("upper_variance", float("inf")))

    img = s.getImgThumb(s["image_work_size"])
    img_var = img.std(axis=2)

    map_var = np.bitwise_and(img_var > lower_var, img_var < upper_var)

    img = color.rgb2gray(img)
    map = np.bitwise_and(img > lower_thresh, img < upper_thresh)

    map = np.bitwise_and(map, map_var)

    s["img_mask_" + name] = map > 0



    if strtobool(params.get("invert", "False")):
        s["img_mask_" + name] = ~s["img_mask_" + name]

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = s["img_mask_use"] & s["img_mask_" + name]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", img_as_ubyte(prev_mask & ~s["img_mask_" + name]))

    s.addToPrintList(name,
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.getIntensityThresholdPercent:{name} NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.getIntensityThresholdPercent:{name} NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return
