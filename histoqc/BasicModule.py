"""Basic slide metadata and final mask processing.

Conventions for the columns in ``results.tsv``, shared by all modules:

- Measurements are made on a thumbnail at ``image_work_size`` (1.25x in the example
  configuration; blur detection runs at its own size, 2.5x, and its mask is resized
  back). Grayscale is scikit-image ``rgb2gray``, 0 to 1.
- Most measurements use the current tissue mask (``img_mask_use``), which each
  mask-filtering step changes in pipeline order.
- Mask-filtering steps report their change to that mask according to
  ``mask_statistics`` (set slide-wide, or per operation):

  - ``relative2mask`` (the default): fraction of the previous mask removed by the
    step, 1 - after/before; ``-100`` if the previous mask was already empty. A step
    that adds pixels (``fillSmallHoles``) gives a negative value.
  - ``relative2image``: fraction of the whole thumbnail in the mask after the step.
  - ``absolute``: number of mask pixels after the step.

- ``-100`` in a measurement column means the mask it reads was empty.
"""
import logging
import os
from histoqc.BaseImage import printMaskHelper, getMaskRegionsStats
from skimage.morphology import remove_small_objects, binary_opening, disk
from skimage import io, color, img_as_ubyte

import matplotlib.pyplot as plt


def getBasicStats(s, params):
    """Record basic metadata from the slide image header.

    TSV columns:
      - ``type``: Scanner vendor (``openslide.vendor``).
      - ``levels``: Number of pyramid levels (``openslide.level-count``).
      - ``height``, ``width``: Level-0 size in pixels.
      - ``mpp_x``, ``mpp_y``: Microns per pixel from the slide metadata.
      - ``comment``: ``openslide.comment`` with line breaks removed.

    Missing properties are written as ``NA``. Four more metadata columns are written
    when the slide is loaded (``histoqc.BaseImage``), not by this function:
    ``filename``; ``comments`` (a blank placeholder); ``image_bounding_box``, the
    (x, y, width, height) of the analysed region, which is the whole slide unless
    ``enable_bounding_box`` is set and the slide supplies bounds; and ``base_mag``,
    from ``openslide.objective-power``, else ``aperio.AppMag``, else the configured
    ``base_mag``. The last column, ``warnings``, joins the warning messages from all
    steps with ``|``.

    Args:
        s: Slide state containing the OpenSlide handle and result collector.
        params: Operation configuration mapping. This function has no
            operation-specific options in the example configuration.

    Returns:
        None.
    """
    logging.info(f"{s['filename']} - \tgetBasicStats")
    osh = s["os_handle"]
    s.addToPrintList("type", osh.properties.get("openslide.vendor", "NA"))
    s.addToPrintList("levels", osh.properties.get("openslide.level-count", "NA"))
    s.addToPrintList("height", osh.properties.get("openslide.level[0].height", "NA"))
    s.addToPrintList("width", osh.properties.get("openslide.level[0].width", "NA"))
    s.addToPrintList("mpp_x", osh.properties.get("openslide.mpp-x", "NA"))
    s.addToPrintList("mpp_y", osh.properties.get("openslide.mpp-y", "NA"))
    s.addToPrintList("comment", osh.properties.get("openslide.comment", "NA").replace("\n", " ").replace("\r", " "))
    return


def finalComputations(s, params):
    """Record the final number of pixels available in the output mask.

    TSV columns:
      - ``pixels_to_use``: Size of the final tissue mask. ``relative2mask`` is not
        supported here and falls back to ``absolute`` (pixel count);
        ``relative2image`` gives the fraction of the image in the mask.

    Args:
        s: Slide state containing the final working mask.
        params: Operation configuration options:

            - ``mask_statistics`` (str): Pixel-count reporting mode. Defaults to the
              slide-wide setting; the example configuration sets this operation to
              ``absolute``. ``relative2mask`` is unsupported here and falls
              back to ``absolute``.

    Returns:
        None.
    """
    mask = s["img_mask_use"]
    mask_statistics = params.get("mask_statistics", s["mask_statistics"])
    if mask_statistics == "relative2mask":
        warning_message = "relative2mask is not supported in BasicModule.finalComputations. Using absolute instead."
        logging.warning(f"{s['filename']} - {warning_message}")
        s["warnings"].append(warning_message)
        mask_statistics = "absolute"
    s.addToPrintList("pixels_to_use", printMaskHelper(mask_statistics, mask, mask))


def finalProcessingSpur(s, params):
    """Remove small spurs from the final mask by morphological opening.

    TSV columns:
      - ``spur_pixels``:
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).
        Removed pixels are thin protrusions that do not survive a morphological
        opening with a disk of radius ``disk_radius``.

    Args:
        s: Slide state containing the working tissue mask.
        params: Operation configuration options:

            - ``disk_radius`` (int): Radius of the disk used for morphological
              opening. Defaults to 25; the example configuration sets this to 5.
            - ``mask_statistics`` (str): Statistics mode for the remaining mask.
              Defaults to the slide-wide setting.

    Returns:
        None.
    """
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
            f"{s['filename']} - After BasicModule.finalProcessingSpur NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(
            f"After BasicModule.finalProcessingSpur NO tissue remains detectable! Downstream modules likely to be incorrect/fail")


def finalProcessingArea(s, params):
    """Remove tissue pieces smaller than ``area_threshold`` from the final mask.

    TSV columns:
      - ``areaThresh``:
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).
        Removed pixels belong to tissue pieces smaller than ``area_threshold``.

    Args:
        s: Slide state containing the working tissue mask.
        params: Operation configuration options:

            - ``area_threshold`` (int): Minimum object size to retain. Defaults to
              1000 pixels; the example configuration sets this to 10000.
            - ``mask_statistics`` (str): Statistics mode for the remaining mask.
              Defaults to the slide-wide setting.

    Returns:
        None.
    """
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
        warning_message = "After BasicModule.finalProcessingArea NO tissue remains detectable! Downstream modules likely to be incorrect/fail"
        logging.warning(
            f"{s['filename']} - {warning_message}")
        s["warnings"].append(warning_message)


def countTissuePieces(s, params):
    """Count connected pieces of tissue in the current mask.

    TSV columns:
      - ``#pieces_of_tissue``: Number of connected regions in the tissue mask at this
        point in the pipeline (the final mask when run after the mask-filtering
        steps, as in the example configuration).

    Args:
        s: Slide state containing the working tissue mask.
        params: Operation configuration mapping. This function has no
            operation-specific options in the example configuration.

    Returns:
        None.
    """
    mask = s["img_mask_use"]
    stats = getMaskRegionsStats(mask)
    s.addToPrintList("#pieces_of_tissue", str(stats.get('num', 0)))
