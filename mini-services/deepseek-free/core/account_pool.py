"""
DeepSeek Account Pool Manager with Load Balancing
Manages multiple accounts for industrial-scale request handling
"""

import asyncio
import random
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from loguru import logger

from .deepseek_account import DeepSeekAccount, AccountStatus


@dataclass
class PoolStats:
    """Pool statistics"""
    total_accounts: int = 0
    active_accounts: int = 0
    rate_limited_accounts: int = 0
    banned_accounts: int = 0
    error_accounts: int = 0
    total_requests_today: int = 0
    total_requests_hour: int = 0
    avg_response_time: float = 0.0
    success_rate: float = 0.0
    available_capacity: int = 0  # How many more requests we can handle this hour


class LoadBalancer:
    """
    Load balancer for distributing requests across accounts.
    
    Strategies:
    - round_robin: Cycle through accounts
    - least_used: Select account with fewest requests
    - weighted: Weight by success rate and capacity
    - random: Random selection
    """
    
    def __init__(self, strategy: str = "least_used"):
        self.strategy = strategy
        self._round_robin_index = 0
    
    def select_account(
        self,
        accounts: List[DeepSeekAccount],
        exclude_ids: Optional[List[str]] = None
    ) -> Optional[DeepSeekAccount]:
        """Select best account based on strategy"""
        exclude_ids = exclude_ids or []
        
        # Filter available accounts
        available = [
            a for a in accounts
            if a.status == AccountStatus.ACTIVE
            and a._can_make_request()
            and a.account_id not in exclude_ids
        ]
        
        if not available:
            return None
        
        if self.strategy == "round_robin":
            return self._round_robin(available)
        elif self.strategy == "least_used":
            return self._least_used(available)
        elif self.strategy == "weighted":
            return self._weighted(available)
        elif self.strategy == "random":
            return random.choice(available)
        else:
            return self._least_used(available)
    
    def _round_robin(self, accounts: List[DeepSeekAccount]) -> DeepSeekAccount:
        """Round robin selection"""
        account = accounts[self._round_robin_index % len(accounts)]
        self._round_robin_index += 1
        return account
    
    def _least_used(self, accounts: List[DeepSeekAccount]) -> DeepSeekAccount:
        """Select account with fewest requests"""
        return min(accounts, key=lambda a: len(a.request_times))
    
    def _weighted(self, accounts: List[DeepSeekAccount]) -> DeepSeekAccount:
        """Weighted random selection based on capacity and success rate"""
        weights = []
        for account in accounts:
            # Weight based on remaining capacity and success rate
            remaining_capacity = account.rate_limit_config.max_requests_per_hour - len([
                t for t in account.request_times
                if t > datetime.now() - timedelta(hours=1)
            ])
            success_rate = account.successful_requests / max(1, account.total_requests)
            
            weight = remaining_capacity * (0.5 + 0.5 * success_rate)
            weights.append(weight)
        
        # Weighted random choice
        total = sum(weights)
        if total == 0:
            return random.choice(accounts)
        
        r = random.random() * total
        cumulative = 0
        for i, weight in enumerate(weights):
            cumulative += weight
            if r <= cumulative:
                return accounts[i]
        
        return accounts[-1]


