import io, os, re, cv2
import pandas as pd

# the two images are equal if the histogram correlation coefficient is greater than or equal to 0.95.
def compare_images(image_path1, image_path2):
    # Load the two images
    image1 = cv2.imread(image_path1)
    image2 = cv2.imread(image_path2)
    # Check if the images have the same dimensions
    if image1.shape == image2.shape:
        # Compare the two images for exact equality
        difference = cv2.subtract(image1, image2)
        b, g, r = cv2.split(difference)
        if cv2.countNonZero(b) == 0 and cv2.countNonZero(g) == 0 and cv2.countNonZero(r) == 0:
            return True
        else:
            return False
    else:
        return False
    # Compare the two images

def parseLabel(label_name, content):
    label_pattern = re.compile(fr'{label_name}?\s*([^\n]*)\n')
    match = label_pattern.search(content)
    if match:
        return match.group(1)
    else:
        return None

def parseDataset(name, content):
    # print(f'name: {name}')
    dataset_pattern = re.compile(fr'{name}\s?')
    dataset_content = dataset_pattern.split(content, 1)[1]    
    return pd.read_csv(io.StringIO(dataset_content), sep='\t', header=0)