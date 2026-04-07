"""
SIM Auto-Registration PRO - Rumble Registration
"""

import asyncio
import logging
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class RumbleRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "rumble"
    
    async def get_registration_url(self) -> str:
        return "https://rumble.com/register.php"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[name="email"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Email
            await human_fill(self.page, 'input[name="email"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Username
            await human_fill(self.page, 'input[name="username"]', self.account_data.username, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Пароль
            await human_fill(self.page, 'input[name="password"]', self.account_data.password, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Подтверждение пароля
            if await self._check_element_exists('input[name="password_confirm"]'):
                await human_fill(self.page, 'input[name="password_confirm"]', self.account_data.password, simulate_typing=True)
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
            return "rumble.com" in self.page.url and "register" not in self.page.url
        except:
            return False
