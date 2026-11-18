"""Intensity-based image thresholding."""
import logging
import os
import numpy as np
from histoqc.BaseImage import printMaskHelper
from skimage import io, color, img_as_ubyte
from distutils.util import strtobool
from skimage.filters import threshold_otsu, rank
from skimage.morphology import disk
from sklearn.cluster import KMeans
from skimage import exposure

import matplotlib.pyplot as plt



def getIntensityThresholdOtsu(s, params):
    """Create an intensity mask using a global or local Otsu threshold.

    TSV columns:
      - ``<name>``: One column named by ``name``.
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).
        The mask keeps pixels darker than the Otsu threshold (brighter ones when
        ``invert`` is true).

    Args:
        s: Slide state containing the image and working tissue mask.
        params: Operation configuration options:

            - ``name`` (str): Name of the output mask. Defaults to ``classTask``.
            - ``local`` (bool): Whether to use local Otsu thresholding. Defaults to
              ``False``.
            - ``radius`` (float): Radius of the neighborhood used for local
              thresholding. Defaults to 15.
            - ``invert`` (bool): Whether to invert the threshold mask. Defaults to
              ``False``.
            - ``mask_statistics`` (str): Statistics mode for the remaining mask.
              Defaults to the slide-wide setting.

    Returns:
        None.
    """
    logging.info(f"{s['filename']} - \tLightDarkModule.getIntensityThresholdOtsu")
    name = params.get("name", "classTask")    
    local = strtobool(params.get("local", "False"))
    radius = float(params.get("radius", 15))
    selem = disk(radius)

    img = s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)

    if local:
        thresh = rank.otsu(img, selem)
    else:
        thresh = threshold_otsu(img)

    map = img < thresh

    s["img_mask_" + name] = map > 0
    if strtobool(params.get("invert", "False")):
        s["img_mask_" + name] = ~s["img_mask_" + name]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", img_as_ubyte(s["img_mask_" + name]))

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


