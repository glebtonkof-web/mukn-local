"""
DeepSeek Account Manager with Playwright + Stealth
Industrial-grade browser automation for free DeepSeek access
"""

import asyncio
import random
import time
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from loguru import logger

# Playwright imports
try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext
    from playwright_stealth import stealth_async
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright not installed. Using mock mode.")


class AccountStatus(str, Enum):
    """Account status enum"""
    ACTIVE = "active"
    RATE_LIMITED = "rate_limited"
    BANNED = "banned"
    COOLDOWN = "cooldown"
    LOGIN_REQUIRED = "login_required"
    ERROR = "error"


@dataclass
class BrowserSession:
    """Browser session data"""
    browser: Any = None
    context: Any = None
    page: Any = None
    last_activity: datetime = field(default_factory=datetime.now)
    request_count: int = 0
    is_ready: bool = False


@dataclass
class HumanBehaviorConfig:
    """Human behavior simulation config"""
    typing_speed_min: int = 50  # ms per char
    typing_speed_max: int = 150
    reading_speed_wpm: int = 200  # words per minute
    typo_probability: float = 0.05
    pause_probability: float = 0.10
    scroll_probability: float = 0.30
    mouse_movement_enabled: bool = True
    random_delays_enabled: bool = True


@dataclass
class RateLimitConfig:
    """Rate limiting config"""
    max_requests_per_hour: int = 25
    max_requests_per_day: int = 200
    min_delay_between_requests: float = 5.0  # seconds
    max_delay_between_requests: float = 15.0
    backoff_multiplier: float = 1.5
    max_backoff: float = 60.0


