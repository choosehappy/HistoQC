import logging
import os
from skimage import io
from skimage.util import img_as_ubyte
from distutils.util import strtobool
from skimage import color
import numpy as np
from histoqc.BaseImage import BaseImage


def blend2Images(img, mask):
    if img.ndim == 3:
        img = color.rgb2gray(img)
    if mask.ndim == 3:
        mask = color.rgb2gray(mask)
    img = img[:, :, None] * 1.0  # can't use boolean
    mask = mask[:, :, None] * 1.0
    out = np.concatenate((mask, img, mask), 2)
    return out


def saveFinalMask(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tsaveUsableRegion")

    mask = s["img_mask_use"]
    for mask_force in s["img_mask_force"]:
        mask[s[mask_force]] = 0

    io.imsave(s["outdir"] + os.sep + s["filename"] + "_mask_use.png", img_as_ubyte(mask))

    if strtobool(params.get("use_mask", "True")):  # should we create and save the fusion mask?
        img = s.getImgThumb(s["image_work_size"])
        out = blend2Images(img, mask)
        io.imsave(s["outdir"] + os.sep + s["filename"] + "_fuse.png", img_as_ubyte(out))

    return


def saveAssociatedImage(s: BaseImage, key: str, dim: int):
    logging.info(f"{s['filename']} - \tsave{key.capitalize()}")
    image_handle = s.image_handle

    if key not in image_handle.associated_images:
        message = f"{s['filename']}- save{key.capitalize()} Can't Read '{key}' Image from Slide's Associated Images"
        logging.warning(message)
        s["warnings"].append(message)
        return
    
    # get asscociated image by key
    associated_img = image_handle.associated_images[key]
    width, height = image_handle.__class__.backend_dim(associated_img)

    if width * height == 0:
        message = f"{s['filename']}- Irregular Size {width, height} of the Associated Images: {key}"
        logging.warning(message)
        s["warnings"].append(message)
        return

    aspect_ratio = width / height
    size = image_handle.__class__.curate_to_max_dim(width, height, max_size=dim, aspect_ratio=aspect_ratio)
    # to pillow handle
    associated_img = image_handle.__class__.backend_to_pil(associated_img)
    # resize the pil (RGB)
    associated_img = associated_img.resize(size).convert("RGB")
    # save the pil
    associated_img.save(f"{s['outdir']}{os.sep}{s['filename']}_{key}.png")


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
    io.imsave(f"{s['outdir']}{os.sep}{s['filename']}_{suffix}.png", img_as_ubyte(s["img_mask_use"]))


def saveThumbnails(s, params):
    logging.info(f"{s['filename']} - \tsaveThumbnail")
    # we create 2 thumbnails for usage in the front end, one relatively small one, and one larger one
    img = s.getImgThumb(params.get("image_work_size", "1.25x"))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb.png", img)

    img = s.getImgThumb(params.get("small_dim", 500))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb_small.png", img)
    return
