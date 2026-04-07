"""
SIM Auto-Registration PRO - Odnoklassniki Registration
МУКН Enterprise AI Automation Platform
"""

import asyncio
import logging
import random

from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class OKRegistration(BaseRegistrationService):
    """Регистрация Odnoklassniki аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "ok"
    
    async def get_registration_url(self) -> str:
        return "https://ok.ru/dk?st.cmd=anonymRegistrationStartPhone"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[name="st.r.phone"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Вводим телефон
            phone = self.account_data.phone.replace("+7", "")
            await human_fill(self.page, 'input[name="st.r.phone"]', phone, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем получить код
            await human_click(self.page, 'input[type="submit"]')
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        try:
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="OK",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                return False
            
            # Вводим код
            await human_fill(self.page, 'input[name="st.r.code"]', code, simulate_typing=True)
            await async_human_delay(1.0, 2.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        try:
            await async_human_delay(2.0, 3.0)
            
            # Заполняем профиль
            if await self._check_element_exists('input[name="st.r.name"]'):
                name = f"{self.account_data.first_name} {self.account_data.last_name}"
                await human_fill(self.page, 'input[name="st.r.name"]', name, simulate_typing=True)
            
            # Пароль
            if await self._check_element_exists('input[name="st.r.password"]'):
                await human_fill(
                    self.page,
                    'input[name="st.r.password"]',
                    self.account_data.password,
                    simulate_typing=True
                )
            
            # Завершаем
            await human_click(self.page, 'input[type="submit"]')
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        try:
            current_url = self.page.url
            if "ok.ru/profile" in current_url or "ok.ru/dk?st.cmd=userProfile" in current_url:
                return True
            return False
        except:
            return False
