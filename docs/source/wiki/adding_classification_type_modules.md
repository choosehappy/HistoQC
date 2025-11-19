# Adding classification type modules

Most of the modules are implemented using statistics or thresholds and are thus relatively easy to setup. The classification modules represent a departure from that simplicity and are not only the most sophisticated modules in HistoQC, but also the most powerful. The classification approach consists of first loading exemplar images from which to create a model. Each exemplar should consists of 2 images of the same size, the first the original image and the second a binary mask. Each set is specified under the "examples" parameter, one per line, and each separated by a double colon like so:

```
examples: ./pen/1k_version/pen_green.png:./pen/1k_version/pen_green_mask.png
          #./pen/1k_version/pen_red.png:./pen/1k_version/pen_red_mask.png
```

Which indicates that relative or absolute location of 2 exemplars (pen_green and pen_red), and their associated mask (pen_green_mask.png and pen_red_mask.png). The mask is a binary image (i.e., only containing the values {0,1} identifies which pixels should be used as the positive class in the image (e.g., 1), and the pixels which should be used as the negative class (e.g., 0). It usually makes sense for these images to be of the same magnification specified by "image_work_size", as this will improve the performance of the classifier.

In the second step, after the images are loaded, a classifier is trained. To improve the robustness of the classifier, we allow for the computation of a number of different pixel-features to augment the original RGB space. These features are those implemented in skimage.filters [http://scikit-image.org/docs/dev/api/skimage.filters.html] and include:

```
features:  frangi
           laplace
           rgb
           #lbp
           #gabor
           #median
           #gaussian
```

Each of their parameters can be set by using the feature name as the prefix to the parameter, for example: "frangi_black_ridges: True", sets the "black_ridges" parameter of the frangi filter to true. A single model is trained and shared by all threads which request access to it reducing memory and training efforts.

After the model is trained, it is retained in memory, and is applied at the appropriate time to the images identified by HistoQC. Internally, the output from this is a probability likelihood that a particular pixel belongs to the trained positive class, but as a real value output is not suitable here, we accept a parameter "tresh" which will apply a threshold to the probability map to provide the final binary value mask which is used in downstream analysis.