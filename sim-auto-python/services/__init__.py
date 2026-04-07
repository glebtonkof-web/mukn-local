"""
SIM Auto-Registration PRO - Services Module
Все сервисы регистрации
"""

from .base import BaseRegistrationService, RegistrationResult
from .youtube import YouTubeService
from .tiktok import TikTokService
from .instagram import InstagramService
from .twitter import TwitterService
from .telegram import TelegramService
from .discord import DiscordService
from .twitch import TwitchService
from .linkedin import LinkedInService
from .reddit import RedditService
from .facebook import FacebookService
from .vk import VKService
from .whatsapp import WhatsAppService
from .odnoklassniki import OKService
from .spotify import SpotifyService
from .tinder import TinderService
from .snapchat import SnapchatService
from .pinterest import PinterestService
from .onlyfans import OnlyFansService
from .streaming import LikeeService, TrovoService, RumbleService, OdyseeService

# Словарь всех сервисов
SERVICES = {
    'youtube': YouTubeService,
    'tiktok': TikTokService,
    'instagram': InstagramService,
    'twitter': TwitterService,
    'telegram': TelegramService,
    'discord': DiscordService,
    'twitch': TwitchService,
    'linkedin': LinkedInService,
    'reddit': RedditService,
    'facebook': FacebookService,
    'vk': VKService,
    'whatsapp': WhatsAppService,
    'odnoklassniki': OKService,
    'spotify': SpotifyService,
    'tinder': TinderService,
    'snapchat': SnapchatService,
    'pinterest': PinterestService,
    'onlyfans': OnlyFansService,
    'likee': LikeeService,
    'trovo': TrovoService,
    'rumble': RumbleService,
    'odysee': OdyseeService,
}

# Сервисы, заблокированные в РФ (требуют VPN/Proxy)
BLOCKED_IN_RUSSIA = ['tiktok', 'twitter', 'reddit', 'facebook']

# Сервисы с SMS верификацией
SMS_VERIFICATION_REQUIRED = [
    'youtube', 'tiktok', 'instagram', 'twitter', 'telegram',
    'facebook', 'vk', 'odnoklassniki', 'tinder', 'snapchat',
    'linkedin', 'twitch'
]

# Сервисы с email верификацией
EMAIL_VERIFICATION_REQUIRED = [
    'discord', 'reddit', 'spotify', 'onlyfans', 'pinterest',
    'trovo', 'rumble', 'odysee'
]


def get_service(name: str):
    """Получение сервиса по имени"""
    return SERVICES.get(name.lower())


def list_services():
    """Список всех доступных сервисов"""
    return list(SERVICES.keys())


__all__ = [
    'BaseRegistrationService',
    'RegistrationResult',
    'YouTubeService',
    'TikTokService',
    'InstagramService',
    'TwitterService',
    'TelegramService',
    'DiscordService',
    'TwitchService',
    'LinkedInService',
    'RedditService',
    'FacebookService',
    'VKService',
    'WhatsAppService',
    'OKService',
    'SpotifyService',
    'TinderService',
    'SnapchatService',
    'PinterestService',
    'OnlyFansService',
    'LikeeService',
    'TrovoService',
    'RumbleService',
    'OdyseeService',
    'SERVICES',
    'BLOCKED_IN_RUSSIA',
    'SMS_VERIFICATION_REQUIRED',
    'EMAIL_VERIFICATION_REQUIRED',
    'get_service',
    'list_services',
]
