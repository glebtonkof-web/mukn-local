"""
SIM Auto-Registration PRO - Telegram Registration
МУКН Enterprise AI Automation Platform

Регистрация аккаунтов Telegram через Web интерфейс
"""

import asyncio
import logging
import random

from .base import BaseRegistrationService
from utils import human_click, human_fill, wait_for_element, async_human_delay

logger = logging.getLogger(__name__)


class TelegramRegistration(BaseRegistrationService):
    """Регистрация Telegram аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "telegram"
    
    async def get_registration_url(self) -> str:
        return "https://web.telegram.org/"
    
    async def fill_registration_form(self) -> bool:
        try:
            await asyncio.sleep(3)
            
            # Выбираем версию (K если доступна)
            if await self._check_element_exists('a[href*="k"]'):
                await human_click(self.page, 'a[href*="k"]')
                await async_human_delay(2.0, 3.0)
            
            # Проверяем нужно ли войти или зарегистрироваться
            if await self._check_element_exists('button:has-text("Log in")'):
                await human_click(self.page, 'button:has-text("Log in")')
                await async_human_delay(1.0, 2.0)
            
            # Вводим номер телефона
            phone_selectors = [
                'input[placeholder*="Phone"]',
                'input[type="tel"]',
                'input[name="phone"]'
            ]
            
            for selector in phone_selectors:
                if await wait_for_element(self.page, selector, timeout=5000):
                    await human_fill(
                        self.page,
                        selector,
                        self.account_data.phone,
                        simulate_typing=True
                    )
                    break
            
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем далее
            next_selectors = [
                'button[type="submit"]',
                'button:has-text("Next")',
                'button:has-text("Далее")'
            ]
            
            for selector in next_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        try:
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Telegram",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                return False
            
            # Вводим код
            code_selectors = [
                'input[placeholder*="code"]',
                'input[type="text"]',
                'input[name="code"]'
            ]
            
            for selector in code_selectors:
                if await self._check_element_exists(selector):
                    await human_fill(self.page, selector, code, simulate_typing=True)
                    break
            
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        try:
            await async_human_delay(2.0, 3.0)
            
            # Имя аккаунта если нужно
            name_selectors = [
                'input[name="first_name"]',
                'input[placeholder*="name"]'
            ]
            
            for selector in name_selectors:
                if await self._check_element_exists(selector):
                    await human_fill(
                        self.page,
                        selector,
                        self.account_data.first_name,
                        simulate_typing=True
                    )
                    break
            
            # Продолжить
            await human_click(self.page, 'button[type="submit"]')
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        try:
            # Проверяем наличие чатов
            chat_selectors = [
                '.chat-list',
                '[class*="chatList"]',
                '.im-page'
            ]
            
            for selector in chat_selectors:
                if await self._check_element_exists(selector):
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Account verification error: {e}")
            return False
