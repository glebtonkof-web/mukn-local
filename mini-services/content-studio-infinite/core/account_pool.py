"""
Content Studio Infinite - Account Pool
Пул аккаунтов для всех провайдеров с ротацией и балансировкой

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import asyncio
import json
import random
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from loguru import logger

from .types import ProviderAccount, AccountStatus


class AccountPool:
    """
    Менеджер пула аккаунтов для всех провайдеров.
    
    Features:
    - Хранение в SQLite
    - Ротация по различным стратегиям
    - Авто-сброс дневных лимитов
    - Self-healing забаненных аккаунтов
    """
    
    def __init__(
        self,
        db_path: str = "./data/content_studio.db",
        rotation_strategy: str = "least_used"
    ):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.rotation_strategy = rotation_strategy
        
        # Аккаунты по провайдерам
        self.accounts: Dict[str, List[ProviderAccount]] = {}
        
        # Lock для синхронизации
        self._lock = asyncio.Lock()
        
        # Инициализация БД
        self._init_db()
        
        # Загрузка аккаунтов
        self._load_accounts()
    
    def _init_db(self) -> None:
        """Инициализация базы данных"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                account_id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                email TEXT NOT NULL,
                password TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                cookies TEXT,
                session_data TEXT,
                credits_remaining INTEGER DEFAULT 0,
                credits_total INTEGER DEFAULT 0,
                requests_today INTEGER DEFAULT 0,
                requests_this_hour INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP,
                last_error TEXT,
                proxy TEXT,
                metadata TEXT
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_provider ON accounts(provider)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON accounts(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_credits ON accounts(credits_remaining)')
        
        conn.commit()
        conn.close()
    
    def _load_accounts(self) -> int:
        """Загрузка аккаунтов из БД"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT account_id, provider, email, password, status, cookies, session_data,
                   credits_remaining, credits_total, requests_today, requests_this_hour,
                   created_at, last_used_at, last_error, proxy, metadata
            FROM accounts
            WHERE status != 'banned'
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        loaded = 0
        for row in rows:
            (account_id, provider, email, password, status, cookies_str, session_str,
             credits_remaining, credits_total, requests_today, requests_this_hour,
             created_at, last_used_at, last_error, proxy_str, metadata_str) = row
            
            account = ProviderAccount(
                account_id=account_id,
                provider=provider,
                email=email,
                password=password,
                status=AccountStatus(status) if status else AccountStatus.ACTIVE,
                cookies=json.loads(cookies_str) if cookies_str else [],
                session_data=json.loads(session_str) if session_str else {},
                credits_remaining=credits_remaining or 0,
                credits_total=credits_total or 0,
                requests_today=requests_today or 0,
                requests_this_hour=requests_this_hour or 0,
                created_at=datetime.fromisoformat(created_at) if created_at else datetime.now(),
                last_used_at=datetime.fromisoformat(last_used_at) if last_used_at else None,
                last_error=last_error,
                proxy=json.loads(proxy_str) if proxy_str else None,
                metadata=json.loads(metadata_str) if metadata_str else {},
            )
            
            if provider not in self.accounts:
                self.accounts[provider] = []
            self.accounts[provider].append(account)
            loaded += 1
        
        logger.info(f"Loaded {loaded} accounts from database")
        return loaded
    
    def save_account(self, account: ProviderAccount) -> None:
        """Сохранение аккаунта в БД"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO accounts 
            (account_id, provider, email, password, status, cookies, session_data,
             credits_remaining, credits_total, requests_today, requests_this_hour,
             last_used_at, last_error, proxy, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            account.account_id,
            account.provider,
            account.email,
            account.password,
            account.status.value,
            json.dumps(account.cookies),
            json.dumps(account.session_data),
            account.credits_remaining,
            account.credits_total,
            account.requests_today,
            account.requests_this_hour,
            datetime.now().isoformat(),
            account.last_error,
            json.dumps(account.proxy) if account.proxy else None,
            json.dumps(account.metadata),
        ))
        
        conn.commit()
        conn.close()
    
    def add_account(
        self,
        provider: str,
        email: str,
        password: str,
        cookies: List[Dict] = None,
        credits: int = 0,
        proxy: Dict = None
    ) -> Optional[str]:
        """Добавление нового аккаунта"""
        account_id = f"{provider}_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        
        account = ProviderAccount(
            account_id=account_id,
            provider=provider,
            email=email,
            password=password,
            cookies=cookies or [],
            credits_remaining=credits,
            credits_total=credits,
            proxy=proxy,
        )
        
        if provider not in self.accounts:
            self.accounts[provider] = []
        self.accounts[provider].append(account)
        
        # Сохранение в БД
        self.save_account(account)
        
        logger.info(f"Added account {account_id} for {provider}")
        return account_id
    
    def remove_account(self, account_id: str) -> bool:
        """Удаление аккаунта"""
        for provider, accounts in self.accounts.items():
            for i, account in enumerate(accounts):
                if account.account_id == account_id:
                    del accounts[i]
                    
                    # Удаление из БД
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    cursor.execute('DELETE FROM accounts WHERE account_id = ?', (account_id,))
                    conn.commit()
                    conn.close()
                    
                    logger.info(f"Removed account {account_id}")
                    return True
        return False
    
    def get_accounts(self, provider: str) -> List[ProviderAccount]:
        """Получить все аккаунты провайдера"""
        return self.accounts.get(provider, [])
    
    def get_available_accounts(
        self,
        provider: str,
        min_credits: int = 1
    ) -> List[ProviderAccount]:
        """Получить доступные аккаунты провайдера"""
        accounts = self.accounts.get(provider, [])
        available = []
        
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        for account in accounts:
            # Проверка статуса
            if account.status != AccountStatus.ACTIVE:
                continue
            
            # Сброс дневных счётчиков
            if account.last_used_at and account.last_used_at < day_start:
                account.requests_today = 0
                account.requests_this_hour = 0
            
            # Сброс часовых счётчиков
            if account.last_used_at and account.last_used_at < hour_ago:
                account.requests_this_hour = 0
            
            # Проверка кредитов
            if account.credits_remaining < min_credits:
                continue
            
            available.append(account)
        
        return available
    
    def select_account(
        self,
        provider: str,
        max_hourly_requests: int = 10
    ) -> Optional[ProviderAccount]:
        """
        Выбор аккаунта по стратегии ротации.
        
        Args:
            provider: Имя провайдера
            max_hourly_requests: Максимум запросов в час на аккаунт
            
        Returns:
            Выбранный аккаунт или None
        """
        available = self.get_available_accounts(provider)
        
        # Фильтрация по часовому лимиту
        available = [
            acc for acc in available
            if acc.requests_this_hour < max_hourly_requests
        ]
        
        if not available:
            logger.warning(f"No available accounts for {provider}")
            return None
        
        if self.rotation_strategy == "least_used":
            # Аккаунт с наименьшим использованием
            return min(available, key=lambda a: a.requests_today)
        
        elif self.rotation_strategy == "most_credits":
            # Аккаунт с наибольшим количеством кредитов
            return max(available, key=lambda a: a.credits_remaining)
        
        elif self.rotation_strategy == "random":
            return random.choice(available)
        
        elif self.rotation_strategy == "round_robin":
            # Round-robin (простая реализация)
            return available[0]
        
        return available[0]
    
    def record_usage(
        self,
        account_id: str,
        credits_used: int = 1,
        success: bool = True
    ) -> None:
        """Записать использование аккаунта"""
        for provider, accounts in self.accounts.items():
            for account in accounts:
                if account.account_id == account_id:
                    account.requests_today += 1
                    account.requests_this_hour += 1
                    account.credits_remaining = max(0, account.credits_remaining - credits_used)
                    account.last_used_at = datetime.now()
                    
                    if not success:
                        account.last_error = "Generation failed"
                    
                    self.save_account(account)
                    return
    
    def mark_account_error(
        self,
        account_id: str,
        error: str,
        new_status: AccountStatus = None
    ) -> None:
        """Отметить ошибку аккаунта"""
        for provider, accounts in self.accounts.items():
            for account in accounts:
                if account.account_id == account_id:
                    account.last_error = error
                    if new_status:
                        account.status = new_status
                    self.save_account(account)
                    logger.warning(f"Account {account_id} error: {error}")
                    return
    
    def reset_daily_counters(self) -> int:
        """Сброс дневных счётчиков для всех аккаунтов"""
        reset_count = 0
        
        for provider, accounts in self.accounts.items():
            for account in accounts:
                if account.requests_today > 0:
                    account.requests_today = 0
                    account.requests_this_hour = 0
                    self.save_account(account)
                    reset_count += 1
        
        if reset_count > 0:
            logger.info(f"Reset daily counters for {reset_count} accounts")
        
        return reset_count
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики пула"""
        stats = {
            'total_accounts': 0,
            'active_accounts': 0,
            'rate_limited': 0,
            'error_accounts': 0,
            'total_credits': 0,
            'by_provider': {},
        }
        
        for provider, accounts in self.accounts.items():
            provider_stats = {
                'total': len(accounts),
                'active': 0,
                'credits': 0,
            }
            
            stats['total_accounts'] += len(accounts)
            
            for account in accounts:
                if account.status == AccountStatus.ACTIVE:
                    stats['active_accounts'] += 1
                    provider_stats['active'] += 1
                elif account.status == AccountStatus.RATE_LIMITED:
                    stats['rate_limited'] += 1
                elif account.status == AccountStatus.ERROR:
                    stats['error_accounts'] += 1
                
                stats['total_credits'] += account.credits_remaining
                provider_stats['credits'] += account.credits_remaining
            
            stats['by_provider'][provider] = provider_stats
        
        return stats
    
    async def close(self) -> None:
        """Закрытие ресурсов"""
        pass
