import unittest
from histoqc.BaseImage import BaseImage
from histoqc.BasicModule import getBasicStats, finalComputations

file_name = './histoqc/tests/data/TCGA-EJ-5509-01A-01-BS1_ROI.svs'
fname_outdir = './histoqc/tests/new'





class TestBaseImageModule(unittest.TestCase):

    def setUp(self):
        self.base_image = BaseImage(
            file_name, fname_outdir, 
            dict(
                image_work_size='1.25x',
                in_memory_compression='True',
                confirm_base_mag='False',
                mask_statistics = 'relative2mask'
            )
        )
        getBasicStats(self.base_image, dict(image_work_size = '1.25x'))
        finalComputations(self.base_image, dict())
        self.base_info = {'filename':'TCGA-EJ-5509-01A-01-BS1_ROI.svs',
            'comments':' ',
            'image_bounding_box':(0, 0, 4092, 4092),
            'base_mag':20.0,
            'type':'aperio',
            'levels':'1',
            'height':'4092',
            'width':'4092',
            'mpp_x':'0.50149999999999995',
            'mpp_y':'0.50149999999999995',
            'comment':'Aperio Fake |AppMag = 20|MPP = 0.5015',
            }
        
        self.pixels_to_use='65536'
        

    def tearDown(self):
        del self.base_image

    def test_get_basic_stats(self):
        for field in self.base_info:
            with self.subTest('BaseImage.getBasicStats', field=field):
                self.assertEqual(self.base_image[field],self.base_info[field])
                print(f'{field} pass')

    def test_final_computations(self):
        self.assertEqual(self.base_image['pixels_to_use'],self.pixels_to_use)
        print(f'pixels_to_use pass')


if __name__ == '__main__':
    unittest.main()
