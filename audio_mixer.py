#!/usr/bin/env python3
"""
Audio Mixing Engine
Handles voiceover, background music, and sound effects mixing
"""
import os
import subprocess
import tempfile
import json
from typing import List, Dict, Optional
from dataclasses import dataclass
from pathlib import Path
import librosa
import numpy as np

@dataclass
class AudioTrack:
    """Configuration for an audio track"""
    file_path: str
    track_type: str  # 'voiceover', 'music', 'sfx'
    start_time: float = 0.0
    duration: Optional[float] = None  # None = use full duration
    volume: float = 1.0  # Relative volume (0.0 to 1.0)
    fade_in: float = 0.0  # Fade in duration in seconds
    fade_out: float = 0.0  # Fade out duration in seconds

class AudioMixer:
    def __init__(self):
        self.temp_dir = None
    
    def analyze_audio_levels(self, audio_path: str) -> Dict[str, float]:
        """
        Analyze audio file to get peak and RMS levels
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dict with 'peak', 'rms', and 'duration' values
        """
        try:
            # Load audio file
            y, sr = librosa.load(audio_path, sr=None)
            
            # Calculate metrics
            peak = np.max(np.abs(y))
            rms = np.sqrt(np.mean(y**2))
            duration = len(y) / sr
            
            # Convert to dB
            peak_db = 20 * np.log10(peak) if peak > 0 else -np.inf
            rms_db = 20 * np.log10(rms) if rms > 0 else -np.inf
            
            return {
                'peak': peak,
                'peak_db': peak_db,
                'rms': rms,
                'rms_db': rms_db,
                'duration': duration
            }
            
        except Exception as e:
            raise Exception(f"Failed to analyze audio {audio_path}: {str(e)}")
    
    def calculate_relative_volumes(self, tracks: List[AudioTrack]) -> List[AudioTrack]:
        """
        Calculate relative volumes based on track types and audio analysis
        
        Rules:
        - Voiceover: 100% volume (reference)
        - Background music: 20% of voiceover peak volume
        - SFX: Maintain original relative volume but respect voiceover
        """
        # Find voiceover tracks to use as reference
        voiceover_tracks = [t for t in tracks if t.track_type == 'voiceover']
        
        if not voiceover_tracks:
            print("No voiceover tracks found, using first track as reference")
            # Use first track as reference
            reference_track = tracks[0] if tracks else None
        else:
            # Use first voiceover as reference
            reference_track = voiceover_tracks[0]
        
        if not reference_track:
            return tracks
        
        # Analyze reference track
        ref_analysis = self.analyze_audio_levels(reference_track.file_path)
        ref_peak = ref_analysis['peak']
        
        print(f"Reference track peak: {ref_analysis['peak_db']:.1f} dB")
        
        # Adjust volumes for each track
        adjusted_tracks = []
        
        for track in tracks:
            analysis = self.analyze_audio_levels(track.file_path)
            adjusted_track = AudioTrack(
                file_path=track.file_path,
                track_type=track.track_type,
                start_time=track.start_time,
                duration=track.duration,
                volume=track.volume,
                fade_in=track.fade_in,
                fade_out=track.fade_out
            )
            
            if track.track_type == 'voiceover':
                # Voiceover at 100% (reference)
                adjusted_track.volume = 1.0
                
            elif track.track_type == 'music':
                # Background music at 20% of voiceover peak
                target_ratio = 0.2
                if ref_peak > 0 and analysis['peak'] > 0:
                    adjusted_track.volume = (ref_peak * target_ratio) / analysis['peak']
                    adjusted_track.volume = min(adjusted_track.volume, 1.0)  # Cap at 100%
                else:
                    adjusted_track.volume = target_ratio
                    
            elif track.track_type == 'sfx':
                # SFX: Keep original volume but ensure it doesn't overpower voiceover
                max_sfx_ratio = 0.8  # Max 80% of voiceover
                if ref_peak > 0 and analysis['peak'] > 0:
                    max_volume = (ref_peak * max_sfx_ratio) / analysis['peak']
                    adjusted_track.volume = min(track.volume, max_volume)
                else:
                    adjusted_track.volume = min(track.volume, max_sfx_ratio)
            
            print(f"{track.track_type}: {analysis['peak_db']:.1f} dB -> volume {adjusted_track.volume:.3f}")
            adjusted_tracks.append(adjusted_track)
        
        return adjusted_tracks
    
    def mix_audio_tracks(self, tracks: List[AudioTrack], output_path: str, 
                        total_duration: Optional[float] = None) -> str:
        """
        Mix multiple audio tracks into a single output file
        
        Args:
            tracks: List of AudioTrack objects
            output_path: Path for mixed audio output
            total_duration: Total duration of output (auto-detect if None)
            
        Returns:
            Path to mixed audio file
        """
        if not tracks:
            raise ValueError("No audio tracks provided")
        
        # Calculate relative volumes
        adjusted_tracks = self.calculate_relative_volumes(tracks)
        
        # Auto-detect total duration if not provided
        if total_duration is None:
            max_end_time = 0
            for track in adjusted_tracks:
                analysis = self.analyze_audio_levels(track.file_path)
                track_duration = track.duration or analysis['duration']
                end_time = track.start_time + track_duration
                max_end_time = max(max_end_time, end_time)
            total_duration = max_end_time
        
        print(f"Mixing {len(adjusted_tracks)} tracks for {total_duration:.1f}s total duration")
        
        # Create ffmpeg filter complex
        filter_parts = []
        input_parts = []
        
        # Add all input files
        for i, track in enumerate(adjusted_tracks):
            input_parts.extend(['-i', track.file_path])
        
        # Create individual track filters
        mixed_inputs = []
        
        for i, track in enumerate(adjusted_tracks):
            track_filter_parts = []
            
            # Start with input
            current_stream = f'[{i}:a]'
            
            # Apply volume adjustment
            if track.volume != 1.0:
                track_filter_parts.append(f'{current_stream}volume={track.volume}')
                current_stream = f'[a{i}vol]'
                track_filter_parts[-1] += current_stream
            
            # Apply fade in
            if track.fade_in > 0:
                track_filter_parts.append(f'{current_stream}afade=t=in:st=0:d={track.fade_in}')
                current_stream = f'[a{i}fin]'
                track_filter_parts[-1] += current_stream
            
            # Apply fade out (need to know track duration)
            if track.fade_out > 0:
                analysis = self.analyze_audio_levels(track.file_path)
                track_duration = track.duration or analysis['duration']
                fade_start = max(0, track_duration - track.fade_out)
                track_filter_parts.append(f'{current_stream}afade=t=out:st={fade_start}:d={track.fade_out}')
                current_stream = f'[a{i}fout]'
                track_filter_parts[-1] += current_stream
            
            # Apply delay (start time)
            if track.start_time > 0:
                delay_samples = int(track.start_time * 44100)  # Assume 44.1kHz
                track_filter_parts.append(f'{current_stream}adelay={delay_samples}')
                current_stream = f'[a{i}delay]'
                track_filter_parts[-1] += current_stream
            
            # Pad to total duration
            track_filter_parts.append(f'{current_stream}apad=pad_dur={total_duration}')
            current_stream = f'[a{i}pad]'
            track_filter_parts[-1] += current_stream
            
            filter_parts.extend(track_filter_parts)
            mixed_inputs.append(current_stream)
        
        # Mix all tracks together
        if len(mixed_inputs) > 1:
            mix_inputs = ''.join(mixed_inputs)
            filter_parts.append(f'{mix_inputs}amix=inputs={len(mixed_inputs)}:duration=longest[out]')
            output_map = '[out]'
        else:
            output_map = mixed_inputs[0]
        
        # Build ffmpeg command
        filter_complex = ';'.join(filter_parts)
        
        ffmpeg_cmd = [
            'ffmpeg', '-y'  # Overwrite output
        ] + input_parts + [
            '-filter_complex', filter_complex,
            '-map', output_map,
            '-ac', '2',  # Stereo output
            '-ar', '44100',  # Sample rate
            '-c:a', 'aac',  # AAC codec
            '-b:a', '192k',  # Bitrate
            output_path
        ]
        
        try:
            result = subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
            print(f"✅ Audio mixed successfully: {output_path}")
            return output_path
            
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Audio mixing failed: {e.stderr}")
    
    def add_audio_to_video(self, video_path: str, audio_path: str, output_path: str) -> str:
        """
        Add mixed audio track to a video file
        
        Args:
            video_path: Path to video file
            audio_path: Path to mixed audio file
            output_path: Path for output video with audio
            
        Returns:
            Path to video with audio
        """
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-i', audio_path,
            '-c:v', 'copy',  # Copy video stream
            '-c:a', 'aac',   # Encode audio as AAC
            '-map', '0:v:0', # Video from first input
            '-map', '1:a:0', # Audio from second input
            '-shortest',     # Match shortest stream
            output_path
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
            print(f"✅ Audio added to video: {output_path}")
            return output_path
            
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed to add audio to video: {e.stderr}")

