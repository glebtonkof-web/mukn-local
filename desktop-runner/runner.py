#!/usr/bin/env python3
"""
МУКН | Трафик - Desktop Runner
Десктопный раннер для выполнения задач через ADB и Telethon

Функции:
- Регистрация Telegram аккаунтов через ADB с SIM-картами
- Автоматический ввод SMS-кодов
- Установка 2FA
- Создание каналов
- Публикация контента (текст, изображения, видео)
- Вступление в каналы
- Прогрев аккаунтов (multi-day sequence)
- Импорт контактов
- Отправка реакций
- Просмотр stories
- Пересылка сообщений
- Интеграция с Dolphin Anty
- Прокси поддержка (SOCKS5, HTTP)

Автор: AI Assistant
Версия: 2.0.0
"""

import asyncio
import aiofiles
import json
import logging
import os
import random
import re
import sys
import time
import traceback
import hashlib
import base64
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Callable
from urllib.parse import urlparse

import aiohttp
import backoff

# ==================== LOGGING SETUP ====================

class DailyFileHandler(logging.FileHandler):
    """File handler that creates new log file each day"""
    
    def __init__(self, logs_dir: str, prefix: str = 'runner'):
        self.logs_dir = Path(logs_dir)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.prefix = prefix
        self.current_date = None
        super().__init__(self._get_log_file(), encoding='utf-8')
    
    def _get_log_file(self) -> str:
        today = datetime.now().strftime('%Y-%m-%d')
        return str(self.logs_dir / f"{self.prefix}_{today}.log")
    
    def emit(self, record):
        today = datetime.now().strftime('%Y-%m-%d')
        if today != self.current_date:
            self.current_date = today
            self.close()
            self.baseFilename = self._get_log_file()
            self.stream = open(self.baseFilename, 'a', encoding='utf-8')
        super().emit(record)


def setup_logging(config: 'Config') -> logging.Logger:
    """Setup comprehensive logging system"""
    logger = logging.getLogger('MUKNRunner')
    logger.setLevel(logging.DEBUG)
    
    # Console handler with colors
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)
    
    # Daily file handler for all logs
    file_handler = DailyFileHandler(config.logs_dir, 'runner')
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        '%(asctime)s [%(levelname)s] [%(filename)s:%(lineno)d] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_format)
    
    # Actions log handler (separate file for actions)
    actions_handler = DailyFileHandler(config.logs_dir, 'actions')
    actions_handler.setLevel(logging.INFO)
    actions_handler.setFormatter(file_format)
    
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    logger.addHandler(actions_handler)
    
    return logger


# ==================== CONFIGURATION ====================

@dataclass
class Config:
    """Конфигурация раннера"""
    # API endpoint веб-сервера
    api_base: str = os.getenv('API_BASE', 'http://localhost:3000')
    
    # Telegram API credentials
    api_id: int = int(os.getenv('TELEGRAM_API_ID', '0'))
    api_hash: str = os.getenv('TELEGRAM_API_HASH', '')
    
    # ADB настройки
    adb_host: str = os.getenv('ADB_HOST', '127.0.0.1')
    adb_port: int = int(os.getenv('ADB_PORT', '5037'))
    
    # Dolphin Anty API
    dolphin_api_url: str = os.getenv('DOLPHIN_API_URL', 'http://local-api.anty-api.com')
    dolphin_api_key: str = os.getenv('DOLPHIN_API_KEY', '')
    
    # Настройки раннера
    poll_interval: int = 5
    max_concurrent_tasks: int = 3
    runner_id: str = os.getenv('RUNNER_ID', 'runner-1')
    
    # Retry настройки
    max_retries: int = 5
    retry_delay: float = 1.0
    retry_multiplier: float = 2.0
    
    # Пути
    sessions_dir: str = 'sessions'
    logs_dir: str = 'logs'
    media_dir: str = 'media'
    
    # Прогрев настройки (по умолчанию)
    warm_settings: Dict[str, Any] = field(default_factory=lambda: {
        'day1': {
            'set_profile': True,
            'join_channels': 3,
            'delay_range': (60, 180),
        },
        'day2': {
            'read_messages': True,
            'view_stories': True,
            'join_channels': 2,
            'delay_range': (45, 150),
        },
        'day3': {
            'send_reactions': 3,
            'view_content': True,
            'delay_range': (30, 120),
        },
        'day4': {
            'send_reactions': 5,
            'read_messages': True,
            'join_channels': 1,
            'delay_range': (20, 90),
        },
        'day5': {
            'send_reactions': 7,
            'view_stories': True,
            'delay_range': (15, 60),
        },
        'day6': {
            'send_reactions': 10,
            'join_channels': 2,
            'delay_range': (10, 45),
        },
        'day7': {
            'send_reactions': 15,
            'view_stories': True,
            'read_messages': True,
            'delay_range': (5, 30),
        },
    })


class TaskType(Enum):
    """Типы задач"""
    REGISTER_ACCOUNT = 'register_account'
    VERIFY_SMS = 'verify_sms'
    SETUP_2FA = 'setup_2fa'
    CREATE_CHANNEL = 'create_channel'
    SEND_MESSAGE = 'send_message'
    POST_CONTENT = 'post_content'
    JOIN_CHANNEL = 'join_channel'
    WARM_ACCOUNT = 'warm_account'
    IMPORT_CONTACTS = 'import_contacts'
    SEND_REACTION = 'send_reaction'
    VIEW_STORIES = 'view_stories'
    FORWARD_MESSAGE = 'forward_message'


class TaskStatus(Enum):
    """Статусы задач"""
    PENDING = 'pending'
    EXECUTING = 'executing'
    COMPLETED = 'completed'
    FAILED = 'failed'


# ==================== EXCEPTIONS ====================

class RunnerException(Exception):
    """Базовое исключение раннера"""
    pass


class ADBException(RunnerException):
    """Ошибка ADB"""
    pass


class TelegramException(RunnerException):
    """Ошибка Telegram"""
    pass


class SMSException(RunnerException):
    """Ошибка получения SMS"""
    pass


class APIException(RunnerException):
    """Ошибка API"""
    pass


class ProxyException(RunnerException):
    """Ошибка прокси"""
    pass


class AntidetectException(RunnerException):
    """Ошибка антидетекта"""
    pass


class FloodException(RunnerException):
    """Flood wait exception"""
    def __init__(self, wait_time: int, *args):
        self.wait_time = wait_time
        super().__init__(f"Flood wait required: {wait_time} seconds", *args)


# ==================== PROXY MANAGER ====================

@dataclass
class ProxyInfo:
    """Информация о прокси"""
    id: str
    host: str
    port: int
    protocol: str  # 'socks5', 'http', 'https'
    username: Optional[str] = None
    password: Optional[str] = None
    last_used: Optional[datetime] = None
    success_count: int = 0
    fail_count: int = 0
    is_active: bool = True
    
    def to_telethon_proxy(self) -> Dict[str, Any]:
        """Конвертация в формат Telethon"""
        if self.protocol == 'socks5':
            return {
                'proxy_type': 'socks5',
                'addr': self.host,
                'port': self.port,
                'username': self.username,
                'password': self.password,
                'rdns': True,
            }
        else:  # http/https
            return {
                'proxy_type': 'http',
                'addr': self.host,
                'port': self.port,
                'username': self.username,
                'password': self.password,
            }
    
    def to_aiohttp_proxy(self) -> str:
        """Конвертация в формат aiohttp"""
        auth = f"{self.username}:{self.password}@" if self.username else ""
        return f"{self.protocol}://{auth}{self.host}:{self.port}"


