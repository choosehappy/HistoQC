from typing import Dict, Tuple
from typing_extensions import Literal, get_args

TYPE_OPENSLIDE = Literal["openslide"]
KEY_OPENSLIDE: str = get_args(TYPE_OPENSLIDE)[0]
MODULE_OPENSLIDE: str = "histoqc.wsi_handles.openslide_handle"
CLASS_OPENSLIDE: str = "OpenSlideHandle"

TYPE_CUCIM = Literal["cucim"]
KEY_CUCIM: str = get_args(TYPE_CUCIM)[0]
MODULE_CUCIM: str = "histoqc.wsi_handles.cuimage_handle"
CLASS_CUCIM: str = "CuImageHandle"

WSI_HANDLES: Dict[str, Tuple[str, str]] = {
    KEY_OPENSLIDE: (MODULE_OPENSLIDE, CLASS_OPENSLIDE),
    # todo: add unified interface
    KEY_CUCIM: (MODULE_CUCIM, CLASS_CUCIM),
}

HANDLE_DELIMITER = ','
