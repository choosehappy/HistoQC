import os
import numpy as np
from skimage import io, color

def getTissuePercent(s,params):
    #TODO: should take into account markings on slide
    print("\tgetTissuePercent")
    thresh=float(params.get("thresh",.9))

    img=s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)
    map=img<thresh
    s.addToPrintList( "percent_tissue", str(map.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_nonwhite.png",map*255)
    s["img_mask_nonwhite"]=(map*255)>0
    s["img_mask_use"] = s["img_mask_use"] & s["img_mask_nonwhite"]
    return


def getDarkTissuePercent(s,params):
    #TODO: should take into account markings on slide
    print("\tgetTissueFoldPercent")
    thresh=float(params.get("thresh",.15))

    img=s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)
    map=img<thresh
    s.addToPrintList("percent_dark_tissue", str(map.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_dark.png",map*255)
    s["img_mask_dark"]=(map*255)>0
    s["img_mask_use"] = s["img_mask_use"] & np.invert(s["img_mask_dark"])
    return
