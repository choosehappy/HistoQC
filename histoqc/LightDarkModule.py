import logging
import os
import numpy as np
from histoqc.BaseImage import printMaskHelper, BaseImage
from skimage import io, color
from histoqc.array_adapter import ArrayAdapter, Device
from skimage.util import img_as_ubyte
from distutils.util import strtobool
from skimage.filters import threshold_otsu, rank
from skimage.morphology import disk
from sklearn.cluster import KMeans
from skimage import exposure


def getIntensityThresholdOtsu(s: BaseImage, params):

    logging.info(f"{s['filename']} - \tLightDarkModule.getIntensityThresholdOtsu")
    adapter = s.image_handle.adapter
    name = params.get("name", "classTask")    
    local = strtobool(params.get("local", "False"))
    radius = int(params.get("radius", 15))

    img = s.getImgThumb(s["image_work_size"])
    img = adapter(color.rgb2gray)(img)

    if local:
        thresh = adapter(rank.otsu)(img, footprint=disk(radius))
    else:
        thresh = adapter(threshold_otsu)(img)

    region_below_thresh = img < thresh

    s["img_mask_" + name] = region_below_thresh > 0
    if strtobool(params.get("invert", "False")):
        s["img_mask_" + name] = ~s["img_mask_" + name]
    fname = os.path.join(s["outdir"], f"{s['filename']}_{name}.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(s["img_mask_" + name]))

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


def getIntensityThresholdPercent(s: BaseImage, params):

    adapter = s.image_handle.adapter
    name = params.get("name", "classTask")
    logging.info(f"{s['filename']} - \tLightDarkModule.getIntensityThresholdPercent:\t {name}")
    lower_thresh = float(params.get("lower_threshold", "-inf"))
    upper_thresh = float(params.get("upper_threshold", "inf"))

    # Prepare parameter names due to issues #213 and #219
    # set lower standard deviation
    lower_std = float(params.get("lower_var") or params.get("lower_std") or "-inf")
    # set upper standard deviation
    upper_std = float(params.get("upper_var") or params.get("upper_std") or "inf")

    img = s.getImgThumb(s["image_work_size"])
    img_std = img.std(axis=2)

    map_std = adapter.and_(img_std > lower_std, img_std < upper_std)

    img = adapter(color.rgb2gray)(img)
    region_between_interval = adapter.and_(img > lower_thresh, img < upper_thresh)
    region_between_interval = adapter.and_(region_between_interval, map_std)

    s["img_mask_" + name] = region_between_interval > 0

    if strtobool(params.get("invert", "False")):
        s["img_mask_" + name] = ~s["img_mask_" + name]

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = adapter.and_(s["img_mask_use"], s["img_mask_" + name])
    fname = os.path.join(s["outdir"], f"{s['filename']}_{name}.png")
    mask_out = adapter.and_(prev_mask, ~s["img_mask_" + name])
    mask_out = adapter(img_as_ubyte)(mask_out)
    adapter.imsave(fname, mask_out)

    s.addToPrintList(name,
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.getIntensityThresholdPercent:{name} NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.getIntensityThresholdPercent:{name} NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return


def removeBrightestPixels(s: BaseImage, params):
    adapter = s.image_handle.adapter
    logging.info(f"{s['filename']} - \tLightDarkModule.removeBrightestPixels")

    # lower_thresh = float(params.get("lower_threshold", -float("inf")))
    # upper_thresh = float(params.get("upper_threshold", float("inf")))
    #
    # lower_var = float(params.get("lower_variance", -float("inf")))
    # upper_var = float(params.get("upper_variance", float("inf")))

    img = s.getImgThumb(s["image_work_size"])
    img = adapter(color.rgb2gray)(img)

    kmc = KMeans(n_clusters=3,  n_init=1)
    kmeans = adapter(kmc.fit)(img.reshape([-1, 1]))
    # noinspection PyUnresolvedReferences
    brightest_cluster = np.argmax(kmeans.cluster_centers_)
    # noinspection PyUnresolvedReferences
    darkest_point_in_brightest_cluster = (img.reshape([-1, 1])[kmeans.labels_ == brightest_cluster]).min()

    s["img_mask_bright"] = img > darkest_point_in_brightest_cluster

    if strtobool(params.get("invert", "False")):
        s["img_mask_bright"] = ~s["img_mask_bright"]

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = adapter.and_(s["img_mask_use"], s["img_mask_bright"])
    fname = os.path.join(s["outdir"], f"{s['filename']}_bright.png.png")
    bright_out = adapter.and_(prev_mask, ~s["img_mask_bright"])
    bright_out = adapter(img_as_ubyte)(bright_out)
    adapter.imsave(fname, bright_out)

    s.addToPrintList("brightestPixels",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.removeBrightestPixels NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.removeBrightestPixels NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return


def minimumPixelIntensityNeighborhoodFiltering(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tLightDarkModule.minimumPixelNeighborhoodFiltering")
    adapter = s.image_handle.adapter
    disk_size = int(params.get("disk_size", 10000))
    threshold = int(params.get("upper_threshold", 200))

    img = s.getImgThumb(s["image_work_size"])
    img = adapter(color.rgb2gray)(img)
    img = adapter(img_as_ubyte)(img)
    # note - for uint type, CPU's rank.minimum is >>> faster than GPU's erosion
    imgfilt = adapter(rank.minimum)(img, footprint=disk(disk_size))

    s["img_mask_bright"] = imgfilt > threshold

    if strtobool(params.get("invert", "True")):
        s["img_mask_bright"] = ~s["img_mask_bright"]

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = adapter.and_(s["img_mask_use"], s["img_mask_bright"])
    fname = os.path.join(s["outdir"], f"{s['filename']}_bright.png")
    mask_out = adapter.and_(prev_mask, ~s["img_mask_bright"])
    adapter.imsave(fname, adapter(img_as_ubyte)(mask_out))

    s.addToPrintList("brightestPixels",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.minimumPixelNeighborhoodFiltering NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.minimumPixelNeighborhoodFiltering NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return


def saveEqualisedImage(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tLightDarkModule.saveEqualisedImage")
    adapter = s.image_handle.adapter
    img = s.getImgThumb(s["image_work_size"])
    img = adapter(color.rgb2gray)(img)
    img_u8 = adapter(img_as_ubyte)(img)
    out = adapter(exposure.equalize_hist)(img_u8)
    out_u8 = ArrayAdapter.curate_arrays_device(adapter(img_as_ubyte)(out),
                                               device=Device.build(Device.DEVICE_CPU))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_equalized_thumb.png", out_u8)

    return
