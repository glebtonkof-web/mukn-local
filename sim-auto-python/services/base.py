"""
SIM Auto-Registration PRO - Base Service Class
Базовый класс для всех сервисов регистрации
"""

import asyncio
import random
from abc import ABC, abstractmethod
from typing import Dict, Optional, Any
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import (
    human_delay, human_click, human_typing, random_scroll, 
    simulate_reading, create_stealth_context, generate_profile,
    ADBClient, AccountStorage, Logger
)


class RegistrationResult:
    """Результат регистрации"""
    
    def __init__(self, success: bool, account: Dict = None, error: str = None, requires_manual: bool = False):
        self.success = success
        self.account = account or {}
        self.error = error
        self.requires_manual = requires_manual
    
    def to_dict(self) -> Dict:
        return {
            'success': self.success,
            'account': self.account,
            'error': self.error,
            'requires_manual': self.requires_manual
        }


class BaseRegistrationService(ABC):
    """
    Базовый класс для сервиса регистрации
    
    Все сервисы должны наследоваться от этого класса и реализовывать:
    - PLATFORM_NAME: имя платформы
    - REGISTRATION_URL: URL страницы регистрации
    - register(): метод регистрации
    """
    
    # Должны быть переопределены в дочерних классах
    PLATFORM_NAME: str = "unknown"
    REGISTRATION_URL: str = ""
    
    # Настройки по умолчанию
    USE_MOBILE: bool = False
    REQUIRES_PROXY: bool = False  # True для заблокированных в РФ
    TIMEOUT: int = 180000  # 3 минуты
    
    def __init__(
        self,
        adb: ADBClient = None,
        storage: AccountStorage = None,
        proxy: Dict = None,
        logger: Logger = None
    ):
        self.adb = adb or ADBClient()
        self.storage = storage or AccountStorage()
        self.proxy = proxy
        self.logger = logger or Logger('registration')
        
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
    
    async def init_browser(self, headless: bool = False) -> None:
        """Инициализация браузера"""
        self._playwright = await async_playwright().start()
        
        # Запуск браузера
        launch_options = {
            'headless': headless,
            'args': [
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--disable-notifications',
            ]
        }
        
        self.browser = await self._playwright.chromium.launch(**launch_options)
        
        # Создание stealth контекста
        platform_type = 'mobile' if self.USE_MOBILE else 'desktop'
        self.context = await create_stealth_context(
            self.browser,
            platform=platform_type,
            proxy=self.proxy
        )
        
        self.page = await self.context.new_page()
        
        self.logger.info(f"[{self.PLATFORM_NAME}] Браузер инициализирован")
    
    async def close_browser(self) -> None:
        """Закрытие браузера"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, '_playwright'):
                await self._playwright.stop()
        except Exception as e:
            self.logger.error(f"Ошибка закрытия браузера: {e}")
    
    async def navigate_to_registration(self) -> bool:
        """Навигация на страницу регистрации"""
        try:
            self.logger.info(f"[{self.PLATFORM_NAME}] Переход на {self.REGISTRATION_URL}")
            
            await self.page.goto(self.REGISTRATION_URL, timeout=self.TIMEOUT, wait_until='domcontentloaded')
            await human_delay(2, 4)
            
            # Имитация чтения страницы
            await simulate_reading(self.page, seconds=random.uniform(2, 5))
            
            return True
        except Exception as e:
            self.logger.error(f"Ошибка навигации: {e}")
            return False
    
    async def wait_for_sms_code(self, timeout: int = 180) -> Optional[str]:
        """Ожидание SMS кода"""
        if not self.adb:
            self.logger.error("ADB клиент не инициализирован")
            return None
        
        keywords = self.get_sms_keywords()
        return self.adb.wait_for_sms_code(timeout=timeout, keywords=keywords)
    
    def get_sms_keywords(self) -> list:
        """Ключевые слова для поиска SMS (переопределяется)"""
        return [self.PLATFORM_NAME]
    
    @abstractmethod
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Метод регистрации - должен быть реализован в дочернем классе
        
        Args:
            phone: Номер телефона для регистрации
            profile: Профиль пользователя (если None, генерируется автоматически)
        
        Returns:
            RegistrationResult с результатом регистрации
        """
        pass
    
    async def save_account(self, account_data: Dict) -> None:
        """Сохранение аккаунта в хранилище"""
        account_data['platform'] = self.PLATFORM_NAME
        account_data['registered_at'] = asyncio.get_event_loop().time()
        
        self.storage.add_account(self.PLATFORM_NAME, account_data)
        self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт сохранён: {account_data.get('username', 'N/A')}")
    
    async def take_screenshot(self, filename: str = None) -> str:
        """Скриншот текущей страницы"""
        if filename is None:
            filename = f"screenshot_{self.PLATFORM_NAME}_{asyncio.get_event_loop().time()}.png"
        
        path = os.path.join(os.path.dirname(__file__), '..', 'logs', filename)
        await self.page.screenshot(path=path)
        
        return path
    
    async def detect_block(self) -> bool:
        """Детекция блокировки/captcha"""
        try:
            content = await self.page.content()
            url = self.page.url
            
            block_indicators = [
                'captcha', 'recaptcha', 'hcaptcha', 'cloudflare',
                'access denied', 'blocked', 'заблокирован',
                'доступ запрещён', 'verify you are human'
            ]
            
            content_lower = content.lower()
            url_lower = url.lower()
            
            for indicator in block_indicators:
                if indicator in content_lower or indicator in url_lower:
                    self.logger.warning(f"[{self.PLATFORM_NAME}] Обнаружена блокировка: {indicator}")
                    return True
            
            return False
        except:
            return False
    
    async def run_with_retry(self, phone: str, profile: Dict = None, max_retries: int = 3) -> RegistrationResult:
        """Запуск регистрации с повторными попытками"""
        for attempt in range(max_retries):
            self.logger.info(f"[{self.PLATFORM_NAME}] Попытка {attempt + 1}/{max_retries}")
            
            try:
                result = await self.register(phone, profile)
                
                if result.success:
                    return result
                
                # Если требуется ручное вмешательство - не повторяем
                if result.requires_manual:
                    return result
                
                # Пауза перед следующей попыткой
                await human_delay(10, 30, action='between_services')
                
            except Exception as e:
                self.logger.error(f"Ошибка попытки {attempt + 1}: {e}")
            
            finally:
                await self.close_browser()
        
        return RegistrationResult(success=False, error=f"Failed after {max_retries} attempts")
