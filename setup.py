# This setup.py file is just needed to support editable installs via
# `pip install -e .` and `python setup.py develop`
#
# NOTE:
#   If you want an editable install `python setup.py develop` should
#   not be used and you should always use `pip install -e .`
#   But, it's almost guaranteed that some user will install via
#   the former, and so let's make setuptools_scm work correctly
#   in that case.
#
from setuptools import setup
setup(
    # providing the settings is required for `python setup.py develop`
    # to work correctly with setuptools_scm
    # > set to `True` if we only allow `pip install -e .`
    # ^^^ `True` requires a pyproject.toml with the below config!
    use_scm_version={
        # duplicated config from pyproject.toml; keep in sync
        "write_to": "histoqc/_version.py",
        "version_scheme": "post-release",
    },
    setup_requires=['setuptools_scm']
)