def getIntensityThresholdPercent(s, params):
    """Create an intensity mask using user-supplied intensity and variance bounds.

    TSV columns:
      - ``<name>``: One column named by ``name``. The shipped configurations use
        ``dark`` (their ``darktissue`` sections), ``bright`` (``config.ini``) and
        ``nonwhite`` (``config_clinical.ini``, ``config_first.ini``,
        ``config_light.ini``).
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).
        The mask keeps pixels whose grayscale lies strictly between
        ``lower_threshold`` and ``upper_threshold`` and whose per-pixel RGB standard
        deviation lies strictly between ``lower_std`` and ``upper_std`` (the
        complement when ``invert`` is true).

    Args:
        s: Slide state containing the image and working tissue mask.
        params: Operation configuration options:

            - ``name`` (str): Name of the output mask. Defaults to ``classTask``.
            - ``lower_threshold`` (float): Lower grayscale intensity bound. Defaults
              to negative infinity.
            - ``upper_threshold`` (float): Upper grayscale intensity bound. Defaults
              to positive infinity. the example configuration uses 0.15 for the dark-tissue
              mask and 0.82/0.94 for the bubble mask.
            - ``lower_std`` (float): Lower bound on per-pixel channel standard
              deviation. Defaults to negative infinity; the example configuration uses 10
              for its tissue mask.
            - ``upper_std`` (float): Upper bound on per-pixel channel standard
              deviation. Defaults to positive infinity. ``upper_var`` is an
              accepted alias. The ``upper_variance`` key used in the
              the example configuration bubble section is not read by this function.
            - ``invert`` (bool): Whether to invert the resulting mask. Defaults to
              ``False``; the example configuration enables it for the dark-tissue and
              bubble masks.
            - ``mask_statistics`` (str): Statistics mode for the remaining mask.
              Defaults to the slide-wide setting.

    Returns:
        None.
    """
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

    map_std = np.bitwise_and(img_std > lower_std, img_std < upper_std)

    img = color.rgb2gray(img)
    map = np.bitwise_and(img > lower_thresh, img < upper_thresh)

    map = np.bitwise_and(map, map_std)

    s["img_mask_" + name] = map > 0



    if strtobool(params.get("invert", "False")):
        s["img_mask_" + name] = ~s["img_mask_" + name]

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = s["img_mask_use"] & s["img_mask_" + name]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", img_as_ubyte(prev_mask & ~s["img_mask_" + name]))

    s.addToPrintList(name,
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.getIntensityThresholdPercent:{name} NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.getIntensityThresholdPercent:{name} NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return






def removeBrightestPixels(s, params):
    """Threshold grayscale at the darkest pixel of the brightest of three k-means clusters.

    TSV columns:
      - ``brightestPixels``:
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).

    With ``invert`` false (the default) the mask keeps only pixels brighter than that
    point; set ``invert`` to remove them instead. This operation has no section in the
    example configuration.

    Args:
        s: Slide state containing the image and working tissue mask.
        params: Operation configuration options:

            - ``invert`` (bool): Whether to invert the mask. Defaults to ``False``.
            - ``mask_statistics`` (str): Statistics mode for the remaining mask.
              Defaults to the slide-wide setting.

    Returns:
        None.
    """
    logging.info(f"{s['filename']} - \tLightDarkModule.removeBrightestPixels")

    # lower_thresh = float(params.get("lower_threshold", -float("inf")))
    # upper_thresh = float(params.get("upper_threshold", float("inf")))
    #
    # lower_var = float(params.get("lower_variance", -float("inf")))
    # upper_var = float(params.get("upper_variance", float("inf")))

    img = s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)

    kmeans = KMeans(n_clusters=3,  n_init=1).fit(img.reshape([-1, 1]))
    brightest_cluster = np.argmax(kmeans.cluster_centers_)
    darkest_point_in_brightest_cluster = (img.reshape([-1, 1])[kmeans.labels_ == brightest_cluster]).min()

    s["img_mask_bright"] = img > darkest_point_in_brightest_cluster



    if strtobool(params.get("invert", "False")):
        s["img_mask_bright"] = ~s["img_mask_bright"]

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = s["img_mask_use"] & s["img_mask_bright"]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_bright.png", img_as_ubyte(prev_mask & ~s["img_mask_bright"]))

    s.addToPrintList("brightestPixels",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.removeBrightestPixels NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.removeBrightestPixels NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return



def minimumPixelIntensityNeighborhoodFiltering(s,params):
    """Remove areas with no dark pixel nearby, using a neighbourhood minimum filter.

    TSV columns:
      - ``brightestPixels``:
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).

    Grayscale is scaled to 0 to 255 and replaced by its minimum over a disk; pixels
    whose neighbourhood minimum exceeds ``upper_threshold`` are bright everywhere
    around them (mainly glass). With ``invert`` true (the default) they are removed.

    Args:
        s: Slide state containing the image and working tissue mask.
        params: Operation configuration options:

            - ``disk_size`` (int): Radius of the disk for the minimum filter.
              Defaults to 10000; the example configuration sets this to 5.
            - ``upper_threshold`` (int): Neighbourhood-minimum threshold on the 0 to
              255 scale. Defaults to 200; the example configuration sets this to 210.
            - ``invert`` (bool): Whether to remove (true) or keep (false) the pixels
              above the threshold. Defaults to ``True``; the example configuration
              sets this to ``True``.
            - ``mask_statistics`` (str): Statistics mode for the remaining mask.
              Defaults to the slide-wide setting.

    Returns:
        None.
    """
    logging.info(f"{s['filename']} - \tLightDarkModule.minimumPixelNeighborhoodFiltering")
    disk_size = int(params.get("disk_size", 10000))
    threshold = int(params.get("upper_threshold", 200))

    img = s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)
    img = (img * 255).astype(np.uint8)
    selem = disk(disk_size)

    imgfilt = rank.minimum(img, selem)
    s["img_mask_bright"] = imgfilt > threshold


    if strtobool(params.get("invert", "True")):
        s["img_mask_bright"] = ~s["img_mask_bright"]

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = s["img_mask_use"] & s["img_mask_bright"]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_bright.png", img_as_ubyte(prev_mask & ~s["img_mask_bright"]))

    s.addToPrintList("brightestPixels",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After LightDarkModule.minimumPixelNeighborhoodFiltering NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After LightDarkModule.minimumPixelNeighborhoodFiltering NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return

def saveEqualisedImage(s,params):
    logging.info(f"{s['filename']} - \tLightDarkModule.saveEqualisedImage")

    img = s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)

    out = exposure.equalize_hist((img*255).astype(np.uint8))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_equalized_thumb.png", img_as_ubyte(out))

    return