class DeepSeekPool:
    """
    Pool manager for multiple DeepSeek accounts.
    
    Features:
    - Load balancing across accounts
    - Automatic account rotation
    - Health monitoring
    - Request queuing when at capacity
    - Parallel request support
    """
    
    def __init__(
        self,
        load_balancer: Optional[LoadBalancer] = None,
        max_concurrent_requests: int = 20,
        replication_factor: int = 1,  # Number of accounts to use for same request
        min_accounts: int = 1,
        auto_heal: bool = True,
    ):
        self.load_balancer = load_balancer or LoadBalancer("least_used")
        self.max_concurrent_requests = max_concurrent_requests
        self.replication_factor = replication_factor
        self.min_accounts = min_accounts
        self.auto_heal = auto_heal
        
        self.accounts: Dict[str, DeepSeekAccount] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._lock = asyncio.Lock()
        
        # Stats
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
    
    async def add_account(
        self,
        account_id: str,
        email: str,
        password: str,
        proxy: Optional[Dict[str, Any]] = None,
        auto_init: bool = True,
    ) -> DeepSeekAccount:
        """Add new account to pool"""
        account = DeepSeekAccount(
            account_id=account_id,
            email=email,
            password=password,
            proxy=proxy,
        )
        
        self.accounts[account_id] = account
        
        if auto_init:
            success = await account.initialize()
            if not success:
                logger.warning(f"Failed to initialize account {account_id}")
        
        return account
    
    async def remove_account(self, account_id: str):
        """Remove account from pool"""
        if account_id in self.accounts:
            account = self.accounts[account_id]
            await account.close()
            del self.accounts[account_id]
    
    async def ask(
        self,
        prompt: str,
        timeout: int = 120,
        priority_accounts: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Send prompt using best available account.
        
        With replication_factor > 1, sends same request to multiple
        accounts and returns first successful response.
        """
        async with self._semaphore:
            self.total_requests += 1
            
            # Get accounts for request
            accounts_to_use = []
            exclude_ids = []
            
            for _ in range(self.replication_factor):
                if priority_accounts:
                    # Try priority accounts first
                    for acc_id in priority_accounts:
                        if acc_id in self.accounts:
                            acc = self.accounts[acc_id]
                            if acc.status == AccountStatus.ACTIVE and acc._can_make_request():
                                accounts_to_use.append(acc)
                                exclude_ids.append(acc_id)
                                break
                else:
                    # Use load balancer
                    account = self.load_balancer.select_account(
                        list(self.accounts.values()),
                        exclude_ids
                    )
                    if account:
                        accounts_to_use.append(account)
                        exclude_ids.append(account.account_id)
            
            if not accounts_to_use:
                self.failed_requests += 1
                return {
                    'success': False,
                    'error': 'No available accounts',
                    'response_time': 0
                }
            
            # Execute request(s)
            if len(accounts_to_use) == 1:
                result = await accounts_to_use[0].ask(prompt, timeout)
            else:
                # Parallel requests with replication
                tasks = [
                    acc.ask(prompt, timeout)
                    for acc in accounts_to_use
                ]
                
                # Return first successful result
                for future in asyncio.as_completed(tasks):
                    try:
                        result = await future
                        if result.get('success'):
                            self.successful_requests += 1
                            return result
                    except Exception as e:
                        logger.debug(f"Replicated request failed: {e}")
                        continue
                
                # All failed
                self.failed_requests += 1
                return {
                    'success': False,
                    'error': 'All replicated requests failed',
                    'response_time': 0
                }
            
            if result.get('success'):
                self.successful_requests += 1
            else:
                self.failed_requests += 1
            
            return result
    
    async def ask_with_fallback(
        self,
        prompt: str,
        max_attempts: int = 3,
        timeout: int = 120,
    ) -> Dict[str, Any]:
        """
        Send prompt with automatic fallback to other accounts on failure.
        """
        tried_accounts = []
        
        for attempt in range(max_attempts):
            account = self.load_balancer.select_account(
                list(self.accounts.values()),
                tried_accounts
            )
            
            if not account:
                break
            
            tried_accounts.append(account.account_id)
            
            result = await account.ask(prompt, timeout)
            
            if result.get('success'):
                return result
            
            # If rate limited, try another account
            if account.status == AccountStatus.RATE_LIMITED:
                continue
            
            # If other error, maybe heal
            if self.auto_heal and account.consecutive_errors >= 3:
                asyncio.create_task(account.reset_session())
        
        return {
            'success': False,
            'error': f'Failed after {len(tried_accounts)} attempts',
            'response_time': 0
        }
    
    async def batch_ask(
        self,
        prompts: List[str],
        timeout: int = 120,
        max_concurrent: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Process multiple prompts in parallel.
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_one(prompt: str) -> Dict[str, Any]:
            async with semaphore:
                return await self.ask(prompt, timeout)
        
        tasks = [process_one(p) for p in prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error results
        final_results = []
        for r in results:
            if isinstance(r, Exception):
                final_results.append({
                    'success': False,
                    'error': str(r),
                    'response_time': 0
                })
            else:
                final_results.append(r)
        
        return final_results
    
    def get_stats(self) -> PoolStats:
        """Get pool statistics"""
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        accounts = list(self.accounts.values())
        
        active = [a for a in accounts if a.status == AccountStatus.ACTIVE]
        rate_limited = [a for a in accounts if a.status == AccountStatus.RATE_LIMITED]
        banned = [a for a in accounts if a.status == AccountStatus.BANNED]
        error = [a for a in accounts if a.status == AccountStatus.ERROR]
        
        # Calculate hourly capacity
        hourly_capacity = sum(
            a.rate_limit_config.max_requests_per_hour - len([
                t for t in a.request_times if t > hour_ago
            ])
            for a in active
            if a._can_make_request()
        )
        
        # Calculate success rate
        total = self.successful_requests + self.failed_requests
        success_rate = self.successful_requests / max(1, total)
        
        # Average response time
        all_requests = []
        for a in accounts:
            all_requests.extend(a.request_times)
        
        hourly_requests = len([t for t in all_requests if t > hour_ago])
        daily_requests = len([t for t in all_requests if t > day_ago])
        
        return PoolStats(
            total_accounts=len(accounts),
            active_accounts=len(active),
            rate_limited_accounts=len(rate_limited),
            banned_accounts=len(banned),
            error_accounts=len(error),
            total_requests_today=daily_requests,
            total_requests_hour=hourly_requests,
            success_rate=success_rate,
            available_capacity=hourly_capacity,
        )
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all accounts"""
        results = {
            'healthy': 0,
            'unhealthy': 0,
            'details': {}
        }
        
        for account_id, account in self.accounts.items():
            try:
                can_request = account._can_make_request()
                is_active = account.status == AccountStatus.ACTIVE
                
                healthy = can_request and is_active
                
                results['details'][account_id] = {
                    'healthy': healthy,
                    'status': account.status.value,
                    'can_request': can_request,
                    'consecutive_errors': account.consecutive_errors,
                    'last_error': account.last_error,
                }
                
                if healthy:
                    results['healthy'] += 1
                else:
                    results['unhealthy'] += 1
                    
            except Exception as e:
                results['details'][account_id] = {
                    'healthy': False,
                    'error': str(e),
                }
                results['unhealthy'] += 1
        
        return results
    
    async def heal_accounts(self):
        """Attempt to heal unhealthy accounts"""
        if not self.auto_heal:
            return
        
        for account_id, account in self.accounts.items():
            if account.status in [AccountStatus.ERROR, AccountStatus.RATE_LIMITED]:
                if account.consecutive_errors >= 3:
                    logger.info(f"Healing account {account_id}")
                    await account.reset_session()
    
    async def close_all(self):
        """Close all accounts"""
        for account in self.accounts.values():
            await account.close()
        
        self.accounts.clear()
    
    async def initialize_all(self):
        """Initialize all accounts"""
        tasks = [
            acc.initialize()
            for acc in self.accounts.values()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = sum(1 for r in results if r is True)
        logger.info(f"Initialized {success_count}/{len(self.accounts)} accounts")
        
        return success_count
