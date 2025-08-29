#!/usr/bin/env python3
"""
Test script for the depth generation API
"""
import requests
import os
from PIL import Image
import io

def test_api_health():
    """Test the health endpoint"""
    print("Testing API health...")
    try:
        response = requests.get('http://localhost:5000/health')
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_depth_generation(image_path):
    """Test depth map generation"""
    if not os.path.exists(image_path):
        print(f"Test image not found: {image_path}")
        return False
    
    print(f"Testing depth generation with {image_path}...")
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            data = {
                'max_size': '512',  # Smaller size for faster testing
                'format': 'png'
            }
            
            response = requests.post(
                'http://localhost:5000/generate-depth', 
                files=files, 
                data=data,
                timeout=30
            )
        
        if response.status_code == 200:
            # Save the returned depth map
            output_path = 'test_depth_output.png'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            print(f"✅ Depth map saved to {output_path}")
            
            # Verify it's a valid image
            try:
                img = Image.open(output_path)
                print(f"✅ Generated depth map: {img.size}, mode: {img.mode}")
                return True
            except Exception as e:
                print(f"❌ Generated file is not a valid image: {e}")
                return False
        else:
            print(f"❌ Request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def create_test_image():
    """Create a simple test image if none exists"""
    test_path = 'test_image.jpg'
    if os.path.exists(test_path):
        return test_path
    
    print("Creating test image...")
    # Create a simple gradient image
    img = Image.new('RGB', (400, 300))
    pixels = img.load()
    
    for i in range(img.width):
        for j in range(img.height):
            # Create a diagonal gradient
            val = int((i + j) / (img.width + img.height) * 255)
            pixels[i, j] = (val, val//2, 255-val)
    
    img.save(test_path, 'JPEG')
    print(f"Test image created: {test_path}")
    return test_path

def main():
    print("=== Depth Generation API Test ===\n")
    
    # Test 1: Health check
    if not test_api_health():
        print("❌ API is not running. Start it with: python depth_api.py")
        return
    
    print()
    
    # Test 2: Depth generation
    test_image = create_test_image()
    if test_depth_generation(test_image):
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Depth generation test failed")

if __name__ == '__main__':
    main()