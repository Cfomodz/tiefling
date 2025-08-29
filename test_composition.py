#!/usr/bin/env python3
"""
Test script for the composition system
"""
import requests
import os
import json
import time
from PIL import Image, ImageDraw
import tempfile

def create_test_images():
    """Create multiple test images with different scenes"""
    images = []
    
    # Image 1: Blue gradient with red circle
    img1 = Image.new('RGB', (800, 600), color='navy')
    draw1 = ImageDraw.Draw(img1)
    
    # Background gradient
    for y in range(600):
        color_val = int(50 + (y / 600) * 100)
        draw1.line([(0, y), (800, y)], fill=(0, 0, color_val))
    
    # Foreground circle
    draw1.ellipse([300, 200, 500, 400], fill=(255, 50, 50))
    try:
        draw1.text((50, 50), "SCENE 1", fill=(255, 255, 255))
    except:
        pass
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        img1.save(f.name, 'PNG')
        images.append(f.name)
    
    # Image 2: Green gradient with yellow square
    img2 = Image.new('RGB', (800, 600), color='darkgreen')
    draw2 = ImageDraw.Draw(img2)
    
    # Background gradient
    for x in range(800):
        color_val = int(30 + (x / 800) * 80)
        draw2.line([(x, 0), (x, 600)], fill=(0, color_val, 0))
    
    # Foreground square
    draw2.rectangle([250, 150, 550, 450], fill=(255, 255, 0))
    try:
        draw2.text((50, 50), "SCENE 2", fill=(255, 255, 255))
    except:
        pass
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        img2.save(f.name, 'PNG')
        images.append(f.name)
    
    # Image 3: Purple gradient with orange triangle
    img3 = Image.new('RGB', (800, 600), color='purple')
    draw3 = ImageDraw.Draw(img3)
    
    # Background gradient
    for y in range(600):
        color_val = int(80 + (y / 600) * 60)
        draw3.line([(0, y), (800, y)], fill=(color_val, 0, color_val))
    
    # Foreground triangle
    draw3.polygon([(400, 150), (300, 400), (500, 400)], fill=(255, 165, 0))
    try:
        draw3.text((50, 50), "SCENE 3", fill=(255, 255, 255))
    except:
        pass
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        img3.save(f.name, 'PNG')
        images.append(f.name)
    
    return images

def create_test_config(image_paths):
    """Create a test configuration JSON"""
    config = {
        "video_settings": {
            "width": 1280,
            "height": 720,
            "fps": 24
        },
        "images": [
            {
                "image_path": os.path.basename(image_paths[0]),
                "duration": 2.0,
                "camera_movement": 0.12,
                "movement_range": 0.18,
                "transition_type": "fade",
                "transition_duration": 0.5
            },
            {
                "image_path": os.path.basename(image_paths[1]),
                "duration": 2.5,
                "camera_movement": 0.08,
                "movement_range": 0.15,
                "transition_type": "slide_left",
                "transition_duration": 0.7
            },
            {
                "image_path": os.path.basename(image_paths[2]),
                "duration": 2.0,
                "camera_movement": 0.15,
                "movement_range": 0.2,
                "transition_type": "dissolve",
                "transition_duration": 0.8
            }
        ]
    }
    return config

