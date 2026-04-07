"""
SIM Auto-Registration PRO - Odysee Registration
"""

import asyncio
import logging
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class OdyseeRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "odysee"
    
    async def get_registration_url(self) -> str:
        return "https://odysee.com/$/signup"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[name="email"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Email
            await human_fill(self.page, 'input[name="email"]', self.account_data.email, simulate_typing=True)
            await async_human_delay(0.3, 0.8)
            
            # Пароль
            await human_fill(self.page, 'input[name="password"]', self.account_data.password, simulate_typing=True)
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
            
            # Подтверждение email может потребоваться
            verify_btn = 'button:has-text("Verify"), button:has-text("Подтвердить")'
            if await self._check_element_exists(verify_btn):
                await human_click(self.page, verify_btn)
            
            return True
        except:
            return False
    
    async def verify_account(self) -> bool:
        try:
            return "odysee.com" in self.page.url and "signup" not in self.page.url
        except:
            return False
