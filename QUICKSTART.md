# Parallax Studio Pro - Quickstart Guide

Get up and running with Parallax Studio Pro's video production API in minutes.

## Setup

```bash
# Install and start all services
./setup.sh
./start_servers.sh
```

That's it! Four API services are now running on ports 5000-5003.

## Basic Usage

### 1. Single Image → Parallax Video

**Endpoint:** `POST http://localhost:5001/generate-video`

**Required:**
- `image` - Image file

**Optional Parameters:**
- `camera_movement` - Movement strength (default: 0.1)
- `movement_range` - Movement extent (default: 0.17)  
- `duration` - Animation length in seconds (default: 3.0)
- `width` - Video width (default: 1920)
- `height` - Video height (default: 1080)
- `fps` - Frame rate (default: 30)

**Example:**
```bash
curl -X POST http://localhost:5001/generate-video \
  -F "image=@photo.jpg" \
  -F "duration=5.0" \
  -F "camera_movement=0.15" \
  -o output.mp4
```

### 2. Multiple Images → Composed Video

**Endpoint:** `POST http://localhost:5002/compose`

**Required:**
- `image_0`, `image_1`, `image_2...` - Image files in order
- `config` - JSON configuration

**Configuration Format:**
```json
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
```

**Transition Types:** `fade`, `slide_left`, `slide_right`, `wipe_left`, `dissolve`, `cut`

**Example:**
```bash
curl -X POST http://localhost:5002/compose \
  -F "image_0=@scene1.jpg" \
  -F "image_1=@scene2.jpg" \
  -F "image_2=@scene3.jpg" \
  -F 'config={"images":[{"duration":3,"transition_type":"fade"},{"duration":4,"transition_type":"slide_left"},{"duration":3,"transition_type":"dissolve"}]}' \
  -o composed_video.mp4
```

### 3. Complete Production (Video + Audio)

**Endpoint:** `POST http://localhost:5003/complete-production`

**Required:**
- `image_0`, `image_1...` - Image files  
- `audio_0`, `audio_1...` - Audio files
- `config` - JSON with video and audio configuration

**Configuration Format:**
```json
{
  "video_config": {
    "video_settings": {"width": 1920, "height": 1080, "fps": 30},
    "images": [
      {
        "duration": 3.0,
        "camera_movement": 0.1,
        "transition_type": "fade"
      }
    ]
  },
  "audio_config": {
    "total_duration": 10.0,
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
        "volume": 1.0,
        "fade_in": 1.0,
        "fade_out": 2.0
      }
    ]
  }
}
```

**Audio Track Types:**
- `voiceover` - 100% volume (reference level)
- `music` - 20% of voiceover volume  
- `sfx` - Controlled volume, max 80% of voiceover

**Example:**
```bash
curl -X POST http://localhost:5003/complete-production \
  -F "image_0=@scene1.jpg" \
  -F "image_1=@scene2.jpg" \
  -F "audio_0=@narration.wav" \
  -F "audio_1=@background_music.mp3" \
  -F "config=@production_config.json" \
  -o final_production.mp4
```

## Quick Examples

### Get Example Configurations

```bash
# Video composition example
curl http://localhost:5002/example-config

# Audio mixing example  
curl http://localhost:5003/example-audio-config
```

### Test the System

```bash
# Test individual components
python test_depth_api.py
python test_video_api.py  
python test_composition.py
python test_audio.py

# Test complete pipeline
python test_complete_production.py
```

### Preview Depth Map

Before creating a video, preview the depth map:

```bash
curl -X POST http://localhost:5001/preview-depth \
  -F "image=@photo.jpg" \
  -F "depth_size=1024" \
  -o depth_preview.png
```

## Common Parameters

### Video Quality Settings

| Quality | Width | Height | FPS | Depth Size |
|---------|-------|--------|-----|------------|
| Preview | 720   | 480    | 24  | 512        |
| Standard| 1920  | 1080   | 30  | 1024       |
| High    | 3840  | 2160   | 60  | 1024       |

### Parallax Settings

| Setting | Min | Max | Default | Description |
|---------|-----|-----|---------|-------------|
| camera_movement | 0.05 | 0.2 | 0.1 | Movement strength |
| movement_range | 0.1 | 0.3 | 0.17 | Movement extent |
| duration | 1.0 | 10.0 | 3.0 | Animation length |

## Health Checks

Verify all services are running:

```bash
curl http://localhost:5000/health  # Depth API
curl http://localhost:5001/health  # Video API  
curl http://localhost:5002/health  # Composition API
curl http://localhost:5003/health  # Audio API
```

## File Formats

**Images:** PNG, JPG, JPEG, GIF, BMP, TIFF  
**Audio:** MP3, WAV, AAC, M4A, OGG, FLAC  
**Video Output:** MP4 (H.264)

## Performance Tips

- **GPU**: Ensure CUDA is available for faster depth generation
- **Memory**: Reduce `depth_size` if running out of memory
- **Speed**: Use lower resolution and FPS for faster processing
- **Quality**: Higher `depth_size` values produce better depth maps

## Error Codes

- `200` - Success
- `400` - Bad request (missing files/parameters)
- `500` - Server error (check logs)
- `timeout` - Processing taking too long (increase timeout)

## Need Help?

1. Check service health endpoints
2. Review console logs for detailed error messages  
3. Try the test scripts to verify functionality
4. See README.md for detailed documentation