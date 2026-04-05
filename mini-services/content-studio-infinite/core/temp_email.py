"""
Content Studio Infinite - Temp Email Service
Сервисы для создания временных email для авторегистрации

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import asyncio
import random
import re
import string
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from loguru import logger
import aiohttp


@dataclass
class EmailMessage:
    """Сообщение электронной почты"""
    id: str
    sender: str
    subject: str
    body: str
    html_body: Optional[str] = None
    received_at: datetime = None
    
    def __post_init__(self):
        if self.received_at is None:
            self.received_at = datetime.now()


class TempEmailService(ABC):
    """
    Базовый класс для сервисов временной почты.
    Все сервисы должны наследовать этот класс.
    """
    
    def __init__(self, timeout: int = 300):
        self.timeout = timeout
        self.email: Optional[str] = None
        self.session: Optional[aiohttp.ClientSession] = None
    
    @abstractmethod
    async def create_email(self) -> str:
        """Создать временный email"""
        pass
    
    @abstractmethod
    async def get_messages(self) -> List[EmailMessage]:
        """Получить все сообщения"""
        pass
    
    async def get_message_body(self, message_id: str) -> str:
        """Получить полное тело сообщения"""
        # По умолчанию возвращаем тело из сообщения
        for msg in await self.get_messages():
            if msg.id == message_id:
                return msg.body
        return ""
    
    async def wait_for_message(
        self,
        from_filter: str = None,
        subject_filter: str = None,
        body_filter: str = None,
        timeout: int = None,
        poll_interval: int = 5
    ) -> Optional[EmailMessage]:
        """
        Ожидание сообщения с фильтрами.
        
        Args:
            from_filter: Фильтр по отправителю
            subject_filter: Фильтр по теме
            body_filter: Фильтр по содержимому
            timeout: Таймаут в секундах
            poll_interval: Интервал опроса в секундах
            
        Returns:
            EmailMessage или None если таймаут
        """
        timeout = timeout or self.timeout
        start_time = time.time()
        seen_ids = set()
        
        while time.time() - start_time < timeout:
            try:
                messages = await self.get_messages()
                
                for msg in messages:
                    # Пропускаем уже виденные
                    if msg.id in seen_ids:
                        continue
                    seen_ids.add(msg.id)
                    
                    # Проверяем фильтры
                    if from_filter and from_filter.lower() not in msg.sender.lower():
                        continue
                    if subject_filter and subject_filter.lower() not in msg.subject.lower():
                        continue
                    if body_filter and body_filter.lower() not in msg.body.lower():
                        continue
                    
                    logger.info(f"Found matching email: {msg.subject}")
                    return msg
                
            except Exception as e:
                logger.debug(f"Error checking emails: {e}")
            
            await asyncio.sleep(poll_interval)
        
        logger.warning(f"No matching email received within {timeout}s")
        return None
    
    async def wait_for_code(
        self,
        timeout: int = None,
        code_length: int = 6
    ) -> Optional[str]:
        """
        Ожидание кода подтверждения из email.
        
        Args:
            timeout: Таймаут в секундах
            code_length: Длина ожидаемого кода
            
        Returns:
            Код подтверждения или None
        """
        message = await self.wait_for_message(timeout=timeout)
        
        if not message:
            return None
        
        return self.extract_code(message.body, code_length)
    
    @staticmethod
    def extract_code(text: str, code_length: int = 6) -> Optional[str]:
        """
        Извлечение кода подтверждения из текста.
        
        Поддерживает различные форматы:
        - "код: 123456"
        - "code: 123456"
        - "verification code: 123456"
        - "Your code is 123456"
        - Просто число нужной длины
        """
        # Паттерны для поиска кода
        patterns = [
            rf'код[:\s]+(\d{{{code_length}}})',
            rf'code[:\s]+(\d{{{code_length}}})',
            rf'verification[:\s]+(\d{{{code_length}}})',
            rf'(\d{{{code_length}}})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Пробуем найти любое число нужной длины
        numbers = re.findall(r'\d+', text)
        for num in numbers:
            if len(num) == code_length:
                return num
        
        return None
    
    async def close(self) -> None:
        """Закрыть сессию"""
        if self.session:
            await self.session.close()
            self.session = None


class OneSecMailService(TempEmailService):
    """
    Сервис 1secmail.com (аналог 10minutemail).
    Бесплатный API без авторизации.
    
    API Documentation: https://www.1secmail.com/api/
    """
    
    API_URL = "https://www.1secmail.com/api/v1/"
    DOMAINS = ['1secmail.com', '1secmail.org', '1secmail.net']
    
    def __init__(self, timeout: int = 300):
        super().__init__(timeout)
        self._login: Optional[str] = None
        self._domain: Optional[str] = None
    
    async def create_email(self) -> str:
        """Создать временный email"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        # Генерируем логин
        self._login = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
        self._domain = random.choice(self.DOMAINS)
        
        self.email = f"{self._login}@{self._domain}"
        logger.debug(f"Created temp email: {self.email}")
        return self.email
    
    async def get_messages(self) -> List[EmailMessage]:
        """Получить все сообщения"""
        if not self._login or not self._domain or not self.session:
            return []
        
        try:
            async with self.session.get(
                self.API_URL,
                params={
                    'action': 'getMessages',
                    'login': self._login,
                    'domain': self._domain
                }
            ) as resp:
                if resp.status != 200:
                    return []
                
                data = await resp.json()
                messages = []
                
                for item in data:
                    # Получаем полное тело сообщения
                    body = await self._fetch_body(item.get('id'))
                    
                    msg = EmailMessage(
                        id=str(item.get('id', '')),
                        sender=item.get('from', ''),
                        subject=item.get('subject', ''),
                        body=body or item.get('body', ''),
                        html_body=item.get('htmlBody'),
                    )
                    messages.append(msg)
                
                return messages
                
        except Exception as e:
            logger.debug(f"1secmail get messages error: {e}")
            return []
    
    async def _fetch_body(self, message_id: int) -> str:
        """Получить тело сообщения"""
        if not self._login or not self._domain:
            return ""
        
        try:
            async with self.session.get(
                self.API_URL,
                params={
                    'action': 'readMessage',
                    'login': self._login,
                    'domain': self._domain,
                    'id': message_id
                }
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get('body', '') or data.get('textBody', '')
        except:
            pass
        
        return ""


class GuerrillaMailService(TempEmailService):
    """
    Сервис guerrillamail.com.
    Бесплатный API с поддержкой смены email.
    
    API Documentation: https://www.guerrillamail.com/GuerrillaMailAPI.html
    """
    
    API_URL = "https://api.guerrillamail.com/ajax.php"
    
    def __init__(self, timeout: int = 300):
        super().__init__(timeout)
        self._sid_token: Optional[str] = None
    
    async def create_email(self) -> str:
        """Создать временный email"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        params = {'f': 'get_email_address'}
        
        try:
            async with self.session.get(self.API_URL, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.email = data.get('email_addr', '')
                    self._sid_token = data.get('sid_token', '')
                    logger.debug(f"Created guerrilla email: {self.email}")
                    return self.email
        except Exception as e:
            logger.error(f"Guerrilla mail create error: {e}")
        
        # Fallback - генерируем случайный email
        username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        self.email = f"{username}@guerrillamail.com"
        return self.email
    
    async def get_messages(self) -> List[EmailMessage]:
        """Получить все сообщения"""
        if not self.email or not self.session:
            return []
        
        params = {
            'f': 'get_email_list',
            'offset': 0,
            'sid_token': self._sid_token
        }
        
        try:
            async with self.session.get(self.API_URL, params=params) as resp:
                if resp.status != 200:
                    return []
                
                data = await resp.json()
                messages = []
                
                for item in data.get('list', []):
                    msg = EmailMessage(
                        id=str(item.get('mail_id', '')),
                        sender=item.get('mail_from', ''),
                        subject=item.get('mail_subject', ''),
                        body=item.get('mail_excerpt', ''),
                    )
                    messages.append(msg)
                
                return messages
                
        except Exception as e:
            logger.debug(f"Guerrilla get messages error: {e}")
            return []
    
    async def get_message_body(self, message_id: str) -> str:
        """Получить полное тело сообщения"""
        params = {
            'f': 'fetch_email',
            'email_id': message_id,
            'sid_token': self._sid_token
        }
        
        try:
            async with self.session.get(self.API_URL, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get('mail_body', '')
        except Exception as e:
            logger.debug(f"Guerrilla fetch body error: {e}")
        
        return ""


class TempMailOrgService(TempEmailService):
    """
    Сервис temp-mail.org.
    API с поддержкой доменов на выбор.
    
    API Documentation: https://temp-mail.org/en/api/
    """
    
    API_URL = "https://api.temp-mail.org"
    
    def __init__(self, timeout: int = 300):
        super().__init__(timeout)
        self._token: Optional[str] = None
    
    async def create_email(self) -> str:
        """Создать временный email"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            # Получаем список доменов
            async with self.session.get(f"{self.API_URL}/request/domains/") as resp:
                domains = []
                if resp.status == 200:
                    data = await resp.json()
                    domains = [d.get('name') for d in data if d.get('name')]
                
                if not domains:
                    domains = ['tempmail.org', 'temp-mail.org']
            
            # Генерируем email
            username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
            domain = random.choice(domains)
            
            self.email = f"{username}@{domain}"
            logger.debug(f"Created temp-mail.org email: {self.email}")
            return self.email
            
        except Exception as e:
            logger.error(f"TempMail.org create error: {e}")
            # Fallback
            username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
            self.email = f"{username}@tempmail.org"
            return self.email
    
    async def get_messages(self) -> List[EmailMessage]:
        """Получить все сообщения"""
        if not self.email or not self.session:
            return []
        
        try:
            # Используем хеш email для API
            import hashlib
            email_hash = hashlib.md5(self.email.encode()).hexdigest()
            
            async with self.session.get(
                f"{self.API_URL}/request/mail/id/{email_hash}/"
            ) as resp:
                if resp.status != 200:
                    return []
                
                data = await resp.json()
                messages = []
                
                for item in data:
                    msg = EmailMessage(
                        id=str(item.get('mail_id', '')),
                        sender=item.get('mail_from', ''),
                        subject=item.get('mail_subject', ''),
                        body=item.get('mail_text', ''),
                    )
                    messages.append(msg)
                
                return messages
                
        except Exception as e:
            logger.debug(f"TempMail.org get messages error: {e}")
            return []


class MailTMService(TempEmailService):
    """
    Сервис mail.tm.
    Современный API с GraphQL.
    
    API Documentation: https://api.mail.tm/
    """
    
    API_URL = "https://api.mail.tm"
    
    def __init__(self, timeout: int = 300):
        super().__init__(timeout)
        self._token: Optional[str] = None
        self._account_id: Optional[str] = None
    
    async def create_email(self) -> str:
        """Создать временный email"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            # Получаем домены
            async with self.session.get(f"{self.API_URL}/domains") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    domains = [d.get('domain') for d in data.get('hydra:member', []) if d.get('domain')]
                else:
                    domains = ['mail.tm']
            
            # Генерируем данные
            username = ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
            domain = random.choice(domains) if domains else 'mail.tm'
            email = f"{username}@{domain}"
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
            
            # Создаем аккаунт
            async with self.session.post(
                f"{self.API_URL}/accounts",
                json={
                    'address': email,
                    'password': password
                }
            ) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    self._account_id = data.get('id')
                    self.email = email
                    self._password = password
                    
                    # Получаем токен
                    async with self.session.post(
                        f"{self.API_URL}/token",
                        json={
                            'address': email,
                            'password': password
                        }
                    ) as token_resp:
                        if token_resp.status == 200:
                            token_data = await token_resp.json()
                            self._token = token_data.get('token')
                    
                    logger.debug(f"Created mail.tm email: {self.email}")
                    return self.email
            
        except Exception as e:
            logger.error(f"Mail.tm create error: {e}")
        
        # Fallback на другой сервис
        fallback = OneSecMailService()
        return await fallback.create_email()
    
    async def get_messages(self) -> List[EmailMessage]:
        """Получить все сообщения"""
        if not self._token or not self.session:
            return []
        
        try:
            async with self.session.get(
                f"{self.API_URL}/messages",
                headers={'Authorization': f'Bearer {self._token}'}
            ) as resp:
                if resp.status != 200:
                    return []
                
                data = await resp.json()
                messages = []
                
                for item in data.get('hydra:member', []):
                    msg = EmailMessage(
                        id=item.get('id', ''),
                        sender=item.get('from', {}).get('address', ''),
                        subject=item.get('subject', ''),
                        body=item.get('intro', ''),
                    )
                    messages.append(msg)
                
                return messages
                
        except Exception as e:
            logger.debug(f"Mail.tm get messages error: {e}")
            return []


class TempEmailManager:
    """
    Менеджер временных email.
    Управляет несколькими сервисами и выбирает рабочий.
    """
    
    def __init__(self, services: List[str] = None):
        """
        Args:
            services: Список сервисов для использования.
                     Порядок = приоритет.
        """
        self.service_names = services or ['1secmail', 'guerrilla', 'mailtm', 'tempmail']
        self._services = {
            '1secmail': OneSecMailService,
            'guerrilla': GuerrillaMailService,
            'mailtm': MailTMService,
            'tempmail': TempMailOrgService,
        }
    
    async def create_email(self, prefer: str = None) -> tuple:
        """
        Создать временный email.
        
        Args:
            prefer: Предпочитаемый сервис
            
        Returns:
            tuple (email, service_instance)
        """
        # Пробуем предпочитаемый сервис первым
        services_to_try = list(self.service_names)
        if prefer and prefer in services_to_try:
            services_to_try.remove(prefer)
            services_to_try.insert(0, prefer)
        
        for service_name in services_to_try:
            service_class = self._services.get(service_name)
            if not service_class:
                continue
            
            try:
                service = service_class()
                email = await service.create_email()
                if email:
                    return email, service
            except Exception as e:
                logger.debug(f"Service {service_name} failed: {e}")
                continue
        
        raise Exception("All temp email services failed")
    
    async def close_all(self):
        """Закрыть все сессии (если нужно)"""
        pass
