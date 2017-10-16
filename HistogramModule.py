import os
import numpy as np
from skimage import io
import matplotlib.pyplot as plt
from distutils.util import strtobool

global_holder = {}

def getHistogram(s,params):
    #TODO: compare against a base to provide a quantative metric
    #TODO: can print out all the bins? how to add to result sheet? or just image graph?
    print "\tgetHistogram"
    limit_to_tissue = strtobool(params.get("limit_to_tissue", True))
    bins=int(params.get("bins", 20))
    if(limit_to_tissue and "getTissuePercent" not in s["completed"]):
        print "getHistogram: Depends on getTissuePercent. NOT limited to non-white space"
        s["warnings"].append("getHistogram: Depends on getTissuePercent. NOT limited to non-white space")

    img=s.getImgThumb(s["image_work_size"])
    if limit_to_tissue:
        img=img[s["img_mask_use"]]
    else:
        #TODO Fix. img needs to be reshaped
        print "NOT IMPLEMENTED"

    ax = plt.axes()
    ax.hist(img, bins=bins, normed=1, range=(0, 255), histtype='step', color=("r", "g","b"))

    ax.grid(True)
    ax.set_title('Color Distirubtion for ' + s["filename"])
    ax.set_xlabel('Pixel Val')
    ax.set_ylabel('Density')
    plt.savefig(s["outdir"] + os.sep + s["filename"] + "_hist.png")
    plt.close()
    return

def computeHistogram(img,bins,mask=-1):
    result = np.zeros(shape=(bins, 3))
    for chan in xrange(0,3):
        vals=img[:, :, chan].flatten()
        if(isinstance(mask,np.ndarray)):
            vals=vals[mask.flatten()]
        result[:,chan]=np.histogram(vals, bins=bins, normed=True, range=[0, 255])[0]
    return result


def compareToTemplates(s,params):
    bins = int(params.get("bins", 20))
    limit_to_tissue=strtobool(params.get("limit_to_tissue", True))
    if(not global_holder.get("templates",False)):
        templates={}
        for template in params["templates"].splitlines():
            templates[os.path.splitext(os.path.basename(template))[0]]=computeHistogram(io.imread(template),bins)
            #compute each of their histograms
        global_holder["templates"]=templates

    img = s.getImgThumb(s["image_work_size"])

    if(limit_to_tissue):
        imghst=computeHistogram(img,bins,s["img_mask_use"])
    else:
        imghst = computeHistogram(img, bins)

    for template in global_holder["templates"]:
        val=np.sum(pow(abs(global_holder["templates"][template] - imghst), 2))
        s.addToPrintList(template+"_MSE_hist", str(val))
    return