class DeepSeekAccount:
    """
    Single DeepSeek account manager with browser automation.
    
    Features:
    - Playwright + Stealth for undetected browsing
    - Human behavior simulation
    - Rate limiting with backoff
    - Session management
    - Self-healing capabilities
    """
    
    DEEPSEEK_CHAT_URL = "https://chat.deepseek.com"
    DEEPSEEK_LOGIN_URL = "https://chat.deepseek.com/login"
    
    # DeepSeek selectors (may need updates if site changes)
    SELECTORS = {
        'chat_input': 'textarea[placeholder*="message"], textarea[aria-label*="message"], div[contenteditable="true"]',
        'send_button': 'button[type="submit"], button[aria-label*="send"]',
        'response_container': '.markdown-body, .response-content, [data-testid="response"]',
        'login_email': 'input[type="email"], input[name="email"]',
        'login_password': 'input[type="password"], input[name="password"]',
        'login_button': 'button[type="submit"], button:has-text("Login"), button:has-text("Sign in")',
        'error_message': '.error-message, .alert-error, [role="alert"]',
        'rate_limit_message': '.rate-limit, .quota-exceeded',
        'captcha': '.captcha, .g-recaptcha, iframe[src*="captcha"]',
    }
    
    # User agents pool
    USER_AGENTS = [
        # Chrome on Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        # Chrome on Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        # Firefox on Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        # Firefox on Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        # Edge
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    ]
    
    def __init__(
        self,
        account_id: str,
        email: str,
        password: str,
        proxy: Optional[Dict[str, Any]] = None,
        headless: bool = True,
        behavior_config: Optional[HumanBehaviorConfig] = None,
        rate_limit_config: Optional[RateLimitConfig] = None,
    ):
        self.account_id = account_id
        self.email = email
        self.password = password
        self.proxy = proxy
        self.headless = headless
        
        # Configs
        self.behavior_config = behavior_config or HumanBehaviorConfig()
        self.rate_limit_config = rate_limit_config or RateLimitConfig()
        
        # State
        self.status = AccountStatus.ACTIVE
        self.session: Optional[BrowserSession] = None
        self.request_times: List[datetime] = []
        self.last_error: Optional[str] = None
        self.consecutive_errors: int = 0
        self.total_requests: int = 0
        self.successful_requests: int = 0
        self.created_at = datetime.now()
        self.user_agent = random.choice(self.USER_AGENTS)
        
        # Playwright
        self._playwright = None
        
    async def initialize(self) -> bool:
        """Initialize browser session"""
        if not PLAYWRIGHT_AVAILABLE:
            logger.warning(f"[{self.account_id}] Playwright not available, using mock mode")
            self.status = AccountStatus.ACTIVE
            return True
            
        try:
            logger.info(f"[{self.account_id}] Initializing browser session...")
            
            # Start Playwright
            self._playwright = await async_playwright().start()
            
            # Launch browser with stealth
            launch_args = [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
            ]
            
            if self.proxy:
                proxy_config = {
                    'server': f"{self.proxy.get('type', 'http')}://{self.proxy['host']}:{self.proxy['port']}"
                }
                if self.proxy.get('username'):
                    proxy_config['username'] = self.proxy['username']
                if self.proxy.get('password'):
                    proxy_config['password'] = self.proxy['password']
            else:
                proxy_config = None
            
            browser = await self._playwright.chromium.launch(
                headless=self.headless,
                args=launch_args,
                proxy=proxy_config
            )
            
            # Create context with realistic settings
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent=self.user_agent,
                locale='ru-RU',
                timezone_id='Europe/Moscow',
                geolocation={'latitude': 55.7558, 'longitude': 37.6173},  # Moscow
                permissions=['geolocation'],
            )
            
            # Apply stealth
            page = await context.new_page()
            await stealth_async(page)
            
            # Add human-like behavior scripts
            await self._inject_human_behavior(page)
            
            self.session = BrowserSession(
                browser=browser,
                context=context,
                page=page,
                is_ready=True
            )
            
            # Navigate and login
            login_success = await self._login()
            
            if login_success:
                self.status = AccountStatus.ACTIVE
                logger.info(f"[{self.account_id}] Browser session initialized successfully")
                return True
            else:
                self.status = AccountStatus.LOGIN_REQUIRED
                logger.error(f"[{self.account_id}] Login failed")
                return False
                
        except Exception as e:
            logger.error(f"[{self.account_id}] Failed to initialize: {e}")
            self.last_error = str(e)
            self.status = AccountStatus.ERROR
            return False
    
    async def _inject_human_behavior(self, page):
        """Inject scripts for human-like behavior"""
        await page.add_init_script("""
            // Override navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ]
            });
            
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ru-RU', 'ru', 'en-US', 'en']
            });
            
            // Override platform
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32'
            });
            
            // Override hardwareConcurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8
            });
            
            // Override deviceMemory
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8
            });
        """)
    
    async def _login(self) -> bool:
        """Login to DeepSeek"""
        if not self.session or not self.session.page:
            return False
            
        try:
            page = self.session.page
            
            # Navigate to login page
            logger.info(f"[{self.account_id}] Navigating to login page...")
            await page.goto(self.DEEPSEEK_LOGIN_URL, wait_until='networkidle', timeout=30000)
            
            # Wait for page to load
            await asyncio.sleep(random.uniform(2, 4))
            
            # Check if already logged in
            current_url = page.url
            if 'chat' in current_url and 'login' not in current_url:
                logger.info(f"[{self.account_id}] Already logged in")
                return True
            
            # Find and fill email
            email_selectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[placeholder*="email"]',
                '#email',
            ]
            
            for selector in email_selectors:
                try:
                    email_input = await page.wait_for_selector(selector, timeout=5000)
                    if email_input:
                        await self._human_type(email_input, self.email)
                        break
                except:
                    continue
            
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Find and fill password
            password_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                '#password',
            ]
            
            for selector in password_selectors:
                try:
                    password_input = await page.wait_for_selector(selector, timeout=5000)
                    if password_input:
                        await self._human_type(password_input, self.password)
                        break
                except:
                    continue
            
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Click login button
            login_selectors = [
                'button[type="submit"]',
                'button:has-text("Login")',
                'button:has-text("Sign in")',
                'button:has-text("Войти")',
            ]
            
            for selector in login_selectors:
                try:
                    login_btn = await page.wait_for_selector(selector, timeout=5000)
                    if login_btn:
                        await login_btn.click()
                        break
                except:
                    continue
            
            # Wait for login to complete
            await asyncio.sleep(random.uniform(3, 6))
            
            # Check for errors
            error = await self._check_for_errors()
            if error:
                logger.error(f"[{self.account_id}] Login error: {error}")
                return False
            
            # Verify login success
            current_url = page.url
            if 'chat' in current_url or 'chat.deepseek.com' in current_url:
                logger.info(f"[{self.account_id}] Login successful")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"[{self.account_id}] Login failed: {e}")
            self.last_error = str(e)
            return False
    
    async def _human_type(self, element, text: str):
        """Type text with human-like delays and occasional typos"""
        for i, char in enumerate(text):
            # Random delay between keystrokes
            delay = random.uniform(
                self.behavior_config.typing_speed_min / 1000,
                self.behavior_config.typing_speed_max / 1000
            )
            
            # Occasional pause
            if random.random() < self.behavior_config.pause_probability:
                delay += random.uniform(0.5, 2.0)
            
            await asyncio.sleep(delay)
            
            # Occasional typo
            if random.random() < self.behavior_config.typo_probability and i > 0:
                # Type wrong char, then backspace
                wrong_char = random.choice('abcdefghijklmnopqrstuvwxyz')
                await element.type(wrong_char)
                await asyncio.sleep(random.uniform(0.1, 0.3))
                await element.press('Backspace')
                await asyncio.sleep(random.uniform(0.1, 0.3))
            
            await element.type(char)
    
    async def _check_for_errors(self) -> Optional[str]:
        """Check for error messages on page"""
        if not self.session or not self.session.page:
            return "No session"
            
        page = self.session.page
        
        # Check for captcha
        try:
            captcha = await page.query_selector(self.SELECTORS['captcha'])
            if captcha:
                return "Captcha detected"
        except:
            pass
        
        # Check for rate limit
        try:
            rate_limit = await page.query_selector(self.SELECTORS['rate_limit_message'])
            if rate_limit:
                self.status = AccountStatus.RATE_LIMITED
                return "Rate limited"
        except:
            pass
        
        # Check for error message
        try:
            error_el = await page.query_selector(self.SELECTORS['error_message'])
            if error_el:
                error_text = await error_el.text_content()
                return error_text
        except:
            pass
        
        return None
    
    async def ask(self, prompt: str, timeout: int = 120) -> Dict[str, Any]:
        """
        Send a prompt to DeepSeek and get response.
        
        Returns:
            Dict with 'success', 'response', 'error', 'from_cache', 'response_time'
        """
        start_time = time.time()
        
        # Check rate limits
        if not self._can_make_request():
            wait_time = self._get_wait_time()
            return {
                'success': False,
                'error': f'Rate limited. Wait {wait_time:.0f} seconds',
                'response_time': time.time() - start_time
            }
        
        # Check if ready
        if self.status != AccountStatus.ACTIVE:
            return {
                'success': False,
                'error': f'Account not ready: {self.status.value}',
                'response_time': time.time() - start_time
            }
        
        # Mock mode if Playwright not available
        if not PLAYWRIGHT_AVAILABLE or not self.session:
            return await self._mock_request(prompt, start_time)
        
        try:
            page = self.session.page
            
            # Random pre-action delay
            await asyncio.sleep(random.uniform(0.5, 2.0))
            
            # Navigate to chat if needed
            current_url = page.url
            if 'chat.deepseek.com' not in current_url:
                await page.goto(self.DEEPSEEK_CHAT_URL, wait_until='networkidle', timeout=30000)
                await asyncio.sleep(random.uniform(2, 4))
            
            # Find chat input
            chat_input = None
            for selector in [
                'textarea[placeholder*="message"]',
                'textarea[aria-label*="message"]',
                'div[contenteditable="true"]',
                'textarea',
            ]:
                try:
                    chat_input = await page.wait_for_selector(selector, timeout=5000)
                    if chat_input:
                        break
                except:
                    continue
            
            if not chat_input:
                return {
                    'success': False,
                    'error': 'Could not find chat input',
                    'response_time': time.time() - start_time
                }
            
            # Clear and type prompt
            await chat_input.click()
            await asyncio.sleep(0.3)
            
            # Select all and clear
            await page.keyboard.press('Control+A')
            await asyncio.sleep(0.1)
            await page.keyboard.press('Backspace')
            await asyncio.sleep(0.3)
            
            # Type with human behavior
            await self._human_type(chat_input, prompt)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Find and click send button
            send_selectors = [
                'button[type="submit"]',
                'button[aria-label*="send"]',
                'button:has-text("Send")',
            ]
            
            for selector in send_selectors:
                try:
                    send_btn = await page.query_selector(selector)
                    if send_btn:
                        await send_btn.click()
                        break
                except:
                    continue
            else:
                # Try pressing Enter
                await page.keyboard.press('Enter')
            
            # Wait for response
            response = await self._wait_for_response(timeout)
            
            if response:
                self._record_request(success=True)
                return {
                    'success': True,
                    'response': response,
                    'from_cache': False,
                    'response_time': time.time() - start_time,
                    'account_id': self.account_id
                }
            else:
                self._record_request(success=False)
                return {
                    'success': False,
                    'error': 'No response received',
                    'response_time': time.time() - start_time,
                    'account_id': self.account_id
                }
                
        except Exception as e:
            self._record_request(success=False)
            self.last_error = str(e)
            logger.error(f"[{self.account_id}] Request failed: {e}")
            
            # Check if we need to change status
            if 'rate' in str(e).lower() or 'limit' in str(e).lower():
                self.status = AccountStatus.RATE_LIMITED
            elif 'captcha' in str(e).lower():
                self.status = AccountStatus.ERROR
            
            return {
                'success': False,
                'error': str(e),
                'response_time': time.time() - start_time,
                'account_id': self.account_id
            }
    
    async def _wait_for_response(self, timeout: int = 120) -> Optional[str]:
        """Wait for AI response"""
        if not self.session or not self.session.page:
            return None
            
        page = self.session.page
        start_time = time.time()
        
        # Response indicators
        response_selectors = [
            '.markdown-body',
            '.response-content',
            '[data-testid="response"]',
            '.prose',
            '.message-content:last-child',
        ]
        
        last_length = 0
        stable_count = 0
        
        while time.time() - start_time < timeout:
            try:
                # Check for errors
                error = await self._check_for_errors()
                if error:
                    logger.warning(f"[{self.account_id}] Error during response: {error}")
                    return None
                
                # Try to get response
                for selector in response_selectors:
                    try:
                        elements = await page.query_selector_all(selector)
                        if elements:
                            # Get last element (most recent response)
                            last_element = elements[-1]
                            text = await last_element.text_content()
                            
                            if text and len(text.strip()) > 10:
                                # Check if response is still generating
                                current_length = len(text)
                                
                                if current_length == last_length:
                                    stable_count += 1
                                    if stable_count >= 3:  # 3 consecutive checks with same length
                                        return text.strip()
                                else:
                                    stable_count = 0
                                    last_length = current_length
                    except:
                        continue
                
                await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.debug(f"[{self.account_id}] Response check error: {e}")
                await asyncio.sleep(1)
        
        return None
    
    async def _mock_request(self, prompt: str, start_time: float) -> Dict[str, Any]:
        """Mock request for testing without Playwright"""
        # Simulate network delay
        await asyncio.sleep(random.uniform(2, 5))
        
        # Generate mock response
        mock_responses = [
            "Это тестовый ответ от DeepSeek Free. В реальном режиме здесь будет ответ от chat.deepseek.com",
            "Согласно вашему запросу, вот развёрнутый ответ на тему...",
            "Интересный вопрос! Позвольте рассказать подробнее...",
            "Анализируя ваш запрос, могу сказать следующее...",
        ]
        
        response = random.choice(mock_responses)
        self._record_request(success=True)
        
        return {
            'success': True,
            'response': response,
            'from_cache': False,
            'response_time': time.time() - start_time,
            'account_id': self.account_id
        }
    
    def _can_make_request(self) -> bool:
        """Check if account can make a request"""
        now = datetime.now()
        
        # Check hourly limit
        hour_ago = now - timedelta(hours=1)
        hourly_requests = len([t for t in self.request_times if t > hour_ago])
        
        if hourly_requests >= self.rate_limit_config.max_requests_per_hour:
            return False
        
        # Check daily limit
        day_ago = now - timedelta(days=1)
        daily_requests = len([t for t in self.request_times if t > day_ago])
        
        if daily_requests >= self.rate_limit_config.max_requests_per_day:
            return False
        
        # Check min delay
        if self.request_times:
            last_request = max(self.request_times)
            elapsed = (now - last_request).total_seconds()
            if elapsed < self.rate_limit_config.min_delay_between_requests:
                return False
        
        return True
    
    def _get_wait_time(self) -> float:
        """Get time to wait before next request"""
        now = datetime.now()
        
        if not self.request_times:
            return 0
        
        # Find oldest request in current hour window
        hour_ago = now - timedelta(hours=1)
        requests_in_hour = [t for t in self.request_times if t > hour_ago]
        
        if len(requests_in_hour) >= self.rate_limit_config.max_requests_per_hour:
            oldest = min(requests_in_hour)
            wait_time = (oldest + timedelta(hours=1) - now).total_seconds() + 5
            return max(0, wait_time)
        
        # Check min delay
        last_request = max(self.request_times)
        elapsed = (now - last_request).total_seconds()
        if elapsed < self.rate_limit_config.min_delay_between_requests:
            return self.rate_limit_config.min_delay_between_requests - elapsed
        
        return 0
    
    def _record_request(self, success: bool):
        """Record request for rate limiting"""
        self.request_times.append(datetime.now())
        self.total_requests += 1
        
        if success:
            self.successful_requests += 1
            self.consecutive_errors = 0
        else:
            self.consecutive_errors += 1
            
            # Too many errors, change status
            if self.consecutive_errors >= 5:
                self.status = AccountStatus.ERROR
    
    async def close(self):
        """Close browser session"""
        if self.session:
            try:
                if self.session.page:
                    await self.session.page.close()
                if self.session.context:
                    await self.session.context.close()
                if self.session.browser:
                    await self.session.browser.close()
            except Exception as e:
                logger.error(f"[{self.account_id}] Error closing session: {e}")
            finally:
                self.session = None
        
        if self._playwright:
            try:
                await self._playwright.stop()
            except:
                pass
            finally:
                self._playwright = None
    
    async def reset_session(self) -> bool:
        """Reset browser session (for recovery)"""
        logger.info(f"[{self.account_id}] Resetting session...")
        
        await self.close()
        
        # Rotate user agent
        self.user_agent = random.choice(self.USER_AGENTS)
        
        # Reset state
        self.status = AccountStatus.ACTIVE
        self.consecutive_errors = 0
        
        # Reinitialize
        return await self.initialize()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get account statistics"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        return {
            'account_id': self.account_id,
            'email': self.email,
            'status': self.status.value,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'success_rate': self.successful_requests / max(1, self.total_requests),
            'hourly_requests': len([t for t in self.request_times if t > hour_ago]),
            'daily_requests': len([t for t in self.request_times if t > day_ago]),
            'consecutive_errors': self.consecutive_errors,
            'last_error': self.last_error,
            'created_at': self.created_at.isoformat(),
            'can_make_request': self._can_make_request(),
            'wait_time': self._get_wait_time(),
        }
