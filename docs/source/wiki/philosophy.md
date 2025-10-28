# Philosophy

HistoQC consists of a pipeline of modules sequentially applied to an image. These modules act on the image to (a) produce metrics, and (b) produce output images after applying thresholds or running classifiers.

When an image is loaded it is initially assigned a "True mask" indicating that every pixel in the image is artifact free and "useful" for analysis. This mask is internally referred to as `img_mask_use`.

The HistoQC approach uses the specified pipeline to sequentially refine the `img_mask_use` mask. For example, while initially the entire image is considered useful, after the "    LightDarkModule.getIntensityThresholdPercent:tissue" module is run, the background of the tissue should now be set to false, refining the locations in the image which are suitable for computation and analysis.

As such, the order of the events in the pipeline is important as the regions considered for computation may be affected. In particular, most modules have the option to "limit_to_mask" which implies that the module's operations will only take place in the regions currently identified as accepted by `img_mask_use`. For example, when computing image color distributions, one would like to only operate on the part of the image that has tissue and avoid the white background which will artificially inflate the white value of the distribution, thus placing `HistogramModule.getHistogram` after `LightDarkModule.getIntensityThresholdPercent:tissue` is ideal.