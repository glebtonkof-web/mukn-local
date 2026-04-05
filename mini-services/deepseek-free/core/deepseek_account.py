"""
DeepSeek Free Account Manager
Менеджер одного аккаунта DeepSeek с Playwright + Stealth

МУКН | Трафик - Enterprise AI-powered Telegram Automation Platform
"""

import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger
import hashlib

# Playwright imports
try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext, Playwright
    from playwright_stealth import stealth_async
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.error("Playwright not installed! Install with: pip install playwright playwright-stealth && playwright install chromium")
    raise ImportError(
        "Playwright is required for DeepSeek Free service. "
        "Install with: pip install playwright playwright-stealth && playwright install chromium"
    )


class AccountStatus(str, Enum):
    """Статус аккаунта"""
    ACTIVE = "active"
    RATE_LIMITED = "rate_limited"
    BANNED = "banned"
    COOLDOWN = "cooldown"
    LOGIN_REQUIRED = "login_required"
    ERROR = "error"
    INITIALIZING = "initializing"


@dataclass
class BrowserSession:
    """Сессия браузера"""
    browser: Optional[Browser] = None
    context: Optional[BrowserContext] = None
    page: Optional[Page] = None
    playwright: Optional[Playwright] = None
    last_activity: datetime = field(default_factory=datetime.now)
    request_count: int = 0
    is_ready: bool = False


@dataclass
class HumanBehaviorConfig:
    """Конфигурация симуляции человеческого поведения"""
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
    """Конфигурация rate limiting"""
    max_requests_per_hour: int = 25
    max_requests_per_day: int = 200
    min_delay_between_requests: float = 5.0  # секунд
    max_delay_between_requests: float = 15.0
    backoff_multiplier: float = 1.5
    max_backoff: float = 60.0
    cooldown_after_limit: float = 300.0  # 5 минут


