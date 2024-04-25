import os
import shutil
import textwrap

import pytest

from histoqc.__main__ import main


# --- small helpers ---
def _filenames_in(pth): return set(x.name for x in pth.glob('*'))
def _error_log(pth): return pth.joinpath('error.log').read_text()
def _results_tsv(pth): return pth.joinpath('results.tsv').read_text()


def test_cli_no_args(capsys):
    with pytest.raises(SystemExit):
        main([])
    captured = capsys.readouterr()
    assert 'required: input_pattern' in captured.err


@pytest.fixture(scope='module')
def single_svs_dir(tmp_path_factory, svs_small):
    pth = tmp_path_factory.mktemp('histoqc_test_single')
    shutil.copy(svs_small, pth)
    yield pth


def test_cli_defaults(single_svs_dir, tmp_path, capsys):
    assert main(['-p', os.fspath(single_svs_dir), '-o', os.fspath(tmp_path), '*.svs']) == 0
    captured = capsys.readouterr()
    assert _filenames_in(tmp_path) == _filenames_in(single_svs_dir).union(['error.log', 'results.tsv'])
    assert _error_log(tmp_path)
    assert _results_tsv(tmp_path)
    assert "0 explicitly failed images" in captured.err.strip().split('\n')[-1]


@pytest.fixture(scope='module')
def multi_svs_dir(tmp_path_factory, svs_small):
    pth = tmp_path_factory.mktemp('histoqc_test_multi')
    shutil.copy(svs_small, pth.joinpath('1.svs'))
    shutil.copy(svs_small, pth.joinpath('2.svs'))
    yield pth


@pytest.fixture(scope='function')
def minimal_config(tmp_path_factory):
    pth = tmp_path_factory.mktemp('config').joinpath('min_config.ini')
    pth.write_text(
        textwrap.dedent("""\
            [pipeline]
            steps= BasicModule.getBasicStats
                BasicModule.finalComputations


            [BaseImage.BaseImage]
            image_work_size = 1.25x
            handles = openslide

            #three options: relative2mask, absolute, relative2image
            mask_statistics = relative2mask

            confirm_base_mag: False


            [BasicModule.getBasicStats]
            image_work_size = 1.25x
            """)
    )
    yield pth


def test_cli_multiprocess(multi_svs_dir, tmp_path):
    assert main(['-n', '2', '-p', os.fspath(multi_svs_dir), '-o', os.fspath(tmp_path), '*.svs']) == 0
    assert _filenames_in(tmp_path) == _filenames_in(multi_svs_dir).union(['error.log', 'results.tsv'])


def test_cli_multiprocess_batching(multi_svs_dir, tmp_path, minimal_config, tmp_path_factory):
    spth = tmp_path_factory.mktemp('spth')

    assert main([
        '-n', '2',
        '-b', '1',
        '-c', os.fspath(minimal_config),
        '-p', os.fspath(multi_svs_dir),
        '-o', os.fspath(tmp_path),
        '--symlink', os.fspath(spth),
        '*.svs'
    ]) == 0
    assert _filenames_in(tmp_path) == _filenames_in(multi_svs_dir).union(['error.log',
                                                                          'results_0.tsv', 'results_1.tsv'])


@pytest.fixture(scope='module')
def wsi_base_config():
    conf_txt = """
            [BaseImage.BaseImage]
            image_work_size = 1.25x
            #three options: relative2mask, absolute, relative2image
            mask_statistics = relative2mask
            confirm_base_mag: False
            \
    """
    yield conf_txt


def config_extract_module_helper(base_img_conf):
    txt = textwrap.dedent(f"""\
            [pipeline]
            steps= BasicModule.getBasicStats
                   BlurDetectionModule.identifyBlurryRegions
                   BrightContrastModule.getContrast
                   SaveModule.saveFinalMask
                   TileExtractionModule.extract
                   SaveModule.saveThumbnails
                   BasicModule.finalComputations                
            \
            {base_img_conf}
            \

            [BasicModule.getBasicStats]
            image_work_size = 1.25x

            [BrightContrastModule.getContrast]
            limit_to_mask: False


            [BrightContrastModule.getBrightnessGray]
            limit_to_mask: True

            [BrightContrastModule.getBrightnessByChannelinColorSpace:RGB]
            limit_to_mask: True

            [TileExtractionModule.extract]
            tile_size = 256
            tile_stride = 256
            tissue_ratio = 0.5


            [BrightContrastModule.getBrightnessByChannelinColorSpace:YUV]
            limit_to_mask: True
            to_color_space: YUV
            [DeconvolutionModule.separateStains]
            ;hed_from_rgb: Hematoxylin + Eosin + DAB
            ;hdx_from_rgb: Hematoxylin + DAB
            ;fgx_from_rgb: Feulgen + Light Green
            ;bex_from_rgb: Giemsa stain : Methyl Blue + Eosin
            ;rbd_from_rgb: FastRed + FastBlue + DAB
            ;gdx_from_rgb: Methyl Green + DAB
            ;hax_from_rgb: Hematoxylin + AEC
            ;bro_from_rgb: Blue matrix Anilline Blue + Red matrix Azocarmine + Orange matrix Orange-G
            ;bpx_from_rgb: Methyl Blue + Ponceau Fuchsin
            ;ahx_from_rgb: Alcian Blue + Hematoxylin
            ;hpx_from_rgb: Hematoxylin + PAS
            stain: hed_from_rgb
            use_mask: True
            """)
    return txt


@pytest.fixture(scope='module')
def config_ext_wsi(tmp_path_factory, wsi_base_config):
    pth = tmp_path_factory.mktemp('config').joinpath('config_ext_wsi.ini')
    pth.write_text(config_extract_module_helper(wsi_base_config))
    yield pth


def test_cli_extraction(multi_svs_dir, tmp_path, config_ext_wsi):
    assert main(['-n', '0',
                 '-c', os.fspath(config_ext_wsi),
                 '-p', os.fspath(multi_svs_dir),
                 '-o', os.fspath(tmp_path),
                 '*.svs']) == 0
    assert _filenames_in(tmp_path) == _filenames_in(multi_svs_dir).union(['error.log', 'results.tsv'])
    assert all(['tiles' in _filenames_in(tmp_path / x) for x in _filenames_in(multi_svs_dir)])
    assert all([f"{x}_tile_bbox.png" in _filenames_in(tmp_path / x) for x in _filenames_in(multi_svs_dir)])

