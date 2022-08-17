import skimage
from skimage import morphology, measure
from skimage.color import rgb2gray
from skimage.filters import rank
import numpy as np
from typing import Tuple, List


# Analysis of focus measure operators for shape-from-focus
# Said Pertuza,, Domenec Puiga, Miguel Angel Garciab, 2012
# https://pdfs.semanticscholar.org/8c67/5bf5b542b98bf81dcf70bd869ab52ab8aae9.pdf
def blur_in_img(img: np.ndarray, blur_radius: float, blur_threshold: float):
    """Analysis of focus measure operators for shape-from-focus
    Said Pertuza,, Domenec Puiga, Miguel Angel Garciab, 2012
    https://pdfs.semanticscholar.org/8c67/5bf5b542b98bf81dcf70bd869ab52ab8aae9.pdf
    Args:
        img: Working image. Ideally using the low mag thumbnails of the slides.
        blur_radius: Radius computed from the the Gaussian kernel. Smaller radius (also smaller sigma / kernel size)
            leads to more sensitive detection since sharper
        blur_threshold: Threshold any pixels with lower intensity in the filtered image as the blurred region.

    Returns:

    """
    img = rgb2gray(img)
    img_laplace = np.abs(skimage.filters.laplace(img))
    mask = skimage.filters.gaussian(img_laplace, sigma=blur_radius) <= blur_threshold
    return mask


def blur_area_stats(mask) -> Tuple[int, int, int, List]:
    rps = measure.regionprops(morphology.label(mask))
    if rps:
        areas = np.asarray([rp.area for rp in rps])
        nobj = len(rps)
        area_max = areas.max()
        area_mean = areas.mean()
    else:
        nobj = area_max = area_mean = 0

    return nobj, area_max, area_mean, rps
