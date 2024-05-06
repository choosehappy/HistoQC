import logging
import os
import numpy as np
from skimage import io
import matplotlib.pyplot as plt
from distutils.util import strtobool
from histoqc.BaseImage import BaseImage
from typing import Union
from histoqc.array_adapter import ArrayAdapter, Device
from histoqc.array_adapter.typing import TYPE_ARRAY
# todo: beware that because there is no lock, it is likely that each worker will compute the template of their own.
# this holds a local copy of the histograms of the template images so that they need only be computed once
global_holder = {}


def getHistogram(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tgetHistogram")
    # adapter = s.image_handle.adapter
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    bins = int(params.get("bins", 20))

    img = s.getImgThumb(s["image_work_size"])
    tissue_mask = s["img_mask_use"]
    # matplotlib --> pointless to use GPU here even if a corresponding API exists
    img, tissue_mask = ArrayAdapter.curate_arrays_device(img, tissue_mask,
                                                         device=Device.build(Device.DEVICE_CPU))
    # tissue_mask = adapter.move_to_device(tissue_mask, ArrayDevice.CPU)
    if limit_to_mask:
        img = img[tissue_mask]
    else:
        img = img.reshape(-1, 3)

    ax = plt.axes()
    ax.hist(img, bins=bins, density=True, range=(0, 255), histtype='step', color=("r", "g", "b"))

    ax.grid(True)
    ax.set_title('Color Distribution for ' + s["filename"])
    ax.set_xlabel('Pixel Val')
    ax.set_ylabel('Density')
    fname = os.path.join(s["outdir"], f"{s['filename']}_hist.png")
    plt.savefig(fname)
    plt.close()
    return


def computeHistogram(img: TYPE_ARRAY, bins: int,
                     adapter: ArrayAdapter, mask: Union[TYPE_ARRAY, int] = -1) -> TYPE_ARRAY:
    result = np.zeros(shape=(bins, 3))
    img, mask = adapter.device_sync_all(img, mask)
    result = adapter.sync(result)
    for chan in range(0, 3):
        vals = img[:, :, chan].flatten()
        if ArrayAdapter.is_array(mask):

            vals = vals[mask.flatten()]

        result[:, chan] = np.histogram(vals, bins=bins, density=True, range=(0, 255))[0]
    return result


def compareToTemplates(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tcompareToTemplates")
    adapter = s.image_handle.adapter
    bins = int(params.get("bins", 20))
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    # if the histograms haven't already been computed, compute and store them now
    if not global_holder.get("templates", False):
        templates = {}
        for template in params["templates"].splitlines():
            templates[os.path.splitext(os.path.basename(template))[0]] = computeHistogram(io.imread(template),
                                                                                          bins, adapter)
            # compute each of their histograms
        global_holder["templates"] = templates

    img = s.getImgThumb(s["image_work_size"])

    if limit_to_mask:
        mask = s["img_mask_use"]
        if len(mask.nonzero()[0]) == 0:

            logging.warning(f"{s['filename']} - HistogramModule.compareToTemplates NO tissue "
                            f"remains detectable in mask!")
            s["warnings"].append(f"HistogramModule.compareToTemplates NO tissue "
                                 f"remains detectable in mask!")

            imghst = np.zeros((bins, 3))

        else:
            imghst = computeHistogram(img, bins, adapter, mask)
    else:
        imghst = computeHistogram(img, bins, adapter)

    for template in global_holder["templates"]:
        hist_diff = adapter.sub(global_holder["templates"][template], imghst)
        val = (abs(hist_diff) ** 2).sum()
        s.addToPrintList(template + "_MSE_hist", str(val))
    return
