"""
Free Video Generator - Runway Gen-3 Provider
Backup video generation provider using Runway ML
"""

import asyncio
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from loguru import logger

from .base import BaseVideoProvider, ProviderResult, ProviderState


class RunwayProvider(BaseVideoProvider):
    """
    Runway Gen-3 video generation provider.
    
    Features:
    - 125 free credits (one-time on signup)
    - Professional quality
    - Multiple styles
    - 5-10 second videos
    """
    
    def __init__(self, config: Dict[str, Any], output_dir: str = "./output/scenes"):
        super().__init__("runway", config, output_dir)
        
        self.base_url = config.get('url', 'https://runwayml.com')
        self.initial_credits = config.get('initial_credits', 125)
        self.credits_remaining = self.initial_credits
        
        self.selectors = {
            'prompt_input': 'textarea, [contenteditable="true"]',
            'generate_button': 'button:has-text("Generate"), button:has-text("Create")',
            'video_player': 'video',
            'download_button': 'a[download], button:has-text("Download")',
            'credits_display': '.credits, [class*="credit"], .remaining',
            'style_selector': '.style-option, [data-style]',
            'duration_selector': '[data-duration], .duration-btn',
        }
        
        self.available_styles = [
            'cinematic',
            '3d-animation',
            'anime',
            'photorealistic',
        ]
    
    async def login(self, headless: bool = True) -> bool:
        """Login to Runway"""
        try:
            from playwright.async_api import async_playwright
            
            logger.info("Logging into Runway...")
            
            if await self._load_cookies():
                return await self._verify_session()
            
            if not headless:
                return await self._manual_login()
            else:
                logger.warning("No saved cookies. Run with headless=False for first-time login.")
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
        """Verify saved session"""
        try:
            from playwright.async_api import async_playwright
            
            playwright = await async_playwright().start()
            self._browser = await playwright.chromium.launch(headless=True)
            self._context = await self._browser.new_context()
            
            if self.session_data.get('cookies'):
                await self._context.add_cookies(self.session_data['cookies'])
            
            self._page = await self._context.new_page()
            
            # Navigate to Gen-3
            await self._page.goto(f"{self.base_url}/gen-3", wait_until='networkidle', timeout=30000)
            await asyncio.sleep(3)
            
            content = await self._page.content()
            
            if 'sign in' in content.lower():
                self.state = ProviderState.COOKIES_EXPIRED
                return False
            
            await self._extract_credits()
            
            if self.credits_remaining > 0:
                self.state = ProviderState.AVAILABLE
            else:
                self.state = ProviderState.RATE_LIMITED
            
            logger.info(f"Runway session verified. Credits: {self.credits_remaining}")
            return True
            
        except Exception as e:
            logger.error(f"Session verification failed: {e}")
            self.state = ProviderState.ERROR
            return False
    
    async def _manual_login(self) -> bool:
        """Manual login"""
        try:
            from playwright.async_api import async_playwright
            
            logger.info("Opening browser for manual login...")
            logger.info("Login with email, then press Enter when done.")
            
            playwright = await async_playwright().start()
            self._browser = await playwright.chromium.launch(headless=False)
            self._context = await self._browser.new_context()
            self._page = await self._context.new_page()
            
            await self._page.goto(self.base_url, wait_until='networkidle')
            
            input("\nPress Enter after you have logged in...")
            
            cookies = await self._context.cookies()
            await self._save_cookies({'cookies': cookies})
            
            await self._extract_credits()
            
            self.state = ProviderState.AVAILABLE
            logger.info("Manual login successful!")
            return True
            
        except Exception as e:
            logger.error(f"Manual login failed: {e}")
            return False
    
    async def _extract_credits(self):
        """Extract remaining credits"""
        try:
            credits_el = self._page.locator(self.selectors['credits_display']).first
            if await credits_el.count() > 0:
                text = await credits_el.text_content()
                match = re.search(r'(\d+)', text)
                if match:
                    self.credits_remaining = int(match.group(1))
        except Exception:
            pass
    
    async def generate(
        self,
        prompt: str,
        duration: float = 5.0,
        ratio: str = "9:16",
        style: str = None,
        **kwargs
    ) -> ProviderResult:
        """Generate video with optional style"""
        if not self.can_generate():
            return ProviderResult(
                success=False,
                error="Rate limited or no credits"
            )
        
        try:
            logger.info(f"Generating video with Runway: {prompt[:50]}...")
            
            if not self._page:
                if not await self.login():
                    return ProviderResult(
                        success=False,
                        error="Failed to authenticate"
                    )
            
            # Navigate to generator
            await self._page.goto(f"{self.base_url}/gen-3/create", wait_until='networkidle')
            await asyncio.sleep(2)
            
            # Set style if provided
            if style and style in self.available_styles:
                style_btn = self._page.locator(f'[data-style="{style}"], .style-{style}')
                if await style_btn.count() > 0:
                    await style_btn.first.click()
                    await asyncio.sleep(0.5)
            
            # Set duration
            duration_btn = self._page.locator(f'[data-duration="{int(duration)}"]')
            if await duration_btn.count() > 0:
                await duration_btn.first.click()
                await asyncio.sleep(0.5)
            
            # Enter prompt
            prompt_input = self._page.locator(self.selectors['prompt_input']).first
            await prompt_input.fill(prompt)
            await asyncio.sleep(0.5)
            
            # Generate
            generate_btn = self._page.locator(self.selectors['generate_button']).first
            await generate_btn.click()
            
            logger.info("Generation started, waiting...")
            
            # Wait for completion
            video_url = await self._wait_for_video(timeout=600)
            
            if not video_url:
                return ProviderResult(
                    success=False,
                    error="Generation timed out"
                )
            
            # Download
            output_path = self._get_output_path(prompt)
            success = await self._download_video(video_url, str(output_path))
            
            if success:
                self.record_request()
                
                return ProviderResult(
                    success=True,
                    video_path=str(output_path),
                    duration=duration,
                    metadata={
                        'provider': 'runway',
                        'prompt': prompt,
                        'ratio': ratio,
                        'style': style,
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
    
    async def _wait_for_video(self, timeout: int = 600) -> Optional[str]:
        """Wait for video generation"""
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            try:
                video = self._page.locator(self.selectors['video_player']).first
                
                if await video.count() > 0:
                    src = await video.get_attribute('src')
                    if src and src.startswith('http'):
                        logger.info("Video ready!")
                        return src
                
                await asyncio.sleep(5)
                
            except Exception:
                await asyncio.sleep(5)
        
        return None
    
    async def _download_video(self, url: str, output_path: str) -> bool:
        """Download video"""
        import aiohttp
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as response:
                    if response.status != 200:
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
        """Check provider status"""
        try:
            if not self._page:
                return ProviderState.UNKNOWN
            
            await self._page.goto(f"{self.base_url}/gen-3", wait_until='networkidle')
            
            await self._extract_credits()
            
            if self.credits_remaining > 0:
                self.state = ProviderState.AVAILABLE
            else:
                self.state = ProviderState.RATE_LIMITED
            
            return self.state
            
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            self.state = ProviderState.ERROR
            return self.state
    
    async def remove_watermark(self, video_path: str, output_path: str) -> bool:
        """
        Remove watermark from video.
        Note: Runway allows watermark removal on free tier.
        """
        try:
            if not self._page:
                return False
            
            # Upload video
            await self._page.goto(f"{self.base_url}/gen-3/edit", wait_until='networkidle')
            
            upload_input = self._page.locator('input[type="file"]')
            await upload_input.set_input_files(video_path)
            
            await asyncio.sleep(2)
            
            # Find and click remove watermark option
            remove_btn = self._page.locator('button:has-text("Remove watermark"), [data-action="remove-watermark"]')
            if await remove_btn.count() > 0:
                await remove_btn.first.click()
                
                video_url = await self._wait_for_video(timeout=300)
                
                if video_url:
                    return await self._download_video(video_url, output_path)
            
            return False
            
        except Exception as e:
            logger.error(f"Watermark removal failed: {e}")
            return False
