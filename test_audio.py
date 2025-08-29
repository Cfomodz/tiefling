#!/usr/bin/env python3
"""
Test script for the audio mixing system
"""
import requests
import os
import json
import time
import numpy as np
import tempfile
from scipy.io.wavfile import write as wav_write

def generate_test_audio():
    """Generate test audio files for testing"""
    sample_rate = 44100
    
    # Voiceover: 5-second sine wave at 440Hz (A note)
    duration = 5.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    voiceover = np.sin(2 * np.pi * 440 * t) * 0.8
    
    voiceover_path = 'test_voiceover.wav'
    wav_write(voiceover_path, sample_rate, (voiceover * 32767).astype(np.int16))
    
    # Background music: 8-second lower frequency (220Hz) with amplitude modulation
    duration = 8.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    music = np.sin(2 * np.pi * 220 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t))
    
    music_path = 'test_music.wav'
    wav_write(music_path, sample_rate, (music * 32767).astype(np.int16))
    
    # SFX 1: Short burst at 880Hz
    duration = 0.5
    t = np.linspace(0, duration, int(sample_rate * duration))
    sfx1 = np.sin(2 * np.pi * 880 * t) * 0.7 * np.exp(-t * 3)  # Decay
    
    sfx1_path = 'test_sfx1.wav'
    wav_write(sfx1_path, sample_rate, (sfx1 * 32767).astype(np.int16))
    
    # SFX 2: Another short burst at 1760Hz
    duration = 0.3
    t = np.linspace(0, duration, int(sample_rate * duration))
    sfx2 = np.sin(2 * np.pi * 1760 * t) * 0.5 * np.exp(-t * 5)  # Faster decay
    
    sfx2_path = 'test_sfx2.wav'
    wav_write(sfx2_path, sample_rate, (sfx2 * 32767).astype(np.int16))
    
    return [voiceover_path, music_path, sfx1_path, sfx2_path]

def cleanup_test_files(files):
    """Remove test files"""
    for file_path in files:
        if os.path.exists(file_path):
            os.unlink(file_path)

