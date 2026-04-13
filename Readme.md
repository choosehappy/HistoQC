# HistoQC

HistoQC is an open-source quality control tool for digital pathology slides. It applies a configurable pipeline of image-analysis modules to whole-slide images (WSIs) in order to automatically detect common artifacts (blur, pen markings, tissue folds, air bubbles, etc.), compute quality metrics, and produce visual output masks that flag problematic regions—giving you an at-a-glance view of slide quality before downstream analysis.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [Using Docker (recommended)](#using-docker-recommended)
  - [Using pip](#using-pip)
- [Running HistoQC](#running-histoqc)
  - [Basic usage](#basic-usage)
  - [CLI reference](#cli-reference)
- [Configuring HistoQC](#configuring-histoqc)
  - [Listing and exporting built-in configs](#listing-and-exporting-built-in-configs)
  - [Config CLI reference](#config-cli-reference)
  - [Pipeline philosophy](#pipeline-philosophy)
  - [Pipeline module order](#pipeline-module-order)
  - [Pipeline image size](#pipeline-image-size)
- [Available Modules](#available-modules)
- [Classification Modules](#classification-modules)
- [Extending HistoQC](#extending-histoqc)
- [Suggested Workflow](#suggested-workflow)
- [Viewing Results](#viewing-results)
  - [Basic usage](#basic-usage-1)
  - [UI CLI reference](#ui-cli-reference)
- [Final Notes](#final-notes)

---

## Features

- Modular, configurable quality-control pipeline for WSIs (SVS, NDPI, SCN, and other OpenSlide-supported formats)
- Detects blur, pen markings, tissue folds, air bubbles, coverslip edges, and more
- Computes brightness, contrast, color histograms, stain deconvolution metrics, and texture features
- Outputs per-slide TSV metrics and overlay PNG masks
- Interactive web UI with parallel-coordinates filtering for cohort-level review
- Multi-process execution for large cohorts
- Docker image available for reproducible, dependency-free deployment

---

## Installation

### Using Docker (recommended)

Docker is the recommended method. It avoids Python environment issues and ensures reproducible behavior. Docker is available for Windows, macOS, and Linux ([installation instructions](https://docs.docker.com/engine/install/)).

```bash
docker run -v <local-path>:/data --name <container-name> -p <local-port>:5000 -it histotools/histoqc:master /bin/bash
# Example:
# docker run -v /local/datadir:/data --name my_container -p 5000:5000 -it histotools/histoqc:master /bin/bash
```

Your terminal will open a bash shell inside the container. Proceed with the commands in [Running HistoQC](#running-histoqc).

### Using pip

For development or customization you can install directly from source.

1. **Clone the repository**

   ```bash
   git clone https://github.com/choosehappy/HistoQC.git
   cd HistoQC
   ```

2. **(Optional) Create a virtual environment**

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install HistoQC**

   ```bash
   pip install .
   ```

4. **Verify the installation**

   ```bash
   histoqc --help
   ```

---

## Running HistoQC

### Basic usage

```bash
histoqc -c v2.1 -n 3 "*.svs"
```

This runs the built-in `v2.1` configuration on all `.svs` files in the current directory using 3 parallel worker processes.

### CLI reference

```
usage: histoqc [-h] [-o OUTDIR] [-p BASEPATH] [-c CONFIG] [-f] [-b BATCH]
               [-s SEED] [-n NPROCESSES] [--symlink TARGET_DIR] [--debug]
               input_pattern [input_pattern ...]

Run HistoQC main quality control pipeline for digital pathology images

positional arguments:
  input_pattern         Input filename pattern (e.g. *.svs or
                        target_path/*.svs), or a TSV file containing a list
                        of files to analyze.

optional arguments:
  -o, --outdir          Output directory (default: ./histoqc_output_YYMMDD-hhmmss)
  -p, --basepath        Base path prepended to filenames; useful when
                        re-running from an existing results file
  -c, --config          Config file to use — either a built-in name (e.g.
                        v2.1) or a path to a custom .ini file
  -f, --force           Force overwriting of existing output files
  -b, --batch           Split the results file into subsets of this size
  -s, --seed            Random seed used across all modules
  -n, --nprocesses      Number of parallel worker processes (default: 1)
  --symlink TARGET_DIR  Create a symlink to the output directory inside
                        TARGET_DIR
  --debug               Enable debugging behavior
```

---

## Configuring HistoQC

### Listing and exporting built-in configs

HistoQC ships with several ready-to-use configuration files. You can list them and export a copy to customize:

```bash
# List available built-in configs
histoqc.config --list

# Export a config to a local file for customization
histoqc.config --show v2.1 > myconfig.ini

# Then run HistoQC with the custom config
histoqc -c ./myconfig.ini -n 3 "*.svs"
```

### Config CLI reference

```
usage: histoqc.config [-h] [--list] [--show NAME]

Show example configuration files

optional arguments:
  --list        List available built-in configs
  --show NAME   Print the named built-in config to stdout
```

### Pipeline philosophy

HistoQC applies a sequence of modules to each image. When a slide is first loaded, every pixel is marked as valid (the internal `img_mask_use` mask is all-true). Each subsequent module can refine that mask—removing background, flagging artifacts, etc.

Because later modules operate only on pixels that earlier modules have accepted, **the order of steps in the pipeline matters**. Most modules honour a `limit_to_mask` parameter that restricts computation to the currently accepted region. For example, placing `HistogramModule.getHistogram` after `LightDarkModule.getIntensityThresholdPercent:tissue` ensures histograms are computed only over tissue, not white background.

### Pipeline module order

The pipeline is defined in a `.ini` file using Python's [configparser](https://docs.python.org/3/library/configparser.html) syntax. The only required section is `[pipeline]`, which lists steps in order:

```ini
[pipeline]
steps= BasicModule.getBasicStats
    BasicModule.getMag
    ClassificationModule.byExampleWithFeatures:pen_markings
    ClassificationModule.byExampleWithFeatures:coverslip_edge
    LightDarkModule.getIntensityThresholdPercent:tissue
    LightDarkModule.getIntensityThresholdPercent:darktissue
    MorphologyModule.removeSmallObjects
    MorphologyModule.fillSmallHoles
    BlurDetectionModule.identifyBlurryRegions
    BasicModule.finalProcessingSpur
    BasicModule.finalProcessingArea
    HistogramModule.compareToTemplates
    HistogramModule.getHistogram
    BrightContrastModule.getContrast
    BrightContrastModule.getBrightness
    DeconvolutionModule.seperateStains
    SaveModule.saveFinalMask
    SaveModule.saveThumbnail
    BasicModule.finalComputations
```

The same module function can appear multiple times under different instance names (separated by a colon), each with its own configuration section. For example, `getIntensityThresholdPercent:tissue` removes white background while `getIntensityThresholdPercent:darktissue` flags very dark (folded/over-stained) regions.

Each named instance can have a corresponding `[Module.function:instance]` section elsewhere in the file that supplies its parameters.

### Pipeline image size

The `[BaseImage]` section's `image_work_size` parameter controls the resolution at which modules process each slide. A default of `1.25x` (apparent magnification) is recommended:

| Value | Interpretation |
|---|---|
| Float between 0 and 1 | Downscale factor applied to the full image |
| Integer < 100 | OpenSlide pyramid level (0 = full resolution) |
| Integer ≥ 100 | Exact longest-dimension in pixels (may vary across images) |
| `1.25x` (string) | Target apparent magnification; tiles are loaded and merged to minimise memory usage |

> **Note:** Loading unnecessarily large images can exhaust available memory. The `1.25x` mode is the safest default for most cohorts.

---

## Available Modules

| Module file | Operation | Description |
|---|---|---|
| `BasicModule.py` | `getBasicStats` | Extracts metadata from the image header |
| | `getMag` | Reads the base magnification (required by HistoQC) |
| | `finalComputations` | Computes the final pixel count of the accepted mask |
| | `finalProcessingSpur` | Removes small spurious arms from the final mask |
| | `finalProcessingArea` | Removes isolated tissue islands from the final mask |
| `LightDarkModule.py` | `getIntensityThresholdOtsu` | Thresholds the image using Otsu's method |
| | `getIntensityThresholdPercent` | Thresholds using user-supplied intensity bounds; good for tissue/background and fold detection |
| `MorphologyModule.py` | `removeSmallObjects` | Removes small noise objects (dust, pixelation artifacts) from the mask |
| | `fillSmallHoles` | Fills lumen spaces and small holes that are incorrectly excluded |
| `BlurDetectionModule.py` | `identifyBlurryRegions` | Detects blurry regions via a Laplacian filter |
| `HistogramModule.py` | `getHistogram` | Produces an RGB-space histogram image |
| | `compareToTemplates` | Compares the slide histogram to user-supplied template images |
| `DeconvolutionModule.py` | `seperateStains` | Performs stain deconvolution using scikit-image built-in matrices |
| `BrightContrastModule.py` | `getBrightnessGray` | Average grayscale brightness of the accepted region |
| | `getBrightnessByChannelinColorSpace` | Per-channel brightness triplet in a configurable colour space |
| | `getContrast` | Computes RMS and Michelson contrast metrics |
| `ClassificationModule.py` | `pixelWise` | Applies an RGB-based pixel classifier from a user-supplied TSV |
| | `byExampleWithFeatures` | Trains a classifier from exemplar image/mask pairs; ideal for pen marks, cracks, coverslip edges |
| `SaveModule.py` | `saveFinalMask` | Saves the output mask and its overlay on the original thumbnail |
| | `saveThumbnail` | Saves thumbnails required by the web UI |
| `AnnotationModule.py` | `xmlMask` | Loads an Aperio XML annotation to restrict processing to regions of interest |
| `BubbleRegionByRegion.py` | `roiWise` | Detects air-bubble contour lines; demonstrates tile-wise high-magnification processing |
| `PenMarkingModule.py` | `identifyPenMarking` | *Deprecated* — use `ClassificationModule.pixelWise` instead |
| `LocalTextureEstimationModule.py` | `estimateGreyComatrixFeatures` | Estimates grey co-occurrence matrix (GLCM) texture features over random patches |

---

## Classification Modules

The `ClassificationModule.byExampleWithFeatures` operation is the most powerful artifact-detection tool in HistoQC. It works in two stages:

**1. Provide exemplar images**

Each exemplar consists of an original image paired with a binary mask (pixels = 1 are the *positive* class):

```ini
examples: ./pen/pen_green.png:./pen/pen_green_mask.png
          ./pen/pen_red.png:./pen/pen_red_mask.png
```

Exemplars should be at the same magnification as `image_work_size` for best results.

**2. Choose pixel features**

Additional texture features (from `skimage.filters`) can augment the RGB space for the classifier:

```ini
features: frangi
          laplace
          rgb
          # lbp
          # gabor
          # median
          # gaussian
```

Feature-specific parameters use the feature name as a prefix (e.g., `frangi_black_ridges: True`).

A single classifier model is trained and shared across all threads. The raw output is a probability map; set `thresh` to convert it to a binary mask used downstream.

---

## Extending HistoQC

HistoQC is designed to be extended by adding new Python module files.

**Naming:** The file name describes the module class (e.g., `HistogramModule.py`); individual operations are functions inside the file (e.g., `compareToTemplates`). Register the new step in `[pipeline]` as `HistogramModule.compareToTemplates`.

**Function signature:** Every pipeline function receives exactly two arguments:

```python
def myFunction(s, params):
    ...
```

- **`params`** — a dictionary of the parameters specified in the config section for this step. Always use `.get()` with a default and explicit cast:

  ```python
  thresh = float(params.get("threshold", 0.5))
  ```

- **`s`** — a `BaseImage` instance (dictionary-like) that is shared across the entire pipeline for a single slide. Key fields:

  | Key | Description |
  |---|---|
  | `s["warnings"]` | Append warning strings; they appear in the TSV `warnings` column |
  | `s["filename"]` | Slide filename |
  | `s["outdir"]` | Per-slide output directory |
  | `s["os_handle"]` | Pre-opened OpenSlide handle |
  | `s["image_work_size"]` | Default working image size |
  | `s["img_mask_use"]` | Current accepted-pixel binary mask |
  | `s["seed"]` | RNG seed |
  | `s["comments"]` | Free-text comments column in the TSV |
  | `s["completed"]` | List of completed module names (for prerequisite checks) |

  Key methods:

  | Method | Description |
  |---|---|
  | `s.addToPrintList(name, val)` | Adds a named value to the output TSV and web UI |
  | `s.getImgThumb(dim)` | Returns (and caches) a NumPy array of the slide at the requested size |

**Saving output images:**

```python
import os
from skimage import io
import numpy as np

io.imsave(s["outdir"] + os.sep + s["filename"] + "_MyMask.png",
          mask.astype(np.uint8) * 255)
```

To make the new image type appear in the web UI, add its suffix to the `DEFAULT_IMAGE_EXTENSIONS` list in `global_config.js`.

---

## Suggested Workflow

1. **Initial scan** — run HistoQC on all slides with a minimal pipeline (e.g., `config_first.ini`) to discover variation in magnification, staining, and number of pyramid levels.

2. **Split into sub-cohorts** — use the web UI's parallel-coordinates view to filter and group slides by magnification, stain intensity, etc. Click **Save Filtered** to export a subset TSV.

3. **Full-pipeline run** — rerun HistoQC on each sub-cohort with a complete configuration appropriate for that group (e.g., `config.ini` for 40× H&E slides).

4. **Review masks** — use the **Compare** drop-down in the UI and select `_fuse.png` to view original slides side-by-side with their output masks.

5. **Handle errors** — slides that failed (e.g., out of memory) will be missing their thumbnail file. Delete their output directories and rerun:

   ```bash
   # Example: find slides missing thumbnails and remove their output directories
   for dir in */; do
     fname="${dir%/}"
     if [ ! -f "${dir}${fname}_thumb.png" ]; then
       echo "Re-running: $fname"
       rm -rf "$dir"
     fi
   done
   ```

> **Tip:** Config file paths are relative to the *working directory* when HistoQC is launched, not to the repository root. Use absolute paths or run HistoQC from the repository directory.

---

## Viewing Results

### Basic usage

After processing completes, launch the built-in web server:

```bash
histoqc.ui <path-to-results-file>
```

Then open `http://<hostname>:5000` in your browser.

### UI CLI reference

```
usage: histoqc.ui [-h] [--port PORT] resultsfilepath

Launch server for result viewing in user interface

positional arguments:
  resultsfilepath   Full path to the results TSV file produced by histoqc

optional arguments:
  -p, --port        Port to listen on (default: 5000)
```

---

## Final Notes

- Config file paths are **relative to the working directory**, not to the HistoQC install directory. Use absolute paths, or run `histoqc` from the repository root with remote paths as input.
- The provided example configuration files (e.g., `config.ini`, `config_ihc.ini`) are intentionally comprehensive to demonstrate available functionality. For production use, include only the modules relevant to your cohort.
- When using `ClassificationModule.byExampleWithFeatures`, supply exemplar images at the same magnification as `image_work_size` to maximise classifier performance.
- For large cohorts, setting `in_memory_compression = True` in `[BaseImage]` can reduce per-image memory usage by ~10×, enabling higher thread counts and better throughput.

For the full online documentation visit [https://histoqc.readthedocs.io/](https://histoqc.readthedocs.io/).
