import numpy as np
from skimage.filters import sobel
from skimage.color import convert_colorspace, rgb2gray
from typing import Tuple, Dict, Callable, Union
import warnings

_EPS = np.finfo(np.float32).eps
_DEFAULT_SCORE = -100

_DEFAULT_CONTRAST = _DEFAULT_SCORE
_DEFAULT_BRIGTNESS_MEAN = _DEFAULT_SCORE
_DEFAULT_BRIGHTNESS_STD = 0
_DEFAULT_SRC_COLORSPACE = "RGB"

CONTRAST_NAME_RMS = "rms_contrast"
CONTRAST_NAME_MICHELSON = 'michelson_contrast'
CONTRAST_NAME_TENENGRAD = 'tenenGrad_contrast'


def _masking_collated(img: np.ndarray, mask: Union[np.ndarray, None]) -> np.ndarray:
    """Collate dimension of masked img output from HxWxC (or HxW) to 2d matrix: num_masked_pixel x C. If
    no masking, returns the (H*W) x C flattened vector.
    Args:
        img:
        mask: If set to None, returns the flattened Image (H*W) x C

    Returns:
        ndarray with dim N x C. N as the # of pixels being selected by masking
        and C is the # of image Channels. Empty array (0 x C) if there are no pixels left.
    """
    n_channels = img.ndim
    assert n_channels <= 3, f"Unsupported Channel #"

    if mask is None:
        # (H*W) x C
        return np.atleast_3d(img).reshape([-1, n_channels])

    img = np.atleast_3d(img)  # --> force it to be like H x W x C (3 >= C >= 1)
    masked_values = img[mask]  # num_pixel_masked x C. Trailing dimension is explicitly defined even if C==1
    # simply return the empty array if tissue-less -> let the computation modules handle the edge cases

    # if masked_values.size == 0:
    #     # masked_values = np.full([1, n_channels], fill_value=_DEFAULT_SCORE)
    #     masked_values = np.empty(0)
    return masked_values


