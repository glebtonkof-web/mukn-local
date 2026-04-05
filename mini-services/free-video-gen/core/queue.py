"""
Free Video Generator - Task Queue
Asynchronous task queue for video generation
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any
from enum import Enum

from loguru import logger
from pydantic import BaseModel

from .types import GenerationTask, TaskStatus


class TaskQueue:
    """
    Asynchronous task queue for video generation.
    Supports priorities, retries, and persistence.
    """
    
    def __init__(
        self,
        max_workers: int = 3,
        max_retries: int = 3,
        retry_delays: List[int] = None,
        persistence_path: Optional[str] = None
    ):
        self.max_workers = max_workers
        self.max_retries = max_retries
        self.retry_delays = retry_delays or [300, 900, 3600]  # 5min, 15min, 1hour
        self.persistence_path = persistence_path
        
        # Internal state
        self._queue: asyncio.PriorityQueue = None
        self._tasks: Dict[str, GenerationTask] = {}
        self._workers: List[asyncio.Task] = []
        self._running = False
        self._handlers: Dict[str, Callable] = {}
        self._semaphore: asyncio.Semaphore = None
        
        # Statistics
        self._stats = {
            'total_tasks': 0,
            'completed': 0,
            'failed': 0,
            'retries': 0,
        }
    
    async def start(self):
        """Start the queue and workers"""
        if self._running:
            return
        
        self._queue = asyncio.PriorityQueue()
        self._semaphore = asyncio.Semaphore(self.max_workers)
        
        # Load persisted tasks
        await self._load_persisted_tasks()
        
        self._running = True
        
        # Start worker coroutines
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(i))
            self._workers.append(worker)
        
        logger.info(f"Task queue started with {self.max_workers} workers")
    
    async def stop(self):
        """Stop the queue and workers"""
        self._running = False
        
        # Cancel all workers
        for worker in self._workers:
            worker.cancel()
        
        # Wait for workers to finish
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        
        # Persist remaining tasks
        await self._persist_tasks()
        
        logger.info("Task queue stopped")
    
    def register_handler(self, task_type: str, handler: Callable):
        """Register a handler for a task type"""
        self._handlers[task_type] = handler
        logger.debug(f"Registered handler for task type: {task_type}")
    
    async def submit(self, task: GenerationTask) -> str:
        """Submit a task to the queue"""
        task.status = TaskStatus.PENDING
        task.created_at = datetime.utcnow()
        
        self._tasks[task.id] = task
        
        # Priority queue uses (priority, timestamp, task_id) for ordering
        await self._queue.put((task.priority, task.created_at.timestamp(), task.id))
        
        self._stats['total_tasks'] += 1
        
        logger.info(f"Task submitted: {task.id} (priority: {task.priority})")
        
        return task.id
    
    async def submit_batch(self, tasks: List[GenerationTask]) -> List[str]:
        """Submit multiple tasks"""
        task_ids = []
        for task in tasks:
            task_id = await self.submit(task)
            task_ids.append(task_id)
        return task_ids
    
    async def get_task(self, task_id: str) -> Optional[GenerationTask]:
        """Get task by ID"""
        return self._tasks.get(task_id)
    
    async def get_status(self, task_id: str) -> Optional[TaskStatus]:
        """Get task status"""
        task = self._tasks.get(task_id)
        return task.status if task else None
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending task"""
        task = self._tasks.get(task_id)
        if task and task.status == TaskStatus.PENDING:
            task.status = TaskStatus.CANCELLED
            logger.info(f"Task cancelled: {task_id}")
            return True
        return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            **self._stats,
            'queue_size': self._queue.qsize() if self._queue else 0,
            'active_workers': sum(1 for w in self._workers if not w.done()),
            'pending': sum(1 for t in self._tasks.values() if t.status == TaskStatus.PENDING),
            'running': sum(1 for t in self._tasks.values() if t.status == TaskStatus.RUNNING),
        }
    
    async def _worker(self, worker_id: int):
        """Worker coroutine that processes tasks"""
        logger.debug(f"Worker {worker_id} started")
        
        while self._running:
            try:
                # Get task from queue with timeout
                try:
                    priority, timestamp, task_id = await asyncio.wait_for(
                        self._queue.get(),
                        timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # Get task object
                task = self._tasks.get(task_id)
                if not task or task.status == TaskStatus.CANCELLED:
                    continue
                
                # Acquire semaphore to limit concurrent processing
                async with self._semaphore:
                    await self._process_task(task, worker_id)
                    
            except asyncio.CancelledError:
                logger.debug(f"Worker {worker_id} cancelled")
                break
            except Exception as e:
                logger.exception(f"Worker {worker_id} error: {e}")
        
        logger.debug(f"Worker {worker_id} stopped")
    
    async def _process_task(self, task: GenerationTask, worker_id: int):
        """Process a single task"""
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()
        
        logger.info(f"Worker {worker_id} processing task: {task.id}")
        
        try:
            # Find handler
            handler = self._handlers.get('generate')
            if not handler:
                raise RuntimeError("No handler registered for 'generate' tasks")
            
            # Execute handler
            result = await handler(task)
            
            if result.get('success'):
                task.status = TaskStatus.COMPLETED
                task.result_path = result.get('output_path')
                task.completed_at = datetime.utcnow()
                self._stats['completed'] += 1
                logger.info(f"Task completed: {task.id}")
            else:
                raise Exception(result.get('error', 'Unknown error'))
                
        except Exception as e:
            task.last_error = str(e)
            task.retry_count += 1
            
            if task.retry_count < task.max_retries:
                task.status = TaskStatus.RETRYING
                delay = self.retry_delays[min(task.retry_count - 1, len(self.retry_delays) - 1)]
                
                logger.warning(f"Task failed, retry {task.retry_count}/{task.max_retries} in {delay}s: {task.id}")
                
                self._stats['retries'] += 1
                
                # Schedule retry
                await self._schedule_retry(task, delay)
            else:
                task.status = TaskStatus.FAILED
                task.completed_at = datetime.utcnow()
                self._stats['failed'] += 1
                logger.error(f"Task failed permanently: {task.id} - {e}")
    
    async def _schedule_retry(self, task: GenerationTask, delay: int):
        """Schedule a task retry after delay"""
        await asyncio.sleep(delay)
        
        if task.status == TaskStatus.RETRYING and self._running:
            task.status = TaskStatus.PENDING
            await self._queue.put((task.priority + 1, datetime.utcnow().timestamp(), task.id))
    
    async def _persist_tasks(self):
        """Persist tasks to disk"""
        if not self.persistence_path:
            return
        
        try:
            path = Path(self.persistence_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            
            tasks_data = {
                task_id: task.model_dump()
                for task_id, task in self._tasks.items()
                if task.status in [TaskStatus.PENDING, TaskStatus.RETRYING]
            }
            
            with open(path, 'w') as f:
                json.dump(tasks_data, f, default=str)
            
            logger.debug(f"Persisted {len(tasks_data)} tasks")
            
        except Exception as e:
            logger.error(f"Failed to persist tasks: {e}")
    
    async def _load_persisted_tasks(self):
        """Load persisted tasks from disk"""
        if not self.persistence_path:
            return
        
        try:
            path = Path(self.persistence_path)
            if not path.exists():
                return
            
            with open(path, 'r') as f:
                tasks_data = json.load(f)
            
            for task_id, task_dict in tasks_data.items():
                task = GenerationTask(**task_dict)
                task.status = TaskStatus.PENDING  # Reset to pending
                self._tasks[task.id] = task
                await self._queue.put((task.priority, task.created_at.timestamp(), task.id))
            
            logger.info(f"Loaded {len(tasks_data)} persisted tasks")
            
        except Exception as e:
            logger.error(f"Failed to load persisted tasks: {e}")


class TaskWorker:
    """Helper class for working with the task queue"""
    
    def __init__(self, queue: TaskQueue):
        self.queue = queue
    
    async def submit_scene_generation(
        self,
        project_id: str,
        scene_id: str,
        prompt: str,
        duration: float = 10.0,
        provider: Optional[str] = None,
        priority: int = 5
    ) -> str:
        """Submit a scene generation task"""
        task = GenerationTask(
            project_id=project_id,
            scene_id=scene_id,
            prompt=prompt,
            duration=duration,
            provider=provider,
            priority=priority
        )
        return await self.queue.submit(task)
    
    async def wait_for_task(
        self,
        task_id: str,
        timeout: float = 600,
        poll_interval: float = 1.0
    ) -> Optional[GenerationTask]:
        """Wait for a task to complete"""
        start = datetime.utcnow()
        
        while (datetime.utcnow() - start).total_seconds() < timeout:
            task = await self.queue.get_task(task_id)
            
            if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
                return task
            
            await asyncio.sleep(poll_interval)
        
        return None
    
    async def wait_for_tasks(
        self,
        task_ids: List[str],
        timeout: float = 1800
    ) -> Dict[str, GenerationTask]:
        """Wait for multiple tasks to complete"""
        results = {}
        start = datetime.utcnow()
        
        while (datetime.utcnow() - start).total_seconds() < timeout:
            for task_id in task_ids:
                if task_id not in results:
                    task = await self.queue.get_task(task_id)
                    if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                        results[task_id] = task
            
            if len(results) == len(task_ids):
                break
            
            await asyncio.sleep(1.0)
        
        return results
