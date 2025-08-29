#!/usr/bin/env python3
"""
Test the complete end-to-end production pipeline
"""
import requests
import os
import json
import time
import numpy as np
from PIL import Image, ImageDraw
from scipy.io.wavfile import write as wav_write
import tempfile

def create_production_test_images():
    """Create test images for a complete production"""
    images = []
    
    # Scene 1: Sunrise - warm colors with sun
    img1 = Image.new('RGB', (1200, 800), color='black')
    draw1 = ImageDraw.Draw(img1)
    
    # Sky gradient
    for y in range(800):
        r = int(255 * (1 - y / 800) * 0.8)
        g = int(200 * (1 - y / 800) * 0.6)
        b = int(100 * (1 - y / 800) * 0.3)
        draw1.line([(0, y), (1200, y)], fill=(r, g, b))
    
    # Sun
    draw1.ellipse([500, 150, 700, 350], fill=(255, 255, 0))
    draw1.ellipse([520, 170, 680, 330], fill=(255, 200, 50))
    
    # Mountains (background)
    draw1.polygon([(0, 600), (300, 400), (600, 500), (900, 300), (1200, 450), (1200, 800), (0, 800)], 
                  fill=(80, 60, 100))
    
    try:
        draw1.text((50, 50), "SUNRISE", fill=(255, 255, 255))
    except:
        pass
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        img1.save(f.name, 'PNG')
        images.append(f.name)
    
    # Scene 2: Forest - green scene with trees
    img2 = Image.new('RGB', (1200, 800), color='skyblue')
    draw2 = ImageDraw.Draw(img2)
    
    # Sky
    for y in range(300):
        b = int(135 + (y / 300) * 120)
        draw2.line([(0, y), (1200, y)], fill=(135, 206, b))
    
    # Ground
    draw2.rectangle([0, 600, 1200, 800], fill=(34, 139, 34))
    
    # Trees (different sizes for depth)
    tree_positions = [(200, 500), (400, 450), (600, 480), (800, 460), (1000, 520)]
    for x, y in tree_positions:
        # Trunk
        draw2.rectangle([x-10, y, x+10, 600], fill=(139, 69, 19))
        # Leaves
        draw2.ellipse([x-40, y-80, x+40, y], fill=(0, 128, 0))
    
    try:
        draw2.text((50, 50), "FOREST", fill=(255, 255, 255))
    except:
        pass
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        img2.save(f.name, 'PNG')
        images.append(f.name)
    
    # Scene 3: Night city - urban scene with lights
    img3 = Image.new('RGB', (1200, 800), color='black')
    draw3 = ImageDraw.Draw(img3)
    
    # Night sky gradient
    for y in range(400):
        val = int(30 * (1 - y / 400))
        draw3.line([(0, y), (1200, y)], fill=(val, val, val + 20))
    
    # Buildings (skyline)
    buildings = [
        (50, 300, 150, 800),   # Building 1
        (200, 250, 280, 800),  # Building 2
        (320, 350, 420, 800),  # Building 3
        (460, 200, 560, 800),  # Building 4
        (600, 280, 700, 800),  # Building 5
        (750, 220, 850, 800),  # Building 6
        (900, 320, 1000, 800), # Building 7
        (1050, 260, 1150, 800) # Building 8
    ]
    
    for x1, y1, x2, y2 in buildings:
        # Building body
        draw3.rectangle([x1, y1, x2, y2], fill=(40, 40, 60))
        
        # Windows (lights)
        for wx in range(x1 + 10, x2 - 10, 20):
            for wy in range(y1 + 20, y2 - 20, 30):
                if np.random.random() > 0.3:  # 70% chance of light being on
                    draw3.rectangle([wx, wy, wx + 8, wy + 15], fill=(255, 255, 150))
    
    try:
        draw3.text((50, 50), "CITY NIGHT", fill=(255, 255, 255))
    except:
        pass
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        img3.save(f.name, 'PNG')
        images.append(f.name)
    
    return images

