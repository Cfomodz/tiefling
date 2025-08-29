#!/usr/bin/env python3
"""
Audio Mixing API Server
Handles audio mixing and final video+audio composition
"""
import os
import io
import json
import tempfile
import time
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
from audio_mixer import AudioMixer, AudioTrack
import requests

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = '/tmp/parallax_studio_audio'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

def allowed_audio_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS

def allowed_video_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    # Test composition API connection
    composition_api_healthy = False
    try:
        composition_api_url = os.environ.get('COMPOSITION_API_URL', 'http://localhost:5002')
        response = requests.get(f'{composition_api_url}/health', timeout=5)
        composition_api_healthy = response.status_code == 200
    except:
        pass
    
    return jsonify({
        'status': 'healthy',
        'composition_api_connected': composition_api_healthy,
        'upload_folder': UPLOAD_FOLDER
    })

@app.route('/analyze-audio', methods=['POST'])
def analyze_audio():
    """
    Analyze uploaded audio file for levels and duration
    
    Form data:
        - audio: Audio file
        
    Returns:
        - JSON with peak, RMS, and duration information
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio']
        if file.filename == '' or not allowed_audio_file(file.filename):
            return jsonify({'error': 'Invalid or no audio file selected'}), 400
        
        # Save uploaded file
        timestamp = str(int(time.time() * 1000))
        filename = secure_filename(f"{timestamp}_{file.filename}")
        audio_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(audio_path)
        
        try:
            # Analyze audio
            mixer = AudioMixer()
            analysis = mixer.analyze_audio_levels(audio_path)
            
            return jsonify({
                'success': True,
                'filename': file.filename,
                'analysis': analysis
            })
            
        finally:
            # Cleanup
            if os.path.exists(audio_path):
                os.unlink(audio_path)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/mix-audio', methods=['POST'])
def mix_audio():
    """
    Mix multiple audio tracks according to configuration
    
    JSON payload:
    {
        "total_duration": 10.5,  // optional
        "audio_tracks": [
            {
                "track_type": "voiceover",
                "start_time": 0.0,
                "duration": 8.0,  // optional
                "volume": 1.0,
                "fade_in": 0.5,
                "fade_out": 0.5
            }
        ]
    }
    
    Form files:
        - audio_0, audio_1, audio_2, ... (audio files in order)
        
    Returns:
        - Mixed audio file
    """
    try:
        # Parse configuration
        config_data = {}
        if request.is_json:
            config_data = request.get_json()
        elif 'config' in request.form:
            config_data = json.loads(request.form['config'])
        else:
            return jsonify({'error': 'No configuration provided'}), 400
        
        # Find uploaded audio files
        audio_files = []
        for key, file in request.files.items():
            if key.startswith('audio_'):
                index = int(key.split('_')[1])
                if allowed_audio_file(file.filename):
                    audio_files.append((index, file))
        
        if not audio_files:
            return jsonify({'error': 'No valid audio files provided'}), 400
        
        # Sort by index
        audio_files.sort(key=lambda x: x[0])
        
        # Create temporary directory
        timestamp = str(int(time.time() * 1000))
        temp_dir = os.path.join(UPLOAD_FOLDER, f'mix_{timestamp}')
        os.makedirs(temp_dir, exist_ok=True)
        
        try:
            # Save uploaded files and create AudioTrack objects
            tracks = []
            
            for i, (index, audio_file) in enumerate(audio_files):
                # Save audio file
                filename = secure_filename(f"track_{index}_{audio_file.filename}")
                audio_path = os.path.join(temp_dir, filename)
                audio_file.save(audio_path)
                
                # Get configuration for this track
                track_config = {}
                if i < len(config_data.get('audio_tracks', [])):
                    track_config = config_data['audio_tracks'][i]
                
                # Create AudioTrack
                track = AudioTrack(
                    file_path=audio_path,
                    track_type=track_config.get('track_type', 'sfx'),
                    start_time=track_config.get('start_time', 0.0),
                    duration=track_config.get('duration'),
                    volume=track_config.get('volume', 1.0),
                    fade_in=track_config.get('fade_in', 0.0),
                    fade_out=track_config.get('fade_out', 0.0)
                )
                tracks.append(track)
            
            # Mix audio
            mixer = AudioMixer()
            output_filename = f"mixed_audio_{timestamp}.aac"
            output_path = os.path.join(temp_dir, output_filename)
            
            total_duration = config_data.get('total_duration')
            mixer.mix_audio_tracks(tracks, output_path, total_duration)
            
            # Return mixed audio
            return send_file(
                output_path,
                mimetype='audio/aac',
                as_attachment=True,
                download_name='mixed_audio.aac'
            )
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        
        # Note: temp files cleaned up by separate process
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/add-audio-to-video', methods=['POST'])
def add_audio_to_video():
    """
    Add audio track to existing video
    
    Form data:
        - video: Video file
        - audio: Audio file
        
    Returns:
        - Video with audio track
    """
    try:
        if 'video' not in request.files or 'audio' not in request.files:
            return jsonify({'error': 'Both video and audio files required'}), 400
        
        video_file = request.files['video']
        audio_file = request.files['audio']
        
        if (video_file.filename == '' or not allowed_video_file(video_file.filename) or
            audio_file.filename == '' or not allowed_audio_file(audio_file.filename)):
            return jsonify({'error': 'Invalid video or audio files'}), 400
        
        # Create temporary directory
        timestamp = str(int(time.time() * 1000))
        temp_dir = os.path.join(UPLOAD_FOLDER, f'combine_{timestamp}')
        os.makedirs(temp_dir, exist_ok=True)
        
        try:
            # Save uploaded files
            video_filename = secure_filename(f"video_{video_file.filename}")
            video_path = os.path.join(temp_dir, video_filename)
            video_file.save(video_path)
            
            audio_filename = secure_filename(f"audio_{audio_file.filename}")
            audio_path = os.path.join(temp_dir, audio_filename)
            audio_file.save(audio_path)
            
            # Combine video and audio
            mixer = AudioMixer()
            output_filename = f"video_with_audio_{timestamp}.mp4"
            output_path = os.path.join(temp_dir, output_filename)
            
            mixer.add_audio_to_video(video_path, audio_path, output_path)
            
            # Return video with audio
            return send_file(
                output_path,
                mimetype='video/mp4',
                as_attachment=True,
                download_name='video_with_audio.mp4'
            )
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/complete-production', methods=['POST'])
def complete_production():
    """
    Complete end-to-end production: images -> parallax video -> add audio
    
    This endpoint combines:
    1. Multi-image composition (via composition API)
    2. Audio mixing
    3. Final video+audio combination
    
    JSON payload:
    {
        "video_config": {
            "video_settings": {"width": 1920, "height": 1080, "fps": 30},
            "images": [...]  // Same as composition API
        },
        "audio_config": {
            "total_duration": 10.5,  // Should match video duration
            "audio_tracks": [...]     // Audio track configurations
        }
    }
    
    Form files:
        - image_0, image_1, ... (images for video)
        - depth_0, depth_1, ... (optional depth maps)
        - audio_0, audio_1, ... (audio tracks)
        
    Returns:
        - Final MP4 with parallax video and mixed audio
    """
    try:
        # Parse configuration
        config_data = {}
        if request.is_json:
            config_data = request.get_json()
        elif 'config' in request.form:
            config_data = json.loads(request.form['config'])
        else:
            return jsonify({'error': 'No configuration provided'}), 400
        
        video_config = config_data.get('video_config', {})
        audio_config = config_data.get('audio_config', {})
        
        # Create temporary directory
        timestamp = str(int(time.time() * 1000))
        temp_dir = os.path.join(UPLOAD_FOLDER, f'production_{timestamp}')
        os.makedirs(temp_dir, exist_ok=True)
        
        try:
            # Step 1: Create video composition using composition API
            print("Step 1: Creating video composition...")
            
            composition_api_url = os.environ.get('COMPOSITION_API_URL', 'http://localhost:5002')
            
            # Prepare files for composition API
            composition_files = {}
            for key, file in request.files.items():
                if key.startswith('image_') or key.startswith('depth_'):
                    composition_files[key] = (file.filename, file.read(), file.content_type)
                    file.seek(0)  # Reset file pointer for potential reuse
            
            # Call composition API
            composition_response = requests.post(
                f'{composition_api_url}/compose',
                files={k: (v[0], v[1], v[2]) for k, v in composition_files.items()},
                data={'config': json.dumps(video_config)},
                timeout=600  # 10 minute timeout for video generation
            )
            
            if composition_response.status_code != 200:
                return jsonify({'error': f'Video composition failed: {composition_response.text}'}), 500
            
            # Save composed video
            video_path = os.path.join(temp_dir, 'composed_video.mp4')
            with open(video_path, 'wb') as f:
                f.write(composition_response.content)
            
            # Step 2: Mix audio tracks
            print("Step 2: Mixing audio tracks...")
            
            # Get audio files
            audio_files = []
            for key, file in request.files.items():
                if key.startswith('audio_'):
                    index = int(key.split('_')[1])
                    if allowed_audio_file(file.filename):
                        audio_files.append((index, file))
            
            if audio_files:
                # Sort and save audio files
                audio_files.sort(key=lambda x: x[0])
                tracks = []
                
                for i, (index, audio_file) in enumerate(audio_files):
                    filename = secure_filename(f"track_{index}_{audio_file.filename}")
                    audio_path = os.path.join(temp_dir, filename)
                    audio_file.save(audio_path)
                    
                    # Get track configuration
                    track_config = {}
                    if i < len(audio_config.get('audio_tracks', [])):
                        track_config = audio_config['audio_tracks'][i]
                    
                    track = AudioTrack(
                        file_path=audio_path,
                        track_type=track_config.get('track_type', 'sfx'),
                        start_time=track_config.get('start_time', 0.0),
                        duration=track_config.get('duration'),
                        volume=track_config.get('volume', 1.0),
                        fade_in=track_config.get('fade_in', 0.0),
                        fade_out=track_config.get('fade_out', 0.0)
                    )
                    tracks.append(track)
                
                # Mix audio
                mixer = AudioMixer()
                mixed_audio_path = os.path.join(temp_dir, 'mixed_audio.aac')
                
                total_duration = audio_config.get('total_duration')
                mixer.mix_audio_tracks(tracks, mixed_audio_path, total_duration)
                
                # Step 3: Combine video and audio
                print("Step 3: Combining video and audio...")
                
                final_output_path = os.path.join(temp_dir, f'final_production_{timestamp}.mp4')
                mixer.add_audio_to_video(video_path, mixed_audio_path, final_output_path)
                
            else:
                # No audio tracks - just return the video
                print("No audio tracks provided, returning video only")
                final_output_path = video_path
            
            # Return final production
            return send_file(
                final_output_path,
                mimetype='video/mp4',
                as_attachment=True,
                download_name='final_production.mp4'
            )
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/example-audio-config', methods=['GET'])
def get_example_audio_config():
    """Return example audio configuration"""
    example = {
        "total_duration": 12.0,
        "audio_tracks": [
            {
                "track_type": "voiceover",
                "start_time": 0.5,
                "duration": 10.0,
                "volume": 1.0,
                "fade_in": 0.3,
                "fade_out": 0.5
            },
            {
                "track_type": "music", 
                "start_time": 0.0,
                "duration": 12.0,
                "volume": 1.0,
                "fade_in": 1.0,
                "fade_out": 2.0
            },
            {
                "track_type": "sfx",
                "start_time": 3.5,
                "duration": 1.0,
                "volume": 0.8,
                "fade_in": 0.1,
                "fade_out": 0.2
            },
            {
                "track_type": "sfx", 
                "start_time": 7.2,
                "duration": 0.5,
                "volume": 0.6,
                "fade_in": 0.0,
                "fade_out": 0.1
            }
        ]
    }
    
    return jsonify(example)

if __name__ == '__main__':
    print("Checking composition API connection...")
    composition_api_url = os.environ.get('COMPOSITION_API_URL', 'http://localhost:5002')
    
    try:
        response = requests.get(f'{composition_api_url}/health', timeout=5)
        if response.status_code == 200:
            print("✅ Composition API is running")
        else:
            print(f"⚠️  Composition API returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Could not connect to composition API at {composition_api_url}")
        print("   Make sure composition API is running: python composition_api.py")
        print(f"   Error: {e}")
    
    # Start audio API server
    port = int(os.environ.get('AUDIO_PORT', 5003))
    print(f"\nStarting Audio API server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)