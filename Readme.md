# HistoQC
---

HistoQC is an open-source quality control tool for digital pathology slides

< IMAGE HERE >

# Requirements
---

Tested with Python 3.6

Requires:

1. openslide

And the following additional python package: 

1. python-openslide
2. matplotlib
3. numpy
4. scipy
5. skimage
6. sklearn



# Basic Usage
---

```  
C:\Research\code\qc>python qc_pipeline.py --help
usage: qc_pipeline.py [-h] [-o OUTDIR] [-p BASEPATH] [-c CONFIG] [-f]
                      [-b BATCH] [-n NTHREADS]
                      [input_pattern [input_pattern ...]]

positional arguments:
  input_pattern         input filename pattern (try: *.svs or
                        target_path/*.svs ), or tsv file containing list of
                        files to analyze

optional arguments:
  -h, --help            show this help message and exit
  -o OUTDIR, --outdir OUTDIR
                        outputdir, default ./output/
  -p BASEPATH, --basepath BASEPATH
                        base path to add to file names, helps when producing
                        data using existing file as input
  -c CONFIG, --config CONFIG
                        config file to use
  -f, --force           force overwriting of existing files
  -b BATCH, --batch BATCH
                        break results file into subsets of this size
  -n NTHREADS, --nthreads NTHREADS
                        number of threads to launch

```
                            
In case of errors, HistoQC can be run with the same output directory and will begin where it left off, identifying completed images by the presence of an existing directory.
                            
Afterwards, double click index.html to open front end user interface, and select results.tsv. 

This can also be done remotely, but is a bit more complex, see advanced usage.

# Advanced Usage
---

See docs [LINK]


# Citation
---
If you find this software useful, please drop me a line and/or consider citing it:

{ bibtex, ref }

