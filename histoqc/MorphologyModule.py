import logging
import os
import numpy as np
from histoqc.BaseImage import printMaskHelper, BaseImage
from histoqc.array_adapter import ArrayAdapter
from histoqc.array_adapter.typing import TYPE_ARRAY
from skimage import morphology, measure
from skimage.util import img_as_ubyte


def removeSmallObjects(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tremoveSmallObjects")
    adapter = s.image_handle.adapter
    min_size = int(params.get("min_size", 64))
    img_reduced = adapter(morphology.remove_small_objects)(s["img_mask_use"], min_size=min_size)
    img_small = adapter.and_(~img_reduced, s["img_mask_use"])

    fname = os.path.join(s["outdir"], f"{s['filename']}_small_remove.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(img_small))
    s["img_mask_small_filled"] = (img_small * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = img_reduced
    label_small = adapter(morphology.label)(img_small)
    rps = adapter(measure.regionprops)(label_small)
    if rps:
        areas = np.asarray([float(rp.area) for rp in rps])
        nobj = len(rps)
        area_max = areas.max()
        area_mean = areas.mean()
    else:
        nobj = area_max = area_mean = 0

    s.addToPrintList("small_tissue_removed_num_regions", str(nobj))
    s.addToPrintList("small_tissue_removed_mean_area", str(area_mean))
    s.addToPrintList("small_tissue_removed_max_area", str(area_max))

    s.addToPrintList("small_tissue_removed_percent",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After MorphologyModule.removeSmallObjects: NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After MorphologyModule.removeSmallObjects: NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")
    return


def remove_large_objects(img: TYPE_ARRAY, max_size: int, adapter: ArrayAdapter):
    # code taken from morphology.remove_small_holes, except switched < with >
    # selem = adapter(ndi.generate_binary_structure)(img.ndim, connectivity=1)
    # equivalent to ndi.label in binary case.
    img = adapter.sync(img)
    ccs = adapter(measure.label)(img, connectivity=1)
    component_sizes: TYPE_ARRAY = adapter.sync(np.bincount(ccs.ravel()))
    too_big: TYPE_ARRAY = component_sizes > max_size
    too_big_mask = too_big[ccs]
    img_out = img.copy()
    img_out[too_big_mask] = 0
    return img_out


def removeFatlikeTissue(s, params):
    logging.info(f"{s['filename']} - \tremoveFatlikeTissue")
    adapter = s.image_handle.adapter
    fat_cell_size = int(params.get("fat_cell_size", 64))
    kernel_size = int(params.get("kernel_size", 3))
    max_keep_size = int(params.get("max_keep_size", 1000))

    img_reduced = adapter(morphology.remove_small_holes)(s["img_mask_use"], area_threshold=fat_cell_size)
    img_small = adapter.and_(img_reduced, ~s["img_mask_use"])
    img_small = ~adapter(morphology.remove_small_holes)(~img_small, area_threshold=9)
    # binary
    mask_dilate = adapter(morphology.dilation)(img_small, footprint=np.ones((kernel_size, kernel_size)))

    mask_dilate_removed = remove_large_objects(mask_dilate, max_size=max_keep_size, adapter=adapter)

    mask_fat = adapter.and_(mask_dilate, ~mask_dilate_removed)

    fname = os.path.join(s["outdir"], f"{s['filename']}_fatlike.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(mask_fat))
    s["img_mask_fatlike"] = (mask_fat * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = adapter.and_(prev_mask, ~mask_fat)

    label_fat = adapter(morphology.label)(mask_fat)
    rps = adapter(measure.regionprops)(label_fat)
    if rps:
        areas = np.asarray([float(rp.area) for rp in rps])
        nobj = len(rps)
        area_max = areas.max()
        area_mean = areas.mean()
    else:
        nobj = area_max = area_mean = 0
    s.addToPrintList("fatlike_tissue_removed_num_regions", str(nobj))
    s.addToPrintList("fatlike_tissue_removed_mean_area", str(area_mean))
    s.addToPrintList("fatlike_tissue_removed_max_area", str(area_max))

    s.addToPrintList("fatlike_tissue_removed_percent",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After MorphologyModule.removeFatlikeTissue: NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After MorphologyModule.removeFatlikeTissue: NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")
    return


def fillSmallHoles(s, params):
    logging.info(f"{s['filename']} - \tfillSmallHoles")
    adapter = s.image_handle.adapter
    min_size = int(params.get("min_size", 64))
    img_reduced = adapter(morphology.remove_small_holes)(s["img_mask_use"], area_threshold=min_size)
    img_small = adapter.and_(img_reduced, np.invert(s["img_mask_use"]))

    fname = os.path.join(s["outdir"], f"{s['filename']}_small_fill.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(img_small))
    s["img_mask_small_removed"] = (img_small * 255) > 0

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = img_reduced

    label_small = adapter(morphology.label)(img_small)
    rps = adapter(measure.regionprops)(label_small)
    if rps:
        areas = np.asarray([float(rp.area) for rp in rps])
        nobj = len(rps)
        area_max = areas.max()
        area_mean = areas.mean()
    else:
        nobj = area_max = area_mean = 0

    s.addToPrintList("small_tissue_filled_num_regions", str(nobj))
    s.addToPrintList("small_tissue_filled_mean_area", str(area_mean))
    s.addToPrintList("small_tissue_filled_max_area", str(area_max))

    s.addToPrintList("small_tissue_filled_percent",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After MorphologyModule.fillSmallHoles: NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After MorphologyModule.fillSmallHoles: NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")
    return
