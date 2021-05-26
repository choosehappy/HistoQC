# Changelog

## Version 2.1

A number of additional features and improvements have been added to this version, helping to support the quality control of brightfield immunohistochemical staining (in particular Hematoxylin and DAB have been extensively tested):

1. Equalized image output: During development and testing of these features, it became clear that the background of slides were hiding a lot more information then they were letting on. This new output mask performs a contrast enhancement which simply *enhances* existing information as opposed to *creating* new information. Looking at the artifacts on this image give a visual sense of the overall quality of the image itself. We have written up a full blog post regarding this feature available here: http://www.andrewjanowczyk.com/the-noise-in-our-digital-pathology-slides/

2. Improved tissue detection: with less aggressive contrasting stains (e.g., H + DAB vs H&E), tissue detection becomes a bit more challenging. To better detect tissue overall we have included _minimumPixelIntensityNeighborhoodFiltering_ in the _LightDarkModule_ module. This approach uses a minimum disk filter, which assigns the value of a pixel to the minimum value within its neighborhood. Afterward a user specified threshold is applied to detect the tissue. The disk filtering making this process more robust than a simple pixel-level threshold, and even a light threshold (e.g., 210 / 255 ) appears to pick up almost all tissue. This allows even faintly stained tissue to be detected in a fairly robust and highly efficient way.

3. Texture features: certain tissue level characteristics may be informative for the grouping of slides. The _estimateGreyComatrixFeatures_ function in the new _LocalTextureEstimationModule_ module randomly samples a fixed number of patches from the specified masked area and computes a gray cooccurance matrix for the comptuatoin of textural features such as contrast, dissimilarity, homogeneity, ASM, energy, correlation. The mean and standard deviation across the sampled patches is now provided.

A more full description of these features is available in the skimage documentation: https://scikit-image.org/docs/dev/api/skimage.feature.html#skimage.feature.greycoprops

4. Background computations: we came to notice that a number of the metrics that we had would also be quite valuable if they were performed on the *non* tissue area, i.e., the white background. Since the background is expected to be homogenous in terms of texture and color, it becomes easier to identify anomalies, such as dust or white-balance issues, in that context. To that end the

_getContrast_, _getBrightnessGray_, and _getBrightnessByChannelinColorSpace_ functions in the _BrightContrastModule_ module now have additional parameters which can be set:

*prefix*: becomes the prefix of the created metrics

*invert*: specifies to take measurements from the inverse of the target mask

*mask_name*: the name of the mask to use

in this case, by setting the variables to background, True, and img_mask_use, respectively, one will compute metrics on the invest of the current mask. Note that the placement of these functions matter in terms of location in the pipeline. From the example configuration files, we can see compute these metrics early, essentially after identifying the background, and then compute them again (with invert = false) as a final step to compute the same metrics except this time on the issue.

5) Object counts: we have added both size, and number of objects detected for various metrics. For example _removeSmallObjects_ in the _MorphologyModule_ module now explicitly mentions the number of objects removed, their average and maximum size. This will give a sense for how the removal took place, i.e., was it a number of smaller objects (e.g., dust particles) or a single larger object (smear).

6) Improved memory consumption: this was a bit of a special add-on. While operating on images HistoQC stores the masks in memory in a uncompressed matrix, which can become quite burdensome on smaller machines. We now support an “in_memory_compression = True” parameter, which for a very small time penalty, will compress objects before storing it in memory. In many cases this results in a 10x reduction in memory footprint per image, potentially allowing for better usage of threads and thus concurrency, resulting an overall higher throughput.

7) Improved deconvolution outputs. There appeared to be some number explosion issues in the lastest skimage deconvolution functions, so we added some clipping to prevent them from affecting the rescaling, and now the deconvolution images appear much more sensical and give a good feeling for how the staining is taking place.

8) Added “nsamples_per_example” to ClassificationModule.byExample to enable a sub-setting of training data for the specified classifier. This has 3 types of values, when

nsamples_per_example= -1  -- > use all examples, previous version equivalent default

nsamples_per_example < 1, use a percentage of the possible data from each image

nsamples_per_example > 1, use exactly this many examples for training

if using large exemplar images, or a large number of small images, even most settings of this parameter (e.g., 1000) will result in significantly faster training times. Note: this only affects training time and not testing time.

9) added template images for coverslips on IHC images, markers of blue, red, black, green colors

10) config_ihc.ini and config_v2.1.ini have been added. The first provides a baseline configuration file which appears to work well with Brightfield H+DAB IHC images. The second provides a complete working example of the functionality provided by this v2.1 update.

As always, please note that the provided configuration files are examples (and often excessive) to demonstrate functionality. Inclusion/exclusion of modules should be based on real-world cohort experiments. Providing your own example images (e.g., pen marking and coverslip) and template images (for histogram comparison), will great improve performance.

## Version 2.0

Bumped python version to >3.7 and scikit-image version to > 0.18 which breaks previous compatibility
