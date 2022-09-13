import pytest
import os
from histoqc.image_core.image_handle import OSHandle, PILHandle
import numpy as np
from histoqc._import_openslide import openslide
import pathlib


@pytest.fixture(scope='session')
def img_src(svs_small):
    svs_loc = str(svs_small)
    osh = openslide.OpenSlide(svs_loc)
    width, height = 256, 256
    sample_region = osh.read_region((0, 0), 0, (width, height))
    data_dir = os.path.split(svs_loc)[0]
    img_dest = os.path.join(data_dir, f"sample_pil.png")
    sample_region.convert("RGB").save(img_dest)
    yield sample_region, img_dest


def image_handles_helper(pil_handle):
    # png_loc = img_src
    # pil_handle: PILHandle = PILHandle.build(png_loc, dict())
    prop = pil_handle.properties
    assert isinstance(prop, dict) and len(prop) == 0
    assert pil_handle.base_size_wh == pil_handle.handle.size
    assert pil_handle.read_region((0, 0), 0, pil_handle.base_size_wh)\
           == pil_handle.read_region((0, 0), 1, pil_handle.base_size_wh)
    window = (0, 0, pil_handle.base_size_wh[0], pil_handle.base_size_wh[1])
    assert pil_handle.read_region((0, 0), 0, pil_handle.base_size_wh) == pil_handle.handle.crop(window)
    assert pil_handle.get_level_dimensions(0) == pil_handle.base_size_wh == pil_handle.get_level_dimensions(1)


def test_image_handles(img_src):
    sample_region, img_dest = img_src
    pil_handle_fname: PILHandle = PILHandle.build(img_dest, dict())
    image_handles_helper(pil_handle_fname)
    arr = np.array(sample_region)
    pil_handle_arr = PILHandle.build(None, {PILHandle.KEY_IMAGE_DATA: arr})
    image_handles_helper(pil_handle_arr)

    pil_handle_pil = PILHandle.build(None, {PILHandle.KEY_IMAGE_DATA: sample_region})
    image_handles_helper(pil_handle_pil)


def os_handles_helper(os_handle: OSHandle):
    # png_loc = img_src
    # pil_handle: PILHandle = PILHandle.build(png_loc, dict())
    prop = os_handle.properties
    assert prop == os_handle.handle.properties
    assert os_handle.base_size_wh == os_handle.handle.dimensions
    width, height = 512, 512
    assert os_handle.read_region((0, 0), 0, (width, height))\
           == os_handle.handle.read_region((0, 0), 0, (width, height))
    for ii in range(len(os_handle.handle.level_dimensions)):
        assert os_handle.get_level_dimensions(ii) == os_handle.handle.level_dimensions[ii]


def test_os_handles(svs_small):
    os_handle = OSHandle.build(str(svs_small), dict())
    os_handles_helper(os_handle)
