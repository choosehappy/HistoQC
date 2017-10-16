import ConfigParser
import errno
import glob
import os

import argparse
import matplotlib.pyplot as plt
import numpy as np
from skimage import color, io, morphology

os.environ['PATH'] = '.\\openslide\\bin' + ';' + os.environ['PATH']
import openslide

global_holder={}

def getImgThumb(s,dim):
    key="img_"+str(dim)
    if s.get(key) is None:
        print "creating image thumb of size " + str(dim)
        osh = s["os_handle"]
        s[key] = np.array(osh.get_thumbnail((dim, dim)))
    return s[key]

def makeDir(path):
    try:
        os.makedirs(path)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise

def addToPrintList(s,name,val):
    s[name]=val
    s["output"].append(name)



def getBrightness(s,params):
    print "\tgetContrast"
    limit_to_tissue = params.get("limit_to_tissue", True)
    img = getImgThumb(s, s["image_work_size"])

    img_g=color.rgb2gray(img)
    if (limit_to_tissue):
        img_g= img_g[s["img_mask_use"]]

    addToPrintList(s, "grayscale_brightness", str(img_g.mean()))

    for chan in xrange(0,3):
        vals=img[:, :, chan]
        if (limit_to_tissue):
            vals= vals[s["img_mask_use"]]
        addToPrintList(s, ("chan%d_contrast") % (chan+1), str(vals.mean()))

    return


def getContrast(s,params):
    print "\tgetContrast"
    limit_to_tissue = params.get("limit_to_tissue", True)
    img = getImgThumb(s, s["image_work_size"])
    img = color.rgb2gray(img)

    if (limit_to_tissue):
        img = img[s["img_mask_use"]]

    # Michelson contrast
    max_img = img.max()
    min_img = img.min()
    contrast=(max_img-min_img)/(max_img+min_img)
    addToPrintList(s, "michelson_contrast", str(contrast))

    #RMS contrast
    rms_contrast=np.sqrt(pow(img - img.mean(), 2).sum() /len(img))
    addToPrintList(s, "rms_contrast", str(rms_contrast))
    return


def removeSmallObjects(s,params):
    #TODO: should take into account markings on slide
    print "\tremoveSmallObjects"
    min_size=params.get("min_size",64)
    img_reduced=morphology.remove_small_objects(s["img_mask_use"], min_size=min_size)
    img_small= np.invert(img_reduced) &  s["img_mask_use"]
    addToPrintList(s, "percent_small_tissue_removed", str(np.mean(img_small)))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_small_remove.png",img_small*255)
    s["img_mask_small_filled"]=(img_small*255)>0
    s["img_mask_use"] = img_reduced
    return


def fillSmallHoles(s,params):
    #TODO: should take into account markings on slide
    print "\tfillSmallHoles"
    min_size=params.get("min_size",64)
    img_reduced=morphology.remove_small_holes(s["img_mask_use"], min_size=min_size)
    img_small= img_reduced &  np.invert(s["img_mask_use"])
    addToPrintList(s, "percent_small_tissue_filled", str(np.mean(img_small)))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_small_fill.png",img_small*255)
    s["img_mask_small_removed"]=(img_small*255)>0
    s["img_mask_use"] = img_reduced
    return


def getBasicStats(s,params):
    print "\tgetBasicStats"
    osh=s["os_handle"]
    addToPrintList(s,"type",osh.properties["openslide.vendor"])
    addToPrintList(s, "levels", osh.properties["openslide.level-count"])
    addToPrintList(s, "height", osh.properties["openslide.level[0].height"])
    addToPrintList(s, "width", osh.properties["openslide.level[0].width"])
    addToPrintList(s, "mpp-x", osh.properties["openslide.mpp-x"])
    addToPrintList(s, "mpp-y", osh.properties["openslide.mpp-y"])
    return

def getMag(s,params):
    print "\tgetMag"
    osh = s["os_handle"]
    mag = osh.properties["openslide.objective-power"]
    if(mag is None or params["confirm"]): #TODO: Don't know what previous call returns when not available....
        #do DL work here
        print "Unknown magnification for file, need to implement: " + s["filename"]
    addToPrintList(s, "Magnification", mag)
    return

