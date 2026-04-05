"""
Free Video Generator - Audio Mixer
TTS generation and audio mixing for videos
"""

import asyncio
import os
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib

from loguru import logger


class AudioMixer:
    """
    Audio processing for video generation.
    
    Features:
    - TTS (Text-to-Speech) via gTTS
    - Background music from free libraries
    - Audio mixing and normalization
    - Volume control
    """
    
    def __init__(
        self,
        output_dir: str = "./output/audio",
        temp_dir: str = "./output/temp/audio",
        default_language: str = "ru",
        default_voice: str = "ru-RU"
    ):
        self.output_dir = Path(output_dir)
        self.temp_dir = Path(temp_dir)
        self.default_language = default_language
        self.default_voice = default_voice
        
        # Ensure directories
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def generate_tts(
        self,
        text: str,
        output_path: Optional[str] = None,
        language: Optional[str] = None,
        engine: str = "gtts"
    ) -> str:
        """
        Generate TTS audio from text.
        
        Args:
            text: Text to convert to speech
            output_path: Output file path (auto-generated if None)
            language: Language code (e.g., 'ru', 'en')
            engine: TTS engine ('gtts', 'edge_tts')
            
        Returns:
            Path to generated audio file
        """
        
        language = language or self.default_language
        
        if output_path is None:
            text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            output_path = str(self.output_dir / f"tts_{timestamp}_{text_hash}.mp3")
        
        logger.info(f"Generating TTS: {text[:50]}...")
        
        if engine == "gtts":
            await self._generate_gtts(text, output_path, language)
        elif engine == "edge_tts":
            await self._generate_edge_tts(text, output_path, language)
        else:
            raise ValueError(f"Unknown TTS engine: {engine}")
        
        return output_path
    
    async def _generate_gtts(self, text: str, output_path: str, language: str):
        """Generate TTS using gTTS (Google Text-to-Speech)"""
        
        from gtts import gTTS
        from io import BytesIO
        
        try:
            # Generate in thread pool
            loop = asyncio.get_event_loop()
            
            def generate():
                tts = gTTS(text=text, lang=language, slow=False)
                tts.save(output_path)
            
            await loop.run_in_executor(None, generate)
            
            logger.debug(f"gTTS saved: {output_path}")
            
        except Exception as e:
            logger.error(f"gTTS generation failed: {e}")
            raise
    
    async def _generate_edge_tts(self, text: str, output_path: str, language: str):
        """Generate TTS using Edge TTS (Microsoft Edge's TTS)"""
        
        try:
            # Map language to voice
            voice_map = {
                'ru': 'ru-RU-SvetlanaNeural',
                'en': 'en-US-JennyNeural',
                'es': 'es-ES-ElviraNeural',
                'de': 'de-DE-KatjaNeural',
                'fr': 'fr-FR-DeniseNeural',
            }
            
            voice = voice_map.get(language, 'en-US-JennyNeural')
            
            # Run edge-tts command
            cmd = [
                'edge-tts',
                '--voice', voice,
                '--text', text,
                '--write-media', output_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"edge-tts failed: {stderr.decode()}")
            
            logger.debug(f"Edge TTS saved: {output_path}")
            
        except FileNotFoundError:
            logger.warning("edge-tts not found, falling back to gTTS")
            await self._generate_gtts(text, output_path, language)
    
    async def download_background_music(
        self,
        keyword: str,
        output_path: Optional[str] = None,
        source: str = "pixabay"
    ) -> str:
        """
        Download royalty-free background music.
        
        Args:
            keyword: Search keyword (e.g., 'ambient', 'chill', 'upbeat')
            output_path: Output file path
            source: Music source ('pixabay', 'freesound')
            
        Returns:
            Path to downloaded audio file
        """
        
        if output_path is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            output_path = str(self.output_dir / f"music_{keyword}_{timestamp}.mp3")
        
        logger.info(f"Downloading background music: {keyword} from {source}")
        
        if source == "pixabay":
            return await self._download_pixabay(keyword, output_path)
        elif source == "freesound":
            return await self._download_freesound(keyword, output_path)
        else:
            raise ValueError(f"Unknown music source: {source}")
    
    async def _download_pixabay(self, keyword: str, output_path: str) -> str:
        """Download music from Pixabay (requires API key)"""
        
        import aiohttp
        
        api_key = os.getenv('PIXABAY_API_KEY')
        
        if not api_key:
            logger.warning("PIXABAY_API_KEY not set, using placeholder")
            # Return a placeholder or fail gracefully
            return await self._generate_silence(output_path, 60)
        
        try:
            async with aiohttp.ClientSession() as session:
                # Search for music
                url = f"https://pixabay.com/api/music/"
                params = {
                    'key': api_key,
                    'q': keyword,
                    'per_page': 5
                }
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        raise RuntimeError(f"Pixabay API error: {response.status}")
                    
                    data = await response.json()
                
                if not data.get('hits'):
                    logger.warning(f"No music found for: {keyword}")
                    return await self._generate_silence(output_path, 60)
                
                # Download first result
                music_url = data['hits'][0]['audio']
                
                async with session.get(music_url) as response:
                    if response.status != 200:
                        raise RuntimeError(f"Download failed: {response.status}")
                    
                    with open(output_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
                
                logger.info(f"Downloaded music: {output_path}")
                return output_path
                
        except Exception as e:
            logger.error(f"Music download failed: {e}")
            return await self._generate_silence(output_path, 60)
    
    async def _download_freesound(self, keyword: str, output_path: str) -> str:
        """Download sound from Freesound (requires API key)"""
        
        # Similar to Pixabay but for Freesound API
        api_key = os.getenv('FREESOUND_API_KEY')
        
        if not api_key:
            logger.warning("FREESOUND_API_KEY not set")
            return await self._generate_silence(output_path, 60)
        
        # Implementation would go here
        return await self._generate_silence(output_path, 60)
    
    async def _generate_silence(self, output_path: str, duration: float) -> str:
        """Generate silent audio file"""
        
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi',
            '-i', f'anullsrc=r=44100:cl=stereo',
            '-t', str(duration),
            '-c:a', 'libmp3lame',
            '-q:a', '9',
            output_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        await process.communicate()
        
        return output_path
    
    async def mix_audio(
        self,
        voice_path: str,
        music_path: str,
        output_path: str,
        voice_volume: float = 0.8,
        music_volume: float = 0.2,
        duck_music: bool = True
    ) -> str:
        """
        Mix voice and background music.
        
        Args:
            voice_path: Path to voice audio
            music_path: Path to music audio
            output_path: Output path
            voice_volume: Voice volume (0.0-1.0)
            music_volume: Music volume (0.0-1.0)
            duck_music: Reduce music volume during voice
            
        Returns:
            Path to mixed audio
        """
        
        # Get voice duration
        voice_duration = await self._get_audio_duration(voice_path)
        
        # Build filter
        if duck_music:
            # Sidechain compression to duck music under voice
            filter_complex = (
                f"[1:a]volume={music_volume},"
                f"aloop=loop=-1:size=2e+09,atrim=duration={voice_duration}[music];"
                f"[0:a]volume={voice_volume}[voice];"
                f"[music][voice]sidechaincompress=threshold=0.2:ratio=4:attack=10:release=200[aout]"
            )
        else:
            filter_complex = (
                f"[1:a]volume={music_volume},"
                f"aloop=loop=-1:size=2e+09,atrim=duration={voice_duration}[music];"
                f"[0:a]volume={voice_volume}[voice];"
                f"[voice][music]amix=inputs=2:duration=longest[aout]"
            )
        
        cmd = [
            'ffmpeg', '-y',
            '-i', voice_path,
            '-i', music_path,
            '-filter_complex', filter_complex,
            '-map', '[aout]',
            '-c:a', 'libmp3lame',
            '-q:a', '2',
            output_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"Audio mixing failed: {stderr.decode()}")
        
        logger.info(f"Mixed audio: {output_path}")
        return output_path
    
    async def generate_scene_voiceovers(
        self,
        scenes: List[Dict[str, Any]],
        output_dir: str,
        language: str = "ru"
    ) -> List[str]:
        """Generate voiceover for each scene"""
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        audio_paths = []
        
        for i, scene in enumerate(scenes):
            voiceover_text = scene.get('voiceover_text') or scene.get('voiceover')
            
            if voiceover_text:
                output_path = str(output_dir / f"scene_{i+1}.mp3")
                
                try:
                    await self.generate_tts(
                        voiceover_text,
                        output_path,
                        language
                    )
                    audio_paths.append(output_path)
                except Exception as e:
                    logger.error(f"Failed to generate voiceover for scene {i+1}: {e}")
                    audio_paths.append(None)
            else:
                audio_paths.append(None)
        
        return audio_paths
    
    async def concatenate_audio(
        self,
        audio_paths: List[str],
        output_path: str,
        crossfade_duration: float = 0.3
    ) -> str:
        """Concatenate multiple audio files with crossfade"""
        
        # Filter None paths
        valid_paths = [p for p in audio_paths if p and Path(p).exists()]
        
        if not valid_paths:
            raise ValueError("No valid audio files to concatenate")
        
        if len(valid_paths) == 1:
            import shutil
            shutil.copy2(valid_paths[0], output_path)
            return output_path
        
        # Create concat file
        concat_file = self.temp_dir / "audio_concat.txt"
        
        with open(concat_file, 'w') as f:
            for path in valid_paths:
                f.write(f"file '{path}'\n")
        
        # Simple concat (crossfade is complex with ffmpeg)
        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-c:a', 'libmp3lame',
            '-q:a', '2',
            output_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        await process.communicate()
        
        concat_file.unlink(missing_ok=True)
        
        return output_path
    
    async def normalize_audio(
        self,
        audio_path: str,
        output_path: str,
        target_db: float = -14.0
    ) -> str:
        """Normalize audio to target dB level"""
        
        cmd = [
            'ffmpeg', '-y',
            '-i', audio_path,
            '-af', f'loudnorm=I={target_db}:TP=-1:LRA=11',
            '-c:a', 'libmp3lame',
            '-q:a', '2',
            output_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        await process.communicate()
        
        return output_path
    
    async def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds"""
        
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            audio_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, _ = await process.communicate()
        
        return float(stdout.decode().strip())


class TTSEngine:
    """TTS engine wrapper for convenience"""
    
    ENGINES = {
        'gtts': {
            'name': 'Google TTS',
            'languages': ['ru', 'en', 'es', 'de', 'fr', 'ja', 'ko', 'zh'],
            'quality': 'medium',
            'speed': 'fast',
        },
        'edge_tts': {
            'name': 'Edge TTS',
            'languages': ['ru', 'en', 'es', 'de', 'fr', 'ja', 'ko', 'zh'],
            'quality': 'high',
            'speed': 'medium',
        },
    }
    
    @classmethod
    def get_available_engines(cls) -> List[Dict[str, Any]]:
        """Get list of available TTS engines"""
        return [
            {'id': k, **v}
            for k, v in cls.ENGINES.items()
        ]
    
    @classmethod
    def get_voices(cls, language: str) -> List[Dict[str, str]]:
        """Get available voices for a language"""
        
        voices = {
            'ru': [
                {'id': 'ru-RU-SvetlanaNeural', 'name': 'Светлана', 'gender': 'female'},
                {'id': 'ru-RU-DmitryNeural', 'name': 'Дмитрий', 'gender': 'male'},
            ],
            'en': [
                {'id': 'en-US-JennyNeural', 'name': 'Jenny', 'gender': 'female'},
                {'id': 'en-US-GuyNeural', 'name': 'Guy', 'gender': 'male'},
                {'id': 'en-GB-SoniaNeural', 'name': 'Sonia', 'gender': 'female'},
                {'id': 'en-GB-RyanNeural', 'name': 'Ryan', 'gender': 'male'},
            ],
        }
        
        return voices.get(language, voices['en'])
