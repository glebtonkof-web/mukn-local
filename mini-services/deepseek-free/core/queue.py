"""
Smart Request Queue with Priority Support
Advanced queue management for request handling
"""

import asyncio
import hashlib
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List, Callable, Awaitable
from loguru import logger


class RequestPriority(int, Enum):
    """Request priority levels"""
    LOW = 1
    NORMAL = 5
    HIGH = 8
    URGENT = 10
    CRITICAL = 15


class RequestStatus(str, Enum):
    """Request status"""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


@dataclass
class QueueItem:
    """Queue item"""
    id: str
    prompt: str
    priority: int
    status: RequestStatus = RequestStatus.PENDING
    
    # Context
    context_type: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None
    
    # Timing
    queued_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Result
    response: Optional[str] = None
    error: Optional[str] = None
    
    # Retry
    attempts: int = 0
    max_attempts: int = 3
    
    # Callback
    callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'prompt': self.prompt,
            'priority': self.priority,
            'status': self.status.value,
            'context_type': self.context_type,
            'queued_at': self.queued_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'response': self.response,
            'error': self.error,
            'attempts': self.attempts,
        }


@dataclass
class QueueStats:
    """Queue statistics"""
    total_items: int = 0
    pending_items: int = 0
    processing_items: int = 0
    completed_items: int = 0
    failed_items: int = 0
    avg_wait_time: float = 0.0
    avg_process_time: float = 0.0
    throughput_per_minute: float = 0.0


