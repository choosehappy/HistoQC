import os
import sys

import skimage
from skimage import io
from skimage.color import rgb2gray
from skimage.filters import rank
import numpy as np
import matplotlib.pyplot as plt

from sklearn.naive_bayes import GaussianNB



def identifyPenMarking(s,params):
    print("\tidentifyPenMarkings")

    blur_radius=int(params.get("blur_radius",7))
    blur_threshold= float(params.get("blur_threshold", .2))
    thresh = float(params.get("threshold", .5))
    fname = params.get("tsv_file", "")

    if fname == "":
        print("tsv_file not set in PenMarkingModule.identifypenmarking")
        sys.exit(1)
        return


    #img = s.getImgThumb(1000)
    img = s.getImgThumb(s["image_work_size"])

    img_gray = rgb2gray(img)
    img_laplace = np.abs(skimage.filters.laplace(rgb2gray(img_gray)))
    mask=skimage.filters.gaussian(img_laplace, sigma=blur_radius)<=blur_threshold

    blur_mask = skimage.transform.resize(mask,s.getImgThumb(s["image_work_size"]).shape,order=0)[:,:,1] #for some reason resize takes a grayscale and produces a 3chan

    model_vals=np.loadtxt(fname,delimiter="\t",skiprows=1)

    img = s.getImgThumb(s["image_work_size"])

    gnb = GaussianNB()
    gnb.fit(model_vals[:, 1:], model_vals[:, 0])
    cal = gnb.predict_proba(img.reshape(-1, 3))

    cal = cal.reshape(img.shape[0], img.shape[1],2)
    mask = cal[:,:,1]>thresh

    mask = s["img_mask_use"] & (mask>0)


    s.addToPrintList("percent_penmarking", str(mask.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_penmarking.png", mask * 255)
    s["img_mask_penmarking"] = (mask * 255) > 0
    s["img_mask_use"] = s["img_mask_use"] & ~s["img_mask_penmarking"]

    return


