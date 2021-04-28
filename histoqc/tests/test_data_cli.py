import os

from histoqc.data.__main__ import main


def test_data_cli_write_output(tmp_path):
    assert main([os.fspath(tmp_path)]) == 0
    assert set(x.name for x in tmp_path.iterdir()) == {'templates', 'models', 'pen'}


def test_data_cli_incorrect_output(capsys):
    assert main(['does-not-exist']) == -1
    captured = capsys.readouterr()
    assert 'does-not-exist' in captured.err
