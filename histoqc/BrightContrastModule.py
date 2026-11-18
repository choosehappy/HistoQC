"""Brightness and contrast metrics for slide images."""
import logging
import numpy as np
from skimage.filters import sobel
from skimage.color import convert_colorspace, rgb2gray
from distutils.util import strtobool


def getBrightnessGray(s, params):
    """Compute mean and standard deviation of grayscale brightness.

    TSV columns:
      - ``grayscale_brightness``: Mean grayscale (scikit-image ``rgb2gray``, 0 to 1)
        of the selected pixels.
      - ``grayscale_brightness_std``: Standard deviation of the same pixels.

    With ``prefix`` set, names start with ``<prefix>_`` (the example configuration
    writes ``background_grayscale_brightness`` and
    ``background_grayscale_brightness_std``). If the selected mask is empty the mean
    is ``-100`` and the standard deviation 0.

    Args:
        s: Slide state containing the image and masks.
        params: Operation configuration options:

            - ``prefix`` (str): Optional prefix for output metric names. The example configuration
              uses ``background`` for background metrics.
            - ``limit_to_mask`` (bool): Whether to measure pixels from a mask.
              Defaults to ``True``; the example configuration sets this to ``True``.
            - ``invert`` (bool): Whether to use the inverse of the selected mask.
              Defaults to ``False``; the example configuration enables it for background
              measurements.
            - ``mask_name`` (str): State key of the mask to use. Defaults to
              ``img_mask_use``; the example configuration uses this for background
              measurements.

    Returns:
        None.
    """
    prefix = params.get("prefix", None)
    prefix = prefix+"_" if prefix else ""
    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")

    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))
    invert = strtobool(params.get("invert", "False"))
    mask_name = params.get("mask_name", "img_mask_use")

    img = s.getImgThumb(s["image_work_size"])

    img_g = rgb2gray(img)
    if limit_to_mask:

        mask = s[mask_name] if not invert else ~s[mask_name]

        img_g = img_g[mask]
        if img_g.size == 0:
            img_g = np.array(-100)

    s.addToPrintList(f"{prefix}grayscale_brightness", str(img_g.mean()))
    s.addToPrintList(f"{prefix}grayscale_brightness_std", str(img_g.std()))

    return


def getBrightnessByChannelinColorSpace(s, params):
    """Compute brightness mean and standard deviation for each color channel.

    TSV columns:
      - ``chan1_brightness``, ``chan2_brightness``, ``chan3_brightness``: Mean of
        each channel of the selected pixels (R, G, B, 0 to 255).
      - ``chan1_brightness_std``, ``chan2_brightness_std``, ``chan3_brightness_std``:
        Standard deviation of each channel.

    With ``to_color_space`` other than RGB, names end in ``_<space>``: for YUV,
    ``chan1_brightness_YUV``, ``chan2_brightness_YUV``, ``chan3_brightness_YUV``,
    ``chan1_brightness_std_YUV``, ``chan2_brightness_std_YUV`` and
    ``chan3_brightness_std_YUV``, computed by scikit-image ``convert_colorspace``
    on the image scaled to 0 to 1 (chan1 = Y, 0 to 1; chan2 = U and chan3 = V,
    signed). With ``prefix`` set, names start with ``<prefix>_``; the example
    configuration's ``RGB_background`` section sets ``prefix`` to ``background`` and
    writes ``background_chan1_brightness``, ``background_chan2_brightness``,
    ``background_chan3_brightness``, ``background_chan1_brightness_std``,
    ``background_chan2_brightness_std`` and ``background_chan3_brightness_std``.
    If the selected mask is empty the means are ``-100`` and the standard deviations 0.

    Args:
        s: Slide state containing the image and masks.
        params: Operation configuration options:

            - ``prefix`` (str): Optional prefix for output metric names. The example configuration
              uses ``background`` for background metrics.
            - ``to_color_space`` (str): Color space used for the channel metrics.
              Defaults to ``RGB``; the example configuration also uses ``YUV``.
            - ``limit_to_mask`` (bool): Whether to measure pixels from a mask.
              Defaults to ``True``; the example configuration sets this to ``True``.
            - ``mask_name`` (str): State key of the mask to use. Defaults to
              ``img_mask_use``.
            - ``invert`` (bool): Whether to use the inverse of the selected mask.
              Defaults to ``False``; the example configuration enables it for background
              measurements.

    Returns:
        None.
    """
    prefix = params.get("prefix", None)
    prefix = prefix + "_" if prefix else ""

    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")

    to_color_space = params.get("to_color_space", "RGB")
    limit_to_mask = strtobool(params.get("limit_to_mask", "True"))
    mask_name = params.get("mask_name", "img_mask_use")

    invert = strtobool(params.get("invert", "False"))


    img = s.getImgThumb(s["image_work_size"])

    suffix = ""
    if (to_color_space != "RGB"):
        img = convert_colorspace(img, "RGB", to_color_space)
        suffix = "_" + to_color_space

    for chan in range(0, 3):
        vals = img[:, :, chan]
        if (limit_to_mask):

            mask = s[mask_name] if not invert else ~s[mask_name]
            vals = vals[mask]

            if vals.size == 0:
                vals = np.array(-100)

        s.addToPrintList(f"{prefix}chan{chan+1}_brightness{suffix}", str(vals.mean()))
        s.addToPrintList(f"{prefix}chan{chan+1}_brightness_std{suffix}", str(vals.std()))

    return


