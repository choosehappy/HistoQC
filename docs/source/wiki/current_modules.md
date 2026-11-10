# Current modules

| File module                     | Operations                         | Description                                                                                                                                                                                                                                                                  |
| ------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MorphologyModule.py             | removeSmallObjects                 | "Remove small items from the image. This is typically done for reducing small pixilar noise, dust, etc"                                                                                                                                                                      |
|                                 | fillSmallHoles                     | "Fill in small/medium sized ""holes"" in images. For example, lumen spaces in tubules often are detected as background and removed from the final mask. This module will fill them in."                                                                                      |
| LightDarkModule.py              | getIntensityThresholdOtsu          | Thresholds the image based on dynamic Otsu threshold                                                                                                                                                                                                                         |
|                                 | getIntensityThresholdPercent       | Thresholds the image based on user supplied values. This is good for detecting where the issue is on the slide (non-white) and where folded tissue may be (very dark)                                                                                                        |
| HistogramModule.py              | getHistogram                       | Makes a histogram image in rgb space                                                                                                                                                                                                                                         |
|                                 | compareToTemplates                 | Compares the image's histogram to template images provided by the user                                                                                                                                                                                                       |
| DeconvolutionModule.py          | seperateStains                     | Performs stain deconvolution using skimage's built in matricies                                                                                                                                                                                                              |
| ClassificationModule.py         | pixelWise                          | Applies an RGB based classifier to the image whose values come from a user inputed TSV                                                                                                                                                                                       |
|                                 | byExampleWithFeatures              | "Computes features of template images provided by the user which have associated binary masks indicating positive and negative classes. Trained classifier is then used on images. Excellent for, e.g., pen detection (with texture) , cracks, etc"                          |
| BubbleRegionByRegion.py         | roiWise                            | Detect contours of lines of airbubbles on slide. Contains exemplar of how to use HistoQC to iteratively loop over very large images at high mag. (work in progress)                                                                                                          |
| BrightContrastModule.py         | getBrightnessGray                  | "Computes the average value of the image in gray colorspace, which ultimately represents how bright the image is perceived"                                                                                                                                                  |
|                                 | getBrightnessByChannelinColorSpace | Computes a triplet (one per color channel) in the desired color space. Useful for detecting outliers                                                                                                                                                                         |
|                                 | getContrast                        | Computes both RMS and Michelson contrast metrics                                                                                                                                                                                                                             |
| PenMarkingModule.py             | identifyPenMarking                 | "Identities pen markings on a pixel by pixel basis by using user supplied tsv file of color values. This is usually suitable when the marking is very different from the staining (e.g., green/blue marker on pink tissue). DEPRECATED - Use ClassificationModule PixelWise" |
| BlurDetectionModule.py          | identifyBlurryRegions              | Uses a laplace matrix to determine which regions in the image are likely blurry                                                                                                                                                                                              |
| BasicModule.py                  | getBasicStats                      | Pulls out metadata from image header                                                                                                                                                                                                                                         |
|                                 | getMag                             | Pulls out base magnification. This is required by HistoQC. In the future we'll add ability to predict magnification                                                                                                                                                          |
|                                 | finalComputations                  | Computes the final number of pixels available in the output image. Too high or low of a number often indicate incorrect processing or image outliers                                                                                                                         |
|                                 | finalProcessingSpur                | "Removes spurious morphology from the final mask. Essentially small ""arms"" of tissue are rounded off and removed"                                                                                                                                                          |
|                                 | finalProcessingArea                | "Removes larger islands from the output mask, e.g., isolated pieces of tissue"                                                                                                                                                                                               |
| SaveModule.py                   | saveFinalMask                      | Saves both the output mask from HistoQC but also the overlay on the original image                                                                                                                                                                                           |
|                                 | saveThumbnails                     | Save thumbnails for easier viewing. This needs to be completed for the UI to work                                                                                                                                                                                            |
| AnnotationModule.py             | xmlMask                            | Loads an Aperio XML file to mask out regions of the image, limitating artifact detection and metric computation to solely regions of interest                                                                                                                                |
| LocalTextureEstimationModule.py | estimateGreyComatrixFeatures       | Estimate grey comatrix features for background or final images                                                                                                                                                                                                               |

