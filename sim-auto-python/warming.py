"""
SIM Auto-Registration PRO - Warming Module
Система прогрева аккаунтов для избежания банов
"""

import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum


class WarmingPhase(Enum):
    """Фазы прогрева аккаунта"""
    GHOST = "ghost"           # 1-5 дней: только просмотр, никаких действий
    OBSERVER = "observer"     # 5-10 дней: лайки, подписки (минимум)
    ACTIVE = "active"         # 10-21 день: активное использование
    PROFIT = "profit"         # 21+ день: монетизация


class WarmingAction(Enum):
    """Действия при прогреве"""
    VIEW = "view"             # Просмотр контента
    LIKE = "like"             # Лайк
    FOLLOW = "follow"         # Подписка
    COMMENT = "comment"       # Комментарий
    SHARE = "share"           # Репост
    MESSAGE = "message"       # Сообщение
    POST = "post"             # Публикация
    SEARCH = "search"         # Поиск
    SCROLL = "scroll"         # Скролл


# =============================================================================
# КОНФИГУРАЦИИ ПРОГРЕВА ПО ПЛАТФОРМАМ
# =============================================================================

WARMING_CONFIGS = {
    'instagram': {
        'duration_days': 21,
        'phases': {
            WarmingPhase.GHOST: {
                'days': (1, 5),
                'actions_per_day': {
                    WarmingAction.VIEW: (20, 50),
                    WarmingAction.SCROLL: (10, 30),
                    WarmingAction.SEARCH: (3, 5),
                },
                'session_duration': (10, 20),  # минут
                'sessions_per_day': (2, 4),
            },
            WarmingPhase.OBSERVER: {
                'days': (6, 10),
                'actions_per_day': {
                    WarmingAction.VIEW: (30, 60),
                    WarmingAction.LIKE: (5, 15),
                    WarmingAction.FOLLOW: (2, 5),
                    WarmingAction.SEARCH: (5, 10),
                },
                'session_duration': (15, 30),
                'sessions_per_day': (3, 5),
            },
            WarmingPhase.ACTIVE: {
                'days': (11, 21),
                'actions_per_day': {
                    WarmingAction.VIEW: (40, 80),
                    WarmingAction.LIKE: (15, 30),
                    WarmingAction.FOLLOW: (5, 10),
                    WarmingAction.COMMENT: (1, 3),
                    WarmingAction.SEARCH: (5, 10),
                },
                'session_duration': (20, 45),
                'sessions_per_day': (3, 6),
            },
            WarmingPhase.PROFIT: {
                'days': (22, 999),
                'actions_per_day': {
                    WarmingAction.VIEW: (50, 100),
                    WarmingAction.LIKE: (20, 40),
                    WarmingAction.FOLLOW: (10, 20),
                    WarmingAction.COMMENT: (3, 8),
                    WarmingAction.POST: (1, 2),
                },
                'session_duration': (30, 60),
                'sessions_per_day': (4, 8),
            },
        },
        'risk_limits': {
            'max_likes_per_hour': 30,
            'max_follows_per_hour': 15,
            'max_comments_per_hour': 5,
            'min_action_delay': 30,  # секунд
            'max_actions_per_day': 150,
        },
    },
    
    'tiktok': {
        'duration_days': 28,
        'phases': {
            WarmingPhase.GHOST: {
                'days': (1, 7),
                'actions_per_day': {
                    WarmingAction.VIEW: (30, 60),
                    WarmingAction.SCROLL: (20, 40),
                },
                'session_duration': (15, 30),
                'sessions_per_day': (2, 4),
            },
            WarmingPhase.OBSERVER: {
                'days': (8, 14),
                'actions_per_day': {
                    WarmingAction.VIEW: (50, 100),
                    WarmingAction.LIKE: (10, 25),
                    WarmingAction.FOLLOW: (3, 7),
                },
                'session_duration': (20, 40),
                'sessions_per_day': (3, 5),
            },
            WarmingPhase.ACTIVE: {
                'days': (15, 28),
                'actions_per_day': {
                    WarmingAction.VIEW: (60, 120),
                    WarmingAction.LIKE: (25, 50),
                    WarmingAction.FOLLOW: (8, 15),
                    WarmingAction.COMMENT: (2, 5),
                },
                'session_duration': (30, 60),
                'sessions_per_day': (4, 7),
            },
            WarmingPhase.PROFIT: {
                'days': (29, 999),
                'actions_per_day': {
                    WarmingAction.VIEW: (80, 150),
                    WarmingAction.LIKE: (30, 60),
                    WarmingAction.FOLLOW: (10, 20),
                    WarmingAction.COMMENT: (5, 10),
                    WarmingAction.POST: (1, 3),
                },
                'session_duration': (40, 90),
                'sessions_per_day': (5, 10),
            },
        },
        'risk_limits': {
            'max_likes_per_hour': 50,
            'max_follows_per_hour': 20,
            'max_comments_per_hour': 10,
            'min_action_delay': 20,
            'max_actions_per_day': 200,
        },
    },
    
    'twitter': {
        'duration_days': 14,
        'phases': {
            WarmingPhase.GHOST: {
                'days': (1, 3),
                'actions_per_day': {
                    WarmingAction.VIEW: (20, 40),
                    WarmingAction.SEARCH: (5, 10),
                },
                'session_duration': (10, 20),
                'sessions_per_day': (2, 3),
            },
            WarmingPhase.OBSERVER: {
                'days': (4, 7),
                'actions_per_day': {
                    WarmingAction.VIEW: (30, 60),
                    WarmingAction.LIKE: (5, 15),
                    WarmingAction.FOLLOW: (3, 8),
                },
                'session_duration': (15, 30),
                'sessions_per_day': (3, 5),
            },
            WarmingPhase.ACTIVE: {
                'days': (8, 14),
                'actions_per_day': {
                    WarmingAction.VIEW: (40, 80),
                    WarmingAction.LIKE: (15, 30),
                    WarmingAction.FOLLOW: (8, 15),
                    WarmingAction.COMMENT: (2, 5),
                },
                'session_duration': (20, 45),
                'sessions_per_day': (4, 6),
            },
            WarmingPhase.PROFIT: {
                'days': (15, 999),
                'actions_per_day': {
                    WarmingAction.VIEW: (60, 100),
                    WarmingAction.LIKE: (25, 50),
                    WarmingAction.FOLLOW: (15, 30),
                    WarmingAction.COMMENT: (5, 15),
                    WarmingAction.POST: (3, 8),
                },
                'session_duration': (30, 60),
                'sessions_per_day': (5, 10),
            },
        },
        'risk_limits': {
            'max_likes_per_hour': 40,
            'max_follows_per_hour': 25,
            'max_comments_per_hour': 8,
            'min_action_delay': 25,
            'max_actions_per_day': 180,
        },
    },
    
    'telegram': {
        'duration_days': 14,
        'phases': {
            WarmingPhase.GHOST: {
                'days': (1, 3),
                'actions_per_day': {
                    WarmingAction.VIEW: (10, 20),
                    WarmingAction.SEARCH: (2, 5),
                },
                'session_duration': (5, 15),
                'sessions_per_day': (2, 4),
            },
            WarmingPhase.OBSERVER: {
                'days': (4, 7),
                'actions_per_day': {
                    WarmingAction.VIEW: (20, 40),
                    WarmingAction.MESSAGE: (2, 5),
                    WarmingAction.FOLLOW: (1, 3),  # Join channels
                },
                'session_duration': (10, 25),
                'sessions_per_day': (3, 5),
            },
            WarmingPhase.ACTIVE: {
                'days': (8, 14),
                'actions_per_day': {
                    WarmingAction.VIEW: (30, 60),
                    WarmingAction.MESSAGE: (5, 15),
                    WarmingAction.FOLLOW: (3, 8),
                },
                'session_duration': (15, 35),
                'sessions_per_day': (4, 7),
            },
            WarmingPhase.PROFIT: {
                'days': (15, 999),
                'actions_per_day': {
                    WarmingAction.VIEW: (50, 100),
                    WarmingAction.MESSAGE: (10, 30),
                    WarmingAction.FOLLOW: (5, 15),
                    WarmingAction.POST: (1, 5),
                },
                'session_duration': (20, 45),
                'sessions_per_day': (5, 10),
            },
        },
        'risk_limits': {
            'max_messages_per_hour': 15,
            'max_joins_per_hour': 5,
            'min_action_delay': 60,
            'max_actions_per_day': 80,
        },
    },
}

