import logging
from histoqc.BaseImage import printMaskHelper
from skimage import io, img_as_ubyte
from skimage.draw import polygon
import os
from pathlib import PurePosixPath, Path
import json
import xml.etree.ElementTree as ET
import numpy as np

def get_points_from_xml(xml_fname):
    """
    Parses the xml file to get those annotations as lists of verticies
    xmlMask will create a mask that is true inside the annotated region described in the specified xml file. The xml file must follow the ImageScope format, the minimal components of which are:
    ```
        <?xml version="1.0" encoding="UTF-8"?>
        <Annotations>
        <Annotation>
        <Regions>
        <Region>
        <Vertices>
        <Vertex X="56657.4765625" Y="78147.3984375"/>
        <Vertex X="56657.4765625" Y="78147.3984375"/>
        <Vertex X="56664.46875" Y="78147.3984375"/>
        </Region>
        </Regions>
        </Annotation>
        </Annotations>
    ```
    With more <Annotation> or <Region> blocks as needed for additional annotations. There is no functional difference between multiple <Annotation> blocks and one <Annotation> blocks with multiple <Region> blocks
    """
    # create element tree object
    tree = ET.parse(xml_fname)

    # get root element
    root = tree.getroot()

    # list of list of vertex coordinates
    # i.e. a list of sets of points
    points = []

    for annotation in root.findall('Annotation'):
        for regions in annotation.findall('Regions'):
            for region in regions.findall('Region'):
                for vertices in region.findall('Vertices'):
                    points.append([(int(float(vertex.get('X'))),int(float(vertex.get('Y')))) for vertex in vertices.findall('Vertex')])

    return points

def get_points_from_geojson(s, fname):
    """
    Parses a typical GeoJSON file containing one or more Polygon or MultiPolygon features.
    These JSON files are the preferred way to serialize QuPath annotations, for example.
    See https://qupath.readthedocs.io/en/latest/docs/scripting/overview.html#serialization-json
    """
    with open(fname) as f:
        geojson = json.load(f)
    point_sets = []
    for annot in geojson:
        geometry = annot['geometry']
        geom_type = geometry['type']
        coordinates = geometry['coordinates']
        if geom_type == 'MultiPolygon':
            for roi in coordinates:
                for points in roi:
                    point_sets.append([(coord[0], coord[1]) for coord in points])
        elif geom_type == 'Polygon':
            for points in coordinates:
                point_sets.append([(coord[0], coord[1]) for coord in points])
        elif geom_type == 'LineString':            
            point_sets.append([(coord[0], coord[1]) for coord in coordinates])
        else:
            msg = f"Skipping {geom_type} geometry in {fname}. Only Polygon, MultiPolygon, and LineString annotation types can be used."
            logging.warning(s['filename'] + ' - ' + msg)
            s["warnings"].append(msg)
    return point_sets

def resize_points(points, resize_factor, offset=(0,0)):
    for k, pointSet in enumerate(points):
        points[k] = [(int((p[0] - offset[0]) * resize_factor), int((p[1] - offset[1]) * resize_factor)) for p in pointSet]
    return points.copy()

def mask_out_annotation(s, point_sets):
    """Returns the mask of annotations"""
    (x, y, ncol, nrow) = s["img_bbox"]
    resize_factor = np.shape(s["img_mask_use"])[1] / ncol

    point_sets = resize_points(point_sets, resize_factor, offset=(x,y))

    mask = np.zeros((np.shape(s["img_mask_use"])[0],np.shape(s["img_mask_use"])[1]),dtype=np.uint8)

    for pointSet in point_sets:
        poly = np.asarray(pointSet)
        rr, cc = polygon(poly[:,1],poly[:,0],mask.shape)
        mask[rr,cc] = 1

    return mask

def getParams(s, params):
    # read params - format: xml, json; file_path; suffix; 
    format = params.get("format", None)
    file_path = params.get("file_path", None)
    suffix = params.get("suffix", "")

    # try use default value if the params are not provided
    if not format:
        # set default format
        format = "xml"
        # warning msg
        msg = f"format is not provided, using xml as the default format."
        logging.warning(f"{s['filename']} - {msg}")
        s["warnings"].append(msg)
        
    
    if not file_path:
        # set default file path
        file_path = s["dir"]
        # warning msg
        msg = f"file path is not provided, using \"{s['dir']}\" as the default file path"
        logging.warning(f"{s['filename']} - {msg}")
        s["warnings"].append(msg)
    

    return (format, file_path, suffix)

def saveAnnotationMask(s, params):
    logging.info(f"{s['filename']} - \tgetAnnotationMask")
    
    (format, file_path, suffix) = getParams(s, params)
    
    # annotation file path
    f_path = f"{file_path}{os.sep}{PurePosixPath(s['filename']).stem}{suffix}.{format}"

    if not Path(f_path).is_file():
        msg = f"Annotation file {f_path} does not exist. Skipping..."
        logging.warning(f"{s['filename']} - {msg}")
        s["warnings"].append(msg)
        return
    
    logging.info(f"{s['filename']} - \tusing {f_path}")

    # read points set
    if(format.lower() == 'xml'): # xml
        point_sets = get_points_from_xml(f_path)        
    elif(format.lower() == 'json'): # geojson
        point_sets = get_points_from_geojson(s, f_path)
    else: # unsupported format
        msg = f"unsupported file format '{format}'. Skipping..."
        logging.warning(f"{s['filename']} - {msg}")
        s["warnings"].append(msg)
        return

    annotationMask = mask_out_annotation(s, point_sets) > 0

    mask_file_name = f"{s['outdir']}{os.sep}{s['filename']}_annot_{format.lower()}.png"
    io.imsave(mask_file_name, img_as_ubyte(annotationMask))
    
    prev_mask = s["img_mask_use"]
    s["img_mask_use"] = prev_mask & annotationMask
    s.addToPrintList("getAnnotationMask",
                     printMaskHelper(params.get("mask_statistics", s["mask_statistics"]), prev_mask, s["img_mask_use"]))

    if len(s["img_mask_use"].nonzero()[0]) == 0:  # add warning in case the final tissue is empty
        logging.warning(
            f"{s['filename']} - After AnnotationModule.getAnnotationMask NO tissue remains detectable! Downstream modules likely to be incorrect/fail")
        s["warnings"].append(
            f"After AnnotationModule.getAnnotationMask NO tissue remains detectable! Downstream modules likely to be incorrect/fail")

    return