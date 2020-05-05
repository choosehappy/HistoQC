import logging
from BaseImage import printMaskHelper
from skimage import io, img_as_ubyte
import os

import xml.etree.ElementTree as ET
import numpy as np
import cv2

def get_points(xml_fname):
    """Parses the xml file to get those annotations as lists of verticies"""
    # create element tree object
    tree = ET.parse(xml_fname)

    # get root element
    root = tree.getroot()

    points = []

    for annotation in root.findall('Annotation'):
        for regions in annotation.findall('Regions'):
            for region in regions.findall('Region'):
                for vertices in region.findall('Vertices'):
                    points.append([None] * len(vertices.findall('Vertex')))
                    for k, vertex in enumerate(vertices.findall('Vertex')):
                        points[-1][k] = (int(float(vertex.get('X'))), int(float(vertex.get('Y'))))

    return points


def resize_points(points, resize_factor):
    for k, pointSet in enumerate(points):
        points[k] = [(int(p[0] * resize_factor), int(p[1] * resize_factor)) for p in pointSet]

    return points.copy()

def mask_out_annotation(s,xml_fname):
    """Returns the mask of annotations"""

    points = get_points(xml_fname)

    resize_factor = np.shape(s["img_mask_use"])[1] / s["image_base_size"][0]

    points = resize_points(points, resize_factor)

    mask = np.zeros((np.shape(s["img_mask_use"])[0],np.shape(s["img_mask_use"])[1]),dtype=np.uint8)

    for pointSet in points:
        cv2.fillPoly(mask, [np.asarray(pointSet).reshape((-1, 1, 2))], 1)

    return mask

def xmlMask(s,params):
    logging.info(f"{s['filename']} - \txmlMask")
    mask = s["img_mask_use"]

    xml_basepath = params.get("xml_filepath","")
    xml_suffix = params.get("xml_suffix", "")
    if len(xml_basepath)==0:
        xml_basepath = s["dir"]

    xml_fname = xml_basepath + os.sep + s['filename'][:s['filename'].rindex('.')] + xml_suffix + '.xml'

    logging.info(f"{s['filename']} - \tusing {xml_fname}")

    annotationMask = mask_out_annotation(s,xml_fname) > 0
    io.imsave(s["outdir"] + os.sep + s["filename"] + "_xmlMask.png", img_as_ubyte(annotationMask))

    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = prev_mask & annotationMask

    s.addToPrintList("xmlMask",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(
            f"{s['filename']} - After AnnotationModule.xmlMask NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(
            f"After AnnotationModule.xmlMask NO tissue remains detectable! Downstream modules likely to be incorrect/fail")

    return