# Дефолтная конфигурация для остальных платформ
DEFAULT_WARMING_CONFIG = {
    'duration_days': 14,
    'phases': {
        WarmingPhase.GHOST: {
            'days': (1, 3),
            'actions_per_day': {
                WarmingAction.VIEW: (10, 30),
                WarmingAction.SCROLL: (5, 15),
            },
            'session_duration': (10, 20),
            'sessions_per_day': (2, 3),
        },
        WarmingPhase.OBSERVER: {
            'days': (4, 7),
            'actions_per_day': {
                WarmingAction.VIEW: (20, 40),
                WarmingAction.LIKE: (3, 10),
                WarmingAction.FOLLOW: (2, 5),
            },
            'session_duration': (15, 30),
            'sessions_per_day': (3, 5),
        },
        WarmingPhase.ACTIVE: {
            'days': (8, 14),
            'actions_per_day': {
                WarmingAction.VIEW: (30, 60),
                WarmingAction.LIKE: (10, 20),
                WarmingAction.FOLLOW: (5, 10),
            },
            'session_duration': (20, 40),
            'sessions_per_day': (4, 6),
        },
        WarmingPhase.PROFIT: {
            'days': (15, 999),
            'actions_per_day': {
                WarmingAction.VIEW: (40, 80),
                WarmingAction.LIKE: (15, 30),
                WarmingAction.FOLLOW: (8, 15),
                WarmingAction.POST: (1, 3),
            },
            'session_duration': (25, 50),
            'sessions_per_day': (5, 8),
        },
    },
    'risk_limits': {
        'max_likes_per_hour': 30,
        'max_follows_per_hour': 15,
        'min_action_delay': 30,
        'max_actions_per_day': 100,
    },
}


