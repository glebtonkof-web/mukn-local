"""
SIM Auto-Registration PRO - Snapchat Registration
"""

import asyncio
import logging
import random
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class SnapchatRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "snapchat"
    
    async def get_registration_url(self) -> str:
        return "https://accounts.snapchat.com/accounts/signup"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[name="firstName"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Имя
            await human_fill(self.page, 'input[name="firstName"]', self.account_data.first_name, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Фамилия
            await human_fill(self.page, 'input[name="lastName"]', self.account_data.last_name, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Username
            await human_fill(self.page, 'input[name="username"]', self.account_data.username, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Пароль
            await human_fill(self.page, 'input[name="password"]', self.account_data.password, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Email
            await human_fill(self.page, 'input[name="email"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Телефон
            await human_fill(self.page, 'input[name="phone"]', self.account_data.phone, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Дата рождения
            await self._fill_birthday()
            
            # Регистрация
            await human_click(self.page, 'button[type="submit"]')
            await async_human_delay(3.0, 5.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def _fill_birthday(self):
        try:
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            year = random.randint(1990, 2000)
            
            await self.page.select_option('select[name="birthdayMonth"]', str(month))
            await self.page.select_option('select[name="birthdayDay"]', str(day))
            await self.page.select_option('select[name="birthdayYear"]', str(year))
        except:
            pass
    
    async def handle_sms_verification(self) -> bool:
        try:
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Snapchat",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                return False
            
            code_input = 'input[name="verificationCode"]'
            if await self._check_element_exists(code_input):
                await human_fill(self.page, code_input, code, simulate_typing=True)
            
            return True
        except:
            return False
    
    async def complete_registration(self) -> bool:
        return True
    
    async def verify_account(self) -> bool:
        try:
            return "snapchat.com" in self.page.url or "accounts.snapchat.com/accounts/welcome" in self.page.url
        except:
            return False
