import logging
import numpy as np
from skimage.filters import sobel
from skimage.color import convert_colorspace, rgb2gray
from distutils.util import strtobool


def getBrightnessGray(s, params):
    logging.info(f"{s['filename']} - \tgetContrast")
    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))

    img = s.getImgThumb(s["image_work_size"])

    img_g = rgb2gray(img)
    if (limit_to_mask):
        img_g = img_g[s["img_mask_use"]]
        if img_g.size == 0:
            img_g = np.array(-100)

    s.addToPrintList("grayscale_brightness", str(img_g.mean()))
    s.addToPrintList("grayscale_brightness_std", str(img_g.std()))

    return


def getBrightnessByChannelinColorSpace(s, params):
    logging.info(f"{s['filename']} - \tgetContrast")
    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))
    to_color_space = params.get("to_color_space", "RGB")
    img = s.getImgThumb(s["image_work_size"])

    suffix = ""
    if (to_color_space != "RGB"):
        img = convert_colorspace(img, "RGB", to_color_space)
        suffix = "_" + to_color_space

    for chan in range(0, 3):
        vals = img[:, :, chan]
        if (limit_to_mask):
            vals = vals[s["img_mask_use"]]
            if vals.size == 0:
                vals = np.array(-100)

        s.addToPrintList(("chan%d_brightness" + suffix) % (chan + 1), str(vals.mean()))
        s.addToPrintList(("chan%d_brightness_std" + suffix) % (chan + 1), str(vals.std()))

    return


def getContrast(s, params):
    logging.info(f"{s['filename']} - \tgetContrast")
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    img = s.getImgThumb(s["image_work_size"])
    img = rgb2gray(img)

    sobel_img = sobel(img) ** 2

    if limit_to_mask:
        sobel_img = sobel_img[s["img_mask_use"]]
        img = img[s["img_mask_use"]]

    if img.size == 0: # need a check to ensure that mask wasn't empty AND limit_to_mask is true, still want to
                      # produce metrics for completeness with warning

        s.addToPrintList("tenenGrad_contrast", str(-100))
        s.addToPrintList("michelson_contrast", str(-100))
        s.addToPrintList("rms_contrast", str(-100))


        logging.warning(f"{s['filename']} - After BrightContrastModule.getContrast: NO tissue "
                        f"detected, statistics are impossible to compute, defaulting to -100 !")
        s["warnings"].append(f"After BrightContrastModule.getContrast: NO tissue remains "
                             f"detected, statistics are impossible to compute, defaulting to -100 !")

        return


    # tenenGrad - Note this must be performed on full image and then subsetted if limiting to mask
    tenenGrad_contrast = np.sqrt(np.sum(sobel_img)) / img.size
    s.addToPrintList("tenenGrad_contrast", str(tenenGrad_contrast))

    # Michelson contrast
    max_img = img.max()
    min_img = img.min()
    contrast = (max_img - min_img) / (max_img + min_img)
    s.addToPrintList("michelson_contrast", str(contrast))

    # RMS contrast
    rms_contrast = np.sqrt(pow(img - img.mean(), 2).sum() / img.size)
    s.addToPrintList("rms_contrast", str(rms_contrast))

    return