class ProxyManager:
    """
    Менеджер прокси
    Поддержка SOCKS5, HTTP прокси
    Тестирование и ротация прокси
    """
    
    def __init__(self, config: Config, session: aiohttp.ClientSession):
        self.config = config
        self.session = session
        self.proxies: List[ProxyInfo] = []
        self.account_proxies: Dict[str, ProxyInfo] = {}  # account_id -> proxy
        self._lock = asyncio.Lock()
    
    async def load_proxies_from_api(self) -> None:
        """Загрузка списка прокси из API"""
        try:
            url = f"{self.config.api_base}/api/proxies"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    proxies = data.get('proxies', [])
                    
                    async with self._lock:
                        self.proxies = []
                        for p in proxies:
                            proxy = ProxyInfo(
                                id=p['id'],
                                host=p['host'],
                                port=p['port'],
                                protocol=p.get('protocol', 'socks5'),
                                username=p.get('username'),
                                password=p.get('password'),
                                is_active=p.get('is_active', True),
                            )
                            self.proxies.append(proxy)
                    
                    logger.info(f"Loaded {len(self.proxies)} proxies from API")
        except Exception as e:
            logger.error(f"Failed to load proxies from API: {e}")
    
    async def test_proxy(self, proxy: ProxyInfo, timeout: int = 10) -> bool:
        """Тестирование соединения через прокси"""
        test_urls = [
            'http://ip-api.com/json/',
            'https://api.ipify.org?format=json',
        ]
        
        try:
            proxy_url = proxy.to_aiohttp_proxy()
            connector = aiohttp.TCPConnector()
            
            async with aiohttp.ClientSession(connector=connector) as test_session:
                async with test_session.get(
                    test_urls[0],
                    proxy=proxy_url if proxy.protocol != 'socks5' else None,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"Proxy {proxy.host}:{proxy.port} works. IP: {data.get('query', 'unknown')}")
                        return True
        except Exception as e:
            logger.warning(f"Proxy {proxy.host}:{proxy.port} test failed: {e}")
        
        return False
    
    async def get_proxy_for_account(self, account_id: str) -> Optional[ProxyInfo]:
        """Получение прокси для аккаунта (с ротацией)"""
        async with self._lock:
            # Если уже назначен прокси
            if account_id in self.account_proxies:
                return self.account_proxies[account_id]
            
            # Ищем наименее загруженный активный прокси
            active_proxies = [p for p in self.proxies if p.is_active]
            if not active_proxies:
                await self.load_proxies_from_api()
                active_proxies = [p for p in self.proxies if p.is_active]
            
            if not active_proxies:
                logger.warning("No active proxies available")
                return None
            
            # Сортируем по количеству использований
            active_proxies.sort(key=lambda p: p.success_count + p.fail_count)
            
            # Тестируем прокси перед назначением
            for proxy in active_proxies[:3]:  # Тестируем топ-3
                if await self.test_proxy(proxy):
                    proxy.success_count += 1
                    self.account_proxies[account_id] = proxy
                    return proxy
                else:
                    proxy.fail_count += 1
            
            return None
    
    async def report_proxy_status(self, proxy_id: str, success: bool) -> None:
        """Отчёт о статусе использования прокси"""
        try:
            url = f"{self.config.api_base}/api/proxies/{proxy_id}/status"
            async with self.session.post(url, json={'success': success}) as response:
                if response.status != 200:
                    logger.warning(f"Failed to report proxy status: {response.status}")
        except Exception as e:
            logger.error(f"Error reporting proxy status: {e}")
    
    async def rotate_proxy_for_account(self, account_id: str) -> Optional[ProxyInfo]:
        """Ротация прокси для аккаунта"""
        async with self._lock:
            if account_id in self.account_proxies:
                old_proxy = self.account_proxies[account_id]
                old_proxy.fail_count += 1
                del self.account_proxies[account_id]
        
        return await self.get_proxy_for_account(account_id)


# ==================== ANTIDETECT MANAGER ====================

@dataclass
class BrowserProfile:
    """Профиль браузера"""
    id: str
    account_id: str
    name: str
    os: str  # 'windows', 'macos', 'linux'
    browser: str  # 'chrome', 'firefox'
    useragent: str
    proxy_id: Optional[str] = None
    cookies: List[Dict] = field(default_factory=list)
    fingerprint: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    last_used: Optional[datetime] = None


