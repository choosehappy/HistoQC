"""Morphological refinement of image masks."""
import logging
import os
import numpy as np
from histoqc.BaseImage import printMaskHelper, getMaskRegionsStats
from skimage import io, morphology, img_as_ubyte, measure

from scipy import ndimage as ndi

import matplotlib.pyplot as plt  # these 2 are used for debugging
from histoqc.SaveModule import blend2Images #for easier debugging


def removeSmallObjects(s, params):
    """Remove small objects, such as pixel noise and dust, from the image mask.

    TSV columns:
      - ``small_tissue_removed_percent``:
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).
      - ``small_tissue_removed_num_regions``: Number of connected regions removed (0 if none).
      - ``small_tissue_removed_mean_area``: Mean area of those regions, in pixels at
        ``image_work_size``.
      - ``small_tissue_removed_max_area``: Area of the largest of those regions.

    Args:
        s: Slide state containing the working tissue mask.
        params: Operation configuration options:

            - ``min_size`` (int): Minimum object size to retain. Defaults to 64 pixels;
              the example configuration also sets this to 64.
            - ``mask_statistics`` (str): Statistics mode used for the removed-mask
              percentage. Defaults to the slide-wide setting, which is
              ``relative2mask`` in the example configuration.

    Returns:
        None.
    """
    logging.info(f"{s['filename']} - \tremoveSmallObjects")
    min_size = int(params.get("min_size", 64))
    img_reduced = morphology.remove_small_objects(s["img_mask_use"], min_size=min_size)
    img_small = np.invert(img_reduced) & s["img_mask_use"]

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_small_remove.png", img_as_ubyte(img_small))
    s["img_mask_small_filled"] = (img_small * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = img_reduced


    # rps = measure.regionprops(morphology.label(img_small))
    # if rps:
    #     areas = np.asarray([rp.area for rp in rps])
    #     nobj = len(rps)
    #     area_max = areas.max()
    #     area_mean = areas.mean()
    # else:
    #     nobj = area_max = area_mean = 0
    stats = getMaskRegionsStats(img_small)


    # s.addToPrintList("small_tissue_removed_num_regions", str(nobj))
    # s.addToPrintList("small_tissue_removed_mean_area", str(area_mean))
    # s.addToPrintList("small_tissue_removed_max_area", str(area_max))
    s.addToPrintList("small_tissue_removed_num_regions", str(stats.get('num',0)))
    s.addToPrintList("small_tissue_removed_mean_area", str(stats.get('area_mean',0)))
    s.addToPrintList("small_tissue_removed_max_area", str(stats.get('area_max',0)))




    s.addToPrintList("small_tissue_removed_percent",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))


    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After MorphologyModule.removeSmallObjects: NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After MorphologyModule.removeSmallObjects: NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return


def remove_large_objects(img, max_size):
    # code taken from morphology.remove_small_holes, except switched < with >
    selem = ndi.generate_binary_structure(img.ndim, 1)
    ccs = np.zeros_like(img, dtype=np.int32)
    ndi.label(img, selem, output=ccs)
    component_sizes = np.bincount(ccs.ravel())
    too_big = component_sizes > max_size
    too_big_mask = too_big[ccs]
    img_out = img.copy()
    img_out[too_big_mask] = 0
    return img_out


