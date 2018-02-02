import os

import skimage
from skimage import io
from skimage.color import rgb2gray
from skimage.filters import rank
import numpy as np


# Analysis of focus measure operators for shape-from-focus
# Said Pertuza,, Domenec Puiga, Miguel Angel Garciab, 2012
# https://pdfs.semanticscholar.org/8c67/5bf5b542b98bf81dcf70bd869ab52ab8aae9.pdf


def identifyBlurryRegions(s, params):
    print("\tidentifyBlurryRegions")
    blur_radius = int(params.get("blur_radius", 7))
    blur_threshold = float(params.get("blur_threshold", .02))

    img = s.getImgThumb(5000)
    img = rgb2gray(img)
    img_laplace = np.abs(skimage.filters.laplace(rgb2gray(img)))
    mask = skimage.filters.gaussian(img_laplace, sigma=blur_radius) <= blur_threshold

    mask = skimage.transform.resize(mask, s.getImgThumb(s["image_work_size"]).shape, order=0)[:, :, 1]  # for some reason resize takes a grayscale and produces a 3chan
    mask = s["img_mask_use"] & (mask > 0)

    s.addToPrintList("percent_blurry", str(mask.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_blurry.png", mask * 255)
    s["img_mask_blurry"] = (mask * 255) > 0
    s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_blurry"]

    return
