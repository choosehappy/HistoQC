# HistoQC


HistoQC is an open-source quality control tool for digital pathology slides

![screenshot](https://user-images.githubusercontent.com/9681868/40330248-a39603a2-5d4c-11e8-9d16-cc13fd9e21d4.png)

# Requirements

Tested with Python 3.7 and 3.8
Note: the  DockerFile installs Python 3.8, so if your goal is reproducibility you may want to take this into account

Requires:

1. openslide

And the following additional python package: 

1. python-openslide
2. matplotlib
3. numpy
4. scipy
5. skimage
6. sklearn
7. pytest (optional)


You can likely install the python requirements using something like (note python 3+ requirement):

pip3 install -r requirements.txt

The library versions have been pegged to the current validated ones. Later versions are likely to work but may not allow for cross-site/version reproducibility (typically a bad thing in quality control).

Openslide binaries will have to be installed separately as per individual o/s instructions

The most basic docker image can be created with the included (7-line) Dockerfile. 


# Installation
## Using docker
Docker is now the recommended method for installing and running HistoQC. Containerized runtimes like docker are more portable and avoid issues with python environment management, and ensure reproducible application behavior. Docker is available for Windows, MacOS, and Linux.

>**Note**: These instructions assume you have docker engine installed on your system. If you do not have docker installed, please see the [docker installation instructions](https://docs.docker.com/engine/install/).

1. Begin by pulling the [official HistoQC docker image](https://hub.docker.com/r/histotools/histoqc/tags) from docker hub. This repository contains the latest stable version of HistoQC and is guaranteed up-to-date.
    ```bash
    docker pull histotools/histoqc:master
    ```

1. Next, run the docker image with a few options to mount your data directory and expose the web interface on your host machine.

    ```bash
    docker run -v <local-path>:/data --name <container-name> -p <local-port>:5000 -it histotools/histoqc:master /bin/bash
    # Example:
    # docker run -v /local/datadir:/data --name my_container -p 5000:5000 -it histotools/histoqc:master /bin/bash
    ```

1. A terminal session will open inside the docker container. You can now run HistoQC as you would on a local machine. 

1. If you exit the shell, the container will stop running but no data/configuration will be lost. You can restart the container and resume your work with the following command:

    ```bash
    docker start -i <container-name>
    # Example:
    # docker start -i my_container
    ```

## Using pip
You can install HistoQC into your system by using 

```bash
git clone https://github.com/choosehappy/HistoQC.git
cd HistoQC
python -m pip install --upgrade pip  # (optional) upgrade pip to newest version
pip install -r requirements.txt      # (required) install pinned versions of packages
pip install .                        # (recommended) install HistoQC as a package
```
Note that `pip install .` will install HistoQC as a python package in your environment. If you do not want to install HistoQC as a package, you will only be able to run HistoQC from the `HistoQC` directory.

# Basic Usage

## histoqc CLI

Running the pipeline is now done via a python module:

```
C:\Research\code\HistoQC>python -m histoqc --help
usage: __main__.py [-h] [-o OUTDIR] [-p BASEPATH] [-c CONFIG] [-f] [-b BATCH]
                   [-n NPROCESSES] [--symlink TARGET_DIR]
                   input_pattern [input_pattern ...]

positional arguments:
  input_pattern         input filename pattern (try: *.svs or
                        target_path/*.svs ), or tsv file containing list of
                        files to analyze

optional arguments:
  -h, --help            show this help message and exit
  -o OUTDIR, --outdir OUTDIR
                        outputdir, default ./histoqc_output_YYMMDD-hhmmss
  -p BASEPATH, --basepath BASEPATH
                        base path to add to file names, helps when producing
                        data using existing output file as input
  -c CONFIG, --config CONFIG
                        config file to use
  -f, --force           force overwriting of existing files
  -b BATCH, --batch BATCH
                        break results file into subsets of this size
  -n NPROCESSES, --nprocesses NPROCESSES
                        number of processes to launch
  --symlink TARGET_DIR  create symlink to outdir in TARGET_DIR

```

Installed or simply git-cloned, a typical command line for running the tool thus looks like:

```bash
python -m histoqc -c v2.1 -n 3 "*.svs"
```

which will use 3 process to operate on all svs files using the named configuration file config_v2.1.ini from the config directory.

In case of errors, HistoQC can be run with the same output directory and will begin where it left off, identifying completed images by the presence of an existing directory.

## histoqc.config CLI
Supplied configuration files can be viewed and modified like so:

```

C:\Research\code\HistoQC>python -m histoqc.config --help
usage: __main__.py [-h] [--list] [--show NAME]

show example config

optional arguments:
  -h, --help   show this help message and exit
  --list       list available configs
  --show NAME  show named example config
```



Alternatively one can specify their own modified config file using an absolute or relative filename:

```bash
python -m histoqc.config --show light > mylight.ini
python -m histoqc -c ./mylight.ini -n 3 "*.svs"
```

## histoqc.ui CLI

HistoQC now has a httpd server which allows for improved result viewing, it can be accessed like so:

```
C:\Research\code\HistoQC>python -m histoqc.ui --help
usage: histoqc.ui [-h] [--port PORT] resultsfilepath

launch server for result viewing in user interface

positional arguments:
  resultsfilepath       Specify the full path to the results file. The user must specify this path.

optional arguments:
  -h, --help            show this help message and exit
  --port PORT, -p PORT  Specify the port [default:5000]
```

After completion of slide processing, view results in your web-browser by running the following command:

```bash
python -m histoqc.ui <results-file-path>
# Example:
# python -m histoqc.ui ./histoqc_output_YYMMDD-hhmmss/results.tsv
```
>**Note**: The results file is a tab-separated file generated by HistoQC containing the quality control metrics for each slide. HistoQC generates the results file in the output directory specified by the `-o` flag, or formatted as `histoqc_output_YYMMDD-hhmmss` by default.

You may then navigate to `http://<hostname>:5000` in your web browser to view the results.

# Configuration modifications


HistoQC's performance is significantly improved if you select an appropriate configuration file as a starting point and modify it to suit your specific use case.

If you would like to see a list of provided config files to start you off, you can type

```bash
python -m histoqc.config --list
```

and then you can select one and write it to file like so for your modification and tuning:

```bash
python -m histoqc.config --show ihc > myconfig_ihc.ini
```



# Advanced Usage



See [wiki](https://github.com/choosehappy/HistoQC/wiki)


# Notes

Information from HistoQC users appears below:

1. the new Pannoramic 1000 scanner, objective-magnification is given as 20, when a 20x objective lense and a 2x aperture boost is used, i.e. image magnification is actually 40x. While their own CaseViewer somehow determines that a boost exists and ends up with 40x when objective-magnification in Slidedat.ini is at 20, openslide and bioformats give 20x.

1.1. When converted to svs by CaseViewer, the MPP entry in ImageDescription meta-parameter give the average of the x and y mpp. Both values are slightly different for the new P1000 and can be found in meta-parameters of svs as tiff.XResolution and YResolution inverse values, so have to be converted, also respecting ResolutionUnit as centimeter or inch



# Citation

If you find this software useful, please drop me a line and/or consider citing it:

"HistoQC: An Open-Source Quality Control Tool for Digital Pathology Slides", Janowczyk A., Zuo R., Gilmore H., Feldman M., Madabhushi A., JCO Clinical Cancer Informatics, 2019

Manuscript available [here](http://www.andrewjanowczyk.com/histoqc-an-open-source-quality-control-tool-for-digital-pathology-slides/)

“Assessment of a computerized quantitative quality control tool for kidney whole slide image biopsies”, Chen Y., Zee J., Smith A., Jayapandian C., Hodgin J., Howell D., Palmer M., Thomas D., Cassol C., Farris A., Perkinson K., Madabhushi A., Barisoni L., Janowczyk A., Journal of Pathology, 2020 

Manuscript available [here](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8392148/)
