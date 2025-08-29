#!/usr/bin/env python3
"""
Video Generation API Server
Combines depth generation + parallax rendering into MP4 videos
"""
import os
import io
import tempfile
import base64
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import requests
from parallax_renderer import ParallaxRenderer
from PIL import Image

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = '/tmp/parallax_studio_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}

# Initialize renderer
renderer = ParallaxRenderer(width=1920, height=1080, fps=30)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_depth_map(image_path, max_size=1024):
    """Get depth map from depth API"""
    depth_api_url = os.environ.get('DEPTH_API_URL', 'http://localhost:5000')
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            data = {'max_size': str(max_size), 'format': 'png'}
            
            response = requests.post(
                f'{depth_api_url}/generate-depth',
                files=files,
                data=data,
                timeout=30
            )
        
        if response.status_code == 200:
            # Save depth map to temporary file
            depth_path = os.path.join(UPLOAD_FOLDER, 'temp_depth.png')
            with open(depth_path, 'wb') as f:
                f.write(response.content)
            return depth_path
        else:
            raise Exception(f"Depth API failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        raise Exception(f"Failed to generate depth map: {str(e)}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    # Test depth API connection
    depth_api_healthy = False
    try:
        depth_api_url = os.environ.get('DEPTH_API_URL', 'http://localhost:5000')
        response = requests.get(f'{depth_api_url}/health', timeout=5)
        depth_api_healthy = response.status_code == 200
    except:
        pass
    
    return jsonify({
        'status': 'healthy',
        'depth_api_connected': depth_api_healthy,
        'upload_folder': UPLOAD_FOLDER
    })

@app.route('/generate-video', methods=['POST'])
def generate_video():
    """
    Generate parallax MP4 video from uploaded image
    
    Form data:
        - image: Image file
        - camera_movement: Camera movement strength (default: 0.1)
        - movement_range: Movement range (default: 0.17)  
        - duration: Video duration in seconds (default: 3.0)
        - width: Video width (default: 1920)
        - height: Video height (default: 1080)
        - fps: Frames per second (default: 30)
        - depth_size: Max size for depth processing (default: 1024)
    
    Returns:
        - MP4 video file
    """
    try:
        # Validate input
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid or no image file selected'}), 400
        
        # Get parameters
        camera_movement = float(request.form.get('camera_movement', 0.1))
        movement_range = float(request.form.get('movement_range', 0.17))
        duration = float(request.form.get('duration', 3.0))
        width = int(request.form.get('width', 1920))
        height = int(request.form.get('height', 1080))
        fps = int(request.form.get('fps', 30))
        depth_size = int(request.form.get('depth_size', 1024))
        
        # Save uploaded image
        filename = secure_filename(file.filename)
        timestamp = str(int(time.time() * 1000))
        image_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{filename}")
        file.save(image_path)
        
        try:
            # Step 1: Generate depth map
            print(f"Generating depth map for {image_path}...")
            depth_path = get_depth_map(image_path, depth_size)
            
            # Step 2: Create parallax animation
            print(f"Creating parallax animation...")
            output_filename = f"parallax_{timestamp}.mp4"
            output_path = os.path.join(UPLOAD_FOLDER, output_filename)
            
            # Initialize renderer with custom settings
            custom_renderer = ParallaxRenderer(width=width, height=height, fps=fps)
            custom_renderer.create_parallax_animation(
                image_path, depth_path, output_path,
                camera_movement, movement_range, duration
            )
            
            # Return the video file
            return send_file(
                output_path,
                mimetype='video/mp4',
                as_attachment=True,
                download_name=f'parallax_animation.mp4'
            )
            
        finally:
            # Cleanup temp files
            for temp_file in [image_path, depth_path if 'depth_path' in locals() else None]:
                if temp_file and os.path.exists(temp_file):
                    os.unlink(temp_file)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-video-with-depth', methods=['POST'])
def generate_video_with_depth():
    """
    Generate parallax MP4 video from image + custom depth map
    
    Form data:
        - image: Image file
        - depth_map: Depth map image file
        - camera_movement: Camera movement strength (default: 0.1)
        - movement_range: Movement range (default: 0.17)
        - duration: Video duration in seconds (default: 3.0)
        - width: Video width (default: 1920)
        - height: Video height (default: 1080)  
        - fps: Frames per second (default: 30)
    
    Returns:
        - MP4 video file
    """
    try:
        # Validate input
        if 'image' not in request.files or 'depth_map' not in request.files:
            return jsonify({'error': 'Both image and depth_map files required'}), 400
        
        image_file = request.files['image']
        depth_file = request.files['depth_map']
        
        if (image_file.filename == '' or not allowed_file(image_file.filename) or
            depth_file.filename == '' or not allowed_file(depth_file.filename)):
            return jsonify({'error': 'Invalid image or depth map files'}), 400
        
        # Get parameters
        camera_movement = float(request.form.get('camera_movement', 0.1))
        movement_range = float(request.form.get('movement_range', 0.17))
        duration = float(request.form.get('duration', 3.0))
        width = int(request.form.get('width', 1920))
        height = int(request.form.get('height', 1080))
        fps = int(request.form.get('fps', 30))
        
        # Save uploaded files
        import time
        timestamp = str(int(time.time() * 1000))
        
        image_filename = secure_filename(image_file.filename)
        image_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_img_{image_filename}")
        image_file.save(image_path)
        
        depth_filename = secure_filename(depth_file.filename)
        depth_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_depth_{depth_filename}")
        depth_file.save(depth_path)
        
        try:
            # Create parallax animation
            print(f"Creating parallax animation with custom depth map...")
            output_filename = f"parallax_{timestamp}.mp4"
            output_path = os.path.join(UPLOAD_FOLDER, output_filename)
            
            # Initialize renderer with custom settings
            custom_renderer = ParallaxRenderer(width=width, height=height, fps=fps)
            custom_renderer.create_parallax_animation(
                image_path, depth_path, output_path,
                camera_movement, movement_range, duration
            )
            
            # Return the video file
            return send_file(
                output_path,
                mimetype='video/mp4',
                as_attachment=True,
                download_name=f'parallax_animation.mp4'
            )
            
        finally:
            # Cleanup temp files
            for temp_file in [image_path, depth_path, output_path if 'output_path' in locals() and os.path.exists(output_path) else None]:
                if temp_file and os.path.exists(temp_file):
                    try:
                        os.unlink(temp_file)
                    except:
                        pass  # Ignore cleanup errors
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/preview-depth', methods=['POST'])
def preview_depth():
    """
    Generate and return depth map for preview (doesn't create video)
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid or no image file selected'}), 400
        
        depth_size = int(request.form.get('depth_size', 1024))
        
        # Save uploaded image
        import time
        timestamp = str(int(time.time() * 1000))
        filename = secure_filename(file.filename)
        image_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{filename}")
        file.save(image_path)
        
        try:
            # Generate depth map
            depth_path = get_depth_map(image_path, depth_size)
            
            # Return depth map
            return send_file(
                depth_path,
                mimetype='image/png',
                as_attachment=True,
                download_name='depth_map_preview.png'
            )
            
        finally:
            # Cleanup
            for temp_file in [image_path, depth_path if 'depth_path' in locals() else None]:
                if temp_file and os.path.exists(temp_file):
                    os.unlink(temp_file)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import time
    
    # Check if depth API is running
    print("Checking depth API connection...")
    depth_api_url = os.environ.get('DEPTH_API_URL', 'http://localhost:5000')
    
    try:
        response = requests.get(f'{depth_api_url}/health', timeout=5)
        if response.status_code == 200:
            print("✅ Depth API is running")
        else:
            print(f"⚠️  Depth API returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Could not connect to depth API at {depth_api_url}")
        print("   Make sure to start the depth API first: python depth_api.py")
        print(f"   Error: {e}")
    
    # Start video API server
    port = int(os.environ.get('VIDEO_PORT', 5001))
    print(f"\nStarting Video API server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)