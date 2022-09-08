import pytest
import os

@pytest.fixture(scope='module')
def img_src():
    root = 'Z:/unit_test_data/histoqc'
    wsi_loc = os.path.join(root, 'sample_wsi.ndpi')
    png_loc = os.path.join(root, 'sample_roi.png')

