import numpy as np
from scipy.fftpack import fft
# from skimage import morphology
# from skimage.filters import rank
from skimage.morphology import disk, closing
from skimage.filters import threshold_otsu, laplace, gaussian, sobel_v
from skimage.filters.rank import equalize
from skimage.color import rgb2gray
import os
from abc import ABC, abstractmethod
from typing import Callable, Dict, Any, Tuple, Type
from skimage.transform import radon, iradon
import cv2
from .BaseImage import BaseImage, printMaskHelper


class AbstractGrid(ABC, Callable):
    __DEFAULT_PROPERTY_GRAY: str = '__GRAY'
    @property
    def image(self) -> np.ndarray:
        return self.image

    @property
    def gray(self) -> np.ndarray:
        if not hasattr(self, type(self).__DEFAULT_PROPERTY_GRAY):
            img_gray = rgb2gray(self.image) if self.image.ndim > 3 else self.image
            setattr(self, type(self).__DEFAULT_PROPERTY_GRAY, img_gray)
        return getattr(self, type(self).__DEFAULT_PROPERTY_GRAY)

    def __init__(self, image: np.ndarray):
        assert image.ndim <= 3, f"At most 3 dimensions are allowed." \
            f"Got:{image.ndim}"
        self._image = image

    # @abstractmethod
    def fit(self, params: Dict[str, Any]) -> np.ndarray:
        ...

    @abstractmethod
    def binarize(self, mask: np.ndarray, params: Dict[str, Any]) -> np.ndarray:
        ...

    def __call__(self, params: Dict[str, Any]):
        background = self.fit(params)
        mask = self.binarize(background, params)
        return self.image, background, mask


# Reference: https://www.cloudynights.com/topic/569909-streak-noise-removal-the-radon-transform-solution/
class GridRadon(AbstractGrid):
    ORIENTATION_RANGE: Tuple[float] = (0, 180)
    THETA_TOL: float = 5

    def __init__(self, image: np.ndarray):
        super().__init__(image)

    def binarize(self, grid_background: np.ndarray, params: Dict[str, Any]):
        # todo
        grid_thresh_scale = params.get("grid_thresh_scale", 0.25)
        threshold = grid_thresh_scale * threshold_otsu(grid_background)
        mask = grid_background < threshold
        return mask

    @classmethod
    def clear_background(cls, radon_data: np.ndarray, theta: np.ndarray,
                         orientation: float, deg_range: float, step: float):
        assert 0 <= deg_range < 90, f"deg_range exceed [0, 90) {deg_range}"
        assert radon_data.ndim == 2 and radon_data.shape[1] == theta.size
        delta = np.abs(orientation - theta)
        assert delta.min() <= cls.THETA_TOL, f"Degree of orientation mismatch the thetas [tolerance 5 degree]. " \
            f"Use a smaller step. Current: step={step}. Diff={delta.min()}"
        index = delta.argmin(axis=0)
        radius = deg_range//step
        # <index - radius, index + radius> is the interval for streaks. Mute everything else.
        # <right, 180 + left> with wrap mode. pre-condition right-left smaller than 180 --> radius < 90
        background_interval = np.arange(index + radius + 1, radon_data.shape[1] + index - radius + 1)
        np.put(radon_data[:, ], background_interval, 0, mode='wrap')

    def fit(self, params: Dict[str, Any]):
        step: float = params.get('step', 1)
        circle: bool = params.get("circle", False)
        orientation: float = params.get('orientation', 0)
        deg_range: float = params.get('deg_range', 0)

        assert 0 <= deg_range < 90, f'range of degree must be within [0, 90). Got: {deg_range}'
        assert type(self).ORIENTATION_RANGE[0] <= orientation < type(self).ORIENTATION_RANGE[1], \
            'Degree VALUE is expected to be in [0, 180)'

        theta: np.ndarray = np.arange(0, 180, step=step)
        rad_domain: np.ndarray = radon(self.gray, theta=theta, circle=circle)
        type(self).clear_background(radon_data=rad_domain, theta=theta,
                                    orientation=orientation, deg_range=deg_range, step=step)
        reconstruct_bp = iradon(rad_domain, theta=theta, circle=False)
        reconstruct_bp = cv2.normalize(reconstruct_bp, None, norm_type=cv2.NORM_MINMAX)
        # clip todo
        padded_size = tuple((x-y)/2.0 for (x, y) in zip(reconstruct_bp.shape, self.gray.shape))
        slices = [slice(np.floor(offset), self.gray.shape[idx]+np.ceil(offset))
                  for idx, offset in enumerate(padded_size)]
        assert len(slices) == 2
        background = reconstruct_bp[slices[0], slices[1]]
        return background


