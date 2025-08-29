#!/usr/bin/env python3
"""
Multi-Image Composition Engine
Processes multiple images into a single composed MP4 with transitions
"""
import os
import tempfile
import subprocess
import json
import time
from typing import List, Dict, Any
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ImageConfig:
    """Configuration for a single image in the composition"""
    image_path: str
    depth_path: str = None  # Optional custom depth map
    duration: float = 3.0
    camera_movement: float = 0.1
    movement_range: float = 0.17
    transition_type: str = "fade"  # fade, cut, slide_left, slide_right
    transition_duration: float = 0.5

class CompositionEngine:
    def __init__(self, width=1920, height=1080, fps=30):
        self.width = width
        self.height = height
        self.fps = fps
    
    def compose_video(self, images: List[ImageConfig], output_path: str, 
                     video_api_url: str = "http://localhost:5001") -> str:
        """
        Create a composed video from multiple images
        
        Args:
            images: List of ImageConfig objects
            output_path: Path for final composed video
            video_api_url: URL of the video generation API
            
        Returns:
            Path to composed video
        """
        if not images:
            raise ValueError("No images provided for composition")
        
        print(f"Creating composition with {len(images)} images...")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Step 1: Generate individual parallax videos
            video_clips = []
            
            for i, img_config in enumerate(images):
                print(f"  Processing image {i+1}/{len(images)}: {os.path.basename(img_config.image_path)}")
                
                clip_path = self._generate_parallax_clip(
                    img_config, temp_dir, i, video_api_url
                )
                video_clips.append((clip_path, img_config))
            
            # Step 2: Create composition with transitions
            print("  Composing final video...")
            self._compose_clips_with_transitions(video_clips, output_path, temp_dir)
            
        print(f"✅ Composition complete: {output_path}")
        return output_path
    
    def _generate_parallax_clip(self, config: ImageConfig, temp_dir: str, 
                              index: int, api_url: str) -> str:
        """Generate a single parallax clip using the video API"""
        import requests
        
        clip_filename = f"clip_{index:03d}.mp4"
        clip_path = os.path.join(temp_dir, clip_filename)
        
        try:
            # Prepare request
            with open(config.image_path, 'rb') as f:
                files = {'image': f}
                
                # Add depth map if provided
                if config.depth_path:
                    with open(config.depth_path, 'rb') as depth_f:
                        files['depth_map'] = depth_f
                        endpoint = f'{api_url}/generate-video-with-depth'
                else:
                    endpoint = f'{api_url}/generate-video'
                
                data = {
                    'camera_movement': str(config.camera_movement),
                    'movement_range': str(config.movement_range),
                    'duration': str(config.duration),
                    'width': str(self.width),
                    'height': str(self.height),
                    'fps': str(self.fps)
                }
                
                # Generate video
                response = requests.post(endpoint, files=files, data=data, timeout=120)
            
            if response.status_code == 200:
                with open(clip_path, 'wb') as f:
                    f.write(response.content)
                return clip_path
            else:
                raise Exception(f"Video API failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            raise Exception(f"Failed to generate clip {index}: {str(e)}")
    
    def _compose_clips_with_transitions(self, clips: List[tuple], output_path: str, temp_dir: str):
        """Compose multiple clips with transitions using ffmpeg"""
        
        if len(clips) == 1:
            # Single clip - just copy
            clip_path, _ = clips[0]
            subprocess.run(['cp', clip_path, output_path], check=True)
            return
        
        # Create ffmpeg filter complex for transitions
        filter_parts = []
        input_parts = []
        
        # Add all input files
        for i, (clip_path, config) in enumerate(clips):
            input_parts.extend(['-i', clip_path])
        
        # Build filter chain with transitions
        current_stream = '[0:v]'
        
        for i in range(1, len(clips)):
            prev_config = clips[i-1][1]
            curr_config = clips[i][1]
            
            # Create transition filter
            transition_filter = self._create_transition_filter(
                current_stream, f'[{i}:v]',
                prev_config.transition_type,
                prev_config.transition_duration
            )
            
            output_stream = f'[v{i}]'
            filter_parts.append(f'{transition_filter}{output_stream}')
            current_stream = output_stream
        
        # Final output
        final_filter = ';'.join(filter_parts)
        
        # Build ffmpeg command
        ffmpeg_cmd = [
            'ffmpeg', '-y'  # Overwrite output
        ] + input_parts + [
            '-filter_complex', final_filter,
            '-map', current_stream,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '18',
            '-preset', 'medium',
            output_path
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"ffmpeg composition failed: {e.stderr}")
    
    def _create_transition_filter(self, input1: str, input2: str, 
                                transition_type: str, duration: float) -> str:
        """Create ffmpeg filter for transitions between clips"""
        
        if transition_type == "cut":
            # No transition - just concatenate
            return f'{input1}{input2}concat=n=2:v=1:a=0'
        
        elif transition_type == "fade":
            # Crossfade transition
            return f'{input1}{input2}xfade=transition=fade:duration={duration}'
        
        elif transition_type == "slide_left":
            # Slide left transition
            return f'{input1}{input2}xfade=transition=slideleft:duration={duration}'
        
        elif transition_type == "slide_right":
            # Slide right transition
            return f'{input1}{input2}xfade=transition=slideright:duration={duration}'
        
        elif transition_type == "wipe_left":
            # Wipe left transition
            return f'{input1}{input2}xfade=transition=wipeleft:duration={duration}'
        
        elif transition_type == "dissolve":
            # Dissolve transition
            return f'{input1}{input2}xfade=transition=dissolve:duration={duration}'
        
        else:
            # Default to fade
            return f'{input1}{input2}xfade=transition=fade:duration={duration}'
    
    def create_composition_from_config(self, config_path: str, output_path: str) -> str:
        """
        Create composition from JSON config file
        
        Config format:
        {
            "video_settings": {
                "width": 1920,
                "height": 1080, 
                "fps": 30
            },
            "images": [
                {
                    "image_path": "path/to/image.jpg",
                    "depth_path": "path/to/depth.png",  // optional
                    "duration": 3.0,
                    "camera_movement": 0.1,
                    "movement_range": 0.17,
                    "transition_type": "fade",
                    "transition_duration": 0.5
                }
            ]
        }
        """
        with open(config_path, 'r') as f:
            config_data = json.load(f)
        
        # Update video settings
        video_settings = config_data.get('video_settings', {})
        self.width = video_settings.get('width', self.width)
        self.height = video_settings.get('height', self.height) 
        self.fps = video_settings.get('fps', self.fps)
        
        # Parse image configurations
        images = []
        for img_data in config_data['images']:
            img_config = ImageConfig(
                image_path=img_data['image_path'],
                depth_path=img_data.get('depth_path'),
                duration=img_data.get('duration', 3.0),
                camera_movement=img_data.get('camera_movement', 0.1),
                movement_range=img_data.get('movement_range', 0.17),
                transition_type=img_data.get('transition_type', 'fade'),
                transition_duration=img_data.get('transition_duration', 0.5)
            )
            images.append(img_config)
        
        return self.compose_video(images, output_path)

def main():
    """Test the composition engine"""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Multi-image parallax composition')
    parser.add_argument('--config', required=True, help='JSON configuration file')
    parser.add_argument('--output', required=True, help='Output MP4 path')
    parser.add_argument('--api-url', default='http://localhost:5001', 
                       help='Video API URL (default: http://localhost:5001)')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"❌ Config file not found: {args.config}")
        return 1
    
    try:
        engine = CompositionEngine()
        
        print(f"Creating composition from {args.config}...")
        start_time = time.time()
        
        result_path = engine.create_composition_from_config(args.config, args.output)
        
        elapsed = time.time() - start_time
        print(f"✅ Composition complete in {elapsed:.1f} seconds")
        print(f"   Output: {result_path}")
        
        # Show file size
        if os.path.exists(result_path):
            size_mb = os.path.getsize(result_path) / 1024 / 1024
            print(f"   Size: {size_mb:.1f} MB")
        
        return 0
        
    except Exception as e:
        print(f"❌ Composition failed: {e}")
        return 1

if __name__ == '__main__':
    exit(main())