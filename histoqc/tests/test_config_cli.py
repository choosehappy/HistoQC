import pytest

from histoqc.config.__main__ import main


def test_config_cli_list_configurations(capsys):
    assert main(['--list']) == 0
    captured = capsys.readouterr()
    assert not captured.err.strip()
    assert 'default' in captured.out


@pytest.mark.parametrize(
    'config', ['default', 'clinical', 'first', 'light']
)
def test_config_cli_show_configuration(capsys, config):
    assert main(['--show', config]) == 0
    captured = capsys.readouterr()
    assert not captured.err.strip()
    assert config in captured.out
    assert '[pipeline]' in captured.out


def test_config_cli_incorrect_configuration():
    assert main(['--show', 'does-not-exist']) == -1


def test_config_cli_print_usage():
    assert main([]) == -1
