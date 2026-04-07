"""
SIM Auto-Registration PRO - Discord Registration
МУКН Enterprise AI Automation Platform
"""

import asyncio
import logging
import random
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class DiscordRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "discord"
    
    async def get_registration_url(self) -> str:
        return "https://discord.com/register"
    
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
        month = random.randint(1, 12)
        day = random.randint(1, 28)
        year = random.randint(1990, 2000)
        
        # Discord использует выпадающие списки
        try:
            await self.page.select_option('select[name="month"]', str(month))
            await self.page.select_option('select[name="day"]', str(day))
            await self.page.select_option('select[name="year"]', str(year))
        except:
            pass
    
    async def handle_sms_verification(self) -> bool:
        return True  # Discord обычно не требует SMS
    
    async def complete_registration(self) -> bool:
        try:
            await async_human_delay(2.0, 3.0)
            
            # Капча может появиться
            if await self._check_element_exists('iframe[src*="captcha"]'):
                self.logger.warning("CAPTCHA detected - waiting...")
                await asyncio.sleep(30)
            
            # Пропускаем туториал
            skip_selectors = ['button:has-text("Skip")', 'button:has-text("Пропустить")']
            for selector in skip_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        try:
            current_url = self.page.url
            if "discord.com/channels" in current_url or "discord.com/app" in current_url:
                return True
            
            return await self._check_element_exists('[class*="channels"]')
            
        except:
            return False
