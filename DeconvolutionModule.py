import os
import sys
import numpy as np
from skimage import io, color
from skimage.exposure import rescale_intensity
from skimage.color import separate_stains
from skimage.color import hed_from_rgb, hdx_from_rgb, fgx_from_rgb, bex_from_rgb, rbd_from_rgb
from skimage.color import gdx_from_rgb, hax_from_rgb, bro_from_rgb, bpx_from_rgb, ahx_from_rgb, hpx_from_rgb
from distutils.util import strtobool

import matplotlib.pyplot as plt


def seperateStains(s, params):
    print("\tseperateStains")
    stain = params.get("stain", "")
    use_mask = strtobool(params.get("use_mask", "True"))

    if stain == "":
        print("stain not set in DeconolutionModule.seperateStains")
        sys.exit(1)
        return

    stain_matrix = getattr(sys.modules[__name__], stain, "")

    if stain_matrix == "":
        print("Unknown stain matrix specified in DeconolutionModule.seperateStains")
        sys.exit(1)
        return
    img = s.getImgThumb(s["image_work_size"])
    dimg = separate_stains(img, stain_matrix)

    for c in range(0, 3):
        dc = dimg[:, :, c]

        if use_mask:
            mask = s["img_mask_use"]
            dc_sub = dc[mask]
            dc_min = dc_sub.min()
            dc_max = dc_sub.max()

            s.addToPrintList(f"deconv_c{c}_mean", str(dc_sub.mean()))
        else:
            mask = 1.0
            dc_min = dc.min()
            dc_max = dc.max()
            s.addToPrintList(f"deconv_c{c}_mean", str(dc.mean()))

        dc = (dc - dc_min) / float(dc_max - dc_min) * mask
        io.imsave(s["outdir"] + os.sep + s["filename"] + f"_deconv_c{c}.png", dc)

    return
