import os
import errno
import glob
import argparse
import configparser
import shutil
import matplotlib as mpl  # need to do this before anything else tries to access

if os.name != "nt" and os.environ.get('DISPLAY', '') == '':
    print('no display found. Using non-interactive Agg backend')
    mpl.use('Agg')
else:
    mpl.use('TkAgg')

import matplotlib.pyplot as plt

from importlib import import_module
import warnings

warnings.filterwarnings("ignore")

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
parser.add_argument('-f', '--force', help="force overwriting of existing files", action="store_true")
parser.add_argument('-b', '--batch', help="break results file into subfiles of this size", type=int,
                    default=float("inf"))
args = parser.parse_args()

config = configparser.ConfigParser()
config.read(args.config)

processQueue = []
print("Pipeline will use these steps:")
for process in config.get('pipeline', 'steps').splitlines():
    mod_name, func_name = process.split('.')
    print(f"\t\t{mod_name}\t{func_name}")
    try:
        mod = import_module(mod_name)
    except:
        raise NameError("Unknown module in pipeline from config file:\t %s" % mod_name)

    try:
        func_name=func_name.split(":")[0] #take base of function name
        func = getattr(mod, func_name)
    except:
        raise NameError(
            "Unknown function from module in pipeline from config file: \t%s \t in \t %s" % (mod_name, func_name))

    if config.has_section(process):
        params = dict(config.items(process))
    else:
        params = {}

    processQueue.append((func, params))

print("----------")
# make output directory and create report file
makeDir(args.outdir)

if len(glob.glob(args.outdir + os.sep + "results*.tsv")) > 0:
    if (args.force):
        print("Previous run detected....overwriting (--force set)")
        overwrite_flag = "w"
    else:
        print("Previous run detected....skipping completed (--force not set)")
        overwrite_flag = "a"
else:
    overwrite_flag = "w"

if (args.batch != float("inf")):
    batch = 1
    csv_report = open(args.outdir + os.sep + "results_" + str(batch) + ".tsv", overwrite_flag, buffering=1)
else:
    csv_report = open(args.outdir + os.sep + "results.tsv", overwrite_flag, buffering=1)

error_report = open(args.outdir + os.sep + "error.log", overwrite_flag, buffering=1)

first = True
files = glob.glob(args.input_pattern)
failed = []
for filei, fname in enumerate(files):
    fname_outdir = args.outdir + os.sep + os.path.basename(fname)
    if os.path.isdir(fname_outdir):  # directory exists
        if (args.force):  # remove entirey directory to ensure no old files are present
            shutil.rmtree(fname_outdir)
        else:  # otherwise skip it
            print(fname,
                  " already seems to be processed (output directory exists), skipping. To avoid this behavior use "
                  "--force")
        continue
    makeDir(fname_outdir)

    print(f"-----Working on:\t{fname}\t\t{filei} of {len(files)}")
    try:
        s = BaseImage.BaseImage(fname, fname_outdir)
        s["error_report"] = error_report  # so that other plugins can write to it if desired

        for process, process_params in processQueue:
            process(s, process_params)
            s["completed"].append(process.__name__)

        # --- done processing, now add to output report
        if (filei and filei % args.batch == 0):
            csv_report.close()
            batch += 1
            csv_report = open(args.outdir + os.sep + "results_" + str(batch) + ".tsv", overwrite_flag, buffering=1)
            first = True

        if first and overwrite_flag == "w":  # add headers to output file, don't do this if we're in append mode
            first = False
            for field in s["output"]:
                csv_report.write(field + "\t")
            csv_report.write("\n")

        for field in s["output"]:
            csv_report.write(s[field] + "\t")

        csv_report.write("|".join(s["warnings"]) + "\n")
    except Exception as e:
        err_string = " ".join((str(e.__class__), e.__doc__, str(e)))
        print("--->Error analyzing file (skipping):\t", fname)
        print("--->Error was ", err_string)
        failed.append((fname, err_string))
        error_report.write(f"Error working on file: {fname}\t{str(e)}")
        continue


csv_report.close()
error_report.close()

print("------------Done---------\n")
print("These images failed (available also in error.log):")
for fname, error in failed:
    print(fname, error, sep="\t")

# skimage.color.combine_stains(stains, conv_matrix)
# QC metrics
# https://www.mathworks.com/help/images/ref/niqe.html
# https://www.mathworks.com/help/images/ref/brisque.html
# https://github.com/aizvorski/video-quality/blob/master/niqe.py

# Pen detection
# stain detection
# blurryiness
# fresh vs ffpe
# compression quality
# slide thickness


# from skimage.color import rgb2hed
# http://scikit-image.org/docs/0.13.x/auto_examples/color_exposure/plot_ihc_color_separation.html#sphx-glr-auto-examples-color-exposure-plot-ihc-color-separation-py

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
