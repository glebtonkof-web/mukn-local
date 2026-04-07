"""
SIM Auto-Registration PRO - Base Registration Service
МУКН Enterprise AI Automation Platform

Базовый класс для всех сервисов регистрации:
- Общий интерфейс
- Антидетект функции
- Управление браузером
- Обработка ошибок
"""

import asyncio
import json
import logging
import os
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List, Any
from pathlib import Path

from playwright.async_api import async_playwright, Browser, Page, BrowserContext

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    ServiceConfig, SIMSlot, SIM_CARDS, SERVICES,
    PROXY, HEADLESS, BROWSER_TIMEOUT, PROFILES_DIR,
    ACCOUNTS_DB, LOGS_DIR
)
from utils import (
    human_delay, async_human_delay, thinking_delay,
    human_click, human_typing, human_fill,
    random_scroll, random_mouse_movement, human_navigate,
    wait_for_element, wait_and_click,
    generate_username, generate_password, generate_email,
    generate_name, generate_birthdate,
    HumanBehavior
)
from adb_sms import SMSManager, SMSMessage

logger = logging.getLogger(__name__)


# ============================================================================
# МОДЕЛИ ДАННЫХ
# ============================================================================

class RegistrationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    BLOCKED = "blocked"
    TIMEOUT = "timeout"
    SMS_ERROR = "sms_error"
    CAPTCHA_REQUIRED = "captcha_required"


