import os
import numpy as np
from skimage import io, color
from distutils.util import strtobool
import matplotlib.pyplot as plt



# def getTissuePercent(s, params):
#     print("\tgetTissuePercent")
#     thresh = float(params.get("thresh", .9))
#
#     img = s.getImgThumb(s["image_work_size"])
#     img = color.rgb2gray(img)
#     map = img < thresh
#     s.addToPrintList("percent_tissue", str(map.mean()))
#     io.imsave(s["outdir"] + os.sep + s["filename"] + "_nonwhite.png", map * 255)
#     s["img_mask_nonwhite"] = (map * 255) > 0
#     s["img_mask_use"] = s["img_mask_use"] & s["img_mask_nonwhite"]
#     return
#
#
# def getDarkTissuePercent(s, params):
#     print("\tgetTissueFoldPercent")
#     thresh = float(params.get("thresh", .15))
#
#     img = s.getImgThumb(s["image_work_size"])
#     img = color.rgb2gray(img)
#     map = img < thresh
#     s.addToPrintList("percent_dark_tissue", str(map.mean()))
#     io.imsave(s["outdir"] + os.sep + s["filename"] + "_dark.png", map * 255)
#     s["img_mask_dark"] = (map * 255) > 0
#     s["img_mask_use"] = s["img_mask_use"] & np.invert(s["img_mask_dark"])
#     return


def getIntensityThresholdPercent(s, params):
    name = params.get("name", "classTask")
    print("\tLightDarkModule.getIntensityThresholdPercent:\t", name)

    lower_thresh = float(params.get("lower_threshold", -float("inf")))
    upper_thresh = float(params.get("upper_threshold", float("inf")))

    lower_var = float(params.get("lower_variance", -float("inf")))
    upper_var = float(params.get("upper_variance", float("inf")))

    img = s.getImgThumb(s["image_work_size"])
    img_var = img.std(axis=2)

    map_var = np.bitwise_and(img_var> lower_var, img_var < upper_var)

    img = color.rgb2gray(img)
    map = np.bitwise_and(img > lower_thresh, img < upper_thresh)

    map = np.bitwise_and(map, map_var)

    s.addToPrintList(name, str(map.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", map * 255)
    s["img_mask_" + name] = (map * 255) > 0
    if strtobool(params.get("invert", "False")):
        s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_" + name]
    else:
        s["img_mask_use"] = s["img_mask_use"] & s["img_mask_" + name]

    return