def create_audio_config_from_dict(config_dict: Dict) -> List[AudioTrack]:
    """Create AudioTrack objects from dictionary configuration"""
    tracks = []
    
    for track_data in config_dict.get('audio_tracks', []):
        track = AudioTrack(
            file_path=track_data['file_path'],
            track_type=track_data['track_type'],
            start_time=track_data.get('start_time', 0.0),
            duration=track_data.get('duration'),
            volume=track_data.get('volume', 1.0),
            fade_in=track_data.get('fade_in', 0.0),
            fade_out=track_data.get('fade_out', 0.0)
        )
        tracks.append(track)
    
    return tracks

def main():
    """Test the audio mixer"""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Audio mixing for parallax videos')
    parser.add_argument('--config', required=True, help='JSON audio configuration file')
    parser.add_argument('--output', required=True, help='Output audio file path')
    parser.add_argument('--duration', type=float, help='Total duration (auto-detect if not specified)')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"❌ Config file not found: {args.config}")
        return 1
    
    try:
        # Load configuration
        with open(args.config, 'r') as f:
            config_data = json.load(f)
        
        tracks = create_audio_config_from_dict(config_data)
        
        if not tracks:
            print("❌ No audio tracks found in configuration")
            return 1
        
        # Mix audio
        mixer = AudioMixer()
        result_path = mixer.mix_audio_tracks(tracks, args.output, args.duration)
        
        print(f"✅ Mixed audio saved: {result_path}")
        return 0
        
    except Exception as e:
        print(f"❌ Audio mixing failed: {e}")
        return 1

if __name__ == '__main__':
    exit(main())