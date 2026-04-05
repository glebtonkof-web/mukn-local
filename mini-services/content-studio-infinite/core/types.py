"""
Content Studio Infinite - Core Types
Типы данных для всей системы

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel


class AccountStatus(str, Enum):
    """Статус аккаунта"""
    ACTIVE = "active"
    RATE_LIMITED = "rate_limited"
    BANNED = "banned"
    ERROR = "error"
    COOKIES_EXPIRED = "cookies_expired"
    REGISTERING = "registering"


class ProviderState(str, Enum):
    """Состояние провайдера"""
    AVAILABLE = "available"
    RATE_LIMITED = "rate_limited"
    ERROR = "error"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class TaskStatus(str, Enum):
    """Статус задачи"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ContentType(str, Enum):
    """Тип контента"""
    VIDEO = "video"
    IMAGE = "image"
    AUDIO = "audio"
    TEXT = "text"


class TaskPriority(str, Enum):
    """Приоритет задачи"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class ProviderAccount:
    """Аккаунт провайдера"""
    account_id: str
    provider: str
    email: str
    password: str
    status: AccountStatus = AccountStatus.ACTIVE
    
    # Cookies и сессия
    cookies: List[Dict] = field(default_factory=list)
    session_data: Dict[str, Any] = field(default_factory=dict)
    
    # Лимиты
    credits_remaining: int = 0
    credits_total: int = 0
    requests_today: int = 0
    requests_this_hour: int = 0
    
    # Временные метки
    created_at: datetime = field(default_factory=datetime.now)
    last_used_at: Optional[datetime] = None
    last_error: Optional[str] = None
    
    # Прокси
    proxy: Optional[Dict] = None
    
    # Метаданные
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """Конвертация в словарь"""
        return {
            'account_id': self.account_id,
            'provider': self.provider,
            'email': self.email,
            'password': self.password,
            'status': self.status.value,
            'credits_remaining': self.credits_remaining,
            'credits_total': self.credits_total,
            'requests_today': self.requests_today,
            'requests_this_hour': self.requests_this_hour,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'last_error': self.last_error,
            'proxy': self.proxy,
        }


@dataclass
class GenerationTask:
    """Задача на генерацию"""
    task_id: str
    prompt: str
    content_type: ContentType = ContentType.VIDEO
    
    # Параметры видео
    duration: float = 10.0
    aspect_ratio: str = "9:16"
    style: Optional[str] = None
    
    # Провайдер
    provider: Optional[str] = None  # None = авто-выбор
    account_id: Optional[str] = None
    
    # Статус
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.NORMAL
    
    # Результат
    result_path: Optional[str] = None
    result_url: Optional[str] = None
    error: Optional[str] = None
    
    # Временные метки
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Retry
    attempts: int = 0
    max_attempts: int = 3
    
    # Метаданные
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """Конвертация в словарь"""
        return {
            'task_id': self.task_id,
            'prompt': self.prompt,
            'content_type': self.content_type.value,
            'duration': self.duration,
            'aspect_ratio': self.aspect_ratio,
            'style': self.style,
            'provider': self.provider,
            'account_id': self.account_id,
            'status': self.status.value,
            'priority': self.priority.value,
            'result_path': self.result_path,
            'result_url': self.result_url,
            'error': self.error,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'attempts': self.attempts,
            'max_attempts': self.max_attempts,
        }


@dataclass
class ProviderInfo:
    """Информация о провайдере"""
    name: str
    display_name: str
    url: str
    enabled: bool = True
    state: ProviderState = ProviderState.UNKNOWN
    
    # Лимиты
    daily_credits: int = 100
    max_requests_per_hour: int = 5
    max_requests_per_day: int = 50
    
    # Возможности
    video_durations: List[int] = field(default_factory=lambda: [5, 10])
    aspect_ratios: List[str] = field(default_factory=lambda: ["9:16", "16:9", "1:1"])
    supports_image_to_video: bool = False
    
    # Регистрация
    auto_register: bool = True
    priority: int = 1
    
    # Статистика
    total_accounts: int = 0
    active_accounts: int = 0
    total_generated: int = 0
    
    def to_dict(self) -> Dict:
        """Конвертация в словарь"""
        return {
            'name': self.name,
            'display_name': self.display_name,
            'url': self.url,
            'enabled': self.enabled,
            'state': self.state.value,
            'daily_credits': self.daily_credits,
            'video_durations': self.video_durations,
            'auto_register': self.auto_register,
            'priority': self.priority,
            'total_accounts': self.total_accounts,
            'active_accounts': self.active_accounts,
            'total_generated': self.total_generated,
        }


class GenerationResult(BaseModel):
    """Результат генерации"""
    success: bool
    task_id: str
    content_type: str
    provider: Optional[str] = None
    account_id: Optional[str] = None
    
    # Результат
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    duration: float = 0.0
    file_size: int = 0
    
    # Ошибки
    error: Optional[str] = None
    
    # Метаданные
    metadata: Dict[str, Any] = {}


class StitchResult(BaseModel):
    """Результат склейки видео"""
    success: bool
    output_path: Optional[str] = None
    output_url: Optional[str] = None
    total_duration: float = 0.0
    clips_count: int = 0
    transitions: List[str] = []
    error: Optional[str] = None


# API Models

class GenerateRequest(BaseModel):
    """Запрос на генерацию"""
    prompt: str
    content_type: str = "video"
    duration: float = 10.0
    aspect_ratio: str = "9:16"
    style: Optional[str] = None
    provider: Optional[str] = None
    priority: str = "normal"


class GenerateResponse(BaseModel):
    """Ответ на запрос генерации"""
    success: bool
    task_id: str
    message: str


class TaskStatusResponse(BaseModel):
    """Ответ о статусе задачи"""
    task_id: str
    status: str
    progress: float = 0.0
    result: Optional[GenerationResult] = None


class ProviderStatusResponse(BaseModel):
    """Ответ о статусе провайдеров"""
    providers: List[Dict[str, Any]]
    total_accounts: int
    active_accounts: int
    total_credits: int


class AccountsResponse(BaseModel):
    """Ответ о аккаунтах"""
    provider: str
    accounts: List[Dict[str, Any]]
    total: int
    active: int


class StatsResponse(BaseModel):
    """Статистика системы"""
    uptime_seconds: float
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    total_videos_generated: int
    total_video_minutes: float
    active_workers: int
    queue_size: int
