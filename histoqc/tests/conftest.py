import hashlib
import pathlib
import shutil
import urllib.request

import pytest

# openslide aperio test images
IMAGES_BASE_URL = "http://openslide.cs.cmu.edu/download/openslide-testdata/Aperio/"


def md5(fn):
    m = hashlib.md5()
    with open(fn, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            m.update(chunk)
    return m.hexdigest()


@pytest.fixture(scope='session')
def svs_small():
    """download the smallest aperio test image svs"""
    small_image = "CMU-1-Small-Region.svs"
    small_image_md5 = "1ad6e35c9d17e4d85fb7e3143b328efe"
    data_dir = pathlib.Path(__file__).parent / "data"

    data_dir.mkdir(parents=True, exist_ok=True)
    img_fn = data_dir / small_image

    if not img_fn.is_file():
        # download svs from openslide test images
        url = IMAGES_BASE_URL + small_image
        with urllib.request.urlopen(url) as response, open(img_fn, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)

    if md5(img_fn) != small_image_md5:  # pragma: no cover
        shutil.rmtree(img_fn)
        pytest.fail("incorrect md5")
    else:
        yield img_fn.absolute()
