import os
import sys

from skimage import io
from sklearn.naive_bayes import GaussianNB
from sklearn.feature_extraction.image import extract_patches_2d
from sklearn.ensemble import RandomForestClassifier
import numpy as np
import matplotlib.pyplot as plt

global_holder = {}



def pixelWise(s, params):
    name = params.get("name", "classTask")
    print("\tpixelWise:\t", name)

    thresh = float(params.get("threshold", .5))

    fname = params.get("tsv_file", "")
    if fname == "":
        print("tsv_file not set in ClassificationModule.pixelWise for ", name)
        sys.exit(1)
        return
    model_vals = np.loadtxt(fname, delimiter="\t", skiprows=1)

    img = s.getImgThumb(s["image_work_size"])

    gnb = GaussianNB()
    gnb.fit(model_vals[:, 1:], model_vals[:, 0])
    cal = gnb.predict_proba(img.reshape(-1, 3))

    cal = cal.reshape(img.shape[0], img.shape[1], 2)
    mask = cal[:, :, 1] > thresh

    mask = s["img_mask_use"] & (mask > 0)

    s.addToPrintList(name, str(mask.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", mask * 255)
    s["img_mask_" + name] = (mask * 255) > 0
    s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_" + name]

    return


# extract_patches_2d(image, patch_size, max_patches=None, random_state=None

# [ClassificationModule.byExample]
# name: "penmarkings"
# tresh: .8
# examples: ./penmarkings_he/pen_green.png:./penmarkings_he/pen_green_mask.png
#          ./penmarkings_he/pen_red.png:./penmarkings_he/pen_red_mask.png

def byExample(s, params):
    name = params.get("name", "classTask")
    print("\tClassificationModule.byExample:\t", name)

    thresh = float(params.get("threshold", .5))

    examples = params.get("examples", "")
    if examples == "":
        print("No examples provided in ClassificationModule.byExample for ", name, "!!")
        sys.exit(1)
        return

    if not global_holder.get("model_" + name, False):

        model_vals = np.empty([0, 3])
        model_labels = np.empty([0, 1])

        for ex in params["examples"].splitlines():
            ex = ex.split(":")
            eximg = io.imread(ex[0]).reshape(-1, 3)
            model_vals = np.vstack((model_vals, eximg))

            mask = io.imread(ex[1]).reshape(-1, 1)
            model_labels = np.vstack((model_labels, mask))

        clf = RandomForestClassifier()
        clf.fit(model_vals, model_labels)
        global_holder["model_"+name] = clf

    clf = global_holder["model_"+name]
    img = s.getImgThumb(s["image_work_size"])
    cal = clf.predict_proba(img.reshape(-1, 3))
    cal = cal.reshape(img.shape[0], img.shape[1], 2)

    mask = cal[:, :, 1] > thresh

    # img = s.getImgThumb(s["image_work_size"])
    # cal = gnb.predict_proba(img.reshape(-1, 3))
    #
    # cal = cal.reshape(img.shape[0], img.shape[1], 2)
    # mask = cal[:, :, 1] > thresh

    mask = s["img_mask_use"] & (mask > 0)

    s.addToPrintList(name, str(mask.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_" + name + ".png", mask * 255)
    s["img_mask_" + name] = (mask * 255) > 0
    s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_" + name]

    return

# extract_patches_2d(image, patch_size, max_patches=None, random_state=None
