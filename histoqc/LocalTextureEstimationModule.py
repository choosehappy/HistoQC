"""Estimation of local image texture features."""
import logging
import numpy as np
from skimage import  color
from distutils.util import strtobool
from skimage.feature import graycomatrix, graycoprops
import matplotlib.pyplot as plt



def estimateGreyComatrixFeatures(s, params):
    """Estimate grey-level co-occurrence matrix features for selected image regions.

    Args:
        s: Slide state containing the image, masks, and optional random seed.
        params: Operation configuration options:

            - ``prefix`` (str): Optional prefix for output metric names. The example configuration
              uses ``background`` and ``final``.
            - ``patch_size`` (int): Side length of each sampled patch. Defaults to
              32; the example configuration sets this to 32.
            - ``npatches`` (int): Number of patches to sample. Defaults to 100;
              the example configuration uses 1000.
            - ``nlevels`` (int): Number of gray levels for quantization. Defaults to
              8; the example configuration sets this to 8.
            - ``feats`` (str): Colon-separated gray-comatrix properties to record.
              Defaults to ``contrast:dissimilarity:homogeneity:ASM:energy:correlation``;
              the example configuration uses the same properties.
            - ``invert`` (bool): Whether to sample outside the selected mask.
              Defaults to ``False``; the example configuration enables this for background
              and disables it for final-image measurements.
            - ``mask_name`` (str): State key of the mask to sample. Defaults to
              ``img_mask_use``; the example configuration uses this value.

    Returns:
        None.
    """
    prefix = params.get("prefix", None)
    prefix = prefix+"_" if prefix else ""

    logging.info(f"{s['filename']} - \tLocalTextureEstimationModule.estimateGreyComatrixFeatures:{prefix}")
    patch_size = int(params.get("patch_size", 32))
    npatches = int(params.get("npatches", 100))
    nlevels = int(params.get("nlevels", 8))
    feats = params.get("feats","contrast:dissimilarity:homogeneity:ASM:energy:correlation").split(':')
    invert = strtobool(params.get("invert", "False"))
    mask_name = params.get("mask_name","img_mask_use")

    # set seed to random function if seed is not None
    if s["seed"] is not None:
        np.random.seed(int(s["seed"]))

    img = s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)

    mask = s[mask_name] if not invert else ~s[mask_name]
    if len(mask.nonzero()[0]) == 0:  # add warning in case the no tissus detected in mask
        msg = f"LocalTextureEstimationModule.estimateGreyComatrixFeatures:{prefix} Can not estimate the empty mask since NO tissue remains detectable in mask, defaulting to -100"
        logging.warning(f"{s['filename']} - {msg}")
        s["warnings"].append(msg)
        # write placeholders so this slide's row keeps the same columns as the others (#337)
        for feat in feats:
            s.addToPrintList(f"{prefix}{feat}", str(-100))
            s.addToPrintList(f"{prefix}{feat}_std", str(-100))
        return

    maskidx = mask.nonzero()
    maskidx = np.asarray(maskidx).transpose()
    idx = np.random.choice(maskidx.shape[0], npatches)

    results = []

    for id in idx:
        r, c = maskidx[id, :]
        patch = img[r:r + patch_size, c:c + patch_size]
        glcm = graycomatrix(np.digitize(patch,np.linspace(0,1,num=nlevels),right=True), distances=[5],
                            angles=[0], levels=nlevels, symmetric=True, normed=True)

        results.append([graycoprops(glcm, prop=feat) for feat in feats])

    results = np.asarray(results).squeeze()

    for vals, feat in zip(results.transpose(), feats):
        s.addToPrintList(f"{prefix}{feat}", str(vals.mean()))
        s.addToPrintList(f"{prefix}{feat}_std", str(vals.std()))

    return
