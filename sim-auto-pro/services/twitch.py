"""
SIM Auto-Registration PRO - Twitch Registration
"""

import asyncio
import logging
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class TwitchRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "twitch"
    
    async def get_registration_url(self) -> str:
        return "https://www.twitch.tv/signup"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[id="signup-username"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Username
            await human_fill(self.page, 'input[id="signup-username"]', self.account_data.username, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Password
            await human_fill(self.page, 'input[id="password-input"]', self.account_data.password, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Email
            await human_fill(self.page, 'input[id="email-input"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Дата рождения
            await self._fill_birthday()
            
            # Регистрация
            await human_click(self.page, 'button[data-a-target="signup-button"]')
            await async_human_delay(3.0, 5.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def _fill_birthday(self):
        import random
        month = random.randint(1, 12)
        day = random.randint(1, 28)
        year = random.randint(1990, 2000)
        
        try:
            await self.page.select_option('select[id="birthday-month"]', str(month))
            await self.page.select_option('select[id="birthday-day"]', str(day))
            await self.page.select_option('select[id="birthday-year"]', str(year))
        except:
            pass
    
    async def handle_sms_verification(self) -> bool:
        return True
    
    async def complete_registration(self) -> bool:
        try:
            await async_human_delay(2.0, 3.0)
            
            # Пропускаем
            for selector in ['button:has-text("Skip")', 'button[data-a-target="skip-button"]']:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            return True
        except:
            return False
    
    async def verify_account(self) -> bool:
        try:
            return "twitch.tv" in self.page.url and "signup" not in self.page.url
        except:
            return False
