import logging
import os
import re
import sys
from histoqc.array_adapter import ArrayAdapter, ArrayDevice
from ast import literal_eval as make_tuple

from distutils.util import strtobool

from histoqc.BaseImage import printMaskHelper, BaseImage
from skimage import io
from skimage.util import img_as_ubyte, img_as_bool
from skimage.filters import gabor, frangi, gaussian, median, laplace
from skimage.color import rgb2gray
from skimage.morphology import remove_small_objects, disk, dilation
from skimage.feature import local_binary_pattern

from scipy import ndimage as ndi

from sklearn.naive_bayes import GaussianNB
from sklearn.ensemble import RandomForestClassifier

import numpy as np


def pixelWise(s: BaseImage, params):
    name = params.get("name", "classTask")
    logging.info(f"{s['filename']} - \tpixelWise:\t", name)

    thresh = float(params.get("threshold", .5))

    fname = params.get("tsv_file", "")

    if fname == "":
        logging.error(f"{s['filename']} - tsv_file not set in ClassificationModule.pixelWise for ", name)
        sys.exit(1)

    model_vals = np.loadtxt(fname, delimiter="\t", skiprows=1)

    # todo no formal support for GNB now
    # todo  Possible solution: sklearn with array-api-compat and implement a wrapper into the ArrayAdaptor
    # todo Also: need to rework the GaussianNB.fit interface into a wrapper.
    device = s.image_handle.device
    adapter = ArrayAdapter.build(input_device=device, output_device=device)
    img = adapter.move_to_device(s.getImgThumb(s["image_work_size"]), ArrayDevice.CPU)

    gnb = GaussianNB()
    gnb.fit(model_vals[:, 1:], model_vals[:, 0])
    cal = adapter(gnb.predict_proba)(img.reshape(-1, 3))

    cal = cal.reshape(img.shape[0], img.shape[1], 2)
    mask = cal[:, :, 1] > thresh

    mask = adapter.and_(s["img_mask_use"], mask > 0)

    s.addToPrintList(name, str(mask.mean()))
    fname = os.path.join(s["outdir"], f"{s['filename']}_{name}.png")
    adapter.imsave(fname, img_as_ubyte(mask))
    s["img_mask_" + name] = (mask * 255) > 0
    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = adapter.and_(s["img_mask_use"], ~s["img_mask_" + name])

    s.addToPrintList(name,
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After ClassificationModule.pixelWise:{name} NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After ClassificationModule.pixelWise:{name} NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    return


# extract_patches_2d(image, patch_size, max_patches=None, random_state=None

def compute_rgb(img, params):
    adapter = params["adapter"]
    return adapter.sync(img)


def compute_laplace(img, params):
    laplace_ksize = int(params.get("laplace_ksize", 3))
    adapter = params["adapter"]
    img_gray = adapter(rgb2gray)(img)
    #     return laplace(rgb2gray(img), ksize=laplace_ksize)[:, :, None]
    return adapter(laplace)(img_gray, ksize=laplace_ksize)[:, :, None]



def compute_lbp(img, params):
    lbp_radius = float(params.get("lbp_radius", 3))
    lbp_points = int(params.get("lbp_points", 24))  # example sets radius * 8
    lbp_method = params.get("lbp_method", "default")
    # todo: currently no LBP implemented
    adapter: ArrayAdapter = params['adapter']
    img_gray = adapter(rgb2gray)(img)
    # return local_binary_pattern(rgb2gray(img), P=lbp_points, R=lbp_radius, method=lbp_method)[:, :, None]
    return adapter(local_binary_pattern)(img_gray, P=lbp_points, R=lbp_radius, method=lbp_method)[:, :, None]



def compute_gaussian(img, params):
    adapter = params["adapter"]
    gaussian_sigma = int(params.get("gaussian_sigma", 1))
    gaussian_multichan = strtobool(params.get("gaussian_multichan", "False"))
    # todo: forward compatibility
    # todo: after 0.19 default multichannel behavior is fixed and explicitly setting channel_axis is preferred.
    # todo: multichannel is also deprecated in later versions
    if gaussian_multichan:
        return adapter(gaussian)(img, sigma=gaussian_sigma, channel_axis=-1)
    else:
        img_gray = adapter(rgb2gray)(img)
        return adapter(gaussian)(img_gray, sigma=gaussian_sigma)[:, :, None]


def compute_median(img, params):
    median_disk_size = int(params.get("median_disk_size", 3))
    # starting from 0.19, selem is deprecated and footprint is preferred.
    adapter: ArrayAdapter = params['adapter']
    imgg = adapter(rgb2gray)(img)
    footprint = adapter(disk)(median_disk_size)
    return adapter(median)(imgg, footprint=footprint)[:, :, None]


def compute_gabor(img, params):
    adapter = params["adapter"]
    # if not params["shared_dict"].get("gabor_kernels", False):
    # todo: the benefit of caching the gabor_kernel is marginal as the computational head to obtain the kernel itself
    # todo: is neglectable
    gabor_theta = int(params.get("gabor_theta", 4))
    gabor_sigma = make_tuple(params.get("gabor_sigma", "(1,3)"))
    gabor_frequency = make_tuple(params.get("gabor_frequency", "(0.05, 0.25)"))

    # kernels = []
    fts = []
    for theta in range(gabor_theta):
        theta = theta / 4. * np.pi
        for sigma in gabor_sigma:
            for frequency in gabor_frequency:

                fts.append((frequency, theta, sigma))

    imgg = adapter(rgb2gray)(img)
    feats = np.zeros((imgg.shape[0], imgg.shape[1], len(fts)), dtype=np.double)
    feats = adapter.sync(feats)

    for idx, (freq, tht, sig) in enumerate(fts):
        filtered, _ = adapter(gabor)(imgg, theta=tht, sigma_x=sig, sigma_y=sig, frequency=freq, mode='wrap')
        feats[:, :, idx] = filtered
    return feats


def compute_frangi(img, params):
    frangi_scale_range = make_tuple(params.get("frangi_scale_range", "(1, 10)"))
    frangi_scale_step = float(params.get("frangi_scale_step", 2))
    frangi_beta1 = float(params.get("frangi_beta1", .5))
    frangi_beta2 = float(params.get("frangi_beta2", 15))
    frangi_black_ridges = strtobool(params.get("frangi_black_ridges", "True"))
    sigmas = frangi_scale_range + (frangi_scale_step,)

    adapter: ArrayAdapter = params["adapter"]
    img_gray = adapter(rgb2gray)(img)
    feat = adapter(frangi)(img_gray, sigmas=sigmas, beta=frangi_beta1, gamma=frangi_beta2,
                           black_ridges=frangi_black_ridges)
    # feat = frangi(rgb2gray(img), sigmas=sigmas, beta=frangi_beta1, gamma=frangi_beta2,
    #               black_ridges=frangi_black_ridges)
    return feat[:, :, None]  # add singleton dimension


def compute_features(img, params):
    features = params.get("features", "")
    adapter = params["adapter"]
    feats = []
    for feature in features.splitlines():
        func = getattr(sys.modules[__name__], f"compute_{feature}")
        feats.append(func(img, params))
    feats = adapter.device_sync_all(*feats)
    # cupy can be implicitly concatenated using np's API
    return np.concatenate(feats, axis=2)


def byExampleWithFeatures(s: BaseImage, params):
    device = s.image_handle.device
    adapter = ArrayAdapter.build(input_device=device, output_device=device)
    name = params.get("name", "classTask")
    logging.info(f"{s['filename']} - \tClassificationModule.byExample:\t{name}")

    thresh = float(params.get("threshold", .5))
    nsamples_per_example = float(params.get("nsamples_per_example", -1))

    examples = params.get("examples", "")
    if examples == "":
        logging.error(f"{s['filename']} - No examples provided in ClassificationModule.byExample for {name} !!")
        sys.exit(1)

    if params.get("features", "") == "":
        logging.error(f"{s['filename']} - No features provided in ClassificationModule.byExample for {name} !!")
        sys.exit(1)

    adapter = s.image_handle.adapter
    params['adapter'] = adapter
    with params["lock"]:  # this lock is shared across all threads such that only one thread needs to train the model
        # then it is shared with all other modules
        if not params["shared_dict"].get("model_" + name, False):

            logging.info(f"{s['filename']} - Training model ClassificationModule.byExample:{name}")

            model_vals = []
            model_labels = adapter.sync(np.empty([0, 1]))

            for ex in params["examples"].splitlines():
                ex = re.split(r'(?<!\W[A-Za-z]):(?!\\)', ex)  # workaround for windows: don't split on i.e. C:\
                img = io.imread(ex[0])
                eximg = compute_features(img, params)
                eximg = eximg.reshape(-1, eximg.shape[2])

                # read mask as grayscale images
                mask = io.imread(ex[1], as_gray=True)
                mask = adapter.sync(mask)
                # convert grayscale images into binary images if images are not binary format 
                if mask.dtype.kind != 'b':
                    # warning log
                    msg = f"Mask file '{ex[1]}' is not a binary image. Automatically converting to binary..."
                    logging.warning(s['filename'] + ' - ' + msg)
                    s["warnings"].append(msg)
                    # convert to binary
                    mask = adapter(img_as_bool)(mask)

                mask = mask.reshape(-1, 1)

                if nsamples_per_example != -1:  # sub sampling required
                    nitems = nsamples_per_example if nsamples_per_example > 1 else int(mask.shape[0]
                                                                                       * nsamples_per_example)
                    idxkeep = np.random.choice(mask.shape[0], size=int(nitems))
                    eximg = eximg[idxkeep, :]
                    mask = mask[idxkeep]

                model_vals.append(eximg)
                # again any component in vstack's input is cupy.ndarray will result in a cupy.ndarray
                # but we explicitly sync the device of mask and model_labels anyway
                model_labels = np.vstack((model_labels, mask))

            # do stuff here with model_vals
            model_vals = np.vstack(model_vals)
            clf = RandomForestClassifier(n_jobs=-1)
            # adapter(clf.fit)(model_vals, model_labels.ravel())
            adapter(clf.fit)(model_vals, y=model_labels.ravel())
            params["shared_dict"]["model_" + name] = clf
            logging.info(f"{s['filename']} - Training model ClassificationModule.byExample:{name}....done")

    clf = params["shared_dict"]["model_" + name]
    img = s.getImgThumb(s["image_work_size"])
    feats = compute_features(img, params)
    cal = adapter(clf.predict_proba)(feats.reshape(-1, feats.shape[2]))
    cal = cal.reshape(img.shape[0], img.shape[1], 2)

    mask = cal[:, :, 1] > thresh
    area_thresh = int(params.get("area_threshold", "5"))
    if area_thresh > 0:
        # inplace=True is redundant and deprecated.
        mask = adapter(remove_small_objects)(mask, min_size=area_thresh, out=mask)

    dilate_kernel_size = int(params.get("dilate_kernel_size", "0"))
    if dilate_kernel_size > 0:
        mask = adapter(dilation)(mask, footprint=np.ones((dilate_kernel_size, dilate_kernel_size)))

    mask = s["img_mask_use"] & (mask > 0)
    # mask_ubyte = adapter.move_to_device(adapter(img_as_ubyte)(mask), device=ArrayDevice.CPU)
    # io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", mask_ubyte)

    fname = os.path.join(s["outdir"], f"{s['filename']}_{name}.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(mask))

    s["img_mask_" + name] = (mask * 255) > 0
    prev_mask = s["img_mask_use"]

    # todo: now the BaseImage will explicitly set/get img_* keys (except bbox) to the corresponding img handle device
    # todo: however I think it could be better to also explicitly let the adapter to handle all binary operations.
    s["img_mask_use"] = adapter.and_(s["img_mask_use"], ~s["img_mask_" + name])

    s.addToPrintList(name,
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(f"{s['filename']} - After ClassificationModule.byExampleWithFeatures:{name} NO tissue "
                        f"remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(f"After ClassificationModule.byExampleWithFeatures:{name} NO tissue remains "
                             f"detectable! Downstream modules likely to be incorrect/fail")

    s["img_mask_force"].append("img_mask_" + name)
    s["completed"].append(f"byExampleWithFeatures:{name}")
    return
