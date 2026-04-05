"""
DeepSeek Auto-Registration Module
Автоматическая регистрация аккаунтов через временную почту

МУКН | Трафик - Enterprise AI-powered Telegram Automation Platform
"""

import asyncio
import random
import re
import string
import time
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from loguru import logger
import aiohttp

# Playwright imports
try:
    from playwright.async_api import Page, Browser, BrowserContext
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


@dataclass
class TempMailMessage:
    """Сообщение временной почты"""
    id: str
    sender: str
    subject: str
    body: str
    received_at: datetime


class TempMailService:
    """
    Базовый класс для сервисов временной почты.
    """
    
    def __init__(self, timeout: int = 300):
        self.timeout = timeout
        self.email: Optional[str] = None
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def create_email(self) -> str:
        """Создать временный email"""
        raise NotImplementedError
    
    async def get_messages(self) -> List[TempMailMessage]:
        """Получить все сообщения"""
        raise NotImplementedError
    
    async def wait_for_message(
        self,
        from_filter: str = None,
        subject_filter: str = None,
        timeout: int = None
    ) -> Optional[TempMailMessage]:
        """Ожидание сообщения с фильтрами"""
        timeout = timeout or self.timeout
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            messages = await self.get_messages()
            
            for msg in messages:
                if from_filter and from_filter.lower() not in msg.sender.lower():
                    continue
                if subject_filter and subject_filter.lower() not in msg.subject.lower():
                    continue
                return msg
            
            await asyncio.sleep(5)
        
        return None
    
    async def close(self) -> None:
        """Закрыть сессию"""
        if self.session:
            await self.session.close()


