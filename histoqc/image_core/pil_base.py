from histoqc.image_core.BaseImage import BaseImage, validateSizeFactors, MAG_NA
from histoqc.image_core.image_handle import PILHandle
import logging
from PIL.Image import BILINEAR
from PIL.Image import Image as ImageClassPIL
import numpy as np
from typing import Union

_THRESH_LEVEL_AND_THUMB = 100


class PILBaseImage(BaseImage[PILHandle]):

    def __init__(self, fname, fname_outdir, params):
        super().__init__(fname, fname_outdir, params)

    @classmethod
    def build(cls, fname, fname_outdir, params):
        return cls(fname, fname_outdir, params)

    def new_image_handle(self, fname, params) -> PILHandle:
        return PILHandle.build(fname, params)

    @staticmethod
    def dim_to_down_factor(dim, base_mag):
        """target / original size factor. The target size must be no larger than the original.
        Args:
            dim:
            base_mag:

        Returns:

        """
        # filtered by the regex -- either a number or a float + X
        dim: Union[None, str, float, int] = BaseImage.validate_dim(dim)
        if dim is None:
            return MAG_NA
        base_mag = validateSizeFactors(base_mag)
        # if plain number

        if "X" not in dim.upper():
            dim = float(dim)
            # only support downsample for now: do we have any usecase that needs super-resolution?
            result = MAG_NA if dim <= 0 else dim
            return result

        # if dim is a target mag
        if base_mag is MAG_NA:
            return MAG_NA
        target_mag_float = validateSizeFactors(dim)
        return target_mag_float / base_mag

    @staticmethod
    def _thumbnail_opt_helper(image_handle: PILHandle, size_factor):
        assert size_factor >= _THRESH_LEVEL_AND_THUMB, f"For thumbnail, the minimum size is {_THRESH_LEVEL_AND_THUMB}"
        copied_handle = image_handle.handle.copy()
        copied_handle.thumbnail((size_factor, size_factor))
        return copied_handle

    @staticmethod
    def _resized_pil_helper(image_handle, size_factor):
        assert 0 < size_factor <= 1, f"For downsample via resize ops, the factor should be within (0, 1]"
        width, height = image_handle.base_size_wh
        new_width = int(width * size_factor)
        new_height = int(height * size_factor)
        return image_handle.handle.resize((new_width, new_height), BILINEAR)

    @staticmethod
    def thumbnail_helper_by_case(image_handle: PILHandle, size_factor) -> ImageClassPIL:
        assert isinstance(size_factor, (int, float)) and size_factor > 0
        if size_factor <= 1:
            return PILBaseImage._resized_pil_helper(image_handle, size_factor)

        elif 1 <= size_factor < _THRESH_LEVEL_AND_THUMB:
            # Image Pyramid level. For now there are no actual pyramids so it returns self with warning.
            lvl_dim = image_handle.get_level_dimensions(size_factor)
            return image_handle.read_region((0, 0), size_factor, lvl_dim)
        return PILBaseImage._thumbnail_opt_helper(image_handle, size_factor)

    # there are repeated codes here - fix later
    def getImgThumb(self, dim) -> Union[np.ndarray, int]:
        """For PILImage, nearly all of the use cases are to interactively process a region of interest,
        i.e., a small fraction of tissue area from the WSI images in the existing coding pipeline. So while
        we can simulate all necessary exposed API of OpenSlide, what is needed is really the PIL.Image.resize here.
        Args:
            dim:

        Returns:

        """
        key = f"img_{dim}"
        if key in self:
            # noinspection PyTypeChecker
            return self[key]
        size_factor = PILBaseImage.dim_to_down_factor(dim, self.base_mag)
        if size_factor is MAG_NA or size_factor <= 0:
            logging.error(f"{self['filename']}: Unsupported target dim for PIL-based inputs. "
                          f"It should be either a decimal in (0, 1], an explicit size setting, "
                          f"or a mag ending with 'X' that is smaller"
                          f"than the base_mag: {dim} vs. {self.base_mag}")
            return -1
        # barricade for testing purpose.
        assert size_factor > 0
        # noinspection PyTypeChecker
        self[key] = np.asarray(PILBaseImage.thumbnail_helper_by_case(self.image_handle, size_factor))
        # noinspection PyTypeChecker
        return self[key]
