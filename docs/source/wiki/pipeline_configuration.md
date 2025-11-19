# Pipeline configuration

## Pipeline module order

The pipeline configuration is specified using a configuration file. A default config.ini is supplied in the repository. The configuration syntax is that of python's [configparser](https://docs.python.org/3/library/configparser.html). In brief this means that the configuration file has sections, and each section has key value parameters. In the HistoQC setting, the sections are named for their associated module.

There is only a single required section, which is called "[pipeline]". This section defines, again in sequential order, the steps which will be taken on a per image basis. An example pipeline configuration is presented here:
```
[pipeline]
steps= BasicModule.getBasicStats
    BasicModule.getMag
    ClassificationModule.byExampleWithFeatures:pen_markings
    #ClassificationModule.byExampleWithFeatures:pen_markings_red
    ClassificationModule.byExampleWithFeatures:coverslip_edge
    #LightDarkModule.getIntensityThresholdPercent:bubble
    LightDarkModule.getIntensityThresholdPercent:tissue
    #BubbleRegionByRegion.pixelWise
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

We note here that it is possible to use the *same* module multiple times, with different settings and assign it a different name. For example getIntensityThresholdPercent applies a threshold to the image, and "getIntensityThresholdPercent:tissue" applies a high threshold to remove the background on the slide, while "getIntensityThresholdPercent:darktissue" applies a low threshold to identify regions which may contain artifacts such as folded tissue or drastic overstaining. Each instance of the module is defined as the base module name (getIntensityThresholdPercent) plus a double colon followed by the specific instance name of that module (e.g., ":darktissue"). Later on in the configuration file, we can see the associated sections are named exactly the same ([LightDarkModule.getIntensityThresholdPercent:darktissue]), and that each section contains a "name:" parameter, which is used as the output name of the image as well as the column name in the tsv results file.

## Pipeline image size

The BaseImage section's image_work_size parameter specifies the default size of the internal representation of the image to be used in the pipeline. Most modules, unless otherwise specified, will use an image of this size to perform their operation, thus setting a suitable size is important. In most cases, it is infeasible to load an entire 40x whole slide mount, but even having done so would not provide greater specificity in many of the metrics (e.g., color distributions). As such a default of "1.25x" is recommend, which specifies examining the image at a magnification of 1.25x.

There are 4 ways to specify the desired image size


1. When image_work_size < 1 and is a floating point number, it is considered a downscaling factor of the original image (e.g., new.image.dimensions = image.dimensions \* image_work_size)

2. if image_work_size < 100, it is considered to indicate the *level* of image to load using the openslide pointer. In the case of Aperio Svs, this typically coincides with {0=Base, 1 = 4:1, 2=16:1, 3=32:1, etc}

3. if image_work_size &gt; 100, this is considered to be the *exact* longest dimension desired (e.g., an image of size 1234 x 2344, if image_work_size  is set to 500, the output will be 263 x 500). Note this will cause different magnifications per image (if they're of different sizes)

4. If image_work_size = 1.25x, this is considered to be the desired apparent magnification. On one hand, this makes processing a bit easier, as each image, regardless of its base magnification, will be made to have the same apparent magnification but this comes with 2 caveats: (1) the computation time to generate each of these images could be 1 minute or more as the next higher level magnification needs to be loaded and literately down sampled to the desired magnification (in cases of going from 2x to 1.25x this is rather trivial but going from 5x to 1.25x can take a few moments), (2) one should really consider if their downstream analytics are capable of handling heterogeneity (otherwise its best to split images by base magnification and base number of levels). This approach is different than #1, as #1 directly loads the next highest magnification and then resizes it downwards, potentially exploding memory, this approach sequentially loads smaller tiles, resizes them, and then merges them together, drastically reducing memory overhead.

**BEWARE**: these operations are not free! In cases #1 and #3, we leverage the openslide "get_thumbnail" function to produce the requested image. This function works by taking the *next* largest image layer, loading it, and then downsizing it to the requested size. One can image that if the image_work_size size is not properly set, the whole uncompressed image will be loaded before down sampling and thus likely exploding available resources.