# =============================================================================
# КЛАСС ПРОГРЕВА
# =============================================================================

class WarmingManager:
    """Менеджер прогрева аккаунтов"""
    
    def __init__(self, storage):
        self.storage = storage
        self.warming_accounts: Dict[str, Dict] = {}
    
    def get_config(self, platform: str) -> Dict:
        """Получение конфигурации прогрева для платформы"""
        return WARMING_CONFIGS.get(platform, DEFAULT_WARMING_CONFIG)
    
    def get_current_phase(self, platform: str, days_active: int) -> WarmingPhase:
        """Определение текущей фазы прогрева"""
        config = self.get_config(platform)
        
        for phase, phase_config in config['phases'].items():
            start_day, end_day = phase_config['days']
            if start_day <= days_active <= end_day:
                return phase
        
        return WarmingPhase.PROFIT  # По умолчанию - фаза монетизации
    
    def generate_daily_plan(self, platform: str, days_active: int) -> Dict:
        """
        Генерация плана действий на день
        
        Returns:
            Словарь с действиями и их количеством на сегодня
        """
        config = self.get_config(platform)
        phase = self.get_current_phase(platform, days_active)
        phase_config = config['phases'][phase]
        
        plan = {
            'phase': phase.value,
            'days_active': days_active,
            'sessions': [],
            'actions': {},
            'risk_limits': config['risk_limits'],
        }
        
        # Генерация количества действий
        for action, (min_val, max_val) in phase_config['actions_per_day'].items():
            count = random.randint(min_val, max_val)
            plan['actions'][action.value] = count
        
        # Генерация сессий
        sessions_count = random.randint(*phase_config['sessions_per_day'])
        session_duration = phase_config['session_duration']
        
        # Распределение сессий по времени дня
        day_hours = list(range(8, 24))  # С 8:00 до 23:00
        random.shuffle(day_hours)
        session_times = sorted(day_hours[:sessions_count])
        
        for hour in session_times:
            duration = random.randint(*session_duration)
            plan['sessions'].append({
                'hour': hour,
                'duration_minutes': duration,
                'random_delay': random.randint(0, 30),
            })
        
        return plan
    
    def calculate_action_delay(self, platform: str, action: WarmingAction) -> float:
        """Расчёт задержки между действиями"""
        config = self.get_config(platform)
        limits = config['risk_limits']
        
        base_delay = limits.get('min_action_delay', 30)
        
        # Добавляем случайность
        delay = base_delay + random.uniform(-5, 15)
        
        # Для более агрессивных действий - больше задержка
        if action in [WarmingAction.COMMENT, WarmingAction.POST, WarmingAction.MESSAGE]:
            delay *= 2
        
        return max(5, delay)
    
    def check_risk_limits(self, platform: str, actions_today: Dict[str, int]) -> Dict[str, Any]:
        """Проверка лимитов риска"""
        config = self.get_config(platform)
        limits = config['risk_limits']
        
        warnings = []
        
        for action, count in actions_today.items():
            limit_key = f'max_{action}s_per_hour'
            if limit_key in limits and count > limits[limit_key]:
                warnings.append(f"{action}: {count} exceeds limit {limits[limit_key]}")
        
        total_actions = sum(actions_today.values())
        if total_actions > limits.get('max_actions_per_day', 100):
            warnings.append(f"Total actions {total_actions} exceeds daily limit")
        
        return {
            'safe': len(warnings) == 0,
            'warnings': warnings,
            'total_actions': total_actions,
        }
    
    def generate_schedule(self, platform: str, days: int = 30) -> List[Dict]:
        """Генерация расписания прогрева на N дней"""
        schedule = []
        
        for day in range(1, days + 1):
            plan = self.generate_daily_plan(platform, day)
            schedule.append({
                'day': day,
                'date': (datetime.now() + timedelta(days=day-1)).strftime('%Y-%m-%d'),
                'phase': plan['phase'],
                'actions': plan['actions'],
                'sessions': plan['sessions'],
            })
        
        return schedule


# =============================================================================
# ЭКСПОРТ
# =============================================================================

__all__ = [
    'WarmingPhase',
    'WarmingAction',
    'WarmingManager',
    'WARMING_CONFIGS',
    'DEFAULT_WARMING_CONFIG',
]
