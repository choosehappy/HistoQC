import glob
import os.path
from setuptools import setup

# glob patterns in setup.cfg dont support recursive patterns
# https://github.com/pypa/setuptools/issues/1806
# so we have to do it in setup.py
ui_files = [
    os.path.relpath(f, "histoqc/ui/")
    for f in glob.iglob("histoqc/ui/UserInterface/**/*", recursive=True)
    if os.path.isfile(f)
]
data_files = [
    os.path.relpath(f, "histoqc/data/")
    for folder in ['models', 'pen', 'templates']
    for f in glob.iglob(f"histoqc/data/{folder}/**/*", recursive=True)
    if os.path.isfile(f)
]

setup(
    use_scm_version={
        # duplicated config from pyproject.toml; keep in sync
        "write_to": "histoqc/_version.py",
        "version_scheme": "post-release",
    },
    setup_requires=['setuptools_scm'],
    extras_require={
        "dicom": ["wsidicom"],
        "cucim": ["cucim", "cupy"],
    },
    package_data={
        'histoqc.config': ['*.ini'],
        'histoqc.data': data_files,
        'histoqc.ui': ui_files,
    }
)
