#!/usr/bin/env python3
"""
Multi-Image Composition API Server
Handles multi-image composition requests via REST API
"""
import os
import io
import json
import tempfile
import time
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
from composition_engine import CompositionEngine, ImageConfig

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = '/tmp/parallax_studio_compositions'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    # Test video API connection
    video_api_healthy = False
    try:
        import requests
        video_api_url = os.environ.get('VIDEO_API_URL', 'http://localhost:5001')
        response = requests.get(f'{video_api_url}/health', timeout=5)
        video_api_healthy = response.status_code == 200
    except:
        pass
    
    return jsonify({
        'status': 'healthy',
        'video_api_connected': video_api_healthy,
        'upload_folder': UPLOAD_FOLDER
    })

@app.route('/compose', methods=['POST'])
def compose_images():
    """
    Compose multiple images into a single MP4 video
    
    JSON payload:
    {
        "video_settings": {
            "width": 1920,
            "height": 1080,
            "fps": 30
        },
        "images": [
            {
                "duration": 3.0,
                "camera_movement": 0.1,
                "movement_range": 0.17,
                "transition_type": "fade",
                "transition_duration": 0.5
            }
        ]
    }
    
    Form files:
        - image_0, image_1, image_2, ... (image files)
        - depth_0, depth_1, depth_2, ... (optional depth maps)
    """
    try:
        # Parse JSON configuration
        config_data = {}
        if request.is_json:
            config_data = request.get_json()
        elif 'config' in request.form:
            config_data = json.loads(request.form['config'])
        else:
            # Use default configuration
            config_data = {
                "video_settings": {"width": 1920, "height": 1080, "fps": 30},
                "images": []
            }
        
        # Find uploaded images
        image_files = []
        depth_files = {}
        
        for key, file in request.files.items():
            if key.startswith('image_'):
                index = int(key.split('_')[1])
                if allowed_file(file.filename):
                    image_files.append((index, file))
            elif key.startswith('depth_'):
                index = int(key.split('_')[1])
                if allowed_file(file.filename):
                    depth_files[index] = file
        
        if not image_files:
            return jsonify({'error': 'No valid image files provided'}), 400
        
        # Sort by index
        image_files.sort(key=lambda x: x[0])
        
        # Create temporary directory for uploads
        timestamp = str(int(time.time() * 1000))
        temp_upload_dir = os.path.join(UPLOAD_FOLDER, f'upload_{timestamp}')
        os.makedirs(temp_upload_dir, exist_ok=True)
        
        try:
            # Save uploaded files and create ImageConfig objects
            images = []
            
            for i, (index, image_file) in enumerate(image_files):
                # Save image file
                image_filename = secure_filename(f"image_{index}_{image_file.filename}")
                image_path = os.path.join(temp_upload_dir, image_filename)
                image_file.save(image_path)
                
                # Save depth file if provided
                depth_path = None
                if index in depth_files:
                    depth_filename = secure_filename(f"depth_{index}_{depth_files[index].filename}")
                    depth_path = os.path.join(temp_upload_dir, depth_filename)
                    depth_files[index].save(depth_path)
                
                # Get configuration for this image
                img_config_data = {}
                if i < len(config_data.get('images', [])):
                    img_config_data = config_data['images'][i]
                
                # Create ImageConfig
                img_config = ImageConfig(
                    image_path=image_path,
                    depth_path=depth_path,
                    duration=img_config_data.get('duration', 3.0),
                    camera_movement=img_config_data.get('camera_movement', 0.1),
                    movement_range=img_config_data.get('movement_range', 0.17),
                    transition_type=img_config_data.get('transition_type', 'fade'),
                    transition_duration=img_config_data.get('transition_duration', 0.5)
                )
                images.append(img_config)
            
            # Initialize composition engine
            video_settings = config_data.get('video_settings', {})
            engine = CompositionEngine(
                width=video_settings.get('width', 1920),
                height=video_settings.get('height', 1080),
                fps=video_settings.get('fps', 30)
            )
            
            # Create output path
            output_filename = f"composition_{timestamp}.mp4"
            output_path = os.path.join(temp_upload_dir, output_filename)
            
            # Generate composition
            print(f"Creating composition with {len(images)} images...")
            video_api_url = os.environ.get('VIDEO_API_URL', 'http://localhost:5001')
            
            engine.compose_video(images, output_path, video_api_url)
            
            # Return the composed video
            return send_file(
                output_path,
                mimetype='video/mp4',
                as_attachment=True,
                download_name='composition.mp4'
            )
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        
        # Note: temp files are not cleaned up immediately to allow file download
        # They should be cleaned up by a separate cleanup process
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/compose-from-config', methods=['POST'])
def compose_from_config():
    """
    Compose video from uploaded JSON config file + image files
    
    Form files:
        - config: JSON configuration file
        - All image files referenced in config
        - Optional depth map files
    """
    try:
        # Check for config file
        if 'config' not in request.files:
            return jsonify({'error': 'No configuration file provided'}), 400
        
        config_file = request.files['config']
        if config_file.filename == '':
            return jsonify({'error': 'No configuration file selected'}), 400
        
        # Parse config
        try:
            config_data = json.loads(config_file.read().decode('utf-8'))
        except json.JSONDecodeError as e:
            return jsonify({'error': f'Invalid JSON config: {str(e)}'}), 400
        
        timestamp = str(int(time.time() * 1000))
        temp_upload_dir = os.path.join(UPLOAD_FOLDER, f'config_{timestamp}')
        os.makedirs(temp_upload_dir, exist_ok=True)
        
        try:
            # Save config file
            config_path = os.path.join(temp_upload_dir, 'config.json')
            with open(config_path, 'w') as f:
                json.dump(config_data, f, indent=2)
            
            # Save uploaded files and update paths in config
            uploaded_files = {}
            for key, file in request.files.items():
                if key != 'config' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(temp_upload_dir, filename)
                    file.save(file_path)
                    uploaded_files[file.filename] = file_path
            
            # Update file paths in config to point to uploaded files
            for img_config in config_data.get('images', []):
                image_filename = os.path.basename(img_config['image_path'])
                if image_filename in uploaded_files:
                    img_config['image_path'] = uploaded_files[image_filename]
                
                if 'depth_path' in img_config and img_config['depth_path']:
                    depth_filename = os.path.basename(img_config['depth_path'])
                    if depth_filename in uploaded_files:
                        img_config['depth_path'] = uploaded_files[depth_filename]
            
            # Save updated config
            with open(config_path, 'w') as f:
                json.dump(config_data, f, indent=2)
            
            # Create composition
            engine = CompositionEngine()
            output_filename = f"composition_{timestamp}.mp4"
            output_path = os.path.join(temp_upload_dir, output_filename)
            
            engine.create_composition_from_config(config_path, output_path)
            
            # Return the composed video
            return send_file(
                output_path,
                mimetype='video/mp4',
                as_attachment=True,
                download_name='composition.mp4'
            )
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/example-config', methods=['GET'])
def get_example_config():
    """Return an example configuration JSON"""
    example = {
        "video_settings": {
            "width": 1920,
            "height": 1080,
            "fps": 30
        },
        "images": [
            {
                "image_path": "image1.jpg",
                "depth_path": "depth1.png",
                "duration": 3.0,
                "camera_movement": 0.1,
                "movement_range": 0.17,
                "transition_type": "fade",
                "transition_duration": 0.5
            },
            {
                "image_path": "image2.jpg",
                "duration": 2.5,
                "camera_movement": 0.15,
                "movement_range": 0.2,
                "transition_type": "slide_left",
                "transition_duration": 0.8
            },
            {
                "image_path": "image3.jpg",
                "duration": 4.0,
                "camera_movement": 0.08,
                "movement_range": 0.12,
                "transition_type": "dissolve",
                "transition_duration": 1.0
            }
        ]
    }
    
    return jsonify(example)

if __name__ == '__main__':
    print("Checking video API connection...")
    video_api_url = os.environ.get('VIDEO_API_URL', 'http://localhost:5001')
    
    try:
        import requests
        response = requests.get(f'{video_api_url}/health', timeout=5)
        if response.status_code == 200:
            print("✅ Video API is running")
        else:
            print(f"⚠️  Video API returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Could not connect to video API at {video_api_url}")
        print("   Make sure video API is running: python video_api.py")
        print(f"   Error: {e}")
    
    # Start composition API server
    port = int(os.environ.get('COMPOSITION_PORT', 5002))
    print(f"\nStarting Composition API server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)