class DeepSeekAccount:
    """
    Менеджер одного аккаунта DeepSeek с браузерной автоматизацией.
    
    Features:
    - Playwright + Stealth для маскировки
    - Симуляция человеческого поведения
    - Rate limiting с backoff
    - Self-healing
    - Прокси и User-Agent ротация
    """
    
    DEEPSEEK_CHAT_URL = "https://chat.deepseek.com"
    DEEPSEEK_LOGIN_URL = "https://chat.deepseek.com/login"
    
    # Селекторы DeepSeek (могут требовать обновления)
    SELECTORS = {
        'chat_input': 'textarea[placeholder*="message"], textarea[aria-label*="message"], div[contenteditable="true"], textarea',
        'send_button': 'button[type="submit"], button[aria-label*="send"], button:has-text("Send")',
        'response_container': '.markdown-body, .response-content, [data-testid="response"], .prose, .message-content',
        'login_email': 'input[type="email"], input[name="email"], input[placeholder*="email"]',
        'login_password': 'input[type="password"], input[name="password"]',
        'login_button': 'button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Войти")',
        'error_message': '.error-message, .alert-error, [role="alert"]',
        'rate_limit_message': '.rate-limit, .quota-exceeded',
        'captcha': '.g-recaptcha, .h-captcha, iframe[src*="captcha"]',
        'new_chat_button': 'button:has-text("New chat"), button:has-text("Новый чат")',
        'sidebar': '.sidebar, nav, aside',
        'user_menu': '.user-menu, .avatar, [data-testid="user-menu"]',
    }
    
    # Пул User-Agent
    USER_AGENTS = [
        # Chrome на Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        # Chrome на Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        # Firefox на Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
        # Firefox на Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        # Edge
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        # Safari на Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    ]
    
    def __init__(
        self,
        account_id: str,
        email: str,
        password: str,
        proxy: Optional[Dict[str, Any]] = None,
        headless: bool = True,
        user_agent: Optional[str] = None,
        behavior_config: Optional[HumanBehaviorConfig] = None,
        rate_limit_config: Optional[RateLimitConfig] = None,
    ):
        self.account_id = account_id
        self.email = email
        self.password = password
        self.proxy = proxy
        self.headless = headless
        
        # User-Agent
        self.user_agent = user_agent or random.choice(self.USER_AGENTS)
        
        # Конфигурации
        self.behavior_config = behavior_config or HumanBehaviorConfig()
        self.rate_limit_config = rate_limit_config or RateLimitConfig()
        
        # Состояние
        self.status = AccountStatus.INITIALIZING
        self.session: Optional[BrowserSession] = None
        self.request_times: List[datetime] = []
        self.last_error: Optional[str] = None
        self.consecutive_errors: int = 0
        self.total_requests: int = 0
        self.successful_requests: int = 0
        self.created_at = datetime.now()
        
        # Playwright
        self._playwright: Optional[Playwright] = None
        
        # Кэш ответов для этого аккаунта
        self._response_cache: Dict[str, str] = {}
        
    async def initialize(self) -> bool:
        """Инициализация браузерной сессии"""
        if not PLAYWRIGHT_AVAILABLE:
            logger.error(f"[{self.account_id}] Playwright not available - cannot initialize")
            self.status = AccountStatus.ERROR
            self.last_error = "Playwright not installed"
            return False
            
        try:
            logger.info(f"[{self.account_id}] Initializing browser session...")
            
            # Запуск Playwright
            self._playwright = await async_playwright().start()
            
            # Аргументы запуска браузера
            launch_args = [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-infobars',
                '--disable-extensions',
                '--disable-gpu',
                '--window-size=1920,1080',
            ]
            
            # Конфигурация прокси
            proxy_config = None
            if self.proxy:
                proxy_config = {
                    'server': f"{self.proxy.get('type', 'http')}://{self.proxy['host']}:{self.proxy['port']}"
                }
                if self.proxy.get('username'):
                    proxy_config['username'] = self.proxy['username']
                if self.proxy.get('password'):
                    proxy_config['password'] = self.proxy['password']
            
            # Запуск браузера
            browser = await self._playwright.chromium.launch(
                headless=self.headless,
                args=launch_args,
                proxy=proxy_config
            )
            
            # Создание контекста с реалистичными настройками
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent=self.user_agent,
                locale='ru-RU',
                timezone_id='Europe/Moscow',
                geolocation={'latitude': 55.7558, 'longitude': 37.6173},
                permissions=['geolocation'],
                color_scheme='light',
                has_touch=False,
                is_mobile=False,
                java_script_enabled=True,
            )
            
            # Применение stealth
            page = await context.new_page()
            await stealth_async(page)
            
            # Инъекция скриптов маскировки
            await self._inject_human_behavior(page)
            
            # Создание сессии
            self.session = BrowserSession(
                browser=browser,
                context=context,
                page=page,
                playwright=self._playwright,
                is_ready=True
            )
            
            # Попытка входа
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
    
    async def _inject_human_behavior(self, page: Page) -> None:
        """Инъекция скриптов для маскировки под человека"""
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
            
            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Override WebGL vendor
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameter.apply(this, [parameter]);
            };
            
            // Hide automation indicators
            Object.defineProperty(navigator, 'permissions', {
                get: () => ({
                    query: () => Promise.resolve({ state: 'granted' })
                })
            });
        """)
    
    async def _login(self) -> bool:
        """Вход в DeepSeek"""
        if not self.session or not self.session.page:
            return False
            
        try:
            page = self.session.page
            
            # Навигация на страницу входа
            logger.info(f"[{self.account_id}] Navigating to login page...")
            await page.goto(self.DEEPSEEK_CHAT_URL, wait_until='networkidle', timeout=30000)
            
            # Случайная задержка
            await asyncio.sleep(random.uniform(2, 4))
            
            # Проверяем, нужен ли вход
            current_url = page.url
            if 'login' not in current_url and 'chat.deepseek.com' in current_url:
                # Проверяем, есть ли чат
                try:
                    chat_input = await page.wait_for_selector(self.SELECTORS['chat_input'], timeout=5000)
                    if chat_input:
                        logger.info(f"[{self.account_id}] Already logged in")
                        return True
                except:
                    pass
            
            # Переходим на страницу входа если нужно
            if 'login' not in current_url:
                await page.goto(self.DEEPSEEK_LOGIN_URL, wait_until='networkidle', timeout=30000)
                await asyncio.sleep(random.uniform(2, 4))
            
            # Ищем и заполняем email
            email_selectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[placeholder*="email"]',
                '#email',
                'input[inputmode="email"]',
            ]
            
            email_found = False
            for selector in email_selectors:
                try:
                    email_input = await page.wait_for_selector(selector, timeout=3000)
                    if email_input:
                        await self._human_type(email_input, self.email)
                        email_found = True
                        break
                except:
                    continue
            
            if not email_found:
                logger.warning(f"[{self.account_id}] Email input not found, trying alternative login")
                return await self._try_alternative_login(page)
            
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Ищем и заполняем пароль
            password_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                '#password',
            ]
            
            for selector in password_selectors:
                try:
                    password_input = await page.wait_for_selector(selector, timeout=3000)
                    if password_input:
                        await self._human_type(password_input, self.password)
                        break
                except:
                    continue
            
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Нажимаем кнопку входа
            login_selectors = [
                'button[type="submit"]',
                'button:has-text("Login")',
                'button:has-text("Sign in")',
                'button:has-text("Войти")',
                'button:has-text("Continue")',
            ]
            
            for selector in login_selectors:
                try:
                    login_btn = await page.wait_for_selector(selector, timeout=3000)
                    if login_btn:
                        await login_btn.click()
                        break
                except:
                    continue
            
            # Ждём завершения входа
            await asyncio.sleep(random.uniform(3, 6))
            
            # Проверяем ошибки
            error = await self._check_for_errors()
            if error:
                logger.error(f"[{self.account_id}] Login error: {error}")
                return False
            
            # Проверяем успешность входа
            current_url = page.url
            if 'chat' in current_url or 'chat.deepseek.com' in current_url:
                try:
                    await page.wait_for_selector(self.SELECTORS['chat_input'], timeout=10000)
                    logger.info(f"[{self.account_id}] Login successful")
                    return True
                except:
                    pass
            
            logger.warning(f"[{self.account_id}] Login status unclear, URL: {current_url}")
            return False
            
        except Exception as e:
            logger.error(f"[{self.account_id}] Login failed: {e}")
            self.last_error = str(e)
            return False
    
    async def _try_alternative_login(self, page: Page) -> bool:
        """Альтернативный метод входа (например, через Google/OAuth)"""
        logger.info(f"[{self.account_id}] Trying alternative login methods...")
        # Здесь можно добавить логику для входа через Google, GitHub и т.д.
        return False
    
    async def _human_type(self, element, text: str) -> None:
        """Печать текста с человеческими задержками и случайными опечатками"""
        for i, char in enumerate(text):
            # Случайная задержка между нажатиями
            delay = random.uniform(
                self.behavior_config.typing_speed_min / 1000,
                self.behavior_config.typing_speed_max / 1000
            )
            
            # Случайная пауза
            if random.random() < self.behavior_config.pause_probability:
                delay += random.uniform(0.5, 2.0)
            
            await asyncio.sleep(delay)
            
            # Случайная опечатка
            if random.random() < self.behavior_config.typo_probability and i > 0:
                wrong_char = random.choice('abcdefghijklmnopqrstuvwxyz')
                await element.type(wrong_char)
                await asyncio.sleep(random.uniform(0.1, 0.3))
                await element.press('Backspace')
                await asyncio.sleep(random.uniform(0.1, 0.3))
            
            await element.type(char)
    
    async def _check_for_errors(self) -> Optional[str]:
        """Проверка на наличие ошибок на странице"""
        if not self.session or not self.session.page:
            return "No session"
            
        page = self.session.page
        
        # Проверка на капчу
        try:
            captcha = await page.query_selector(self.SELECTORS['captcha'])
            if captcha:
                self.status = AccountStatus.ERROR
                return "Captcha detected"
        except:
            pass
        
        # Проверка на rate limit
        try:
            rate_limit = await page.query_selector(self.SELECTORS['rate_limit_message'])
            if rate_limit:
                self.status = AccountStatus.RATE_LIMITED
                return "Rate limited"
        except:
            pass
        
        # Проверка сообщения об ошибке
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
        Отправить запрос в DeepSeek и получить ответ.
        
        Returns:
            Dict с полями: success, response, error, from_cache, response_time, account_id
        """
        start_time = time.time()
        
        # Проверка кэша
        cache_key = hashlib.md5(prompt.encode()).hexdigest()
        if cache_key in self._response_cache:
            logger.debug(f"[{self.account_id}] Cache hit")
            return {
                'success': True,
                'response': self._response_cache[cache_key],
                'from_cache': True,
                'response_time': time.time() - start_time,
                'account_id': self.account_id
            }
        
        # Проверка rate limits
        if not self._can_make_request():
            wait_time = self._get_wait_time()
            return {
                'success': False,
                'error': f'Rate limited. Wait {wait_time:.0f} seconds',
                'response_time': time.time() - start_time,
                'account_id': self.account_id
            }
        
        # Проверка статуса
        if self.status != AccountStatus.ACTIVE:
            return {
                'success': False,
                'error': f'Account not ready: {self.status.value}',
                'response_time': time.time() - start_time,
                'account_id': self.account_id
            }
        
        # Проверка сессии
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright not installed")
        
        if not self.session:
            return {
                'success': False,
                'error': 'Browser session not initialized',
                'response_time': time.time() - start_time,
                'account_id': self.account_id
            }
        
        try:
            page = self.session.page
            
            # Случайная задержка перед действием
            await asyncio.sleep(random.uniform(0.5, 2.0))
            
            # Навигация на чат если нужно
            current_url = page.url
            if 'chat.deepseek.com' not in current_url:
                await page.goto(self.DEEPSEEK_CHAT_URL, wait_until='networkidle', timeout=30000)
                await asyncio.sleep(random.uniform(2, 4))
            
            # Поиск поля ввода
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
                    'response_time': time.time() - start_time,
                    'account_id': self.account_id
                }
            
            # Клик и очистка
            await chat_input.click()
            await asyncio.sleep(0.3)
            await page.keyboard.press('Control+A')
            await asyncio.sleep(0.1)
            await page.keyboard.press('Backspace')
            await asyncio.sleep(0.3)
            
            # Печать с человеческим поведением
            await self._human_type(chat_input, prompt)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Отправка
            send_selectors = [
                'button[type="submit"]',
                'button[aria-label*="send"]',
                'button:has-text("Send")',
            ]
            
            sent = False
            for selector in send_selectors:
                try:
                    send_btn = await page.query_selector(selector)
                    if send_btn:
                        await send_btn.click()
                        sent = True
                        break
                except:
                    continue
            
            if not sent:
                await page.keyboard.press('Enter')
            
            # Ожидание ответа
            response = await self._wait_for_response(timeout)
            
            if response:
                self._record_request(success=True)
                self._response_cache[cache_key] = response
                
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
            
            # Изменение статуса при определённых ошибках
            error_str = str(e).lower()
            if 'rate' in error_str or 'limit' in error_str:
                self.status = AccountStatus.RATE_LIMITED
            elif 'captcha' in error_str:
                self.status = AccountStatus.ERROR
            
            return {
                'success': False,
                'error': str(e),
                'response_time': time.time() - start_time,
                'account_id': self.account_id
            }
    
    async def _wait_for_response(self, timeout: int = 120) -> Optional[str]:
        """Ожидание ответа от AI"""
        if not self.session or not self.session.page:
            return None
            
        page = self.session.page
        start_time = time.time()
        
        # Селекторы для ответа
        response_selectors = [
            '.markdown-body',
            '.response-content',
            '[data-testid="response"]',
            '.prose',
            '.message-content:last-child',
            '.assistant-message',
        ]
        
        last_length = 0
        stable_count = 0
        
        while time.time() - start_time < timeout:
            try:
                # Проверка на ошибки
                error = await self._check_for_errors()
                if error:
                    logger.warning(f"[{self.account_id}] Error during response: {error}")
                    return None
                
                # Попытка получить ответ
                for selector in response_selectors:
                    try:
                        elements = await page.query_selector_all(selector)
                        if elements:
                            # Берём последний элемент (последний ответ)
                            last_element = elements[-1]
                            text = await last_element.text_content()
                            
                            if text and len(text.strip()) > 10:
                                current_length = len(text)
                                
                                # Проверка стабильности ответа
                                if current_length == last_length:
                                    stable_count += 1
                                    if stable_count >= 3:
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
    
    def _can_make_request(self) -> bool:
        """Проверка возможности сделать запрос"""
        now = datetime.now()
        
        # Проверка часового лимита
        hour_ago = now - timedelta(hours=1)
        hourly_requests = len([t for t in self.request_times if t > hour_ago])
        
        if hourly_requests >= self.rate_limit_config.max_requests_per_hour:
            return False
        
        # Проверка дневного лимита
        day_ago = now - timedelta(days=1)
        daily_requests = len([t for t in self.request_times if t > day_ago])
        
        if daily_requests >= self.rate_limit_config.max_requests_per_day:
            return False
        
        # Проверка минимальной задержки
        if self.request_times:
            last_request = max(self.request_times)
            elapsed = (now - last_request).total_seconds()
            if elapsed < self.rate_limit_config.min_delay_between_requests:
                return False
        
        return True
    
    def _get_wait_time(self) -> float:
        """Получить время ожидания до следующего запроса"""
        now = datetime.now()
        
        if not self.request_times:
            return 0
        
        # Находим самый старый запрос в текущем часовом окне
        hour_ago = now - timedelta(hours=1)
        requests_in_hour = [t for t in self.request_times if t > hour_ago]
        
        if len(requests_in_hour) >= self.rate_limit_config.max_requests_per_hour:
            oldest = min(requests_in_hour)
            wait_time = (oldest + timedelta(hours=1) - now).total_seconds() + 5
            return max(0, wait_time)
        
        # Проверка минимальной задержки
        last_request = max(self.request_times)
        elapsed = (now - last_request).total_seconds()
        if elapsed < self.rate_limit_config.min_delay_between_requests:
            return self.rate_limit_config.min_delay_between_requests - elapsed
        
        return 0
    
    def _record_request(self, success: bool) -> None:
        """Запись запроса для rate limiting"""
        self.request_times.append(datetime.now())
        self.total_requests += 1
        
        if success:
            self.successful_requests += 1
            self.consecutive_errors = 0
        else:
            self.consecutive_errors += 1
            
            # Слишком много ошибок - изменение статуса
            if self.consecutive_errors >= 5:
                self.status = AccountStatus.ERROR
    
    async def close(self) -> None:
        """Закрытие браузерной сессии"""
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
        """Сброс сессии (для восстановления)"""
        logger.info(f"[{self.account_id}] Resetting session...")
        
        await self.close()
        
        # Ротация User-Agent
        self.user_agent = random.choice(self.USER_AGENTS)
        
        # Сброс состояния
        self.status = AccountStatus.ACTIVE
        self.consecutive_errors = 0
        
        # Повторная инициализация
        return await self.initialize()
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики аккаунта"""
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
            'requests_remaining_hour': self.rate_limit_config.max_requests_per_hour - len([t for t in self.request_times if t > hour_ago]),
            'requests_remaining_day': self.rate_limit_config.max_requests_per_day - len([t for t in self.request_times if t > day_ago]),
        }
