import logging
import numpy as np
from skimage.filters import sobel
from skimage.color import convert_colorspace, rgb2gray
from distutils.util import strtobool
from histoqc.BaseImage import BaseImage
from histoqc.array_adapter.typing import TYPE_ARRAY

_EPS = np.finfo(np.float32).eps


def _rms(img: TYPE_ARRAY) -> float:
    """Root Mean Square contrast for non-empty masked images
    Args:
        img: Input image or a vector yielded from masked image. Not Tissue-less
    Returns:

    """
    assert img.size > 0
    err = (img - img.mean()) ** 2
    return float(np.sqrt(err.sum() / img.size))


def _michelson(img: TYPE_ARRAY) -> float:
    """Helper function for non-empty masked input
    Args:
        img:
    Returns:

    """
    assert img.size > 0
    max_img = img.max()
    min_img = img.min()
    # add eps to avoid nan when max and min are both 0.
    denominator = max_img + min_img
    denominator = denominator if denominator != 0 else denominator + _EPS
    return float((max_img - min_img) / denominator)


def _tenengrad_from_sobel2(sobel_img2: TYPE_ARRAY):
    return np.sqrt(sobel_img2.sum()) / sobel_img2.size


def getBrightnessGray(s: BaseImage, params):
    adapter = s.image_handle.adapter
    prefix = params.get("prefix", None)
    prefix = prefix+"_" if prefix else ""
    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")

    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))
    invert = strtobool(params.get("invert", "False"))
    mask_name = params.get("mask_name", "img_mask_use")

    img = s.getImgThumb(s["image_work_size"])

    img_g = adapter(rgb2gray)(img)
    if limit_to_mask:

        mask = s[mask_name] if not invert else ~s[mask_name]
        mask = adapter.sync(mask)
        img_g = img_g[mask]
        if img_g.size == 0:
            img_g = np.array(-100)

    s.addToPrintList(f"{prefix}grayscale_brightness", str(img_g.mean()))
    s.addToPrintList(f"{prefix}grayscale_brightness_std", str(img_g.std()))

    return


def getBrightnessByChannelinColorSpace(s: BaseImage, params):
    adapter = s.image_handle.adapter
    prefix = params.get("prefix", None)
    prefix = prefix + "_" if prefix else ""

    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")

    to_color_space = params.get("to_color_space", "RGB")
    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))
    mask_name = params.get("mask_name", "img_mask_use")

    invert = strtobool(params.get("invert", "False"))

    img = s.getImgThumb(s["image_work_size"])

    suffix = ""
    if to_color_space != "RGB":
        img = adapter(convert_colorspace)(img, fromspace="RGB", tospace=to_color_space)
        suffix = "_" + to_color_space

    for chan in range(0, 3):
        vals = img[:, :, chan]
        if limit_to_mask:

            mask = s[mask_name] if not invert else ~s[mask_name]
            mask = adapter.sync(mask)
            vals = vals[mask]

            if vals.size == 0:
                vals = np.array(-100)

        s.addToPrintList(f"{prefix}chan{chan+1}_brightness{suffix}", str(vals.mean()))
        s.addToPrintList(f"{prefix}chan{chan+1}_brightness_std{suffix}", str(vals.std()))

    return


def getContrast(s: BaseImage, params):
    adapter = s.image_handle.adapter
    prefix = params.get("prefix", None)
    prefix = prefix + "_" if prefix else ""

    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    mask_name = params.get("mask_name", "img_mask_use")

    invert = strtobool(params.get("invert", "False"))

    img = s.getImgThumb(s["image_work_size"])
    img = adapter(rgb2gray)(img)
    # noinspection PyTypeChecker
    sobel_img2 = adapter(sobel)(img) ** 2

    mask = None
    if limit_to_mask:

        mask = s[mask_name] if not invert else ~s[mask_name]
        img, sobel_img2, mask = adapter.device_sync_all(img, sobel_img2, mask)
        sobel_img2 = sobel_img2[mask]
        img = img[s["img_mask_use"]]

    if img.size == 0:  # need a check to ensure that mask wasn't empty AND limit_to_mask is true, still want to
        # produce metrics for completeness with warning

        s.addToPrintList(f"{prefix}tenen_grad_contrast", str(-100))
        s.addToPrintList(f"{prefix}michelson_contrast", str(-100))
        s.addToPrintList(f"{prefix}rms_contrast", str(-100))

        logging.warning(f"{s['filename']} - After BrightContrastModule.getContrast: NO tissue "
                        f"detected, statistics are impossible to compute, defaulting to -100 !")
        s["warnings"].append(f"After BrightContrastModule.getContrast: NO tissue remains "
                             f"detected, statistics are impossible to compute, defaulting to -100 !")

        return

    # tenenGrad - Note this must be performed on full image and then subsetted if limiting to mask

    # np.sqrt(sobel_img2.sum()) / sobel_img2.size
    # np.sqrt(np.sum(sobel_img)) / img.size
    tenen_grad_contrast = _tenengrad_from_sobel2(sobel_img2=sobel_img2)

    s.addToPrintList(f"{prefix}tenen_grad_contrast", str(tenen_grad_contrast))

    # Michelson contrast
    contrast = _michelson(img)
    s.addToPrintList(f"{prefix}michelson_contrast", str(contrast))

    # RMS contrast
    rms_contrast = _rms(img)
    s.addToPrintList(f"{prefix}rms_contrast", str(rms_contrast))
    return
