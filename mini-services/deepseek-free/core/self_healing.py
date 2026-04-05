"""
Self-Healing Module for DeepSeek Free
Автоматическое восстановление при ошибках и блокировках

МУКН | Трафик - Enterprise AI-powered Telegram Automation Platform
"""

import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger

from .deepseek_account import DeepSeekAccount, AccountStatus


class RecoveryAction(str, Enum):
    """Действия восстановления"""
    RESTART_BROWSER = "restart_browser"
    ROTATE_PROXY = "rotate_proxy"
    ROTATE_USER_AGENT = "rotate_user_agent"
    RELOGIN = "relogin"
    COOLDOWN = "cooldown"
    REPLACE_ACCOUNT = "replace_account"
    NONE = "none"


@dataclass
class HealthCheckResult:
    """Результат проверки здоровья"""
    account_id: str
    is_healthy: bool
    status: AccountStatus
    issues: List[str] = field(default_factory=list)
    last_error: Optional[str] = None
    response_time: Optional[float] = None
    recommended_action: RecoveryAction = RecoveryAction.NONE


@dataclass
class RecoveryLog:
    """Лог восстановления"""
    account_id: str
    action: RecoveryAction
    success: bool
    timestamp: datetime
    details: str


class ProxyRotator:
    """
    Ротатор прокси.
    Управляет пулом прокси и автоматически меняет их при банах.
    """
    
    def __init__(self, proxies: List[Dict[str, Any]] = None, proxy_file: str = None):
        self.proxies: List[Dict[str, Any]] = proxies or []
        self.proxy_file = proxy_file
        self.current_index = 0
        self.banned: set = set()
        
        # Загрузка из файла
        if proxy_file:
            self._load_from_file(proxy_file)
    
    def _load_from_file(self, file_path: str) -> None:
        """Загрузка прокси из файла"""
        try:
            with open(file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    # Формат: ip:port:user:pass или ip:port
                    parts = line.split(':')
                    if len(parts) >= 2:
                        proxy = {
                            'host': parts[0],
                            'port': int(parts[1]),
                            'type': 'http'
                        }
                        if len(parts) >= 4:
                            proxy['username'] = parts[2]
                            proxy['password'] = parts[3]
                        
                        self.proxies.append(proxy)
            
            logger.info(f"Loaded {len(self.proxies)} proxies from {file_path}")
        except Exception as e:
            logger.error(f"Failed to load proxies: {e}")
    
    def get_next(self) -> Optional[Dict[str, Any]]:
        """Получить следующий прокси"""
        available = [p for i, p in enumerate(self.proxies) if i not in self.banned]
        
        if not available:
            logger.warning("No available proxies, resetting banned list")
            self.banned.clear()
            available = self.proxies
        
        if not available:
            return None
        
        self.current_index = (self.current_index + 1) % len(available)
        return available[self.current_index]
    
    def mark_banned(self, proxy: Dict[str, Any]) -> None:
        """Отметить прокси как забаненный"""
        proxy_str = f"{proxy['host']}:{proxy['port']}"
        
        # Находим индекс
        for i, p in enumerate(self.proxies):
            if f"{p['host']}:{p['port']}" == proxy_str:
                self.banned.add(i)
                logger.warning(f"Proxy {proxy_str} marked as banned")
                break
    
    def get_stats(self) -> Dict[str, Any]:
        """Статистика прокси"""
        return {
            'total': len(self.proxies),
            'available': len(self.proxies) - len(self.banned),
            'banned': len(self.banned),
        }


class UserAgentRotator:
    """
    Ротатор User-Agent.
    Управляет пулом UA и автоматически меняет их.
    """
    
    DEFAULT_USER_AGENTS = [
        # Chrome на Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        # Chrome на Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        # Firefox на Windows
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
        # Firefox на Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        # Edge
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        # Safari на Mac
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    ]
    
    def __init__(self, user_agents: List[str] = None, user_agent_file: str = None):
        self.user_agents = user_agents or self.DEFAULT_USER_AGENTS.copy()
        self.user_agent_file = user_agent_file
        self.assigned: Dict[str, str] = {}  # account_id -> user_agent
        
        if user_agent_file:
            self._load_from_file(user_agent_file)
    
    def _load_from_file(self, file_path: str) -> None:
        """Загрузка User-Agent из файла"""
        try:
            with open(file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        self.user_agents.append(line)
            
            logger.info(f"Loaded user agents, total: {len(self.user_agents)}")
        except Exception as e:
            logger.error(f"Failed to load user agents: {e}")
    
    def get_for_account(self, account_id: str) -> str:
        """Получить User-Agent для аккаунта"""
        if account_id in self.assigned:
            return self.assigned[account_id]
        
        return self.rotate(account_id)
    
    def rotate(self, account_id: str) -> str:
        """Ротация User-Agent для аккаунта"""
        new_ua = random.choice(self.user_agents)
        self.assigned[account_id] = new_ua
        logger.debug(f"Rotated UA for {account_id}")
        return new_ua
    
    def get_stats(self) -> Dict[str, Any]:
        """Статистика"""
        return {
            'pool_size': len(self.user_agents),
            'assigned': len(self.assigned),
        }


class SelfHealingEngine:
    """
    Движок самовосстановления.
    Мониторит здоровье аккаунтов и выполняет восстановление.
    """
    
    def __init__(
        self,
        proxy_rotator: ProxyRotator = None,
        ua_rotator: UserAgentRotator = None,
        health_check_interval: int = 30,
        max_recovery_attempts: int = 3,
        cooldown_duration: int = 300,  # 5 минут
    ):
        self.proxy_rotator = proxy_rotator or ProxyRotator()
        self.ua_rotator = ua_rotator or UserAgentRotator()
        self.health_check_interval = health_check_interval
        self.max_recovery_attempts = max_recovery_attempts
        self.cooldown_duration = cooldown_duration
        
        # Состояние
        self.recovery_logs: List[RecoveryLog] = []
        self.cooldown_accounts: Dict[str, datetime] = {}
        self._running = False
        self._accounts: Dict[str, DeepSeekAccount] = {}
        
        # Callbacks
        self._on_account_recovered: Optional[Callable] = None
        self._on_account_failed: Optional[Callable] = None
    
    def set_accounts(self, accounts: Dict[str, DeepSeekAccount]) -> None:
        """Установка ссылок на аккаунты"""
        self._accounts = accounts
    
    def set_callbacks(
        self,
        on_recovered: Callable = None,
        on_failed: Callable = None
    ) -> None:
        """Установка callback-функций"""
        self._on_account_recovered = on_recovered
        self._on_account_failed = on_failed
    
    async def start(self) -> None:
        """Запуск мониторинга"""
        self._running = True
        logger.info("Self-healing engine started")
        
        while self._running:
            try:
                await self._health_check_cycle()
            except Exception as e:
                logger.error(f"Health check cycle error: {e}")
            
            await asyncio.sleep(self.health_check_interval)
    
    async def stop(self) -> None:
        """Остановка мониторинга"""
        self._running = False
        logger.info("Self-healing engine stopped")
    
    async def _health_check_cycle(self) -> None:
        """Цикл проверки здоровья"""
        for account_id, account in list(self._accounts.items()):
            # Пропуск аккаунтов в cooldown
            if account_id in self.cooldown_accounts:
                if datetime.now() < self.cooldown_accounts[account_id]:
                    continue
                else:
                    del self.cooldown_accounts[account_id]
            
            # Проверка здоровья
            result = await self._check_account_health(account)
            
            if not result.is_healthy:
                logger.warning(f"Account {account_id} unhealthy: {result.issues}")
                
                # Попытка восстановления
                if result.recommended_action != RecoveryAction.NONE:
                    await self._attempt_recovery(account, result)
    
    async def _check_account_health(self, account: DeepSeekAccount) -> HealthCheckResult:
        """Проверка здоровья аккаунта"""
        issues = []
        recommended_action = RecoveryAction.NONE
        
        # Проверка статуса
        if account.status == AccountStatus.BANNED:
            issues.append("Account banned")
            recommended_action = RecoveryAction.REPLACE_ACCOUNT
        
        elif account.status == AccountStatus.ERROR:
            issues.append(f"Error state: {account.last_error}")
            
            if 'captcha' in str(account.last_error).lower():
                recommended_action = RecoveryAction.ROTATE_PROXY
            elif 'session' in str(account.last_error).lower():
                recommended_action = RecoveryAction.RESTART_BROWSER
            else:
                recommended_action = RecoveryAction.RELOGIN
        
        elif account.status == AccountStatus.RATE_LIMITED:
            issues.append("Rate limited")
            recommended_action = RecoveryAction.COOLDOWN
        
        elif account.consecutive_errors >= 3:
            issues.append(f"Consecutive errors: {account.consecutive_errors}")
            recommended_action = RecoveryAction.RESTART_BROWSER
        
        # Проверка сессии браузера
        if account.session and not account.session.is_ready:
            issues.append("Browser session not ready")
            recommended_action = RecoveryAction.RESTART_BROWSER
        
        return HealthCheckResult(
            account_id=account.account_id,
            is_healthy=len(issues) == 0,
            status=account.status,
            issues=issues,
            last_error=account.last_error,
            recommended_action=recommended_action
        )
    
    async def _attempt_recovery(
        self,
        account: DeepSeekAccount,
        health_result: HealthCheckResult
    ) -> bool:
        """Попытка восстановления аккаунта"""
        action = health_result.recommended_action
        logger.info(f"Attempting recovery for {account.account_id}: {action.value}")
        
        success = False
        details = ""
        
        try:
            if action == RecoveryAction.RESTART_BROWSER:
                success = await self._restart_browser(account)
                details = "Browser restarted"
            
            elif action == RecoveryAction.ROTATE_PROXY:
                success = await self._rotate_proxy(account)
                details = "Proxy rotated"
            
            elif action == RecoveryAction.ROTATE_USER_AGENT:
                success = await self._rotate_user_agent(account)
                details = "User-Agent rotated"
            
            elif action == RecoveryAction.RELOGIN:
                success = await self._relogin(account)
                details = "Re-login performed"
            
            elif action == RecoveryAction.COOLDOWN:
                self._set_cooldown(account.account_id)
                success = True
                details = f"Cooldown set for {self.cooldown_duration}s"
            
            elif action == RecoveryAction.REPLACE_ACCOUNT:
                details = "Account needs replacement"
                if self._on_account_failed:
                    await self._on_account_failed(account.account_id)
        
        except Exception as e:
            logger.error(f"Recovery failed for {account.account_id}: {e}")
            details = f"Recovery error: {e}"
        
        # Логирование
        self.recovery_logs.append(RecoveryLog(
            account_id=account.account_id,
            action=action,
            success=success,
            timestamp=datetime.now(),
            details=details
        ))
        
        # Callback при успехе
        if success and self._on_account_recovered:
            await self._on_account_recovered(account.account_id)
        
        return success
    
    async def _restart_browser(self, account: DeepSeekAccount) -> bool:
        """Перезапуск браузера"""
        try:
            await account.close()
            await asyncio.sleep(2)
            
            # Новый User-Agent
            account.user_agent = self.ua_rotator.rotate(account.account_id)
            
            success = await account.initialize()
            
            if success:
                account.status = AccountStatus.ACTIVE
                account.consecutive_errors = 0
                logger.info(f"Browser restarted for {account.account_id}")
            
            return success
        except Exception as e:
            logger.error(f"Browser restart failed: {e}")
            return False
    
    async def _rotate_proxy(self, account: DeepSeekAccount) -> bool:
        """Ротация прокси"""
        # Отметить текущий как забаненный
        if account.proxy:
            self.proxy_rotator.mark_banned(account.proxy)
        
        # Получить новый
        new_proxy = self.proxy_rotator.get_next()
        account.proxy = new_proxy
        
        # Перезапуск браузера с новым прокси
        return await self._restart_browser(account)
    
    async def _rotate_user_agent(self, account: DeepSeekAccount) -> bool:
        """Ротация User-Agent"""
        account.user_agent = self.ua_rotator.rotate(account.account_id)
        return await self._restart_browser(account)
    
    async def _relogin(self, account: DeepSeekAccount) -> bool:
        """Повторный вход"""
        try:
            await account.close()
            await asyncio.sleep(2)
            
            success = await account.initialize()
            
            if success:
                account.status = AccountStatus.ACTIVE
                account.consecutive_errors = 0
            
            return success
        except Exception as e:
            logger.error(f"Re-login failed: {e}")
            return False
    
    def _set_cooldown(self, account_id: str) -> None:
        """Установка cooldown для аккаунта"""
        self.cooldown_accounts[account_id] = datetime.now() + timedelta(seconds=self.cooldown_duration)
        logger.info(f"Cooldown set for {account_id} until {self.cooldown_accounts[account_id]}")
    
    def get_recovery_stats(self) -> Dict[str, Any]:
        """Статистика восстановлений"""
        total = len(self.recovery_logs)
        successful = sum(1 for log in self.recovery_logs if log.success)
        
        action_counts = {}
        for log in self.recovery_logs:
            action = log.action.value
            action_counts[action] = action_counts.get(action, 0) + 1
        
        return {
            'total_recovery_attempts': total,
            'successful_recoveries': successful,
            'success_rate': successful / total if total > 0 else 0,
            'action_breakdown': action_counts,
            'accounts_in_cooldown': len(self.cooldown_accounts),
            'proxy_stats': self.proxy_rotator.get_stats(),
            'user_agent_stats': self.ua_rotator.get_stats(),
        }


class HealthMonitor:
    """
    Монитор здоровья для API.
    Периодически проверяет состояние всех компонентов.
    """
    
    def __init__(self, pool, cache, healing_engine: SelfHealingEngine = None):
        self.pool = pool
        self.cache = cache
        self.healing_engine = healing_engine
        self._last_check: Optional[datetime] = None
        self._check_history: List[Dict] = []
    
    async def check_all(self) -> Dict[str, Any]:
        """Полная проверка здоровья"""
        now = datetime.now()
        self._last_check = now
        
        result = {
            'timestamp': now.isoformat(),
            'status': 'healthy',
            'components': {}
        }
        
        issues = []
        
        # Проверка пула аккаунтов
        pool_stats = self.pool.get_stats()
        pool_health = pool_stats['active_accounts'] > 0
        result['components']['pool'] = {
            'healthy': pool_health,
            'stats': pool_stats
        }
        if not pool_health:
            issues.append('No active accounts')
        
        # Проверка кэша
        cache_stats = self.cache.get_stats()
        cache_health = cache_stats.get('l1', {}).get('size', 0) >= 0
        result['components']['cache'] = {
            'healthy': cache_health,
            'stats': cache_stats
        }
        
        # Проверка healing engine
        if self.healing_engine:
            healing_stats = self.healing_engine.get_recovery_stats()
            result['components']['self_healing'] = {
                'healthy': True,
                'stats': healing_stats
            }
        
        # Общий статус
        if issues:
            result['status'] = 'degraded' if len(issues) < 3 else 'unhealthy'
            result['issues'] = issues
        
        # Сохранение в историю
        self._check_history.append(result)
        if len(self._check_history) > 100:
            self._check_history = self._check_history[-100:]
        
        return result
    
    def get_history(self, limit: int = 10) -> List[Dict]:
        """Получить историю проверок"""
        return self._check_history[-limit:]