def removeFatlikeTissue(s, params):
    """Remove clusters of small holes that look like fat tissue.

    TSV columns:
      - ``fatlike_tissue_removed_percent``:
        Fraction of the remaining tissue mask removed by this step under the
        default ``mask_statistics`` (see :mod:`histoqc.BasicModule` for the other
        modes).
      - ``fatlike_tissue_removed_num_regions``: Number of connected regions removed (0 if none).
      - ``fatlike_tissue_removed_mean_area``: Mean area of those regions, in pixels at
        ``image_work_size``.
      - ``fatlike_tissue_removed_max_area``: Area of the largest of those regions.

    Holes smaller than ``fat_cell_size`` pixels are found and dilated with a
    ``kernel_size`` square; where the dilated holes merge into clusters larger than
    ``max_keep_size`` pixels, those clusters are removed from the mask.

    Args:
        s: Slide state containing the working tissue mask.
        params: Operation configuration options:

            - ``fat_cell_size`` (int): Largest hole, in pixels, treated as a fat
              cell. Defaults to 64; the example configuration sets this to 64.
            - ``kernel_size`` (int): Side length of the square used to dilate the
              holes. Defaults to 3; the example configuration sets this to 10.
            - ``max_keep_size`` (int): Dilated clusters larger than this many pixels
              are removed. Defaults to 1000; the example configuration sets this to
              1000.
            - ``mask_statistics`` (str): Statistics mode for the remaining mask.
              Defaults to the slide-wide setting.

    Returns:
        None.
    """
    logging.info(f"{s['filename']} - \tremoveFatlikeTissue")
    fat_cell_size = int(params.get("fat_cell_size", 64))
    kernel_size = int(params.get("kernel_size", 3))
    max_keep_size = int(params.get("max_keep_size", 1000))

    img_reduced = morphology.remove_small_holes(s["img_mask_use"], area_threshold=fat_cell_size)
    img_small = img_reduced & np.invert(s["img_mask_use"])
    img_small = ~morphology.remove_small_holes(~img_small, area_threshold=9)

    mask_dilate = morphology.dilation(img_small, selem=np.ones((kernel_size, kernel_size)))
    mask_dilate_removed = remove_large_objects(mask_dilate, max_keep_size)

    mask_fat = mask_dilate & ~mask_dilate_removed

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_fatlike.png", img_as_ubyte(mask_fat))
    s["img_mask_fatlike"] = (mask_fat * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = prev_mask & ~mask_fat

    # rps = measure.regionprops(morphology.label(mask_fat))
    # if rps:
    #     areas = np.asarray([rp.area for rp in rps])
    #     nobj = len(rps)
    #     area_max = areas.max()
    #     area_mean = areas.mean()
    # else:
    #     nobj = area_max = area_mean = 0
    stats = getMaskRegionsStats(mask_fat)

    # s.addToPrintList("fatlike_tissue_removed_num_regions", str(nobj))
    # s.addToPrintList("fatlike_tissue_removed_mean_area", str(area_mean))
    # s.addToPrintList("fatlike_tissue_removed_max_area", str(area_max))
    s.addToPrintList("fatlike_tissue_removed_num_regions", str(stats.get('num',0)))
    s.addToPrintList("fatlike_tissue_removed_mean_area", str(stats.get('area_mean',0)))
    s.addToPrintList("fatlike_tissue_removed_max_area", str(stats.get('area_max',0)))



    s.addToPrintList("fatlike_tissue_removed_percent",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After MorphologyModule.removeFatlikeTissue: NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After MorphologyModule.removeFatlikeTissue: NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")


def fillSmallHoles(s, params):
    """Fill small and medium holes in the image mask, such as lumen spaces in tubules.

    TSV columns:
      - ``small_tissue_filled_percent``: Change in the tissue mask from this step
        under ``mask_statistics`` (see :mod:`histoqc.BasicModule`). Filling holes
        adds pixels, so under the default ``relative2mask`` the value is negative.
      - ``small_tissue_filled_num_regions``: Number of connected regions filled (0 if none).
      - ``small_tissue_filled_mean_area``: Mean area of those regions, in pixels at
        ``image_work_size``.
      - ``small_tissue_filled_max_area``: Area of the largest of those regions.

    Args:
        s: Slide state containing the working tissue mask.
        params: Operation configuration options:

            - ``min_size`` (int): Maximum hole area to fill. Defaults to 64 pixels;
              the example configuration sets this to 1000.
            - ``mask_statistics`` (str): Statistics mode used for the filled-mask
              percentage. Defaults to the slide-wide setting, which is
              ``relative2mask`` in the example configuration.

    Returns:
        None.
    """
    logging.info(f"{s['filename']} - \tfillSmallHoles")
    min_size = int(params.get("min_size", 64))
    img_reduced = morphology.remove_small_holes(s["img_mask_use"], area_threshold=min_size)
    img_small = img_reduced & np.invert(s["img_mask_use"])


    io.imsave(s["outdir"] + os.sep + s["filename"] + "_small_fill.png", img_as_ubyte(img_small))
    s["img_mask_small_removed"] = (img_small * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = img_reduced

    # rps = measure.regionprops(morphology.label(img_small))
    # if rps:
    #     areas = np.asarray([rp.area for rp in rps])
    #     nobj = len(rps)
    #     area_max = areas.max()
    #     area_mean = areas.mean()
    # else:
    #     nobj = area_max = area_mean = 0
    stats = getMaskRegionsStats(img_small)

    # s.addToPrintList("small_tissue_filled_num_regions", str(nobj))
    # s.addToPrintList("small_tissue_filled_mean_area", str(area_mean))
    # s.addToPrintList("small_tissue_filled_max_area", str(area_max))
    s.addToPrintList("small_tissue_filled_num_regions", str(stats.get('num', 0)))
    s.addToPrintList("small_tissue_filled_mean_area", str(stats.get('area_mean', 0)))
    s.addToPrintList("small_tissue_filled_max_area", str(stats.get('area_max', 0)))

    s.addToPrintList("small_tissue_filled_percent",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After MorphologyModule.fillSmallHoles: NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After MorphologyModule.fillSmallHoles: NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")
    return
