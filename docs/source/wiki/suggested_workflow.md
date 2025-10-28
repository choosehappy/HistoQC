# Suggested workflow

Through various experiments, we have come to the following suggested workflow. Depending on your task and the expected homogeneity of your dataset, this approach may be rather extreme, so it is suggested that you modify your approach accordingly.

1. Run HistoQC on all images using a minimal pipeline, such as the one contained in config_first.ini. This allows for discovery of images which are scanned at different magnifications, e.g., 20x and 40x images. Additionally it performs basic tissue detection (white threshold) and subsequently computes histograms and differences to target templates. Using this information, split the cohort into sub-cohorts based on these values since (a) various modules are likely to function differently at different magnifications, (b) the *image level* which is loaded by openslide will be different, implying potential memory issues (loading too big of an image accidently) or attempting to open a level which doesn't exist.

Ideally, one wants to create sub-cohorts which have the same magnifications, contain the same number of internal storage format levels ("levels"), and share similar appearance properties (lightness, stain intensity, etc)

This can be done easily using the web user interface and the parallel coordinates graph. Clicking and dragging on any of the axis allows for the creation of filters which update both the table above and the images below. Dragging an existing filter up and down dynamically adjusts the filters. When looking at a filtered view of the table one can click "Save Filtered" and save just that particular subset of images.

Additionally, if there are images which should be removed, multi-selecting them and clicking "Delete" will remove them from the table. Subsequently clicking save will result in a subset of the output file.

2. Once the sub-cohorts are built, you can rerun the pipeline using an expanded set of models which have higher computational load. An example of the full pipeline is in config.ini, designed to work with H&E images at 40x. Various configuration options are discussed below. Here again, we can identify images which are either not suitable for computation due to artifacts but also we can determine if the suggested masks are appropriate for the desired downstream computational tasks. An easy way of doing this is to click on the "compare" drop down and select "_fuse.png", which will show the original image next to the fused images.

In case of errors: For example, if some images caused errors because of out of memory, you can rerun pipeline simply by deleting their output directories. They are easily found because they don't have thumbnail images (which are created in the last step in all pipelines). Example matlab code to do this:

```bash
files=dir('*.svs');
for zz=1:length(files)
    fname=files(zz).name;
        if(~exist(sprintf('%s/%s_thumb.png',fname,fname),'file'))
            fprintf('%s\n',fname);
            rmdir(fname,'s');
        end
end
```