## Columns in results.tsv

This section describes the columns the shipped configurations write to `results.tsv`. Which columns appear depends on the configuration: the `background_*` and `final_*` columns (including `final_energy`) come from `config_v2.1.ini`, while the default `config.ini` runs the pen-marking and coverslip classifiers instead.

**Conventions.** In the shipped configurations, measurements are made on a thumbnail at `image_work_size` (1.25x by default; blur detection runs at 2.5x and its mask is resized back). "Grayscale" is scikit-image `rgb2gray` (0.2125 R + 0.7154 G + 0.0721 B, range 0 to 1). Most measurements are restricted to the current tissue mask (`img_mask_use`), which each filtering step shrinks in pipeline order. `-100` means the mask was empty when the value was computed; the exception is the brightness `*_std` columns, which read 0 in that case.

### Slide metadata (`BaseImage`, `BasicModule.getBasicStats`)

| Column | Meaning |
|---|---|
| `filename` | Slide file name |
| `comments` | Placeholder, written as a blank |
| `type` | `openslide.vendor` |
| `levels` | `openslide.level-count` |
| `height`, `width` | Level-0 size in pixels |
| `mpp_x`, `mpp_y` | Microns per pixel from the slide metadata (`NA` if absent) |
| `comment` | `openslide.comment`, newlines removed |
| `base_mag` | `openslide.objective-power`, else `aperio.AppMag`, else the configuration's `base_mag` |
| `image_bounding_box` | (x, y, width, height) of the region analysed; the whole slide unless `enable_bounding_box` is set and the slide supplies bounds |
| `warnings` | Last column: warning messages from any step (for example an empty mask), joined with `\|` |

### Mask-filtering steps

Each of these changes the tissue mask. All remove pixels except hole filling, which adds them. The value depends on `mask_statistics` (default `relative2mask`):

- `relative2mask`: fraction of the pixels still in the mask before this step that the step removed (1 − after/before)
- `relative2image`: fraction of the whole thumbnail still in the mask after the step
- `absolute`: number of pixels still in the mask after the step

| Column | Step and what it removes |
|---|---|
| `dark` | `LightDarkModule.getIntensityThresholdPercent:darktissue`: pixels with grayscale below 0.15 |
| `bright` | `getIntensityThresholdPercent:tissue` (default configuration): keeps pixels with grayscale below 0.9 whose three RGB values have a standard deviation above 10 (0 to 255 scale), and removes the rest (mainly glass) |
| `brightestPixels` | `minimumPixelIntensityNeighborhoodFiltering` (v2.1): pixels whose neighbourhood minimum (grayscale × 255, disk of radius 5) exceeds 210, i.e. areas with no dark pixel nearby. `removeBrightestPixels`, a k-means alternative, writes the same column |
| `flat_areas` | `BubbleRegionByRegion.detectSmoothness`: pixels whose grayscale differs from its 10 × 10 local mean by less than 0.01 (featureless areas), after discarding flat and non-flat specks smaller than `min_object_size` |
| `pen_markings`, `coverslip_edge` | `ClassificationModule.byExampleWithFeatures`: pixels a per-pixel classifier, trained on the example images in the configuration, assigns to that class |
| `fatlike_tissue_removed_percent` | `MorphologyModule.removeFatlikeTissue`: holes smaller than `fat_cell_size` are found and dilated, and where they merge into clusters larger than `max_keep_size` pixels the cluster is removed |
| `small_tissue_removed_percent` | `removeSmallObjects`: tissue pieces under `min_size` pixels |
| `small_tissue_filled_percent` | `fillSmallHoles`: holes under `min_size` pixels are **filled**, so this step adds pixels, and under `relative2mask` the value is negative |
| `blurry_removed_percent` | `BlurDetectionModule.identifyBlurryRegions`: pixels where the Gaussian-smoothed absolute Laplacian of grayscale is at or below `blur_threshold` |
| `spur_pixels` | `BasicModule.finalProcessingSpur`: thin protrusions removed by a morphological opening with a disk of `disk_radius` |
| `areaThresh` | `finalProcessingArea`: tissue pieces under `area_threshold` pixels |
| `getAnnotationMask` | `AnnotationModule`: pixels outside the supplied annotations |
| `pixels_to_use` | `finalComputations`: final mask size. `relative2mask` is not supported here, so it falls back to `absolute` (pixel count) |

