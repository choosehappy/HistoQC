import unittest

# Import your test files
from histoqc.tests.test_images_tsv_results import TestTargetResultsModule
from histoqc.tests.test_base_image import TestBaseImageModule

# Create a test suite
test_suite = unittest.TestLoader().loadTestsFromTestCase(TestTargetResultsModule)
test_suite.addTest(unittest.TestLoader().loadTestsFromTestCase(TestBaseImageModule))

# Run the tests
unittest.TextTestRunner(verbosity=1).run(test_suite)
