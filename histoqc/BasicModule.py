import logging
import os
from histoqc.BaseImage import printMaskHelper
from skimage.morphology import remove_small_objects, binary_opening, disk
from skimage import io
from skimage.util import img_as_ubyte
from histoqc.BaseImage import BaseImage


def getBasicStats(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tgetBasicStats")
    osh = s.image_handle
    s.addToPrintList("type", osh.vendor)
    s.addToPrintList("levels", osh.level_count)
    s.addToPrintList("height", osh.dimensions[1] if len(osh.dimensions) >= 2 else "NA")
    s.addToPrintList("width", osh.dimensions[0] if len(osh.dimensions) >= 2 else "NA")
    s.addToPrintList("mpp_x", osh.mpp_x)
    s.addToPrintList("mpp_y", osh.mpp_y)
    s.addToPrintList("comment", osh.comment.replace("\n", " ").replace("\r", " "))
    return


def finalComputations(s: BaseImage, params):
    mask = s["img_mask_use"]
    s.addToPrintList("pixels_to_use", str(len(mask.nonzero()[0])))


def finalProcessingSpur(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tfinalProcessingSpur")
    disk_radius = int(params.get("disk_radius", "25"))
    selem = disk(disk_radius)
    mask = s["img_mask_use"]
    mask_opened = binary_opening(mask, selem)
    mask_spur = ~mask_opened & mask

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_spur.png", img_as_ubyte(mask_spur))

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = mask_opened

    s.addToPrintList("spur_pixels",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(
            f"{s['filename']} - After BasicModule.finalProcessingSpur"
            f" NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(
            f"After BasicModule.finalProcessingSpur"
            f" NO tissue remains detectable! Downstream modules likely to be incorrect/fail")


def finalProcessingArea(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tfinalProcessingArea")
    area_thresh = int(params.get("area_threshold", "1000"))
    mask = s["img_mask_use"]

    mask_opened = remove_small_objects(mask, min_size=area_thresh)
    mask_removed_area = ~mask_opened & mask

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_areathresh.png", img_as_ubyte(mask_removed_area))

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = mask_opened > 0

    s.addToPrintList("areaThresh",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(
            f"{s['filename']} - After BasicModule.finalProcessingArea"
            f" NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(
            f"After BasicModule.finalProcessingArea"
            f" NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
