import inspect
import logging
import os
import re
from distutils.util import strtobool

import numpy as np
if hasattr(os, "add_dll_directory"):
    with os.add_dll_directory(os.path.join(os.getcwd(), 'bin')):
        from openslide import OpenSlide
else:
    from openslide import OpenSlide


from histoqc.image_core.BaseImage import BaseImage, getMag

# it is so stupid that there is no branch reset group in re
# compatible with the previous definition of valid input: leading zero and leading decimals are supported
__REGEX_SIMPLE_LEADING_DEC = r"^(\.\d+X?)$"
__REGEX_SIMPLE_LEADING_NUMERIC = r"^(\d+\.?\d*X?)"

_PATTERN_DIM_LEADING_DEC: re.Pattern = re.compile(__REGEX_SIMPLE_LEADING_DEC)
_PATTERN_DIM_LEADING_NUMERIC: re.Pattern = re.compile(__REGEX_SIMPLE_LEADING_NUMERIC)


class SlideImage(BaseImage):

    @property
    def resource_handle(self):
        raise self["os_handle"]

    @classmethod
    def build(cls, fname, fname_outdir, params):
        return cls(fname, fname_outdir, params)

    def init_resource(self, fname, params):
        self["os_handle"] = OpenSlide(fname)
        self["image_base_size"] = self["os_handle"].dimensions
        self["base_mag"] = getMag(self, params)
        self.addToPrintList("base_mag", self["base_mag"])

    def __init__(self, fname, fname_outdir, params):
        super().__init__(fname, fname_outdir, params)
        self.init_resource(fname, params)
        self["img_mask_use"] = np.ones(self.getImgThumb(self["image_work_size"]).shape[0:2], dtype=bool)

    @staticmethod
    def _thumb_downsample_factor_helper(osh: OpenSlide, dim):
        assert dim < 1 and not dim.is_integer(), f"{dim} is not a decimal < 1"
        new_dim = np.asarray(osh.dimensions) * dim
        return np.array(osh.get_thumbnail(new_dim))

    def _thumb_downsample_factor(self, osh: OpenSlide, dim):
        return self._thumb_downsample_factor_helper(osh, dim)

    @staticmethod
    def _from_pyramid_helper(osh: OpenSlide, dim):
        assert isinstance(dim, int)

        return osh.read_region((0, 0), dim, osh.level_dimensions[dim])
        # self[key] = np.asarray(img)[:, :, 0:3]

    def _from_pyramid(self, osh: OpenSlide, dim):
        dim = int(dim)
        if dim >= osh.level_count:
            dim = osh.level_count - 1
            calling_class = inspect.stack()[1][3]
            logging.error(
                f"{self['filename']}: Desired Image Level {dim + 1} does not exist! Instead using level"
                f" {osh.level_count - 1}! Downstream output may not be correct")
            self["warnings"].append(
                f"Desired Image Level {dim + 1} does not exist! Instead using level {osh.level_count - 1}"
                f"! Downstream output may not be correct")
        logging.info(
            f"{self['filename']} - \t\tloading image from level {dim} of size {osh.level_dimensions[dim]}")
        return SlideImage._from_pyramid_helper(osh, dim)

    @staticmethod
    def _from_mag_helper(osh: OpenSlide, base_mag, dim):
        target_mag = float(dim.upper().split("X")[0])
        down_factor = base_mag / target_mag
        level = osh.get_best_level_for_downsample(down_factor)
        relative_down = down_factor / osh.level_downsamples[level]
        if relative_down == 1.0:  # there exists an open slide level exactly for this requested mag
            output = osh.read_region((0, 0), level, osh.level_dimensions[level])
            output = np.asarray(output)[:, :, 0:3]
        else:  # there does not exist an openslide level for this mag, need to create ony dynamically
            win_size = 2048
            win_size_down = int(win_size * 1 / relative_down)
            dim_base = osh.level_dimensions[0]
            output = []
            for x in range(0, dim_base[0], round(win_size * osh.level_downsamples[level])):
                row_piece = []
                for y in range(0, dim_base[1], round(win_size * osh.level_downsamples[level])):
                    aa = osh.read_region((x, y), level, (win_size, win_size))
                    bb = aa.resize((win_size_down, win_size_down))
                    row_piece.append(bb)
                row_piece = np.concatenate(row_piece, axis=0)[:, :, 0:3]
                output.append(row_piece)

            output = np.concatenate(output, axis=1)
            output = output[0:round(dim_base[1] * 1 / down_factor), 0:round(dim_base[0] * 1 / down_factor), :]
        return output

    def _from_mag(self, osh, base_mag, dim):
        if base_mag != "NA":  # if base magnification is not known, it is set to NA by basic module
            base_mag = float(base_mag)
        else:  # without knowing base mag, can't use this scaling, push error and exit
            logging.error(
                f"{self['filename']}: Has unknown or uncalculated base magnification, "
                f"cannot specify magnification scale: {base_mag}! Did you try getMag?")
            return -1
        return SlideImage._from_mag_helper(osh, base_mag, dim)

    @staticmethod
    def _from_size_helper(osh: OpenSlide, dim):
        return np.array(osh.get_thumbnail((dim, dim)))

    def _from_size(self, osh: OpenSlide, dim):
        logging.info(f"{self['filename']} - \t\tcreating image thumb of size {str(dim)}")
        return SlideImage._from_size_helper(osh, dim)

    @staticmethod
    def _validate_dim_helper(dim: str):
        matched = _PATTERN_DIM_LEADING_DEC.match(dim) or _PATTERN_DIM_LEADING_NUMERIC.match(dim)
        if matched:
            return dim
        return None

    def _thumbnail(self, osh: OpenSlide, dim):
        dim = SlideImage._validate_dim_helper(dim)
        if dim is None:
            logging.error(
                f"{self['filename']}: Unknown image level setting: {dim}!")
            return -1

        if "X" in dim.upper():
            return self._from_mag(self['os_handle'], self.base_mag, dim)

        dim = float(dim)
        # decimal number in (0, 1) --> downsample factor
        # is dim.is_integer really useful?
        if 0 < dim < 1 and not dim.is_integer():
            return self._thumb_downsample_factor(osh, dim)
        elif dim < 100:
            return self._from_pyramid(osh, dim)

        # explicit size
        return self._from_size(osh, dim)

    def getImgThumb(self, dim):
        key = f"img_{dim}"
        osh = self["os_handle"]
        if key not in self:
            # noinspection PyTypeChecker
            self[key] = self._thumbnail(osh, dim)[:, :, 0:3]
        # noinspection PyTypeChecker
        return self[key]
