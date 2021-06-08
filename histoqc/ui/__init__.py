"""histoqc.ui

serves the histoqc.ui from the package data
"""
import contextlib
import os.path
import socket
import tempfile
from functools import partial
from http.server import SimpleHTTPRequestHandler
from http.server import ThreadingHTTPServer

try:
    from importlib.resources import files as _files
except ImportError:
    from importlib_resources import files as _files

from histoqc.data import package_resource_copytree


class HistoQCHTTPRequestHandler(SimpleHTTPRequestHandler):
    """the histoqc http request handler

    allows to mount a different directory for paths under Data/
    compared to the default user interface path. This provides
    all that is needed to ship the UI in the histoqc package.
    """
    DATA_URL_PATH = "Data"

    def __init__(self, *args, data_directory, ui_directory, **kwargs):
        self.data_directory = data_directory
        super().__init__(*args, directory=ui_directory, **kwargs)

    def translate_path(self, path):
        path = super().translate_path(path)

        # in case the a resource under DATA_URL_PATH is requested,
        # redirect to the data_directory
        _dpth = os.path.join(self.directory, self.DATA_URL_PATH)
        if os.path.commonpath([_dpth]) == os.path.commonpath([_dpth, path]):
            return os.path.join(self.data_directory, os.path.relpath(path, _dpth))

        return path


@contextlib.contextmanager
def _create_server(data_directory, *, host="0.0.0.0", port=8000):
    """server contextmanager (to simplify testing)"""

    # --- prepare server classes --------------------------------------

    class _DualStackServer(ThreadingHTTPServer):
        # vendored from http.server
        def server_bind(self):
            with contextlib.suppress(Exception):
                self.socket.setsockopt(
                    socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            return super().server_bind()

    # http.server._get_best_family
    _infos = socket.getaddrinfo(
        host, port, type=socket.SOCK_STREAM, flags=socket.AI_PASSIVE
    )
    _family, _, _, _, _sockaddr = next(iter(_infos))
    _DualStackServer.address_family, addr = _family, _sockaddr

    # --- prepare ui structure ----------------------------------------

    with tempfile.TemporaryDirectory() as tmp_dir:
        package_resource_copytree('histoqc.ui', 'UserInterface', tmp_dir)
        ui_directory = os.path.join(tmp_dir, "UserInterface")

        _handler = partial(HistoQCHTTPRequestHandler,
                           ui_directory=ui_directory,
                           data_directory=data_directory)

        # --- start serving -------------------------------------------

        with _DualStackServer(addr, _handler) as httpd:
            yield httpd


def _serve_httpd(httpd):
    """serve helper"""
    host, port = httpd.socket.getsockname()[:2]
    url_host = f'[{host}]' if ':' in host else host
    print(
        f"Serving HistoQC UI on {host} port {port} "
        f"(http://{url_host}:{port}/) ..."
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:  # pragma: no cover
        print("\nKeyboard interrupt received, exiting.")
        return 0


def run_server(data_directory, *, host="0.0.0.0", port=8000):
    """run the histoqc user interface"""
    with _create_server(data_directory, host=host, port=port) as httpd:
        print(f"HistoQC data directory: '{data_directory}'")
        _serve_httpd(httpd)
