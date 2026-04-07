"""
SIM Auto-Registration PRO - LinkedIn Registration
"""

import asyncio
import logging
import random
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class LinkedInRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "linkedin"
    
    async def get_registration_url(self) -> str:
        return "https://www.linkedin.com/signup"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[id="email-address"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Email
            await human_fill(self.page, 'input[id="email-address"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Пароль
            await human_fill(self.page, 'input[id="password"]', self.account_data.password, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Регистрация
            await human_click(self.page, 'button[id="join-form-submit"]')
            await async_human_delay(3.0, 5.0)
            
            # Имя и фамилия
            if await self._check_element_exists('input[id="first-name"]'):
                await human_fill(self.page, 'input[id="first-name"]', self.account_data.first_name, simulate_typing=True)
                await human_fill(self.page, 'input[id="last-name"]', self.account_data.last_name, simulate_typing=True)
                await human_click(self.page, 'button[type="submit"]')
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        return True
    
    async def complete_registration(self) -> bool:
        try:
            await async_human_delay(2.0, 3.0)
            
            # Пропускаем шаги
            for selector in ['button:has-text("Skip")', 'button:has-text("Пропустить")']:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
            
            return True
        except:
            return False
    
    async def verify_account(self) -> bool:
        try:
            return "linkedin.com/feed" in self.page.url or "linkedin.com/mynetwork" in self.page.url
        except:
            return False
