import os
from skimage import io


def saveImages(s,params):
    #TODO accept images to save as a list and save them all in loop
    print("\tsaveUsableRegion")
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_mask_use.png",s["img_mask_use"]*255)
    return

def saveThumbnail(s,params):
    print("\tsaveThumbnail")
    img=s.getImgThumb(int(params.get("size",500)))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_thumb.png",img)
    return