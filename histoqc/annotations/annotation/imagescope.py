from typing import List, Dict, Union
from xml.etree import ElementTree as ET
from xml.etree.ElementTree import Element
from .base import Annotation, TYPE_POINT_SET, TYPE_RAW_LABEL, TYPE_POINT, TYPE_HOLED_SET


class ImageScopeAnnotation(Annotation[Element]):
    ANNOTATION_TAG_NAME = "Annotation"

    TAG_REGION_ALL = "Regions"
    TAG_REGION = "Region"
    VERTICES: str = 'Vertices'
    VERTEX: str = "Vertex"
    X: str = 'X'
    Y: str = 'Y'

    CLASS_ATTR = "Name"
    _ann_data: Element

    def label_from_annotation(self) -> TYPE_RAW_LABEL:
        """
        Read the label of the whole annotated region.
        Assume the annotation class label is under <Annotation> element's "Name" attribute.

        Returns:
            int
        """
        return self._ann_data.get(ImageScopeAnnotation.CLASS_ATTR)

    @staticmethod
    def vertex_from_node(vertex: Element) -> TYPE_POINT:
        raw_x: str = vertex.get(ImageScopeAnnotation.X)
        raw_y: str = vertex.get(ImageScopeAnnotation.Y)
        raw_point = (raw_x, raw_y)
        return Annotation.point_to_int(raw_point)

    def point_set_list(self) -> List[TYPE_HOLED_SET]:
        """
        I doubt it is ever standardized how to define holes so herein we just ignore all holes.
        Returns:

        """
        out_list = []
        for regions_all in self.ann_data.findall(ImageScopeAnnotation.TAG_REGION_ALL):
            for region in regions_all.findall(ImageScopeAnnotation.TAG_REGION):
                for vertices in region.findall(ImageScopeAnnotation.VERTICES):
                    # the X and Y attributes are float strings --> cast to float first before flooring down to int
                    xy_list: TYPE_POINT_SET = [ImageScopeAnnotation.vertex_from_node(vertex)
                                               for vertex in vertices.findall(ImageScopeAnnotation.VERTEX)]
                    holes = None
                    holed_point_set: TYPE_HOLED_SET = xy_list, holes
                    out_list.append(holed_point_set)
        return out_list

    @staticmethod
    def validated_ann(ann_data: Element):
        # todo perhaps using xmlschema and a predefined image scope xml as the schema to validate the structure?
        assert ann_data.tag == ImageScopeAnnotation.ANNOTATION_TAG_NAME
        return ann_data

    @staticmethod
    def annotation_list_from_uri(uri) -> List[Element]:
        tree = ET.parse(uri)
        root = tree.getroot()
        return root.findall(ImageScopeAnnotation.ANNOTATION_TAG_NAME)

    @classmethod
    def build(cls, uri: str, ann_data: Element, label_map: Dict[Union[str, int], int]) -> Annotation:
        ann_data = ImageScopeAnnotation.validated_ann(ann_data)
        return super().build(uri=uri, ann_data=ann_data, label_map=label_map)
