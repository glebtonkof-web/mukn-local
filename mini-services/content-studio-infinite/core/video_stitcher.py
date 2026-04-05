"""
Content Studio Infinite - Video Stitcher
Склейка коротких видео в длинные с переходами

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import asyncio
import json
import os
import subprocess
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from loguru import logger

from .types import StitchResult


@dataclass
class Transition:
    """Переход между клипами"""
    type: str  # fade, xfade, crossfade, zoom, wipe
    duration: float = 0.5
    params: Dict = None
    
    def to_dict(self):
        return {
            'type': self.type,
            'duration': self.duration,
            'params': self.params or {}
        }


class VideoStitcher:
    """
    Склейка коротких видео в длинные.
    
    Features:
    - FFmpeg для обработки видео
    - Различные переходы (fade, xfade, crossfade, zoom, wipe)
    - Добавление аудио-трека
    - Настройка качества
    - Водяные знаки
    """
    
    TRANSITIONS = {
        'fade': 'fade',
        'crossfade': 'xfade',
        'xfade': 'xfade',
        'zoom': 'zoompan',
        'wipe': 'xfade',
    }
    
    XFADE_TRANSITIONS = [
        'fade', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
        'slideleft', 'slideright', 'slideup', 'slidedown',
        'circlecrop', 'rectcrop', 'distance', 'pixelate',
        'diagtl', 'diagtr', 'diagbl', 'diagbr',
        'hlslice', 'hrslice', 'vuslice', 'vdslice',
        'dissolve', 'radial', 'smoothleft', 'smoothright',
        'smoothup', 'smoothdown', 'circleopen', 'circleclose',
        'vertopen', 'vertclose', 'horzopen', 'horzclose',
    ]
    
    def __init__(
        self,
        output_dir: str = "./data/videos/final",
        default_transition: str = "fade",
        transition_duration: float = 0.5,
        output_codec: str = "libx264",
        output_quality: str = "high"
    ):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.default_transition = default_transition
        self.transition_duration = transition_duration
        self.output_codec = output_codec
        self.output_quality = output_quality
        
        # Проверка FFmpeg
        self._check_ffmpeg()
    
    def _check_ffmpeg(self) -> bool:
        """Проверка наличия FFmpeg"""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                logger.info("FFmpeg is available")
                return True
        except FileNotFoundError:
            logger.warning("FFmpeg not found. Video stitching will not work.")
            logger.warning("Install FFmpeg: sudo apt install ffmpeg")
        
        return False
    
    async def get_video_info(self, video_path: str) -> Dict:
        """Получение информации о видео"""
        cmd = [
            'ffprobe', '-v', 'quiet',
            '-print_format', 'json',
            '-show_format', '-show_streams',
            video_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                return json.loads(result.stdout)
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
        
        return {}
    
    async def get_video_duration(self, video_path: str) -> float:
        """Получение длительности видео"""
        info = await self.get_video_info(video_path)
        
        if 'format' in info:
            return float(info['format'].get('duration', 0))
        
        if 'streams' in info:
            for stream in info['streams']:
                if stream.get('codec_type') == 'video':
                    return float(stream.get('duration', 0))
        
        return 0.0
    
    async def stitch_videos(
        self,
        video_paths: List[str],
        output_name: str = None,
        transition: str = None,
        transition_duration: float = None,
        audio_path: str = None,
        watermark_path: str = None,
        aspect_ratio: str = "9:16"
    ) -> StitchResult:
        """
        Склейка нескольких видео в одно.
        
        Args:
            video_paths: Список путей к видео
            output_name: Имя выходного файла
            transition: Тип перехода
            transition_duration: Длительность перехода
            audio_path: Путь к аудио файлу
            watermark_path: Путь к водяному знаку
            aspect_ratio: Соотношение сторон
            
        Returns:
            StitchResult
        """
        if not video_paths:
            return StitchResult(
                success=False,
                error="No video paths provided"
            )
        
        # Проверка существования файлов
        for path in video_paths:
            if not os.path.exists(path):
                return StitchResult(
                    success=False,
                    error=f"Video file not found: {path}"
                )
        
        # Настройки
        transition = transition or self.default_transition
        transition_duration = transition_duration or self.transition_duration
        
        # Имя выходного файла
        if not output_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_name = f"stitched_{timestamp}"
        
        output_path = self.output_dir / f"{output_name}.mp4"
        
        try:
            if len(video_paths) == 1:
                # Просто копируем одно видео
                return await self._process_single_video(
                    video_paths[0],
                    str(output_path),
                    audio_path,
                    watermark_path
                )
            
            # Склейка нескольких видео
            if transition == "xfade" or transition in self.XFADE_TRANSITIONS:
                result = await self._stitch_with_xfade(
                    video_paths,
                    str(output_path),
                    transition,
                    transition_duration,
                    audio_path,
                    watermark_path
                )
            else:
                result = await self._stitch_with_concat(
                    video_paths,
                    str(output_path),
                    transition,
                    transition_duration,
                    audio_path,
                    watermark_path
                )
            
            return result
            
        except Exception as e:
            logger.exception(f"Error stitching videos: {e}")
            return StitchResult(
                success=False,
                error=str(e)
            )
    
    async def _process_single_video(
        self,
        video_path: str,
        output_path: str,
        audio_path: str = None,
        watermark_path: str = None
    ) -> StitchResult:
        """Обработка одного видео"""
        
        cmd = ['ffmpeg', '-y', '-i', video_path]
        
        # Фильтры
        filters = []
        
        # Водяной знак
        if watermark_path and os.path.exists(watermark_path):
            cmd.extend(['-i', watermark_path])
            filters.append('[0:v][1:v]overlay=10:10[outv]')
            cmd.extend(['-map', '0:a', '-map', '[outv]'])
        
        if filters:
            cmd.extend(['-filter_complex', ';'.join(filters)])
        
        # Аудио
        if audio_path and os.path.exists(audio_path):
            cmd.extend(['-i', audio_path, '-map', '0:v', '-map', '1:a'])
        
        # Кодирование
        cmd.extend([
            '-c:v', self.output_codec,
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            output_path
        ])
        
        logger.info(f"Processing single video: {video_path}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            duration = await self.get_video_duration(output_path)
            return StitchResult(
                success=True,
                output_path=output_path,
                total_duration=duration,
                clips_count=1
            )
        else:
            return StitchResult(
                success=False,
                error=f"FFmpeg error: {result.stderr}"
            )
    
    async def _stitch_with_concat(
        self,
        video_paths: List[str],
        output_path: str,
        transition: str,
        transition_duration: float,
        audio_path: str = None,
        watermark_path: str = None
    ) -> StitchResult:
        """Склейка через concat demuxer"""
        
        # Создаём файл со списком видео
        list_file = self.output_dir / "concat_list.txt"
        
        with open(list_file, 'w') as f:
            for path in video_paths:
                # Абсолютный путь
                abs_path = os.path.abspath(path)
                f.write(f"file '{abs_path}'\n")
        
        # FFmpeg команда
        cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(list_file)
        ]
        
        # Фильтры для переходов
        filter_parts = []
        
        # Fade переходы для каждого клипа
        if transition == "fade":
            # Получаем длительности видео
            durations = []
            for path in video_paths:
                dur = await self.get_video_duration(path)
                durations.append(dur)
            
            # Создаём фильтры
            for i, dur in enumerate(durations):
                fade_in = f"[{i}:v]fade=t=in:st=0:d={transition_duration}[v{i}]"
                fade_out = f"[v{i}]fade=t=out:st={dur - transition_duration}:d={transition_duration}[fv{i}]"
                filter_parts.extend([fade_in, fade_out])
            
            # Concat с переходами
            inputs = ''.join([f"[fv{i}]" for i in range(len(video_paths))])
            concat_filter = f"{inputs}concat=n={len(video_paths)}:v=1:a=0[outv]"
            filter_parts.append(concat_filter)
        
        # Аудио
        if audio_path and os.path.exists(audio_path):
            cmd.extend(['-i', audio_path])
        
        # Применяем фильтры
        if filter_parts:
            cmd.extend(['-filter_complex', ';'.join(filter_parts)])
        
        # Водяной знак
        if watermark_path and os.path.exists(watermark_path):
            cmd.extend(['-i', watermark_path])
        
        # Кодирование
        cmd.extend([
            '-c:v', self.output_codec,
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            output_path
        ])
        
        logger.info(f"Stitching {len(video_paths)} videos with concat")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Удаляем временный файл
        os.remove(list_file)
        
        if result.returncode == 0:
            duration = await self.get_video_duration(output_path)
            return StitchResult(
                success=True,
                output_path=output_path,
                total_duration=duration,
                clips_count=len(video_paths),
                transitions=[transition] * (len(video_paths) - 1)
            )
        else:
            logger.error(f"FFmpeg error: {result.stderr}")
            return StitchResult(
                success=False,
                error=f"FFmpeg error: {result.stderr[:500]}"
            )
    
    async def _stitch_with_xfade(
        self,
        video_paths: List[str],
        output_path: str,
        transition: str,
        transition_duration: float,
        audio_path: str = None,
        watermark_path: str = None
    ) -> StitchResult:
        """Склейка с xfade переходами (более качественная)"""
        
        # Получаем длительности
        durations = []
        for path in video_paths:
            dur = await self.get_video_duration(path)
            durations.append(dur)
        
        if len(video_paths) < 2:
            return await self._stitch_with_concat(
                video_paths, output_path, transition, transition_duration,
                audio_path, watermark_path
            )
        
        # Строим xfade цепочку
        inputs = []
        for path in video_paths:
            inputs.extend(['-i', path])
        
        # Определяем тип перехода для xfade
        xfade_type = transition if transition in self.XFADE_TRANSITIONS else "fade"
        
        # Фильтр для xfade
        filter_parts = []
        
        # Первый шаг: склеиваем первые два видео
        offset = durations[0] - transition_duration
        filter_parts.append(
            f"[0:v][1:v]xfade=transition={xfade_type}:duration={transition_duration}:offset={offset}[v01]"
        )
        
        # Последующие шаги
        prev_output = "v01"
        cumulative_duration = durations[0]
        
        for i in range(2, len(video_paths)):
            cumulative_duration += durations[i-1] - transition_duration
            offset = cumulative_duration - transition_duration
            
            current_output = f"v0{i}"
            filter_parts.append(
                f"[{prev_output}][{i}:v]xfade=transition={xfade_type}:duration={transition_duration}:offset={offset}[{current_output}]"
            )
            prev_output = current_output
        
        # Финальный вывод
        filter_parts.append(f"[{prev_output}]format=yuv420p[outv]")
        
        # Формируем команду
        cmd = ['ffmpeg', '-y'] + inputs
        
        if audio_path and os.path.exists(audio_path):
            cmd.extend(['-i', audio_path])
            # Берём аудио из отдельного файла
            cmd.extend(['-map', f'{len(video_paths)}:a'])
        
        cmd.extend([
            '-filter_complex', ';'.join(filter_parts),
            '-map', '[outv]',
            '-c:v', self.output_codec,
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            output_path
        ])
        
        logger.info(f"Stitching {len(video_paths)} videos with xfade ({xfade_type})")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            duration = await self.get_video_duration(output_path)
            return StitchResult(
                success=True,
                output_path=output_path,
                total_duration=duration,
                clips_count=len(video_paths),
                transitions=[xfade_type] * (len(video_paths) - 1)
            )
        else:
            logger.error(f"xfade error: {result.stderr[:500]}")
            # Fallback на простой concat
            return await self._stitch_with_concat(
                video_paths, output_path, "fade", transition_duration,
                audio_path, watermark_path
            )
    
    async def add_audio(
        self,
        video_path: str,
        audio_path: str,
        output_path: str = None,
        volume: float = 1.0,
        mix_original: bool = False
    ) -> str:
        """Добавление аудио к видео"""
        
        if not os.path.exists(video_path) or not os.path.exists(audio_path):
            raise FileNotFoundError("Video or audio file not found")
        
        output_path = output_path or video_path.replace('.mp4', '_with_audio.mp4')
        
        cmd = ['ffmpeg', '-y', '-i', video_path, '-i', audio_path]
        
        if mix_original:
            # Микшируем оригинальное аудио с новым
            cmd.extend([
                '-filter_complex',
                f'[0:a]volume=1[a0];[1:a]volume={volume}[a1];[a0][a1]amix=inputs=2:duration=first[aout]',
                '-map', '0:v', '-map', '[aout]'
            ])
        else:
            # Заменяем аудио
            cmd.extend([
                '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac'
            ])
        
        cmd.append(output_path)
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return output_path
        else:
            raise Exception(f"FFmpeg error: {result.stderr}")
    
    async def add_watermark(
        self,
        video_path: str,
        watermark_path: str,
        output_path: str = None,
        position: str = "bottom_right",
        opacity: float = 0.7
    ) -> str:
        """Добавление водяного знака"""
        
        if not os.path.exists(video_path) or not os.path.exists(watermark_path):
            raise FileNotFoundError("Video or watermark file not found")
        
        output_path = output_path or video_path.replace('.mp4', '_watermarked.mp4')
        
        # Позиции
        positions = {
            'top_left': '10:10',
            'top_right': 'W-w-10:10',
            'bottom_left': '10:H-h-10',
            'bottom_right': 'W-w-10:H-h-10',
            'center': '(W-w)/2:(H-h)/2',
        }
        
        pos = positions.get(position, positions['bottom_right'])
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-i', watermark_path,
            '-filter_complex',
            f'[1:v]format=rgba,colorchannelmixer=aa={opacity}[wm];[0:v][wm]overlay={pos}',
            '-c:a', 'copy',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return output_path
        else:
            raise Exception(f"FFmpeg error: {result.stderr}")
    
    async def trim_video(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        output_path: str = None
    ) -> str:
        """Обрезка видео"""
        
        output_path = output_path or video_path.replace('.mp4', '_trimmed.mp4')
        
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-ss', str(start_time),
            '-to', str(end_time),
            '-c:v', self.output_codec,
            '-c:a', 'aac',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return output_path
        else:
            raise Exception(f"FFmpeg error: {result.stderr}")
    
    async def remove_watermark(
        self,
        video_path: str,
        output_path: str = None,
        method: str = "crop",
        watermark_region: Dict = None
    ) -> str:
        """
        Удаление водяного знака с видео.
        
        Args:
            video_path: Путь к видео
            output_path: Путь для результата
            method: Метод удаления (crop, blur, delogo, inpaint)
            watermark_region: Область водяного знака {x, y, w, h}
        """
        
        output_path = output_path or video_path.replace('.mp4', '_clean.mp4')
        
        if method == "crop" and watermark_region:
            # Обрезка области с водяным знаком
            cmd = [
                'ffmpeg', '-y', '-i', video_path,
                '-filter_complex',
                f"crop={watermark_region['w']}:{watermark_region['h']}:{watermark_region['x']}:{watermark_region['y']}",
                '-c:a', 'copy',
                output_path
            ]
        elif method == "delogo" and watermark_region:
            # Delogo фильтр
            x, y, w, h = watermark_region['x'], watermark_region['y'], watermark_region['w'], watermark_region['h']
            cmd = [
                'ffmpeg', '-y', '-i', video_path,
                '-vf', f"delogo=x={x}:y={y}:w={w}:h={h}:show=0",
                '-c:a', 'copy',
                output_path
            ]
        elif method == "blur" and watermark_region:
            # Размытие области
            x, y, w, h = watermark_region['x'], watermark_region['y'], watermark_region['w'], watermark_region['h']
            cmd = [
                'ffmpeg', '-y', '-i', video_path,
                '-filter_complex',
                f"[0:v]boxblur=20:enable='between(t,0,1000000)':x={x}:y={y}:w={w}:h={h}",
                '-c:a', 'copy',
                output_path
            ]
        else:
            # По умолчанию - простое копирование
            return video_path
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return output_path
        else:
            raise Exception(f"FFmpeg error: {result.stderr}")
