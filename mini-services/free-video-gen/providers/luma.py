"""
Free Video Generator - Luma Dream Machine Provider
Backup video generation provider using Luma AI
"""

import asyncio
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from loguru import logger

from .base import BaseVideoProvider, ProviderResult, ProviderState


class LumaProvider(BaseVideoProvider):
    """
    Luma Dream Machine video generation provider.
    
    Features:
    - 30 free generations per month
    - High quality output
    - Good physics and movement
    - Video extension support
    - Discord/Google login
    """
    
    def __init__(self, config: Dict[str, Any], output_dir: str = "./output/scenes"):
        super().__init__("luma", config, output_dir)
        
        self.base_url = config.get('url', 'https://lumalabs.ai/dream-machine')
        self.monthly_limit = config.get('monthly_limit', 30)
        self.credits_remaining = self.monthly_limit
        
        self.selectors = {
            'prompt_input': 'textarea, [contenteditable="true"], .prompt-input',
            'generate_button': 'button:has-text("Create"), button:has-text("Generate")',
            'video_player': 'video',
            'download_button': 'a[download], button:has-text("Download")',
            'credits_display': '.remaining, [class*="credit"], .generations-left',
            'extend_button': 'button:has-text("Extend")',
        }
    
    async def login(self, headless: bool = True) -> bool:
        """Login to Luma using saved cookies or manual login"""
        try:
            from playwright.async_api import async_playwright
            
            logger.info("Logging into Luma Dream Machine...")
            
            # Check for saved cookies
            if await self._load_cookies():
                logger.info("Using saved cookies for authentication")
                return await self._verify_session()
            
            if not headless:
                return await self._manual_login()
            else:
                logger.warning("No saved cookies found. Run with headless=False for first-time login.")
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
        """Verify saved session is valid"""
        try:
            from playwright.async_api import async_playwright
            
            playwright = await async_playwright().start()
            self._browser = await playwright.chromium.launch(headless=True)
            self._context = await self._browser.new_context()
            
            if self.session_data.get('cookies'):
                await self._context.add_cookies(self.session_data['cookies'])
            
            self._page = await self._context.new_page()
            
            await self._page.goto(self.base_url, wait_until='networkidle', timeout=30000)
            await asyncio.sleep(3)
            
            # Check login state
            content = await self._page.content()
            
            if 'sign in' in content.lower() or 'login' in content.lower():
                if 'credits' not in content.lower() and 'remaining' not in content.lower():
                    self.state = ProviderState.COOKIES_EXPIRED
                    return False
            
            await self._extract_credits()
            
            self.state = ProviderState.AVAILABLE
            logger.info(f"Luma session verified. Generations remaining: {self.credits_remaining}")
            return True
            
        except Exception as e:
            logger.error(f"Session verification failed: {e}")
            self.state = ProviderState.ERROR
            return False
    
    async def _manual_login(self) -> bool:
        """Manual login with visible browser"""
        try:
            from playwright.async_api import async_playwright
            
            logger.info("Opening browser for manual login...")
            logger.info("Please login with Discord or Google, then press Enter when done.")
            
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
        """Extract remaining generations"""
        try:
            credits_el = self._page.locator(self.selectors['credits_display']).first
            if await credits_el.count() > 0:
                text = await credits_el.text_content()
                match = re.search(r'(\d+)', text)
                if match:
                    self.credits_remaining = int(match.group(1))
        except Exception as e:
            logger.debug(f"Could not extract credits: {e}")
    
    async def generate(
        self,
        prompt: str,
        duration: float = 5.0,
        ratio: str = "9:16",
        **kwargs
    ) -> ProviderResult:
        """
        Generate video from text prompt.
        
        Note: Luma only supports 5-second videos on free tier.
        """
        if not self.can_generate():
            return ProviderResult(
                success=False,
                error="Rate limited or no credits"
            )
        
        try:
            logger.info(f"Generating video with Luma: {prompt[:50]}...")
            
            if not self._page:
                if not await self.login():
                    return ProviderResult(
                        success=False,
                        error="Failed to authenticate"
                    )
            
            # Navigate to create
            await self._page.goto(self.base_url, wait_until='networkidle')
            await asyncio.sleep(2)
            
            # Enter prompt
            prompt_input = self._page.locator(self.selectors['prompt_input']).first
            await prompt_input.fill(prompt)
            await asyncio.sleep(0.5)
            
            # Set aspect ratio if needed
            # Luma typically has aspect ratio selector
            
            # Generate
            generate_btn = self._page.locator(self.selectors['generate_button']).first
            await generate_btn.click()
            
            logger.info("Generation started, waiting...")
            
            # Wait for completion (Luma can take 5-15 minutes)
            video_url = await self._wait_for_video(timeout=900)
            
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
                    duration=5.0,
                    metadata={
                        'provider': 'luma',
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
    
    async def _wait_for_video(self, timeout: int = 900) -> Optional[str]:
        """Wait for video generation"""
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            try:
                # Check for video
                video = self._page.locator(self.selectors['video_player']).first
                
                if await video.count() > 0:
                    src = await video.get_attribute('src')
                    if src and src.startswith('http'):
                        logger.info("Video ready!")
                        return src
                
                # Check for queue/progress
                progress = self._page.locator('.progress, [class*="progress"], .generating')
                if await progress.count() > 0:
                    logger.debug("Still generating...")
                
                await asyncio.sleep(10)
                
            except Exception as e:
                logger.debug(f"Waiting... ({e})")
                await asyncio.sleep(10)
        
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
            
            await self._page.goto(self.base_url, wait_until='networkidle')
            
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
    
    async def extend_video(self, video_path: str) -> ProviderResult:
        """
        Extend existing video by 5 seconds.
        Luma supports video extension.
        """
        try:
            if not self.can_generate():
                return ProviderResult(
                    success=False,
                    error="Rate limited"
                )
            
            await self._page.goto(self.base_url, wait_until='networkidle')
            
            # Upload existing video
            upload_input = self._page.locator('input[type="file"]')
            await upload_input.set_input_files(video_path)
            
            await asyncio.sleep(2)
            
            # Click extend
            extend_btn = self._page.locator(self.selectors['extend_button']).first
            if await extend_btn.count() > 0:
                await extend_btn.click()
                
                video_url = await self._wait_for_video(timeout=600)
                
                if video_url:
                    output_path = self._get_output_path("extended")
                    success = await self._download_video(video_url, str(output_path))
                    
                    if success:
                        self.record_request()
                        return ProviderResult(
                            success=True,
                            video_path=str(output_path),
                            duration=10.0,
                            metadata={'original': video_path}
                        )
            
            return ProviderResult(
                success=False,
                error="Extension failed"
            )
            
        except Exception as e:
            return ProviderResult(
                success=False,
                error=str(e)
            )
