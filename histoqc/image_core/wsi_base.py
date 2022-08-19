import inspect
import logging
import os

import numpy as np
from histoqc._import_openslide import openslide
from openslide import OpenSlide
from histoqc.image_core.BaseImage import BaseImage, MAG_NA
from histoqc.image_core.image_handle import OSHandle


class SlideBaseImage(BaseImage[OSHandle]):

    def new_image_handle(self, fname, params) -> OSHandle:
        return OSHandle.build(fname, params)

    @classmethod
    def build(cls, fname, fname_outdir, params):
        return cls(fname, fname_outdir, params)

    def __init__(self, fname, fname_outdir, params):
        super().__init__(fname, fname_outdir, params)

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
        return SlideBaseImage._from_pyramid_helper(osh, dim)

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
        if base_mag != MAG_NA:  # if base magnification is not known, it is set to NA by basic module
            base_mag = float(base_mag)
        else:  # without knowing base mag, can't use this scaling, push error and exit
            logging.error(
                f"{self['filename']}: Has unknown or uncalculated base magnification, "
                f"cannot specify magnification scale: {base_mag}! Did you try getMag?")
            return -1
        return SlideBaseImage._from_mag_helper(osh, base_mag, dim)

    @staticmethod
    def _from_size_helper(osh: OpenSlide, dim):
        return np.array(osh.get_thumbnail((dim, dim)))

    def _from_size(self, osh: OpenSlide, dim):
        logging.info(f"{self['filename']} - \t\tcreating image thumb of size {str(dim)}")
        return SlideBaseImage._from_size_helper(osh, dim)

    def _thumbnail(self, osh: OpenSlide, dim):
        dim = super().validate_dim(dim)
        if dim is None:
            logging.error(
                f"{self['filename']}: Unknown image level setting: {dim}!")
            return -1

        if "X" in dim.upper():
            return self._from_mag(osh, self.base_mag, dim)

        dim = float(dim)
        # decimal number in (0, 1) --> downsample factor
        # is "not dim.is_integer()" really necessary here?
        if 0 < dim < 1 and not dim.is_integer():
            return self._thumb_downsample_factor(osh, dim)
        elif dim < 100:
            return self._from_pyramid(osh, dim)

        # explicit size
        return self._from_size(osh, dim)

    # still entangled with the exposed os_handle but we don't need to touch it as long as the interface is unified
    def getImgThumb(self, dim):
        key = f"img_{dim}"
        osh = self.image_handle.handle
        assert isinstance(osh, OpenSlide), f"Unsupported file handle in SlideImage f:{type(osh)}"
        if key in self:
            # noinspection PyTypeChecker
            return self[key]
        result = self._thumbnail(osh, dim)[:, :, 0:3]
        # for consistency with the prev version: if dim is not valid, no results are memorized at all
        if result == -1:
            return -1
        # noinspection PyTypeChecker
        self[key] = result
        # noinspection PyTypeChecker
        return self[key]
