import scipy.ndimage
import skimage
import sklearn
from typing import Callable, Mapping
from scipy import ndimage as sci_ndi
import numpy as np
try:
    import cupy as cp
    from scipy import signal as sci_signal
    from cupyx.scipy import signal as cu_signal
    from cucim import skimage as cu_skimage
    from cupyx.scipy import ndimage as cu_ndi
    from sklearn import naive_bayes as sk_naive_bayes
    from cuml import naive_bayes as cuml_naive_bayes
    import cuml
    from cuml import ensemble as cuml_ensemble
    from sklearn import ensemble as sk_ensemble

    # noinspection PyUnresolvedReferences
    FUNC_MAP: Mapping[Callable, Callable] = {
        skimage.color.convert_colorspace: cu_skimage.color.convert_colorspace,
        skimage.color.rgb2gray: cu_skimage.color.rgb2gray,
        skimage.color.separate_stains: cu_skimage.color.separate_stains,
        skimage.exposure.equalize_hist: cu_skimage.exposure.equalize_hist,
        # not implemented
        # skimage.feature.graycomatrix: cu_skimage.feature.graycomatrix,
        # skimage.feature.local_binary_pattern: cu_skimage.feature.local_binary_pattern,
        skimage.filters.frangi: cu_skimage.filters.frangi,
        skimage.filters.gaussian: cu_skimage.filters.gaussian,
        skimage.filters.gabor_kernel: cu_skimage.filters.gabor_kernel,
        skimage.filters.gabor: cu_skimage.filters.gabor,
        skimage.filters.laplace: cu_skimage.filters.laplace,
        skimage.filters.median: cu_skimage.filters.median,

        # skimage.filters.rank.otsu: cu_skimage.filters.rank.otsu,
        skimage.filters.sobel: cu_skimage.filters.sobel,
        skimage.filters.threshold_otsu: cu_skimage.filters.threshold_otsu,
        skimage.measure.regionprops: cu_skimage.measure.regionprops,
        skimage.morphology.binary_opening: cu_skimage.morphology.binary_opening,
        # the morphology.label is just an alias of the measure.label
        skimage.morphology.label: cu_skimage.measure.label,
        skimage.morphology.dilation: cu_skimage.morphology.dilation,
        skimage.morphology.disk: cu_skimage.morphology.disk,
        skimage.morphology.remove_small_holes: cu_skimage.morphology.remove_small_holes,
        skimage.morphology.remove_small_objects: cu_skimage.morphology.remove_small_objects,
        skimage.transform.resize: cu_skimage.transform.resize,
        skimage.util.img_as_bool: cu_skimage.util.img_as_bool,
        skimage.util.img_as_ubyte: cu_skimage.util.img_as_ubyte,
        sci_ndi.convolve: cu_ndi.convolve,

        # can be replaced by erosion, but is actually slower for uint dtypes
        skimage.filters.rank.minimum: None,  # cu_skimage.morphology.erosion,
        sci_signal.convolve2d: cu_signal.convolve2d,
        sci_ndi.generate_binary_structure: cu_ndi.generate_binary_structure,
        np.digitize: cp.digitize,
        # sk_naive_bayes.GaussianNB: cuml_naive_bayes.GaussianNB,
        # sk_ensemble.RandomForestClassifier: cuml_ensemble.RandomForestClassifier,
    }
except ImportError:
    FUNC_MAP = dict()
