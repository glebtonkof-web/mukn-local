#!/usr/bin/env python3
"""
Free Video Generator - Main Entry Point
Автоматическая генерация коротких и длинных видео через бесплатные AI сервисы

Usage:
    python main.py --mode short --prompt "cat playing with ball" --duration 10
    python main.py --mode long --prompt "A day in Tokyo..." --duration 60
    python main.py --mode script --file script.json
    python main.py --server
"""

import asyncio
import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from loguru import logger

from core.utils import load_config, setup_logging, ensure_dir
from core.types import VideoRatio
from core.queue import TaskQueue
from core.cache import VideoCache
from core.video_stitcher import VideoStitcher
from core.scene_splitter import SceneSplitter, load_json_script
from core.audio_mixer import AudioMixer
from providers.manager import ProviderManager


class FreeVideoGenerator:
    """
    Main class for video generation.
    Provides both CLI and programmatic interfaces.
    """
    
    def __init__(self, config_path: str = None):
        # Load configuration
        self.config = load_config(config_path)
        
        # Setup logging
        log_level = os.getenv('LOG_LEVEL', self.config.get('logging', {}).get('level', 'INFO'))
        log_file = self.config.get('logging', {}).get('file', './logs/free-video-gen.log')
        setup_logging(log_level, log_file)
        
        # Directories
        self.output_dir = Path(self.config.get('video', {}).get('output_dir', './output/videos'))
        self.temp_dir = Path(self.config.get('video', {}).get('temp_dir', './output/temp'))
        self.scenes_dir = Path(self.config.get('video', {}).get('scenes_dir', './output/scenes'))
        
        # Ensure directories
        for d in [self.output_dir, self.temp_dir, self.scenes_dir]:
            ensure_dir(str(d))
        
        # Components (initialized on demand)
        self.provider_manager = None
        self.task_queue = None
        self.video_cache = None
        self.video_stitcher = None
        self.scene_splitter = None
        self.audio_mixer = None
        
        self._initialized = False
    
    async def initialize(self):
        """Initialize all components"""
        if self._initialized:
            return
        
        logger.info("Initializing Free Video Generator...")
        
        # Provider manager
        self.provider_manager = ProviderManager(
            self.config,
            str(self.scenes_dir)
        )
        await self.provider_manager.initialize_all()
        
        # Task queue
        queue_config = self.config.get('queue', {})
        self.task_queue = TaskQueue(
            max_workers=queue_config.get('max_workers', 3),
            max_retries=queue_config.get('max_retries', 3),
            retry_delays=queue_config.get('retry_delays', [300, 900, 3600]),
        )
        self.task_queue.register_handler('generate', self._handle_generation)
        await self.task_queue.start()
        
        # Cache
        self.video_cache = VideoCache(
            cache_dir="./cache/videos",
            max_size_gb=self.config.get('cache', {}).get('max_size', 5),
        )
        await self.video_cache.initialize()
        
        # Stitcher
        self.video_stitcher = VideoStitcher(
            output_dir=str(self.output_dir),
            temp_dir=str(self.temp_dir),
        )
        
        # Scene splitter
        self.scene_splitter = SceneSplitter(
            default_scene_duration=self.config.get('video', {}).get('default_duration', 8.0)
        )
        
        # Audio mixer
        self.audio_mixer = AudioMixer(
            output_dir=str(self.temp_dir / "audio")
        )
        
        self._initialized = True
        logger.info("Initialization complete")
    
    async def close(self):
        """Cleanup resources"""
        if self.task_queue:
            await self.task_queue.stop()
        if self.provider_manager:
            await self.provider_manager.close_all()
    
    async def generate_short(
        self,
        prompt: str,
        duration: float = 10.0,
        ratio: str = "9:16",
        provider: str = None,
        style: str = None,
        output_path: str = None
    ) -> dict:
        """
        Generate a short video (5-10 seconds).
        
        Args:
            prompt: Text description
            duration: Video duration
            ratio: Aspect ratio
            provider: Specific provider to use
            style: Visual style
            output_path: Custom output path
            
        Returns:
            dict with success status and video path
        """
        await self.initialize()
        
        logger.info(f"Generating short video: {prompt[:50]}...")
        
        # Check cache
        cached = await self.video_cache.get(prompt, provider or 'auto', duration)
        if cached:
            logger.info("Using cached video")
            return {
                'success': True,
                'video_path': cached['video_path'],
                'from_cache': True,
            }
        
        # Generate
        result = await self.provider_manager.generate(
            prompt=prompt,
            duration=duration,
            ratio=ratio,
            provider_name=provider,
            style=style
        )
        
        if result.success:
            # Cache result
            await self.video_cache.set(
                prompt,
                result.metadata.get('provider', 'unknown'),
                result.video_path,
                result.duration,
                result.metadata
            )
            
            # Move to output if custom path
            if output_path:
                import shutil
                shutil.move(result.video_path, output_path)
                result.video_path = output_path
            
            return {
                'success': True,
                'video_path': result.video_path,
                'duration': result.duration,
                'provider': result.metadata.get('provider'),
            }
        else:
            return {
                'success': False,
                'error': result.error,
            }
    
    async def generate_long(
        self,
        prompt: str,
        target_duration: float = 60.0,
        ratio: str = "9:16",
        style: str = None,
        voiceover: bool = False,
        music_style: str = None,
        output_path: str = None
    ) -> dict:
        """
        Generate a long video from scenario.
        
        Args:
            prompt: Long text scenario
            target_duration: Target duration in seconds
            ratio: Aspect ratio
            style: Visual style
            voiceover: Generate voiceover
            music_style: Background music style
            output_path: Custom output path
            
        Returns:
            dict with success status and video path
        """
        await self.initialize()
        
        logger.info(f"Generating long video ({target_duration}s): {prompt[:50]}...")
        
        # Split scenario into scenes
        script = await self.scene_splitter.split_scenario(
            prompt=prompt,
            target_duration=target_duration,
            style=style,
            voiceover=voiceover
        )
        
        logger.info(f"Split into {len(script.scenes)} scenes")
        
        # Generate each scene
        scene_paths = []
        for i, scene in enumerate(script.scenes):
            logger.info(f"Generating scene {i+1}/{len(script.scenes)}: {scene.prompt[:30]}...")
            
            result = await self.provider_manager.generate(
                prompt=scene.prompt,
                duration=scene.duration,
                ratio=ratio,
                style=style
            )
            
            if result.success:
                scene.generated_path = result.video_path
                scene_paths.append(result.video_path)
            else:
                logger.error(f"Scene {i+1} failed: {result.error}")
                # Try to continue with remaining scenes
        
        if not scene_paths:
            return {
                'success': False,
                'error': 'All scene generations failed',
            }
        
        # Concatenate scenes
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        temp_output = str(self.output_dir / f"long_{timestamp}.mp4")
        
        try:
            await self.video_stitcher.concatenate_scenes(
                scenes=script.scenes,
                output_path=temp_output,
                transitions=True
            )
        except Exception as e:
            logger.error(f"Concatenation failed: {e}")
            return {
                'success': False,
                'error': f'Concatenation failed: {e}',
            }
        
        # Add audio if requested
        final_output = temp_output
        
        if voiceover or music_style:
            # Generate voiceover
            if voiceover and script.voiceover_text:
                voice_path = await self.audio_mixer.generate_tts(
                    script.voiceover_text,
                    language='ru'
                )
                
                # Get or download music
                if music_style:
                    music_path = await self.audio_mixer.download_background_music(music_style)
                    
                    # Mix voice and music
                    audio_output = str(self.temp_dir / f"mixed_audio_{timestamp}.mp3")
                    await self.audio_mixer.mix_audio(
                        voice_path,
                        music_path,
                        audio_output
                    )
                    
                    # Add to video
                    video_with_audio = str(self.output_dir / f"final_{timestamp}.mp4")
                    await self.video_stitcher.add_audio(
                        temp_output,
                        audio_output,
                        video_with_audio
                    )
                    final_output = video_with_audio
        
        # Move to custom path if specified
        if output_path:
            import shutil
            shutil.move(final_output, output_path)
            final_output = output_path
        
        return {
            'success': True,
            'video_path': final_output,
            'duration': sum(s.duration for s in script.scenes if s.generated_path),
            'scenes_total': len(script.scenes),
            'scenes_generated': len(scene_paths),
        }
    
    async def generate_from_script(
        self,
        script_path: str,
        voiceover: bool = False,
        music_style: str = None,
        output_path: str = None
    ) -> dict:
        """Generate video from JSON script file"""
        
        await self.initialize()
        
        # Load script
        script = load_json_script(script_path)
        
        logger.info(f"Loaded script: {script.title} ({len(script.scenes)} scenes)")
        
        # Generate scenes
        for i, scene in enumerate(script.scenes):
            result = await self.provider_manager.generate(
                prompt=scene.prompt,
                duration=scene.duration,
                ratio=script.ratio.value
            )
            
            if result.success:
                scene.generated_path = result.video_path
        
        # Concatenate
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output = output_path or str(self.output_dir / f"{script.title}_{timestamp}.mp4")
        
        await self.video_stitcher.concatenate_scenes(
            scenes=script.scenes,
            output_path=output,
            transitions=True
        )
        
        return {
            'success': True,
            'video_path': output,
        }
    
    async def _handle_generation(self, task):
        """Handle generation task from queue"""
        result = await self.provider_manager.generate(
            prompt=task.prompt,
            duration=task.duration,
            provider_name=task.provider,
        )
        
        return {
            'success': result.success,
            'output_path': result.video_path,
            'error': result.error,
        }
    
    def get_status(self) -> dict:
        """Get current status"""
        status = {
            'initialized': self._initialized,
        }
        
        if self.provider_manager:
            status['providers'] = self.provider_manager.get_all_status()
            status['capacity'] = self.provider_manager.get_total_capacity()
        
        return status