def create_production_test_audio():
    """Create test audio files for a complete production"""
    sample_rate = 44100
    
    # Narrator voiceover (simulated speech patterns)
    duration = 8.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create speech-like pattern with multiple frequencies
    speech = np.zeros_like(t)
    for i in range(0, len(t), int(sample_rate * 0.8)):  # Word every 0.8 seconds
        word_length = min(int(sample_rate * 0.6), len(t) - i)
        word_t = t[i:i+word_length]
        # Mix of formants to simulate speech
        word = (np.sin(2 * np.pi * 200 * word_t) * 0.3 +
                np.sin(2 * np.pi * 400 * word_t) * 0.2 +
                np.sin(2 * np.pi * 800 * word_t) * 0.1) * 0.8
        # Envelope
        envelope = np.exp(-np.abs(word_t - word_t[len(word_t)//2]) * 8)
        speech[i:i+word_length] += word * envelope
    
    narrator_path = 'test_narrator.wav'
    wav_write(narrator_path, sample_rate, (speech * 32767).astype(np.int16))
    
    # Background music (ambient)
    duration = 10.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Layered ambient music
    music = (np.sin(2 * np.pi * 110 * t) * 0.2 +  # Bass
             np.sin(2 * np.pi * 220 * t) * 0.15 +  # Mid
             np.sin(2 * np.pi * 440 * t) * 0.1 +   # High
             np.sin(2 * np.pi * 55 * t) * 0.1)     # Sub bass
    
    # Add some variation
    music *= (1 + 0.3 * np.sin(2 * np.pi * 0.2 * t))  # Slow modulation
    music *= 0.4  # Keep quiet as background
    
    music_path = 'test_ambient_music.wav'
    wav_write(music_path, sample_rate, (music * 32767).astype(np.int16))
    
    # Sound effect 1: Whoosh (transition sound)
    duration = 1.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Swept sine wave
    f_start, f_end = 800, 200
    frequency = f_start * (f_end / f_start) ** (t / duration)
    whoosh = np.sin(2 * np.pi * frequency * t) * np.exp(-t * 2) * 0.6
    
    whoosh_path = 'test_whoosh.wav'
    wav_write(whoosh_path, sample_rate, (whoosh * 32767).astype(np.int16))
    
    # Sound effect 2: Chime (accent sound)
    duration = 0.8
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Bell-like sound
    chime = (np.sin(2 * np.pi * 1000 * t) * np.exp(-t * 3) * 0.4 +
             np.sin(2 * np.pi * 2000 * t) * np.exp(-t * 5) * 0.2 +
             np.sin(2 * np.pi * 3000 * t) * np.exp(-t * 7) * 0.1) * 0.7
    
    chime_path = 'test_chime.wav'
    wav_write(chime_path, sample_rate, (chime * 32767).astype(np.int16))
    
    return [narrator_path, music_path, whoosh_path, chime_path]

def test_complete_production():
    """Test the complete end-to-end production pipeline"""
    print("=== Complete Production Test ===\n")
    print("This test creates a full production with multiple scenes and audio tracks.")
    print("It may take several minutes to complete...\n")
    
    # Create test assets
    print("Creating test images and audio...")
    test_images = create_production_test_images()
    test_audio = create_production_test_audio()
    
    try:
        # Create complete production configuration
        config = {
            "video_config": {
                "video_settings": {
                    "width": 1280,
                    "height": 720,
                    "fps": 24
                },
                "images": [
                    {
                        "duration": 3.0,
                        "camera_movement": 0.12,
                        "movement_range": 0.18,
                        "transition_type": "fade",
                        "transition_duration": 0.8
                    },
                    {
                        "duration": 3.5,
                        "camera_movement": 0.08,
                        "movement_range": 0.15,
                        "transition_type": "slide_left",
                        "transition_duration": 1.0
                    },
                    {
                        "duration": 3.0,
                        "camera_movement": 0.15,
                        "movement_range": 0.22,
                        "transition_type": "dissolve",
                        "transition_duration": 0.6
                    }
                ]
            },
            "audio_config": {
                "total_duration": 9.5,  # Total video duration
                "audio_tracks": [
                    {
                        "track_type": "voiceover",
                        "start_time": 0.5,
                        "duration": 8.0,
                        "volume": 1.0,
                        "fade_in": 0.3,
                        "fade_out": 0.5
                    },
                    {
                        "track_type": "music",
                        "start_time": 0.0,
                        "duration": 9.5,
                        "volume": 1.0,
                        "fade_in": 1.0,
                        "fade_out": 1.5
                    },
                    {
                        "track_type": "sfx",
                        "start_time": 2.8,  # During first transition
                        "duration": 1.0,
                        "volume": 0.7,
                        "fade_in": 0.1,
                        "fade_out": 0.2
                    },
                    {
                        "track_type": "sfx",
                        "start_time": 6.5,  # During second transition
                        "duration": 0.8,
                        "volume": 0.5,
                        "fade_in": 0.0,
                        "fade_out": 0.3
                    }
                ]
            }
        }
        
        # Prepare files for upload
        files = {}
        
        # Add images
        for i, img_path in enumerate(test_images):
            with open(img_path, 'rb') as f:
                files[f'image_{i}'] = (os.path.basename(img_path), f.read(), 'image/png')
        
        # Add audio files
        for i, audio_path in enumerate(test_audio):
            with open(audio_path, 'rb') as f:
                files[f'audio_{i}'] = (os.path.basename(audio_path), f.read(), 'audio/wav')
        
        print("Starting complete production pipeline...")
        print("  - Generating depth maps for 3 images")
        print("  - Creating parallax animations")
        print("  - Composing video with transitions")
        print("  - Mixing 4 audio tracks")
        print("  - Creating final video with audio")
        print("\nThis process may take 5-10 minutes...")
        
        start_time = time.time()
        
        # Call the complete production endpoint
        response = requests.post(
            'http://localhost:5003/complete-production',
            files={k: (v[0], v[1], v[2]) for k, v in files.items()},
            data={'config': json.dumps(config)},
            timeout=900  # 15 minute timeout
        )
        
        if response.status_code == 200:
            # Save final production
            output_path = 'complete_production_test.mp4'
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            elapsed = time.time() - start_time
            print(f"\n✅ Complete production successful!")
            print(f"   Output: {output_path}")
            print(f"   Duration: {elapsed:.1f} seconds")
            
            # Check file size
            file_size = os.path.getsize(output_path)
            print(f"   File size: {file_size / 1024 / 1024:.1f} MB")
            
            print("\n🎬 Production Details:")
            print("   - 3 scenes with parallax animation")
            print("   - Narrator voiceover")
            print("   - Background ambient music")
            print("   - 2 transition sound effects")
            print("   - Professional audio mixing (voiceover 100%, music 20%)")
            
            return True
        else:
            print(f"\n❌ Complete production failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return False
    finally:
        # Cleanup test files
        print("\nCleaning up test files...")
        for img_path in test_images:
            if os.path.exists(img_path):
                os.unlink(img_path)
        for audio_path in test_audio:
            if os.path.exists(audio_path):
                os.unlink(audio_path)

def check_all_apis():
    """Check that all required APIs are running"""
    apis = [
        ('Depth API', 'http://localhost:5000/health'),
        ('Video API', 'http://localhost:5001/health'),
        ('Composition API', 'http://localhost:5002/health'),
        ('Audio API', 'http://localhost:5003/health')
    ]
    
    all_healthy = True
    for name, url in apis:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {name} is running")
            else:
                print(f"❌ {name} returned status {response.status_code}")
                all_healthy = False
        except Exception as e:
            print(f"❌ {name} is not accessible: {e}")
            all_healthy = False
    
    return all_healthy

def main():
    print("=== Complete Production Pipeline Test ===\n")
    
    # Check dependencies
    try:
        import scipy
        import librosa
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Install with: pip install scipy librosa")
        return
    
    # Check all APIs
    print("Checking API health...")
    if not check_all_apis():
        print("\n❌ Not all APIs are running. Start all servers with:")
        print("   ./start_servers.sh")
        return
    
    print("\n" + "="*60)
    
    # Run complete production test
    if test_complete_production():
        print("\n🎉 COMPLETE PRODUCTION TEST PASSED!")
        print("\n📽️  Check the final result:")
        print("   - complete_production_test.mp4")
        print("\nThis demonstrates the full Parallax Studio Pro pipeline:")
        print("   Image → Depth → Parallax → Composition → Audio → Final Video")
    else:
        print("\n❌ Complete production test failed")

if __name__ == '__main__':
    main()