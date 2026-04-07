"""
SIM Auto-Registration PRO - Twitter/X Registration
МУКН Enterprise AI Automation Platform

Регистрация аккаунтов Twitter/X:
- Создание аккаунта через телефон/email
- SMS верификация
"""

import asyncio
import logging
import random
from typing import Optional

from .base import (
    BaseRegistrationService, RegistrationResult, RegistrationStatus,
    AccountData
)
from utils import (
    human_click, human_typing, human_fill, human_navigate,
    wait_for_element, wait_and_click, async_human_delay,
    random_scroll, random_mouse_movement
)

logger = logging.getLogger(__name__)


class TwitterRegistration(BaseRegistrationService):
    """Регистрация Twitter/X аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "twitter"
    
    async def get_registration_url(self) -> str:
        """URL страницы регистрации Twitter"""
        return "https://twitter.com/i/flow/signup"
    
    async def fill_registration_form(self) -> bool:
        """Заполнение формы регистрации Twitter"""
        try:
            await async_human_delay(2.0, 3.0)
            
            # Принимаем cookies
            cookie_selectors = [
                'button:has-text("Принять все cookies")',
                'button:has-text("Accept all cookies")',
                'div[data-testid="BottomSheet"] button'
            ]
            
            for selector in cookie_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(0.5, 1.0)
                    break
            
            # Вводим имя
            name_selectors = [
                'input[data-testid="ocfEnterTextTextInput"]',
                'input[name="text"]',
                'input[autocomplete="name"]'
            ]
            
            for selector in name_selectors:
                if await wait_for_element(self.page, selector, timeout=10000):
                    full_name = f"{self.account_data.first_name} {self.account_data.last_name}"
                    await human_fill(self.page, selector, full_name, simulate_typing=True)
                    break
            
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем далее
            next_selectors = [
                'button[data-testid="ocfEnterTextNextButton"]',
                'button:has-text("Далее")',
                'button:has-text("Next")'
            ]
            
            for selector in next_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            await async_human_delay(1.0, 2.0)
            
            # Выбор использования телефона или email
            use_phone = random.choice([True, False])
            
            if use_phone:
                # Нажимаем на переключатель "Использовать телефон"
                phone_toggle_selectors = [
                    'div[data-testid="ocfUsePhoneNumber"]',
                    'span:has-text("Использовать телефон")',
                    'span:has-text("Use phone instead")'
                ]
                
                for selector in phone_toggle_selectors:
                    if await self._check_element_exists(selector):
                        await human_click(self.page, selector)
                        await async_human_delay(0.5, 1.0)
                        break
                
                # Вводим телефон
                phone_input = 'input[data-testid="ocfEnterTextTextInput"]'
                if await wait_for_element(self.page, phone_input, timeout=5000):
                    await human_fill(
                        self.page,
                        phone_input,
                        self.account_data.phone,
                        simulate_typing=True
                    )
            else:
                # Вводим email
                email_input = 'input[data-testid="ocfEnterTextTextInput"]'
                if await wait_for_element(self.page, email_input, timeout=5000):
                    await human_fill(
                        self.page,
                        email_input,
                        self.account_data.email,
                        simulate_typing=True
                    )
            
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем далее
            for selector in next_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            await async_human_delay(2.0, 3.0)
            
            # Дата рождения
            await self._handle_birthday()
            
            # Нажимаем далее снова
            for selector in next_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            await async_human_delay(1.0, 2.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def _handle_birthday(self) -> bool:
        """Обработка даты рождения"""
        try:
            # Проверяем наличие полей даты рождения
            month_select = 'select[data-testid="ocfSelectOptionMonth"]'
            day_select = 'select[data-testid="ocfSelectOptionDay"]'
            year_select = 'select[data-testid="ocfSelectOptionYear"]'
            
            if not await self._check_element_exists(month_select):
                return True
            
            self.logger.info("Filling birthday...")
            
            # Выбираем месяц
            month = random.randint(1, 12)
            await self.page.select_option(month_select, str(month))
            await async_human_delay(0.3, 0.6)
            
            # Выбираем день
            day = random.randint(1, 28)
            await self.page.select_option(day_select, str(day))
            await async_human_delay(0.3, 0.6)
            
            # Выбираем год
            year = random.randint(1990, 2000)
            await self.page.select_option(year_select, str(year))
            await async_human_delay(0.3, 0.6)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Birthday error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        """Обработка SMS верификации Twitter"""
        try:
            # Ждем появления поля для кода
            code_input_selectors = [
                'input[data-testid="ocfEnterTextTextInput"]',
                'input[name="verfication_code"]',
                'input[type="text"]'
            ]
            
            code_input = None
            for selector in code_input_selectors:
                if await wait_for_element(self.page, selector, timeout=5000):
                    code_input = selector
                    break
            
            if not code_input:
                # Возможно SMS не требуется
                return True
            
            # Ждем SMS код
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Twitter",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                self.logger.error("SMS code not received")
                return False
            
            # Вводим код
            await human_fill(self.page, code_input, code, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем далее
            next_selectors = [
                'button[data-testid="ocfEnterTextNextButton"]',
                'button:has-text("Далее")',
                'button:has-text("Next")'
            ]
            
            for selector in next_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        """Завершение регистрации Twitter"""
        try:
            await async_human_delay(2.0, 3.0)
            
            # Вводим пароль
            password_selectors = [
                'input[name="password"]',
                'input[type="password"]',
                'input[data-testid="ocfEnterTextTextInput"]'
            ]
            
            for selector in password_selectors:
                if await self._check_element_exists(selector):
                    await human_fill(
                        self.page,
                        selector,
                        self.account_data.password,
                        simulate_typing=True
                    )
                    await async_human_delay(0.5, 1.0)
                    break
            
            # Нажимаем далее/завершить
            complete_selectors = [
                'button[data-testid="ocfEnterTextNextButton"]',
                'button:has-text("Завершить")',
                'button:has-text("Finish")'
            ]
            
            for selector in complete_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(2.0, 3.0)
                    break
            
            # Выбираем интересы (пропускаем)
            skip_selectors = [
                'button:has-text("Пропустить")',
                'button:has-text("Skip")'
            ]
            
            for selector in skip_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        """Проверка создания Twitter аккаунта"""
        try:
            current_url = self.page.url
            
            # Проверяем успешные URL
            if "twitter.com/home" in current_url or "x.com/home" in current_url:
                self.logger.info(f"Account verified - URL: {current_url}")
                return True
            
            # Проверяем наличие элементов
            profile_selectors = [
                'a[data-testid="AppTabBar_Home_Link"]',
                'div[data-testid="primaryColumn"]',
                'a[href="/home"]'
            ]
            
            for selector in profile_selectors:
                if await self._check_element_exists(selector):
                    self.logger.info("Account verified by element")
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Account verification error: {e}")
            return False