@dataclass
class AccountData:
    """Данные зарегистрированного аккаунта"""
    service: str
    username: str
    password: str
    email: Optional[str] = None
    phone: Optional[str] = None
    phone_sim_slot: Optional[str] = None
    
    # Профиль
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birthdate: Optional[str] = None
    gender: Optional[str] = None
    
    # Метаданные
    created_at: datetime = field(default_factory=datetime.now)
    registration_ip: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Файлы
    profile_dir: Optional[str] = None
    cookies_file: Optional[str] = None
    
    # Статус
    is_active: bool = True
    is_warmed_up: bool = False
    warmup_progress: int = 0
    
    # Монетизация
    is_monetized: bool = False
    monetization_methods: List[str] = field(default_factory=list)
    earnings: float = 0.0
    
    def to_dict(self) -> Dict:
        """Конвертация в словарь"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AccountData':
        """Создание из словаря"""
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)


@dataclass
class RegistrationResult:
    """Результат регистрации"""
    status: RegistrationStatus
    account: Optional[AccountData] = None
    error_message: Optional[str] = None
    captcha_required: bool = False
    screenshot_path: Optional[str] = None
    
    # Время выполнения
    duration_seconds: float = 0.0
    sms_wait_seconds: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "status": self.status.value,
            "account": self.account.to_dict() if self.account else None,
            "error_message": self.error_message,
            "captcha_required": self.captcha_required,
            "screenshot_path": self.screenshot_path,
            "duration_seconds": self.duration_seconds,
            "sms_wait_seconds": self.sms_wait_seconds
        }


# ============================================================================
# БАЗОВЫЙ КЛАСС СЕРВИСА РЕГИСТРАЦИИ
# ============================================================================

class BaseRegistrationService(ABC):
    """
    Базовый класс для сервиса регистрации
    
    Все сервисы наследуются от этого класса и реализуют:
    - get_registration_url() - URL страницы регистрации
    - fill_registration_form() - заполнение формы
    - handle_sms_verification() - обработка SMS верификации
    - handle_email_verification() - обработка email верификации
    - complete_registration() - завершение регистрации
    - verify_account() - проверка что аккаунт создан
    """
    
    def __init__(
        self,
        config: ServiceConfig = None,
        sim_slot: SIMSlot = SIMSlot.SIM_0,
        proxy: Dict = None,
        headless: bool = None,
        sms_manager: SMSManager = None
    ):
        self.config = config
        self.sim_slot = sim_slot
        self.proxy = proxy or {}
        self.headless = headless if headless is not None else HEADLESS
        
        # SMS менеджер
        self.sms_manager = sms_manager
        
        # Браузер
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # Данные аккаунта
        self.account_data: Optional[AccountData] = None
        
        # Тайминги
        self._start_time: Optional[datetime] = None
        self._sms_start_time: Optional[datetime] = None
        
        # Логирование
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
    
    @property
    @abstractmethod
    def service_name(self) -> str:
        """Название сервиса"""
        pass
    
    @property
    def phone_number(self) -> str:
        """Номер телефона для регистрации"""
        sim_config = SIM_CARDS.get(self.sim_slot)
        if sim_config:
            return f"+7{sim_config.phone_number}"
        raise ValueError(f"No phone number configured for {self.sim_slot}")
    
    # ========================================================================
    # АБСТРАКТНЫЕ МЕТОДЫ (должны быть реализованы в наследниках)
    # ========================================================================
    
    @abstractmethod
    async def get_registration_url(self) -> str:
        """Получение URL страницы регистрации"""
        pass
    
    @abstractmethod
    async def fill_registration_form(self) -> bool:
        """
        Заполнение формы регистрации
        
        Returns:
            Успешность заполнения
        """
        pass
    
    async def handle_sms_verification(self) -> bool:
        """
        Обработка SMS верификации
        
        Returns:
            Успешность верификации
        """
        if not self.config.requires_sms:
            return True
        
        self._sms_start_time = datetime.now()
        self.logger.info(f"Waiting for SMS verification code...")
        
        try:
            # Ждем SMS код
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name=self.service_name,
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                self.logger.error("SMS code not received")
                return False
            
            # Вводим код (переопределяется в наследниках)
            return await self.enter_sms_code(code)
            
        except Exception as e:
            self.logger.error(f"SMS verification failed: {e}")
            return False
    
    async def enter_sms_code(self, code: str) -> bool:
        """
        Ввод SMS кода в форму
        
        Args:
            code: Код подтверждения
            
        Returns:
            Успешность
        """
        # Базовая реализация - ищем поле для кода
        code_selectors = [
            'input[placeholder*="код"]',
            'input[placeholder*="code"]',
            'input[placeholder*="Code"]',
            'input[name*="code"]',
            'input[name*="verification"]',
            'input[type="tel"][maxlength*="4"]',
            'input[type="tel"][maxlength*="5"]',
            'input[type="tel"][maxlength*="6"]',
            'input[type="text"][maxlength*="4"]',
            'input[type="text"][maxlength*="5"]',
            'input[type="text"][maxlength*="6"]',
        ]
        
        for selector in code_selectors:
            try:
                if await wait_for_element(self.page, selector, timeout=2000):
                    await human_fill(self.page, selector, code, simulate_typing=True)
                    self.logger.info(f"SMS code entered: {code}")
                    await async_human_delay(1.0, 2.0)
                    return True
            except:
                continue
        
        self.logger.error("Could not find SMS code input field")
        return False
    
    async def handle_email_verification(self) -> bool:
        """
        Обработка email верификации
        
        Returns:
            Успешность
        """
        # Базовая реализация - большинство сервисов не требуют
        return True
    
    async def handle_captcha(self) -> bool:
        """
        Обработка CAPTCHA
        
        Returns:
            Успешность прохождения
        """
        self.logger.warning("CAPTCHA detected - manual intervention may be required")
        
        # Ждем пока пользователь пройдет капчу
        for _ in range(60):  # 60 секунд на ручное прохождение
            await asyncio.sleep(1)
            # Проверяем исчезла ли капча
            # (переопределяется в наследниках)
        
        return False
    
    @abstractmethod
    async def complete_registration(self) -> bool:
        """
        Завершение регистрации (нажатие кнопки, ожидание)
        
        Returns:
            Успешность
        """
        pass
    
    @abstractmethod
    async def verify_account(self) -> bool:
        """
        Проверка что аккаунт успешно создан
        
        Returns:
            Аккаунт создан
        """
        pass
    
    # ========================================================================
    # МЕТОДЫ ЖИЗНЕННОГО ЦИКЛА
    # ========================================================================
    
    async def initialize(self) -> bool:
        """Инициализация браузера и контекста"""
        try:
            self.logger.info(f"Initializing {self.service_name} registration service...")
            
            # Запускаем Playwright
            self.playwright = await async_playwright().start()
            
            # Создаем директорию профиля
            profile_dir = Path(PROFILES_DIR) / f"{self.service_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            profile_dir.mkdir(parents=True, exist_ok=True)
            
            # Настройки браузера
            launch_args = [
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
            
            # Прокси
            proxy_config = None
            if self.proxy or (self.config.requires_proxy and PROXY.enabled):
                proxy_config = {
                    "server": f"{self.proxy.get('type', 'socks5')}://{self.proxy.get('host', PROXY.host)}:{self.proxy.get('port', PROXY.port)}",
                }
                if self.proxy.get('username') or PROXY.username:
                    proxy_config["username"] = self.proxy.get('username', PROXY.username)
                    proxy_config["password"] = self.proxy.get('password', PROXY.password)
            
            # Запускаем браузер
            self.browser = await self.playwright.chromium.launch(
                headless=self.headless,
                args=launch_args,
                proxy=proxy_config
            )
            
            # Создаем контекст с маскировкой
            self.context = await self.browser.new_context(
                viewport={'width': random.randint(1200, 1400), 'height': random.randint(800, 1000)},
                user_agent=self._get_random_user_agent(),
                locale='ru-RU',
                timezone_id='Europe/Moscow',
                geolocation={'latitude': 55.7558, 'longitude': 37.6173},  # Москва
                permissions=['geolocation'],
                ignore_https_errors=True,
            )
            
            # Добавляем скрипты маскировки
            await self._inject_stealth_scripts()
            
            # Создаем страницу
            self.page = await self.context.new_page()
            self.page.set_default_timeout(BROWSER_TIMEOUT)
            
            # Инициализируем SMS менеджер
            if not self.sms_manager:
                self.sms_manager = SMSManager()
                await self.sms_manager.initialize()
            
            self.logger.info("Browser initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Initialization failed: {e}")
            return False
    
    async def cleanup(self):
        """Очистка ресурсов"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            self.logger.error(f"Cleanup error: {e}")
    
    # ========================================================================
    # МЕТОДЫ РЕГИСТРАЦИИ
    # ========================================================================
    
    async def register(self) -> RegistrationResult:
        """
        Основной метод регистрации
        
        Returns:
            RegistrationResult с результатом
        """
        self._start_time = datetime.now()
        result = RegistrationResult(status=RegistrationStatus.PENDING)
        
        try:
            # Инициализация
            if not await self.initialize():
                result.status = RegistrationStatus.FAILED
                result.error_message = "Initialization failed"
                return result
            
            result.status = RegistrationStatus.IN_PROGRESS
            
            # Переходим на страницу регистрации
            url = await self.get_registration_url()
            self.logger.info(f"Navigating to: {url}")
            
            if not await human_navigate(self.page, url):
                result.status = RegistrationStatus.FAILED
                result.error_message = "Failed to navigate to registration page"
                return result
            
            # Генерируем данные аккаунта
            self.account_data = await self.generate_account_data()
            self.logger.info(f"Generated account: {self.account_data.username}")
            
            # Заполняем форму
            self.logger.info("Filling registration form...")
            if not await self.fill_registration_form():
                result.status = RegistrationStatus.FAILED
                result.error_message = "Failed to fill registration form"
                await self._take_screenshot("form_fill_failed")
                return result
            
            # SMS верификация
            if self.config.requires_sms:
                self.logger.info("Processing SMS verification...")
                if not await self.handle_sms_verification():
                    result.status = RegistrationStatus.SMS_ERROR
                    result.error_message = "SMS verification failed"
                    await self._take_screenshot("sms_failed")
                    return result
            
            # Email верификация
            if self.config.requires_email:
                self.logger.info("Processing email verification...")
                if not await self.handle_email_verification():
                    result.status = RegistrationStatus.FAILED
                    result.error_message = "Email verification failed"
                    return result
            
            # Завершаем регистрацию
            self.logger.info("Completing registration...")
            if not await self.complete_registration():
                result.status = RegistrationStatus.FAILED
                result.error_message = "Failed to complete registration"
                await self._take_screenshot("complete_failed")
                return result
            
            # Проверяем что аккаунт создан
            self.logger.info("Verifying account...")
            if not await self.verify_account():
                result.status = RegistrationStatus.FAILED
                result.error_message = "Account verification failed"
                await self._take_screenshot("verify_failed")
                return result
            
            # Сохраняем данные аккаунта
            self.account_data.profile_dir = str(profile_dir) if 'profile_dir' in dir() else None
            await self.save_account()
            
            result.status = RegistrationStatus.SUCCESS
            result.account = self.account_data
            self.logger.info(f"Registration successful: {self.account_data.username}")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            result.status = RegistrationStatus.FAILED
            result.error_message = str(e)
            await self._take_screenshot("error")
        
        finally:
            result.duration_seconds = (datetime.now() - self._start_time).total_seconds()
            if self._sms_start_time:
                result.sms_wait_seconds = (datetime.now() - self._sms_start_time).total_seconds()
            
            await self.cleanup()
        
        return result
    
    async def generate_account_data(self) -> AccountData:
        """Генерация данных для регистрации"""
        first_name, last_name = generate_name()
        username = generate_username()
        password = generate_password()
        email = generate_email(username)
        
        return AccountData(
            service=self.service_name,
            username=username,
            password=password,
            email=email,
            phone=self.phone_number,
            phone_sim_slot=self.sim_slot.name,
            first_name=first_name,
            last_name=last_name,
            birthdate=generate_birthdate(),
            gender=random.choice(['male', 'female'])
        )
    
    async def save_account(self) -> bool:
        """Сохранение аккаунта в базу"""
        try:
            accounts = []
            
            # Читаем существующие аккаунты
            if os.path.exists(ACCOUNTS_DB):
                with open(ACCOUNTS_DB, 'r', encoding='utf-8') as f:
                    accounts = json.load(f)
            
            # Добавляем новый
            accounts.append(self.account_data.to_dict())
            
            # Сохраняем
            with open(ACCOUNTS_DB, 'w', encoding='utf-8') as f:
                json.dump(accounts, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Account saved to {ACCOUNTS_DB}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to save account: {e}")
            return False
    
    # ========================================================================
    # ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    # ========================================================================
    
    def _get_random_user_agent(self) -> str:
        """Получение случайного User-Agent"""
        user_agents = [
            # Chrome на Windows
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            # Chrome на macOS
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            # Firefox на Windows
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            # Edge
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        ]
        return random.choice(user_agents)
    
    async def _inject_stealth_scripts(self):
        """Инъекция скриптов маскировки"""
        await self.context.add_init_script("""
            // Маскировка webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            
            // Маскировка plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Маскировка languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ru-RU', 'ru', 'en-US', 'en']
            });
            
            // Маскировка platform
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32'
            });
            
            // Маскировка hardwareConcurrency
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8
            });
            
            // Маскировка deviceMemory
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8
            });
            
            // Случайный canvas fingerprint
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                if (type === 'image/png' && this.width === 220 && this.height === 30) {
                    return originalToDataURL.apply(this, arguments);
                }
                // Добавляем шум
                const context = this.getContext('2d');
                const imageData = context.getImageData(0, 0, this.width, this.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] ^= (Math.random() * 4) | 0;
                }
                context.putImageData(imageData, 0, 0);
                return originalToDataURL.apply(this, arguments);
            };
            
            // Сохранение позиции мыши
            document.addEventListener('mousemove', (e) => {
                window.mouseX = e.clientX;
                window.mouseY = e.clientY;
            });
            
            // Маскировка Chrome
            window.chrome = {
                runtime: {}
            };
            
            // Маскировка Permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        """)
    
    async def _take_screenshot(self, name: str = "screenshot") -> Optional[str]:
        """Скриншот текущего состояния"""
        try:
            screenshots_dir = Path(LOGS_DIR) / "screenshots"
            screenshots_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.service_name}_{name}_{timestamp}.png"
            filepath = screenshots_dir / filename
            
            await self.page.screenshot(path=str(filepath))
            self.logger.info(f"Screenshot saved: {filepath}")
            
            return str(filepath)
            
        except Exception as e:
            self.logger.error(f"Screenshot failed: {e}")
            return None
    
    async def _wait_for_navigation(self, timeout: int = 30000) -> bool:
        """Ожидание навигации"""
        try:
            await self.page.wait_for_load_state('networkidle', timeout=timeout)
            return True
        except:
            return False
    
    async def _check_element_exists(self, selector: str) -> bool:
        """Проверка существования элемента"""
        try:
            count = await self.page.locator(selector).count()
            return count > 0
        except:
            return False
    
    async def _random_delay(self, min_sec: float = None, max_sec: float = None):
        """Случайная задержка"""
        min_sec = min_sec or self.config.min_delay if self.config else 1.0
        max_sec = max_sec or self.config.max_delay if self.config else 3.0
        await async_human_delay(min_sec, max_sec)
    
    async def _simulate_human_behavior(self):
        """Симуляция человеческого поведения"""
        await random_mouse_movement(self.page)
        await random_scroll(self.page)