async def run_server(port: int = 8766):
    """Run the HTTP API server"""
    import uvicorn
    from api.server import app
    
    logger.info(f"Starting server on port {port}")
    
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
    
    server = uvicorn.Server(config)
    await server.serve()


async def cli_main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Free Video Generator - генерация видео через бесплатные AI сервисы"
    )
    
    parser.add_argument(
        '--mode',
        choices=['short', 'long', 'script', 'server', 'status'],
        default='short',
        help='Generation mode'
    )
    
    parser.add_argument(
        '--prompt', '-p',
        help='Video prompt/description'
    )
    
    parser.add_argument(
        '--file', '-f',
        help='Script JSON file'
    )
    
    parser.add_argument(
        '--duration', '-d',
        type=float,
        default=10.0,
        help='Video duration in seconds'
    )
    
    parser.add_argument(
        '--ratio', '-r',
        choices=['9:16', '16:9', '1:1'],
        default='9:16',
        help='Aspect ratio'
    )
    
    parser.add_argument(
        '--provider',
        choices=['kling', 'luma', 'runway', 'auto'],
        default='auto',
        help='Video provider'
    )
    
    parser.add_argument(
        '--style', '-s',
        help='Visual style (cinematic, anime, realistic, etc.)'
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output file path'
    )
    
    parser.add_argument(
        '--voiceover', '-v',
        action='store_true',
        help='Generate voiceover'
    )
    
    parser.add_argument(
        '--music', '-m',
        help='Background music style'
    )
    
    parser.add_argument(
        '--port',
        type=int,
        default=8766,
        help='Server port'
    )
    
    parser.add_argument(
        '--config', '-c',
        help='Configuration file path'
    )
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = FreeVideoGenerator(args.config)
    
    try:
        if args.mode == 'server':
            await run_server(args.port)
            
        elif args.mode == 'status':
            await generator.initialize()
            status = generator.get_status()
            print(json.dumps(status, indent=2, default=str))
            
        elif args.mode == 'short':
            if not args.prompt:
                print("Error: --prompt is required for short mode")
                return
            
            result = await generator.generate_short(
                prompt=args.prompt,
                duration=args.duration,
                ratio=args.ratio,
                provider=args.provider if args.provider != 'auto' else None,
                style=args.style,
                output_path=args.output
            )
            
            if result['success']:
                print(f"SUCCESS: {result['video_path']}")
            else:
                print(f"FAILED: {result['error']}")
                
        elif args.mode == 'long':
            if not args.prompt:
                print("Error: --prompt is required for long mode")
                return
            
            result = await generator.generate_long(
                prompt=args.prompt,
                target_duration=args.duration,
                ratio=args.ratio,
                style=args.style,
                voiceover=args.voiceover,
                music_style=args.music,
                output_path=args.output
            )
            
            if result['success']:
                print(f"SUCCESS: {result['video_path']}")
                print(f"Duration: {result['duration']}s")
                print(f"Scenes: {result['scenes_generated']}/{result['scenes_total']}")
            else:
                print(f"FAILED: {result['error']}")
                
        elif args.mode == 'script':
            if not args.file:
                print("Error: --file is required for script mode")
                return
            
            result = await generator.generate_from_script(
                script_path=args.file,
                voiceover=args.voiceover,
                music_style=args.music,
                output_path=args.output
            )
            
            if result['success']:
                print(f"SUCCESS: {result['video_path']}")
            else:
                print(f"FAILED: {result.get('error', 'Unknown error')}")
                
    finally:
        await generator.close()


def main():
    """Main entry point"""
    asyncio.run(cli_main())


if __name__ == "__main__":
    main()
