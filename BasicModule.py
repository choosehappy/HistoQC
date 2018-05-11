import logging
import os
from distutils.util import strtobool
from skimage.morphology import remove_small_objects, binary_opening, disk
from skimage import io, color

import matplotlib.pyplot as plt


def getBasicStats(s, params):
    logging.info(f"{s['filename']} - \tgetBasicStats")
    osh = s["os_handle"]
    s.addToPrintList("type", osh.properties["openslide.vendor"])
    s.addToPrintList("levels", osh.properties["openslide.level-count"])
    s.addToPrintList("height", osh.properties["openslide.level[0].height"])
    s.addToPrintList("width", osh.properties["openslide.level[0].width"])
    s.addToPrintList("mpp_x", osh.properties["openslide.mpp-x"])
    s.addToPrintList("mpp_y", osh.properties["openslide.mpp-y"])
    s.addToPrintList("comment", osh.properties["openslide.comment"].replace("\n", " ").replace("\r", " "))
    return


def getMag(s, params):
    logging.info(f"{s['filename']} - \tgetMag")
    osh = s["os_handle"]
    mag = osh.properties["openslide.objective-power"]
    if (mag is None or strtobool(
            params.get("confirm", False))):  # TODO: Don't know what previous call returns when not available....
        # do analysis work here
        logging.warning(f"{s['filename']} - Unknown magnification for file")
        s["warnings"].append(f"{s['filename']} - Unknown magnification for file")
    s.addToPrintList("Magnification", mag)
    return


def finalComputations(s, params):
    mask = s["img_mask_use"]
    s.addToPrintList("pixels_to_use", str(len(mask.nonzero()[0])))


def finalProcessingSpur(s, params):
    logging.info(f"{s['filename']} - \tfinalProcessingSpur")
    disk_radius = int(params.get("disk_radius ", 25))
    selem = disk(disk_radius)
    mask = s["img_mask_use"]
    mask_opened = binary_opening(mask, selem)
    mask_spur = ~mask_opened & mask
    s.addToPrintList("spur_pixels", str(len(mask_spur.nonzero()[0])))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_spur.png", mask_spur * 255)
    s["img_mask_use"] = mask_opened
    if len(s["img_mask_use"].nonzero()[0])==0:  #add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After BasicModule.finalProcessingSpur NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After BasicModule.finalProcessingSpur NO tissue remains detectable! Downstream modules likely to be incorrect/fail")


def finalProcessingArea(s, params):
    logging.info(f"{s['filename']} - \tfinalProcessingArea")
    mask = s["img_mask_use"]
    mask_opened = remove_small_objects(mask, min_size=int(params.get("area_thresh", "")))
    mask_removed_area = ~mask_opened & mask

    s.addToPrintList("spur_pixels", str(len(mask_removed_area.nonzero()[0])))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_areathresh.png", mask_removed_area* 255)

    s["img_mask_use"] = mask_opened > 0
    if len(s["img_mask_use"].nonzero()[0])==0:  #add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After BasicModule.finalProcessingArea NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After BasicModule.finalProcessingArea NO tissue remains detectable! Downstream modules likely to be incorrect/fail")


