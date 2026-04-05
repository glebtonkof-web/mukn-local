"""
Self-Healing Module for DeepSeek Free Service
Automatic recovery from errors, bans, and rate limits
"""

import asyncio
import random
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, Any, List, Callable, Awaitable
from loguru import logger

from .deepseek_account import DeepSeekAccount, AccountStatus


class HealthStatus(str, Enum):
    """Health check status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"


class RecoveryAction(str, Enum):
    """Recovery actions"""
    NONE = "none"
    REFRESH_SESSION = "refresh_session"
    CHANGE_PROXY = "change_proxy"
    CHANGE_USER_AGENT = "change_user_agent"
    FULL_RESET = "full_reset"
    QUARANTINE = "quarantine"
    REMOVE_ACCOUNT = "remove_account"


@dataclass
class HealthCheckResult:
    """Health check result"""
    account_id: str
    status: HealthStatus
    can_request: bool
    consecutive_errors: int
    last_error: Optional[str]
    last_success: Optional[datetime]
    response_time: Optional[float]
    recommended_action: RecoveryAction
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RecoveryResult:
    """Recovery action result"""
    account_id: str
    action: RecoveryAction
    success: bool
    message: str
    new_status: Optional[AccountStatus] = None
    performed_at: datetime = field(default_factory=datetime.now)


class HealthChecker:
    """
    Health checker for accounts.
    
    Performs regular health checks and determines
    if recovery actions are needed.
    """
    
    def __init__(
        self,
        check_interval: int = 300,  # 5 minutes
        unhealthy_threshold: int = 5,
        degraded_threshold: int = 3,
        recovery_cooldown: int = 300,  # 5 minutes
    ):
        self.check_interval = check_interval
        self.unhealthy_threshold = unhealthy_threshold
        self.degraded_threshold = degraded_threshold
        self.recovery_cooldown = recovery_cooldown
        
        self._last_check: Dict[str, datetime] = {}
        self._last_recovery: Dict[str, datetime] = {}
        self._health_history: Dict[str, List[HealthCheckResult]] = {}
    
    async def check_account(
        self,
        account: DeepSeekAccount,
    ) -> HealthCheckResult:
        """Perform health check on account"""
        account_id = account.account_id
        
        # Determine health status
        status = HealthStatus.HEALTHY
        recommended_action = RecoveryAction.NONE
        
        # Check error count
        errors = account.consecutive_errors
        can_request = account._can_make_request()
        
        if errors >= self.unhealthy_threshold:
            status = HealthStatus.UNHEALTHY
            recommended_action = RecoveryAction.FULL_RESET
        elif errors >= self.degraded_threshold:
            status = HealthStatus.DEGRADED
            recommended_action = RecoveryAction.REFRESH_SESSION
        elif account.status == AccountStatus.RATE_LIMITED:
            status = HealthStatus.DEGRADED
            recommended_action = RecoveryAction.NONE  # Wait it out
        elif account.status == AccountStatus.BANNED:
            status = HealthStatus.CRITICAL
            recommended_action = RecoveryAction.QUARANTINE
        elif account.status == AccountStatus.ERROR:
            status = HealthStatus.UNHEALTHY
            recommended_action = RecoveryAction.FULL_RESET
        
        # Calculate response time
        response_time = None
        if account.request_times:
            last_request = max(account.request_times)
            response_time = (datetime.now() - last_request).total_seconds()
        
        result = HealthCheckResult(
            account_id=account_id,
            status=status,
            can_request=can_request,
            consecutive_errors=errors,
            last_error=account.last_error,
            last_success=max(account.request_times) if account.request_times else None,
            response_time=response_time,
            recommended_action=recommended_action,
            details={
                'total_requests': account.total_requests,
                'successful_requests': account.successful_requests,
                'success_rate': account.successful_requests / max(1, account.total_requests),
                'account_status': account.status.value,
            }
        )
        
        # Store in history
        if account_id not in self._health_history:
            self._health_history[account_id] = []
        
        self._health_history[account_id].append(result)
        
        # Keep only last 10 results
        if len(self._health_history[account_id]) > 10:
            self._health_history[account_id] = self._health_history[account_id][-10:]
        
        self._last_check[account_id] = datetime.now()
        
        return result
    
    async def check_all(
        self,
        accounts: Dict[str, DeepSeekAccount],
    ) -> Dict[str, HealthCheckResult]:
        """Check all accounts"""
        results = {}
        
        for account_id, account in accounts.items():
            results[account_id] = await self.check_account(account)
        
        return results
    
    def needs_recovery(
        self,
        account_id: str,
        result: HealthCheckResult,
    ) -> bool:
        """Check if account needs recovery"""
        if result.recommended_action == RecoveryAction.NONE:
            return False
        
        # Check cooldown
        if account_id in self._last_recovery:
            last = self._last_recovery[account_id]
            if datetime.now() - last < timedelta(seconds=self.recovery_cooldown):
                return False
        
        return True
    
    def get_health_summary(
        self,
        results: Dict[str, HealthCheckResult],
    ) -> Dict[str, Any]:
        """Get health summary"""
        status_counts = {s.value: 0 for s in HealthStatus}
        
        for result in results.values():
            status_counts[result.status.value] += 1
        
        healthy_count = status_counts[HealthStatus.HEALTHY.value]
        total = len(results)
        
        return {
            'total_accounts': total,
            'healthy': healthy_count,
            'degraded': status_counts[HealthStatus.DEGRADED.value],
            'unhealthy': status_counts[HealthStatus.UNHEALTHY.value],
            'critical': status_counts[HealthStatus.CRITICAL.value],
            'health_rate': healthy_count / max(1, total),
            'status_counts': status_counts,
        }
    
    def mark_recovery(self, account_id: str):
        """Mark that recovery was performed"""
        self._last_recovery[account_id] = datetime.now()


class SelfHealingManager:
    """
    Self-healing manager for automatic recovery.
    
    Features:
    - Automatic health monitoring
    - Recovery action execution
    - Proxy rotation
    - User-Agent rotation
    - Session refresh
    - Quarantine management
    """
    
    def __init__(
        self,
        health_checker: Optional[HealthChecker] = None,
        proxy_pool: Optional[List[Dict[str, Any]]] = None,
        user_agents: Optional[List[str]] = None,
        auto_heal_enabled: bool = True,
        max_recovery_attempts: int = 3,
    ):
        self.health_checker = health_checker or HealthChecker()
        self.proxy_pool = proxy_pool or []
        self.user_agents = user_agents or self._default_user_agents()
        self.auto_heal_enabled = auto_heal_enabled
        self.max_recovery_attempts = max_recovery_attempts
        
        # State
        self._quarantine: Dict[str, DeepSeekAccount] = {}
        self._recovery_attempts: Dict[str, int] = {}
        self._proxy_assignments: Dict[str, Dict[str, Any]] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None
        
        # Callbacks
        self._on_account_removed: Optional[Callable] = None
        self._on_account_quarantined: Optional[Callable] = None
    
    @staticmethod
    def _default_user_agents() -> List[str]:
        """Default user agents pool"""
        return [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        ]
    
    def set_callbacks(
        self,
        on_removed: Optional[Callable] = None,
        on_quarantined: Optional[Callable] = None,
    ):
        """Set event callbacks"""
        self._on_account_removed = on_removed
        self._on_account_quarantined = on_quarantined
    
    async def perform_recovery(
        self,
        account: DeepSeekAccount,
        action: RecoveryAction,
    ) -> RecoveryResult:
        """Execute recovery action"""
        account_id = account.account_id
        
        logger.info(f"Performing recovery '{action.value}' for account {account_id}")
        
        try:
            if action == RecoveryAction.REFRESH_SESSION:
                return await self._refresh_session(account)
            
            elif action == RecoveryAction.CHANGE_PROXY:
                return await self._change_proxy(account)
            
            elif action == RecoveryAction.CHANGE_USER_AGENT:
                return await self._change_user_agent(account)
            
            elif action == RecoveryAction.FULL_RESET:
                return await self._full_reset(account)
            
            elif action == RecoveryAction.QUARANTINE:
                return await self._quarantine_account(account)
            
            elif action == RecoveryAction.REMOVE_ACCOUNT:
                return await self._remove_account(account)
            
            else:
                return RecoveryResult(
                    account_id=account_id,
                    action=action,
                    success=False,
                    message="Unknown action",
                )
                
        except Exception as e:
            logger.error(f"Recovery failed for {account_id}: {e}")
            return RecoveryResult(
                account_id=account_id,
                action=action,
                success=False,
                message=str(e),
            )
    
    async def _refresh_session(
        self,
        account: DeepSeekAccount,
    ) -> RecoveryResult:
        """Refresh browser session"""
        success = await account.reset_session()
        
        self.health_checker.mark_recovery(account.account_id)
        
        return RecoveryResult(
            account_id=account.account_id,
            action=RecoveryAction.REFRESH_SESSION,
            success=success,
            message="Session refreshed" if success else "Session refresh failed",
            new_status=account.status,
        )
    
    async def _change_proxy(
        self,
        account: DeepSeekAccount,
    ) -> RecoveryResult:
        """Change proxy for account"""
        if not self.proxy_pool:
            return RecoveryResult(
                account_id=account.account_id,
                action=RecoveryAction.CHANGE_PROXY,
                success=False,
                message="No proxy pool available",
            )
        
        # Get new proxy (different from current)
        current_proxy = account.proxy
        new_proxy = None
        
        for proxy in self.proxy_pool:
            if proxy != current_proxy:
                new_proxy = proxy
                break
        
        if not new_proxy:
            new_proxy = random.choice(self.proxy_pool)
        
        # Update account proxy
        account.proxy = new_proxy
        self._proxy_assignments[account.account_id] = new_proxy
        
        # Reset session with new proxy
        success = await account.reset_session()
        
        self.health_checker.mark_recovery(account.account_id)
        
        return RecoveryResult(
            account_id=account.account_id,
            action=RecoveryAction.CHANGE_PROXY,
            success=success,
            message=f"Proxy changed to {new_proxy.get('host', 'unknown')}",
            new_status=account.status,
        )
    
    async def _change_user_agent(
        self,
        account: DeepSeekAccount,
    ) -> RecoveryResult:
        """Change user agent"""
        current_ua = account.user_agent
        new_ua = random.choice([ua for ua in self.user_agents if ua != current_ua])
        
        account.user_agent = new_ua
        
        # Reset session with new UA
        success = await account.reset_session()
        
        self.health_checker.mark_recovery(account.account_id)
        
        return RecoveryResult(
            account_id=account.account_id,
            action=RecoveryAction.CHANGE_USER_AGENT,
            success=success,
            message="User-Agent changed",
            new_status=account.status,
        )
    
    async def _full_reset(
        self,
        account: DeepSeekAccount,
    ) -> RecoveryResult:
        """Full account reset (proxy + UA + session)"""
        # Change proxy if available
        if self.proxy_pool:
            new_proxy = random.choice(self.proxy_pool)
            account.proxy = new_proxy
            self._proxy_assignments[account.account_id] = new_proxy
        
        # Change user agent
        account.user_agent = random.choice(self.user_agents)
        
        # Reset session
        success = await account.reset_session()
        
        self.health_checker.mark_recovery(account.account_id)
        
        return RecoveryResult(
            account_id=account.account_id,
            action=RecoveryAction.FULL_RESET,
            success=success,
            message="Full reset completed",
            new_status=account.status,
        )
    
    async def _quarantine_account(
        self,
        account: DeepSeekAccount,
    ) -> RecoveryResult:
        """Move account to quarantine"""
        self._quarantine[account.account_id] = account
        
        # Close browser session
        await account.close()
        
        account.status = AccountStatus.BANNED
        
        # Callback
        if self._on_account_quarantined:
            try:
                await self._on_account_quarantined(account.account_id)
            except Exception as e:
                logger.error(f"Quarantine callback error: {e}")
        
        return RecoveryResult(
            account_id=account.account_id,
            action=RecoveryAction.QUARANTINE,
            success=True,
            message="Account quarantined",
            new_status=AccountStatus.BANNED,
        )
    
    async def _remove_account(
        self,
        account: DeepSeekAccount,
    ) -> RecoveryResult:
        """Remove account completely"""
        await account.close()
        
        # Callback
        if self._on_account_removed:
            try:
                await self._on_account_removed(account.account_id)
            except Exception as e:
                logger.error(f"Remove callback error: {e}")
        
        return RecoveryResult(
            account_id=account.account_id,
            action=RecoveryAction.REMOVE_ACCOUNT,
            success=True,
            message="Account removed",
        )
    
    async def start_monitoring(
        self,
        accounts: Dict[str, DeepSeekAccount],
    ):
        """Start automatic health monitoring"""
        if self._running:
            logger.warning("Monitoring already running")
            return
        
        self._running = True
        
        async def monitor_loop():
            while self._running:
                try:
                    # Health check all accounts
                    results = await self.health_checker.check_all(accounts)
                    
                    # Process results
                    for account_id, result in results.items():
                        if not self.auto_heal_enabled:
                            continue
                        
                        if not self.health_checker.needs_recovery(account_id, result):
                            continue
                        
                        account = accounts.get(account_id)
                        if not account:
                            continue
                        
                        # Check recovery attempts
                        attempts = self._recovery_attempts.get(account_id, 0)
                        if attempts >= self.max_recovery_attempts:
                            logger.warning(f"Max recovery attempts reached for {account_id}")
                            await self.perform_recovery(account, RecoveryAction.QUARANTINE)
                            continue
                        
                        # Perform recovery
                        recovery_result = await self.perform_recovery(
                            account,
                            result.recommended_action
                        )
                        
                        if recovery_result.success:
                            self._recovery_attempts[account_id] = 0
                        else:
                            self._recovery_attempts[account_id] = attempts + 1
                    
                    # Wait before next check
                    await asyncio.sleep(self.health_checker.check_interval)
                    
                except Exception as e:
                    logger.error(f"Monitoring loop error: {e}")
                    await asyncio.sleep(60)
        
        self._task = asyncio.create_task(monitor_loop())
        logger.info("Health monitoring started")
    
    async def stop_monitoring(self):
        """Stop health monitoring"""
        self._running = False
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        
        logger.info("Health monitoring stopped")
    
    def is_monitoring(self) -> bool:
        """Check if monitoring is active"""
        return self._running
    
    def get_quarantine(self) -> Dict[str, DeepSeekAccount]:
        """Get quarantined accounts"""
        return self._quarantine.copy()
    
    async def restore_from_quarantine(
        self,
        account_id: str,
    ) -> bool:
        """Attempt to restore account from quarantine"""
        if account_id not in self._quarantine:
            return False
        
        account = self._quarantine[account_id]
        
        # Try full reset
        result = await self._full_reset(account)
        
        if result.success:
            del self._quarantine[account_id]
            self._recovery_attempts[account_id] = 0
            return True
        
        return False
    
    def get_recovery_stats(self) -> Dict[str, Any]:
        """Get recovery statistics"""
        return {
            'quarantine_count': len(self._quarantine),
            'recovery_attempts': dict(self._recovery_attempts),
            'proxy_assignments': len(self._proxy_assignments),
            'monitoring_active': self._running,
        }