# for consistency of tissue-less computation: the previous implementation uses
# -100 as the default score for contrast and pixel intensity mean --> std of pixel intensity is somehow
# set to 0.
# this somewhat makes the handling of tissue-less edge case complicated for brightness and contrast computation.
# If we simply pass the empty array into these brightness/contrast compuation, all of them gives nan,
# -> then any of these computation automatically returns nan, and it can be easily spotted as
# any nan values propagated into further arithmetic ops returns nan. (We spot a nan, then we know till some step
# there is no tissue left.
def _brightness(img_collated: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Helper function of brightness computation for both with or without masking. Note that this vectorize along
    channels --> for grayscale brightness it returns numpy 1-d vector with single element. Make it 0-d if needed.
    Args:
        img_collated: Input image after processed by _masking_collated.
            Empty array if tissue-less.
    Returns:
        channel-wise mean and std. If empty (tissue-less), set mean to -100 and std to 0
    """

    # n_channel = img_collated.shape[1]  # H and W are already collapsed.
    with warnings.catch_warnings():
        # the empty -- so it won't interfere with loggings
        warnings.simplefilter("ignore", category=RuntimeWarning)
        mean_val = img_collated.mean(axis=0)
        std_val = img_collated.std(axis=0)
    # todo --> evaluate whether nan is better
    mean_val = np.nan_to_num(mean_val, nan=_DEFAULT_BRIGTNESS_MEAN)
    std_val = np.nan_to_num(std_val, nan=_DEFAULT_BRIGHTNESS_STD)
    return mean_val, std_val


def brightness_gray(img: np.ndarray, mask: Union[np.ndarray, None] = None) -> Tuple[float, float]:
    """Compute the grayscale brightness value
    Args:
        img: Working image
        mask (optional): Optional. If is not None then only compute stats within masked regions.

    Returns: mean and std of grayscale image intensities as brightness stats.
    """
    img_g = rgb2gray(img)
    # barricade the ndim
    img_collated = _masking_collated(img_g, mask)
    assert img_collated.ndim == 2 and img_collated.shape[1] == 1, f"Dimension sanity check fails: {img_collated.shape}"
    mean_val, std_val = _brightness(img_collated)

    # some sanity check just to be sure
    assert mean_val.ndim == 1 and std_val.ndim == 1
    assert mean_val.size == 1 and std_val.size == 1
    # .ravel()[0]
    # for consistency we return the scalar values here.
    return mean_val.item(), std_val.item()


def brightness_by_channel_in_color_space(img: np.ndarray,
                                         mask: Union[np.ndarray, None],
                                         to_color_space: str = "RGB") -> Tuple[np.ndarray, np.ndarray]:
    """Compute the channel-wise brightness in a new specified colorspace. The original color space is RGB
    This is a shit name.
    Args:
        img:
        mask: If None --> no masking
        to_color_space: String of color space names. See skimage.color.colorconv
    Returns:

    """
    # RGB to RGB is valid --> identity mapping in skimage
    img = convert_colorspace(img, _DEFAULT_SRC_COLORSPACE, to_color_space)
    img_collated = _masking_collated(img, mask=mask)
    # vectorized over channels. The logger should handle each of the channels respectively.
    return _brightness(img_collated)


# ### Contrast

def _rms(img: np.ndarray) -> float:
    """Root Mean Square contrast for non-empty masked images
    Args:
        img: Input image or a vector yielded from masked image. Not Tissue-less
    Returns:

    """
    assert img.size > 0
    return np.sqrt(pow(img - img.mean(), 2).sum() / img.size)


def _michelson(img: np.ndarray) -> float:
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
    return (max_img - min_img) / denominator


def _tenengrad_unnormalized(img: np.ndarray, mask: np.ndarray):
    assert img.size > 0
    sobel_img = sobel(img) ** 2
    return np.sqrt(np.sum(sobel_img))


def validate_tissue_mask(mask: Union[np.ndarray, None]):
    """None or binary mask with any positive pixels
    Args:
        mask:

    Returns:

    """
    assert mask is None or mask.any()
    return mask


def rms_contrast_helper(img: np.ndarray, mask: Union[np.ndarray, None]):
    """RMS from non-empty inputs
    Args:
        img:
        mask:

    Returns:

    """
    mask = validate_tissue_mask(mask)
    img = _masking_collated(img, mask)
    return _rms(img)


def michelson_contrast_helper(img: np.ndarray, mask: Union[np.ndarray, None]):
    mask = validate_tissue_mask(mask)
    img = _masking_collated(img, mask)
    return _michelson(img)


def tenengrad_contrast_helper(img: np.ndarray, mask: Union[np.ndarray, None]) -> float:
    """Helper function for non-empty masked input. Sobel must be performed on the original mask whether or not
    to use the mask.
    Args:
        img:
        mask:

    Returns:

    """
    mask = validate_tissue_mask(mask)
    # get gradient map first

    grad_map = _tenengrad_unnormalized(img, mask)
    region_size = _masking_collated(img, mask).size
    return grad_map / region_size


_CONTRAST_NAME_TO_METHOD: Dict[str, Callable[[np.ndarray, Union[np.ndarray, None]], float]] = {
    CONTRAST_NAME_RMS: rms_contrast_helper,
    CONTRAST_NAME_MICHELSON: michelson_contrast_helper,
    CONTRAST_NAME_TENENGRAD: tenengrad_contrast_helper,
}

# for now the iterable of the dict is the keys. Explicit is better?
_SUPPORTED_CONTRASTS = set(_CONTRAST_NAME_TO_METHOD.keys())


def img_contrast(img: np.ndarray, mask: Union[np.ndarray, None], contrast: str):
    """Universal interface for contrast computation. Barricade the tissue-less maask by returning default values.
    Args:
        img:
        mask:
        contrast:

    Returns:

    """
    assert contrast in _SUPPORTED_CONTRASTS, f"Unsupported contrast metric: {contrast}. Supported metrics are in" \
                                             f"{_SUPPORTED_CONTRASTS}"

    assert img.size > 0, f"Empty input encountered."
    # mask specified and tissue-less (all 0s)
    if mask is not None and not mask.any():
        return _DEFAULT_CONTRAST
    func: Callable[[np.ndarray, np.ndarray], float] = _CONTRAST_NAME_TO_METHOD[contrast]
    return func(img, mask)


def contrast_stats(img: np.ndarray, mask: Union[np.ndarray, None]) -> Dict[str, float]:
    return {c_name: img_contrast(img, mask, c_name)
            for c_name in _SUPPORTED_CONTRASTS}
