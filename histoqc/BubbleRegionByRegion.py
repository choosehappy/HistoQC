import logging
import os

from histoqc.BaseImage import printMaskHelper
from scipy.signal import convolve2d

from skimage.util import img_as_ubyte
from skimage.filters import frangi
from skimage.color import rgb2gray
from skimage.morphology import remove_small_objects
from histoqc.BaseImage import BaseImage
from skimage import io, color
import numpy as np


global_holder = {}


# WARNING: Not as robust as other modules
def roiWise(s: BaseImage, params):
    adapter = s.image_handle.adapter
    name = params.get("name", "classTask")
    print("\tpixelWise:\t", name, end="")

    win_size = int(params.get("win_size", 2048))  # the size of the ROI which will be iteratively considered

    osh = s.image_handle

    dim_base = osh.level_dimensions[0]
    level = min(int(params.get("level", 1)), len(osh.level_dimensions) - 1)
    dims = osh.level_dimensions[level]

    ratio_x = dim_base[0] / dims[0]  # figure out the difference between desi
    ratio_y = dim_base[1] / dims[1]

    frangi_scale_range = (1, 6)
    frangi_scale_step = 2
    frangi_beta1 = .5
    frangi_beta2 = 100
    frangi_black_ridges = True

    mask = []
    for x in range(0, dim_base[0], round(win_size * ratio_x)):
        row_piece = []
        print('.', end='', flush=True)
        for y in range(0, dim_base[1], round(win_size * ratio_y)):
            # todo: confirm -- the original level is hardcoded to be 1, shouldn't it be the level variable?

            region = osh.region_backend((x, y), level, (win_size, win_size))
            region = osh.backend_to_array(region)[..., :3]
            g = adapter(rgb2gray)(region)
            # todo -- forward compatibility. Later version of frangi alters the signatures
            sigmas = frangi_scale_range + (frangi_scale_step,)
            feat = adapter(frangi)(g, sigmas=sigmas, beta=frangi_beta1,
                                   gamma=frangi_beta2, black_ridges=frangi_black_ridges)

            feat = feat / 8.875854409275627e-08
            region_mask = adapter.and_(g < .3, feat > 5)
            region_mask = adapter(remove_small_objects)(region_mask, min_size=100)
            row_piece.append(region_mask)
        # sanity check: force to synchronize the device
        row_piece = adapter.device_sync_all(*row_piece)
        row_piece = np.concatenate(row_piece, axis=0)

        mask.append(row_piece)
    mask = adapter.device_sync_all(*mask)
    mask = np.concatenate(mask, axis=1)

    if params.get("area_threshold", "") != "":
        # forward compatibility
        # inplace=True is equivalent to out=mask. Therefore, it is removed in future version
        mask = adapter(remove_small_objects)(mask, min_size=int(params.get("area_threshold", "")), out=mask)

    s.addToPrintList(name, str(mask.mean()))

    fname = os.path.join(s["outdir"], f"{s['filename']}_BubbleBounds.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(mask))
    return


def detectSmoothness(s: BaseImage, params):

    adapter = s.image_handle.adapter
    logging.info(f"{s['filename']} - \tBubbleRegionByRegion.detectSmoothness")
    thresh = float(params.get("threshold", ".01"))
    kernel_size = int(params.get("kernel_size", "10"))
    min_object_size = int(params.get("min_object_size", "100"))
    img = s.getImgThumb(s["image_work_size"])
    img = adapter(color.rgb2gray)(img)
    avg = np.ones((kernel_size, kernel_size)) / (kernel_size**2)

    imf = adapter(convolve2d)(img, in2=avg, mode="same")

    mask_flat = abs(imf - img) < thresh

    mask_flat = adapter(remove_small_objects)(mask_flat, min_size=min_object_size)
    mask_flat = ~adapter(remove_small_objects)(~mask_flat, min_size=min_object_size)

    prev_mask = s["img_mask_use"]
    s["img_mask_flat"] = mask_flat
    fname = os.path.join(s["outdir"], f"{s['filename']}_flat.png")
    flat_out = adapter.and_(mask_flat, prev_mask)
    adapter.imsave(fname, adapter(img_as_ubyte)(flat_out))

    s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_flat"]

    s.addToPrintList("flat_areas",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask,
                                     s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After BubbleRegionByRegion.detectSmoothness: NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After BubbleRegionByRegion.detectSmoothness: NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")
    return

