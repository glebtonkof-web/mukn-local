"""
Content Studio Infinite - Infinite Generator
Главный класс для бесконечной генерации видео

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import asyncio
import random
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from loguru import logger

from .types import (
    GenerationTask, GenerationResult, TaskStatus, AccountStatus,
    ProviderInfo, ProviderState
)
from .account_pool import AccountPool
from .task_queue import TaskQueue
from .auto_register import AutoRegistrar, AutoRegisterManager
from .temp_email import TempEmailManager
from .prompt_variator import PromptVariator
from .video_stitcher import VideoStitcher


class InfiniteGenerator:
    """
    Бесконечный генератор контента.
    
    Главная идея: Лимиты есть у каждого сервиса,
    но нет лимитов на количество аккаунтов.
    
    Система сама создаёт новые аккаунты, когда старые
    исчерпывают дневной лимит.
    """
    
    PROVIDER_CONFIGS = {
        'pollo': {
            'display_name': 'Pollo AI',
            'url': 'https://pollo.ai',
            'daily_credits': 50,
            'max_requests_per_hour': 5,
            'video_durations': [4, 5, 6, 7, 8, 9, 10, 11, 12, 15],
            'auto_register': True,
            'priority': 0,  # Высший приоритет
            'features': {
                'image_to_video': True,
                'auto_audio': True,
                'models_access': 50,
            }
        },
        'kling': {
            'display_name': 'Kling AI',
            'url': 'https://klingai.com',
            'daily_credits': 100,
            'max_requests_per_hour': 5,
            'video_durations': [5, 10],
            'auto_register': True,
            'priority': 1,
        },
        'wan': {
            'display_name': 'Wan.video',
            'url': 'https://wan.video',
            'daily_credits': 30,
            'max_requests_per_hour': 5,
            'video_durations': [10],
            'auto_register': True,
            'priority': 2,
        },
        'digen': {
            'display_name': 'Digen.ai',
            'url': 'https://digen.ai',
            'daily_credits': 25,
            'max_requests_per_hour': 4,
            'video_durations': [5],
            'auto_register': True,
            'priority': 3,
        },
        'qwen': {
            'display_name': 'Qwen AI',
            'url': 'https://qwen.ai',
            'daily_credits': 20,
            'max_requests_per_hour': 4,
            'video_durations': [5, 10],
            'auto_register': True,
            'priority': 4,
        },
        'runway': {
            'display_name': 'Runway Gen-3',
            'url': 'https://runwayml.com',
            'daily_credits': 125,
            'max_requests_per_hour': 5,
            'video_durations': [10],
            'auto_register': True,
            'priority': 5,
        },
        'luma': {
            'display_name': 'Luma Dream Machine',
            'url': 'https://lumalabs.ai',
            'daily_credits': 30,
            'max_requests_per_hour': 5,
            'video_durations': [5],
            'auto_register': True,
            'priority': 6,
        },
        'pika': {
            'display_name': 'Pika Labs',
            'url': 'https://pika.art',
            'daily_credits': 50,
            'max_requests_per_hour': 5,
            'video_durations': [5, 10],
            'auto_register': True,
            'priority': 7,
        },
        'haiper': {
            'display_name': 'Haiper AI',
            'url': 'https://haiper.ai',
            'daily_credits': 20,
            'max_requests_per_hour': 4,
            'video_durations': [5, 10],
            'auto_register': True,
            'priority': 8,
        },
        'vidu': {
            'display_name': 'Vidu Studio',
            'url': 'https://vidu.studio',
            'daily_credits': 15,
            'max_requests_per_hour': 3,
            'video_durations': [5, 10],
            'auto_register': True,
            'priority': 9,
        },
    }
    
    def __init__(
        self,
        db_path: str = "./data/content_studio.db",
        output_dir: str = "./data/videos/raw",
        headless: bool = True,
        parallel_workers: int = 5,
        min_accounts_per_provider: int = 5,
        max_accounts_per_provider: int = 50
    ):
        self.db_path = db_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.headless = headless
        self.parallel_workers = parallel_workers
        
        # Компоненты
        self.pool = AccountPool(db_path)
        self.queue = TaskQueue(db_path)
        self.email_manager = TempEmailManager()
        self.registrar = AutoRegistrar(self.pool, self.email_manager, headless)
        self.variator = PromptVariator()
        self.stitcher = VideoStitcher()
        
        # Auto-register manager
        self.auto_register_manager = AutoRegisterManager(
            self.pool, self.registrar,
            min_accounts=min_accounts_per_provider,
            max_accounts=max_accounts_per_provider
        )
        
        # Workers
        self._workers: List[asyncio.Task] = []
        self._running = False
        self._start_time: Optional[datetime] = None
        
        # Статистика
        self.stats = {
            'total_generated': 0,
            'total_minutes': 0.0,
            'total_tasks': 0,
            'completed_tasks': 0,
            'failed_tasks': 0,
        }
    
    async def start(self) -> None:
        """Запуск генератора"""
        logger.info("Starting Infinite Generator...")
        
        self._running = True
        self._start_time = datetime.now()
        
        # Запуск воркеров
        for i in range(self.parallel_workers):
            worker = asyncio.create_task(self._worker(i))
            self._workers.append(worker)
        
        # Запуск мониторинга аккаунтов
        monitor_task = asyncio.create_task(self._account_monitor())
        self._workers.append(monitor_task)
        
        # Запуск мониторинга авто-регистрации
        register_task = asyncio.create_task(
            self.auto_register_manager.start_monitoring(check_interval=600)
        )
        self._workers.append(register_task)
        
        logger.info(f"Started {self.parallel_workers} generation workers")
    
    async def stop(self) -> None:
        """Остановка генератора"""
        logger.info("Stopping Infinite Generator...")
        
        self._running = False
        self.auto_register_manager.stop_monitoring()
        
        # Отмена воркеров
        for worker in self._workers:
            worker.cancel()
        
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        
        # Закрытие ресурсов
        await self.pool.close()
        
        logger.info("Infinite Generator stopped")
    
    async def _worker(self, worker_id: int) -> None:
        """Воркер генерации"""
        logger.debug(f"Worker {worker_id} started")
        
        while self._running:
            try:
                # Получаем задачу
                task = await self.queue.get_next_task()
                
                if not task:
                    # Нет задач - ждём
                    await asyncio.sleep(5)
                    continue
                
                logger.info(f"Worker {worker_id}: Processing task {task.task_id}")
                
                # Выбираем провайдера и аккаунт
                provider, account = await self._select_provider_and_account(task)
                
                if not provider or not account:
                    # Нет доступных аккаунтов
                    logger.warning(f"Worker {worker_id}: No available accounts")
                    self.queue.complete_task(
                        task.task_id,
                        error="No available accounts"
                    )
                    continue
                
                # Генерируем
                result = await self._generate(task, provider, account)
                
                if result.success:
                    self.queue.complete_task(
                        task.task_id,
                        result_path=result.file_path,
                        result_url=result.file_url
                    )
                    self.stats['total_generated'] += 1
                    self.stats['total_minutes'] += result.duration / 60
                    self.stats['completed_tasks'] += 1
                    
                    self.pool.record_usage(account.account_id, success=True)
                else:
                    self.queue.complete_task(
                        task.task_id,
                        error=result.error
                    )
                    self.stats['failed_tasks'] += 1
                    
                    self.pool.mark_account_error(
                        account.account_id,
                        result.error or "Generation failed"
                    )
                
                # Случайная задержка для антибана
                delay = random.uniform(2, 10)
                await asyncio.sleep(delay)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception(f"Worker {worker_id} error: {e}")
                await asyncio.sleep(10)
        
        logger.debug(f"Worker {worker_id} stopped")
    
    async def _select_provider_and_account(
        self,
        task: GenerationTask
    ) -> tuple:
        """Выбор провайдера и аккаунта для задачи"""
        
        # Если указан конкретный провайдер
        if task.provider:
            account = self.pool.select_account(
                task.provider,
                max_hourly_requests=self.PROVIDER_CONFIGS.get(task.provider, {}).get('max_requests_per_hour', 5)
            )
            return task.provider, account
        
        # Авто-выбор лучшего провайдера
        # Сортируем по приоритету и доступности
        providers = sorted(
            self.PROVIDER_CONFIGS.keys(),
            key=lambda p: self.PROVIDER_CONFIGS[p].get('priority', 99)
        )
        
        for provider in providers:
            if not self.PROVIDER_CONFIGS[provider].get('auto_register', True):
                continue
            
            # Проверяем длительность
            if task.duration not in self.PROVIDER_CONFIGS[provider].get('video_durations', [10]):
                # Ближайшая длительность
                durations = self.PROVIDER_CONFIGS[provider].get('video_durations', [10])
                if min(durations, key=lambda x: abs(x - task.duration)) != task.duration:
                    continue
            
            account = self.pool.select_account(
                provider,
                max_hourly_requests=self.PROVIDER_CONFIGS[provider].get('max_requests_per_hour', 5)
            )
            
            if account:
                return provider, account
        
        return None, None
    
    async def _generate(
        self,
        task: GenerationTask,
        provider: str,
        account
    ) -> GenerationResult:
        """Генерация контента"""
        
        start_time = time.time()
        
        try:
            # Импортируем провайдер
            if provider == 'pollo':
                from ..providers.pollo import PolloAIProvider
                provider_cls = PolloAIProvider
            elif provider == 'kling':
                from ..providers.kling import KlingProvider
                provider_cls = KlingProvider
            elif provider == 'luma':
                from ..providers.luma import LumaProvider
                provider_cls = LumaProvider
            elif provider == 'runway':
                from ..providers.runway import RunwayProvider
                provider_cls = RunwayProvider
            else:
                # Универсальный провайдер
                from ..providers.universal import UniversalProvider
                provider_cls = UniversalProvider
            
            # Создаём экземпляр провайдера
            config = self.PROVIDER_CONFIGS.get(provider, {})
            prov = provider_cls(config, str(self.output_dir))
            
            # Загружаем cookies аккаунта
            if account.cookies:
                prov.session_data = {'cookies': account.cookies}
            
            # Логинимся
            await prov.login(headless=self.headless)
            
            # Генерируем
            result = await prov.generate(
                prompt=task.prompt,
                duration=task.duration,
                ratio=task.aspect_ratio,
            )
            
            await prov.close()
            
            if result.success:
                return GenerationResult(
                    success=True,
                    task_id=task.task_id,
                    content_type='video',
                    provider=provider,
                    account_id=account.account_id,
                    file_path=result.video_path,
                    duration=result.duration,
                    metadata=result.metadata
                )
            else:
                return GenerationResult(
                    success=False,
                    task_id=task.task_id,
                    content_type='video',
                    error=result.error
                )
            
        except Exception as e:
            logger.exception(f"Generation error: {e}")
            return GenerationResult(
                success=False,
                task_id=task.task_id,
                content_type='video',
                error=str(e)
            )
    
    async def _account_monitor(self) -> None:
        """Мониторинг состояния аккаунтов"""
        while self._running:
            try:
                # Сброс дневных счётчиков в полночь
                now = datetime.now()
                if now.hour == 0 and now.minute < 5:
                    self.pool.reset_daily_counters()
                
                # Проверка каждые 5 минут
                await asyncio.sleep(300)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Account monitor error: {e}")
                await asyncio.sleep(60)
    
    # === Public API ===
    
    def add_task(
        self,
        prompt: str,
        duration: float = 10.0,
        aspect_ratio: str = "9:16",
        provider: str = None,
        priority: str = "normal"
    ) -> str:
        """Добавление задачи на генерацию"""
        self.stats['total_tasks'] += 1
        return self.queue.add_task(
            prompt=prompt,
            content_type="video",
            duration=duration,
            aspect_ratio=aspect_ratio,
            provider=provider,
            priority=priority
        )
    
    def add_batch_tasks(
        self,
        prompts: List[str],
        duration: float = 10.0,
        aspect_ratio: str = "9:16",
        provider: str = None
    ) -> List[str]:
        """Добавление множества задач"""
        task_ids = []
        for prompt in prompts:
            task_id = self.add_task(prompt, duration, aspect_ratio, provider)
            task_ids.append(task_id)
        return task_ids
    
    def generate_prompts(
        self,
        template: str = None,
        count: int = 10,
        theme: str = None
    ) -> List[str]:
        """Генерация промптов через вариатор"""
        if theme:
            # Используем тему
            from .prompt_variator import THEMES
            theme_config = THEMES.get(theme, {})
            return self.variator.generate_batch(
                count,
                variations=theme_config
            )
        else:
            return self.variator.generate_batch(count, template=template)
    
    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """Получение статуса задачи"""
        task = self.queue.get_task(task_id)
        if task:
            return task.to_dict()
        return None
    
    def get_providers_status(self) -> List[Dict]:
        """Получение статуса всех провайдеров"""
        providers = []
        
        for name, config in self.PROVIDER_CONFIGS.items():
            accounts = self.pool.get_accounts(name)
            available = self.pool.get_available_accounts(name)
            
            info = ProviderInfo(
                name=name,
                display_name=config['display_name'],
                url=config['url'],
                enabled=True,
                state=ProviderState.AVAILABLE if available else ProviderState.RATE_LIMITED,
                daily_credits=config['daily_credits'],
                video_durations=config['video_durations'],
                auto_register=config['auto_register'],
                priority=config['priority'],
                total_accounts=len(accounts),
                active_accounts=len(available),
            )
            
            providers.append(info.to_dict())
        
        return providers
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики"""
        uptime = (datetime.now() - self._start_time).total_seconds() if self._start_time else 0
        
        return {
            'uptime_seconds': uptime,
            'total_tasks': self.stats['total_tasks'],
            'completed_tasks': self.stats['completed_tasks'],
            'failed_tasks': self.stats['failed_tasks'],
            'total_videos_generated': self.stats['total_generated'],
            'total_video_minutes': self.stats['total_minutes'],
            'active_workers': sum(1 for w in self._workers if not w.done()),
            'queue_size': self.queue.get_stats()['pending'],
            'account_stats': self.pool.get_stats(),
        }
    
    async def register_account(self, provider: str) -> Dict:
        """Ручная регистрация аккаунта"""
        result = await self.registrar.register(provider)
        return {
            'success': result.success,
            'email': result.email,
            'error': result.error
        }
    
    async def stitch_videos(
        self,
        video_paths: List[str],
        transition: str = "fade",
        audio_path: str = None
    ) -> Dict:
        """Склейка видео"""
        result = await self.stitcher.stitch_videos(
            video_paths,
            transition=transition,
            audio_path=audio_path
        )
        return result.model_dump()
