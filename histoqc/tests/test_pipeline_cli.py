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
    assert _filenames_in(tmp_path) == _filenames_in(multi_svs_dir).union(['error.log', 'results_0.tsv', 'results_1.tsv'])
