import logging
import os
from skimage.util import img_as_ubyte
from distutils.util import strtobool
from skimage import color
import numpy as np
from histoqc.BaseImage import BaseImage
from histoqc.array_adapter.typing import TYPE_ARRAY
from histoqc.array_adapter import ArrayAdapter


def blend2Images(img: TYPE_ARRAY, mask: TYPE_ARRAY, adapter: ArrayAdapter):
    if img.ndim == 3:
        img = adapter(color.rgb2gray)(img)
    if mask.ndim == 3:
        mask = adapter(color.rgb2gray)(mask)
    img = img[:, :, None] * 1.0  # can't use boolean
    mask = mask[:, :, None] * 1.0
    # explicitly sync again to satisfy the requirement of using np.concatenate as a unified concatenate func
    img, mask = adapter.device_sync_all(img, mask)
    out = np.concatenate((mask, img, mask), 2)
    return out


def saveFinalMask(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tsaveUsableRegion")
    adapter = s.image_handle.adapter
    mask = s["img_mask_use"]
    for mask_force in s["img_mask_force"]:
        mask, s[mask_force] = adapter.device_sync_all(mask, s[mask_force])
        mask[s[mask_force]] = 0

    fname = os.path.join(s["outdir"], f"{s['filename']}_mask_use.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(mask))

    if strtobool(params.get("use_mask", "True")):  # should we create and save the fusion mask?
        img = s.getImgThumb(s["image_work_size"])
        out = blend2Images(img, mask, adapter)
        fname = os.path.join(s["outdir"], f"{s['filename']}_fuse.png")
        adapter.imsave(fname, adapter(img_as_ubyte)(out))
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
    fname = os.path.join(s["outdir"], f"{s['filename']}_{key}.png")
    associated_img.save(fname)
    return


def saveMacro(s, params):
    dim = params.get("small_dim", 500)
    saveAssociatedImage(s, "macro", dim)
    return


def saveMask(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tsaveMaskUse")
    suffix = params.get("suffix", None)
    adapter = s.image_handle.adapter
    # check suffix param
    if not suffix:
        msg = f"{s['filename']} - \tPlease set the suffix for mask use."
        logging.error(msg)
        return

    # save mask
    fname = os.path.join(s['outdir'], f"{s['filename']}_{suffix}.png")
    adapter.imsave(fname, adapter(img_as_ubyte)(s["img_mask_use"]))

    return


def saveThumbnails(s: BaseImage, params):
    logging.info(f"{s['filename']} - \tsaveThumbnail")
    # we create 2 thumbnails for usage in the front end, one relatively small one, and one larger one
    img = s.getImgThumb(params.get("image_work_size", "1.25x"))
    adapter = s.image_handle.adapter
    fname_thumb = os.path.join(s["outdir"], f"{s['filename']}_thumb.png")
    adapter.imsave(fname_thumb, adapter(img_as_ubyte)(img))

    img = s.getImgThumb(params.get("small_dim", 500))
    fname_small = os.path.join(s["outdir"], f"{s['filename']}_thumb_small.png")
    adapter.imsave(fname_small, adapter(img_as_ubyte)(img))
    return
