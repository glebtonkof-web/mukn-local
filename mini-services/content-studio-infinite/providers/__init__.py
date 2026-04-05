"""
Content Studio Infinite - Universal Provider
Универсальный провайдер для всех сервисов
"""

import asyncio
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from loguru import logger

from .base import BaseVideoProvider, ProviderResult, ProviderState


class UniversalProvider(BaseVideoProvider):
    """
    Универсальный провайдер для всех видео-сервисов.
    
    Автоматически адаптируется под структуру сайта
    на основе конфигурации.
    """
    
    PROVIDER_SELECTORS = {
        'kling': {
            'login_url': 'https://klingai.com/login',
            'signup_url': 'https://klingai.com/signup',
            'create_url': 'https://klingai.com/create',
            'prompt_input': 'textarea[placeholder*="prompt"], textarea[placeholder*="Describe"], .prompt-input',
            'generate_button': 'button:has-text("Generate"), button:has-text("Create")',
            'video_player': 'video',
            'credits_display': '.credits, [class*="credit"]',
        },
        'wan': {
            'login_url': 'https://wan.video/login',
            'signup_url': 'https://wan.video/signup',
            'create_url': 'https://wan.video/create',
            'prompt_input': 'textarea, input[type="text"]',
            'generate_button': 'button:has-text("Generate")',
            'video_player': 'video',
        },
        'digen': {
            'login_url': 'https://digen.ai/login',
            'signup_url': 'https://digen.ai/signup',
            'create_url': 'https://digen.ai/create',
            'prompt_input': 'textarea',
            'generate_button': 'button[type="submit"]',
            'video_player': 'video',
        },
        'qwen': {
            'login_url': 'https://qwen.ai/login',
            'signup_url': 'https://qwen.ai/signup',
            'create_url': 'https://qwen.ai/create',
            'prompt_input': 'textarea',
            'generate_button': 'button:has-text("Generate")',
            'video_player': 'video',
        },
        'runway': {
            'login_url': 'https://runwayml.com/login',
            'signup_url': 'https://runwayml.com/signup',
            'create_url': 'https://runwayml.com/gen-3',
            'prompt_input': 'textarea',
            'generate_button': 'button:has-text("Generate")',
            'video_player': 'video',
        },
        'luma': {
            'login_url': 'https://lumalabs.ai/login',
            'signup_url': 'https://lumalabs.ai/dream-machine',
            'create_url': 'https://lumalabs.ai/dream-machine/create',
            'prompt_input': 'textarea',
            'generate_button': 'button:has-text("Generate")',
            'video_player': 'video',
        },
        'pika': {
            'login_url': 'https://pika.art/login',
            'signup_url': 'https://pika.art/signup',
            'create_url': 'https://pika.art/create',
            'prompt_input': 'textarea',
            'generate_button': 'button:has-text("Generate")',
            'video_player': 'video',
        },
        'haiper': {
            'login_url': 'https://haiper.ai/login',
            'signup_url': 'https://haiper.ai/signup',
            'create_url': 'https://haiper.ai/create',
            'prompt_input': 'textarea',
            'generate_button': 'button:has-text("Generate")',
            'video_player': 'video',
        },
        'vidu': {
            'login_url': 'https://vidu.studio/login',
            'signup_url': 'https://vidu.studio/signup',
            'create_url': 'https://vidu.studio/create',
            'prompt_input': 'textarea',
            'generate_button': 'button:has-text("Generate")',
            'video_player': 'video',
        },
    }
    
    def __init__(self, config: Dict[str, Any], output_dir: str = "./output/scenes"):
        super().__init__(config.get('name', 'universal'), config, output_dir)
        
        self.provider_name = config.get('name', 'universal')
        self.selectors = self.PROVIDER_SELECTORS.get(self.provider_name, {})
        self.base_url = config.get('url', '')
    
    async def login(self, headless: bool = True) -> bool:
        """Авторизация через cookies"""
        try:
            from playwright.async_api import async_playwright
            
            logger.info(f"Logging into {self.provider_name}...")
            
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
            create_url = self.selectors.get('create_url', self.base_url)
            await self._page.goto(create_url, wait_until='networkidle', timeout=30000)
            
            await asyncio.sleep(2)
            
            # Проверяем наличие элементов генерации
            prompt_input = await self._page.query_selector(self.selectors.get('prompt_input', 'textarea'))
            
            if prompt_input:
                self.state = ProviderState.AVAILABLE
                logger.info(f"{self.provider_name} session verified")
                return True
            else:
                self.state = ProviderState.COOKIES_EXPIRED
                logger.warning(f"{self.provider_name} session expired")
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
        **kwargs
    ) -> ProviderResult:
        """Генерация видео"""
        
        if not self.can_generate():
            return ProviderResult(
                success=False,
                error="Rate limited or no credits"
            )
        
        try:
            logger.info(f"Generating video with {self.provider_name}: {prompt[:50]}...")
            
            if not self._page:
                if not await self.login():
                    return ProviderResult(
                        success=False,
                        error="Failed to authenticate"
                    )
            
            # Переходим на страницу создания
            create_url = self.selectors.get('create_url', f"{self.base_url}/create")
            await self._page.goto(create_url, wait_until='networkidle')
            await asyncio.sleep(2)
            
            # Вводим промпт
            prompt_selector = self.selectors.get('prompt_input', 'textarea')
            prompt_input = await self._page.query_selector(prompt_selector)
            
            if prompt_input:
                await prompt_input.fill(prompt)
                await asyncio.sleep(0.5)
            else:
                logger.warning("Prompt input not found, trying alternative selectors")
                # Пробуем альтернативные селекторы
                for selector in ['textarea', 'input[type="text"]', '[contenteditable="true"]']:
                    prompt_input = await self._page.query_selector(selector)
                    if prompt_input:
                        await prompt_input.fill(prompt)
                        break
            
            # Выбираем длительность если есть опция
            duration_btn = await self._page.query_selector(f'button[data-duration="{int(duration)}"], button:has-text("{int(duration)}s")')
            if duration_btn:
                await duration_btn.click()
                await asyncio.sleep(0.5)
            
            # Выбираем соотношение сторон
            if ratio != "9:16":
                ratio_btn = await self._page.query_selector(f'button[data-ratio="{ratio}"], button:has-text("{ratio}")')
                if ratio_btn:
                    await ratio_btn.click()
                    await asyncio.sleep(0.5)
            
            # Нажимаем кнопку генерации
            generate_selector = self.selectors.get('generate_button', 'button[type="submit"]')
            generate_btn = await self._page.query_selector(generate_selector)
            
            if generate_btn:
                await generate_btn.click()
            else:
                # Пробуем нажать Enter
                await self._page.keyboard.press('Enter')
            
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
                        'provider': self.provider_name,
                        'prompt': prompt,
                        'ratio': ratio,
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
    
    async def _wait_for_video(self, timeout: int = 300) -> Optional[str]:
        """Ожидание генерации видео"""
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            try:
                # Ищем видео элемент
                video_selector = self.selectors.get('video_player', 'video')
                video = self._page.locator(video_selector).first
                
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
    
    async def check_status(self) -> ProviderState:
        """Проверка статуса провайдера"""
        try:
            if not self._page:
                return ProviderState.UNKNOWN
            
            create_url = self.selectors.get('create_url', self.base_url)
            await self._page.goto(create_url, wait_until='networkidle')
            
            prompt_input = await self._page.query_selector(self.selectors.get('prompt_input', 'textarea'))
            
            if prompt_input:
                self.state = ProviderState.AVAILABLE
            else:
                self.state = ProviderState.COOKIES_EXPIRED
            
            return self.state
            
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            self.state = ProviderState.ERROR
            return self.state
