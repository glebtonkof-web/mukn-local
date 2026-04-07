"""
SIM Auto-Registration PRO - Configuration
МУКН Enterprise AI Automation Platform
"""

import os
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

class SIMSlot(Enum):
    SIM_0 = 0
    SIM_1 = 1

class ServiceCategory(Enum):
    SOCIAL = "social"
    VIDEO = "video"
    MESSAGING = "messaging"
    DATING = "dating"
    STREAMING = "streaming"
    PROFESSIONAL = "professional"
    ADULT = "adult"
    CRYPTO = "crypto"
    MUSIC = "music"

@dataclass
class SIMConfig:
    """Конфигурация SIM-карт"""
    slot: SIMSlot
    phone_number: str
    country_code: str = "+7"
    is_active: bool = True
    daily_limit: int = 5  # Макс регистраций в день
    registrations_today: int = 0
    last_registration: Optional[float] = None
    
    # Привязанные аккаунты
    registered_accounts: List[str] = field(default_factory=list)

@dataclass
class ServiceConfig:
    """Конфигурация сервиса для регистрации"""
    name: str
    display_name: str
    category: ServiceCategory
    url: str
    requires_proxy: bool  # Заблокирован в РФ
    requires_email: bool
    requires_sms: bool
    sms_wait_timeout: int = 300  # секунд
    cooldown_minutes: int = 30  # Пауза между регистрациями
    
    # Анти-бот настройки
    min_delay: float = 1.0
    max_delay: float = 3.0
    typing_speed_min: float = 0.05
    typing_speed_max: float = 0.15
    
    # Прогрев
    warmup_days: int = 7
    warmup_actions_per_day: int = 10

@dataclass
class ProxyConfig:
    """Конфигурация прокси"""
    enabled: bool = False
    type: str = "socks5"  # http, socks5
    host: str = ""
    port: int = 0
    username: str = ""
    password: str = ""
    
    # Ротация
    rotation_enabled: bool = True
    proxies_file: str = "storage/proxies.txt"

@dataclass
class WarmupConfig:
    """Конфигурация прогрева аккаунтов"""
    enabled: bool = True
    duration_days: int = 7
    
    # Действия прогрева
    actions_per_day_min: int = 5
    actions_per_day_max: int = 15
    
    # Время активности (часы)
    active_hours_start: int = 9
    active_hours_end: int = 23
    
    # Задержки между действиями (минуты)
    action_delay_min: int = 5
    action_delay_max: int = 60

@dataclass
class MonetizationConfig:
    """Конфигурация монетизации"""
    enabled: bool = True
    
    # Пороги для монетизации
    min_account_age_days: int = 7
    min_followers: int = 100
    min_posts: int = 5
    
    # Методы монетизации
    affiliate_marketing: bool = True
    sponsored_content: bool = True
    crypto_airdrops: bool = True
    nft_minting: bool = True
    
    # Платежные системы
    wallet_addresses: Dict[str, str] = field(default_factory=dict)

# ============================================================================
# ГЛОБАЛЬНАЯ КОНФИГУРАЦИЯ
# ============================================================================

# SIM-карты
SIM_CARDS: Dict[SIMSlot, SIMConfig] = {
    SIMSlot.SIM_0: SIMConfig(
        slot=SIMSlot.SIM_0,
        phone_number="9059777510",  # +79059777510 без +7
        country_code="+7"
    ),
    SIMSlot.SIM_1: SIMConfig(
        slot=SIMSlot.SIM_1,
        phone_number="9188805343",  # +79188805343 без +7
        country_code="+7"
    )
}

