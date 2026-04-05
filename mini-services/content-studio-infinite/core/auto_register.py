"""
Content Studio Infinite - Auto Registration
Автоматическая регистрация аккаунтов для всех провайдеров

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import asyncio
import random
import re
import string
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from loguru import logger

from .temp_email import TempEmailManager, TempEmailService
from .types import AccountStatus
from .account_pool import AccountPool


@dataclass
class RegistrationResult:
    """Результат регистрации"""
    success: bool
    email: Optional[str] = None
    password: Optional[str] = None
    cookies: List[Dict] = None
    credits: int = 0
    error: Optional[str] = None
    provider: str = ""


class AutoRegistrar:
    """
    Универсальный класс для автоматической регистрации.
    
    Поддерживает регистрацию на всех провайдерах:
    - Kling AI
    - Wan.video
    - Digen.ai
    - Qwen AI
    - Runway
    - Luma
    - Pika Labs
    - Haiper AI
    - Vidu Studio
    """
    
    PROVIDER_URLS = {
        'kling': 'https://klingai.com',
        'wan': 'https://wan.video',
        'digen': 'https://digen.ai',
        'qwen': 'https://qwen.ai',
        'runway': 'https://runwayml.com',
        'luma': 'https://lumalabs.ai',
        'pika': 'https://pika.art',
        'haiper': 'https://haiper.ai',
        'vidu': 'https://vidu.studio',
    }
    
    def __init__(
        self,
        pool: AccountPool,
        temp_email_manager: TempEmailManager = None,
        headless: bool = True,
        proxy: Dict = None
    ):
        self.pool = pool
        self.email_manager = temp_email_manager or TempEmailManager()
        self.headless = headless
        self.proxy = proxy
    
    async def generate_password(self, length: int = 16) -> str:
        """Генерация случайного пароля"""
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(random.choices(chars, k=length))
        
        # Убедимся что есть разные типы символов
        if not any(c.isupper() for c in password):
            password = random.choice(string.ascii_uppercase) + password[1:]
        if not any(c.islower() for c in password):
            password = password[:-1] + random.choice(string.ascii_lowercase)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + random.choice(string.digits)
        
        return password
    
    async def register(
        self,
        provider: str,
        max_attempts: int = 3
    ) -> RegistrationResult:
        """
        Регистрация нового аккаунта для провайдера.
        
        Args:
            provider: Имя провайдера (kling, wan, digen, etc.)
            max_attempts: Максимум попыток
            
        Returns:
            RegistrationResult
        """
        if provider not in self.PROVIDER_URLS:
            return RegistrationResult(
                success=False,
                error=f"Unknown provider: {provider}",
                provider=provider
            )
        
        for attempt in range(max_attempts):
            logger.info(f"Registering {provider} (attempt {attempt + 1}/{max_attempts})")
            
            try:
                # Создаём временную почту
                email, email_service = await self.email_manager.create_email()
                password = await self.generate_password()
                
                logger.info(f"Created temp email: {email}")
                
                # Регистрация через Playwright
                result = await self._register_with_playwright(
                    provider, email, password, email_service
                )
                
                if result.success:
                    # Сохраняем в пул
                    account_id = self.pool.add_account(
                        provider=provider,
                        email=result.email,
                        password=result.password,
                        cookies=result.cookies,
                        credits=result.credits
                    )
                    
                    if account_id:
                        logger.success(f"Registered {provider}: {email}")
                        return result
                
                # Если не успешно, пробуем снова
                await email_service.close()
                await asyncio.sleep(random.uniform(30, 60))
                
            except Exception as e:
                logger.error(f"Registration attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(random.uniform(10, 30))
        
        return RegistrationResult(
            success=False,
            error=f"All {max_attempts} attempts failed",
            provider=provider
        )
    
    async def _register_with_playwright(
        self,
        provider: str,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация через Playwright браузер"""
        
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return RegistrationResult(
                success=False,
                error="Playwright not installed",
                provider=provider
            )
        
        playwright = None
        browser = None
        
        try:
            playwright = await async_playwright().start()
            
            launch_args = [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',
            ]
            
            proxy_config = None
            if self.proxy:
                proxy_config = {
                    'server': f"{self.proxy.get('type', 'http')}://{self.proxy['host']}:{self.proxy['port']}"
                }
                if self.proxy.get('username'):
                    proxy_config['username'] = self.proxy['username']
                if self.proxy.get('password'):
                    proxy_config['password'] = self.proxy['password']
            
            browser = await playwright.chromium.launch(
                headless=self.headless,
                args=launch_args,
                proxy=proxy_config
            )
            
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='Europe/London',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = await context.new_page()
            
            # Регистрация в зависимости от провайдера
            if provider == 'kling':
                result = await self._register_kling(page, email, password, email_service)
            elif provider == 'wan':
                result = await self._register_wan(page, email, password, email_service)
            elif provider == 'digen':
                result = await self._register_digen(page, email, password, email_service)
            elif provider == 'qwen':
                result = await self._register_qwen(page, email, password, email_service)
            elif provider == 'runway':
                result = await self._register_runway(page, email, password, email_service)
            elif provider == 'luma':
                result = await self._register_luma(page, email, password, email_service)
            elif provider == 'pika':
                result = await self._register_pika(page, email, password, email_service)
            elif provider == 'haiper':
                result = await self._register_haiper(page, email, password, email_service)
            elif provider == 'vidu':
                result = await self._register_vidu(page, email, password, email_service)
            else:
                result = RegistrationResult(
                    success=False,
                    error=f"No registration method for {provider}",
                    provider=provider
                )
            
            if result.success:
                # Сохраняем cookies
                cookies = await context.cookies()
                result.cookies = cookies
            
            return result
            
        except Exception as e:
            logger.exception(f"Playwright registration error: {e}")
            return RegistrationResult(
                success=False,
                error=str(e),
                provider=provider
            )
        finally:
            if browser:
                await browser.close()
            if playwright:
                await playwright.stop()
    
    async def _register_kling(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Kling AI"""
        
        try:
            # Переход на страницу регистрации
            await page.goto('https://klingai.com/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            # Поиск полей
            email_input = await page.query_selector('input[type="email"], input[name="email"]')
            if email_input:
                await email_input.fill(email)
                await asyncio.sleep(random.uniform(0.5, 1.5))
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
                await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # Кнопка регистрации
            signup_btn = await page.query_selector('button[type="submit"], button:has-text("Sign up")')
            if signup_btn:
                await signup_btn.click()
            
            logger.info("Submitted Kling registration form")
            
            # Ожидание подтверждения email
            await asyncio.sleep(5)
            
            # Проверяем нужно ли подтверждение
            code_input = await page.query_selector('input[name="code"], input[placeholder*="code"]')
            
            if code_input:
                logger.info("Email verification required")
                
                # Ждём код
                code = await email_service.wait_for_code(timeout=300, code_length=6)
                
                if code:
                    await code_input.fill(code)
                    await asyncio.sleep(1)
                    
                    verify_btn = await page.query_selector('button[type="submit"], button:has-text("Verify")')
                    if verify_btn:
                        await verify_btn.click()
                    else:
                        await page.keyboard.press('Enter')
            
            await asyncio.sleep(5)
            
            # Проверка успешной регистрации
            current_url = page.url
            if 'chat' in current_url or 'dashboard' in current_url or 'create' in current_url:
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=100,  # Стандартные кредиты Kling
                    provider='kling'
                )
            
            # Проверка на ошибки
            error_el = await page.query_selector('.error, .alert-error, [role="alert"]')
            if error_el:
                error_text = await error_el.text_content()
                return RegistrationResult(
                    success=False,
                    error=error_text,
                    provider='kling'
                )
            
            # Если не понятно - считаем успешным
            return RegistrationResult(
                success=True,
                email=email,
                password=password,
                credits=100,
                provider='kling'
            )
            
        except Exception as e:
            logger.error(f"Kling registration error: {e}")
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='kling'
            )
    
    async def _register_wan(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Wan.video"""
        
        try:
            await page.goto('https://wan.video/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            # Поиск полей регистрации
            email_input = await page.query_selector('input[type="email"], input[name="email"]')
            if email_input:
                await email_input.fill(email)
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
            
            signup_btn = await page.query_selector('button[type="submit"], button:has-text("Sign")')
            if signup_btn:
                await signup_btn.click()
            
            await asyncio.sleep(5)
            
            # Проверка верификации
            code_input = await page.query_selector('input[name="code"], input[placeholder*="code"]')
            if code_input:
                code = await email_service.wait_for_code(timeout=300)
                if code:
                    await code_input.fill(code)
                    await page.keyboard.press('Enter')
            
            await asyncio.sleep(5)
            
            current_url = page.url
            if 'login' not in current_url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=30,
                    provider='wan'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed",
                provider='wan'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='wan'
            )
    
    async def _register_digen(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Digen.ai"""
        
        try:
            await page.goto('https://digen.ai/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
            
            signup_btn = await page.query_selector('button[type="submit"]')
            if signup_btn:
                await signup_btn.click()
            
            await asyncio.sleep(5)
            
            # Проверка верификации
            code_input = await page.query_selector('input[name="code"]')
            if code_input:
                code = await email_service.wait_for_code(timeout=300)
                if code:
                    await code_input.fill(code)
                    await page.keyboard.press('Enter')
            
            await asyncio.sleep(3)
            
            if 'login' not in page.url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=25,
                    provider='digen'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed",
                provider='digen'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='digen'
            )
    
    async def _register_qwen(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Qwen AI"""
        
        try:
            await page.goto('https://qwen.ai/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
            
            signup_btn = await page.query_selector('button[type="submit"]')
            if signup_btn:
                await signup_btn.click()
            
            await asyncio.sleep(5)
            
            # Проверка QR кода или верификации
            code_input = await page.query_selector('input[name="code"], input[type="text"]')
            if code_input:
                code = await email_service.wait_for_code(timeout=300)
                if code:
                    await code_input.fill(code)
                    await page.keyboard.press('Enter')
            
            await asyncio.sleep(3)
            
            if 'login' not in page.url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=20,
                    provider='qwen'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed",
                provider='qwen'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='qwen'
            )
    
    async def _register_runway(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Runway"""
        
        try:
            await page.goto('https://runwayml.com/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
            
            signup_btn = await page.query_selector('button[type="submit"]')
            if signup_btn:
                await signup_btn.click()
            
            await asyncio.sleep(5)
            
            code_input = await page.query_selector('input[name="code"]')
            if code_input:
                code = await email_service.wait_for_code(timeout=300)
                if code:
                    await code_input.fill(code)
                    await page.keyboard.press('Enter')
            
            await asyncio.sleep(3)
            
            if 'login' not in page.url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=125,  # Runway даёт 125 кредитов разово
                    provider='runway'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed",
                provider='runway'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='runway'
            )
    
    async def _register_luma(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Luma Dream Machine"""
        
        try:
            await page.goto('https://lumalabs.ai/dream-machine/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            # Luma может требовать Google/Discord авторизацию
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
                
                password_input = await page.query_selector('input[type="password"]')
                if password_input:
                    await password_input.fill(password)
                
                signup_btn = await page.query_selector('button[type="submit"]')
                if signup_btn:
                    await signup_btn.click()
                
                await asyncio.sleep(5)
                
                code_input = await page.query_selector('input[name="code"]')
                if code_input:
                    code = await email_service.wait_for_code(timeout=300)
                    if code:
                        await code_input.fill(code)
                        await page.keyboard.press('Enter')
                
                await asyncio.sleep(3)
            
            if 'login' not in page.url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=30,
                    provider='luma'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed - may require Google/Discord",
                provider='luma'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='luma'
            )
    
    async def _register_pika(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Pika Labs"""
        
        try:
            await page.goto('https://pika.art/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
            
            signup_btn = await page.query_selector('button[type="submit"]')
            if signup_btn:
                await signup_btn.click()
            
            await asyncio.sleep(5)
            
            code_input = await page.query_selector('input[name="code"]')
            if code_input:
                code = await email_service.wait_for_code(timeout=300)
                if code:
                    await code_input.fill(code)
                    await page.keyboard.press('Enter')
            
            await asyncio.sleep(3)
            
            if 'login' not in page.url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=50,
                    provider='pika'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed",
                provider='pika'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='pika'
            )
    
    async def _register_haiper(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Haiper AI"""
        
        try:
            await page.goto('https://haiper.ai/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
            
            signup_btn = await page.query_selector('button[type="submit"]')
            if signup_btn:
                await signup_btn.click()
            
            await asyncio.sleep(5)
            
            code_input = await page.query_selector('input[name="code"]')
            if code_input:
                code = await email_service.wait_for_code(timeout=300)
                if code:
                    await code_input.fill(code)
                    await page.keyboard.press('Enter')
            
            await asyncio.sleep(3)
            
            if 'login' not in page.url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=20,
                    provider='haiper'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed",
                provider='haiper'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='haiper'
            )
    
    async def _register_vidu(
        self,
        page,
        email: str,
        password: str,
        email_service: TempEmailService
    ) -> RegistrationResult:
        """Регистрация на Vidu Studio"""
        
        try:
            await page.goto('https://vidu.studio/signup', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(random.uniform(2, 4))
            
            email_input = await page.query_selector('input[type="email"]')
            if email_input:
                await email_input.fill(email)
            
            password_input = await page.query_selector('input[type="password"]')
            if password_input:
                await password_input.fill(password)
            
            signup_btn = await page.query_selector('button[type="submit"]')
            if signup_btn:
                await signup_btn.click()
            
            await asyncio.sleep(5)
            
            code_input = await page.query_selector('input[name="code"]')
            if code_input:
                code = await email_service.wait_for_code(timeout=300)
                if code:
                    await code_input.fill(code)
                    await page.keyboard.press('Enter')
            
            await asyncio.sleep(3)
            
            if 'login' not in page.url.lower():
                return RegistrationResult(
                    success=True,
                    email=email,
                    password=password,
                    credits=15,
                    provider='vidu'
                )
            
            return RegistrationResult(
                success=False,
                error="Registration not completed",
                provider='vidu'
            )
            
        except Exception as e:
            return RegistrationResult(
                success=False,
                error=str(e),
                provider='vidu'
            )


class AutoRegisterManager:
    """
    Менеджер авто-регистрации.
    Управляет автоматическим созданием аккаунтов при нехватке.
    """
    
    def __init__(
        self,
        pool: AccountPool,
        registrar: AutoRegistrar,
        min_accounts_per_provider: int = 5,
        max_accounts_per_provider: int = 50
    ):
        self.pool = pool
        self.registrar = registrar
        self.min_accounts = min_accounts_per_provider
        self.max_accounts = max_accounts_per_provider
        self._running = False
    
    async def start_monitoring(self, check_interval: int = 300) -> None:
        """Запуск мониторинга и авто-регистрации"""
        self._running = True
        
        while self._running:
            try:
                # Проверка по всем провайдерам
                for provider in AutoRegistrar.PROVIDER_URLS.keys():
                    available = self.pool.get_available_accounts(provider)
                    
                    if len(available) < self.min_accounts:
                        needed = min(
                            self.min_accounts - len(available),
                            self.max_accounts - len(self.pool.get_accounts(provider))
                        )
                        
                        if needed > 0:
                            logger.info(f"Auto-registering {needed} accounts for {provider}")
                            
                            for i in range(needed):
                                result = await self.registrar.register(provider)
                                
                                if not result.success:
                                    logger.error(f"Auto-registration failed: {result.error}")
                                    break
                                
                                await asyncio.sleep(random.uniform(60, 120))
                
            except Exception as e:
                logger.error(f"Auto-register monitoring error: {e}")
            
            await asyncio.sleep(check_interval)
    
    def stop_monitoring(self) -> None:
        """Остановка мониторинга"""
        self._running = False
    
    async def register_batch(
        self,
        provider: str,
        count: int
    ) -> int:
        """Регистрация нескольких аккаунтов для провайдера"""
        registered = 0
        
        for i in range(count):
            current_count = len(self.pool.get_accounts(provider))
            if current_count >= self.max_accounts:
                logger.info(f"Max accounts reached for {provider}")
                break
            
            result = await self.registrar.register(provider)
            
            if result.success:
                registered += 1
                logger.info(f"Registered {registered}/{count} for {provider}")
            
            await asyncio.sleep(random.uniform(30, 60))
        
        return registered
