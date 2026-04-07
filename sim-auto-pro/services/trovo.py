"""
SIM Auto-Registration PRO - Trovo Registration
"""

import asyncio
import logging
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class TrovoRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "trovo"
    
    async def get_registration_url(self) -> str:
        return "https://trovo.live/"
    
    async def fill_registration_form(self) -> bool:
        try:
            await asyncio.sleep(3)
            
            # Нажимаем Sign up
            signup_btn = 'button:has-text("Sign up"), a:has-text("Sign up")'
            if await self._check_element_exists(signup_btn):
                await human_click(self.page, signup_btn)
                await async_human_delay(2.0, 3.0)
            
            # Email
            email_input = 'input[name="email"], input[type="email"]'
            if await wait_for_element(self.page, email_input, timeout=10000):
                await human_fill(self.page, email_input, self.account_data.email, simulate_typing=True)
                await async_human_delay(0.3, 0.8)
            
            # Username
            username_input = 'input[name="username"], input[name="nick"]'
            if await self._check_element_exists(username_input):
                await human_fill(self.page, username_input, self.account_data.username, simulate_typing=True)
                await async_human_delay(0.3, 0.8)
            
            # Пароль
            password_input = 'input[name="password"], input[type="password"]'
            if await self._check_element_exists(password_input):
                await human_fill(self.page, password_input, self.account_data.password, simulate_typing=True)
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
            return "trovo.live" in self.page.url and "signup" not in self.page.url
        except:
            return False
