#!/usr/bin/env python3
"""
Test script for the video generation API
"""
import requests
import os
import time
from PIL import Image, ImageDraw
import tempfile

def create_test_image():
    """Create a test image with depth variation"""
    width, height = 800, 600
    img = Image.new('RGB', (width, height), color='black')
    draw = ImageDraw.Draw(img)
    
    # Create a scene with multiple depth layers
    # Background (far) - blue gradient
    for y in range(height):
        color_val = int(100 + (y / height) * 100)
        draw.line([(0, y), (width, y)], fill=(0, 0, color_val))
    
    # Middle ground - green rectangle
    draw.rectangle([200, 200, 600, 400], fill=(0, 150, 0))
    
    # Foreground - red circle (closest)
    draw.ellipse([350, 250, 450, 350], fill=(200, 0, 0))
    
    # Add some text
    try:
        draw.text((50, 50), "PARALLAX TEST", fill=(255, 255, 255))
    except:
        pass  # Font might not be available
    
    return img

def test_api_health():
    """Test the health endpoint"""
    print("Testing Video API health...")
    try:
        response = requests.get('http://localhost:5001/health')
        print(f"Health check: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        if not data.get('depth_api_connected', False):
            print("⚠️  Depth API is not connected!")
            return False
            
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_depth_preview():
    """Test depth map preview generation"""
    print("\nTesting depth map preview...")
    
    # Create test image
    test_img = create_test_image()
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
        test_img.save(temp_file.name, 'PNG')
        temp_path = temp_file.name
    
    try:
        with open(temp_path, 'rb') as f:
            files = {'image': f}
            data = {'depth_size': '512'}  # Smaller for faster testing
            
            response = requests.post(
                'http://localhost:5001/preview-depth',
                files=files,
                data=data,
                timeout=60
            )
        
        if response.status_code == 200:
            # Save depth map
            depth_output = 'test_depth_preview.png'
            with open(depth_output, 'wb') as f:
                f.write(response.content)
            print(f"✅ Depth map preview saved: {depth_output}")
            
            # Verify it's a valid image
            try:
                depth_img = Image.open(depth_output)
                print(f"✅ Depth map: {depth_img.size}, mode: {depth_img.mode}")
                return True
            except Exception as e:
                print(f"❌ Invalid depth map: {e}")
                return False
        else:
            print(f"❌ Preview failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)

def test_video_generation():
    """Test full video generation"""
    print("\nTesting video generation...")
    
    # Create test image
    test_img = create_test_image()
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
        test_img.save(temp_file.name, 'PNG')
        temp_path = temp_file.name
    
    try:
        with open(temp_path, 'rb') as f:
            files = {'image': f}
            data = {
                'camera_movement': '0.15',  # Slightly stronger movement
                'movement_range': '0.2',
                'duration': '2.0',  # Shorter for testing
                'width': '1280',  # Smaller resolution for faster processing
                'height': '720',
                'fps': '24',  # Lower fps for faster processing
                'depth_size': '512'
            }
            
            print("  Generating video (this may take a minute)...")
            start_time = time.time()
            
            response = requests.post(
                'http://localhost:5001/generate-video',
                files=files,
                data=data,
                timeout=120  # 2 minute timeout
            )
        
        if response.status_code == 200:
            # Save video
            video_output = 'test_parallax_animation.mp4'
            with open(video_output, 'wb') as f:
                f.write(response.content)
            
            elapsed = time.time() - start_time
            print(f"✅ Video saved: {video_output} (took {elapsed:.1f}s)")
            
            # Check file size
            file_size = os.path.getsize(video_output)
            print(f"✅ Video file size: {file_size / 1024 / 1024:.1f} MB")
            
            return True
        else:
            print(f"❌ Video generation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)

def main():
    print("=== Video Generation API Test ===\n")
    
    # Test 1: Health check
    if not test_api_health():
        print("\n❌ API is not healthy. Make sure both APIs are running:")
        print("  Terminal 1: python depth_api.py")
        print("  Terminal 2: python video_api.py")
        return
    
    # Test 2: Depth preview
    if not test_depth_preview():
        print("\n❌ Depth preview test failed")
        return
    
    # Test 3: Video generation
    if test_video_generation():
        print("\n✅ All tests passed!")
        print("\n📹 Check the generated files:")
        print("  - test_depth_preview.png (depth map)")
        print("  - test_parallax_animation.mp4 (video)")
    else:
        print("\n❌ Video generation test failed")

if __name__ == '__main__':
    main()