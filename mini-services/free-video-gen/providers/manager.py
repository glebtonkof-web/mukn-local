"""
Free Video Generator - Provider Manager
Manages multiple video providers with load balancing and failover
"""

import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from loguru import logger

from .base import BaseVideoProvider, ProviderResult, ProviderState
from .kling import KlingProvider
from .luma import LumaProvider
from .runway import RunwayProvider


class ProviderManager:
    """
    Manages multiple video generation providers.
    
    Features:
    - Automatic provider selection
    - Load balancing
    - Failover support
    - Rate limit management
    - Provider pooling
    """
    
    def __init__(self, config: Dict[str, Any], output_dir: str = "./output/scenes"):
        self.config = config
        self.output_dir = output_dir
        
        # Initialize providers
        self.providers: Dict[str, BaseVideoProvider] = {}
        self._initialize_providers()
        
        # Provider priorities (lower = higher priority)
        self.priorities = {
            'kling': config.get('providers', {}).get('kling', {}).get('priority', 1),
            'luma': config.get('providers', {}).get('luma', {}).get('priority', 2),
            'runway': config.get('providers', {}).get('runway', {}).get('priority', 3),
        }
    
    def _initialize_providers(self):
        """Initialize all enabled providers"""
        providers_config = self.config.get('providers', {})
        
        # Kling AI (primary)
        if providers_config.get('kling', {}).get('enabled', True):
            self.providers['kling'] = KlingProvider(
                providers_config.get('kling', {}),
                self.output_dir
            )
            logger.info("Kling AI provider initialized")
        
        # Luma Dream Machine (backup)
        if providers_config.get('luma', {}).get('enabled', True):
            self.providers['luma'] = LumaProvider(
                providers_config.get('luma', {}),
                self.output_dir
            )
            logger.info("Luma Dream Machine provider initialized")
        
        # Runway Gen-3 (last resort)
        if providers_config.get('runway', {}).get('enabled', True):
            self.providers['runway'] = RunwayProvider(
                providers_config.get('runway', {}),
                self.output_dir
            )
            logger.info("Runway Gen-3 provider initialized")
    
    async def initialize_all(self) -> Dict[str, bool]:
        """Initialize all providers"""
        results = {}
        
        for name, provider in self.providers.items():
            try:
                success = await provider.initialize()
                results[name] = success
            except Exception as e:
                logger.error(f"Failed to initialize {name}: {e}")
                results[name] = False
        
        return results
    
    async def close_all(self):
        """Close all providers"""
        for name, provider in self.providers.items():
            try:
                await provider.close()
            except Exception as e:
                logger.error(f"Error closing {name}: {e}")
    
    def get_available_provider(self) -> Optional[Tuple[str, BaseVideoProvider]]:
        """
        Get the best available provider.
        
        Returns:
            Tuple of (provider_name, provider) or None if none available
        """
        # Sort by priority
        sorted_providers = sorted(
            self.providers.items(),
            key=lambda x: self.priorities.get(x[0], 99)
        )
        
        for name, provider in sorted_providers:
            if provider.can_generate():
                return (name, provider)
        
        return None
    
    def get_provider(self, name: str) -> Optional[BaseVideoProvider]:
        """Get provider by name"""
        return self.providers.get(name)
    
    async def generate(
        self,
        prompt: str,
        duration: float = 10.0,
        ratio: str = "9:16",
        provider_name: Optional[str] = None,
        **kwargs
    ) -> ProviderResult:
        """
        Generate video using available provider.
        
        If provider_name is specified, use that provider.
        Otherwise, automatically select the best available provider.
        
        Args:
            prompt: Text description
            duration: Video duration in seconds
            ratio: Aspect ratio
            provider_name: Specific provider to use (optional)
            
        Returns:
            ProviderResult with video path or error
        """
        # Use specific provider if requested
        if provider_name:
            provider = self.providers.get(provider_name)
            if not provider:
                return ProviderResult(
                    success=False,
                    error=f"Provider '{provider_name}' not found"
                )
            
            if not provider.can_generate():
                return ProviderResult(
                    success=False,
                    error=f"Provider '{provider_name}' is rate limited"
                )
            
            return await provider.generate(prompt, duration, ratio, **kwargs)
        
        # Auto-select provider with failover
        attempts = []
        
        for _ in range(len(self.providers)):
            result = self.get_available_provider()
            
            if not result:
                # All providers are rate limited, wait and retry
                wait_time = self._get_min_wait_time()
                
                if wait_time > 0:
                    logger.warning(f"All providers rate limited. Waiting {wait_time:.0f}s...")
                    await asyncio.sleep(min(wait_time, 60))  # Max 60s wait
                    continue
                else:
                    return ProviderResult(
                        success=False,
                        error="No providers available"
                    )
            
            name, provider = result
            attempts.append(name)
            
            logger.info(f"Using provider: {name}")
            
            try:
                result = await provider.generate(prompt, duration, ratio, **kwargs)
                
                if result.success:
                    return result
                
                # If failed, try next provider
                logger.warning(f"Provider {name} failed: {result.error}")
                
            except Exception as e:
                logger.error(f"Provider {name} error: {e}")
        
        return ProviderResult(
            success=False,
            error=f"All providers failed. Tried: {', '.join(attempts)}"
        )
    
    def _get_min_wait_time(self) -> float:
        """Get minimum wait time across all providers"""
        min_wait = float('inf')
        
        for provider in self.providers.values():
            wait = provider.get_wait_time()
            if wait < min_wait:
                min_wait = wait
        
        return min_wait if min_wait != float('inf') else 0
    
    async def generate_parallel(
        self,
        prompt: str,
        duration: float = 10.0,
        ratio: str = "9:16",
        num_providers: int = 2
    ) -> ProviderResult:
        """
        Generate video using multiple providers in parallel.
        Returns first successful result.
        
        This is useful for reducing wait time when providers have queues.
        """
        available = []
        
        # Get available providers
        for name, provider in sorted(
            self.providers.items(),
            key=lambda x: self.priorities.get(x[0], 99)
        ):
            if provider.can_generate():
                available.append((name, provider))
                
                if len(available) >= num_providers:
                    break
        
        if not available:
            return ProviderResult(
                success=False,
                error="No providers available"
            )
        
        logger.info(f"Parallel generation with: {[p[0] for p in available]}")
        
        # Start parallel generation
        tasks = []
        for name, provider in available:
            task = asyncio.create_task(
                provider.generate(prompt, duration, ratio),
                name=f"gen_{name}"
            )
            tasks.append((name, task))
        
        # Wait for first success
        while tasks:
            done, pending = await asyncio.wait(
                [t for _, t in tasks],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for completed_task in done:
                result = completed_task.result()
                
                if result.success:
                    # Cancel remaining tasks
                    for _, task in tasks:
                        if not task.done():
                            task.cancel()
                    
                    return result
        
        # All failed
        return ProviderResult(
            success=False,
            error="All parallel generations failed"
        )
    
    def get_all_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all providers"""
        return {
            name: provider.get_status_info()
            for name, provider in self.providers.items()
        }
    
    def get_total_capacity(self) -> Dict[str, Any]:
        """Get total generation capacity"""
        total_credits = 0
        available_credits = 0
        total_hourly = 0
        remaining_hourly = 0
        
        for name, provider in self.providers.items():
            config = self.config.get('providers', {}).get(name, {})
            
            total_credits += config.get('daily_credits', 0)
            available_credits += provider.credits_remaining
            total_hourly += config.get('max_requests_per_hour', 0)
            remaining_hourly += max(0, config.get('max_requests_per_hour', 0) - provider.requests_this_hour)
        
        return {
            'total_daily_credits': total_credits,
            'available_credits': available_credits,
            'total_hourly_capacity': total_hourly,
            'remaining_hourly': remaining_hourly,
            'active_providers': sum(1 for p in self.providers.values() if p.state == ProviderState.AVAILABLE),
            'total_providers': len(self.providers),
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all providers"""
        results = {}
        
        for name, provider in self.providers.items():
            try:
                state = await provider.check_status()
                results[name] = {
                    'state': state.value,
                    'available': provider.can_generate(),
                    'credits': provider.credits_remaining,
                }
            except Exception as e:
                results[name] = {
                    'state': 'error',
                    'error': str(e),
                }
        
        return {
            'healthy': any(r.get('available', False) for r in results.values()),
            'providers': results,
        }
