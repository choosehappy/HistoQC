import os
import threading
import time

import pytest
import requests

from histoqc.ui import _create_server
from histoqc.ui import _serve_httpd
from histoqc.ui.__main__ import main


@pytest.fixture(scope='class')
def cwd_tmp_path(request, tmp_path_factory):
    tmp = tmp_path_factory.mktemp('histoqc_server_cwd')
    os.chdir(os.fspath(tmp))
    yield tmp
    os.chdir(request.config.invocation_dir)


@pytest.fixture(scope='class')
def server(request, cwd_tmp_path):
    host = '127.0.0.1'
    port = 8080

    with _create_server(os.fspath(cwd_tmp_path), host=host, port=port) as httpd:
        t = threading.Thread(target=_serve_httpd, args=(httpd,))
        t.start()
        for _ in range(20):
            time.sleep(0.05)
        request.cls.server = httpd
        request.cls.cwd = cwd_tmp_path
        yield f'http://{host}:{port}'
        httpd.shutdown()


@pytest.mark.usefixtures('server')
class TestUIServer:

    def test_ui_server(self, server):
        r = requests.get(f'{server}/')
        assert r.status_code == 200

    def test_ui_server_data_directory_mount(self, cwd_tmp_path, server):
        cwd_tmp_path.joinpath('file.txt').touch()
        r = requests.get(f'{server}/Data/file.txt')
        assert r.status_code == 200

    def test_ui_server_invalid_path(self, server):
        r = requests.get(f'{server}/does-not-exist')
        assert r.status_code == 404


def test_ui_server_deploy(tmp_path):
    assert main(['--deploy', os.fspath(tmp_path)]) == 0
    assert len(list(tmp_path.joinpath('UserInterface').glob('**/*'))) > 0


def test_ui_server_deploy_no_dir(tmp_path, capsys):
    assert main(['--deploy', os.fspath(tmp_path.joinpath('doesnotexist'))]) == -1
    captured = capsys.readouterr()
    assert 'doesnotexist' in captured.err
