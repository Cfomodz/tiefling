#!/usr/bin/env python3
"""
Depth Map Generation API Server
Converts images to depth maps using DepthAnything V2 with GPU acceleration
"""
import os
import io
import torch
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_file
from transformers import pipeline
import cv2

app = Flask(__name__)

# Global model instance - loaded once on startup
depth_estimator = None

def load_model():
    """Load DepthAnything V2 model with GPU support"""
    global depth_estimator
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading DepthAnything V2 model on {device}...")
    
    # Use the same model as the existing ONNX version
    depth_estimator = pipeline(
        "depth-estimation",
        model="depth-anything/Depth-Anything-V2-Small-hf",
        device=0 if torch.cuda.is_available() else -1
    )
    
    print("Model loaded successfully!")

def process_image_to_depth(image_data, max_size=1024):
    """
    Convert PIL Image to depth map
    Args:
        image_data: PIL Image
        max_size: Maximum dimension for processing
    Returns:
        PIL Image (grayscale depth map)
    """
    # Resize image if needed while maintaining aspect ratio
    original_size = image_data.size
    
    # Calculate new size
    width, height = original_size
    if max(width, height) > max_size:
        if width > height:
            new_width = max_size
            new_height = int(height * max_size / width)
        else:
            new_height = max_size
            new_width = int(width * max_size / height)
        
        image_data = image_data.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Generate depth map
    result = depth_estimator(image_data)
    depth_image = result["depth"]
    
    # Convert to grayscale numpy array
    depth_array = np.array(depth_image)
    
    # Normalize to 0-255 range
    depth_normalized = ((depth_array - depth_array.min()) / 
                       (depth_array.max() - depth_array.min()) * 255).astype(np.uint8)
    
    # Resize back to original dimensions
    if image_data.size != original_size:
        depth_resized = cv2.resize(depth_normalized, original_size, interpolation=cv2.INTER_LANCZOS4)
    else:
        depth_resized = depth_normalized
    
    # Convert to PIL Image
    return Image.fromarray(depth_resized, mode='L')

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'gpu_available': torch.cuda.is_available(),
        'model_loaded': depth_estimator is not None
    })

@app.route('/generate-depth', methods=['POST'])
def generate_depth():
    """
    Generate depth map from uploaded image
    
    Form data:
        - image: Image file
        - max_size: Optional max dimension (default 1024)
        - format: Optional output format (png/jpg, default png)
    
    Returns:
        - Grayscale depth map image
    """
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Get optional parameters
        max_size = int(request.form.get('max_size', 1024))
        output_format = request.form.get('format', 'png').lower()
        
        if output_format not in ['png', 'jpg', 'jpeg']:
            output_format = 'png'
        
        # Load and process image
        image_data = Image.open(file.stream).convert('RGB')
        depth_map = process_image_to_depth(image_data, max_size)
        
        # Save to bytes buffer
        img_buffer = io.BytesIO()
        depth_map.save(img_buffer, format='PNG' if output_format == 'png' else 'JPEG')
        img_buffer.seek(0)
        
        return send_file(
            img_buffer,
            mimetype=f'image/{output_format}',
            as_attachment=True,
            download_name=f'depth_map.{output_format}'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-depth-json', methods=['POST'])
def generate_depth_json():
    """
    Generate depth map and return as base64 JSON response
    Useful for programmatic access
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        max_size = int(request.form.get('max_size', 1024))
        
        # Process image
        image_data = Image.open(file.stream).convert('RGB')
        depth_map = process_image_to_depth(image_data, max_size)
        
        # Convert to base64
        import base64
        img_buffer = io.BytesIO()
        depth_map.save(img_buffer, format='PNG')
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'depth_map': img_base64,
            'format': 'png',
            'original_size': image_data.size,
            'processed_size': depth_map.size
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Load model on startup
    load_model()
    
    # Run server
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)