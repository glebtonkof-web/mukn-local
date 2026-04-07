"""
SIM Auto-Registration PRO - Reddit Registration
"""

import asyncio
import logging
import random
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class RedditRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "reddit"
    
    async def get_registration_url(self) -> str:
        return "https://www.reddit.com/register/"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[id="regEmail"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Email
            await human_fill(self.page, 'input[id="regEmail"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Продолжить
            await human_click(self.page, 'button[type="submit"]')
            await async_human_delay(2.0, 3.0)
            
            # Username
            if await self._check_element_exists('input[id="regUsername"]'):
                await human_fill(self.page, 'input[id="regUsername"]', self.account_data.username, simulate_typing=True)
                await async_human_delay(0.3, 0.8)
            
            # Пароль
            if await self._check_element_exists('input[id="regPassword"]'):
                await human_fill(self.page, 'input[id="regPassword"]', self.account_data.password, simulate_typing=True)
                await async_human_delay(0.5, 1.0)
            
            # Регистрация
            await human_click(self.page, 'button[type="submit"]')
            await async_human_delay(3.0, 5.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        return True
    
    async def complete_registration(self) -> bool:
        return True
    
    async def verify_account(self) -> bool:
        try:
            return "reddit.com" in self.page.url and "register" not in self.page.url
        except:
            return False
