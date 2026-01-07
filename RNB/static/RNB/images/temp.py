from PIL import Image
import os

def rotate_and_crop_image(input_path, output_path, angle=-30, crop_size=(411, 355)):
    """
    Rotate an image by a specified angle and crop to the specified size (411x355),
    removing equal strips from top/bottom and left/right, centered.
    
    Args:
        input_path (str): Path to the input image.
        output_path (str): Path to save the rotated and cropped image.
        angle (float): Rotation angle in degrees (counterclockwise).
        crop_size (tuple): Desired output size (width, height).
    """
    # Check if input file exists
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input image {input_path} not found")
    
    # Open the image
    img = Image.open(input_path)
    
    # Verify original size
    original_size = (355, 411)
    if img.size != original_size:
        print(f"Warning: Input image size {img.size} does not match expected {original_size}")
    
    # Convert to RGBA for transparency
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Rotate the image (counterclockwise, expand=True, transparent background)
    rotated_img = img.rotate(angle, expand=True, fillcolor=(0, 0, 0, 0))
    
    # Get dimensions
    rot_width, rot_height = rotated_img.size
    crop_width, crop_height = crop_size
    
    # Calculate crop box, removing equal strips from top/bottom and left/right
    left = (rot_width - crop_width) // 2
    top = (rot_height - crop_height) // 2
    right = left + crop_width
    bottom = top + crop_height
    
    # Ensure crop box is within image bounds
    left = max(0, left)
    top = max(0, top)
    right = min(rot_width, right)
    bottom = min(rot_height, bottom)
    
    # Crop the image
    cropped_img = rotated_img.crop((left, top, right, bottom))
    
    # If crop box doesn't match desired size, resize to 411x355
    if cropped_img.size != crop_size:
        cropped_img = cropped_img.resize(crop_size, Image.Resampling.LANCZOS)
    
    # Convert back to RGB for JPG output
    cropped_img = cropped_img.convert('RGB')
    
    # Save the result
    cropped_img.save(output_path, quality=95)
    print(f"Saved rotated and cropped image to {output_path} with size {cropped_img.size}")

# Example usage: Process a single image
input_image = r"C:\Roger\Programming\M - Outside of Project\R&B assets\RoadsAndBoats-app\src\RNB\images\hex_00.jpg"
output_image = r"C:\Roger\Programming\M - Outside of Project\R&B assets\RoadsAndBoats-app\src\RNB\images\hex_00_rotated.jpg"
rotate_and_crop_image(input_image, output_image, angle=-30, crop_size=(411, 355))

# Optional: Process all images in a folder
"""
input_folder = r"C:\Roger\Programming\M - Outside of Project\R&B assets\RoadsAndBoats-app\src\RNB\images"
output_folder = r"C:\Roger\Programming\M - Outside of Project\R&B assets\RoadsAndBoats-app\src\RNB\images\rotated"
os.makedirs(output_folder, exist_ok=True)

for filename in os.listdir(input_folder):
    if filename.endswith((".jpg", ".png")):
        input_path = os.path.join(input_folder, filename)
        output_path = os.path.join(output_folder, f"rotated_{filename}")
        rotate_and_crop_image(input_path, output_path, angle=30, crop_size=(411, 355))
"""
