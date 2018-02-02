import numpy as np
from skimage import color
from distutils.util import strtobool


def getBrightness(s,params):
    print("\tgetContrast")
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    img = s.getImgThumb(s["image_work_size"])

    img_g=color.rgb2gray(img)
    if (limit_to_mask):
        img_g= img_g[s["img_mask_use"]]

    s.addToPrintList("grayscale_brightness", str(img_g.mean()))

    for chan in range(0,3):
        vals=img[:, :, chan]
        if (limit_to_mask):
            vals= vals[s["img_mask_use"]]
        s.addToPrintList(("chan%d_brightness") % (chan+1), str(vals.mean()))

    return


def getContrast(s,params):
    print("\tgetContrast")
    limit_to_mask = strtobool(params.get("limit_to_mask", True))
    img = s.getImgThumb(s["image_work_size"])
    img = color.rgb2gray(img)

    if (limit_to_mask):
        img = img[s["img_mask_use"]]

    # Michelson contrast
    max_img = img.max()
    min_img = img.min()
    contrast=(max_img-min_img)/(max_img+min_img)
    s.addToPrintList("michelson_contrast", str(contrast))

    #RMS contrast
    rms_contrast=np.sqrt(pow(img - img.mean(), 2).sum() /len(img))
    s.addToPrintList("rms_contrast", str(rms_contrast))
    return