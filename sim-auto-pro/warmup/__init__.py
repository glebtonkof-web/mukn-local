"""
SIM Auto-Registration PRO - Account Warmup System
МУКН Enterprise AI Automation Platform

Система прогрева аккаунтов для избежания банов:
- Естественная активность
- Постепенное увеличение действий
- Имитация реального пользователя
"""

import asyncio
import json
import logging
import os
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path

from playwright.async_api import async_playwright, Browser, Page, BrowserContext

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    WARMUP, ACCOUNTS_DB, PROFILES_DIR, LOGS_DIR,
    HEADLESS, SERVICES
)
from utils import (
    human_click, human_fill, human_navigate, human_typing,
    async_human_delay, random_scroll, random_mouse_movement,
    wait_for_element
)

logger = logging.getLogger(__name__)


# ============================================================================
# МОДЕЛИ ДАННЫХ
# ============================================================================

@dataclass
class WarmupAction:
    """Действие прогрева"""
    action_type: str
    description: str
    executed_at: Optional[datetime] = None
    success: bool = False
    details: Dict = field(default_factory=dict)


@dataclass
class WarmupProgress:
    """Прогресс прогрева аккаунта"""
    account_id: str
    service: str
    username: str
    
    # Прогресс
    current_day: int = 1
    total_days: int = 7
    actions_today: int = 0
    total_actions: int = 0
    
    # Временные метки
    started_at: datetime = field(default_factory=datetime.now)
    last_action_at: Optional[datetime] = None
    
    # История
    actions_history: List[WarmupAction] = field(default_factory=list)
    
    # Статус
    is_complete: bool = False
    is_active: bool = True
    
    def to_dict(self) -> Dict:
        return {
            "account_id": self.account_id,
            "service": self.service,
            "username": self.username,
            "current_day": self.current_day,
            "total_days": self.total_days,
            "actions_today": self.actions_today,
            "total_actions": self.total_actions,
            "started_at": self.started_at.isoformat(),
            "last_action_at": self.last_action_at.isoformat() if self.last_action_at else None,
            "is_complete": self.is_complete,
            "is_active": self.is_active
        }


# ============================================================================
# БАЗОВЫЙ КЛАСС ПРОГРЕВА
# ============================================================================

class BaseWarmup(ABC):
    """Базовый класс для прогрева аккаунтов"""
    
    def __init__(self, account_data: Dict, progress: WarmupProgress = None):
        self.account_data = account_data
        self.progress = progress or WarmupProgress(
            account_id=account_data.get('username', ''),
            service=account_data.get('service', ''),
            username=account_data.get('username', '')
        )
        
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
    
    @property
    @abstractmethod
    def service_name(self) -> str:
        pass
    
    async def initialize(self) -> bool:
        """Инициализация браузера"""
        try:
            self.playwright = await async_playwright().start()
            
            # Используем существующий профиль если есть
            profile_dir = self.account_data.get('profile_dir')
            if not profile_dir or not os.path.exists(profile_dir):
                profile_dir = Path(PROFILES_DIR) / f"{self.service_name}_{self.account_data.get('username')}"
            
            launch_args = [
                '--disable-blink-features=AutomationControlled',
            ]
            
            self.browser = await self.playwright.chromium.launch(
                headless=HEADLESS,
                args=launch_args
            )
            
            self.context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent=self.account_data.get('user_agent', 
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
                locale='ru-RU',
                timezone_id='Europe/Moscow',
            )
            
            # Загружаем cookies если есть
            cookies_file = self.account_data.get('cookies_file')
            if cookies_file and os.path.exists(cookies_file):
                with open(cookies_file, 'r') as f:
                    cookies = json.load(f)
                    await self.context.add_cookies(cookies)
            
            self.page = await self.context.new_page()
            
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
                # Сохраняем cookies
                cookies = await self.context.cookies()
                cookies_file = Path(LOGS_DIR) / f"cookies_{self.service_name}_{self.account_data.get('username')}.json"
                with open(cookies_file, 'w') as f:
                    json.dump(cookies, f)
                
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            self.logger.error(f"Cleanup error: {e}")
    
    @abstractmethod
    async def login(self) -> bool:
        """Вход в аккаунт"""
        pass
    
    @abstractmethod
    async def perform_action(self) -> WarmupAction:
        """Выполнение действия прогрева"""
        pass
    
    async def run_warmup_session(self, actions_count: int = None) -> List[WarmupAction]:
        """
        Запуск сессии прогрева
        
        Args:
            actions_count: Количество действий (если None - случайное)
            
        Returns:
            Список выполненных действий
        """
        if actions_count is None:
            actions_count = random.randint(
                WARMUP.actions_per_day_min,
                WARMUP.actions_per_day_max
            )
        
        actions = []
        
        try:
            if not await self.initialize():
                return actions
            
            if not await self.login():
                self.logger.error("Failed to login")
                return actions
            
            for _ in range(actions_count):
                action = await self.perform_action()
                actions.append(action)
                self.progress.actions_history.append(action)
                self.progress.total_actions += 1
                self.progress.actions_today += 1
                self.progress.last_action_at = datetime.now()
                
                # Задержка между действиями
                delay = random.randint(
                    WARMUP.action_delay_min * 60,
                    WARMUP.action_delay_max * 60
                )
                await asyncio.sleep(delay)
            
        except Exception as e:
            self.logger.error(f"Warmup session error: {e}")
        
        finally:
            await self.cleanup()
        
        return actions


