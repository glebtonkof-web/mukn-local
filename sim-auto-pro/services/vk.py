"""
SIM Auto-Registration PRO - VK Registration
МУКН Enterprise AI Automation Platform

Регистрация аккаунтов VKontakte
"""

import asyncio
import logging
import random

from .base import BaseRegistrationService, RegistrationStatus
from utils import (
    human_click, human_fill, wait_for_element, wait_and_click,
    async_human_delay
)

logger = logging.getLogger(__name__)


class VKRegistration(BaseRegistrationService):
    """Регистрация VK аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "vk"
    
    async def get_registration_url(self) -> str:
        return "https://vk.com/join"
    
    async def fill_registration_form(self) -> bool:
        try:
            await wait_for_element(self.page, 'input[name="phone"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Вводим телефон
            phone = self.account_data.phone
            await human_fill(self.page, 'input[name="phone"]', phone, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем получить код
            await human_click(self.page, 'button:has-text("Получить код")')
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        try:
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="VK",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                return False
            
            # Вводим код
            await human_fill(self.page, 'input[name="code"]', code, simulate_typing=True)
            await async_human_delay(1.0, 2.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        try:
            await async_human_delay(2.0, 3.0)
            
            # Вводим имя и фамилию если нужно
            if await self._check_element_exists('input[name="first_name"]'):
                await human_fill(
                    self.page,
                    'input[name="first_name"]',
                    self.account_data.first_name,
                    simulate_typing=True
                )
                await human_fill(
                    self.page,
                    'input[name="last_name"]',
                    self.account_data.last_name,
                    simulate_typing=True
                )
            
            # Пароль
            if await self._check_element_exists('input[name="password"]'):
                await human_fill(
                    self.page,
                    'input[name="password"]',
                    self.account_data.password,
                    simulate_typing=True
                )
                
                # Подтверждение пароля
                if await self._check_element_exists('input[name="password_confirm"]'):
                    await human_fill(
                        self.page,
                        'input[name="password_confirm"]',
                        self.account_data.password,
                        simulate_typing=True
                    )
            
            # Нажимаем завершить
            await human_click(self.page, 'button[type="submit"]')
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        try:
            current_url = self.page.url
            
            if "vk.com/id" in current_url or "vk.com/feed" in current_url:
                return True
            
            if await self._check_element_exists('#l_pr'):
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Account verification error: {e}")
            return False
