"""
Free Video Generator - Base Video Provider
Abstract base class for all video generation providers
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
from enum import Enum
import asyncio
import json

from loguru import logger
from pydantic import BaseModel


class ProviderResult(BaseModel):
    """Result from a video generation request"""
    success: bool
    video_path: Optional[str] = None
    duration: float = 0.0
    error: Optional[str] = None
    metadata: Dict[str, Any] = {}


class ProviderState(str, Enum):
    """Provider availability state"""
    AVAILABLE = "available"
    RATE_LIMITED = "rate_limited"
    COOKIES_EXPIRED = "cookies_expired"
    ERROR = "error"
    UNKNOWN = "unknown"


class BaseVideoProvider(ABC):
    """
    Abstract base class for video generation providers.
    
    Each provider must implement:
    - login(): Authenticate with the service
    - generate(): Generate video from prompt
    - check_status(): Check if provider is available
    """
    
    def __init__(
        self,
        name: str,
        config: Dict[str, Any],
        output_dir: str = "./output/scenes"
    ):
        self.name = name
        self.config = config
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Rate limiting state
        self.requests_today = 0
        self.requests_this_hour = 0
        self.last_request: Optional[datetime] = None
        self.hour_start: Optional[datetime] = None
        self.day_start: Optional[datetime] = None
        
        # Provider state
        self.state = ProviderState.UNKNOWN
        self.credits_remaining = config.get('daily_credits', 100)
        
        # Cookies and session
        self.cookies_path = Path(f"./data/cookies/{name}_cookies.json")
        self.session_data: Dict[str, Any] = {}
        
        # Browser instance (for Playwright)
        self._browser = None
        self._context = None
        self._page = None
    
    @abstractmethod
    async def login(self, headless: bool = True) -> bool:
        """
        Authenticate with the provider.
        Must be implemented by each provider.
        
        Returns:
            True if login successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        duration: float = 10.0,
        ratio: str = "9:16",
        **kwargs
    ) -> ProviderResult:
        """
        Generate video from text prompt.
        
        Args:
            prompt: Text description of the video
            duration: Video duration in seconds (5 or 10)
            ratio: Aspect ratio ("9:16", "16:9", "1:1")
            
        Returns:
            ProviderResult with video path or error
        """
        pass
    
    @abstractmethod
    async def check_status(self) -> ProviderState:
        """
        Check if provider is available and has credits.
        
        Returns:
            Current provider state
        """
        pass
    
    async def initialize(self) -> bool:
        """
        Initialize the provider.
        Loads cookies and checks status.
        """
        # Load cookies if available
        await self._load_cookies()
        
        # Check initial status
        self.state = await self.check_status()
        
        logger.info(f"Provider {self.name} initialized: {self.state}")
        
        return self.state == ProviderState.AVAILABLE
    
    async def close(self):
        """Clean up resources"""
        if self._page:
            await self._page.close()
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        
        self._page = None
        self._context = None
        self._browser = None
    
    def can_generate(self) -> bool:
        """Check if provider can generate now (rate limits)"""
        now = datetime.utcnow()
        
        # Reset hour counter
        if self.hour_start and (now - self.hour_start) > timedelta(hours=1):
            self.requests_this_hour = 0
            self.hour_start = now
        
        # Reset day counter
        if self.day_start and (now - self.day_start) > timedelta(hours=24):
            self.requests_today = 0
            self.day_start = now
            self.credits_remaining = self.config.get('daily_credits', 100)
        
        # Check limits
        max_hourly = self.config.get('max_requests_per_hour', 5)
        max_daily = self.config.get('max_requests_per_day', 50)
        
        if self.requests_this_hour >= max_hourly:
            logger.debug(f"{self.name}: Hourly limit reached ({max_hourly})")
            return False
        
        if self.requests_today >= max_daily:
            logger.debug(f"{self.name}: Daily limit reached ({max_daily})")
            return False
        
        if self.credits_remaining <= 0:
            logger.debug(f"{self.name}: No credits remaining")
            return False
        
        return self.state == ProviderState.AVAILABLE
    
    def record_request(self):
        """Record a generation request"""
        now = datetime.utcnow()
        
        if not self.hour_start:
            self.hour_start = now
        if not self.day_start:
            self.day_start = now
        
        self.requests_this_hour += 1
        self.requests_today += 1
        self.last_request = now
        self.credits_remaining -= 1
    
    def get_wait_time(self) -> float:
        """Get seconds to wait before next request"""
        if not self.hour_start:
            return 0
        
        now = datetime.utcnow()
        hour_elapsed = (now - self.hour_start).total_seconds()
        
        if hour_elapsed < 3600 and self.requests_this_hour >= self.config.get('max_requests_per_hour', 5):
            return 3600 - hour_elapsed
        
        return 0
    
    async def _load_cookies(self) -> bool:
        """Load cookies from file"""
        if not self.cookies_path.exists():
            return False
        
        try:
            with open(self.cookies_path, 'r') as f:
                self.session_data = json.load(f)
            logger.debug(f"{self.name}: Loaded cookies from {self.cookies_path}")
            return True
        except Exception as e:
            logger.error(f"{self.name}: Failed to load cookies: {e}")
            return False
    
    async def _save_cookies(self, cookies: List[Dict]):
        """Save cookies to file"""
        self.cookies_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(self.cookies_path, 'w') as f:
                json.dump(cookies, f)
            logger.debug(f"{self.name}: Saved cookies to {self.cookies_path}")
        except Exception as e:
            logger.error(f"{self.name}: Failed to save cookies: {e}")
    
    def _get_output_path(self, prompt: str) -> Path:
        """Generate output file path"""
        import hashlib
        from datetime import datetime
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
        
        filename = f"{self.name}_{timestamp}_{prompt_hash}.mp4"
        return self.output_dir / filename
    
    def get_status_info(self) -> Dict[str, Any]:
        """Get provider status information"""
        return {
            'name': self.name,
            'state': self.state.value,
            'available': self.can_generate(),
            'credits_remaining': self.credits_remaining,
            'requests_today': self.requests_today,
            'requests_this_hour': self.requests_this_hour,
            'max_hourly': self.config.get('max_requests_per_hour', 5),
            'max_daily': self.config.get('max_requests_per_day', 50),
            'wait_time': self.get_wait_time(),
            'last_request': self.last_request.isoformat() if self.last_request else None,
        }
    
    @staticmethod
    def _convert_ratio(ratio: str) -> tuple:
        """Convert ratio string to width/height"""
        ratios = {
            "9:16": (576, 1024),  # Vertical
            "16:9": (1024, 576),  # Horizontal
            "1:1": (720, 720),    # Square
        }
        return ratios.get(ratio, (576, 1024))
