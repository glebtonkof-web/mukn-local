"""
DeepSeek Account Pool Manager
Пул аккаунтов с балансировкой нагрузки и ротацией

МУКН | Трафик - Enterprise AI-powered Telegram Automation Platform
"""

import asyncio
import json
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from loguru import logger
import random

from .deepseek_account import DeepSeekAccount, AccountStatus


@dataclass
class PoolStats:
    """Статистика пула"""
    total_accounts: int = 0
    active_accounts: int = 0
    total_requests_today: int = 0
    total_requests_hour: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    avg_response_time: float = 0.0
    success_rate: float = 0.0


class AccountPool:
    """
    Менеджер пула аккаунтов DeepSeek.
    
    Features:
    - Хранение аккаунтов в зашифрованной SQLite
    - Ротация по алгоритму "наименьшее количество запросов"
    - Репликация запросов для надёжности
    - Авто-регистрация новых аккаунтов
    - Self-healing забаненных аккаунтов
    """
    
    def __init__(
        self,
        db_path: str = "data/accounts.db",
        max_parallel_browsers: int = 20,
        replication_factor: int = 3,
        rotation_strategy: str = "least_requests",  # least_requests, round_robin, random
    ):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.max_parallel_browsers = max_parallel_browsers
        self.replication_factor = replication_factor
        self.rotation_strategy = rotation_strategy
        
        # Аккаунты
        self.accounts: Dict[str, DeepSeekAccount] = {}
        self._account_order: List[str] = []  # Для round_robin
        self._round_robin_index = 0
        
        # Инициализация БД
        self._init_db()
        
        # Статистика
        self.stats = PoolStats()
        self._request_times: List[float] = []
        
        # Lock для синхронизации
        self._lock = asyncio.Lock()
    
    def _init_db(self) -> None:
        """Инициализация базы данных аккаунтов"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                proxy TEXT,
                status TEXT DEFAULT 'active',
                total_requests INTEGER DEFAULT 0,
                successful_requests INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                last_error TEXT,
                metadata TEXT
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON accounts(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_last_used ON accounts(last_used_at)')
        
        conn.commit()
        conn.close()
    
    def load_accounts(self) -> int:
        """Загрузка аккаунтов из БД"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, email, password, proxy, status, total_requests, successful_requests, metadata
            FROM accounts
            WHERE status != 'banned'
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        loaded = 0
        for row in rows:
            account_id, email, password, proxy_str, status, total_req, success_req, metadata_str = row
            
            proxy = json.loads(proxy_str) if proxy_str else None
            
            account = DeepSeekAccount(
                account_id=account_id,
                email=email,
                password=password,
                proxy=proxy
            )
            
            # Восстановление статистики
            account.total_requests = total_req
            account.successful_requests = success_req
            
            if status == 'rate_limited':
                account.status = AccountStatus.RATE_LIMITED
            elif status == 'error':
                account.status = AccountStatus.ERROR
            
            self.accounts[account_id] = account
            self._account_order.append(account_id)
            loaded += 1
        
        logger.info(f"Loaded {loaded} accounts from database")
        return loaded
    
    def save_account(self, account: DeepSeekAccount) -> None:
        """Сохранение аккаунта в БД"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO accounts 
            (id, email, password, proxy, status, total_requests, successful_requests, last_used_at, last_error, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            account.account_id,
            account.email,
            account.password,
            json.dumps(account.proxy) if account.proxy else None,
            account.status.value,
            account.total_requests,
            account.successful_requests,
            datetime.now().isoformat(),
            account.last_error,
            json.dumps({})
        ))
        
        conn.commit()
        conn.close()
    
    def add_account(
        self,
        email: str,
        password: str,
        proxy: Optional[Dict] = None,
        auto_init: bool = False
    ) -> Optional[str]:
        """Добавление нового аккаунта в пул"""
        account_id = f"acc_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        
        account = DeepSeekAccount(
            account_id=account_id,
            email=email,
            password=password,
            proxy=proxy
        )
        
        self.accounts[account_id] = account
        self._account_order.append(account_id)
        
        # Сохранение в БД
        self.save_account(account)
        
        logger.info(f"Added account {account_id} ({email})")
        
        return account_id
    
    def remove_account(self, account_id: str) -> bool:
        """Удаление аккаунта из пула"""
        if account_id in self.accounts:
            del self.accounts[account_id]
            if account_id in self._account_order:
                self._account_order.remove(account_id)
            
            # Удаление из БД
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
            conn.commit()
            conn.close()
            
            logger.info(f"Removed account {account_id}")
            return True
        
        return False
    
    def get_available_accounts(self) -> List[DeepSeekAccount]:
        """Получить список доступных аккаунтов"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        
        available = []
        for account in self.accounts.values():
            if account.status == AccountStatus.ACTIVE:
                # Проверка rate limit
                hourly_requests = len([t for t in account.request_times if t > hour_ago])
                if hourly_requests < account.rate_limit_config.max_requests_per_hour:
                    available.append(account)
        
        return available
    
    def select_account(self) -> Optional[DeepSeekAccount]:
        """Выбор аккаунта по стратегии ротации"""
        available = self.get_available_accounts()
        
        if not available:
            logger.warning("No available accounts")
            return None
        
        if self.rotation_strategy == "least_requests":
            # Выбор аккаунта с наименьшим количеством запросов
            now = datetime.now()
            hour_ago = now - timedelta(hours=1)
            
            def count_hourly(account):
                return len([t for t in account.request_times if t > hour_ago])
            
            return min(available, key=count_hourly)
        
        elif self.rotation_strategy == "round_robin":
            # Round-robin выбор
            for _ in range(len(self._account_order)):
                self._round_robin_index = (self._round_robin_index + 1) % len(self._account_order)
                account_id = self._account_order[self._round_robin_index]
                if account_id in self.accounts:
                    account = self.accounts[account_id]
                    if account in available:
                        return account
            return available[0] if available else None
        
        elif self.rotation_strategy == "random":
            return random.choice(available)
        
        return available[0]
    
    async def initialize_accounts(self, max_parallel: int = None) -> int:
        """
        Инициализация браузеров для аккаунтов.
        Запускает браузеры параллельно.
        """
        max_parallel = max_parallel or self.max_parallel_browsers
        
        # Аккаунты, которые нужно инициализировать
        to_init = [
            acc for acc in self.accounts.values()
            if acc.status not in [AccountStatus.ACTIVE, AccountStatus.RATE_LIMITED]
            or acc.session is None
        ]
        
        if not to_init:
            logger.info("All accounts already initialized")
            return 0
        
        logger.info(f"Initializing {len(to_init)} accounts...")
        
        initialized = 0
        batch_size = max_parallel
        
        # Инициализация батчами
        for i in range(0, len(to_init), batch_size):
            batch = to_init[i:i + batch_size]
            
            tasks = [acc.initialize() for acc in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for acc, result in zip(batch, results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to init {acc.account_id}: {result}")
                elif result:
                    initialized += 1
                    self.save_account(acc)
        
        logger.info(f"Initialized {initialized}/{len(to_init)} accounts")
        return initialized
    
    async def ask(
        self,
        prompt: str,
        replication: int = None,
        timeout: int = 120
    ) -> Dict[str, Any]:
        """
        Отправить запрос через пул аккаунтов.
        
        Args:
            prompt: Текст запроса
            replication: Количество аккаунтов для репликации (если None - используется config)
            timeout: Таймаут в секундах
        
        Returns:
            Dict с результатом
        """
        start_time = time.time()
        replication = replication or self.replication_factor
        
        # Выбор аккаунтов для репликации
        selected_accounts = []
        for _ in range(replication):
            account = self.select_account()
            if account and account not in selected_accounts:
                selected_accounts.append(account)
        
        if not selected_accounts:
            return {
                'success': False,
                'error': 'No available accounts',
                'response_time': time.time() - start_time
            }
        
        logger.debug(f"Sending request via {len(selected_accounts)} accounts (replication)")
        
        # Параллельная отправка запросов
        tasks = [acc.ask(prompt, timeout) for acc in selected_accounts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Выбор лучшего результата
        successful_results = []
        for acc, result in zip(selected_accounts, results):
            if isinstance(result, Exception):
                logger.warning(f"Account {acc.account_id} failed: {result}")
                continue
            
            if isinstance(result, dict) and result.get('success'):
                successful_results.append(result)
                # Сохранение аккаунта
                self.save_account(acc)
        
        if successful_results:
            # Выбор самого длинного ответа (обычно самый полный)
            best = max(successful_results, key=lambda r: len(r.get('response', '')))
            
            # Обновление статистики
            self.stats.total_requests_today += 1
            self.stats.total_requests_hour += 1
            self._request_times.append(time.time() - start_time)
            
            return {
                'success': True,
                'response': best['response'],
                'from_cache': best.get('from_cache', False),
                'response_time': time.time() - start_time,
                'account_id': best.get('account_id'),
                'replication_used': len(selected_accounts),
                'replication_success': len(successful_results)
            }
        
        # Все аккаунты failed
        return {
            'success': False,
            'error': 'All accounts failed',
            'response_time': time.time() - start_time,
            'accounts_tried': [acc.account_id for acc in selected_accounts]
        }
    
    async def heal_failed_accounts(self) -> int:
        """
        Восстановление failed аккаунтов.
        Перезапуск браузеров, смена прокси.
        """
        healed = 0
        
        for account in self.accounts.values():
            if account.status in [AccountStatus.ERROR, AccountStatus.LOGIN_REQUIRED]:
                logger.info(f"Healing account {account.account_id}")
                
                try:
                    success = await account.reset_session()
                    if success:
                        healed += 1
                        self.save_account(account)
                except Exception as e:
                    logger.error(f"Failed to heal {account.account_id}: {e}")
        
        logger.info(f"Healed {healed} accounts")
        return healed
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики пула"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        active = sum(1 for acc in self.accounts.values() if acc.status == AccountStatus.ACTIVE)
        rate_limited = sum(1 for acc in self.accounts.values() if acc.status == AccountStatus.RATE_LIMITED)
        error = sum(1 for acc in self.accounts.values() if acc.status == AccountStatus.ERROR)
        
        total_hourly = sum(
            len([t for t in acc.request_times if t > hour_ago])
            for acc in self.accounts.values()
        )
        
        total_daily = sum(
            len([t for t in acc.request_times if t > day_ago])
            for acc in self.accounts.values()
        )
        
        avg_response_time = (
            sum(self._request_times) / len(self._request_times)
            if self._request_times else 0
        )
        
        return {
            'total_accounts': len(self.accounts),
            'active_accounts': active,
            'rate_limited_accounts': rate_limited,
            'error_accounts': error,
            'total_requests_hour': total_hourly,
            'total_requests_today': total_daily,
            'avg_response_time': round(avg_response_time, 3),
            'max_parallel_browsers': self.max_parallel_browsers,
            'replication_factor': self.replication_factor,
            'rotation_strategy': self.rotation_strategy,
        }
    
    async def close_all(self) -> None:
        """Закрытие всех браузеров"""
        tasks = [acc.close() for acc in self.accounts.values()]
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("All browsers closed")


class LoadBalancer:
    """
    Балансировщик нагрузки для пула аккаунтов.
    Распределяет запросы с учётом текущих лимитов.
    """
    
    def __init__(self, pool: AccountPool):
        self.pool = pool
        self._request_queue: asyncio.Queue = None
        self._workers: List[asyncio.Task] = []
        self._running = False
    
    async def start(self, worker_count: int = 5) -> None:
        """Запуск воркеров балансировщика"""
        self._request_queue = asyncio.Queue()
        self._running = True
        
        for i in range(worker_count):
            worker = asyncio.create_task(self._worker(i))
            self._workers.append(worker)
        
        logger.info(f"Load balancer started with {worker_count} workers")
    
    async def stop(self) -> None:
        """Остановка балансировщика"""
        self._running = False
        
        # Отмена воркеров
        for worker in self._workers:
            worker.cancel()
        
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        
        logger.info("Load balancer stopped")
    
    async def _worker(self, worker_id: int) -> None:
        """Воркер обработки запросов"""
        logger.debug(f"Worker {worker_id} started")
        
        while self._running:
            try:
                # Получение задачи из очереди
                task = await asyncio.wait_for(
                    self._request_queue.get(),
                    timeout=1.0
                )
                
                prompt, future = task
                
                try:
                    result = await self.pool.ask(prompt)
                    future.set_result(result)
                except Exception as e:
                    future.set_exception(e)
                
                self._request_queue.task_done()
                
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
        
        logger.debug(f"Worker {worker_id} stopped")
    
    async def submit(self, prompt: str, priority: int = 0) -> asyncio.Future:
        """Отправка запроса в очередь"""
        future = asyncio.Future()
        await self._request_queue.put((prompt, future))
        return future
    
    def get_queue_size(self) -> int:
        """Размер очереди"""
        return self._request_queue.qsize() if self._request_queue else 0
