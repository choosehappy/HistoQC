import logging
import os
from skimage import io, img_as_ubyte
from distutils.util import strtobool
from skimage import color
import numpy as np


def blend2Images(img, mask):
    if (img.ndim == 3):
        img = color.rgb2gray(img)
    if (mask.ndim == 3):
        mask = color.rgb2gray(mask)
    img = img[:, :, None] * 1.0  # can't use boolean
    mask = mask[:, :, None] * 1.0
    out = np.concatenate((mask, img, mask), 2)
    return out


def saveFinalMask(s, params):
    logging.info(f"{s['filename']} - \tsaveUsableRegion")

    mask = s["img_mask_use"]
    for mask_force in s["img_mask_force"]:
        mask[s[mask_force]] = 0

    # saving compressed mask
    saveCompressedMask(s["outdir"] + os.sep + s["filename"] + "_mask_use.png", mask)

    if strtobool(params.get("use_mask", "True")):  # should we create and save the fusion mask?
        img = s.getImgThumb(s["image_work_size"])
        out = blend2Images(img, mask)
        saveCompressedMask(s["outdir"] + os.sep + s["filename"] + "_fuse.png" ,out)

    return


def saveAssociatedImage(s, key:str, dim:int):
    logging.info(f"{s['filename']} - \tsave{key.capitalize()}")
    osh = s["os_handle"]

    if not key in osh.associated_images:
        message = f"{s['filename']}- save{key.capitalize()} Can't Read '{key}' Image from Slide's Associated Images"
        logging.warning(message)
        s["warnings"].append(message)
        return
    
    # get asscociated image by key
    associated_img = osh.associated_images[key]
    (width, height)  = associated_img.size

    # calulate the width or height depends on dim
    if width > height:
        h = round(dim * height / width)
        size = (dim, h)
    else:
        w = round(dim * width / height)
        size = (w, dim)
    
    associated_img = associated_img.resize(size)
    associated_img = np.asarray(associated_img)[:, :, 0:3]
    saveCompressedMask(f"{s['outdir']}{os.sep}{s['filename']}_{key}.png" ,associated_img)

def saveMacro(s, params):
    dim = params.get("small_dim", 500)
    saveAssociatedImage(s, "macro", dim)
    return
    
def saveMask(s, params):
    logging.info(f"{s['filename']} - \tsaveMaskUse")
    suffix = params.get("suffix", None)
    
    # check suffix param
    if not suffix:
        msg = f"{s['filename']} - \tPlease set the suffix for mask use."
        logging.error(msg)
        return

    # save mask
    path = f"{s['outdir']}{os.sep}{s['filename']}_{suffix}.png"    
    # saving mask with RLE
    saveCompressedMask(path, s["img_mask_use"])

def saveThumbnails(s, params):
    logging.info(f"{s['filename']} - \tsaveThumbnail")
    # we create 2 thumbnails for usage in the front end, one relatively small one, and one larger one
    img = s.getImgThumb(params.get("image_work_size", "1.25x"))
    saveCompressedMask(s["outdir"] + os.sep + s["filename"] + "_thumb.png" ,img)

    img = s.getImgThumb(params.get("small_dim", 500))
    saveCompressedMask(s["outdir"] + os.sep + s["filename"] + "_thumb.png" ,img)
    return

def saveCompressedMask(f_path, img_mask, optimize: bool=True):
    # Check if the image is binarized
    unique_values = np.unique(img_mask)
    bits = 1 if len(unique_values) == 2 else 8
    io.imsave(f_path, img_as_ubyte(img_mask),bits=bits, optimize=optimize)
