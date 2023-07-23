from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Dict, Union, List, Tuple, TypedDict
from lazy_property import LazyProperty
from shapely.geometry import Polygon

T = TypeVar("T")
TYPE_POINT = Tuple[int, int]
TYPE_POINT_SET = List[TYPE_POINT]
TYPE_HOLED_SET = Tuple[TYPE_POINT_SET, Union[List[TYPE_POINT_SET], None]]
# TYPE_HOLED_SET_COLLECTION = List[TYPE_HOLED_SET]

TYPE_LABEL = Union[int, None]
TYPE_RAW_LABEL = Union[str, None, TYPE_LABEL]


class Region(TypedDict):
    polygon: Polygon
    point_set: TYPE_HOLED_SET  # TYPE_POINT_SET
    label: TYPE_RAW_LABEL
    raw_label: TYPE_RAW_LABEL
    uri: str


class Annotation(ABC, Generic[T]):
    """
    Annotation --> an atomic annotation that may contain one or multiple regions.
     One label is assigned to one annotation.
    """

    _label_map: Union[Dict[TYPE_RAW_LABEL, TYPE_LABEL], None]
    _ann_data: T
    _uri: str

    @staticmethod
    def point_to_int(point_xy: Tuple[Union[float, str], Union[float, str]]) -> TYPE_POINT:
        raw_x, raw_y = point_xy
        return int(float(raw_x)), int(float(raw_y))

    @abstractmethod
    def point_set_list(self) -> List[TYPE_HOLED_SET]:
        return NotImplemented

    @abstractmethod
    def label_from_annotation(self) -> TYPE_RAW_LABEL:
        return NotImplemented

    @staticmethod
    def valid_polygon(point_set: TYPE_HOLED_SET):
        outer, inner = point_set
        polygon = Polygon(outer, holes=inner)
        if not polygon.is_valid:
            return polygon.buffer(0)
        return polygon

    @staticmethod
    def _enough_points(point_set: TYPE_POINT_SET):
        return len(point_set) >= 3

    @staticmethod
    def _sanitized_points_helper(point_set: TYPE_HOLED_SET) -> Union[TYPE_HOLED_SET, None]:
        outer, inner = point_set
        # if shell has less than 3 --> discard directly
        if not Annotation._enough_points(outer):
            return None
        inner = [hole for hole in inner if Annotation._enough_points(hole)] if inner is not None else None
        return outer, inner

    @staticmethod
    def _sanitized_points(point_set_list: List[TYPE_HOLED_SET]) -> List[TYPE_HOLED_SET]:
        out_list = []
        for point_set in point_set_list:
            sanitized = Annotation._sanitized_points_helper(point_set)
            if sanitized is None:
                continue
            out_list.append(sanitized)
        return out_list

    @LazyProperty
    def regions(self) -> List[Region]:
        point_set_list: List[TYPE_HOLED_SET] = self.point_set_list()
        clean_list = Annotation._sanitized_points(point_set_list)
        region_list = []
        for point_set in clean_list:
            point_set: TYPE_HOLED_SET
            polygon = Annotation.valid_polygon(point_set)
            label = self.label
            raw_label = self.raw_label
            curr_region = Region(polygon=polygon, point_set=point_set, label=label, raw_label=raw_label, uri=self._uri)
            region_list.append(curr_region)
        return region_list

    @staticmethod
    def _mapped_label(label_map: Dict[TYPE_RAW_LABEL, TYPE_LABEL],
                      label_var: TYPE_RAW_LABEL) -> Union[TYPE_RAW_LABEL, TYPE_LABEL]:
        if label_map is None or len(label_map) == 0:
            return label_var
        assert label_var in label_map
        return label_map[label_var]

    @LazyProperty
    def raw_label(self):
        return self.label_from_annotation()

    @LazyProperty
    def label(self):
        raw_label = self.raw_label
        label = Annotation._mapped_label(self._label_map, raw_label)
        return label

    @property
    def ann_data(self) -> T:
        return self._ann_data

    def __init__(self, uri: str, ann_data: T, label_map: Dict[Union[str, int], int]):
        self._uri = uri
        self._ann_data = ann_data
        self._label_map = label_map

    @classmethod
    def build(cls, uri: str, ann_data: T, label_map: Dict[Union[str, int], int]) -> "Annotation":
        return cls(uri=uri, ann_data=ann_data, label_map=label_map)

    @staticmethod
    @abstractmethod
    def annotation_list_from_uri(uri) -> List[T]:
        return NotImplemented

    @classmethod
    def build_from_uri(cls, uri: str, label_map: Union[Dict[TYPE_RAW_LABEL, TYPE_LABEL], None]) -> List["Annotation"]:
        ann_data_list: List[T] = cls.annotation_list_from_uri(uri)
        return [cls.build(uri=uri, ann_data=ann_data, label_map=label_map) for ann_data in ann_data_list]
