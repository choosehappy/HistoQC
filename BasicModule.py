import logging
from distutils.util import strtobool
from skimage.morphology import remove_small_objects


def getBasicStats(s, params):
    logging.info(f"{s['filename']} - \tgetBasicStats")
    osh = s["os_handle"]
    s.addToPrintList("type", osh.properties["openslide.vendor"])
    s.addToPrintList("levels", osh.properties["openslide.level-count"])
    s.addToPrintList("height", osh.properties["openslide.level[0].height"])
    s.addToPrintList("width", osh.properties["openslide.level[0].width"])
    s.addToPrintList("mpp-x", osh.properties["openslide.mpp-x"])
    s.addToPrintList("mpp-y", osh.properties["openslide.mpp-y"])
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
    s.addToPrintList("Magnification", mag)
    return


def finalComputations(s, params):
    mask = s["img_mask_use"]
    s.addToPrintList("pixels_to_use", str(len(mask.nonzero()[0])))


def finalProcessing(s, params):
    mask = remove_small_objects(s["img_mask_use"], min_size=int(params.get("area_thresh", "")), in_place=True)
    s["img_mask_use"] = mask > 0
