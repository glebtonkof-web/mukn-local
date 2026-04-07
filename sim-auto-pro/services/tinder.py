"""
SIM Auto-Registration PRO - Tinder Registration
"""

import asyncio
import logging
import random
from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class TinderRegistration(BaseRegistrationService):
    @property
    def service_name(self) -> str:
        return "tinder"
    
    async def get_registration_url(self) -> str:
        return "https://tinder.com/"
    
    async def fill_registration_form(self) -> bool:
        try:
            await asyncio.sleep(3)
            
            # Нажимаем войти/регистрация
            login_btn = 'button:has-text("Log in"), button:has-text("Войти")'
            if await self._check_element_exists(login_btn):
                await human_click(self.page, login_btn)
                await async_human_delay(2.0, 3.0)
            
            # Выбираем вход по телефону
            phone_option = 'button:has-text("LOG IN WITH PHONE NUMBER"), button:has-text("ВОЙТИ ПО НОМЕРУ")'
            if await self._check_element_exists(phone_option):
                await human_click(self.page, phone_option)
                await async_human_delay(1.0, 2.0)
            
            # Вводим телефон
            phone_input = 'input[type="tel"]'
            if await wait_for_element(self.page, phone_input, timeout=5000):
                await human_fill(self.page, phone_input, self.account_data.phone, simulate_typing=True)
                await async_human_delay(0.5, 1.0)
            
            # Продолжить
            continue_btn = 'button:has-text("CONTINUE"), button:has-text("ПРОДОЛЖИТЬ")'
            if await self._check_element_exists(continue_btn):
                await human_click(self.page, continue_btn)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        try:
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Tinder",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                return False
            
            code_input = 'input[type="text"]'
            if await self._check_element_exists(code_input):
                await human_fill(self.page, code_input, code, simulate_typing=True)
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        try:
            await async_human_delay(2.0, 3.0)
            
            # Заполняем профиль если нужно
            name_input = 'input[name="name"]'
            if await self._check_element_exists(name_input):
                await human_fill(self.page, name_input, self.account_data.first_name, simulate_typing=True)
            
            return True
        except:
            return False
    
    async def verify_account(self) -> bool:
        try:
            return "tinder.com/app" in self.page.url
        except:
            return False
