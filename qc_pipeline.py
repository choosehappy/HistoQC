import os
import errno
import glob
import argparse
import ConfigParser

from importlib import import_module

import BaseImage

def makeDir(path):
    try:
        os.makedirs(path)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise

parser = argparse.ArgumentParser(description='')
parser.add_argument('input_pattern', help="input filename pattern (try: '*.svs')")
parser.add_argument('-o', '--outdir', help="outputdir, default ./output/", default="output", type=str)
parser.add_argument('-c', '--config', help="config file to use", default="./config.ini", type=str)
args = parser.parse_args()

config = ConfigParser.ConfigParser()
config.read(args.config)

processQueue = []
for process in config.get('pipeline','steps').splitlines():
    mod_name, func_name = process.split('.')
    try:
        mod = import_module(mod_name)
    except:
        raise NameError("Unknown module in pipeline from config file:\t %s" % mod_name)

    try:
        func = getattr(mod, func_name)
    except:
        raise NameError("Unknown function from module in pipeline from config file: \t%s \t in \t %s" % (mod_name, func_name))

    if config.has_section(process):
        params=dict(config.items(process))
    else:
        params={}

    processQueue.append((func,params))


# make output directory and create report file
makeDir(args.outdir)
csv_report = open(args.outdir + os.sep + "results.tsv", "w")

first=True
files = glob.glob(args.input_pattern)
for fname in files:
    fname_outdir = args.outdir + os.sep + os.path.basename(fname)
    makeDir(fname_outdir)

    s = BaseImage.BaseImage( fname , fname_outdir)

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
#slide thickness


#from skimage.color import rgb2hed
#http://scikit-image.org/docs/0.13.x/auto_examples/color_exposure/plot_ihc_color_separation.html#sphx-glr-auto-examples-color-exposure-plot-ihc-color-separation-py

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