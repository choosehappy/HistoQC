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
usage: qc_pipeline.py [-h] [-o OUTDIR] [-c CONFIG] [-f] [-b BATCH]
                      [-n NTHREADS]
                      input_pattern

positional arguments:
  input_pattern         input filename pattern (try: '*.svs')

optional arguments:
  -h, --help            show this help message and exit
  -o OUTDIR, --outdir OUTDIR
                        outputdir, default ./output/
  -c CONFIG, --config CONFIG
                        config file to use
  -f, --force           force overwriting of existing files
  -b BATCH, --batch BATCH
                        break results file into subsets of this size
  -n NTHREADS, --nthreads NTHREADS
                        number of threads to launch
```
                            
In case of errors, HistoQC can be run with the same output directory and will begin where it left off, identifying completed images by the presence of an existing directory.
                            
Afterwards, double click index.html to open front end user interface, and select results.tsv

# Advanced Usage
---

See docs [LINK]


# Citation
---
If you use this software, please consider citing it:

{ bibtex, ref }

