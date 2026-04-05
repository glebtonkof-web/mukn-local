"""
Free Video Generator - Video Stitcher
FFmpeg-based video concatenation and transitions
"""

import asyncio
import subprocess
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from loguru import logger

from .types import TransitionType, VideoRatio, VideoScene


class VideoStitcher:
    """
    Video stitching and processing with FFmpeg.
    
    Features:
    - Scene concatenation
    - Transitions (fade, crossfade, zoom, slide)
    - Watermark removal (crop, blur)
    - Audio mixing
    - Format conversion
    """
    
    def __init__(
        self,
        output_dir: str = "./output/videos",
        temp_dir: str = "./output/temp",
        default_fps: int = 30,
        default_bitrate: str = "4M"
    ):
        self.output_dir = Path(output_dir)
        self.temp_dir = Path(temp_dir)
        self.default_fps = default_fps
        self.default_bitrate = default_bitrate
        
        # Ensure directories exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def concatenate_scenes(
        self,
        scenes: List[VideoScene],
        output_path: str,
        transitions: bool = True,
        transition_duration: float = 0.5
    ) -> str:
        """
        Concatenate multiple scenes into a single video.
        
        Args:
            scenes: List of VideoScene objects with generated_path
            output_path: Output file path
            transitions: Whether to add transitions between scenes
            transition_duration: Duration of transitions in seconds
            
        Returns:
            Path to the output video
        """
        if not scenes:
            raise ValueError("No scenes to concatenate")
        
        # Filter scenes with valid paths
        valid_scenes = [s for s in scenes if s.generated_path and Path(s.generated_path).exists()]
        
        if not valid_scenes:
            raise ValueError("No valid scene videos found")
        
        logger.info(f"Concatenating {len(valid_scenes)} scenes...")
        
        if transitions:
            return await self._concatenate_with_transitions(
                valid_scenes, output_path, transition_duration
            )
        else:
            return await self._concatenate_simple(valid_scenes, output_path)
    
    async def _concatenate_simple(
        self,
        scenes: List[VideoScene],
        output_path: str
    ) -> str:
        """Simple concatenation without transitions"""
        # Create concat file
        concat_file = self.temp_dir / "concat_list.txt"
        
        with open(concat_file, 'w') as f:
            for scene in scenes:
                # Escape single quotes in path
                path = str(Path(scene.generated_path).absolute()).replace("'", "'\\''")
                f.write(f"file '{path}'\n")
        
        # FFmpeg concat demuxer
        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-c', 'copy',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        
        # Cleanup
        concat_file.unlink(missing_ok=True)
        
        logger.info(f"Concatenated video saved: {output_path}")
        return output_path
    
    async def _concatenate_with_transitions(
        self,
        scenes: List[VideoScene],
        output_path: str,
        transition_duration: float
    ) -> str:
        """Concatenation with crossfade transitions using xfade filter"""
        
        if len(scenes) == 1:
            # Just copy the single video
            import shutil
            shutil.copy2(scenes[0].generated_path, output_path)
            return output_path
        
        # Get video info for all scenes
        scene_info = []
        for scene in scenes:
            info = await self._get_video_info(scene.generated_path)
            scene_info.append(info)
        
        # Build xfade filter chain
        # xfade requires all inputs to have same format, so we normalize first
        
        # Normalize all videos to same format
        normalized_paths = []
        for i, scene in enumerate(scenes):
            normalized_path = self.temp_dir / f"normalized_{i}.mp4"
            await self._normalize_video(
                scene.generated_path,
                str(normalized_path),
                scene_info[i]
            )
            normalized_paths.append(str(normalized_path))
        
        # Calculate durations and offsets
        durations = [info['duration'] for info in scene_info]
        
        # Build xfade filter
        if len(normalized_paths) == 2:
            # Simple case: 2 videos
            output = await self._xfade_two(
                normalized_paths[0],
                normalized_paths[1],
                durations[0] - transition_duration,
                transition_duration,
                output_path,
                scenes[0].transition_out
            )
        else:
            # Multiple videos: chain xfade filters
            output = await self._xfade_chain(
                normalized_paths,
                durations,
                transition_duration,
                output_path,
                [s.transition_out for s in scenes]
            )
        
        # Cleanup normalized files
        for path in normalized_paths:
            Path(path).unlink(missing_ok=True)
        
        return output
    
    async def _xfade_two(
        self,
        video1: str,
        video2: str,
        offset: float,
        duration: float,
        output_path: str,
        transition: TransitionType = TransitionType.CROSSFADE
    ) -> str:
        """Apply xfade transition between two videos"""
        
        transition_name = self._get_xfade_transition(transition)
        
        filter_complex = (
            f"[0:v][1:v]xfade=transition={transition_name}:"
            f"duration={duration}:offset={offset}[v]"
        )
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video1,
            '-i', video2,
            '-filter_complex', filter_complex,
            '-map', '[v]',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        return output_path
    
    async def _xfade_chain(
        self,
        videos: List[str],
        durations: List[float],
        transition_duration: float,
        output_path: str,
        transitions: List[TransitionType]
    ) -> str:
        """Chain multiple xfade filters for many videos"""
        
        # Build filter complex for chain
        inputs = []
        filter_parts = []
        
        # Calculate cumulative offsets
        offsets = []
        cumulative = 0
        for i, dur in enumerate(durations[:-1]):
            offsets.append(cumulative + dur - transition_duration)
            cumulative += dur - transition_duration
        
        # Build filter chain
        prev_output = "[0:v]"
        
        for i in range(len(videos) - 1):
            transition_name = self._get_xfade_transition(
                transitions[i] if i < len(transitions) else TransitionType.CROSSFADE
            )
            
            output_label = f"[v{i}]" if i < len(videos) - 2 else "[vout]"
            
            filter_part = (
                f"{prev_output}[{i+1}:v]xfade=transition={transition_name}:"
                f"duration={transition_duration}:offset={offsets[i]}{output_label}"
            )
            
            filter_parts.append(filter_part)
            prev_output = output_label
        
        filter_complex = ";".join(filter_parts)
        
        # Build input args
        input_args = []
        for v in videos:
            input_args.extend(['-i', v])
        
        cmd = [
            'ffmpeg', '-y',
            *input_args,
            '-filter_complex', filter_complex,
            '-map', '[vout]',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        return output_path
    
    def _get_xfade_transition(self, transition: TransitionType) -> str:
        """Map TransitionType to FFmpeg xfade transition name"""
        mapping = {
            TransitionType.FADE: "fade",
            TransitionType.CROSSFADE: "fade",
            TransitionType.ZOOM_IN: "zoomin",
            TransitionType.ZOOM_OUT: "zoomout",
            TransitionType.SLIDE_LEFT: "slideleft",
            TransitionType.SLIDE_RIGHT: "slideright",
            TransitionType.NONE: "fade",
            TransitionType.ROTATE: "circlecrop",
        }
        return mapping.get(transition, "fade")
    
    async def _normalize_video(
        self,
        input_path: str,
        output_path: str,
        info: Dict[str, Any]
    ):
        """Normalize video to consistent format"""
        
        # Get target resolution based on aspect ratio
        # Default to vertical 1080x1920
        width = info.get('width', 1080)
        height = info.get('height', 1920)
        
        # Ensure even dimensions
        if width % 2 != 0:
            width += 1
        if height % 2 != 0:
            height += 1
        
        # Scale and pad to exact resolution
        scale_filter = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2"
        
        cmd = [
            'ffmpeg', '-y',
            '-i', input_path,
            '-vf', scale_filter,
            '-r', str(self.default_fps),
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
    
    async def add_transition(
        self,
        video_path: str,
        transition_type: TransitionType,
        duration: float = 0.5,
        position: str = "end"  # "start", "end", "both"
    ) -> str:
        """Add transition effect to video"""
        
        output_path = str(self.temp_dir / f"transitioned_{Path(video_path).stem}.mp4")
        
        if transition_type == TransitionType.FADE:
            if position == "start":
                vf = f"fade=t=in:st=0:d={duration}"
            elif position == "end":
                info = await self._get_video_info(video_path)
                vf = f"fade=t=out:st={info['duration']-duration}:d={duration}"
            else:  # both
                info = await self._get_video_info(video_path)
                vf = f"fade=t=in:st=0:d={duration},fade=t=out:st={info['duration']-duration}:d={duration}"
        else:
            # For other transitions, use tfilter
            vf = f"tpad=start_mode=clone:start_duration={duration}"
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-vf', vf,
            '-c:v', 'libx264',
            '-preset', 'fast',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        return output_path
    
    async def remove_watermark(
        self,
        video_path: str,
        method: str = "crop",
        crop_percent: int = 5
    ) -> str:
        """
        Remove watermark from video.
        
        Methods:
        - crop: Crop edges of video
        - blur: Blur watermark area
        - logo: Overlay custom logo
        
        Note: Only use legal methods that comply with ToS.
        """
        
        output_path = str(self.temp_dir / f"nowm_{Path(video_path).stem}.mp4")
        
        info = await self._get_video_info(video_path)
        width = info['width']
        height = info['height']
        
        if method == "crop":
            # Crop percentage from each edge
            crop_w = int(width * (1 - crop_percent/100 * 2))
            crop_h = int(height * (1 - crop_percent/100 * 2))
            
            vf = f"crop={crop_w}:{crop_h}:{(width-crop_w)//2}:{(height-crop_h)//2},scale={width}:{height}"
            
        elif method == "blur":
            # Blur bottom right corner (typical watermark location)
            wm_width = int(width * 0.15)
            wm_height = int(height * 0.08)
            x = width - wm_width - 10
            y = height - wm_height - 10
            
            vf = f"boxblur=enable='between(t,0,100)':x={x}:y={y}:w={wm_width}:h={wm_height}:blur=20"
            
        else:
            # No processing
            return video_path
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-vf', vf,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'copy',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        return output_path
    
    async def add_audio(
        self,
        video_path: str,
        audio_path: str,
        output_path: str,
        video_volume: float = 1.0,
        audio_volume: float = 0.3,
        loop_audio: bool = True
    ) -> str:
        """
        Add background audio to video.
        
        Args:
            video_path: Path to video file
            audio_path: Path to audio file
            output_path: Output path
            video_volume: Volume for video audio (0.0-1.0)
            audio_volume: Volume for background audio (0.0-1.0)
            loop_audio: Loop audio if shorter than video
        """
        
        # Get video duration
        video_info = await self._get_video_info(video_path)
        video_duration = video_info['duration']
        
        # Build filter
        if loop_audio:
            audio_filter = f"[1:a]aloop=loop=-1:size=2e+09,volume={audio_volume}[bg]"
        else:
            audio_filter = f"[1:a]volume={audio_volume}[bg]"
        
        # Check if video has audio
        has_audio = video_info.get('audio_codec') is not None
        
        if has_audio:
            filter_complex = (
                f"{audio_filter};"
                f"[0:a]volume={video_volume}[orig];"
                f"[orig][bg]amix=inputs=2:duration=first[aout]"
            )
            map_audio = ['-map', '0:v', '-map', '[aout]']
        else:
            filter_complex = f"{audio_filter}"
            map_audio = ['-map', '0:v', '-map', '[bg]']
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-i', audio_path,
            '-filter_complex', filter_complex,
            *map_audio,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-t', str(video_duration),
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        logger.info(f"Added audio: {output_path}")
        return output_path
    
    async def add_subtitles(
        self,
        video_path: str,
        subtitle_path: str,
        output_path: str,
        style: str = "Fontname=Arial,Fontsize=24,PrimaryColour=&HFFFFFF,BackColour=&H80000000,BorderStyle=3"
    ) -> str:
        """Add subtitles to video"""
        
        # Escape path for Windows/Unix
        subtitle_path_escaped = str(Path(subtitle_path).absolute()).replace('\\', '/').replace(':', '\\:')
        
        vf = f"subtitles='{subtitle_path_escaped}':force_style='{style}'"
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-vf', vf,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'copy',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        return output_path
    
    async def resize_for_platform(
        self,
        video_path: str,
        platform: str,
        output_path: str
    ) -> str:
        """
        Resize video for specific platform.
        
        Platforms:
        - tiktok: 9:16 (1080x1920)
        - instagram_reels: 9:16 (1080x1920)
        - instagram_stories: 9:16 (1080x1920)
        - youtube_shorts: 9:16 (1080x1920)
        - youtube: 16:9 (1920x1080)
        - instagram_feed: 1:1 (1080x1080)
        """
        
        resolutions = {
            'tiktok': (1080, 1920),
            'instagram_reels': (1080, 1920),
            'instagram_stories': (1080, 1920),
            'youtube_shorts': (1080, 1920),
            'youtube': (1920, 1080),
            'instagram_feed': (1080, 1080),
        }
        
        target_width, target_height = resolutions.get(platform, (1080, 1920))
        
        # Scale and pad
        vf = (
            f"scale={target_width}:{target_height}:force_original_aspect_ratio=decrease,"
            f"pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:black"
        )
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-vf', vf,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'copy',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        return output_path
    
    async def split_video(
        self,
        video_path: str,
        output_dir: str,
        segment_duration: float = 15.0
    ) -> List[str]:
        """Split video into segments"""
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get video duration
        info = await self._get_video_info(video_path)
        total_duration = info['duration']
        
        segments = []
        start_time = 0
        segment_num = 0
        
        while start_time < total_duration:
            output_path = output_dir / f"segment_{segment_num:03d}.mp4"
            
            cmd = [
                'ffmpeg', '-y',
                '-i', video_path,
                '-ss', str(start_time),
                '-t', str(segment_duration),
                '-c', 'copy',
                str(output_path)
            ]
            
            await self._run_ffmpeg(cmd)
            segments.append(str(output_path))
            
            start_time += segment_duration
            segment_num += 1
        
        return segments
    
    async def create_thumbnail(
        self,
        video_path: str,
        output_path: str,
        timestamp: Optional[float] = None
    ) -> str:
        """Extract thumbnail from video"""
        
        if timestamp is None:
            # Get middle of video
            info = await self._get_video_info(video_path)
            timestamp = info['duration'] / 2
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-ss', str(timestamp),
            '-vframes', '1',
            '-q:v', '2',
            output_path
        ]
        
        await self._run_ffmpeg(cmd)
        return output_path
    
    async def _get_video_info(self, video_path: str) -> Dict[str, Any]:
        """Get video information using ffprobe"""
        
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {result.stderr}")
        
        data = json.loads(result.stdout)
        
        # Extract video stream
        video_stream = None
        audio_stream = None
        
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video' and video_stream is None:
                video_stream = stream
            elif stream.get('codec_type') == 'audio' and audio_stream is None:
                audio_stream = stream
        
        if not video_stream:
            raise RuntimeError("No video stream found")
        
        # Parse frame rate
        fps_str = video_stream.get('r_frame_rate', '30/1')
        if '/' in fps_str:
            num, den = fps_str.split('/')
            fps = float(num) / float(den) if float(den) != 0 else 30
        else:
            fps = float(fps_str)
        
        return {
            'duration': float(data['format'].get('duration', 0)),
            'width': int(video_stream.get('width', 0)),
            'height': int(video_stream.get('height', 0)),
            'fps': fps,
            'codec': video_stream.get('codec_name', ''),
            'audio_codec': audio_stream.get('codec_name') if audio_stream else None,
            'bitrate': int(data['format'].get('bit_rate', 0)),
        }
    
    async def _run_ffmpeg(self, cmd: List[str], timeout: int = 600):
        """Run FFmpeg command"""
        
        logger.debug(f"Running: {' '.join(cmd)}")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            if process.returncode != 0:
                error = stderr.decode('utf-8', errors='ignore')
                logger.error(f"FFmpeg error: {error}")
                raise RuntimeError(f"FFmpeg failed: {error[:500]}")
            
        except asyncio.TimeoutError:
            process.kill()
            raise RuntimeError("FFmpeg command timed out")
