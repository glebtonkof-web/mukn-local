"""
SIM Auto-Registration PRO - Spotify Registration
"""

import asyncio
import logging
import random
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class SpotifyRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "spotify"
    
    async def get_registration_url(self) -> str:
        return "https://www.spotify.com/signup"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[id="email"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Email
            await human_fill(self.page, 'input[id="email"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Email подтверждение
            await human_fill(self.page, 'input[id="confirm"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Пароль
            await human_fill(self.page, 'input[id="password"]', self.account_data.password, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Имя
            await human_fill(self.page, 'input[id="displayname"]', self.account_data.first_name, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Дата рождения
            day = random.randint(1, 28)
            month = random.randint(1, 12)
            year = random.randint(1990, 2000)
            
            try:
                await self.page.select_option('select[id="day"]', str(day))
                await self.page.select_option('select[id="month"]', str(month))
                await self.page.select_option('select[id="year"]', str(year))
            except:
                pass
            
            # Пол
            try:
                gender = random.choice(['male', 'female'])
                await self.page.click(f'input[id="{gender}"]')
            except:
                pass
            
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
            return "spotify.com" in self.page.url and "signup" not in self.page.url
        except:
            return False
