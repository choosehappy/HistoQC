import pytest
import textwrap
from histoqc.lite import Pipeline
import configparser
from typing import Optional
from histoqc._pipeline import load_pipeline
from histoqc.image_core.factory import format_img_type
from histoqc.image_core.BaseImage import BaseImage
from histoqc import BasicModule, BlurDetectionModule, BrightContrastModule, TileExtractionModule


@pytest.fixture(scope='module')
def minimal_config_api(tmp_path_factory):
    pth = tmp_path_factory.mktemp('config').joinpath('min_config_api.ini')
    pth.write_text(
        textwrap.dedent("""\
            [pipeline]
            steps= BasicModule.getBasicStats
                BlurDetectionModule.identifyBlurryRegions
                BasicModule.finalComputations
                BrightContrastModule.getContrast
                BrightContrastModule.getBrightnessGray
                BrightContrastModule.getBrightnessByChannelinColorSpace:RGB
                BrightContrastModule.getBrightnessByChannelinColorSpace:YUV
                TileExtractionModule.extract
            [BaseImage.BaseImage]
            image_work_size = 1.25x

            #three options: relative2mask, absolute, relative2image
            mask_statistics = relative2mask

            confirm_base_mag: False
            [BasicModule.getBasicStats]
            image_work_size = 1.25x
            [BrightContrastModule.getContrast]
            limit_to_mask: False
            
            
            [BrightContrastModule.getBrightnessGray]
            limit_to_mask: True
            
            [BrightContrastModule.getBrightnessByChannelinColorSpace:RGB]
            limit_to_mask: True
            
            [TileExtractionModule.TileExtractor]
            tile_size = 256
            tile_stride = 256
            tissue_ratio = 0.5
            
            [BrightContrastModule.getBrightnessByChannelinColorSpace:YUV]
            limit_to_mask: True
            to_color_space: YUV
            """)
    )
    yield pth


@pytest.fixture(scope='module')
def minimal_config_parser(minimal_config_api):
    config_loc = str(minimal_config_api)
    config = configparser.ConfigParser()
    config.read(config_loc)
    yield config


def test_pipeline_construct(minimal_config_parser):
    config = minimal_config_parser
    process_queue = load_pipeline(config)

    pipeline = Pipeline.from_config(config, mpm=None)
    assert pipeline.process_queue == process_queue

    pipeline_func = Pipeline.from_funcs(process_queue, None)
    assert pipeline_func.process_queue == process_queue
    assert pipeline_func.mpm is not None


@pytest.fixture(scope='module')
def base_img_params_wsi():
    yield {'img_work_size': "1.25x",
           'mask_statistics': 'relative2mask',
           'confirm_base_mag': False}


@pytest.fixture(scope='module')
def base_img_params_pil(base_img_params_wsi, svs_small_mag):
    mag_dict = {"base_mag": float(svs_small_mag)}
    yield {**base_img_params_wsi, **mag_dict}


@pytest.fixture(scope='module')
def pipeline_ext_params():
    func_list = [(BasicModule.getBasicStats, {"image_work_size": "1.25x"}),
                 (BlurDetectionModule.identifyBlurryRegions, dict()),
                 (BasicModule.finalComputations, dict()),
                 (BrightContrastModule.getContrast, {"limit_to_mask": False}),
                 (BrightContrastModule.getBrightnessGray, {"limit_to_mask": True}),
                 (BrightContrastModule.getBrightnessByChannelinColorSpace, {"limit_to_mask": True}),
                 (BrightContrastModule.getBrightnessByChannelinColorSpace, {"limit_to_mask": True,
                                                                            "to_color_space": "YUV"}),
                 (TileExtractionModule.extract, { 'tile_size': 256,
                                                  'tile_stride': 256,
                                                  'tissue_ratio': 0.5,
                                                  })
                 ]
    yield func_list


@pytest.fixture(scope='module')
def not_that_great_pipeline_interface(pipeline_ext_params):
    yield Pipeline.from_funcs(pipeline_ext_params, mpm=None)


def base_image_helper(img_loc: Optional[str], fname_outdir, base_img_params):
    base_class = format_img_type(img_loc)
    s = base_class.build(img_loc, fname_outdir, params=base_img_params)
    return s


def pipeline_process_helper(s: BaseImage, pipeline: Pipeline):
    try:
        pipeline(s)
    except Exception:
        pytest.fail(f"Execution Error")
    assert len(s['completed']) == len(pipeline), f"Inconsistent count of executed processes"


def test_pipeline_wsi(svs_small, tmp_path, base_img_params_wsi, not_that_great_pipeline_interface):
    wsi_loc = str(svs_small)
    s = base_image_helper(wsi_loc, str(tmp_path), base_img_params_wsi)
    pipeline_process_helper(s, not_that_great_pipeline_interface)


def test_pipeline_png(img_src, tmp_path, base_img_params_pil, not_that_great_pipeline_interface):
    sample_region, img_dest = img_src
    out_path = str(tmp_path)
    img_path_str = str(img_dest)
    s_fname = base_image_helper(img_path_str, out_path, base_img_params_pil)
    pipeline_process_helper(s_fname, not_that_great_pipeline_interface)

    params_with_pil = {'img_array_input': sample_region, **base_img_params_pil}
    s_pil = base_image_helper(None, out_path, params_with_pil)
    pipeline_process_helper(s_pil, not_that_great_pipeline_interface)