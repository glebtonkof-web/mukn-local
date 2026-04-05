"""
Content Studio Infinite - Pollo AI Provider
Image-to-Video с автоматической генерацией звука

МУКН | Трафик - Enterprise AI-powered Content Generation Platform

Особенности Pollo AI:
- Image-to-Video (главная фишка)
- Text-to-Video
- Длина: 4-15 секунд
- Автоматическая генерация аудио (музыка + эффекты)
- Разрешение: до 1080p
- Соотношения: 16:9 и 9:16
- Доступ к 50+ моделям (Veo 3, Kling, Runway и др.)
"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from loguru import logger

from .base import BaseVideoProvider, ProviderResult, ProviderState


class PolloAIProvider(BaseVideoProvider):
    """
    Pollo AI — генератор видео из изображений и текста.
    
    Бесплатный тариф с кредитами (предположительно ежедневное пополнение).
    Уникальная функция: автоматический звук (музыка + эффекты).
    """
    
    SELECTORS = {
        'login_url': 'https://pollo.ai/login',
        'signup_url': 'https://pollo.ai/signup',
        'create_url': 'https://pollo.ai/create',
        'prompt_input': 'textarea[placeholder*="prompt"], textarea[placeholder*="Describe"], .prompt-input, textarea',
        'image_upload': 'input[type="file"][accept*="image"], .upload-area input',
        'generate_button': 'button:has-text("Generate"), button:has-text("Create"), button[type="submit"]',
        'video_player': 'video',
        'credits_display': '.credits, [class*="credit"], .remaining',
        'duration_selector': 'button[data-duration], .duration-option, button:has-text("4s"), button:has-text("5s"), button:has-text("10s"), button:has-text("15s")',
        'ratio_selector': 'button[data-ratio], .ratio-option, button:has-text("16:9"), button:has-text("9:16")',
        'audio_toggle': '.audio-toggle, button:has-text("Audio"), button:has-text("Sound")',
    }
    
    def __init__(self, config: Dict[str, Any], output_dir: str = "./output/scenes"):
        super().__init__('pollo', config, output_dir)
        
        self.base_url = 'https://pollo.ai'
        self.supports_image_to_video = True
        self.supports_audio_generation = True
        self.available_durations = [4, 5, 6, 7, 8, 9, 10, 11, 12, 15]
        
    async def login(self, headless: bool = True) -> bool:
        """Авторизация через cookies"""
        try:
            from playwright.async_api import async_playwright
            
            logger.info("Logging into Pollo AI...")
            
            # Проверяем сохранённые cookies
            if await self._load_cookies():
                return await self._verify_session()
            
            logger.warning("No saved cookies. Manual login required.")
            self.state = ProviderState.COOKIES_EXPIRED
            return False
            
        except ImportError:
            logger.error("Playwright not installed")
            return False
        except Exception as e:
            logger.error(f"Login failed: {e}")
            self.state = ProviderState.ERROR
            return False
    
    async def _verify_session(self) -> bool:
        """Проверка сессии"""
        try:
            from playwright.async_api import async_playwright
            
            playwright = await async_playwright().start()
            self._browser = await playwright.chromium.launch(headless=True)
            self._context = await self._browser.new_context()
            
            if self.session_data.get('cookies'):
                await self._context.add_cookies(self.session_data['cookies'])
            
            self._page = await self._context.new_page()
            
            # Переходим на страницу создания
            await self._page.goto(self.SELECTORS['create_url'], wait_until='networkidle', timeout=30000)
            await asyncio.sleep(2)
            
            # Проверяем наличие элементов генерации
            prompt_input = await self._page.query_selector(self.SELECTORS['prompt_input'])
            
            if prompt_input:
                self.state = ProviderState.AVAILABLE
                logger.info("Pollo AI session verified")
                return True
            else:
                self.state = ProviderState.COOKIES_EXPIRED
                logger.warning("Pollo AI session expired")
                return False
            
        except Exception as e:
            logger.error(f"Session verification failed: {e}")
            self.state = ProviderState.ERROR
            return False
    
    async def generate(
        self,
        prompt: str,
        duration: float = 10.0,
        ratio: str = "9:16",
        image_path: str = None,
        generate_audio: bool = True,
        **kwargs
    ) -> ProviderResult:
        """
        Генерация видео.
        
        Args:
            prompt: Текстовое описание
            duration: Длительность (4-15 секунд)
            ratio: Соотношение сторон (16:9 или 9:16)
            image_path: Путь к изображению для Image-to-Video
            generate_audio: Генерировать ли аудио автоматически
        """
        
        if not self.can_generate():
            return ProviderResult(
                success=False,
                error="Rate limited or no credits"
            )
        
        # Проверяем длительность
        if duration not in self.available_durations:
            duration = min(self.available_durations, key=lambda x: abs(x - duration))
            logger.info(f"Adjusted duration to {duration}s")
        
        try:
            logger.info(f"Generating video with Pollo AI: {prompt[:50]}...")
            
            if not self._page:
                if not await self.login():
                    return ProviderResult(
                        success=False,
                        error="Failed to authenticate"
                    )
            
            # Переходим на страницу создания
            await self._page.goto(self.SELECTORS['create_url'], wait_until='networkidle')
            await asyncio.sleep(2)
            
            # Если есть изображение - загружаем его
            if image_path and Path(image_path).exists():
                await self._upload_image(image_path)
            
            # Вводим промпт
            await self._enter_prompt(prompt)
            
            # Выбираем длительность
            await self._select_duration(int(duration))
            
            # Выбираем соотношение сторон
            if ratio != "9:16":
                await self._select_ratio(ratio)
            
            # Включаем аудио если нужно
            if generate_audio:
                await self._enable_audio()
            
            # Нажимаем кнопку генерации
            await self._click_generate()
            
            logger.info("Generation started, waiting for completion...")
            
            # Ждём результат
            video_url = await self._wait_for_video(timeout=300)
            
            if not video_url:
                return ProviderResult(
                    success=False,
                    error="Video generation timed out"
                )
            
            # Скачиваем видео
            output_path = self._get_output_path(prompt)
            success = await self._download_video(video_url, str(output_path))
            
            if success:
                self.record_request()
                
                return ProviderResult(
                    success=True,
                    video_path=str(output_path),
                    duration=duration,
                    metadata={
                        'provider': 'pollo',
                        'prompt': prompt,
                        'ratio': ratio,
                        'image_to_video': bool(image_path),
                        'audio_generated': generate_audio,
                    }
                )
            else:
                return ProviderResult(
                    success=False,
                    error="Failed to download video"
                )
            
        except Exception as e:
            logger.exception(f"Generation failed: {e}")
            return ProviderResult(
                success=False,
                error=str(e)
            )
    
    async def _upload_image(self, image_path: str) -> bool:
        """Загрузка изображения для Image-to-Video"""
        try:
            upload_input = await self._page.query_selector(self.SELECTORS['image_upload'])
            if upload_input:
                await upload_input.set_input_files(image_path)
                logger.info(f"Image uploaded: {image_path}")
                await asyncio.sleep(2)
                return True
            else:
                logger.warning("Image upload input not found")
                return False
        except Exception as e:
            logger.error(f"Image upload failed: {e}")
            return False
    
    async def _enter_prompt(self, prompt: str):
        """Ввод промпта"""
        prompt_input = await self._page.query_selector(self.SELECTORS['prompt_input'])
        
        if prompt_input:
            await prompt_input.fill(prompt)
            await asyncio.sleep(0.5)
        else:
            # Пробуем альтернативные селекторы
            for selector in ['textarea', 'input[type="text"]', '[contenteditable="true"]']:
                prompt_input = await self._page.query_selector(selector)
                if prompt_input:
                    await prompt_input.fill(prompt)
                    break
    
    async def _select_duration(self, duration: int):
        """Выбор длительности"""
        # Ищем кнопку с нужной длительностью
        duration_btn = await self._page.query_selector(
            f'button[data-duration="{duration}"], button:has-text("{duration}s"), button:has-text("{duration} sec")'
        )
        if duration_btn:
            await duration_btn.click()
            await asyncio.sleep(0.5)
            logger.info(f"Selected duration: {duration}s")
    
    async def _select_ratio(self, ratio: str):
        """Выбор соотношения сторон"""
        ratio_btn = await self._page.query_selector(
            f'button[data-ratio="{ratio}"], button:has-text("{ratio}")'
        )
        if ratio_btn:
            await ratio_btn.click()
            await asyncio.sleep(0.5)
            logger.info(f"Selected ratio: {ratio}")
    
    async def _enable_audio(self):
        """Включение генерации аудио"""
        audio_toggle = await self._page.query_selector(self.SELECTORS['audio_toggle'])
        if audio_toggle:
            await audio_toggle.click()
            await asyncio.sleep(0.5)
            logger.info("Audio generation enabled")
    
    async def _click_generate(self):
        """Нажатие кнопки генерации"""
        generate_btn = await self._page.query_selector(self.SELECTORS['generate_button'])
        
        if generate_btn:
            await generate_btn.click()
        else:
            # Пробуем нажать Enter
            await self._page.keyboard.press('Enter')
    
    async def _wait_for_video(self, timeout: int = 300) -> Optional[str]:
        """Ожидание генерации видео"""
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            try:
                # Ищем видео элемент
                video = self._page.locator(self.SELECTORS['video_player']).first
                
                if await video.count() > 0:
                    src = await video.get_attribute('src')
                    if src and src.startswith('http'):
                        logger.info("Video ready!")
                        return src
                    
                    # Проверяем source элементы
                    sources = await video.locator('source').all()
                    for source in sources:
                        src = await source.get_attribute('src')
                        if src and src.startswith('http'):
                            logger.info("Video ready!")
                            return src
                
                # Проверяем прогресс
                progress = await self._page.query_selector('.progress, [class*="progress"], .generating')
                if progress:
                    progress_text = await progress.text_content()
                    logger.debug(f"Generation progress: {progress_text}")
                
                # Проверяем ошибки
                error = await self._page.query_selector('.error, .generation-error, [class*="error"]')
                if error:
                    error_text = await error.text_content()
                    logger.error(f"Generation error: {error_text}")
                    return None
                
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.debug(f"Waiting for video... ({e})")
                await asyncio.sleep(5)
        
        return None
    
    async def _download_video(self, url: str, output_path: str) -> bool:
        """Скачивание видео"""
        import aiohttp
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as response:
                    if response.status != 200:
                        logger.error(f"Download failed: {response.status}")
                        return False
                    
                    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                    
                    with open(output_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
                    
                    logger.info(f"Video saved: {output_path}")
                    return True
                    
        except Exception as e:
            logger.error(f"Download error: {e}")
            return False
    
    async def image_to_video(
        self,
        image_path: str,
        prompt: str = "",
        duration: int = 5,
        resolution: str = "720p",
        aspect_ratio: str = "16:9",
        generate_audio: bool = True
    ) -> ProviderResult:
        """
        Превращает изображение в видео с анимацией.
        Может автоматически добавить звук (музыка + эффекты).
        """
        return await self.generate(
            prompt=prompt,
            duration=float(duration),
            ratio=aspect_ratio,
            image_path=image_path,
            generate_audio=generate_audio
        )
    
    async def text_to_video(
        self,
        prompt: str,
        duration: int = 5,
        resolution: str = "720p",
        aspect_ratio: str = "16:9"
    ) -> ProviderResult:
        """Генерация видео из текста (без стартового изображения)."""
        return await self.generate(
            prompt=prompt,
            duration=float(duration),
            ratio=aspect_ratio,
            generate_audio=True
        )
    
    async def check_status(self) -> ProviderState:
        """Проверка статуса провайдера"""
        try:
            if not self._page:
                return ProviderState.UNKNOWN
            
            await self._page.goto(self.SELECTORS['create_url'], wait_until='networkidle')
            
            prompt_input = await self._page.query_selector(self.SELECTORS['prompt_input'])
            
            if prompt_input:
                self.state = ProviderState.AVAILABLE
            else:
                self.state = ProviderState.COOKIES_EXPIRED
            
            return self.state
            
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            self.state = ProviderState.ERROR
            return self.state
    
    async def get_remaining_credits(self) -> int:
        """Парсит страницу аккаунта, возвращает остаток бесплатных кредитов."""
        try:
            if not self._page:
                return 0
            
            credits_elem = await self._page.query_selector(self.SELECTORS['credits_display'])
            if credits_elem:
                text = await credits_elem.text_content()
                # Парсим число из текста
                import re
                match = re.search(r'\d+', text)
                if match:
                    return int(match.group())
            
            return 0
        except Exception as e:
            logger.error(f"Failed to get credits: {e}")
            return 0