For the blur, small-object, fat-like and hole-fill steps, `*_num_regions`, `*_mean_area` and `*_max_area` describe the connected regions that step removed (or filled), with areas in pixels at `image_work_size`. `#pieces_of_tissue` (`countTissuePieces`) is the number of connected regions in the final mask.

### Brightness and contrast (`BrightContrastModule`)

With no prefix these use the tissue mask. With `prefix: background` and `invert: True` they use its complement at that point in the pipeline: glass plus whatever has been removed so far (but see the notes below for the contrast columns).

| Column | Meaning |
|---|---|
| `grayscale_brightness`, `_std` | Mean and standard deviation of grayscale (0 to 1) |
| `chan1/2/3_brightness`, `_std` | Mean and standard deviation of R, G, B (0 to 255) |
| `chan1/2/3_brightness_YUV`, `_std_YUV` | Same in scikit-image YUV, computed on the image scaled to 0 to 1: chan1 = Y (0 to 1), chan2 = U, chan3 = V (signed) |
| `tenenGrad_contrast` | √(Σ Sobel(grayscale)²) / N, where N is the number of tissue-mask pixels |
| `michelson_contrast` | (max − min) / (max + min) of grayscale, so it is set by the two most extreme pixels |
| `rms_contrast` | √(Σ (grayscale − mean)² / N), i.e. the standard deviation of grayscale |

### Texture (`LocalTextureEstimationModule`, prefixes `final_` and `background_`)

`npatches` patches (1000 in v2.1) of 32 × 32 pixels are drawn at random, with replacement. Each patch's top-left corner is a mask pixel, so patches can extend past the mask edge (and are cut short at the image border). Each patch's grayscale is quantised to 8 levels, and a symmetric, normalised grey-level co-occurrence matrix (GLCM) is built at distance 5 px, angle 0 (horizontal neighbours only). scikit-image `graycoprops` gives `contrast`, `dissimilarity`, `homogeneity`, `ASM`, `energy` (= √ASM) and `correlation`. Each column is the mean over patches, and `*_std` is the standard deviation over patches. Results are reproducible only when a seed is set.

### Stain deconvolution (`DeconvolutionModule.separateStains`)

| Column | Meaning |
|---|---|
| `deconv_c0/c1/c2_mean`, `_std` | scikit-image `separate_stains` with the configured matrix (default `hed_from_rgb`: c0 haematoxylin, c1 eosin, c2 DAB). Each channel is clipped to [0, 99th percentile over the whole thumbnail], then summarised over the tissue mask. The column names do not record which matrix was used |

### Histogram (`HistogramModule.compareToTemplates`)

| Column | Meaning |
|---|---|
| `<template>_MSE_hist` | Sum, over 20 bins × 3 channels, of squared differences between density-normalised per-channel histograms (range 0 to 255) of the tissue pixels and of the whole template image. It is a sum rather than a mean; 0 means identical |

### Notes on reading the columns

1. **`rms_contrast` equals `grayscale_brightness_std`** whenever both use the tissue mask (the default): both are the population standard deviation of grayscale.
2. **The `background_` Michelson and RMS contrasts are computed on tissue.** In `getContrast`, the Sobel image is subset with the configured (inverted) mask, but the grayscale image is subset with `img_mask_use`. So `background_michelson_contrast` and `background_rms_contrast` use tissue pixels, and `background_tenenGrad_contrast` sums background gradients but divides by the tissue pixel count.
3. **`tenenGrad_contrast` depends on tissue area.** If the mean squared gradient per pixel is m, the value is √(N·m) / N = √m / √N, so two slides with identical texture, one with four times the tissue, differ by a factor of 2.
4. **`small_tissue_filled_percent` is negative** under `relative2mask`, because filling holes adds pixels.