# ============================================================================
# КОНКРЕТНЫЕ РЕАЛИЗАЦИИ ПРОГРЕВА
# ============================================================================

class YouTubeWarmup(BaseWarmup):
    """Прогрев YouTube аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "youtube"
    
    async def login(self) -> bool:
        try:
            await self.page.goto("https://accounts.google.com")
            await async_human_delay(2.0, 3.0)
            
            # Вводим email
            email_input = 'input[type="email"]'
            if await wait_for_element(self.page, email_input, timeout=10000):
                await human_fill(self.page, email_input, self.account_data['email'], simulate_typing=True)
                await human_click(self.page, '#identifierNext button')
                await async_human_delay(2.0, 3.0)
            
            # Вводим пароль
            password_input = 'input[type="password"]'
            if await wait_for_element(self.page, password_input, timeout=10000):
                await human_fill(self.page, password_input, self.account_data['password'], simulate_typing=True)
                await human_click(self.page, '#passwordNext button')
                await async_human_delay(2.0, 3.0)
            
            # Проверяем вход
            await self.page.wait_for_url("**youtube.com**", timeout=30000)
            return True
            
        except Exception as e:
            self.logger.error(f"Login failed: {e}")
            return False
    
    async def perform_action(self) -> WarmupAction:
        actions = [
            self._watch_video,
            self._like_video,
            self._subscribe_channel,
            self._search_videos,
            self._browse_home
        ]
        
        action_func = random.choice(actions)
        return await action_func()
    
    async def _watch_video(self) -> WarmupAction:
        """Смотреть видео"""
        action = WarmupAction(action_type="watch_video", description="Watch a video")
        try:
            await self.page.goto("https://www.youtube.com")
            await async_human_delay(2.0, 3.0)
            
            # Кликаем на случайное видео
            video_selectors = [
                'a#video-title',
                'ytd-rich-item-renderer a#thumbnail'
            ]
            
            for selector in video_selectors:
                videos = await self.page.locator(selector).all()
                if videos:
                    await human_click(self.page, selector, x=random.randint(100, 200), y=random.randint(100, 200))
                    break
            
            # Смотрим видео случайное время
            watch_time = random.randint(30, 180)
            await asyncio.sleep(watch_time)
            
            action.success = True
            action.details = {"watch_time_seconds": watch_time}
            
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _like_video(self) -> WarmupAction:
        """Поставить лайк"""
        action = WarmupAction(action_type="like_video", description="Like a video")
        try:
            like_button = 'button[aria-label*="Нравится"], button[aria-label*="Like"]'
            if await self._check_element_exists(like_button):
                await human_click(self.page, like_button)
                action.success = True
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _subscribe_channel(self) -> WarmupAction:
        """Подписаться на канал"""
        action = WarmupAction(action_type="subscribe", description="Subscribe to channel")
        try:
            sub_button = 'button[aria-label*="Подписаться"], button[aria-label*="Subscribe"]'
            if await self._check_element_exists(sub_button):
                await human_click(self.page, sub_button)
                action.success = True
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _search_videos(self) -> WarmupAction:
        """Поиск видео"""
        action = WarmupAction(action_type="search", description="Search for videos")
        try:
            search_queries = [
                "как сделать", "tutorial", "музыка 2024", "funny cats",
                "путешествия", "рецепты", "обзор", "top 10"
            ]
            
            query = random.choice(search_queries)
            search_input = 'input[name="search_query"]'
            
            if await self._check_element_exists(search_input):
                await human_fill(self.page, search_input, query, simulate_typing=True)
                await self.page.keyboard.press('Enter')
                await async_human_delay(2.0, 4.0)
                action.success = True
                action.details = {"query": query}
                
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _browse_home(self) -> WarmupAction:
        """Просмотр главной страницы"""
        action = WarmupAction(action_type="browse", description="Browse home page")
        try:
            await self.page.goto("https://www.youtube.com")
            await async_human_delay(2.0, 3.0)
            
            # Скроллим страницу
            for _ in range(random.randint(3, 8)):
                await random_scroll(self.page)
                await async_human_delay(1.0, 3.0)
            
            action.success = True
            
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _check_element_exists(self, selector: str) -> bool:
        try:
            count = await self.page.locator(selector).count()
            return count > 0
        except:
            return False


class InstagramWarmup(BaseWarmup):
    """Прогрев Instagram аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "instagram"
    
    async def login(self) -> bool:
        try:
            await self.page.goto("https://www.instagram.com/accounts/login/")
            await async_human_delay(2.0, 3.0)
            
            # Вводим логин
            await human_fill(self.page, 'input[name="username"]', self.account_data['username'], simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Вводим пароль
            await human_fill(self.page, 'input[name="password"]', self.account_data['password'], simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем войти
            await human_click(self.page, 'button[type="submit"]')
            await async_human_delay(3.0, 5.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Login failed: {e}")
            return False
    
    async def perform_action(self) -> WarmupAction:
        actions = [
            self._browse_feed,
            self._like_post,
            self._follow_user,
            self._view_stories,
            self._search_hashtags
        ]
        
        action_func = random.choice(actions)
        return await action_func()
    
    async def _browse_feed(self) -> WarmupAction:
        action = WarmupAction(action_type="browse_feed", description="Browse feed")
        try:
            await self.page.goto("https://www.instagram.com/")
            await async_human_delay(2.0, 3.0)
            
            for _ in range(random.randint(3, 7)):
                await random_scroll(self.page)
                await async_human_delay(1.0, 3.0)
            
            action.success = True
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _like_post(self) -> WarmupAction:
        action = WarmupAction(action_type="like_post", description="Like a post")
        try:
            like_btn = 'svg[aria-label="Нравится"], svg[aria-label="Like"]'
            if await self._check_element_exists(like_btn):
                await human_click(self.page, like_btn)
                action.success = True
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _follow_user(self) -> WarmupAction:
        action = WarmupAction(action_type="follow", description="Follow a user")
        try:
            follow_btn = 'button:has-text("Подписаться"), button:has-text("Follow")'
            if await self._check_element_exists(follow_btn):
                await human_click(self.page, follow_btn)
                action.success = True
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _view_stories(self) -> WarmupAction:
        action = WarmupAction(action_type="view_stories", description="View stories")
        try:
            story_selector = 'div[role="button"] canvas'
            if await self._check_element_exists(story_selector):
                await human_click(self.page, story_selector)
                await async_human_delay(5.0, 15.0)
                action.success = True
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _search_hashtags(self) -> WarmupAction:
        action = WarmupAction(action_type="search_hashtags", description="Search hashtags")
        try:
            hashtags = ["travel", "food", "nature", "photography", "art", "music"]
            tag = random.choice(hashtags)
            
            await self.page.goto(f"https://www.instagram.com/explore/tags/{tag}/")
            await async_human_delay(2.0, 4.0)
            
            action.success = True
            action.details = {"hashtag": tag}
        except Exception as e:
            action.details = {"error": str(e)}
        
        action.executed_at = datetime.now()
        return action
    
    async def _check_element_exists(self, selector: str) -> bool:
        try:
            count = await self.page.locator(selector).count()
            return count > 0
        except:
            return False


# ============================================================================
# МЕНЕДЖЕР ПРОГРЕВА
# ============================================================================

class WarmupManager:
    """Менеджер управления прогревом аккаунтов"""
    
    WARMUP_CLASSES = {
        "youtube": YouTubeWarmup,
        "instagram": InstagramWarmup,
        # Добавить другие сервисы
    }
    
    def __init__(self):
        self.progress_file = Path(LOGS_DIR) / "warmup_progress.json"
        self.progress_data: Dict[str, WarmupProgress] = {}
    
    async def load_progress(self):
        """Загрузка прогресса"""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                data = json.load(f)
                for account_id, prog in data.items():
                    self.progress_data[account_id] = WarmupProgress(
                        account_id=prog['account_id'],
                        service=prog['service'],
                        username=prog['username'],
                        current_day=prog['current_day'],
                        total_days=prog['total_days'],
                        actions_today=prog['actions_today'],
                        total_actions=prog['total_actions']
                    )
    
    async def save_progress(self):
        """Сохранение прогресса"""
        data = {acc_id: prog.to_dict() for acc_id, prog in self.progress_data.items()}
        with open(self.progress_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    async def add_account_to_warmup(self, account_data: Dict) -> bool:
        """Добавление аккаунта в очередь прогрева"""
        service = account_data.get('service')
        username = account_data.get('username')
        
        if service not in self.WARMUP_CLASSES:
            logger.warning(f"No warmup class for service: {service}")
            return False
        
        account_id = f"{service}_{username}"
        
        if account_id in self.progress_data:
            logger.info(f"Account already in warmup: {account_id}")
            return True
        
        progress = WarmupProgress(
            account_id=account_id,
            service=service,
            username=username,
            total_days=WARMUP.duration_days
        )
        
        self.progress_data[account_id] = progress
        await self.save_progress()
        
        logger.info(f"Added account to warmup: {account_id}")
        return True
    
    async def run_warmup_cycle(self):
        """Запуск цикла прогрева для всех аккаунтов"""
        await self.load_progress()
        
        for account_id, progress in self.progress_data.items():
            if not progress.is_active or progress.is_complete:
                continue
            
            # Проверяем время активности
            current_hour = datetime.now().hour
            if not (WARMUP.active_hours_start <= current_hour <= WARMUP.active_hours_end):
                continue
            
            # Проверяем день прогрева
            days_since_start = (datetime.now() - progress.started_at).days + 1
            
            if days_since_start > progress.total_days:
                progress.is_complete = True
                continue
            
            if days_since_start > progress.current_day:
                progress.current_day = days_since_start
                progress.actions_today = 0
            
            # Загружаем данные аккаунта
            account_data = await self._get_account_data(progress.service, progress.username)
            if not account_data:
                continue
            
            # Запускаем прогрев
            warmup_class = self.WARMUP_CLASSES.get(progress.service)
            if warmup_class:
                warmup = warmup_class(account_data, progress)
                await warmup.run_warmup_session()
        
        await self.save_progress()
    
    async def _get_account_data(self, service: str, username: str) -> Optional[Dict]:
        """Получение данных аккаунта"""
        if os.path.exists(ACCOUNTS_DB):
            with open(ACCOUNTS_DB, 'r') as f:
                accounts = json.load(f)
                for acc in accounts:
                    if acc.get('service') == service and acc.get('username') == username:
                        return acc
        return None


__all__ = [
    'BaseWarmup',
    'YouTubeWarmup',
    'InstagramWarmup',
    'WarmupManager',
    'WarmupProgress',
    'WarmupAction',
]
