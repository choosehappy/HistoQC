import logging
import os
import sys

from ast import literal_eval as make_tuple

from distutils.util import strtobool

import scipy
from skimage import io
from skimage.filters import gabor_kernel, frangi, gaussian, median, laplace
from skimage.color import rgb2gray
from skimage.morphology import remove_small_objects, disk
from skimage.feature import local_binary_pattern

from skimage.transform import rescale, resize, downscale_local_mean

from scipy import ndimage as ndi
from math import ceil

from sklearn.naive_bayes import GaussianNB
from sklearn.ensemble import RandomForestClassifier

import numpy as np

import matplotlib.pyplot as plt

global_holder = {}


def pixelWise(s, params):
    name = params.get("name", "classTask")
    print("\tpixelWise:\t", name, end="")

    level = int(params.get("level", 1))
    win_size = int(params.get("win_size", 2048))

    osh = s["os_handle"]

    dim_base = osh.level_dimensions[0]
    dims = osh.level_dimensions[level]

    ratio_x = dim_base[0] / dims[0]
    ratio_y = dim_base[1] / dims[1]

    frangi_scale_range = (1, 6)
    frangi_scale_step = 2
    frangi_beta1 = .5
    frangi_beta2 = 100
    frangi_black_ridges = True

    mask = []
    for x in range(0, dim_base[0], round(win_size * ratio_x)):
        row_piece = []
        print('.', end='', flush=True)
        for y in range(0, dim_base[1], round(win_size * ratio_y)):
            region = np.asarray(osh.read_region((x, y), 1, (win_size, win_size)))
            region = region[:, :, 0:3]  # remove alpha channel
            g = rgb2gray(region)
            feat = frangi(g, frangi_scale_range, frangi_scale_step, frangi_beta1, frangi_beta2, frangi_black_ridges)
            feat = feat / 8.875854409275627e-08
            region_mask = np.bitwise_and(g < .3, feat > 5)
            region_mask = remove_small_objects(region_mask, min_size=100, in_place=True)
            # region_std = region.std(axis=2)
            # region_gray = rgb2gray(region)
            # region_mask = np.bitwise_and(region_std < 20, region_gray < 100/255)
            # region_mask = scipy.ndimage.morphology.binary_dilation(region_mask, iterations=1)
            # region_mask = resize(region_mask , (region_mask.shape[0] / 2, region_mask.shape[1] / 2))
            row_piece.append(region_mask)
        row_piece = np.concatenate(row_piece, axis=0)
        mask.append(row_piece)

    mask = np.concatenate(mask, axis=1)

    if params.get("area_thresh", "") != "":
        mask = remove_small_objects(mask, min_size=int(params.get("area_thresh", "")), in_place=True)

    s.addToPrintList(name, str(mask.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_BubbleBounds.png", mask.astype(np.uint8) * 255)

    return
