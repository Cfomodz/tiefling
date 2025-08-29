<div align="center">
  
# Parallax Studio Pro (Free Open Source Parallax API)  
![GitHub License](https://img.shields.io/github/license/Cfomodz/parallax-studio-pro)
![GitHub Sponsors](https://img.shields.io/github/sponsors/Cfomodz)
![Discord](https://img.shields.io/discord/425182625032962049)


<img src="https://github.com/user-attachments/assets/3b97022a-5a0a-4fe9-80d2-fd0e61180b86" alt="parallax image generator" width="400"/>

### A backend API for converting still images into parallax videos with audio mixing.

</div>

## Overview

Parallax Studio Pro transforms static images into dynamic parallax animations that simulate 3D depth and camera movement, similar to Facebook's 3D Photo feature but for video production. The system provides a full pipeline from image processing to final video output with synchronized audio.

## Architecture

The system consists of four microservices working together:

```
Images → Depth Maps → Parallax Videos → Multi-Scene Composition → Audio Mixing → Final Production
```

### Core Components

1. **Depth API** (Port 5000) - AI-powered depth map generation using DepthAnything V2
2. **Video API** (Port 5001) - Parallax animation rendering with configurable camera movement  
3. **Composition API** (Port 5002) - Multi-image video composition with transitions
4. **Audio API** (Port 5003) - Professional audio mixing and final production

## Features

### 🎨 Visual Processing
- **AI Depth Estimation**: GPU-accelerated DepthAnything V2 model for high-quality depth maps
- **Parallax Animation**: Realistic 3D camera movement with configurable strength and range
- **Multi-Scene Composition**: Seamless transitions between multiple images (fade, slide, dissolve, wipe)
- **High Quality Output**: 4K support with customizable resolution, frame rate, and duration

### 🎵 Audio Production
- **Intelligent Mixing**: Automatic volume balancing (voiceover 100%, music 20%, SFX controlled)
- **Professional Features**: Fade in/out, time positioning, multi-track layering
- **Format Support**: MP3, WAV, AAC, M4A, OGG, FLAC
- **Audio Analysis**: Peak/RMS level detection for optimal mixing

### ⚡ Performance
- **GPU Acceleration**: CUDA support for depth generation
- **Efficient Pipeline**: Optimized processing with temporary file management
- **Scalable Architecture**: Microservice design for horizontal scaling
- **Quality Control**: Configurable quality settings for speed vs. quality tradeoffs

## Technical Stack

- **AI/ML**: DepthAnything V2 (Hugging Face Transformers), PyTorch, ONNX Runtime
- **Video Processing**: FFmpeg, OpenCV, Three.js-inspired rendering algorithms
- **Audio Processing**: Librosa, SciPy for analysis and FFmpeg for mixing
- **API Framework**: Flask with RESTful endpoints
- **Languages**: Python 3.8+

## Installation

### Prerequisites
- Python 3.8 or higher
- CUDA-capable GPU (optional, but recommended for performance)
- FFmpeg installed and accessible in PATH
- At least 4GB RAM (8GB+ recommended)

### Quick Setup
```bash
# Clone and setup
git clone <repository-url>
cd parallax-studio

# Install dependencies
./setup.sh

# Start all services
./start_servers.sh
```

### Manual Installation
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start individual services
python depth_api.py      # Port 5000
python video_api.py      # Port 5001  
python composition_api.py # Port 5002
python audio_api.py      # Port 5003
```

## API Endpoints

### Depth Generation API (Port 5000)
- `POST /generate-depth` - Generate depth map from image
- `POST /generate-depth-json` - Get depth map as base64 JSON
- `GET /health` - Service health check

### Video Generation API (Port 5001)
- `POST /generate-video` - Create parallax video from image
- `POST /generate-video-with-depth` - Create video with custom depth map
- `POST /preview-depth` - Preview depth map without creating video
- `GET /health` - Service health check

### Composition API (Port 5002)
- `POST /compose` - Multi-image composition with inline config
- `POST /compose-from-config` - Composition from JSON config file
- `GET /example-config` - Get example configuration template
- `GET /health` - Service health check

### Audio API (Port 5003)
- `POST /complete-production` - **End-to-end production pipeline**
- `POST /mix-audio` - Mix multiple audio tracks
- `POST /add-audio-to-video` - Add audio to existing video
- `POST /analyze-audio` - Analyze audio levels and duration
- `GET /example-audio-config` - Get example audio configuration
- `GET /health` - Service health check

## Configuration

### Video Settings
```json
{
  "video_settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30
  }
}
```

### Parallax Parameters
- `camera_movement`: Movement strength (0.05-0.2, default: 0.1)
- `movement_range`: Movement extent (0.1-0.3, default: 0.17)  
- `duration`: Animation length in seconds (default: 3.0)

### Audio Configuration
```json
{
  "audio_tracks": [
    {
      "track_type": "voiceover|music|sfx",
      "start_time": 0.0,
      "volume": 1.0,
      "fade_in": 0.5,
      "fade_out": 0.5
    }
  ]
}
```

## Usage Examples

### Simple Parallax Video
```bash
curl -X POST http://localhost:5001/generate-video \
  -F "image=@photo.jpg" \
  -F "camera_movement=0.12" \
  -F "duration=4.0"
```

### Multi-Scene Composition
```bash
curl -X POST http://localhost:5002/compose \
  -F "image_0=@scene1.jpg" \
  -F "image_1=@scene2.jpg" \
  -F "config={\"images\":[{\"duration\":3,\"transition_type\":\"fade\"}]}"
```

### Complete Production
```bash
curl -X POST http://localhost:5003/complete-production \
  -F "image_0=@scene1.jpg" \
  -F "audio_0=@narration.wav" \
  -F "config=@production_config.json"
```

## Testing

### Run Individual Tests
```bash
python test_depth_api.py        # Test depth generation
python test_video_api.py        # Test video creation  
python test_composition.py      # Test multi-scene composition
python test_audio.py           # Test audio mixing
```

### Complete Pipeline Test
```bash
python test_complete_production.py  # End-to-end test
```

## Performance Optimization

### GPU Utilization
- Ensure CUDA is properly installed for GPU acceleration
- Monitor GPU memory usage during depth generation
- Adjust `depth_size` parameter to balance quality vs. speed

### Quality Settings
- **Fast Preview**: 720p, 24fps, depth_size=512
- **Standard Quality**: 1080p, 30fps, depth_size=1024  
- **High Quality**: 4K, 60fps, depth_size=1024+

### Resource Management
- Each API service uses temporary directories that are cleaned up automatically
- Monitor disk space in `/tmp/parallax_studio_*` directories
- Scale horizontally by running multiple instances with load balancing

## Troubleshooting

### Common Issues

1. **GPU Not Detected**
   ```bash
   python -c "import torch; print(torch.cuda.is_available())"
   ```

2. **FFmpeg Not Found**
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # macOS
   brew install ffmpeg
   ```

3. **Memory Issues**
   - Reduce `depth_size` parameter
   - Lower video resolution
   - Process fewer images simultaneously

4. **Audio Sync Issues**
   - Ensure `total_duration` matches video length
   - Check audio file formats are supported
   - Verify audio sample rates are consistent

### Log Analysis
Each service provides detailed logging for debugging:
- Check console output for processing stages
- Monitor HTTP response codes and error messages
- Use health endpoints to verify service connectivity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for new functionality
4. Ensure all existing tests pass
5. Submit a pull request with detailed description

## License

MIT License - see LICENSE file for details.

## Credits

- **DepthAnything V2**: Microsoft Research depth estimation model
- **Three.js**: Inspiration for 3D rendering algorithms  
- **FFmpeg**: Video and audio processing
- **Tiefling**: Original browser-based 3D image viewer that inspired this project

## Support

For issues, questions, or feature requests, please open an issue on GitHub with:
- System specifications (OS, GPU, Python version)
- Error logs and console output
- Sample input files (if applicable)
- Expected vs. actual behavior