class GridFourier(AbstractGrid):

    @staticmethod
    def get_spectrum_1d(img_gray: np.ndarray):
        assert img_gray.ndim == 2, 'Input Not 2d/gray.'
        real_im = (abs(fft(img_gray)))
        real_im[real_im == 0] = np.finfo(float).eps  # in case intensity = 0
        bg_grid = abs(np.log(real_im))  # tweak the scale
        bg_grid = cv2.normalize(bg_grid, None, norm_type=cv2.NORM_MINMAX)
        return bg_grid

    @staticmethod
    def enhance_contrast(background: np.ndarray, mask: np.ndarray, params: Dict[str, Any]):
        disk_size = params.get("disk_size", 1000)
        enhanced = equalize(background, disk(disk_size))
        enhanced[mask == 0] = enhanced[mask != 0].mean()
        return enhanced

    @staticmethod
    def get_bg_contrast(img_gray: np.ndarray, params: Dict[str, Any]):
        bg_radius = params.get("bg_radius", 5)
        bg_smooth_thresh = params.get("bg_smooth_thresh", 0.03)
        img_laplace = np.abs(laplace(img_gray))
        mask = gaussian(img_laplace, sigma=bg_radius) <= bg_smooth_thresh
        background = (mask != 0) * img_gray
        background[mask == 0] = 1  # background[mask_background].mean()
        return background, mask

    def fit(self, params):
        do_horizontal = params.get('do_horizontal', False)
        input_data = self.gray if not do_horizontal else self.gray.transpose()
        bg, mask_bg = type(self).get_bg_contrast(input_data, params)
        enhanced = type(self).enhance_contrast(bg, mask_bg, params)
        bg_grid = type(self).get_spectrum_1d(enhanced)
        return bg_grid

    def binarize(self, grid_background, params: Dict[str, Any]) -> np.ndarray:
        grid_thresh_scale = params.get("grid_thresh_scale", 0.3)
        sanitized = closing(sobel_v(grid_background))
        return sanitized > grid_thresh_scale * sanitized.max()




method_map: Dict[str, Type[AbstractGrid]] = {
    "Radon": GridRadon,
    "Fourier": GridFourier,
}


def grid_detect(s: BaseImage, params):
    method_name = params.get('name', 'Radon')
    # streak_perc_thresh = params.get('streak_prec_thresh')
    class_grid_detect: Type[AbstractGrid] = method_map[method_name]
    img = s.getImgThumb(params.get("image_work_size", "2.5x"))
    detector: AbstractGrid = class_grid_detect(img)
    # todo detector(params)
    # todo
    img, bg, mask = detector(params)
    cv2.imwrite(s["outdir"] + os.sep + s["filename"] + "_grid_mask.png", mask * 255)
    cv2.imwrite(s["outdir"] + os.sep + s["filename"] + "_grid_bg.png", bg)
    s["img_mask_grid"] = (mask * 255) > 0
    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_grid"]
    s.addToPrintList('percent_grid', printMaskHelper(
        type=params.get("mask_statistics", s["mask_statistics"]),
        prev_mask=prev_mask,
        curr_mask=s["img_mask_use"]
    ))
