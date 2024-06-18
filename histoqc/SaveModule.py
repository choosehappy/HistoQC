import logging
import os
import uuid
import json
import numpy as np
from skimage import io, img_as_ubyte
from distutils.util import strtobool
from skimage import color, measure
from copy import deepcopy

def blend2Images(img, mask):
    if (img.ndim == 3):
        img = color.rgb2gray(img)
    if (mask.ndim == 3):
        mask = color.rgb2gray(mask)
    img = img[:, :, None] * 1.0  # can't use boolean
    mask = mask[:, :, None] * 1.0
    out = np.concatenate((mask, img, mask), 2)
    return out


'''
the followings are helper functions for generating geojson
'''

feature_template = {
    "type": "Feature",
    "id": None,
    "geometry": {
        "type": None,
        "coordinates": []
    },
    "properties": {
        "objectType": "annotation"
    }
}

feature_collection_template = {
  "type": "FeatureCollection",
  "features": []
}







def binaryMask2Geojson(s, mask):
    # get the dimension of slide
    (dim_width, dim_height) = s['os_handle'].dimensions
    # get the dimension of mask
    (mask_height, mask_width) = mask.shape

    # convert binary mask to contours
    contours = measure.find_contours(mask)
    
    # no contours detected
    if not len(contours):
        # set default format
        ann_format = "xml"
        # warning msg
        msg = f"No contour detected at use mask image. Geojson annotation won't be generated."
        logging.warning(f"{s['filename']} - {msg}")
        s["warnings"].append(msg)
        return None
    
    # copy feature collection template in geojson
    feature_collection = deepcopy(feature_collection_template)
    for contour in contours:
        # copy feature template in geojson
        new_feature = deepcopy(feature_template)
        # set id
        new_feature["id"] = uuid.uuid4().hex

        # scale up the coordinate
        points = np.asarray(np.flip(contour / [mask_height, mask_width] * [dim_height, dim_width]),dtype="int")
        
        # if first and last points has same coordinates then it is polygon
        if (contour[0]==contour[-1]).all():
            # polygon
            new_feature['geometry']['type'] = 'Polygon'
            new_feature['geometry']['coordinates'].append(points.tolist())
        else:
            # LineString
            new_feature['geometry']['type'] = 'LineString'
            new_feature['geometry']['coordinates'] = points.tolist()
        
        feature_collection['features'].append(new_feature)
    
    return feature_collection


def saveFinalMask(s, params):
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
    io.imsave(f"{s['outdir']}{os.sep}{s['filename']}_{key}.png", associated_img)

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


def saveMask2Geojson(s, params):
    
    mask_name = params.get('mask_name', 'img_mask_use')
    suffix = params.get("suffix", None)
    logging.info(f"{s['filename']} - \tsaveMaskUse2Geojson: {mask_name}")
    # check suffix param
    if not suffix:
        msg = f"{s['filename']} - \tPlease set the suffix for mask use in geojson."
        logging.error(msg)
        return

    # check if the mask name exists
    if s.get(mask_name, None) is None: 
        msg = f"{s['filename']} - \tThe `{mask_name}` mask dosen't exist. Please use correct mask name."
        logging.error(msg)        
        return
    # convert mask to geojson
    geojson = binaryMask2Geojson(s, s[mask_name])
    
    # save mask as genjson file
    with open(f"{s['outdir']}{os.sep}{s['filename']}_{suffix}.geojson", 'w') as f:
        json.dump(geojson, f)



def saveThumbnails(s, params):
    logging.info(f"{s['filename']} - \tsaveThumbnail")
    # we create 2 thumbnails for usage in the front end, one relatively small one, and one larger one
    img = s.getImgThumb(params.get("image_work_size", "1.25x"))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb.png", img)

    img = s.getImgThumb(params.get("small_dim", 500))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb_small.png", img)
    return
