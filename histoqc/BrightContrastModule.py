import logging
import numpy as np
from skimage.filters import sobel
from skimage.color import rgb2gray
from distutils.util import strtobool
from histoqc.functional import bright_contrast, utilities
from histoqc.functional.bright_contrast import CONTRAST_NAME_RMS, CONTRAST_NAME_MICHELSON, CONTRAST_NAME_TENENGRAD
from typing import Union, Dict


def getBrightnessGray(s, params):
    prefix = params.get("prefix", None)
    prefix = prefix+"_" if prefix else ""
    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")

    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))
    invert = strtobool(params.get("invert", "False"))
    mask_name = params.get("mask_name", "img_mask_use")

    img = s.getImgThumb(s["image_work_size"])

    mask_to_use: Union[np.ndarray, None] = utilities.working_mask(s[mask_name], invert=invert,
                                                                  limit_to_mask=limit_to_mask)
    mean_intensity, std_intensity = bright_contrast.brightness_gray(img, mask_to_use)

    s.addToPrintList(f"{prefix}grayscale_brightness", str(mean_intensity))
    s.addToPrintList(f"{prefix}grayscale_brightness_std", str(std_intensity))

    return


def getBrightnessByChannelinColorSpace(s, params):
    prefix = params.get("prefix", None)
    prefix = prefix + "_" if prefix else ""

    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")

    to_color_space = params.get("to_color_space", "RGB")
    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))
    mask_name = params.get("mask_name", "img_mask_use")

    invert = strtobool(params.get("invert", "False"))

    img = s.getImgThumb(s["image_work_size"])
    # todo refactor
    mask_to_use: Union[np.ndarray, None] = utilities.working_mask(s[mask_name], invert=invert,
                                                                  limit_to_mask=limit_to_mask)
    suffix = "_" + to_color_space
    mean_val, std_val = bright_contrast.brightness_by_channel_in_color_space(img, mask_to_use, to_color_space)

    for chan in range(0, 3):
        s.addToPrintList(f"{prefix}chan{chan+1}_brightness{suffix}", str(mean_val[chan]))
        s.addToPrintList(f"{prefix}chan{chan+1}_brightness_std{suffix}", str(std_val[chan]))

    return


def getContrast(s, params):
    prefix = params.get("prefix", None)
    prefix = prefix + "_" if prefix else ""

    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    mask_name = params.get("mask_name", "img_mask_use")

    invert = strtobool(params.get("invert", "False"))

    img = s.getImgThumb(s["image_work_size"])
    mask_to_use: Union[np.ndarray, None] = utilities.working_mask(s[mask_name], invert=invert,
                                                                  limit_to_mask=limit_to_mask)
    img = rgb2gray(img)

    # why not simpy using nan to replace any default value + warning? tbh even impossible values as default values may
    # not be the best idea here. You slip just a little bit in other methods that might use such values for arithmetics,
    # it may give you "valid" numeric values but in fact the whole procedure turns nonsense,
    # and it is hard to spot it out.

    # defined the working mask to use but there are no positive pixels left
    if mask_to_use is not None and not mask_to_use.any():

        logging.warning(f"{s['filename']} - After BrightContrastModule.getContrast: NO tissue "
                        f"detected, statistics are impossible to compute, defaulting to -100 !")
        s["warnings"].append(f"After BrightContrastModule.getContrast: NO tissue remains "
                             f"detected, statistics are impossible to compute, defaulting to -100 !")

    all_contrasts: Dict[str, float] = bright_contrast.contrast_stats(img, mask_to_use)
    for contrast_name, contrast_value in all_contrasts.items():
        s.addToPrintList(f"{prefix}{contrast_name}", str(contrast_value))
    return
