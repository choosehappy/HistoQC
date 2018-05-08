import logging
import os
import errno
import glob
import argparse
import configparser
import shutil
import matplotlib as mpl  # need to do this before anything else tries to access
import multiprocessing, logging
from importlib import import_module
import warnings
import BaseImage
import sys
import datetime

# --- setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

file = logging.FileHandler(filename="error.log")
file.setLevel(logging.WARNING)
file.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.getLogger('').addHandler(file)

# --- setup plotting backend
if os.name != "nt" and os.environ.get('DISPLAY', '') == '':
    logging.info('no display found. Using non-interactive Agg backend')
    mpl.use('Agg')
else:
    mpl.use('TkAgg')

import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

# ---Setup globals for output
batch = 1
nfiledone = 0
csv_report = None
first = True
failed = []
headers = []


# --- setup worker functions
def worker(filei, nfiles, fname, args, lconfig, processQueue, lock, shared_dict):
    fname_outdir = args.outdir + os.sep + os.path.basename(fname)
    # fname_outdir = fname_outdir.replace("lnk.", "")
    if os.path.isdir(fname_outdir):  # directory exists
        if (args.force):  # remove entirey directory to ensure no old files are present
            shutil.rmtree(fname_outdir)
        else:  # otherwise skip it
            logging.warning(
                f"{fname} already seems to be processed (output directory exists), skipping. To avoid this behavior use --force")
            return
    makeDir(fname_outdir)

    logging.info(f"-----Working on:\t{fname}\t\t{filei+1} of {nfiles}")
    try:
        s = BaseImage.BaseImage(fname, fname_outdir, dict(lconfig.items("BaseImage.BaseImage")))

        for process, process_params in processQueue:
            process_params["lock"] = lock
            process_params["shared_dict"] = shared_dict
            process(s, process_params)
            s["completed"].append(process.__name__)
    except Exception as e:
        e.args += (fname, str(e.__traceback__.tb_next.tb_frame.f_code))
        raise e

    s["os_handle"] = None  # need to get rid of handle because it can't be pickled
    return s


def worker_callback(s):
    if s is None:
        return

    global csv_report, batch, first, nfiledone

    if nfiledone and nfiledone % args.batch == 0:
        csv_report.close()
        batch += 1
        csv_report = open(args.outdir + os.sep + "results_" + str(batch) + ".tsv", overwrite_flag, buffering=1)
        first = True

    if first and overwrite_flag == "w":  # add headers to output file, don't do this if we're in append mode
        first = False

        csv_report.write("\n".join(["#" + s for s in headers])+"\n")
        csv_report.write("#dataset:"+"\t".join(s["output"])+"warnings\n") #always add warnings field last

    csv_report.write("\t".join([s[field] for field in s["output"]])+"|".join(s["warnings"]) + "\n")

    csv_report.flush()
    nfiledone += 1


def worker_error(e):
    fname = e.args[1]
    # func = e.args[2]
    func = ""
    err_string = " ".join((str(e.__class__), e.__doc__, str(e), func))
    err_string = err_string.replace("\n", " ")
    logging.error(f"{fname} - \t{func} - Error analyzing file (skipping): \t {err_string}")
    failed.append((fname, err_string))


def load_pipeline(lconfig):
    lprocessQueue = []
    in_main = multiprocessing.current_process()._identity == ()
    if (in_main):
        logging.info("Pipeline will use these steps:")
    steps = lconfig.get('pipeline', 'steps').splitlines()
    headers.append("pipeline: "+" ".join(steps))
    for process in steps:
        mod_name, func_name = process.split('.')
        if (in_main):
            logging.info(f"\t\t{mod_name}\t{func_name}")
        try:
            mod = import_module(mod_name)
        except:
            raise NameError("Unknown module in pipeline from config file:\t %s" % mod_name)

        try:
            func_name = func_name.split(":")[0]  # take base of function name
            func = getattr(mod, func_name)
        except:
            raise NameError(
                "Unknown function from module in pipeline from config file: \t%s \t in \t %s" % (mod_name, func_name))

        if lconfig.has_section(process):
            params = dict(lconfig.items(process))
        else:
            params = {}

        lprocessQueue.append((func, params))
    return lprocessQueue


def makeDir(path):
    try:
        os.makedirs(path)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise


