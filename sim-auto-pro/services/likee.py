"""
SIM Auto-Registration PRO - Likee Registration
"""

import asyncio
import logging
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class LikeeRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "likee"
    
    async def get_registration_url(self) -> str:
        return "https://likee.video/"
    
    async def fill_registration_form(self) -> bool:
        try:
            await asyncio.sleep(3)
            
            # Нажимаем на профиль/регистрацию
            login_btn = 'button:has-text("Log in"), button:has-text("Войти")'
            if await self._check_element_exists(login_btn):
                await human_click(self.page, login_btn)
                await async_human_delay(2.0, 3.0)
            
            # Телефон
            phone_option = 'button:has-text("Phone"), button:has-text("Телефон")'
            if await self._check_element_exists(phone_option):
                await human_click(self.page, phone_option)
                await async_human_delay(1.0, 2.0)
            
            phone_input = 'input[type="tel"]'
            if await wait_for_element(self.page, phone_input, timeout=5000):
                await human_fill(self.page, phone_input, self.account_data.phone, simulate_typing=True)
                await async_human_delay(0.5, 1.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        try:
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Likee",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                return False
            
            code_input = 'input[name="code"], input[type="text"]'
            if await self._check_element_exists(code_input):
                await human_fill(self.page, code_input, code, simulate_typing=True)
            
            return True
        except:
            return False
    
    async def complete_registration(self) -> bool:
        return True
    
    async def verify_account(self) -> bool:
        try:
            return "likee.video" in self.page.url
        except:
            return False
