import logging
import os
import sys
import numpy as np
from skimage import io
from skimage.util import img_as_ubyte
from histoqc.BaseImage import BaseImage
from skimage.color import separate_stains
from distutils.util import strtobool
from histoqc.import_wrapper import dynamic_import


def separateStains(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tseparateStains")
    stain = params.get("stain", "")
    use_mask = strtobool(params.get("use_mask", "True"))

    if stain == "":
        logging.error(f"{s['filename']} - stain not set in DeconvolutionModule.separateStains")
        sys.exit(1)

    try:
        stain_matrix = dynamic_import("skimage.color", stain, return_first=True)
    except ImportError:
        logging.error(f"{s['filename']} - Unknown stain matrix specified in DeconolutionModule.separateStains")
        sys.exit(1)

    mask = s["img_mask_use"]

    if use_mask and len(mask.nonzero()[0]) == 0:  # -- lets just error check at the top if mask is empty and abort early
        for c in range(3):
            s.addToPrintList(f"deconv_c{c}_std", str(-100))
            s.addToPrintList(f"deconv_c{c}_mean", str(-100))
            io.imsave(s["outdir"] + os.sep + s["filename"] + f"_deconv_c{c}.png", img_as_ubyte(np.zeros(mask.shape)))

        logging.warning(f"{s['filename']} - DeconvolutionModule.separateStains: NO tissue "
                        f"remains detectable! Saving Black images")
        s["warnings"].append(f"DeconvolutionModule.separateStains: NO tissue "
                             f"remains detectable! Saving Black images")

        return

    img = s.getImgThumb(s["image_work_size"])
    dimg = separate_stains(img, stain_matrix)

    for c in range(0, 3):
        dc = dimg[:, :, c]

        clip_max_val = np.quantile(dc.flatten(), .99)
        dc = np.clip(dc, a_min=0, a_max=clip_max_val)

        if use_mask:
            dc_sub = dc[mask]
            dc_min = dc_sub.min()
            dc_max = dc_sub.max()

            s.addToPrintList(f"deconv_c{c}_mean", str(dc_sub.mean()))
            s.addToPrintList(f"deconv_c{c}_std", str(dc_sub.std()))
        else:
            mask = 1.0
            dc_min = dc.min()
            dc_max = dc.max()

            s.addToPrintList(f"deconv_c{c}_mean", str(dc.mean()))
            s.addToPrintList(f"deconv_c{c}_std", str(dc.std()))

        dc = (dc - dc_min) / float(dc_max - dc_min) * mask
        io.imsave(s["outdir"] + os.sep + s["filename"] + f"_deconv_c{c}.png", img_as_ubyte(dc))

    return
