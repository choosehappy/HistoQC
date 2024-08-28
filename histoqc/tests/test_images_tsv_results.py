import os, shutil, unittest
import subprocess
import histoqc.tests.test_utils as tu
    


# def setUpModule():
#     print('Running setUpModule')


# def tearDownModule():
#     print('Running tearDownModule')

module_name = 'histoqc'
test_dir = './histoqc/tests'
config_file_path = './histoqc/config/config_v2.1.ini'
new_result_dir_path = 'new'
target_result_dir_path = 'target'
wsi_name = 'TCGA-EJ-5509-01A-01-BS1_ROI.svs'

new_dir_full_path = os.path.join(test_dir, new_result_dir_path)
target_dir_full_path = os.path.join(test_dir, target_result_dir_path)
wsi_full_path = os.path.join(test_dir, 'data', wsi_name)


def setUpModule():
    print(f'Running the {module_name} module . . .')
    print(config_file_path)
    print(new_dir_full_path)
    print(wsi_full_path)

    # Replace 'module_name' with the name of the Python module you want to run
    
    # Execute the Python module using the subprocess module
    try:
        subprocess.run(['python3.8',
            '-m', module_name,
            '-c', config_file_path,
            '-o', new_dir_full_path,
            '-s', "123",
            wsi_full_path], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running the {module_name} module: {e}")


def tearDownModule():
    print("tearDownModule")

    # Check if the dir exists
    if os.path.exists(new_dir_full_path):
        # Remove the dir and its contents
        shutil.rmtree(new_dir_full_path)
        print(f"Remove {new_dir_full_path} directory")
    else:
        print(f"The directory {new_dir_full_path} does not exist.")

class TestTargetResultsModule(unittest.TestCase):
    # @classmethod
    # def setUpClass(cls):
    #     print('Running setUpClass')

    # @classmethod
    # def tearDownClass(cls):
    #     print('Running tearDownClass')

    def setUp(self):

        # image suffixes
        self.suffixes = [
            'areathresh',
            'blurry',
            'bright',
            'dark',
            'deconv_c0',
            'deconv_c1',
            'deconv_c2',
            'equalized_thumb',
            'fatlike',
            'flat',
            'fuse',
            'hist',
            'mask_use',
            'small_fill',
            'small_remove',
            'spur',
            'thumb_small',
            'thumb'
        ]

        # tsv 
        self.rs_name = "results.tsv"
        # tsv_labels #### '#start_time:', '#outdir:',  '#config_file:',
        self.tsv_labels = ['#pipeline:', '#command_line_args:', '#dataset:']
        # tsv dataset fields
        self.tsv_dataset_fields = ['filename','comments','image_bounding_box','base_mag','type','levels','height','width','mpp_x','mpp_y','comment','brightestPixels','dark','flat_areas','fatlike_tissue_removed_num_regions','fatlike_tissue_removed_mean_area','fatlike_tissue_removed_max_area','fatlike_tissue_removed_percent','small_tissue_filled_num_regions','small_tissue_filled_mean_area','small_tissue_filled_max_area','small_tissue_filled_percent','small_tissue_removed_num_regions','small_tissue_removed_mean_area','small_tissue_removed_max_area','small_tissue_removed_percent','background_contrast','background_contrast_std','background_dissimilarity','background_dissimilarity_std','background_homogeneity','background_homogeneity_std','background_ASM','background_ASM_std','background_energy','background_energy_std','background_correlation','background_correlation_std','background_tenenGrad_contrast','background_michelson_contrast','background_rms_contrast','background_grayscale_brightness','background_grayscale_brightness_std','background_chan1_brightness','background_chan1_brightness_std','background_chan2_brightness','background_chan2_brightness_std','background_chan3_brightness','background_chan3_brightness_std','blurry_removed_num_regions','blurry_removed_mean_area','blurry_removed_max_area','blurry_removed_percent','spur_pixels','areaThresh','template1_MSE_hist','template2_MSE_hist','template3_MSE_hist','template4_MSE_hist','final_contrast','final_contrast_std','final_dissimilarity','final_dissimilarity_std','final_homogeneity','final_homogeneity_std','final_ASM','final_ASM_std','final_energy','final_energy_std','final_correlation','final_correlation_std','tenenGrad_contrast','michelson_contrast','rms_contrast','grayscale_brightness','grayscale_brightness_std','chan1_brightness','chan1_brightness_std','chan2_brightness','chan2_brightness_std','chan3_brightness','chan3_brightness_std','chan1_brightness_YUV','chan1_brightness_std_YUV','chan2_brightness_YUV','chan2_brightness_std_YUV','chan3_brightness_YUV','chan3_brightness_std_YUV','deconv_c0_mean','deconv_c0_std','deconv_c1_mean','deconv_c1_std','deconv_c2_mean','deconv_c2_std','#pieces_of_tissue','pixels_to_use','warnings']       

    def tearDown(self):
        del self.suffixes
        del self.rs_name
        del self.tsv_labels
        del self.tsv_dataset_fields

    def test_images(self):
        # test all images
        for suffix in self.suffixes:
            with self.subTest('Test Generated Images', suffix=suffix):
                slide_name = "TCGA-EJ-5509-01A-01-BS1_ROI.svs"
                img_path1 = os.path.join(new_dir_full_path,slide_name,f"{slide_name}_{suffix}.png")
                img_path2 = os.path.join(target_dir_full_path ,slide_name,f"{slide_name}_{suffix}.png")
                self.assertTrue(tu.compare_images(img_path1, img_path2))
                print(f'{suffix} images comparison pass')
        
    
        # test result files
    def test_result_labels(self):
        file_path1 = os.path.join(new_dir_full_path, self.rs_name)
        file_path2 = os.path.join(target_dir_full_path, self.rs_name)
        
        with open(file_path1, 'r') as file1, open(file_path2, 'r') as file2:
            content1 = file1.read()
            content2 = file2.read()

            # comparing labels
            for label in self.tsv_labels[:-1]:

                label_value1 = tu.parseLabel(label, content1)
                label_value2 = tu.parseLabel(label, content2)

                self.assertEqual(label_value1, label_value2)
                print(f'label {label} in tsv results comparison pass')
            
            # comparing dataset
            dataset_label = self.tsv_labels[-1]
            dataset1 = tu.parseDataset(dataset_label, content1)
            dataset2 = tu.parseDataset(dataset_label, content2)
            for field_name in self.tsv_dataset_fields:
                
                column1 = dataset1[field_name]
                column2 = dataset2[field_name]
                for idx in range(len(column1)):
                    self.assertAlmostEqual(column1[idx],column2[idx])
                    print(f"datasets' {field_name} field in tsv results comparison pass")

if __name__ == '__main__':
    unittest.main()
    
    