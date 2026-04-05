"""
Content Studio Infinite - Task Queue
Очередь задач на генерацию с приоритетами

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import asyncio
import json
import sqlite3
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from loguru import logger
import heapq

from .types import GenerationTask, TaskStatus, TaskPriority, ContentType


class TaskQueue:
    """
    Приоритетная очередь задач на генерацию.
    
    Features:
    - Хранение в SQLite для персистентности
    - Приоритеты (urgent > high > normal > low)
    - Авто-восстановление при сбое
    - Retry механизм
    """
    
    def __init__(self, db_path: str = "./data/content_studio.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Очередь в памяти
        self._queue: List[GenerationTask] = []
        self._processing: Dict[str, GenerationTask] = {}
        self._completed: List[GenerationTask] = []
        
        # Callbacks
        self._on_task_complete: Optional[Callable] = None
        self._on_task_failed: Optional[Callable] = None
        
        # Lock
        self._lock = asyncio.Lock()
        
        # Инициализация БД
        self._init_db()
        self._load_pending_tasks()
    
    def _init_db(self) -> None:
        """Инициализация БД"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                task_id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                content_type TEXT DEFAULT 'video',
                duration REAL DEFAULT 10.0,
                aspect_ratio TEXT DEFAULT '9:16',
                style TEXT,
                provider TEXT,
                account_id TEXT,
                status TEXT DEFAULT 'pending',
                priority TEXT DEFAULT 'normal',
                result_path TEXT,
                result_url TEXT,
                error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                metadata TEXT
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON tasks(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_priority ON tasks(priority)')
        
        conn.commit()
        conn.close()
    
    def _load_pending_tasks(self) -> int:
        """Загрузка ожидающих задач из БД"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT task_id, prompt, content_type, duration, aspect_ratio, style,
                   provider, account_id, status, priority, result_path, result_url,
                   error, created_at, started_at, completed_at, attempts, max_attempts, metadata
            FROM tasks
            WHERE status IN ('pending', 'processing')
            ORDER BY created_at
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        loaded = 0
        for row in rows:
            (task_id, prompt, content_type, duration, aspect_ratio, style,
             provider, account_id, status, priority, result_path, result_url,
             error, created_at, started_at, completed_at, attempts, max_attempts, metadata_str) = row
            
            task = GenerationTask(
                task_id=task_id,
                prompt=prompt,
                content_type=ContentType(content_type) if content_type else ContentType.VIDEO,
                duration=duration or 10.0,
                aspect_ratio=aspect_ratio or "9:16",
                style=style,
                provider=provider,
                account_id=account_id,
                status=TaskStatus(status) if status else TaskStatus.PENDING,
                priority=TaskPriority(priority) if priority else TaskPriority.NORMAL,
                result_path=result_path,
                result_url=result_url,
                error=error,
                created_at=datetime.fromisoformat(created_at) if created_at else datetime.now(),
                started_at=datetime.fromisoformat(started_at) if started_at else None,
                completed_at=datetime.fromisoformat(completed_at) if completed_at else None,
                attempts=attempts or 0,
                max_attempts=max_attempts or 3,
                metadata=json.loads(metadata_str) if metadata_str else {},
            )
            
            if task.status == TaskStatus.PENDING:
                self._queue.append(task)
            elif task.status == TaskStatus.PROCESSING:
                # Восстанавливаем processing задачи как pending
                task.status = TaskStatus.PENDING
                self._queue.append(task)
            
            loaded += 1
        
        if loaded > 0:
            logger.info(f"Loaded {loaded} pending tasks from database")
        
        return loaded
    
    def save_task(self, task: GenerationTask) -> None:
        """Сохранение задачи в БД"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO tasks 
            (task_id, prompt, content_type, duration, aspect_ratio, style,
             provider, account_id, status, priority, result_path, result_url,
             error, started_at, completed_at, attempts, max_attempts, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            task.task_id,
            task.prompt,
            task.content_type.value,
            task.duration,
            task.aspect_ratio,
            task.style,
            task.provider,
            task.account_id,
            task.status.value,
            task.priority.value,
            task.result_path,
            task.result_url,
            task.error,
            task.started_at.isoformat() if task.started_at else None,
            task.completed_at.isoformat() if task.completed_at else None,
            task.attempts,
            task.max_attempts,
            json.dumps(task.metadata),
        ))
        
        conn.commit()
        conn.close()
    
    def delete_task(self, task_id: str) -> bool:
        """Удаление задачи"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM tasks WHERE task_id = ?', (task_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted
    
    def add_task(
        self,
        prompt: str,
        content_type: str = "video",
        duration: float = 10.0,
        aspect_ratio: str = "9:16",
        style: str = None,
        provider: str = None,
        priority: str = "normal",
        metadata: Dict = None
    ) -> str:
        """
        Добавление новой задачи в очередь.
        
        Returns:
            task_id
        """
        task_id = f"task_{uuid.uuid4().hex[:12]}"
        
        # Маппинг приоритетов
        priority_map = {
            'urgent': TaskPriority.URGENT,
            'high': TaskPriority.HIGH,
            'normal': TaskPriority.NORMAL,
            'low': TaskPriority.LOW,
        }
        
        task = GenerationTask(
            task_id=task_id,
            prompt=prompt,
            content_type=ContentType(content_type) if content_type else ContentType.VIDEO,
            duration=duration,
            aspect_ratio=aspect_ratio,
            style=style,
            provider=provider,
            priority=priority_map.get(priority, TaskPriority.NORMAL),
            metadata=metadata or {},
        )
        
        self._queue.append(task)
        self.save_task(task)
        
        logger.info(f"Added task {task_id}: {prompt[:50]}...")
        return task_id
    
    async def get_next_task(self) -> Optional[GenerationTask]:
        """
        Получение следующей задачи из очереди.
        Учитывает приоритеты.
        """
        async with self._lock:
            if not self._queue:
                return None
            
            # Сортировка по приоритету
            priority_order = {
                TaskPriority.URGENT: 0,
                TaskPriority.HIGH: 1,
                TaskPriority.NORMAL: 2,
                TaskPriority.LOW: 3,
            }
            
            self._queue.sort(key=lambda t: priority_order.get(t.priority, 2))
            
            task = self._queue.pop(0)
            task.status = TaskStatus.PROCESSING
            task.started_at = datetime.now()
            
            self._processing[task.task_id] = task
            self.save_task(task)
            
            return task
    
    def complete_task(
        self,
        task_id: str,
        result_path: str = None,
        result_url: str = None,
        error: str = None
    ) -> bool:
        """Отметить задачу как выполненную"""
        task = self._processing.pop(task_id, None)
        
        if not task:
            logger.warning(f"Task {task_id} not found in processing")
            return False
        
        if error:
            task.attempts += 1
            
            if task.attempts >= task.max_attempts:
                task.status = TaskStatus.FAILED
                task.error = error
            else:
                # Retry
                task.status = TaskStatus.PENDING
                self._queue.append(task)
                logger.info(f"Task {task_id} will retry ({task.attempts}/{task.max_attempts})")
        else:
            task.status = TaskStatus.COMPLETED
            task.result_path = result_path
            task.result_url = result_url
        
        task.completed_at = datetime.now()
        
        self.save_task(task)
        
        if task.status == TaskStatus.COMPLETED:
            self._completed.append(task)
            if self._on_task_complete:
                asyncio.create_task(self._on_task_complete(task))
        elif task.status == TaskStatus.FAILED:
            if self._on_task_failed:
                asyncio.create_task(self._on_task_failed(task))
        
        logger.info(f"Task {task_id} completed: {task.status.value}")
        return True
    
    def get_task(self, task_id: str) -> Optional[GenerationTask]:
        """Получить задачу по ID"""
        # Поиск в очереди
        for task in self._queue:
            if task.task_id == task_id:
                return task
        
        # Поиск в processing
        if task_id in self._processing:
            return self._processing[task_id]
        
        # Поиск в completed
        for task in self._completed:
            if task.task_id == task_id:
                return task
        
        # Поиск в БД
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT task_id, prompt, content_type, duration, aspect_ratio, style,
                   provider, account_id, status, priority, result_path, result_url,
                   error, created_at, started_at, completed_at, attempts, max_attempts
            FROM tasks WHERE task_id = ?
        ''', (task_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return GenerationTask(
                task_id=row[0],
                prompt=row[1],
                content_type=ContentType(row[2]) if row[2] else ContentType.VIDEO,
                duration=row[3] or 10.0,
                aspect_ratio=row[4] or "9:16",
                style=row[5],
                provider=row[6],
                account_id=row[7],
                status=TaskStatus(row[8]) if row[8] else TaskStatus.PENDING,
                priority=TaskPriority(row[9]) if row[9] else TaskPriority.NORMAL,
                result_path=row[10],
                result_url=row[11],
                error=row[12],
                created_at=datetime.fromisoformat(row[13]) if row[13] else None,
                started_at=datetime.fromisoformat(row[14]) if row[14] else None,
                completed_at=datetime.fromisoformat(row[15]) if row[15] else None,
                attempts=row[16] or 0,
                max_attempts=row[17] or 3,
            )
        
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Статистика очереди"""
        return {
            'pending': len(self._queue),
            'processing': len(self._processing),
            'completed': len(self._completed),
            'total_tasks': len(self._queue) + len(self._processing) + len(self._completed),
        }
    
    def clear_completed(self, max_age_hours: int = 24) -> int:
        """Очистка старых выполненных задач"""
        cutoff = datetime.now()
        to_remove = []
        
        for task in self._completed:
            if task.completed_at:
                age = (cutoff - task.completed_at).total_seconds() / 3600
                if age > max_age_hours:
                    to_remove.append(task.task_id)
        
        for task_id in to_remove:
            self._completed = [t for t in self._completed if t.task_id != task_id]
            self.delete_task(task_id)
        
        if to_remove:
            logger.info(f"Cleared {len(to_remove)} old completed tasks")
        
        return len(to_remove)
    
    def set_callbacks(
        self,
        on_complete: Callable = None,
        on_failed: Callable = None
    ) -> None:
        """Установка callbacks"""
        self._on_task_complete = on_complete
        self._on_task_failed = on_failed
