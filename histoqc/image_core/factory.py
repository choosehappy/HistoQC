from histoqc.image_core.wsi_base import SlideBaseImage
from histoqc.image_core.pil_base import PILBaseImage
from histoqc.image_core.BaseImage import BaseImage
from typing import Type, Dict, Optional
from histoqc._import_openslide import openslide

# enum is introduced in 3.10.
TYPE_WSI = 'wsi'
TYPE_PIL = 'pil'
KEY_TYPE = 'img_type'
_img_type_to_class: Dict[str, Type[BaseImage]] = {
    TYPE_WSI: SlideBaseImage,
    TYPE_PIL: PILBaseImage,
}


def param_img_type(params) -> str:
    return params.get(KEY_TYPE, "wsi").lower()


def get_image_class(params) -> Type[BaseImage]:
    image_type = param_img_type(params)
    return _img_type_to_class[image_type]


def format_img_type(filename: Optional[str]):
    # if not specified --> try PILBaseImage wherein an existing array/PIL can be used to instantiate the BaseImage
    if filename is None:
        return PILBaseImage

    support_format = openslide.OpenSlide.detect_format(filename)
    if support_format is None:
        return PILBaseImage
    return SlideBaseImage
