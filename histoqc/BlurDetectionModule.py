import logging
import os

import skimage
from histoqc.BaseImage import printMaskHelper, BaseImage
from skimage import morphology, measure
from skimage.util import img_as_ubyte
from skimage.color import rgb2gray
import numpy as np

# Analysis of focus measure operators for shape-from-focus
# Said Pertuza,, Domenec Puiga, Miguel Angel Garciab, 2012
# https://pdfs.semanticscholar.org/8c67/5bf5b542b98bf81dcf70bd869ab52ab8aae9.pdf


def identifyBlurryRegions(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tidentifyBlurryRegions")
    adapter = s.image_handle.adapter
    blur_radius = int(params.get("blur_radius", 7))
    blur_threshold = float(params.get("blur_threshold", .1))
    img_thumb = s.getImgThumb(params.get("image_work_size", "2.5x"))

    img = adapter(rgb2gray)(img_thumb)
    # use the __abs__ interface

    logging.debug(f"{s['filename']} - \tidentifyBlurryRegions Gray:"
                  f" {img.max(), img.min(), blur_radius, blur_threshold}")

    img_laplace = abs(adapter(skimage.filters.laplace)(img))

    logging.debug(f"{s['filename']} - \tidentifyBlurryRegions img_laplace: {img_laplace.max(), img_laplace.min()}")
    mask = adapter(skimage.filters.gaussian)(img_laplace, sigma=blur_radius) <= blur_threshold

    # for some reason resize takes a grayscale and produces a 3chan
    # Note: the reason you obtain a 3chan is that you specified a 3chan output shape
    mask_resized_shape = s.getImgThumb(s["image_work_size"]).shape[:2]
    mask = adapter(skimage.transform.resize)(mask, output_shape=mask_resized_shape, order=0)

    mask = adapter.and_(s["img_mask_use"], mask > 0)

    fname = os.path.join(s["outdir"], f"{s['filename']}_blurry.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(mask))
    s["img_mask_blurry"] = (mask * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = adapter.and_(s["img_mask_use"], ~s["img_mask_blurry"])

    labeled_mask = adapter(morphology.label)(mask)
    rps = adapter(measure.regionprops)(labeled_mask)

    if rps:
        # scalar stats --> CPU is sufficient.
        # use float to cast cp.array(scalar) to python's float
        areas = np.asarray([float(rp.area) for rp in rps])
        nobj = len(rps)
        area_max = areas.max()
        area_mean = areas.mean()
    else:
        nobj = area_max = area_mean = 0
    s.addToPrintList("blurry_removed_num_regions", str(nobj))
    s.addToPrintList("blurry_removed_mean_area", str(area_mean))
    s.addToPrintList("blurry_removed_max_area", str(area_max))

    s.addToPrintList("blurry_removed_percent",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(
            f"{s['filename']} - After BlurDetectionModule.identifyBlurryRegions "
            f"NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(
            f"After BlurDetectionModule.identifyBlurryRegions"
            f" NO tissue remains detectable! Downstream modules likely to be incorrect/fail")

    return
