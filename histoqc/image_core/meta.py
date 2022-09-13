from typing import Literal


# Personally I would either avoid inheriting from built-in dict at all
# and instead use attributes or an associated dict member but I assume it is easier to serialize a dict in future?
# For type checkers of literal key values in the codings -- get warnings if I make mistakes
# Ideally I may use const variables to replace any hardcoded literal values, but it may interfere with the coding
# styles of other contributors -- so instead I use the hardcoded literal type annotation for get and set items

ATTR_TYPE_BASE = Literal["in_memory_compression", "warnings", "output", "outdir", "dir",
                         "os_handle", "image_base_size", "image_work_size", "mask_statistics", "base_mag",
                         "img_mask_use", "img_mask_force", "completed", 'filename']
ATTR_TYPE_DATA_AUX = Literal['img_mask_blurry']
ATTR_TYPE_EXTRA = Literal['filename', 'name']
ATTR_TYPE_PLUGIN = Literal['pil_handle']
ATTR_TYPE_ARRAY_INPUT = Literal['img_array_input']
ATTR_TYPE = Literal[ATTR_TYPE_BASE, ATTR_TYPE_DATA_AUX, ATTR_TYPE_EXTRA, ATTR_TYPE_PLUGIN, ATTR_TYPE_ARRAY_INPUT]