class AntidetectManager:
    """
    Менеджер для работы с Dolphin Anty
    Создание и управление браузерными профилями
    """
    
    def __init__(self, config: Config, session: aiohttp.ClientSession):
        self.config = config
        self.session = session
        self.profiles: Dict[str, BrowserProfile] = {}
        self._base_url = config.dolphin_api_url
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Выполнение запроса к Dolphin Anty API"""
        url = f"{self._base_url}{endpoint}"
        headers = {}
        
        if self.config.dolphin_api_key:
            headers['Authorization'] = f"Bearer {self.config.dolphin_api_key}"
        
        try:
            async with self.session.request(
                method,
                url,
                json=data,
                params=params,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                result = await response.json()
                
                if response.status >= 400:
                    raise AntidetectException(f"Dolphin API error: {result.get('message', response.status)}")
                
                return result
        except aiohttp.ClientError as e:
            raise AntidetectException(f"Dolphin API request failed: {e}")
    
    async def create_profile(
        self,
        account_id: str,
        name: str,
        os: str = 'windows',
        browser: str = 'chrome',
        proxy: Optional[ProxyInfo] = None
    ) -> BrowserProfile:
        """Создание браузерного профиля"""
        try:
            # Генерируем случайный fingerprint
            fingerprint = await self._generate_fingerprint(os, browser)
            
            profile_data = {
                'name': name,
                'os': os,
                'browser': browser,
                'useragent': fingerprint['useragent'],
                'proxy': proxy.to_telethon_proxy() if proxy else None,
                'mainWebsite': 'https://web.telegram.org',
            }
            
            # Пробуем создать через API Dolphin Anty
            try:
                result = await self._request('POST', '/api/v1/profiles', data=profile_data)
                profile_id = result.get('profile', {}).get('id', account_id)
            except AntidetectException:
                # Если Dolphin Anty недоступен, создаём локальный профиль
                logger.warning("Dolphin Anty API unavailable, creating local profile")
                profile_id = account_id
            
            profile = BrowserProfile(
                id=profile_id,
                account_id=account_id,
                name=name,
                os=os,
                browser=browser,
                useragent=fingerprint['useragent'],
                proxy_id=proxy.id if proxy else None,
                fingerprint=fingerprint,
            )
            
            self.profiles[account_id] = profile
            logger.info(f"Created browser profile for account {account_id}")
            
            return profile
            
        except Exception as e:
            raise AntidetectException(f"Failed to create browser profile: {e}")
    
    async def _generate_fingerprint(self, os: str, browser: str) -> Dict[str, Any]:
        """Генерация случайного fingerprint"""
        useragents = {
            'windows': {
                'chrome': [
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ],
            },
            'macos': {
                'chrome': [
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                ],
            },
            'linux': {
                'chrome': [
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ],
            },
        }
        
        useragent = random.choice(
            useragents.get(os, useragents['windows'])
                .get(browser, useragents['windows']['chrome'])
        )
        
        # Генерируем canvas noise
        canvas_noise = ''.join(random.choices('0123456789abcdef', k=32))
        
        # WebRTC настройки
        webrtc_mode = random.choice(['disabled', 'default_public_interface_only'])
        
        return {
            'useragent': useragent,
            'canvas_noise': canvas_noise,
            'webgl_vendor': 'Google Inc. (NVIDIA)',
            'webgl_renderer': 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060, OpenGL 4.6)',
            'webrtc_mode': webrtc_mode,
            'timezone': random.choice(['Europe/Moscow', 'Europe/London', 'America/New_York']),
            'locale': 'en-US',
            'screen_resolution': random.choice(['1920x1080', '2560x1440', '1366x768']),
            'hardware_concurrency': random.choice([4, 8, 12, 16]),
            'device_memory': random.choice([4, 8, 16]),
        }
    
    async def get_profile(self, account_id: str) -> Optional[BrowserProfile]:
        """Получение профиля по account_id"""
        return self.profiles.get(account_id)
    
    async def start_profile(self, profile_id: str) -> Dict[str, Any]:
        """Запуск браузерного профиля"""
        try:
            result = await self._request('GET', f'/api/v1/profiles/{profile_id}/start')
            return result
        except AntidetectException:
            return {'status': 'started', 'local': True}
    
    async def stop_profile(self, profile_id: str) -> Dict[str, Any]:
        """Остановка браузерного профиля"""
        try:
            result = await self._request('GET', f'/api/v1/profiles/{profile_id}/stop')
            return result
        except AntidetectException:
            return {'status': 'stopped', 'local': True}
    
    async def extract_cookies(self, profile_id: str) -> List[Dict]:
        """Извлечение cookies из профиля"""
        try:
            result = await self._request('GET', f'/api/v1/profiles/{profile_id}/cookies')
            cookies = result.get('cookies', [])
            
            if profile_id in self.profiles:
                self.profiles[profile_id].cookies = cookies
            
            return cookies
        except AntidetectException:
            return []
    
    async def delete_profile(self, profile_id: str) -> bool:
        """Удаление браузерного профиля"""
        try:
            await self._request('DELETE', f'/api/v1/profiles/{profile_id}')
            
            # Удаляем из локального кэша
            for account_id, profile in list(self.profiles.items()):
                if profile.id == profile_id:
                    del self.profiles[account_id]
            
            return True
        except AntidetectException:
            return False
    
    async def sync_profiles_from_api(self) -> None:
        """Синхронизация профилей с API"""
        try:
            url = f"{self.config.api_base}/api/browser-profiles"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    profiles = data.get('profiles', [])
                    
                    for p in profiles:
                        profile = BrowserProfile(
                            id=p['id'],
                            account_id=p['account_id'],
                            name=p.get('name', f"Account {p['account_id']}"),
                            os=p.get('os', 'windows'),
                            browser=p.get('browser', 'chrome'),
                            useragent=p.get('useragent', ''),
                            proxy_id=p.get('proxy_id'),
                        )
                        self.profiles[p['account_id']] = profile
                    
                    logger.info(f"Synced {len(profiles)} browser profiles")
        except Exception as e:
            logger.error(f"Failed to sync browser profiles: {e}")


# ==================== ADB MANAGER ====================

class ADBManager:
    """
    Менеджер для работы с ADB (Android Debug Bridge)
    Управляет SIM-картами и устройствами для регистрации аккаунтов
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.connected_devices: List[str] = []
        self._adb_path = self._find_adb()
    
    def _find_adb(self) -> str:
        """Поиск пути к adb"""
        possible_paths = [
            '/usr/bin/adb',
            '/usr/local/bin/adb',
            '~/Android/Sdk/platform-tools/adb',
            '~/platform-tools/adb',
        ]
        
        for path in possible_paths:
            expanded = os.path.expanduser(path)
            if os.path.exists(expanded):
                return expanded
        
        import shutil
        adb = shutil.which('adb')
        if adb:
            return adb
        
        raise ADBException("ADB not found. Please install Android SDK Platform Tools.")
    
    async def execute_command(self, *args: str, timeout: int = 30) -> str:
        """Выполнение ADB команды"""
        cmd = [self._adb_path] + list(args)
        logger.debug(f"Executing ADB command: {' '.join(cmd)}")
        
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout
            )
            
            if proc.returncode != 0:
                raise ADBException(f"ADB command failed: {stderr.decode()}")
            
            return stdout.decode().strip()
            
        except asyncio.TimeoutError:
            raise ADBException(f"ADB command timed out after {timeout}s")
    
    async def connect_device(self, device_id: str) -> bool:
        """Подключение к устройству"""
        try:
            result = await self.execute_command('connect', device_id)
            if 'connected' in result.lower():
                self.connected_devices.append(device_id)
                logger.info(f"Connected to device: {device_id}")
                return True
            return False
        except ADBException as e:
            logger.error(f"Failed to connect to device {device_id}: {e}")
            return False
    
    async def get_devices(self) -> List[str]:
        """Получение списка подключённых устройств"""
        result = await self.execute_command('devices', '-l')
        devices = []
        
        for line in result.split('\n')[1:]:
            if line.strip():
                parts = line.split()[0]
                devices.append(parts)
        
        return devices
    
    async def send_sms_intent(self, device: str, phone_number: str) -> None:
        """Отправка intent для открытия Telegram с номером"""
        await self.execute_command(
            '-s', device,
            'shell', 'am', 'start',
            '-a', 'android.intent.action.VIEW',
            '-d', f'tg://resolve?domain=+{phone_number}'
        )
    
    async def read_sms(self, device: str, timeout: int = 60) -> Optional[str]:
        """Чтение SMS кода через ADB"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                result = await self.execute_command(
                    '-s', device,
                    'shell', 'content', 'query',
                    '--uri', 'content://sms/inbox',
                    '--projection', 'body',
                    '--sort', 'date DESC',
                    '--limit', '5'
                )
                
                match = re.search(r'(\d{5,6})', result)
                if match:
                    code = match.group(1)
                    logger.info(f"SMS code received: {code[:2]}***")
                    return code
                
            except Exception as e:
                logger.warning(f"Error reading SMS: {e}")
            
            await asyncio.sleep(2)
        
        raise SMSException(f"SMS code not received within {timeout}s")
    
    async def input_text(self, device: str, text: str) -> None:
        """Ввод текста на устройстве"""
        await self.execute_command(
            '-s', device,
            'shell', 'input', 'text', text
        )
    
    async def tap(self, device: str, x: int, y: int) -> None:
        """Тап по координатам"""
        await self.execute_command(
            '-s', device,
            'shell', 'input', 'tap', str(x), str(y)
        )
    
    async def press_key(self, device: str, keycode: str) -> None:
        """Нажатие клавиши"""
        await self.execute_command(
            '-s', device,
            'shell', 'input', 'keyevent', keycode
        )


# ==================== TELEGRAM MANAGER ====================

class TelegramManager:
    """
    Менеджер для работы с Telegram через Telethon
    Регистрация, авторизация, управление аккаунтами
    """
    
    def __init__(self, config: Config, proxy_manager: Optional[ProxyManager] = None):
        self.config = config
        self.proxy_manager = proxy_manager
        self.sessions: Dict[str, Any] = {}  # phone -> TelegramClient
        
        os.makedirs(config.sessions_dir, exist_ok=True)
        os.makedirs(config.media_dir, exist_ok=True)
    
    async def get_client(self, phone: str, proxy: Optional[ProxyInfo] = None):
        """Получение или создание клиента Telethon"""
        try:
            from telethon import TelegramClient
            from telethon.sessions import StringSession
        except ImportError:
            logger.warning("Telethon not installed. Install with: pip install telethon")
            return None
        
        if phone in self.sessions:
            return self.sessions[phone]
        
        session_file = os.path.join(self.config.sessions_dir, f"{phone}.session")
        
        # Настройка прокси
        proxy_config = None
        if proxy:
            proxy_config = proxy.to_telethon_proxy()
        
        client = TelegramClient(
            session_file,
            self.config.api_id,
            self.config.api_hash,
            proxy=proxy_config,
        )
        
        await client.connect()
        self.sessions[phone] = client
        
        return client
    
    async def disconnect_client(self, phone: str) -> None:
        """Отключение клиента"""
        if phone in self.sessions:
            await self.sessions[phone].disconnect()
            del self.sessions[phone]
    
    async def send_code(self, phone: str) -> Dict[str, Any]:
        """Отправка кода подтверждения"""
        client = await self.get_client(phone)
        if not client:
            raise TelegramException("Telethon not available")
        
        try:
            result = await client.send_code_request(phone)
            return {
                'phone_code_hash': result.phone_code_hash,
                'phone': phone,
            }
        except Exception as e:
            raise TelegramException(f"Failed to send code: {e}")
    
    async def sign_in(self, phone: str, code: str, phone_code_hash: str) -> Dict[str, Any]:
        """Вход с кодом подтверждения"""
        try:
            from telethon.errors import SessionPasswordNeededError
        except ImportError:
            raise TelegramException("Telethon not available")
        
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            user = await client.sign_in(
                phone=phone,
                code=code,
                phone_code_hash=phone_code_hash
            )
            
            return {
                'success': True,
                'user_id': user.id,
                'username': user.username,
                'phone': user.phone,
            }
            
        except SessionPasswordNeededError:
            return {
                'success': False,
                'requires_2fa': True,
                'message': 'Account has 2FA enabled',
            }
        except Exception as e:
            raise TelegramException(f"Sign in failed: {e}")
    
    async def setup_2fa(self, phone: str, password: str, hint: str = '') -> bool:
        """Установка двухфакторной аутентификации"""
        client = self.sessions.get(phone)
        if not client:
            raise TelegramException("Client not connected")
        
        try:
            await client.edit_2fa(
                current_password=None,
                new_password=password,
                hint=hint,
                email='',
            )
            logger.info(f"2FA setup completed for {phone}")
            return True
            
        except Exception as e:
            raise TelegramException(f"2FA setup failed: {e}")
    
    async def create_channel(
        self,
        phone: str,
        title: str,
        description: str = '',
        username: str = ''
    ) -> Dict[str, Any]:
        """Создание канала"""
        try:
            from telethon.tl.functions.channels import CreateChannelRequest, UpdateUsernameRequest
        except ImportError:
            raise TelegramException("Telethon not available")
        
        client = self.sessions.get(phone)
        if not client:
            raise TelegramException("Client not connected")
        
        try:
            result = await client(CreateChannelRequest(
                title=title,
                about=description,
                megagroup=False,
            ))
            
            channel = result.chats[0]
            
            if username:
                await client(UpdateUsernameRequest(
                    channel=channel,
                    username=username
                ))
            
            return {
                'success': True,
                'channel_id': channel.id,
                'channel_title': channel.title,
                'channel_username': username if username else None,
            }
            
        except Exception as e:
            raise TelegramException(f"Channel creation failed: {e}")
    
    async def send_message(
        self,
        phone: str,
        entity: str,
        message: str,
        parse_mode: str = 'html'
    ) -> Dict[str, Any]:
        """Отправка сообщения"""
        client = self.sessions.get(phone)
        if not client:
            raise TelegramException("Client not connected")
        
        try:
            result = await client.send_message(
                entity=entity,
                message=message,
                parse_mode=parse_mode
            )
            
            return {
                'success': True,
                'message_id': result.id,
            }
            
        except Exception as e:
            raise TelegramException(f"Message send failed: {e}")
    
    # ==================== POST CONTENT ====================
    
    async def post_content(
        self,
        phone: str,
        channel: str,
        text: str,
        media_urls: Optional[List[str]] = None,
        parse_mode: str = 'html',
        buttons: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Публикация контента в канал
        
        Args:
            phone: Номер телефона аккаунта
            channel: Username или ID канала
            text: Текст поста
            media_urls: Список URL медиа файлов (изображения, видео)
            parse_mode: Режим парсинга (html, markdown)
            buttons: Список кнопок для поста
        
        Returns:
            Dict с результатом операции
        """
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon import Button
            from telethon.tl.functions.messages import UploadMediaRequest
            from telethon.tl.types import (
                InputMediaUploadedPhoto,
                InputMediaUploadedDocument,
                DocumentAttributeFilename
            )
        except ImportError:
            raise TelegramException("Telethon not available")
        
        try:
            # Загрузка медиа файлов
            media_files = []
            
            if media_urls:
                for url in media_urls:
                    media_path = await self._download_media(url)
                    if media_path:
                        media_files.append(media_path)
            
            # Создание кнопок
            keyboard = None
            if buttons:
                keyboard = []
                for row in buttons:
                    button_row = []
                    for btn in row:
                        if btn.get('url'):
                            button_row.append(Button.url(btn['text'], btn['url']))
                        elif btn.get('callback'):
                            button_row.append(Button.inline(btn['text'], btn['callback']))
                    keyboard.append(button_row)
            
            # Отправка поста
            if len(media_files) == 0:
                # Только текст
                result = await client.send_message(
                    entity=channel,
                    message=text,
                    parse_mode=parse_mode,
                    buttons=keyboard
                )
            elif len(media_files) == 1:
                # Один медиа файл
                result = await client.send_file(
                    entity=channel,
                    file=media_files[0],
                    caption=text,
                    parse_mode=parse_mode,
                    buttons=keyboard
                )
            else:
                # Альбом (несколько медиа файлов)
                result = await client.send_file(
                    entity=channel,
                    file=media_files,
                    caption=text,
                    parse_mode=parse_mode
                )
            
            # Очистка временных файлов
            for path in media_files:
                try:
                    os.remove(path)
                except:
                    pass
            
            logger.info(f"Posted content to {channel} via {phone}")
            
            return {
                'success': True,
                'message_id': result.id if hasattr(result, 'id') else [m.id for m in result],
                'media_count': len(media_files),
            }
            
        except Exception as e:
            raise TelegramException(f"Post content failed: {e}")
    
    async def _download_media(self, url: str) -> Optional[str]:
        """Скачивание медиа файла по URL"""
        try:
            # Генерируем имя файла
            parsed = urlparse(url)
            filename = os.path.basename(parsed.path)
            if not filename:
                filename = hashlib.md5(url.encode()).hexdigest()
            
            filepath = os.path.join(self.config.media_dir, filename)
            
            # Скачиваем файл
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as response:
                    if response.status == 200:
                        async with aiofiles.open(filepath, 'wb') as f:
                            await f.write(await response.read())
                        return filepath
            
            return None
        except Exception as e:
            logger.error(f"Failed to download media from {url}: {e}")
            return None
    
    # ==================== JOIN CHANNEL ====================
    
    async def join_channel(
        self,
        phone: str,
        channel: str,
        delay: bool = True
    ) -> Dict[str, Any]:
        """
        Вступление в канал/группу
        
        Args:
            phone: Номер телефона аккаунта
            channel: Username канала, invite ссылка или ID
            delay: Добавлять случайную задержку
        
        Returns:
            Dict с результатом операции
        """
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon.tl.functions.channels import JoinChannelRequest
            from telethon.tl.functions.messages import ImportChatInviteRequest
            from telethon.errors import (
                UserAlreadyParticipantError,
                InviteHashInvalidError,
                InviteHashExpiredError,
                ChannelPrivateError,
                FloodWaitError,
                UserBannedInChannelError
            )
        except ImportError:
            raise TelegramException("Telethon not available")
        
        # Случайная задержка для естественности
        if delay:
            await asyncio.sleep(random.uniform(2, 8))
        
        try:
            # Определяем тип канала
            if 'joinchat' in channel.lower() or '+' in channel:
                # Приватная invite ссылка
                # Извлекаем hash из ссылки
                if 'joinchat' in channel:
                    invite_hash = channel.split('/')[-1]
                else:
                    invite_hash = channel.replace('+', '')
                
                result = await client(ImportChatInviteRequest(invite_hash))
                entity = result.chats[0] if hasattr(result, 'chats') else result
                
            else:
                # Публичный username или ID
                entity = await client.get_entity(channel)
                result = await client(JoinChannelRequest(entity))
                entity = result.chats[0] if hasattr(result, 'chats') else entity
            
            logger.info(f"Joined channel {channel} via {phone}")
            
            return {
                'success': True,
                'channel_id': entity.id if hasattr(entity, 'id') else None,
                'channel_title': entity.title if hasattr(entity, 'title') else str(entity),
            }
            
        except UserAlreadyParticipantError:
            return {
                'success': True,
                'already_joined': True,
                'message': 'Already a member of this channel',
            }
        except InviteHashInvalidError:
            raise TelegramException("Invalid invite link")
        except InviteHashExpiredError:
            raise TelegramException("Invite link has expired")
        except ChannelPrivateError:
            raise TelegramException("Channel is private or not found")
        except FloodWaitError as e:
            raise FloodException(e.seconds)
        except UserBannedInChannelError:
            raise TelegramException("User is banned in this channel")
        except Exception as e:
            raise TelegramException(f"Failed to join channel: {e}")
    
    # ==================== IMPORT CONTACTS ====================
    
    async def import_contacts(
        self,
        phone: str,
        contacts: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Импорт контактов
        
        Args:
            phone: Номер телефона аккаунта
            contacts: Список контактов [{'phone': '+1234567890', 'first_name': 'John', 'last_name': 'Doe'}]
        
        Returns:
            Dict с результатом операции
        """
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon.tl.functions.contacts import ImportContactsRequest
            from telethon.tl.types import InputPhoneContact
        except ImportError:
            raise TelegramException("Telethon not available")
        
        try:
            # Создаём InputPhoneContact для каждого контакта
            input_contacts = []
            for i, contact in enumerate(contacts):
                input_contact = InputPhoneContact(
                    client_id=i,
                    phone=contact['phone'],
                    first_name=contact.get('first_name', ''),
                    last_name=contact.get('last_name', '')
                )
                input_contacts.append(input_contact)
            
            # Импортируем
            result = await client(ImportContactsRequest(input_contacts))
            
            imported_users = len(result.users) if hasattr(result, 'users') else 0
            
            logger.info(f"Imported {imported_users} contacts via {phone}")
            
            return {
                'success': True,
                'imported_count': imported_users,
                'total_requested': len(contacts),
            }
            
        except Exception as e:
            raise TelegramException(f"Failed to import contacts: {e}")
    
    # ==================== SEND REACTION ====================
    
    async def send_reaction(
        self,
        phone: str,
        channel: str,
        message_id: int,
        reaction: str = '👍'
    ) -> Dict[str, Any]:
        """
        Отправка реакции на сообщение
        
        Args:
            phone: Номер телефона аккаунта
            channel: Username или ID канала
            message_id: ID сообщения
            reaction: Эмодзи реакции
        
        Returns:
            Dict с результатом операции
        """
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon.tl.functions.messages import SendReactionRequest
            from telethon.tl.types import ReactionEmoji
        except ImportError:
            raise TelegramException("Telethon not available")
        
        try:
            entity = await client.get_entity(channel)
            
            result = await client(SendReactionRequest(
                peer=entity,
                msg_id=message_id,
                reaction=ReactionEmoji(emoticon=reaction)
            ))
            
            logger.info(f"Sent reaction {reaction} to message {message_id} in {channel}")
            
            return {
                'success': True,
                'message_id': message_id,
                'reaction': reaction,
            }
            
        except Exception as e:
            raise TelegramException(f"Failed to send reaction: {e}")
    
    # ==================== VIEW STORIES ====================
    
    async def view_stories(
        self,
        phone: str,
        user_ids: List[str],
        max_stories: int = 10
    ) -> Dict[str, Any]:
        """
        Просмотр stories
        
        Args:
            phone: Номер телефона аккаунта
            user_ids: Список username или ID пользователей
            max_stories: Максимальное количество stories для просмотра
        
        Returns:
            Dict с результатом операции
        """
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon.tl.functions.stories import ReadStoriesRequest
        except ImportError:
            raise TelegramException("Telethon not available")
        
        try:
            viewed_count = 0
            
            for user_id in user_ids:
                try:
                    entity = await client.get_entity(user_id)
                    
                    # Получаем stories пользователя
                    stories = await client.get_stories(entity)
                    
                    for story in stories[:max_stories]:
                        try:
                            await client(ReadStoriesRequest(
                                peer=entity,
                                id=[story.id]
                            ))
                            viewed_count += 1
                            
                            # Случайная задержка между stories
                            await asyncio.sleep(random.uniform(0.5, 2))
                            
                        except Exception as e:
                            logger.debug(f"Failed to view story {story.id}: {e}")
                
                except Exception as e:
                    logger.debug(f"Failed to get stories for {user_id}: {e}")
            
            logger.info(f"Viewed {viewed_count} stories via {phone}")
            
            return {
                'success': True,
                'viewed_count': viewed_count,
            }
            
        except Exception as e:
            raise TelegramException(f"Failed to view stories: {e}")
    
    # ==================== FORWARD MESSAGE ====================
    
    async def forward_message(
        self,
        phone: str,
        from_channel: str,
        to_channel: str,
        message_ids: List[int],
        drop_author: bool = False
    ) -> Dict[str, Any]:
        """
        Пересылка сообщений
        
        Args:
            phone: Номер телефона аккаунта
            from_channel: Username или ID канала-источника
            to_channel: Username или ID канала-получателя
            message_ids: Список ID сообщений для пересылки
            drop_author: Скрыть автора оригинала
        
        Returns:
            Dict с результатом операции
        """
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon.tl.functions.messages import ForwardMessagesRequest
        except ImportError:
            raise TelegramException("Telethon not available")
        
        try:
            from_entity = await client.get_entity(from_channel)
            to_entity = await client.get_entity(to_channel)
            
            forwarded_ids = []
            
            for msg_id in message_ids:
                result = await client(ForwardMessagesRequest(
                    from_peer=from_entity,
                    id=[msg_id],
                    to_peer=to_entity,
                    drop_author=drop_author,
                    random_id=[random.randint(0, 2**31 - 1)]
                ))
                
                if hasattr(result, 'updates'):
                    for update in result.updates:
                        if hasattr(update, 'id'):
                            forwarded_ids.append(update.id)
                
                # Задержка между пересылками
                await asyncio.sleep(random.uniform(1, 3))
            
            logger.info(f"Forwarded {len(forwarded_ids)} messages from {from_channel} to {to_channel}")
            
            return {
                'success': True,
                'forwarded_count': len(forwarded_ids),
                'forwarded_ids': forwarded_ids,
            }
            
        except Exception as e:
            raise TelegramException(f"Failed to forward messages: {e}")
    
    # ==================== ACCOUNT WARMING ====================
    
    async def set_profile_photo(
        self,
        phone: str,
        photo_path: str
    ) -> Dict[str, Any]:
        """Установка фото профиля"""
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            result = await client.upload_profile_photo(photo_path)
            return {
                'success': True,
                'photo_id': result.photo.id if hasattr(result, 'photo') else None,
            }
        except Exception as e:
            raise TelegramException(f"Failed to set profile photo: {e}")
    
    async def set_profile_bio(
        self,
        phone: str,
        bio: str
    ) -> Dict[str, Any]:
        """Установка био профиля"""
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon.tl.functions.account import UpdateProfileRequest
            await client(UpdateProfileRequest(about=bio))
            return {'success': True}
        except Exception as e:
            raise TelegramException(f"Failed to set bio: {e}")
    
    async def read_messages(
        self,
        phone: str,
        channel: str,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Чтение сообщений в канале (пометка как прочитанные)"""
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            from telethon.tl.functions.channels import ReadHistoryRequest
            entity = await client.get_entity(channel)
            
            await client(ReadHistoryRequest(entity, max_id=0))
            
            return {
                'success': True,
                'channel': channel,
            }
        except Exception as e:
            raise TelegramException(f"Failed to read messages: {e}")
    
    async def get_dialogs(
        self,
        phone: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Получение списка диалогов"""
        client = self.sessions.get(phone)
        if not client:
            client = await self.get_client(phone)
        
        try:
            dialogs = []
            async for dialog in client.iter_dialogs(limit=limit):
                dialogs.append({
                    'id': dialog.id,
                    'name': dialog.name,
                    'is_channel': dialog.is_channel,
                    'is_group': dialog.is_group,
                    'is_user': dialog.is_user,
                    'unread_count': dialog.unread_count,
                })
            return dialogs
        except Exception as e:
            raise TelegramException(f"Failed to get dialogs: {e}")


# ==================== WARMING SEQUENCE ====================

class WarmingSequence:
    """
    Последовательность прогрева аккаунта
    Multi-day warming с различными действиями
    """
    
    def __init__(
        self,
        telegram_manager: TelegramManager,
        config: Config,
        session: aiohttp.ClientSession
    ):
        self.telegram = telegram_manager
        self.config = config
        self.session = session
    
    async def execute_warming(
        self,
        phone: str,
        account_id: str,
        current_day: int = 1
    ) -> Dict[str, Any]:
        """
        Выполнение прогрева для текущего дня
        
        Args:
            phone: Номер телефона
            account_id: ID аккаунта в системе
            current_day: Текущий день прогрева (1-7)
        
        Returns:
            Dict с результатом
        """
        # Получаем настройки прогрева из API или используем дефолтные
        settings = await self._get_warming_settings(current_day)
        
        results = {
            'day': current_day,
            'actions': [],
            'success_count': 0,
            'error_count': 0,
        }
        
        try:
            # День 1: Профиль и базовые действия
            if current_day == 1:
                results = await self._warm_day_1(phone, settings)
            
            # День 2: Чтение и просмотр
            elif current_day == 2:
                results = await self._warm_day_2(phone, settings)
            
            # День 3: Реакции
            elif current_day == 3:
                results = await self._warm_day_3(phone, settings)
            
            # День 4-7: Увеличение активности
            else:
                results = await self._warm_day_advanced(phone, current_day, settings)
            
            # Сохраняем прогресс в API
            await self._save_warming_progress(account_id, results)
            
            return results
            
        except FloodException as e:
            logger.warning(f"Flood wait during warming: {e.wait_time}s")
            await self._save_warming_progress(account_id, {
                'day': current_day,
                'flood_wait': e.wait_time,
                'status': 'paused',
            })
            raise
            
        except Exception as e:
            logger.error(f"Error during warming day {current_day}: {e}")
            raise
    
    async def _get_warming_settings(self, day: int) -> Dict[str, Any]:
        """Получение настроек прогрева из API"""
        try:
            url = f"{self.config.api_base}/api/warming-settings/{day}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            logger.debug(f"Failed to get warming settings: {e}")
        
        # Дефолтные настройки
        return self.config.warm_settings.get(f'day{day}', {})
    
    async def _save_warming_progress(
        self,
        account_id: str,
        progress: Dict[str, Any]
    ) -> None:
        """Сохранение прогресса прогрева"""
        try:
            url = f"{self.config.api_base}/api/accounts/{account_id}/warming"
            async with self.session.post(url, json=progress) as response:
                if response.status != 200:
                    logger.warning(f"Failed to save warming progress: {response.status}")
        except Exception as e:
            logger.error(f"Error saving warming progress: {e}")
    
    async def _random_delay(self, delay_range: Tuple[int, int]) -> None:
        """Случайная задержка"""
        delay = random.uniform(*delay_range)
        logger.debug(f"Waiting {delay:.1f} seconds...")
        await asyncio.sleep(delay)
    
    async def _warm_day_1(
        self,
        phone: str,
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """День 1: Установка профиля и базовые действия"""
        results = {
            'day': 1,
            'actions': [],
            'success_count': 0,
            'error_count': 0,
        }
        
        delay_range = settings.get('delay_range', (60, 180))
        
        # 1. Установка фото профиля
        if settings.get('set_profile', True):
            try:
                # Скачиваем случайное фото из пула или используем заглушку
                photo_url = await self._get_random_profile_photo()
                if photo_url:
                    photo_path = await self.telegram._download_media(photo_url)
                    if photo_path:
                        await self.telegram.set_profile_photo(phone, photo_path)
                        os.remove(photo_path)
                        
                        results['actions'].append({
                            'type': 'set_profile_photo',
                            'success': True,
                        })
                        results['success_count'] += 1
                        
                        await self._random_delay(delay_range)
            except Exception as e:
                logger.error(f"Failed to set profile photo: {e}")
                results['actions'].append({
                    'type': 'set_profile_photo',
                    'success': False,
                    'error': str(e),
                })
                results['error_count'] += 1
        
        # 2. Установка био
        try:
            bio = await self._get_random_bio()
            await self.telegram.set_profile_bio(phone, bio)
            results['actions'].append({
                'type': 'set_bio',
                'success': True,
            })
            results['success_count'] += 1
            
            await self._random_delay(delay_range)
        except Exception as e:
            logger.error(f"Failed to set bio: {e}")
            results['error_count'] += 1
        
        # 3. Вступление в каналы
        channels_to_join = settings.get('join_channels', 3)
        channels = await self._get_warming_channels(channels_to_join)
        
        for channel in channels:
            try:
                await self.telegram.join_channel(phone, channel, delay=False)
                results['actions'].append({
                    'type': 'join_channel',
                    'channel': channel,
                    'success': True,
                })
                results['success_count'] += 1
                
                await self._random_delay(delay_range)
            except Exception as e:
                logger.error(f"Failed to join channel {channel}: {e}")
                results['error_count'] += 1
        
        return results
    
    async def _warm_day_2(
        self,
        phone: str,
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """День 2: Чтение и просмотр контента"""
        results = {
            'day': 2,
            'actions': [],
            'success_count': 0,
            'error_count': 0,
        }
        
        delay_range = settings.get('delay_range', (45, 150))
        
        # 1. Чтение сообщений в каналах
        if settings.get('read_messages', True):
            dialogs = await self.telegram.get_dialogs(phone, limit=20)
            channels = [d for d in dialogs if d['is_channel']][:5]
            
            for channel in channels:
                try:
                    await self.telegram.read_messages(phone, str(channel['id']))
                    results['actions'].append({
                        'type': 'read_messages',
                        'channel': channel['name'],
                        'success': True,
                    })
                    results['success_count'] += 1
                    
                    await self._random_delay(delay_range)
                except Exception as e:
                    logger.error(f"Failed to read messages: {e}")
                    results['error_count'] += 1
        
        # 2. Просмотр stories
        if settings.get('view_stories', True):
            try:
                # Получаем список пользователей для просмотра stories
                story_users = await self._get_story_users(5)
                await self.telegram.view_stories(phone, story_users, max_stories=5)
                
                results['actions'].append({
                    'type': 'view_stories',
                    'success': True,
                })
                results['success_count'] += 1
            except Exception as e:
                logger.error(f"Failed to view stories: {e}")
                results['error_count'] += 1
        
        # 3. Вступление в дополнительные каналы
        channels_to_join = settings.get('join_channels', 2)
        channels = await self._get_warming_channels(channels_to_join)
        
        for channel in channels:
            try:
                await self.telegram.join_channel(phone, channel, delay=False)
                results['actions'].append({
                    'type': 'join_channel',
                    'channel': channel,
                    'success': True,
                })
                results['success_count'] += 1
                
                await self._random_delay(delay_range)
            except Exception as e:
                logger.error(f"Failed to join channel: {e}")
                results['error_count'] += 1
        
        return results
    
    async def _warm_day_3(
        self,
        phone: str,
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """День 3: Реакции и контент"""
        results = {
            'day': 3,
            'actions': [],
            'success_count': 0,
            'error_count': 0,
        }
        
        delay_range = settings.get('delay_range', (30, 120))
        
        # 1. Отправка реакций
        reactions_count = settings.get('send_reactions', 3)
        reactions_data = await self._get_messages_for_reaction(reactions_count)
        
        reactions = ['👍', '❤️', '🔥', '👏', '😁', '🤔', '👎', '😢']
        
        for data in reactions_data:
            try:
                reaction = random.choice(reactions)
                await self.telegram.send_reaction(
                    phone,
                    data['channel'],
                    data['message_id'],
                    reaction
                )
                results['actions'].append({
                    'type': 'send_reaction',
                    'channel': data['channel'],
                    'reaction': reaction,
                    'success': True,
                })
                results['success_count'] += 1
                
                await self._random_delay(delay_range)
            except Exception as e:
                logger.error(f"Failed to send reaction: {e}")
                results['error_count'] += 1
        
        # 2. Просмотр контента
        if settings.get('view_content', True):
            dialogs = await self.telegram.get_dialogs(phone, limit=20)
            channels = [d for d in dialogs if d['is_channel']][:8]
            
            for channel in channels:
                try:
                    await self.telegram.read_messages(phone, str(channel['id']))
                    results['success_count'] += 1
                    
                    await self._random_delay((10, 30))
                except:
                    pass
        
        return results
    
    async def _warm_day_advanced(
        self,
        phone: str,
        day: int,
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Дни 4-7: Увеличение активности"""
        results = {
            'day': day,
            'actions': [],
            'success_count': 0,
            'error_count': 0,
        }
        
        delay_range = settings.get('delay_range', (10, 60))
        
        # Увеличиваем количество реакций с каждым днём
        reactions_count = settings.get('send_reactions', 5 + day * 2)
        reactions_data = await self._get_messages_for_reaction(reactions_count)
        
        reactions = ['👍', '❤️', '🔥', '👏', '😁', '🤔']
        
        for data in reactions_data:
            try:
                reaction = random.choice(reactions)
                await self.telegram.send_reaction(
                    phone,
                    data['channel'],
                    data['message_id'],
                    reaction
                )
                results['actions'].append({
                    'type': 'send_reaction',
                    'success': True,
                })
                results['success_count'] += 1
                
                await self._random_delay(delay_range)
            except Exception as e:
                logger.error(f"Failed to send reaction: {e}")
                results['error_count'] += 1
        
        # Просмотр stories
        if settings.get('view_stories', True):
            try:
                story_users = await self._get_story_users(3 + day)
                await self.telegram.view_stories(phone, story_users, max_stories=3 + day)
                results['success_count'] += 1
            except:
                pass
        
        # Чтение сообщений
        if settings.get('read_messages', True):
            dialogs = await self.telegram.get_dialogs(phone, limit=30)
            channels = [d for d in dialogs if d['is_channel']][:10]
            
            for channel in channels:
                try:
                    await self.telegram.read_messages(phone, str(channel['id']))
                    await self._random_delay((5, 20))
                except:
                    pass
        
        # Вступление в каналы
        if settings.get('join_channels', 0) > 0:
            channels = await self._get_warming_channels(settings['join_channels'])
            for channel in channels:
                try:
                    await self.telegram.join_channel(phone, channel, delay=False)
                    results['success_count'] += 1
                    await self._random_delay(delay_range)
                except:
                    pass
        
        return results
    
    async def _get_random_profile_photo(self) -> Optional[str]:
        """Получение URL случайного фото профиля"""
        # Пул фото для профилей (можно настроить через API)
        try:
            url = f"{self.config.api_base}/api/profile-photos/random"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('url')
        except:
            pass
        
        # Заглушки если API недоступен
        return None
    
    async def _get_random_bio(self) -> str:
        """Получение случайного био"""
        bios = [
            "Living life to the fullest 🌟",
            "Coffee lover ☕ | Travel enthusiast ✈️",
            "Making the world a better place",
            "Just another day in paradise 🌴",
            "Dreams don't work unless you do",
            "Stay positive, work hard 💪",
            "Life is short, make it sweet 🍭",
            "Adventure awaits 🗺️",
        ]
        return random.choice(bios)
    
    async def _get_warming_channels(self, count: int) -> List[str]:
        """Получение списка каналов для вступления"""
        try:
            url = f"{self.config.api_base}/api/warming-channels?limit={count}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return [c['username'] for c in data.get('channels', [])]
        except:
            pass
        
        # Дефолтные популярные каналы
        default_channels = [
            'telegram',
            'durov',
            'telegramtips',
            'contest',
            'tdesktop',
        ]
        return default_channels[:count]
    
    async def _get_story_users(self, count: int) -> List[str]:
        """Получение списка пользователей для просмотра stories"""
        try:
            url = f"{self.config.api_base}/api/story-users?limit={count}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return [u['username'] for u in data.get('users', [])]
        except:
            pass
        
        return []
    
    async def _get_messages_for_reaction(self, count: int) -> List[Dict[str, Any]]:
        """Получение сообщений для реакций"""
        try:
            url = f"{self.config.api_base}/api/reaction-targets?limit={count}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('messages', [])
        except:
            pass
        
        return []


# ==================== TASK EXECUTOR ====================

class TaskExecutor:
    """
    Исполнитель задач
    Получает задачи из API и выполняет их
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.running = False
        
        # Инициализируем менеджеры (сессия будет установлена в start())
        self.adb = ADBManager(config)
        self.proxy_manager: Optional[ProxyManager] = None
        self.antidetect_manager: Optional[AntidetectManager] = None
        self.telegram: Optional[TelegramManager] = None
        self.warming: Optional[WarmingSequence] = None
    
    async def start(self):
        """Запуск раннера"""
        global logger
        logger = setup_logging(self.config)
        
        logger.info(f"Starting MUKN Runner v2.0.0 (ID: {self.config.runner_id})")
        
        self.session = aiohttp.ClientSession()
        
        # Инициализируем менеджеры
        self.proxy_manager = ProxyManager(self.config, self.session)
        self.antidetect_manager = AntidetectManager(self.config, self.session)
        self.telegram = TelegramManager(self.config, self.proxy_manager)
        self.warming = WarmingSequence(self.telegram, self.config, self.session)
        
        # Загружаем конфигурацию из API
        await self._load_config_from_api()
        
        # Загружаем прокси
        await self.proxy_manager.load_proxies_from_api()
        
        # Проверяем здоровье API
        await self._check_api_health()
        
        # Основной цикл обработки задач
        while self.running:
            try:
                task = await self._fetch_task()
                
                if task:
                    await self._execute_task(task)
                else:
                    await asyncio.sleep(self.config.poll_interval)
                    
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                logger.error(traceback.format_exc())
                await asyncio.sleep(self.config.poll_interval)
    
    async def stop(self):
        """Остановка раннера"""
        logger.info("Stopping runner...")
        self.running = False
        
        # Закрываем все Telegram сессии
        if self.telegram:
            for phone in list(self.telegram.sessions.keys()):
                await self.telegram.disconnect_client(phone)
        
        if self.session:
            await self.session.close()
    
    async def _load_config_from_api(self) -> None:
        """Загрузка конфигурации из API"""
        try:
            url = f"{self.config.api_base}/api/runner-config/{self.config.runner_id}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    config_data = await response.json()
                    
                    # Обновляем настройки
                    if 'poll_interval' in config_data:
                        self.config.poll_interval = config_data['poll_interval']
                    if 'max_concurrent_tasks' in config_data:
                        self.config.max_concurrent_tasks = config_data['max_concurrent_tasks']
                    if 'warm_settings' in config_data:
                        self.config.warm_settings = config_data['warm_settings']
                    
                    logger.info("Loaded configuration from API")
        except Exception as e:
            logger.warning(f"Failed to load config from API: {e}")
    
    @backoff.on_exception(
        backoff.exponential,
        (aiohttp.ClientError, APIException),
        max_tries=5,
        max_time=300
    )
    async def _check_api_health(self):
        """Проверка здоровья API"""
        url = f"{self.config.api_base}/api/health"
        
        async with self.session.get(url) as response:
            if response.status == 200:
                health = await response.json()
                logger.info(f"API health: {health.get('status', 'unknown')}")
            else:
                raise APIException(f"API health check failed: {response.status}")
    
    @backoff.on_exception(
        backoff.exponential,
        (aiohttp.ClientError, APIException),
        max_tries=3
    )
    async def _fetch_task(self) -> Optional[Dict[str, Any]]:
        """Получение задачи из очереди"""
        url = f"{self.config.api_base}/api/tasks/pending?runner_id={self.config.runner_id}&limit=1"
        
        async with self.session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                tasks = data.get('tasks', [])
                
                if tasks:
                    return tasks[0]
            
            return None
    
    async def _execute_task(self, task: Dict[str, Any]):
        """Выполнение задачи"""
        task_id = task['id']
        task_type = task['type']
        
        logger.info(f"Executing task {task_id}: {task_type}")
        
        try:
            # Обновляем статус на executing
            await self._update_task_status(task_id, 'executing')
            
            # Выполняем задачу в зависимости от типа
            result = await self._dispatch_task(task)
            
            # Обновляем статус на completed
            await self._update_task_status(
                task_id,
                'completed',
                result=result
            )
            
            logger.info(f"Task {task_id} completed successfully")
            
            # Логируем действие
            await self._log_action(task, result)
            
        except FloodException as e:
            logger.warning(f"Task {task_id} hit flood limit: {e.wait_time}s")
            await self._update_task_status(
                task_id,
                'paused',
                error=f"Flood wait: {e.wait_time}s"
            )
            
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            logger.error(traceback.format_exc())
            await self._update_task_status(task_id, 'failed', error=str(e))
    
    async def _dispatch_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Диспетчеризация задачи по типу"""
        task_type = TaskType(task['type'])
        
        handlers = {
            TaskType.REGISTER_ACCOUNT: self._handle_register_account,
            TaskType.VERIFY_SMS: self._handle_verify_sms,
            TaskType.SETUP_2FA: self._handle_setup_2fa,
            TaskType.CREATE_CHANNEL: self._handle_create_channel,
            TaskType.SEND_MESSAGE: self._handle_send_message,
            TaskType.POST_CONTENT: self._handle_post_content,
            TaskType.JOIN_CHANNEL: self._handle_join_channel,
            TaskType.WARM_ACCOUNT: self._handle_warm_account,
            TaskType.IMPORT_CONTACTS: self._handle_import_contacts,
            TaskType.SEND_REACTION: self._handle_send_reaction,
            TaskType.VIEW_STORIES: self._handle_view_stories,
            TaskType.FORWARD_MESSAGE: self._handle_forward_message,
        }
        
        handler = handlers.get(task_type)
        
        if handler:
            return await handler(task)
        else:
            raise RunnerException(f"Unknown task type: {task_type}")
    
    # ==================== HANDLERS ====================
    
    async def _handle_register_account(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка регистрации аккаунта"""
        params = task.get('params', {})
        phone = params.get('phone')
        
        if not phone:
            raise RunnerException("Phone number is required")
        
        # Получаем прокси для аккаунта
        account_id = task.get('account_id', phone)
        proxy = await self.proxy_manager.get_proxy_for_account(account_id)
        
        # Создаём браузерный профиль
        profile = await self.antidetect_manager.create_profile(
            account_id=account_id,
            name=f"Account {phone}",
            proxy=proxy
        )
        
        # Отправляем код
        code_info = await self.telegram.send_code(phone)
        
        return {
            'status': 'code_sent',
            'phone_code_hash': code_info['phone_code_hash'],
            'next_step': 'verify_sms',
            'profile_id': profile.id,
        }
    
    async def _handle_verify_sms(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка верификации SMS"""
        params = task.get('params', {})
        phone = params.get('phone')
        code = params.get('code')
        phone_code_hash = params.get('phone_code_hash')
        
        if not all([phone, code, phone_code_hash]):
            raise RunnerException("Phone, code, and phone_code_hash are required")
        
        result = await self.telegram.sign_in(phone, code, phone_code_hash)
        
        return result
    
    async def _handle_setup_2fa(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка установки 2FA"""
        params = task.get('params', {})
        phone = params.get('phone')
        password = params.get('password')
        hint = params.get('hint', '')
        
        if not all([phone, password]):
            raise RunnerException("Phone and password are required")
        
        result = await self.telegram.setup_2fa(phone, password, hint)
        
        return {'success': result}
    
    async def _handle_create_channel(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка создания канала"""
        params = task.get('params', {})
        phone = params.get('phone')
        title = params.get('title')
        description = params.get('description', '')
        username = params.get('username', '')
        
        if not all([phone, title]):
            raise RunnerException("Phone and title are required")
        
        result = await self.telegram.create_channel(phone, title, description, username)
        
        return result
    
    async def _handle_send_message(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка отправки сообщения"""
        params = task.get('params', {})
        phone = params.get('phone')
        entity = params.get('entity')
        message = params.get('message')
        
        if not all([phone, entity, message]):
            raise RunnerException("Phone, entity, and message are required")
        
        result = await self.telegram.send_message(phone, entity, message)
        
        return result
    
    async def _handle_post_content(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка публикации контента"""
        params = task.get('params', {})
        phone = params.get('phone')
        channel = params.get('channel')
        text = params.get('text', '')
        media_urls = params.get('media_urls', [])
        buttons = params.get('buttons', [])
        
        if not all([phone, channel]):
            raise RunnerException("Phone and channel are required")
        
        if not text and not media_urls:
            raise RunnerException("Either text or media_urls is required")
        
        result = await self.telegram.post_content(
            phone=phone,
            channel=channel,
            text=text,
            media_urls=media_urls,
            buttons=buttons if buttons else None
        )
        
        return result
    
    async def _handle_join_channel(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка вступления в канал"""
        params = task.get('params', {})
        phone = params.get('phone')
        channel = params.get('channel')
        
        if not all([phone, channel]):
            raise RunnerException("Phone and channel are required")
        
        result = await self.telegram.join_channel(phone, channel)
        
        # Сохраняем информацию о вступлении в БД
        account_id = task.get('account_id', phone)
        await self._track_joined_channel(account_id, channel, result)
        
        return result
    
    async def _handle_warm_account(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка прогрева аккаунта"""
        params = task.get('params', {})
        phone = params.get('phone')
        account_id = task.get('account_id', phone)
        current_day = params.get('current_day', 1)
        
        if not phone:
            raise RunnerException("Phone is required")
        
        result = await self.warming.execute_warming(
            phone=phone,
            account_id=account_id,
            current_day=current_day
        )
        
        return result
    
    async def _handle_import_contacts(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка импорта контактов"""
        params = task.get('params', {})
        phone = params.get('phone')
        contacts = params.get('contacts', [])
        
        if not phone:
            raise RunnerException("Phone is required")
        
        if not contacts:
            raise RunnerException("Contacts list is required")
        
        result = await self.telegram.import_contacts(phone, contacts)
        
        return result
    
    async def _handle_send_reaction(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка отправки реакции"""
        params = task.get('params', {})
        phone = params.get('phone')
        channel = params.get('channel')
        message_id = params.get('message_id')
        reaction = params.get('reaction', '👍')
        
        if not all([phone, channel, message_id]):
            raise RunnerException("Phone, channel, and message_id are required")
        
        result = await self.telegram.send_reaction(
            phone=phone,
            channel=channel,
            message_id=message_id,
            reaction=reaction
        )
        
        return result
    
    async def _handle_view_stories(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка просмотра stories"""
        params = task.get('params', {})
        phone = params.get('phone')
        user_ids = params.get('user_ids', [])
        max_stories = params.get('max_stories', 10)
        
        if not phone:
            raise RunnerException("Phone is required")
        
        if not user_ids:
            raise RunnerException("user_ids list is required")
        
        result = await self.telegram.view_stories(
            phone=phone,
            user_ids=user_ids,
            max_stories=max_stories
        )
        
        return result
    
    async def _handle_forward_message(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Обработка пересылки сообщений"""
        params = task.get('params', {})
        phone = params.get('phone')
        from_channel = params.get('from_channel')
        to_channel = params.get('to_channel')
        message_ids = params.get('message_ids', [])
        drop_author = params.get('drop_author', False)
        
        if not all([phone, from_channel, to_channel, message_ids]):
            raise RunnerException("Phone, from_channel, to_channel, and message_ids are required")
        
        result = await self.telegram.forward_message(
            phone=phone,
            from_channel=from_channel,
            to_channel=to_channel,
            message_ids=message_ids,
            drop_author=drop_author
        )
        
        return result
    
    # ==================== API HELPERS ====================
    
    async def _update_task_status(
        self,
        task_id: str,
        status: str,
        error: Optional[str] = None,
        result: Optional[Dict] = None
    ):
        """Обновление статуса задачи"""
        url = f"{self.config.api_base}/api/tasks/{task_id}/status"
        
        data = {'status': status}
        if error:
            data['error'] = error
        if result:
            data['result'] = result
        
        try:
            async with self.session.put(url, json=data) as response:
                if response.status != 200:
                    logger.error(f"Failed to update task status: {response.status}")
        except Exception as e:
            logger.error(f"Error updating task status: {e}")
    
    async def _track_joined_channel(
        self,
        account_id: str,
        channel: str,
        result: Dict[str, Any]
    ) -> None:
        """Отслеживание вступления в канал"""
        try:
            url = f"{self.config.api_base}/api/accounts/{account_id}/channels"
            async with self.session.post(url, json={
                'channel': channel,
                'channel_id': result.get('channel_id'),
                'joined_at': datetime.now().isoformat(),
            }) as response:
                if response.status != 200:
                    logger.warning(f"Failed to track joined channel: {response.status}")
        except Exception as e:
            logger.error(f"Error tracking joined channel: {e}")
    
    async def _log_action(
        self,
        task: Dict[str, Any],
        result: Dict[str, Any]
    ) -> None:
        """Логирование действия"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'runner_id': self.config.runner_id,
            'task_id': task.get('id'),
            'task_type': task.get('type'),
            'account_id': task.get('account_id'),
            'result': 'success' if result.get('success', True) else 'failed',
            'details': result,
        }
        
        logger.info(f"ACTION: {json.dumps(log_entry, ensure_ascii=False)}")
        
        # Также отправляем в API
        try:
            url = f"{self.config.api_base}/api/action-logs"
            async with self.session.post(url, json=log_entry) as response:
                if response.status != 200:
                    logger.debug(f"Failed to log action to API: {response.status}")
        except Exception as e:
            logger.debug(f"Error logging action to API: {e}")


# ==================== MAIN ====================

logger = logging.getLogger('MUKNRunner')


async def main():
    """Главная функция"""
    config = Config()
    
    # Проверяем обязательные переменные окружения
    if not config.api_id or not config.api_hash:
        logger.warning(
            "TELEGRAM_API_ID and TELEGRAM_API_HASH not set. "
            "Telegram features will be disabled."
        )
    
    executor = TaskExecutor(config)
    
    try:
        await executor.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        await executor.stop()


if __name__ == '__main__':
    asyncio.run(main())