def getContrast(s, params):
    """Compute Tenengrad, Michelson, and RMS contrast metrics.

    TSV columns:
      - ``tenenGrad_contrast``: Square root of the summed squared Sobel gradient of
        grayscale over the selected pixels, divided by N, the number of tissue-mask
        pixels (all pixels when ``limit_to_mask`` is false). It therefore scales
        with 1/sqrt(N): a slide with four times the tissue and the same texture
        reads half as high.
      - ``michelson_contrast``: (max - min) / (max + min) of grayscale, so it is set
        by the two most extreme pixels.
      - ``rms_contrast``: Population standard deviation of grayscale; equal to
        ``grayscale_brightness_std`` when both use the tissue mask.

    With ``prefix`` set, names start with ``<prefix>_`` (``background_tenenGrad_contrast``,
    ``background_michelson_contrast``, ``background_rms_contrast`` in the example
    configuration). When ``limit_to_mask`` is true, only the Sobel image is taken from
    the configured (optionally inverted) mask; grayscale is always taken from the
    tissue mask ``img_mask_use``. So ``background_michelson_contrast`` and
    ``background_rms_contrast`` describe tissue pixels, and
    ``background_tenenGrad_contrast`` divides background gradients by the tissue
    pixel count. All three are ``-100`` when the tissue mask is empty.

    Args:
        s: Slide state containing the image and masks.
        params: Operation configuration options:

            - ``prefix`` (str): Optional prefix for output metric names. The example configuration
              uses ``background`` for background metrics.
            - ``limit_to_mask`` (bool): Whether to measure pixels from a mask.
              Defaults to ``True``; the example configuration sets this to ``True``.
            - ``mask_name`` (str): State key of the mask to use. Defaults to
              ``img_mask_use``.
            - ``invert`` (bool): Whether to use the inverse of the selected mask.
              Defaults to ``False``; the example configuration enables it for background
              measurements.

    Returns:
        None.
    """
    prefix = params.get("prefix", None)
    prefix = prefix + "_" if prefix else ""

    logging.info(f"{s['filename']} - \tgetContrast:{prefix}")
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    mask_name = params.get("mask_name", "img_mask_use")

    invert = strtobool(params.get("invert", "False"))


    img = s.getImgThumb(s["image_work_size"])
    img = rgb2gray(img)

    sobel_img = sobel(img) ** 2

    if limit_to_mask:

        mask = s[mask_name] if not invert else ~s[mask_name]

        sobel_img = sobel_img[mask]
        img = img[s["img_mask_use"]]

    if img.size == 0: # need a check to ensure that mask wasn't empty AND limit_to_mask is true, still want to
                      # produce metrics for completeness with warning

        s.addToPrintList(f"{prefix}tenenGrad_contrast", str(-100))
        s.addToPrintList(f"{prefix}michelson_contrast", str(-100))
        s.addToPrintList(f"{prefix}rms_contrast", str(-100))


        logging.warning(f"{s['filename']} - After BrightContrastModule.getContrast: NO tissue "
                        f"detected, statistics are impossible to compute, defaulting to -100 !")
        s["warnings"].append(f"After BrightContrastModule.getContrast: NO tissue remains "
                             f"detected, statistics are impossible to compute, defaulting to -100 !")

        return


    # tenenGrad - Note this must be performed on full image and then subsetted if limiting to mask
    tenenGrad_contrast = np.sqrt(np.sum(sobel_img)) / img.size
    s.addToPrintList(f"{prefix}tenenGrad_contrast", str(tenenGrad_contrast))

    # Michelson contrast
    max_img = img.max()
    min_img = img.min()
    contrast = (max_img - min_img) / (max_img + min_img)
    s.addToPrintList(f"{prefix}michelson_contrast", str(contrast))

    # RMS contrast
    rms_contrast = np.sqrt(pow(img - img.mean(), 2).sum() / img.size)
    s.addToPrintList(f"{prefix}rms_contrast", str(rms_contrast))

    return
