import os
from histoqc.image_core.BaseImage import BaseImage
from typing import Callable, Literal, Dict, Any


class TileExtractor(Callable):

    TYPE_TILE_SIZE = Literal['tile_size']
    TYPE_TILE_STRIDE = Literal['tile_stride']
    TYPE_TISSUE_RATIO = Literal['tissue_ratio']
    TYPE_OUTPUT_ROOT = Literal['tile_output']
    TYPE_SUFFIX = Literal['suffix']
    PARAMS = Literal[TYPE_TILE_SIZE, TYPE_TILE_STRIDE, TYPE_TISSUE_RATIO, TYPE_OUTPUT_ROOT, TYPE_SUFFIX]

    def __new__(cls, *args, **kwargs):
        return cls.__call__(*args, **kwargs)

    @staticmethod
    def __call__(s: BaseImage, params: Dict[PARAMS, Any]):
        output_dir = params.get('tile_output', os.path.join(s['outdir'], 'tiles'))
        os.makedirs(output_dir, exist_ok=True)
        prefix, _ = os.path.splitext(os.path.basename(s['filename']))
        suffix = params.get('suffix', '.png')

        tile_size = int(params.get('tile_size', 256))
        tile_stride = int(params.get('tile_stride', 256))
        tissue_thresh = float(params.get('tissue_ratio', 0.5))
        s.valid_tile_extraction(output_dir,
                                prefix=prefix,
                                suffix=suffix,
                                tile_size=tile_size,
                                tile_stride=tile_stride,
                                tissue_thresh=tissue_thresh,
                                force_rewrite=False)

        overlay_export = os.path.join(s["outdir"], f"{s['filename']}_tile_bbox.png")
        bbox_overlay = s.bbox_overlay("img_thumb", tile_size_on_img=tile_size, tile_stride_on_img=tile_stride,
                                      tissue_thresh=tissue_thresh, force_rewrite=False, outline='green', width=2)
        bbox_overlay.save(overlay_export)