if __name__ == '__main__':

    manager = multiprocessing.Manager()
    lock = manager.Lock()
    shared_dict = manager.dict()
    headers.append(f"start_time:\t{datetime.datetime.now()}")
    parser = argparse.ArgumentParser(description='')
    parser.add_argument('input_pattern',
                        help="input filename pattern (try: *.svs or target_path/*.svs ), or tsv file containing list of files to analyze",
                        nargs="*")
    parser.add_argument('-o', '--outdir', help="outputdir, default ./histoqc_output", default="./histoqc_output/", type=str)
    parser.add_argument('-p', '--basepath',
                        help="base path to add to file names, helps when producing data using existing output file as input",
                        default="", type=str)
    parser.add_argument('-c', '--config', help="config file to use", type=str)
    parser.add_argument('-f', '--force', help="force overwriting of existing files", action="store_true")
    parser.add_argument('-b', '--batch', help="break results file into subsets of this size", type=int,
                        default=float("inf"))
    parser.add_argument('-n', '--nthreads', help="number of threads to launch", type=int, default=1)
    parser.add_argument('-s', '--symlinkoff', help="turn OFF symlink creation", action="store_true")

    if len(sys.argv) == 1:
        parser.print_help(sys.stderr)
        sys.exit(1)

    args = parser.parse_args()

    config = configparser.ConfigParser()

    if args.config is None:
        args.config=os.path.dirname(os.path.realpath(__file__))+"/config.ini"
        logging.warning(f"Configuration file not set (--config), using default: {args.config}")

    config.read(args.config)

    processQueue = load_pipeline(config)
    if args.nthreads > 1:
        pool = multiprocessing.Pool(processes=args.nthreads, initializer=load_pipeline,
                                    initargs=(config,))  # start worker processes
    logging.info("----------")
    # make output directory and create report file
    makeDir(args.outdir)
    headers.append(f"outdir:\t{os.path.realpath(args.outdir)}")
    headers.append(f"config_file:\t{os.path.realpath(args.config)}")
    headers.append(f"command_line_args:\t{' '.join(sys.argv)}")

    if len(glob.glob(args.outdir + os.sep + "results*.tsv")) > 0:
        if (args.force):
            logging.info("Previous run detected....overwriting (--force set)")
            overwrite_flag = "w"
        else:
            logging.info("Previous run detected....skipping completed (--force not set)")
            overwrite_flag = "a"
    else:
        overwrite_flag = "w"

    if (args.batch != float("inf")):
        csv_report = open(args.outdir + os.sep + "results_" + str(batch) + ".tsv", overwrite_flag, buffering=1)
    else:
        csv_report = open(args.outdir + os.sep + "results.tsv", overwrite_flag, buffering=1)

    # get list of files, there are 3 options:
    files = []
    basepath = args.basepath  #
    basepath = basepath + os.sep if len(
        basepath) > 0 else ""  # if the user supplied a different basepath, make sure it ends with an os.sep
    if len(args.input_pattern) > 1:  # bash has sent us a list of files
        files = args.input_pattern
    elif args.input_pattern[0].endswith("tsv"):  # user sent us an input file
        # load first column here and store into files
        with open(args.input_pattern[0], 'r') as f:
            for line in f:
                if line[0] == "#":
                    continue
                files.append(basepath + line.split("\t")[0])
    else:  # user sent us a wildcard, need to use glob to find files
        files = glob.glob(args.basepath + args.input_pattern[0])

    logging.info(f"Number of files detected by pattern:\t{len(files)}")

    # now do analysis of files
    for filei, fname in enumerate(files):
        fname = os.path.realpath(fname)

        if args.nthreads > 1:
            res = pool.apply_async(worker,
                                   args=(filei, len(files), fname, args, config, processQueue, lock, shared_dict),
                                   callback=worker_callback, error_callback=worker_error)
        else:
            try:
                s = worker(filei, len(files), fname, args, config, processQueue, lock, shared_dict)
                worker_callback(s)
            except Exception as e:
                worker_error(e)
                continue

    if args.nthreads > 1:
        pool.close()
        pool.join()

    csv_report.close()

    logging.info("------------Done---------\n")
    logging.info("These images failed (available also in error.log), warnings are listed in warnings column in output:")

    for fname, error in failed:
        logging.info(f"{fname}\t{error}")

    if not args.symlinkoff:
        try:
            os.symlink(os.path.realpath(args.outdir),
                       os.path.dirname(os.path.realpath(__file__)) + "/UserInterface/Data/" + args.outdir,
                       target_is_directory=True)
        except FileExistsError:
            pass

        logging.info("Symlink to output directory created")

    logging.shutdown()
    shutil.copy("error.log",
                args.outdir + os.sep + "error.log")  # copy error log to output directory. tried move but the filehandle is never released by logger no matter how hard i try

