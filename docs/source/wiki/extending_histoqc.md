# Extending HistoQC

HistoQC was specifically designed to be very modular and allow for easy extensibility by even novice programmers. For new functionality, it is recommended to look at the available modules, identify one which is most similar in functionality to the new target functionality, and use that as a basis for future development.

Here we will describe the components necessary to have a fully functioning module.

## Naming

The filename of the new module should be descriptive of the class of the module. For example, "HistogramModule" consists of functionality associated with histograms. The filename is thus HistogramModule.py. Inside of this file, we can define individual functions, for example "compareToTemplates", which loads templates and compares their distributions to the image's distributions. To add the module to the pipeline, we simply need to add a line of the format `filename.function` to the [pipeline] section in the "steps" list, and at run time, HistoQC will dynamically load this function into the memory space. In this example, we would add "HistogramModule.compareTemplates" to the list. Note that the "py" extension has been removed from the filename. By adding a section named [HistogramModule.compareTemplates] to the bottom of the configuration file, we can supply parameters which will automatically become available at function execution time.

## Internal Representation (default variables)

Looking at the HistogramModule.compareTemplates function mentioned above we can see the function's prototype has two parameters:

```python
def compareToTemplates(s, params):
```

*All* modular functions in the pipeline list receive these two parameters (i.e., s and params), and thus are the keys to communicating and storing information in HistoQC.

### Params

Params contains the parameters for that specific modular function as specified in the configuration file. Any values added to here will be lost after the function exists. They can be accessed in the function as a standard python dictionary, but using the *get* method with a reasonable default and appropriate casting is *highly* suggested:

```python
thresh = float(params.get("threshold", .5))
```

In this example, we load the variable "threshold" from the file. If it doesn't exist, we assume a default value of .5. In both cases we cast the result to a float, as the configuration parser may potentially return a string as opposed to the desired type.

### S

"s" is a hold-all dictionary with 1 instance per image and is of type BaseImage. It contains all of the metrics, metadata, and masks. Most importantly it contains an already opened openslide pointer for usage in loading the slide. There are some default keys and functions provided for your usage which cover most operations. The default keys are discussed here:

| Key                | Description                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `s["warnings"]`    | Append any warnings to this field and they will appear in the tsv file under the "warnings" column. Used for informing the user that things in a particular module may not have gone as expected                            |
| `s["filename"]`    | The filename of the image                                                                                                                                                                                                   |
| `s["seed"]`        | The seed is used to initialize RNG for **ClassificationModule.byExampleWithFeatures** and **LocalTextureEstimationModule.estimateGreyComatrixFeatures**                                                                     |
| `s["outdir"]`      | The location of the directory for the particular image, useful for saving masks                                                                                                                                             |
| `s["os_handle"]`   | The pre-opened openslide handle. It is possible to use this directly, but for more robust access, one might consider using the _getImgThumb_ described below                                                                |
| `s["image_work_size"]` | Discussed in the above section, specifies the default image working size                                                                                                                                                    |
| `s["img_mask_use"]`    | A binary mask indicating where at this stage in the pipeline HistoQC believes the artifact tissue to be                                                                                                                     |
| `s["comments"]`        | This is typically left blank so that the front end or downstream user has a dedicated column for their comments already available in the spreadsheet, but regardless may be added to if additional information is warranted |
| `s["completed"]`       | This keeps an automatically updated list of the modules which have been completed (by name), allowing for the enforcement of prerequisites                                                                                  |

The available functions are discussed here:

| Function                      | Description                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `addToPrintList(name, val)`   | Providing the name and the value (in string format) will dynamically add this value to the output tsv file, and will also appear in the front end                                                                                                                                                                              |
| `getImgThumb(dim)`            | As discussed above in Pipeline image size, this will obtain a numpy representation of the underlying image. The additional functionality here also will cache the image locally so that subsequent requests for the image at that size will return immediately as opposed to requiring additional computation time to produce. |

## Saving output images

Examining output images is one of the most important features of HistoQC, as a result adding additional output images is easily done. Here we examine a line of code which saves an output image (where _io_ is imported from skimage):

```python
io.imsave(s["outdir"] + os.sep + s["filename"] + "_BubbleBounds.png", mask.astype(np.uint8) * 255)
```

First, we can see that the location and filename consist of:

```python
s["outdir"] + os.sep + s["filename"]
```

This should never be changed unless there is a strong reason to do so. Next we add an underscore followed by the name of the particular mask we're producing, in this case "_BubbleBounds.png". Afterwards, we provide the matrix to be saved, in this case a binary mask (0s and 1s) which is converted to 0 and 255 for easier downstream usage.

To have the new image type appear in the front-end user interface, the suffix needs to be manually added. Open global_config.js, scroll to the definition of DEFAULT_IMAGE_EXTENSIONS (around line 20), and add the new suffix to the list. That's it!
