# Running HistoQC
## Basic Usage
A typical command line for running HistoQC looks like:

```bash
histoqc -c v2.1 -n 3 "*.svs"
```

## Command Line Interface

```{argparse}
:module: histoqc._parser
:func: get_argument_parser
:prog: histoqc
```

## Output File Structure
HistoQC generates an output directory with the following structure:

```{note}
The exact files saved for each image will vary depending on the configuration used. See [Configuring HistoQC](configuring_histoqc.md) and [Pipeline Configuration](wiki/pipeline_configuration.md) for details on customizing the HistoQC pipeline.
```

```
histoqc_output_20251120-153250/
├── example_image1.svs/
│   ├── example_image1.svs_areathresh.png
│   ├── example_image1.svs_blurry.png
│   ├── example_image1.svs_bright.png
│   ├── example_image1.svs_dark.png
│   ├── example_image1.svs_deconv_c0.png
│   ├── example_image1.svs_deconv_c1.png
│   ├── example_image1.svs_deconv_c2.png
│   ├── example_image1.svs_equalized_thumb.png
│   ├── example_image1.svs_fatlike.png
│   ├── example_image1.svs_flat.png
│   ├── example_image1.svs_fuse.png
│   ├── example_image1.svs_hist.png
│   ├── example_image1.svs_macro.png
│   ├── example_image1.svs_mask_use.png
│   ├── example_image1.svs_small_fill.png
│   ├── example_image1.svs_small_remove.png
│   ├── example_image1.svs_spur.png
│   ├── example_image1.svs_thumb.png
│   └── example_image1.svs_thumb_small.png
├── example_image2.svs/
|  ├── ...
|── ...
├── error.log
└── results.tsv
```