# ============================================================================
# ФАБРИКА СЕРВИСОВ
# ============================================================================

def get_service(
    service_name: str,
    sim_slot: SIMSlot = SIMSlot.SIM_0,
    **kwargs
) -> BaseRegistrationService:
    """
    Фабрика для создания сервиса регистрации
    
    Args:
        service_name: Название сервиса
        sim_slot: Слот SIM-карты
        **kwargs: Дополнительные параметры
        
    Returns:
        Экземпляр сервиса регистрации
    """
    # Импортируем все сервисы
    from . import (
        YouTubeRegistration, TikTokRegistration, InstagramRegistration,
        TwitterRegistration, FacebookRegistration, VKRegistration,
        OKRegistration, TelegramRegistration, WhatsAppRegistration,
        DiscordRegistration, TwitchRegistration, SpotifyRegistration,
        TinderRegistration, LinkedInRegistration, PinterestRegistration,
        RedditRegistration, SnapchatRegistration, OnlyFansRegistration,
        LikeeRegistration, TrovoRegistration, RumbleRegistration,
        OdyseeRegistration
    )
    
    services_map = {
        'youtube': YouTubeRegistration,
        'tiktok': TikTokRegistration,
        'instagram': InstagramRegistration,
        'twitter': TwitterRegistration,
        'facebook': FacebookRegistration,
        'vk': VKRegistration,
        'ok': OKRegistration,
        'telegram': TelegramRegistration,
        'whatsapp': WhatsAppRegistration,
        'discord': DiscordRegistration,
        'twitch': TwitchRegistration,
        'spotify': SpotifyRegistration,
        'tinder': TinderRegistration,
        'linkedin': LinkedInRegistration,
        'pinterest': PinterestRegistration,
        'reddit': RedditRegistration,
        'snapchat': SnapchatRegistration,
        'onlyfans': OnlyFansRegistration,
        'likee': LikeeRegistration,
        'trovo': TrovoRegistration,
        'rumble': RumbleRegistration,
        'odysee': OdyseeRegistration,
    }
    
    service_class = services_map.get(service_name.lower())
    if not service_class:
        raise ValueError(f"Unknown service: {service_name}")
    
    config = SERVICES.get(service_name.lower())
    
    return service_class(
        config=config,
        sim_slot=sim_slot,
        **kwargs
    )


__all__ = [
    'BaseRegistrationService',
    'RegistrationStatus',
    'RegistrationResult',
    'AccountData',
    'get_service',
]
