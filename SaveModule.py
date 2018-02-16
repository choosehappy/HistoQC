import logging
import os
from skimage import io


def saveImages(s,params):
    #TODO accept images to save as a list and save them all in loop
    logging.info(f"{s['filename']} - \tsaveUsableRegion")
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_mask_use.png",s["img_mask_use"]*255)
    return

def saveThumbnail(s,params):
    logging.info(f"{s['filename']} - \tsaveThumbnail")
    img=s.getImgThumb(float(params.get("image_work_size",500)))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb.png",img)
    return