def test_composition_api_health():
    """Test composition API health"""
    print("Testing Composition API health...")
    try:
        response = requests.get('http://localhost:5002/health')
        print(f"Health check: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        if not data.get('video_api_connected', False):
            print("⚠️  Video API is not connected!")
            return False
            
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_example_config():
    """Test getting example configuration"""
    print("\nTesting example config endpoint...")
    try:
        response = requests.get('http://localhost:5002/example-config')
        if response.status_code == 200:
            config = response.json()
            print("✅ Example config retrieved:")
            print(json.dumps(config, indent=2)[:300] + "...")
            return True
        else:
            print(f"❌ Failed to get example config: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_composition_creation():
    """Test creating a composition from multiple images"""
    print("\nTesting composition creation...")
    
    # Create test images
    print("  Creating test images...")
    test_images = create_test_images()
    
    try:
        # Create configuration
        config = create_test_config(test_images)
        
        # Prepare files for upload
        files = {}
        
        # Add images
        for i, img_path in enumerate(test_images):
            with open(img_path, 'rb') as f:
                files[f'image_{i}'] = (os.path.basename(img_path), f.read(), 'image/png')
        
        # Add config as JSON in form data
        data = {'config': json.dumps(config)}
        
        print("  Uploading images and creating composition...")
        print("  (This may take several minutes...)")
        
        start_time = time.time()
        
        response = requests.post(
            'http://localhost:5002/compose',
            files={k: (v[0], v[1], v[2]) for k, v in files.items()},
            data=data,
            timeout=300  # 5 minute timeout
        )
        
        if response.status_code == 200:
            # Save composition
            output_path = 'test_composition.mp4'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            elapsed = time.time() - start_time
            print(f"✅ Composition saved: {output_path} (took {elapsed:.1f}s)")
            
            # Check file size
            file_size = os.path.getsize(output_path)
            print(f"✅ Composition file size: {file_size / 1024 / 1024:.1f} MB")
            
            return True
        else:
            print(f"❌ Composition failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        # Cleanup test images
        for img_path in test_images:
            if os.path.exists(img_path):
                os.unlink(img_path)

def test_config_file_composition():
    """Test composition using separate config file"""
    print("\nTesting config file composition...")
    
    # Create test images
    test_images = create_test_images()
    
    try:
        # Create config file
        config = create_test_config(test_images)
        config_path = 'test_config.json'
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Prepare files
        files = {
            'config': ('config.json', open(config_path, 'rb'), 'application/json')
        }
        
        # Add image files
        for i, img_path in enumerate(test_images):
            files[f'image_{i}'] = (os.path.basename(img_path), open(img_path, 'rb'), 'image/png')
        
        print("  Creating composition from config file...")
        
        start_time = time.time()
        
        response = requests.post(
            'http://localhost:5002/compose-from-config',
            files=files,
            timeout=300
        )
        
        # Close file handles
        for f in files.values():
            if hasattr(f[1], 'close'):
                f[1].close()
        
        if response.status_code == 200:
            # Save composition
            output_path = 'test_composition_from_config.mp4'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            elapsed = time.time() - start_time
            print(f"✅ Config-based composition saved: {output_path} (took {elapsed:.1f}s)")
            
            return True
        else:
            print(f"❌ Config composition failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        # Cleanup
        for img_path in test_images:
            if os.path.exists(img_path):
                os.unlink(img_path)
        if os.path.exists('test_config.json'):
            os.unlink('test_config.json')

def main():
    print("=== Multi-Image Composition API Test ===\n")
    
    # Test 1: Health check
    if not test_composition_api_health():
        print("\n❌ Composition API is not healthy. Make sure all APIs are running:")
        print("  Terminal 1: python depth_api.py")
        print("  Terminal 2: python video_api.py") 
        print("  Terminal 3: python composition_api.py")
        return
    
    # Test 2: Example config
    if not test_example_config():
        print("\n❌ Example config test failed")
        return
    
    # Test 3: Simple composition
    print("\n" + "="*50)
    if test_composition_creation():
        print("\n✅ Simple composition test passed!")
    else:
        print("\n❌ Simple composition test failed")
        return
    
    # Test 4: Config file composition  
    print("\n" + "="*50)
    if test_config_file_composition():
        print("\n✅ Config file composition test passed!")
        
        print("\n🎬 Generated compositions:")
        print("  - test_composition.mp4")
        print("  - test_composition_from_config.mp4")
        print("\n✅ All composition tests passed!")
    else:
        print("\n❌ Config file composition test failed")

if __name__ == '__main__':
    main()