"""
SIM Auto-Registration PRO - OnlyFans Registration
"""

import asyncio
import logging
import random
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class OnlyFansRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "onlyfans"
    
    async def get_registration_url(self) -> str:
        return "https://onlyfans.com/signup"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[name="email"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Email
            await human_fill(self.page, 'input[name="email"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Пароль
            await human_fill(self.page, 'input[name="password"]', self.account_data.password, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Имя
            await human_fill(self.page, 'input[name="name"]', self.account_data.first_name, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Username
            await human_fill(self.page, 'input[name="username"]', self.account_data.username, simulate_typing=True)
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
        try:
            await async_human_delay(2.0, 3.0)
            
            # Капча может быть
            if await self._check_element_exists('iframe[src*="recaptcha"]'):
                self.logger.warning("CAPTCHA detected")
                await asyncio.sleep(30)
            
            return True
        except:
            return False
    
    async def verify_account(self) -> bool:
        try:
            return "onlyfans.com" in self.page.url and "signup" not in self.page.url
        except:
            return False