# Сервисы регистрации
SERVICES: Dict[str, ServiceConfig] = {
    # Видео платформы
    "youtube": ServiceConfig(
        name="youtube",
        display_name="YouTube/Google",
        category=ServiceCategory.VIDEO,
        url="https://accounts.google.com/signup",
        requires_proxy=False,
        requires_email=True,
        requires_sms=True,
        sms_wait_timeout=600,
        cooldown_minutes=60,
        warmup_days=10
    ),
    "tiktok": ServiceConfig(
        name="tiktok",
        display_name="TikTok",
        category=ServiceCategory.VIDEO,
        url="https://www.tiktok.com/signup/phone",
        requires_proxy=True,  # Заблокирован в РФ
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=45
    ),
    
    # Социальные сети
    "instagram": ServiceConfig(
        name="instagram",
        display_name="Instagram",
        category=ServiceCategory.SOCIAL,
        url="https://www.instagram.com/accounts/emailsignup/",
        requires_proxy=False,
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=30
    ),
    "twitter": ServiceConfig(
        name="twitter",
        display_name="Twitter/X",
        category=ServiceCategory.SOCIAL,
        url="https://twitter.com/i/flow/signup",
        requires_proxy=True,  # Заблокирован в РФ
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=40
    ),
    "facebook": ServiceConfig(
        name="facebook",
        display_name="Facebook",
        category=ServiceCategory.SOCIAL,
        url="https://www.facebook.com/r.php",
        requires_proxy=True,  # Заблокирован в РФ
        requires_email=True,
        requires_sms=True,
        sms_wait_timeout=600,
        cooldown_minutes=120,  # Facebook строгий
        warmup_days=14
    ),
    "vk": ServiceConfig(
        name="vk",
        display_name="VKontakte",
        category=ServiceCategory.SOCIAL,
        url="https://vk.com/join",
        requires_proxy=False,
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=20
    ),
    "ok": ServiceConfig(
        name="ok",
        display_name="Odnoklassniki",
        category=ServiceCategory.SOCIAL,
        url="https://ok.ru/dk?st.cmd=anonymRegistrationStartPhone",
        requires_proxy=False,
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=20
    ),
    "linkedin": ServiceConfig(
        name="linkedin",
        display_name="LinkedIn",
        category=ServiceCategory.PROFESSIONAL,
        url="https://www.linkedin.com/signup",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=60,
        warmup_days=10
    ),
    "pinterest": ServiceConfig(
        name="pinterest",
        display_name="Pinterest",
        category=ServiceCategory.SOCIAL,
        url="https://www.pinterest.com/signup/",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=30
    ),
    "reddit": ServiceConfig(
        name="reddit",
        display_name="Reddit",
        category=ServiceCategory.SOCIAL,
        url="https://www.reddit.com/register/",
        requires_proxy=True,  # Заблокирован в РФ
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=45
    ),
    "snapchat": ServiceConfig(
        name="snapchat",
        display_name="Snapchat",
        category=ServiceCategory.SOCIAL,
        url="https://accounts.snapchat.com/accounts/signup",
        requires_proxy=False,
        requires_email=True,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=30
    ),
    
    # Мессенджеры
    "telegram": ServiceConfig(
        name="telegram",
        display_name="Telegram",
        category=ServiceCategory.MESSAGING,
        url="https://web.telegram.org/",
        requires_proxy=False,
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=60
    ),
    "whatsapp": ServiceConfig(
        name="whatsapp",
        display_name="WhatsApp Business",
        category=ServiceCategory.MESSAGING,
        url="https://www.whatsapp.com/business/",
        requires_proxy=False,
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=45
    ),
    "discord": ServiceConfig(
        name="discord",
        display_name="Discord",
        category=ServiceCategory.MESSAGING,
        url="https://discord.com/register",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=30
    ),
    
    # Стриминг
    "twitch": ServiceConfig(
        name="twitch",
        display_name="Twitch",
        category=ServiceCategory.STREAMING,
        url="https://www.twitch.tv/signup",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=30
    ),
    "spotify": ServiceConfig(
        name="spotify",
        display_name="Spotify",
        category=ServiceCategory.MUSIC,
        url="https://www.spotify.com/signup",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=30
    ),
    
    # Дейтинг
    "tinder": ServiceConfig(
        name="tinder",
        display_name="Tinder",
        category=ServiceCategory.DATING,
        url="https://tinder.com/",
        requires_proxy=False,
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=60
    ),
    
    # Adult контент
    "onlyfans": ServiceConfig(
        name="onlyfans",
        display_name="OnlyFans",
        category=ServiceCategory.ADULT,
        url="https://onlyfans.com/signup",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=120,
        warmup_days=14
    ),
    
    # Альтернативные платформы
    "likee": ServiceConfig(
        name="likee",
        display_name="Likee",
        category=ServiceCategory.VIDEO,
        url="https://likee.video/",
        requires_proxy=False,
        requires_email=False,
        requires_sms=True,
        sms_wait_timeout=300,
        cooldown_minutes=30
    ),
    "trovo": ServiceConfig(
        name="trovo",
        display_name="Trovo",
        category=ServiceCategory.STREAMING,
        url="https://trovo.live/",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=30
    ),
    "rumble": ServiceConfig(
        name="rumble",
        display_name="Rumble",
        category=ServiceCategory.VIDEO,
        url="https://rumble.com/register.php",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=30
    ),
    "odysee": ServiceConfig(
        name="odysee",
        display_name="Odysee",
        category=ServiceCategory.VIDEO,
        url="https://odysee.com/$/signup",
        requires_proxy=False,
        requires_email=True,
        requires_sms=False,
        cooldown_minutes=30
    ),
}

# Прокси
PROXY = ProxyConfig(
    enabled=False,  # Локально без прокси
    rotation_enabled=False
)

# Прогрев
WARMUP = WarmupConfig(
    enabled=True,
    duration_days=7
)

# Монетизация
MONETIZATION = MonetizationConfig(
    enabled=True
)

# Пути
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
PROFILES_DIR = os.path.join(BASE_DIR, "profiles")

# Файлы данных
ACCOUNTS_DB = os.path.join(STORAGE_DIR, "accounts.json")
PROXIES_FILE = os.path.join(STORAGE_DIR, "proxies.txt")
SMS_QUEUE_FILE = os.path.join(STORAGE_DIR, "sms_queue.json")
WARMUP_QUEUE_FILE = os.path.join(STORAGE_DIR, "warmup_queue.json")
MONETIZATION_QUEUE_FILE = os.path.join(STORAGE_DIR, "monetization_queue.json")

# ADB настройки
ADB_DEVICE_ID = None  # Автоопределение
ADB_SMS_TIMEOUT = 300  # секунд ожидания SMS

# Browser настройки
HEADLESS = False  # Показывать браузер для отладки
BROWSER_TIMEOUT = 60000  # мс

# Логирование
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
