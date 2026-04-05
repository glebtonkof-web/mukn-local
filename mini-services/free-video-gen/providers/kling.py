"""
Free Video Generator - Kling AI Provider
Primary video generation provider using Kling AI (klingai.com)
Uses Playwright for browser automation with stealth
"""

import asyncio
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from loguru import logger

from .base import BaseVideoProvider, ProviderResult, ProviderState


class KlingProvider(BaseVideoProvider):
    """
    Kling AI video generation provider.
    
    Features:
    - 60-100 free credits per day
    - 5-10 second videos
    - Up to 1080p resolution
    - Image-to-video support
    - Works from Russia/CIS (partial)
    """
    
    def __init__(self, config: Dict[str, Any], output_dir: str = "./output/scenes"):
        super().__init__("kling", config, output_dir)
        
        self.base_url = config.get('url', 'https://klingai.com')
        self.daily_credits = config.get('daily_credits', 100)
        self.max_hourly = config.get('max_requests_per_hour', 5)
        self.max_daily = config.get('max_requests_per_day', 50)
        
        # Page selectors (may need updates if site changes)
        self.selectors = {
            'login_button': 'button:has-text("Sign in"), a:has-text("Sign in")',
            'email_input': 'input[type="email"], input[name="email"]',
            'password_input': 'input[type="password"], input[name="password"]',
            'prompt_input': 'textarea[placeholder*="prompt"], textarea[placeholder*="Describe"], .prompt-input, #prompt',
            'generate_button': 'button:has-text("Generate"), button:has-text("Create"), .generate-btn',
            'video_player': 'video, .video-player video',
            'download_button': 'a[download], button:has-text("Download"), .download-btn',
            'credits_display': '.credits, .remaining-credits, [class*="credit"]',
            'duration_selector': 'button[data-duration="5"], button[data-duration="10"], .duration-btn',
            'ratio_selector': '.ratio-btn, button[data-ratio]',
        }
    
    async def login(self, headless: bool = True) -> bool:
        """
        Login to Kling AI using saved cookies or manual login.
        
        For first-time setup:
        1. User logs in manually in browser
        2. Cookies are saved to file
        3. Subsequent logins use saved cookies
        """
        try:
            from playwright.async_api import async_playwright, Browser, BrowserContext
            
            logger.info(f"Logging into Kling AI...")
            
            # Check for saved cookies first
            if await self._load_cookies():
                logger.info("Using saved cookies for authentication")
                return await self._verify_session()
            
            # Need manual login
            if not headless:
                return await self._manual_login()
            else:
                logger.warning("No saved cookies found. Run with headless=False for first-time login.")
                self.state = ProviderState.COOKIES_EXPIRED
                return False
                
        except ImportError:
            logger.error("Playwright not installed. Run: pip install playwright && playwright install")
            return False
        except Exception as e:
            logger.error(f"Login failed: {e}")
            self.state = ProviderState.ERROR
            return False
    
    async def _verify_session(self) -> bool:
        """Verify that saved session is still valid"""
        try:
            from playwright.async_api import async_playwright
            
            playwright = await async_playwright().start()
            self._browser = await playwright.chromium.launch(headless=True)
            
            self._context = await self._browser.new_context()
            
            # Add saved cookies
            if self.session_data.get('cookies'):
                await self._context.add_cookies(self.session_data['cookies'])
            
            self._page = await self._context.new_page()
            
            # Navigate to Kling AI
            await self._page.goto(self.base_url, wait_until='networkidle', timeout=30000)
            
            # Check if logged in
            await asyncio.sleep(2)
            
            # Look for user menu or credits display
            content = await self._page.content()
            
            if 'sign in' in content.lower() and 'credits' not in content.lower():
                logger.warning("Session expired, need to re-login")
                self.state = ProviderState.COOKIES_EXPIRED
                return False
            
            # Extract credits
            await self._extract_credits()
            
            self.state = ProviderState.AVAILABLE
            logger.info(f"Kling AI session verified. Credits: {self.credits_remaining}")
            return True
            
        except Exception as e:
            logger.error(f"Session verification failed: {e}")
            self.state = ProviderState.ERROR
            return False
    
    async def _manual_login(self) -> bool:
        """
        Perform manual login with visible browser.
        User must complete login in the browser window.
        """
        try:
            from playwright.async_api import async_playwright
            
            logger.info("Opening browser for manual login...")
            logger.info("Please login in the browser window, then press Enter here when done.")
            
            playwright = await async_playwright().start()
            self._browser = await playwright.chromium.launch(headless=False)
            
            self._context = await self._browser.new_context()
            self._page = await self._context.new_page()
            
            # Navigate to login page
            await self._page.goto(self.base_url, wait_until='networkidle')
            
            # Wait for user to complete login
            input("\nPress Enter after you have logged in...")
            
            # Save cookies
            cookies = await self._context.cookies()
            await self._save_cookies({'cookies': cookies})
            
            # Verify login
            await self._extract_credits()
            
            self.state = ProviderState.AVAILABLE
            logger.info("Manual login successful!")
            return True
            
        except Exception as e:
            logger.error(f"Manual login failed: {e}")
            return False
    
    async def _extract_credits(self):
        """Extract remaining credits from page"""
        try:
            # Try to find credits display
            credits_text = await self._page.locator(self.selectors['credits_display']).first.text_content()
            
            if credits_text:
                # Extract number from text
                match = re.search(r'(\d+)', credits_text)
                if match:
                    self.credits_remaining = int(match.group(1))
                    logger.debug(f"Extracted credits: {self.credits_remaining}")
                    
        except Exception as e:
            logger.debug(f"Could not extract credits: {e}")
            # Keep default value
    
    async def generate(
        self,
        prompt: str,
        duration: float = 10.0,
        ratio: str = "9:16",
        **kwargs
    ) -> ProviderResult:
        """
        Generate video from text prompt using Kling AI.
        
        Args:
            prompt: Text description of video
            duration: Video duration (5 or 10 seconds)
            ratio: Aspect ratio ("9:16", "16:9", "1:1")
            
        Returns:
            ProviderResult with video path or error
        """
        if not self.can_generate():
            wait_time = self.get_wait_time()
            return ProviderResult(
                success=False,
                error=f"Rate limited. Wait {wait_time:.0f} seconds."
            )
        
        try:
            logger.info(f"Generating video: {prompt[:50]}...")
            
            # Ensure browser is ready
            if not self._page:
                if not await self.login():
                    return ProviderResult(
                        success=False,
                        error="Failed to authenticate with Kling AI"
                    )
            
            # Navigate to generator
            await self._page.goto(f"{self.base_url}/create", wait_until='networkidle')
            await asyncio.sleep(2)
            
            # Set duration (5 or 10 seconds)
            duration_btn = self._page.locator(f'button:has-text("{int(duration)}s"), button[data-duration="{int(duration)}"]')
            if await duration_btn.count() > 0:
                await duration_btn.first.click()
                await asyncio.sleep(0.5)
            
            # Set aspect ratio
            if ratio != "9:16":
                ratio_btn = self._page.locator(f'button[data-ratio="{ratio}"], button:has-text("{ratio}")')
                if await ratio_btn.count() > 0:
                    await ratio_btn.first.click()
                    await asyncio.sleep(0.5)
            
            # Enter prompt
            prompt_input = self._page.locator(self.selectors['prompt_input']).first
            await prompt_input.fill(prompt)
            await asyncio.sleep(0.5)
            
            # Click generate
            generate_btn = self._page.locator(self.selectors['generate_button']).first
            await generate_btn.click()
            
            logger.info("Generation started, waiting for completion...")
            
            # Wait for generation (up to 5 minutes)
            video_url = await self._wait_for_video(timeout=300)
            
            if not video_url:
                return ProviderResult(
                    success=False,
                    error="Video generation timed out"
                )
            
            # Download video
            output_path = self._get_output_path(prompt)
            success = await self._download_video(video_url, str(output_path))
            
            if success:
                self.record_request()
                
                return ProviderResult(
                    success=True,
                    video_path=str(output_path),
                    duration=duration,
                    metadata={
                        'provider': 'kling',
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
        """
        Wait for video generation to complete.
        Returns video URL or None if timeout.
        """
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            try:
                # Check for video element
                video = self._page.locator(self.selectors['video_player']).first
                
                if await video.count() > 0:
                    # Get video source
                    src = await video.get_attribute('src')
                    if src and src.startswith('http'):
                        logger.info("Video ready!")
                        return src
                
                # Check for error messages
                error = self._page.locator('.error, .generation-error, [class*="error"]')
                if await error.count() > 0:
                    error_text = await error.first.text_content()
                    logger.error(f"Generation error: {error_text}")
                    return None
                
                # Check for queue position
                queue = self._page.locator('.queue-position, [class*="queue"]')
                if await queue.count() > 0:
                    queue_text = await queue.first.text_content()
                    logger.debug(f"Queue: {queue_text}")
                
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.debug(f"Waiting for video... ({e})")
                await asyncio.sleep(5)
        
        return None
    
    async def _download_video(self, url: str, output_path: str) -> bool:
        """Download video from URL"""
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
        """Check provider availability and credits"""
        try:
            if not self._page:
                return ProviderState.UNKNOWN
            
            # Navigate to home and check if logged in
            await self._page.goto(self.base_url, wait_until='networkidle')
            
            # Check for login button (if present, not logged in)
            login_btn = self._page.locator(self.selectors['login_button'])
            if await login_btn.count() > 0:
                self.state = ProviderState.COOKIES_EXPIRED
                return self.state
            
            # Extract credits
            await self._extract_credits()
            
            if self.credits_remaining > 0 and self.can_generate():
                self.state = ProviderState.AVAILABLE
            else:
                self.state = ProviderState.RATE_LIMITED
            
            return self.state
            
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            self.state = ProviderState.ERROR
            return self.state
    
    async def generate_from_image(
        self,
        image_path: str,
        prompt: str,
        duration: float = 10.0,
    ) -> ProviderResult:
        """
        Generate video from starting image (image-to-video).
        
        Args:
            image_path: Path to starting image
            prompt: Motion/animation description
            duration: Video duration
        """
        if not self.can_generate():
            return ProviderResult(
                success=False,
                error="Rate limited"
            )
        
        try:
            # Navigate to generator
            await self._page.goto(f"{self.base_url}/create", wait_until='networkidle')
            
            # Upload image
            upload_input = self._page.locator('input[type="file"]')
            await upload_input.set_input_files(image_path)
            
            await asyncio.sleep(2)
            
            # Continue with prompt
            return await self.generate(prompt, duration, "9:16")
            
        except Exception as e:
            return ProviderResult(
                success=False,
                error=str(e)
            )