class SmartQueue:
    """
    Smart request queue with priority support.
    
    Features:
    - Priority-based ordering
    - Automatic retry with backoff
    - Concurrent processing
    - Delay management
    - Callback support
    - Deduplication
    """
    
    def __init__(
        self,
        max_concurrent: int = 20,
        min_delay: float = 5.0,
        max_delay: float = 15.0,
        retry_delay: float = 30.0,
        max_retries: int = 3,
        dedup_window: int = 300,  # 5 minutes
    ):
        self.max_concurrent = max_concurrent
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.retry_delay = retry_delay
        self.max_retries = max_retries
        self.dedup_window = dedup_window
        
        # Queues
        self._pending: List[QueueItem] = []
        self._processing: Dict[str, QueueItem] = {}
        self._completed: Dict[str, QueueItem] = {}
        self._failed: Dict[str, QueueItem] = {}
        
        # Deduplication
        self._recent_hashes: Dict[str, datetime] = {}
        
        # Control
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._lock = asyncio.Lock()
        self._running = False
        self._processor_task: Optional[asyncio.Task] = None
        
        # Stats
        self._stats = QueueStats()
        self._wait_times: List[float] = []
        self._process_times: List[float] = []
        self._completed_count = 0
        self._last_minute_completions: List[datetime] = []
    
    @staticmethod
    def generate_id() -> str:
        """Generate unique request ID"""
        import uuid
        return str(uuid.uuid4())[:8]
    
    @staticmethod
    def hash_prompt(prompt: str) -> str:
        """Hash prompt for deduplication"""
        return hashlib.sha256(prompt.encode()).hexdigest()[:16]
    
    async def enqueue(
        self,
        prompt: str,
        priority: int = RequestPriority.NORMAL.value,
        context_type: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None,
        callback: Optional[Callable] = None,
        skip_dedup: bool = False,
    ) -> QueueItem:
        """Add item to queue"""
        prompt_hash = self.hash_prompt(prompt)
        
        # Check deduplication
        if not skip_dedup:
            now = datetime.now()
            if prompt_hash in self._recent_hashes:
                last_time = self._recent_hashes[prompt_hash]
                if (now - last_time).total_seconds() < self.dedup_window:
                    logger.debug(f"Duplicate request detected: {prompt_hash}")
                    # Return existing item if still pending
                    for item in self._pending:
                        if self.hash_prompt(item.prompt) == prompt_hash:
                            return item
        
        # Create item
        item = QueueItem(
            id=self.generate_id(),
            prompt=prompt,
            priority=priority,
            context_type=context_type,
            context_data=context_data,
            callback=callback,
        )
        
        async with self._lock:
            self._pending.append(item)
            self._recent_hashes[prompt_hash] = datetime.now()
            
            # Sort by priority (higher first)
            self._pending.sort(key=lambda x: (-x.priority, x.queued_at))
        
        self._stats.total_items += 1
        self._stats.pending_items = len(self._pending)
        
        logger.debug(f"Enqueued request {item.id} with priority {priority}")
        
        return item
    
    async def dequeue(self) -> Optional[QueueItem]:
        """Get next item from queue"""
        async with self._lock:
            if not self._pending:
                return None
            
            # Get highest priority item
            item = self._pending.pop(0)
            item.status = RequestStatus.PROCESSING
            item.started_at = datetime.now()
            
            self._processing[item.id] = item
            
            self._stats.pending_items = len(self._pending)
            self._stats.processing_items = len(self._processing)
            
            # Calculate wait time
            wait_time = (item.started_at - item.queued_at).total_seconds()
            self._wait_times.append(wait_time)
            if len(self._wait_times) > 100:
                self._wait_times.pop(0)
            
            return item
    
    async def complete(self, item_id: str, response: str):
        """Mark item as completed"""
        async with self._lock:
            if item_id not in self._processing:
                return
            
            item = self._processing.pop(item_id)
            item.status = RequestStatus.COMPLETED
            item.response = response
            item.completed_at = datetime.now()
            
            self._completed[item_id] = item
            
            # Calculate process time
            if item.started_at:
                process_time = (item.completed_at - item.started_at).total_seconds()
                self._process_times.append(process_time)
                if len(self._process_times) > 100:
                    self._process_times.pop(0)
            
            self._stats.completed_items += 1
            self._stats.processing_items = len(self._processing)
            self._completed_count += 1
            self._last_minute_completions.append(datetime.now())
            
            # Run callback
            if item.callback:
                try:
                    await item.callback(item.to_dict())
                except Exception as e:
                    logger.error(f"Callback error: {e}")
    
    async def fail(self, item_id: str, error: str, retry: bool = True):
        """Mark item as failed"""
        async with self._lock:
            if item_id not in self._processing:
                return
            
            item = self._processing.pop(item_id)
            item.error = error
            item.attempts += 1
            
            if retry and item.attempts < item.max_attempts:
                # Re-queue with lower priority
                item.status = RequestStatus.RETRYING
                item.priority = max(1, item.priority - 1)
                self._pending.append(item)
                self._pending.sort(key=lambda x: (-x.priority, x.queued_at))
                
                logger.debug(f"Re-queuing {item_id} (attempt {item.attempts})")
            else:
                item.status = RequestStatus.FAILED
                item.completed_at = datetime.now()
                self._failed[item_id] = item
                self._stats.failed_items += 1
            
            self._stats.processing_items = len(self._processing)
    
    async def cancel(self, item_id: str) -> bool:
        """Cancel pending item"""
        async with self._lock:
            # Check pending
            for i, item in enumerate(self._pending):
                if item.id == item_id:
                    item.status = RequestStatus.CANCELLED
                    self._pending.pop(i)
                    self._stats.pending_items = len(self._pending)
                    return True
            
            # Check processing
            if item_id in self._processing:
                item = self._processing.pop(item_id)
                item.status = RequestStatus.CANCELLED
                item.completed_at = datetime.now()
                self._stats.processing_items = len(self._processing)
                return True
            
            return False
    
    async def get_item(self, item_id: str) -> Optional[QueueItem]:
        """Get item by ID"""
        # Check all queues
        for item in self._pending:
            if item.id == item_id:
                return item
        
        if item_id in self._processing:
            return self._processing[item_id]
        
        if item_id in self._completed:
            return self._completed[item_id]
        
        if item_id in self._failed:
            return self._failed[item_id]
        
        return None
    
    async def get_status(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get item status"""
        item = await self.get_item(item_id)
        return item.to_dict() if item else None
    
    def get_random_delay(self) -> float:
        """Get random delay between requests"""
        import random
        return random.uniform(self.min_delay, self.max_delay)
    
    def get_retry_delay(self, attempt: int) -> float:
        """Get exponential backoff delay for retries"""
        return self.retry_delay * (2 ** (attempt - 1))
    
    def get_stats(self) -> QueueStats:
        """Get queue statistics"""
        # Calculate averages
        avg_wait = sum(self._wait_times) / max(1, len(self._wait_times))
        avg_process = sum(self._process_times) / max(1, len(self._process_times))
        
        # Calculate throughput
        now = datetime.now()
        minute_ago = now - timedelta(minutes=1)
        recent = [t for t in self._last_minute_completions if t > minute_ago]
        throughput = len(recent)
        
        return QueueStats(
            total_items=self._stats.total_items,
            pending_items=len(self._pending),
            processing_items=len(self._processing),
            completed_items=self._stats.completed_items,
            failed_items=self._stats.failed_items,
            avg_wait_time=avg_wait,
            avg_process_time=avg_process,
            throughput_per_minute=throughput,
        )
    
    async def clear_completed(self, max_age_hours: int = 24):
        """Clear old completed/failed items"""
        now = datetime.now()
        cutoff = now - timedelta(hours=max_age_hours)
        
        async with self._lock:
            # Clear completed
            to_remove = [
                id for id, item in self._completed.items()
                if item.completed_at and item.completed_at < cutoff
            ]
            for id in to_remove:
                del self._completed[id]
            
            # Clear failed
            to_remove = [
                id for id, item in self._failed.items()
                if item.completed_at and item.completed_at < cutoff
            ]
            for id in to_remove:
                del self._failed[id]
            
            # Clear recent hashes
            to_remove = [
                h for h, t in self._recent_hashes.items()
                if t < cutoff
            ]
            for h in to_remove:
                del self._recent_hashes[h]
        
        logger.debug(f"Cleared {len(to_remove)} old items")
    
    async def start_processor(
        self,
        handler: Callable[[QueueItem], Awaitable[Dict[str, Any]]],
    ):
        """Start queue processor"""
        if self._running:
            logger.warning("Queue processor already running")
            return
        
        self._running = True
        
        async def processor():
            while self._running:
                try:
                    item = await self.dequeue()
                    
                    if not item:
                        await asyncio.sleep(0.5)
                        continue
                    
                    async with self._semaphore:
                        try:
                            result = await handler(item)
                            
                            if result.get('success'):
                                await self.complete(item.id, result.get('response', ''))
                            else:
                                await self.fail(item.id, result.get('error', 'Unknown error'))
                                
                        except Exception as e:
                            await self.fail(item.id, str(e))
                    
                    # Delay between requests
                    await asyncio.sleep(self.get_random_delay())
                    
                except Exception as e:
                    logger.error(f"Queue processor error: {e}")
                    await asyncio.sleep(1)
        
        self._processor_task = asyncio.create_task(processor())
        logger.info("Queue processor started")
    
    async def stop_processor(self):
        """Stop queue processor"""
        self._running = False
        
        if self._processor_task:
            self._processor_task.cancel()
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass
            
            self._processor_task = None
        
        logger.info("Queue processor stopped")
    
    def is_running(self) -> bool:
        """Check if processor is running"""
        return self._running


# Import timedelta for processor
from datetime import timedelta