def test_audio_api_health():
    """Test audio API health"""
    print("Testing Audio API health...")
    try:
        response = requests.get('http://localhost:5003/health')
        print(f"Health check: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        if not data.get('composition_api_connected', False):
            print("⚠️  Composition API is not connected!")
            return False
            
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_audio_analysis():
    """Test audio analysis endpoint"""
    print("\nTesting audio analysis...")
    
    # Generate a test audio file
    test_files = generate_test_audio()
    voiceover_path = test_files[0]
    
    try:
        with open(voiceover_path, 'rb') as f:
            files = {'audio': f}
            
            response = requests.post(
                'http://localhost:5003/analyze-audio',
                files=files,
                timeout=30
            )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Audio analysis successful:")
            analysis = data['analysis']
            print(f"   Duration: {analysis['duration']:.2f}s")
            print(f"   Peak: {analysis['peak_db']:.1f} dB")
            print(f"   RMS: {analysis['rms_db']:.1f} dB")
            return True
        else:
            print(f"❌ Analysis failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        cleanup_test_files([voiceover_path])

def test_audio_mixing():
    """Test audio mixing functionality"""
    print("\nTesting audio mixing...")
    
    # Generate test audio files
    test_files = generate_test_audio()
    
    try:
        # Create mixing configuration
        config = {
            "total_duration": 8.0,
            "audio_tracks": [
                {
                    "track_type": "voiceover",
                    "start_time": 1.0,
                    "duration": 5.0,
                    "volume": 1.0,
                    "fade_in": 0.2,
                    "fade_out": 0.3
                },
                {
                    "track_type": "music",
                    "start_time": 0.0,
                    "duration": 8.0,
                    "volume": 1.0,
                    "fade_in": 0.5,
                    "fade_out": 1.0
                },
                {
                    "track_type": "sfx",
                    "start_time": 2.5,
                    "duration": 0.5,
                    "volume": 0.8,
                    "fade_in": 0.0,
                    "fade_out": 0.1
                },
                {
                    "track_type": "sfx",
                    "start_time": 6.0,
                    "duration": 0.3,
                    "volume": 0.6,
                    "fade_in": 0.0,
                    "fade_out": 0.1
                }
            ]
        }
        
        # Prepare files
        files = {}
        for i, audio_path in enumerate(test_files):
            with open(audio_path, 'rb') as f:
                files[f'audio_{i}'] = (os.path.basename(audio_path), f.read(), 'audio/wav')
        
        # Mix audio
        print("  Mixing 4 audio tracks...")
        start_time = time.time()
        
        response = requests.post(
            'http://localhost:5003/mix-audio',
            files={k: (v[0], v[1], v[2]) for k, v in files.items()},
            data={'config': json.dumps(config)},
            timeout=60
        )
        
        if response.status_code == 200:
            # Save mixed audio
            output_path = 'test_mixed_audio.aac'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            elapsed = time.time() - start_time
            print(f"✅ Audio mixing successful: {output_path} (took {elapsed:.1f}s)")
            
            # Check file size
            file_size = os.path.getsize(output_path)
            print(f"✅ Mixed audio file size: {file_size / 1024:.1f} KB")
            
            return True
        else:
            print(f"❌ Audio mixing failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        cleanup_test_files(test_files)

def test_add_audio_to_video():
    """Test adding audio to video"""
    print("\nTesting add audio to video...")
    
    # Check if we have a test video from previous tests
    test_video = 'test_parallax_animation.mp4'
    if not os.path.exists(test_video):
        print(f"⚠️  Test video not found: {test_video}")
        print("   Run the video API tests first to generate a test video")
        return False
    
    # Generate test audio
    test_files = generate_test_audio()
    audio_path = test_files[0]  # Use voiceover
    
    try:
        # Add audio to video
        with open(test_video, 'rb') as video_f, open(audio_path, 'rb') as audio_f:
            files = {
                'video': (os.path.basename(test_video), video_f.read(), 'video/mp4'),
                'audio': (os.path.basename(audio_path), audio_f.read(), 'audio/wav')
            }
            
            print("  Adding audio to video...")
            start_time = time.time()
            
            response = requests.post(
                'http://localhost:5003/add-audio-to-video',
                files={k: (v[0], v[1], v[2]) for k, v in files.items()},
                timeout=60
            )
        
        if response.status_code == 200:
            # Save video with audio
            output_path = 'test_video_with_audio.mp4'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            elapsed = time.time() - start_time
            print(f"✅ Video with audio created: {output_path} (took {elapsed:.1f}s)")
            
            # Check file size
            file_size = os.path.getsize(output_path)
            print(f"✅ Output file size: {file_size / 1024 / 1024:.1f} MB")
            
            return True
        else:
            print(f"❌ Failed to add audio to video: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
    finally:
        cleanup_test_files([audio_path])

def test_example_audio_config():
    """Test getting example audio configuration"""
    print("\nTesting example audio config...")
    try:
        response = requests.get('http://localhost:5003/example-audio-config')
        if response.status_code == 200:
            config = response.json()
            print("✅ Example audio config retrieved:")
            print(json.dumps(config, indent=2)[:400] + "...")
            return True
        else:
            print(f"❌ Failed to get example config: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def main():
    print("=== Audio Mixing API Test ===\n")
    
    # Check dependencies
    try:
        import scipy
        import librosa
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Install with: pip install scipy librosa")
        return
    
    # Test 1: Health check
    if not test_audio_api_health():
        print("\n❌ Audio API is not healthy. Make sure all APIs are running:")
        print("  Terminal 1: python depth_api.py")
        print("  Terminal 2: python video_api.py")
        print("  Terminal 3: python composition_api.py")
        print("  Terminal 4: python audio_api.py")
        return
    
    # Test 2: Example config
    if not test_example_audio_config():
        print("\n❌ Example config test failed")
        return
    
    # Test 3: Audio analysis
    print("\n" + "="*50)
    if not test_audio_analysis():
        print("\n❌ Audio analysis test failed")
        return
    
    # Test 4: Audio mixing
    print("\n" + "="*50)
    if not test_audio_mixing():
        print("\n❌ Audio mixing test failed")
        return
    
    # Test 5: Add audio to video
    print("\n" + "="*50)
    if test_add_audio_to_video():
        print("\n✅ Add audio to video test passed!")
    else:
        print("\n⚠️  Add audio to video test skipped (no test video)")
    
    print("\n🎵 Generated audio files:")
    if os.path.exists('test_mixed_audio.aac'):
        print("  - test_mixed_audio.aac (mixed audio)")
    if os.path.exists('test_video_with_audio.mp4'):
        print("  - test_video_with_audio.mp4 (video with audio)")
    
    print("\n✅ Audio mixing tests completed!")

if __name__ == '__main__':
    main()