class TempMailOrgService(TempMailService):
    """
    Сервис temp-mail.org
    API Documentation: https://temp-mail.org/en/api/
    """
    
    API_URL = "https://api.temp-mail.org"
    
    async def create_email(self) -> str:
        """Создать временный email"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        # Получаем список доменов
        async with self.session.get(f"{self.API_URL}/request/domains/") as resp:
            if resp.status == 200:
                data = await resp.json()
                domains = [d.get('name') for d in data if d.get('name')]
            else:
                # Fallback домены
                domains = ['tempmail.org', 'temp-mail.org']
        
        # Генерируем случайное имя
        username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        domain = random.choice(domains) if domains else 'tempmail.org'
        
        self.email = f"{username}@{domain}"
        return self.email
    
    async def get_messages(self) -> List[TempMailMessage]:
        """Получить все сообщения"""
        if not self.email or not self.session:
            return []
        
        try:
            async with self.session.get(
                f"{self.API_URL}/request/mail/id/{self.email}/"
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    messages = []
                    
                    for item in data:
                        msg = TempMailMessage(
                            id=str(item.get('mail_id', '')),
                            sender=item.get('mail_from', ''),
                            subject=item.get('mail_subject', ''),
                            body=item.get('mail_text', ''),
                            received_at=datetime.now()
                        )
                        messages.append(msg)
                    
                    return messages
        except Exception as e:
            logger.error(f"TempMail API error: {e}")
        
        return []


class GuerrillaMailService(TempMailService):
    """
    Сервис guerrillamail.com
    API Documentation: https://www.guerrillamail.com/GuerrillaMailAPI.html
    """
    
    API_URL = "https://api.guerrillamail.com/ajax.php"
    
    async def create_email(self) -> str:
        """Создать временный email"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        params = {'f': 'get_email_address'}
        
        async with self.session.get(self.API_URL, params=params) as resp:
            if resp.status == 200:
                data = await resp.json()
                self.email = data.get('email_addr', '')
                return self.email
        
        # Fallback
        username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        self.email = f"{username}@guerrillamail.com"
        return self.email
    
    async def get_messages(self) -> List[TempMailMessage]:
        """Получить все сообщения"""
        if not self.email or not self.session:
            return []
        
        params = {'f': 'get_email_list', 'offset': 0}
        
        try:
            async with self.session.get(self.API_URL, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    messages = []
                    
                    for item in data.get('list', []):
                        msg = TempMailMessage(
                            id=str(item.get('mail_id', '')),
                            sender=item.get('mail_from', ''),
                            subject=item.get('mail_subject', ''),
                            body=item.get('mail_excerpt', ''),
                            received_at=datetime.now()
                        )
                        messages.append(msg)
                    
                    return messages
        except Exception as e:
            logger.error(f"GuerrillaMail API error: {e}")
        
        return []
    
    async def get_message_body(self, message_id: str) -> str:
        """Получить полное тело сообщения"""
        params = {'f': 'fetch_email', 'email_id': message_id}
        
        try:
            async with self.session.get(self.API_URL, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get('mail_body', '')
        except Exception as e:
            logger.error(f"GuerrillaMail fetch error: {e}")
        
        return ''


class OneMinuteMailService(TempMailService):
    """
    Сервис 1secmail.com (аналог 10minutemail)
    API Documentation: https://www.1secmail.com/api/
    """
    
    API_URL = "https://www.1secmail.com/api/v1/"
    DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net']
    
    async def create_email(self) -> str:
        """Создать временный email"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        # Генерируем логин
        login = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        domain = random.choice(self.DOMAINS)
        
        self.email = f"{login}@{domain}"
        return self.email
    
    async def get_messages(self) -> List[TempMailMessage]:
        """Получить все сообщения"""
        if not self.email or not self.session:
            return []
        
        login, domain = self.email.split('@')
        
        try:
            async with self.session.get(
                f"{self.API_URL}",
                params={'action': 'getMessages', 'login': login, 'domain': domain}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    messages = []
                    
                    for item in data:
                        msg = TempMailMessage(
                            id=str(item.get('id', '')),
                            sender=item.get('from', ''),
                            subject=item.get('subject', ''),
                            body=item.get('body', '') or await self._get_body(login, domain, item.get('id')),
                            received_at=datetime.now()
                        )
                        messages.append(msg)
                    
                    return messages
        except Exception as e:
            logger.error(f"1secmail API error: {e}")
        
        return []
    
    async def _get_body(self, login: str, domain: str, message_id: str) -> str:
        """Получить тело сообщения"""
        try:
            async with self.session.get(
                f"{self.API_URL}",
                params={
                    'action': 'readMessage',
                    'login': login,
                    'domain': domain,
                    'id': message_id
                }
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get('body', '') or data.get('textBody', '')
        except:
            pass
        
        return ''


class DeepSeekAutoRegister:
    """
    Автоматическая регистрация аккаунтов DeepSeek.
    
    Features:
    - Создание временной почты
    - Регистрация на DeepSeek
    - Подтверждение email
    - Сохранение credentials
    """
    
    DEEPSEEK_SIGNUP_URL = "https://chat.deepseek.com/signup"
    DEEPSEEK_LOGIN_URL = "https://chat.deepseek.com/login"
    
    def __init__(
        self,
        temp_mail_service: str = "1secmail",
        headless: bool = True,
        proxy: Dict = None
    ):
        self.headless = headless
        self.proxy = proxy
        self.mail_service: Optional[TempMailService] = None
        
        # Выбор сервиса временной почты
        if temp_mail_service == "temp-mail.org":
            self.mail_service = TempMailOrgService()
        elif temp_mail_service == "guerrilla":
            self.mail_service = GuerrillaMailService()
        else:
            self.mail_service = OneMinuteMailService()
    
    async def generate_password(self, length: int = 16) -> str:
        """Генерация случайного пароля"""
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(random.choices(chars, k=length))
        # Убедимся, что есть разные типы символов
        if not any(c.isupper() for c in password):
            password = random.choice(string.ascii_uppercase) + password[1:]
        if not any(c.islower() for c in password):
            password = password[:-1] + random.choice(string.ascii_lowercase)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + random.choice(string.digits)
        return password
    
    async def create_temp_email(self) -> str:
        """Создание временной почты"""
        return await self.mail_service.create_email()
    
    async def register_account(
        self,
        browser = None,
        max_attempts: int = 3
    ) -> Optional[Dict[str, Any]]:
        """
        Регистрация нового аккаунта DeepSeek.
        
        Returns:
            Dict с email, password, status или None при ошибке
        """
        from playwright.async_api import async_playwright
        
        for attempt in range(max_attempts):
            logger.info(f"Registration attempt {attempt + 1}/{max_attempts}")
            
            try:
                # Создаём временную почту
                temp_email = await self.create_temp_email()
                password = await self.generate_password()
                
                logger.info(f"Created temp email: {temp_email}")
                
                # Инициализация браузера
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
                    locale='ru-RU',
                    timezone_id='Europe/Moscow',
                )
                
                page = await context.new_page()
                
                try:
                    # Навигация на страницу регистрации
                    await page.goto(self.DEEPSEEK_SIGNUP_URL, wait_until='networkidle', timeout=30000)
                    await asyncio.sleep(random.uniform(2, 4))
                    
                    # Поиск полей регистрации
                    email_input = None
                    for selector in [
                        'input[type="email"]',
                        'input[name="email"]',
                        'input[placeholder*="email"]',
                    ]:
                        try:
                            email_input = await page.wait_for_selector(selector, timeout=5000)
                            if email_input:
                                break
                        except:
                            continue
                    
                    if not email_input:
                        logger.warning("Email input not found, trying login page")
                        await page.goto(self.DEEPSEEK_LOGIN_URL, wait_until='networkidle')
                        await asyncio.sleep(2)
                        
                        # Ищем ссылку на регистрацию
                        signup_link = await page.query_selector('a:has-text("Sign up"), a:has-text("Регистрация")')
                        if signup_link:
                            await signup_link.click()
                            await asyncio.sleep(2)
                        
                        # Пробуем снова найти поле email
                        for selector in ['input[type="email"]', 'input[name="email"]']:
                            try:
                                email_input = await page.wait_for_selector(selector, timeout=3000)
                                if email_input:
                                    break
                            except:
                                continue
                    
                    if not email_input:
                        logger.error("Could not find email input")
                        continue
                    
                    # Заполнение формы
                    await email_input.fill(temp_email)
                    await asyncio.sleep(random.uniform(0.5, 1.5))
                    
                    # Поиск поля пароля
                    password_input = None
                    for selector in [
                        'input[type="password"]',
                        'input[name="password"]',
                    ]:
                        try:
                            password_input = await page.wait_for_selector(selector, timeout=3000)
                            if password_input:
                                break
                        except:
                            continue
                    
                    if password_input:
                        await password_input.fill(password)
                        await asyncio.sleep(random.uniform(0.5, 1.5))
                    
                    # Поиск кнопки регистрации
                    signup_btn = None
                    for selector in [
                        'button[type="submit"]',
                        'button:has-text("Sign up")',
                        'button:has-text("Зарегистрироваться")',
                        'button:has-text("Continue")',
                    ]:
                        try:
                            signup_btn = await page.query_selector(selector)
                            if signup_btn:
                                break
                        except:
                            continue
                    
                    if signup_btn:
                        await signup_btn.click()
                    else:
                        await page.keyboard.press('Enter')
                    
                    logger.info("Submitted registration form")
                    
                    # Ожидание подтверждения email
                    await asyncio.sleep(5)
                    
                    # Проверяем, нужно ли подтверждение email
                    verification_required = await page.query_selector('text=verification, text=confirm, text=verify')
                    
                    if verification_required:
                        logger.info("Email verification required, waiting for code...")
                        
                        # Ожидание письма с кодом
                        message = await self.mail_service.wait_for_message(
                            from_filter='deepseek',
                            subject_filter='verification',
                            timeout=300
                        )
                        
                        if message:
                            logger.info(f"Received email: {message.subject}")
                            
                            # Извлечение кода из письма
                            code = self._extract_verification_code(message.body)
                            
                            if code:
                                # Ввод кода
                                code_input = None
                                for selector in [
                                    'input[type="text"]',
                                    'input[name="code"]',
                                    'input[placeholder*="code"]',
                                ]:
                                    try:
                                        code_input = await page.wait_for_selector(selector, timeout=3000)
                                        if code_input:
                                            break
                                    except:
                                        continue
                                
                                if code_input:
                                    await code_input.fill(code)
                                    await asyncio.sleep(1)
                                    
                                    # Подтверждение
                                    confirm_btn = await page.query_selector('button[type="submit"]')
                                    if confirm_btn:
                                        await confirm_btn.click()
                    
                    # Проверка успешной регистрации
                    await asyncio.sleep(5)
                    current_url = page.url
                    
                    if 'chat' in current_url or 'chat.deepseek.com' in current_url:
                        logger.info(f"Registration successful: {temp_email}")
                        
                        return {
                            'email': temp_email,
                            'password': password,
                            'status': 'active',
                            'created_at': datetime.now().isoformat()
                        }
                    
                    # Проверка на ошибки
                    error_el = await page.query_selector('.error, .alert-error, [role="alert"]')
                    if error_el:
                        error_text = await error_el.text_content()
                        logger.error(f"Registration error: {error_text}")
                    
                finally:
                    await browser.close()
                    await playwright.stop()
                
            except Exception as e:
                logger.error(f"Registration attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(5)
        
        return None
    
    def _extract_verification_code(self, text: str) -> Optional[str]:
        """Извлечение кода подтверждения из текста"""
        # Ищем 4-6 значный код
        patterns = [
            r'код[:\s]+(\d{4,6})',
            r'code[:\s]+(\d{4,6})',
            r'(\d{6})',
            r'(\d{4})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None


class AutoRegisterManager:
    """
    Менеджер авто-регистрации аккаунтов.
    Управляет созданием новых аккаунтов при необходимости.
    """
    
    def __init__(
        self,
        pool,
        min_accounts: int = 5,
        max_accounts: int = 50,
        headless: bool = True
    ):
        self.pool = pool
        self.min_accounts = min_accounts
        self.max_accounts = max_accounts
        self.headless = headless
        self._running = False
    
    async def start_monitoring(self, check_interval: int = 300) -> None:
        """Запуск мониторинга и авто-регистрации"""
        self._running = True
        
        while self._running:
            try:
                # Проверка количества активных аккаунтов
                active_count = len(self.pool.get_available_accounts())
                
                if active_count < self.min_accounts:
                    needed = self.min_accounts - active_count
                    logger.info(f"Auto-registering {needed} new accounts")
                    
                    await self.register_batch(needed)
                
            except Exception as e:
                logger.error(f"Auto-register monitoring error: {e}")
            
            await asyncio.sleep(check_interval)
    
    async def stop_monitoring(self) -> None:
        """Остановка мониторинга"""
        self._running = False
    
    async def register_batch(self, count: int) -> int:
        """Регистрация нескольких аккаунтов"""
        registered = 0
        
        for i in range(count):
            if len(self.pool.accounts) >= self.max_accounts:
                logger.info("Max accounts limit reached")
                break
            
            auto_reg = DeepSeekAutoRegister(headless=self.headless)
            result = await auto_reg.register_account()
            
            if result:
                # Добавление в пул
                account_id = self.pool.add_account(
                    email=result['email'],
                    password=result['password']
                )
                
                if account_id:
                    registered += 1
                    logger.info(f"Auto-registered account {registered}/{count}: {result['email']}")
            
            # Задержка между регистрациями
            await asyncio.sleep(random.uniform(30, 60))
        
        return registered
    
    async def close(self) -> None:
        """Закрытие ресурсов"""
        self._running = False
