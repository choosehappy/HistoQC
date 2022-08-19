from histoqc.image_core.wsi_base import SlideBaseImage
from histoqc.image_core.pil_base import PILBaseImage
from histoqc.image_core.BaseImage import BaseImage
from typing import Type, Dict

# enum is introduced in 3.10.
TYPE_WSI = 'wsi'
TYPE_PIL = 'pil'

_img_type_to_class: Dict[str, Type[BaseImage]] = {
    TYPE_WSI: SlideBaseImage,
    TYPE_PIL: PILBaseImage,
}


def param_img_type(params) -> str:
    return params.get("img_type", "wsi").lower()


def get_image_class(params) -> Type[BaseImage]:
    image_type = param_img_type(params)
    return _img_type_to_class[image_type]

