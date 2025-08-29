#!/usr/bin/env python3
"""
Parallax Animation Renderer
Converts image + depth map to MP4 parallax animation using headless Three.js rendering
"""
import os
import io
import cv2
import numpy as np
from PIL import Image
import subprocess
import tempfile
import json
import time

class ParallaxRenderer:
    def __init__(self, width=1920, height=1080, fps=30):
        self.width = width
        self.height = height
        self.fps = fps
        
    def create_parallax_animation(self, image_path, depth_path, output_path, 
                                camera_movement=0.1, movement_range=0.17, duration=3.0):
        """
        Create parallax animation from image and depth map
        
        Args:
            image_path: Path to source image
            depth_path: Path to depth map image
            output_path: Path for output MP4
            camera_movement: Camera movement strength (default: 0.1)
            movement_range: Movement range (default: 0.17)
            duration: Animation duration in seconds (default: 3.0)
        """
        total_frames = int(duration * self.fps)
        
        # Load images
        image = cv2.imread(image_path)
        depth_map = cv2.imread(depth_path, cv2.IMREAD_GRAYSCALE)
        
        if image is None or depth_map is None:
            raise ValueError("Could not load image or depth map")
        
        # Resize images to match output dimensions while maintaining aspect ratio
        image_resized = self._resize_with_aspect_ratio(image, self.width, self.height)
        depth_resized = self._resize_with_aspect_ratio(depth_map, self.width, self.height, is_depth=True)
        
        # Create temporary directory for frames
        with tempfile.TemporaryDirectory() as temp_dir:
            frame_paths = []
            
            print(f"Generating {total_frames} frames...")
            for frame_idx in range(total_frames):
                # Calculate animation progress (0 to 1)
                progress = frame_idx / (total_frames - 1) if total_frames > 1 else 0
                
                # Create camera movement pattern (circular motion)
                angle = progress * 2 * np.pi  # Full circle
                camera_x = np.sin(angle) * movement_range * camera_movement
                camera_y = np.cos(angle) * movement_range * camera_movement * 0.5  # Less vertical movement
                
                # Generate parallax frame
                frame = self._generate_parallax_frame(
                    image_resized, depth_resized, 
                    camera_x, camera_y, camera_movement
                )
                
                # Save frame
                frame_path = os.path.join(temp_dir, f"frame_{frame_idx:06d}.png")
                cv2.imwrite(frame_path, frame)
                frame_paths.append(frame_path)
                
                if frame_idx % 10 == 0:
                    print(f"  Generated frame {frame_idx + 1}/{total_frames}")
            
            # Convert frames to video using ffmpeg
            print("Encoding video...")
            self._frames_to_video(temp_dir, output_path)
            print(f"✅ Animation saved: {output_path}")
    
    def _resize_with_aspect_ratio(self, img, target_width, target_height, is_depth=False):
        """Resize image maintaining aspect ratio and center crop/pad"""
        if len(img.shape) == 2:  # Grayscale
            h, w = img.shape
        else:  # Color
            h, w, _ = img.shape
        
        # Calculate scaling to fill the target dimensions
        scale = max(target_width / w, target_height / h)
        new_w, new_h = int(w * scale), int(h * scale)
        
        # Resize
        if len(img.shape) == 2:
            resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        else:
            resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        
        # Center crop to exact target size
        start_x = max(0, (new_w - target_width) // 2)
        start_y = max(0, (new_h - target_height) // 2)
        
        if len(img.shape) == 2:
            result = np.zeros((target_height, target_width), dtype=img.dtype)
            end_x = min(new_w, start_x + target_width)
            end_y = min(new_h, start_y + target_height)
            
            crop_w = end_x - start_x
            crop_h = end_y - start_y
            
            result_start_x = (target_width - crop_w) // 2
            result_start_y = (target_height - crop_h) // 2
            
            result[result_start_y:result_start_y + crop_h, 
                   result_start_x:result_start_x + crop_w] = resized[start_y:end_y, start_x:end_x]
        else:
            result = np.zeros((target_height, target_width, img.shape[2]), dtype=img.dtype)
            end_x = min(new_w, start_x + target_width)
            end_y = min(new_h, start_y + target_height)
            
            crop_w = end_x - start_x
            crop_h = end_y - start_y
            
            result_start_x = (target_width - crop_w) // 2
            result_start_y = (target_height - crop_h) // 2
            
            result[result_start_y:result_start_y + crop_h, 
                   result_start_x:result_start_x + crop_w] = resized[start_y:end_y, start_x:end_x]
        
        return result
    
    def _generate_parallax_frame(self, image, depth_map, offset_x, offset_y, movement_strength):
        """
        Generate a single parallax frame
        
        Args:
            image: Source image (BGR)
            depth_map: Depth map (grayscale)
            offset_x, offset_y: Camera offset
            movement_strength: Parallax strength multiplier
        """
        h, w = depth_map.shape
        result = np.zeros_like(image)
        
        # Normalize depth map to 0-1 range
        depth_normalized = depth_map.astype(np.float32) / 255.0
        
        # Create coordinate grids
        y_coords, x_coords = np.mgrid[0:h, 0:w]
        
        # Apply parallax displacement based on depth
        # Closer objects (higher depth values) move more
        displacement_scale = movement_strength * 100  # Scale factor for visible displacement
        
        # Calculate displacement for each pixel based on depth
        disp_x = (depth_normalized - 0.5) * offset_x * displacement_scale
        disp_y = (depth_normalized - 0.5) * offset_y * displacement_scale
        
        # Apply displacement to coordinates
        new_x = x_coords + disp_x
        new_y = y_coords + disp_y
        
        # Clamp coordinates to image bounds
        new_x = np.clip(new_x, 0, w - 1)
        new_y = np.clip(new_y, 0, h - 1)
        
        # Use bilinear interpolation for smooth results
        result = self._bilinear_interpolate(image, new_x, new_y)
        
        # Fill any black areas (holes) with background blur
        mask = np.all(result == 0, axis=2)
        if np.any(mask):
            # Create background by blurring the original image
            background = cv2.GaussianBlur(image, (51, 51), 20)
            result[mask] = background[mask]
        
        return result
    
    def _bilinear_interpolate(self, img, x, y):
        """Bilinear interpolation for smooth pixel sampling"""
        h, w, c = img.shape
        
        # Get integer and fractional parts
        x0 = np.floor(x).astype(np.int32)
        x1 = x0 + 1
        y0 = np.floor(y).astype(np.int32)
        y1 = y0 + 1
        
        # Clamp to image bounds
        x0 = np.clip(x0, 0, w - 1)
        x1 = np.clip(x1, 0, w - 1)
        y0 = np.clip(y0, 0, h - 1)
        y1 = np.clip(y1, 0, h - 1)
        
        # Get fractional parts
        wx = x - x0
        wy = y - y0
        
        # Expand dimensions for broadcasting
        wx = wx[..., np.newaxis]
        wy = wy[..., np.newaxis]
        
        # Bilinear interpolation
        result = (img[y0, x0] * (1 - wx) * (1 - wy) +
                 img[y0, x1] * wx * (1 - wy) +
                 img[y1, x0] * (1 - wx) * wy +
                 img[y1, x1] * wx * wy)
        
        return result.astype(img.dtype)
    
    def _frames_to_video(self, frames_dir, output_path):
        """Convert frame images to MP4 using ffmpeg"""
        ffmpeg_cmd = [
            'ffmpeg', '-y',  # Overwrite output file
            '-framerate', str(self.fps),
            '-i', os.path.join(frames_dir, 'frame_%06d.png'),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '18',  # High quality
            '-preset', 'medium',
            output_path
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"ffmpeg failed: {e.stderr}")
        except FileNotFoundError:
            raise RuntimeError("ffmpeg not found. Please install ffmpeg.")

def main():
    """Test the parallax renderer"""
    import sys
    
    if len(sys.argv) < 4:
        print("Usage: python parallax_renderer.py <image_path> <depth_path> <output_path>")
        return
    
    image_path, depth_path, output_path = sys.argv[1:4]
    
    # Optional parameters
    camera_movement = float(sys.argv[4]) if len(sys.argv) > 4 else 0.1
    movement_range = float(sys.argv[5]) if len(sys.argv) > 5 else 0.17
    duration = float(sys.argv[6]) if len(sys.argv) > 6 else 3.0
    
    renderer = ParallaxRenderer(width=1920, height=1080, fps=30)
    
    print(f"Creating parallax animation...")
    print(f"  Image: {image_path}")
    print(f"  Depth: {depth_path}")
    print(f"  Output: {output_path}")
    print(f"  Camera movement: {camera_movement}")
    print(f"  Movement range: {movement_range}")
    print(f"  Duration: {duration}s")
    
    start_time = time.time()
    renderer.create_parallax_animation(
        image_path, depth_path, output_path,
        camera_movement, movement_range, duration
    )
    elapsed = time.time() - start_time
    print(f"✅ Completed in {elapsed:.1f} seconds")

if __name__ == '__main__':
    main()