def getTissuePercent(s,params):
    #TODO: should take into account markings on slide
    print "\tgetTissuePercent"
    thresh=params.get("thresh",.9)

    img=getImgThumb(s,s["image_work_size"])
    img = color.rgb2gray(img)
    map=img<thresh
    addToPrintList(s, "percent_tissue", str(map.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_white.png",map*255)
    s["img_mask_nonwhite"]=(map*255)>0
    s["img_mask_use"] = s["img_mask_use"] & s["img_mask_nonwhite"]
    return


def getDarkTissuePercent(s,params):
    #TODO: should take into account markings on slide
    print "\tgetTissueFoldPercent"
    thresh=params.get("thresh",.15)

    img=getImgThumb(s,s["image_work_size"])
    img = color.rgb2gray(img)
    map=img<thresh
    addToPrintList(s, "percent_dark_tissue", str(map.mean()))
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_dark.png",map*255)
    s["img_mask_dark"]=(map*255)>0
    s["img_mask_use"] = s["img_mask_use"] & np.invert(s["img_mask_dark"])
    return

def getHistogram(s,params):
    #TODO: compare against a base to provide a quantative metric
    #TODO: can print out all the bins? how to add to result sheet? or just image graph?
    print "\tgetHistogram"
    bins=params.get("bins", 20)
    if(params["nonwhite"] and "getTissuePercent" not in s["completed"]):
        s["warnings"].append("getHistogram: Depends on getTissuePercent. NOT limited to non-white space")
    img=getImgThumb(s,s["image_work_size"])
    nonwhite=img[s["img_mask_use"]]

    ax = plt.axes()
    ax.hist(nonwhite, bins=bins, normed=1, range=(0, 255), histtype='step', color=("r", "g","b"))

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
    bins = params.get("bins", 20)
    if(not global_holder.get("templates",False)):
        templates={}
        for template in params["templates"]:
            templates[os.path.splitext(os.path.basename(template))[0]]=computeHistogram(io.imread(template),bins)
            #compute each of their histograms
        global_holder["templates"]=templates

    img = getImgThumb(s, s["image_work_size"])
    imghst=computeHistogram(img,bins,s["img_mask_use"])
    for template in global_holder["templates"]:
        val=np.sum(pow(abs(global_holder["templates"][template] - imghst), 2))
        addToPrintList(s, template+"_MSE_hist", str(val))
    return

def saveImages(s,params):
    #TODO accept images to save as a list and save them all in loop
    print "\tsaveUsableRegion"
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_mask_use.png",s["img_mask_use"]*255)
    return


def saveThumbnail(s,params):
    print "\tsaveThumbnail"
    osh = s["os_handle"]
    img=osh.get_thumbnail((params["size"], params["size"]))
    img.save(s["outdir"] + os.sep + s["filename"] + "_thumb.png")
    return


parser = argparse.ArgumentParser(description='')
parser.add_argument('input_pattern', help="input filename pattern (try: '*.svs')")
parser.add_argument('-o', '--outdir', help="outputdir, default ./output/", default="output", type=str)
parser.add_argument('-c', '--config', help="config file to use", default="./config.ini", type=str)
args = parser.parse_args()

config = ConfigParser.ConfigParser()
config.read(args.config)

config.sections()

# make output directory and create report file
makeDir(args.outdir)
csv_report = open(args.outdir + os.sep + "results.tsv", "w")

first=True
files = glob.glob(args.input_pattern)
for fname in files:
    fname_outdir = args.outdir + os.sep + fname
    makeDir(fname_outdir)

    s={}  #will hold everything for the image
    s["filename"]=fname
    s["outdir"]=fname_outdir
    s["os_handle"]=openslide.OpenSlide(fname)
    s["image_work_size"]=1000
    s["img_mask_use"]=np.ones(getImgThumb(s,s["image_work_size"]).shape[0:2],dtype=bool)

    s["output"]=[]
    s["output"].append("filename")
    s["output"].append("outdir")



    processQueue=[]

    processQueue.append((getBasicStats,{}))
    processQueue.append((getMag,{"confirm":False}))


    processQueue.append((getTissuePercent,{"thresh":.8}))
    processQueue.append((getDarkTissuePercent, {}))
    processQueue.append((removeSmallObjects, {}))
    processQueue.append((fillSmallHoles, {}))
    processQueue.append((compareToTemplates, {"templates": ["./templates/template1.png",
                                                            "./templates/template2.png",
                                                            "./templates/template3.png"]}))
    processQueue.append((getHistogram,{"nonwhite":True}))
    processQueue.append((getContrast, {}))
    processQueue.append((getBrightness, {}))
    processQueue.append((saveImages, {}))
    processQueue.append((saveThumbnail,{"size":500}))


    s["completed"]=[]
    s["warnings"]=[]
    print "Working on:\t"+fname
    for process,process_params in processQueue:
        process(s,process_params)
        s["completed"].append(process.__name__)

    #--- done processing, now add to output report
    if(first):
        first = False
        for field in s["output"]:
            csv_report.write(field + "\t")
        csv_report.write("\n")

    for field in s["output"]:
        csv_report.write(s[field]+"\t")

    csv_report.write("|".join(s["warnings"])+"\n")
csv_report.close()



#from skimage.color import rgb2hed
#http://scikit-image.org/docs/0.13.x/auto_examples/color_exposure/plot_ihc_color_separation.html#sphx-glr-auto-examples-color-exposure-plot-ihc-color-separation-py

#skimage.color.combine_stains(stains, conv_matrix)
#QC metrics
#https://www.mathworks.com/help/images/ref/niqe.html
#https://www.mathworks.com/help/images/ref/brisque.html
#https://github.com/aizvorski/video-quality/blob/master/niqe.py

#Pen detection
#stain detection
#blurryiness
#fresh vs ffpe
#compression quality

#load config file
#refactor
#homogenise "nonwhite" parameter

# " Haematoxylin and Eosin determined by G.Landini ('H&E')\n"
# 		" Haematoxylin and Eosin determined by A.C.Ruifrok ('H&E 2')\n"
# 		" Haematoxylin and DAB ('H DAB')\n"
# 		" Haematoxylin, Eosin and DAB ('H&E DAB')\n"
# 		" Haematoxylin and AEC ('H AEC')\n"
# 		" Fast Red, Fast Blue and DAB ('FastRed FastBlue DAB')\n"
# 		" Methyl green and DAB ('Methyl Green DAB')\n"
# 		" Azan-Mallory ('Azan-Mallory')\n"
# 		" Alcian blue & Haematoxylin ('Alcian blue & H')\n"
# 		" Haematoxylin and Periodic Acid of Schiff ('H PAS')\n"
# 		" RGB subtractive ('RGB')\n"
# 		" CMY subtractive ('CMY')\n");