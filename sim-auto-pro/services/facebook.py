"""
SIM Auto-Registration PRO - Facebook Registration
МУКН Enterprise AI Automation Platform

Регистрация аккаунтов Facebook:
- Создание аккаунта
- SMS/Email верификация
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


class FacebookRegistration(BaseRegistrationService):
    """Регистрация Facebook аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "facebook"
    
    async def get_registration_url(self) -> str:
        """URL страницы регистрации Facebook"""
        return "https://www.facebook.com/r.php"
    
    async def fill_registration_form(self) -> bool:
        """Заполнение формы регистрации Facebook"""
        try:
            await wait_for_element(self.page, 'input[name="firstname"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Имя
            await human_fill(
                self.page,
                'input[name="firstname"]',
                self.account_data.first_name,
                simulate_typing=True
            )
            await async_human_delay(0.3, 0.8)
            
            # Фамилия
            await human_fill(
                self.page,
                'input[name="lastname"]',
                self.account_data.last_name,
                simulate_typing=True
            )
            await async_human_delay(0.3, 0.8)
            
            # Email или телефон
            await human_fill(
                self.page,
                'input[name="reg_email__"]',
                self.account_data.email,
                simulate_typing=True
            )
            await async_human_delay(0.3, 0.8)
            
            # Подтверждение email
            if await self._check_element_exists('input[name="reg_email_confirmation__"]'):
                await human_fill(
                    self.page,
                    'input[name="reg_email_confirmation__"]',
                    self.account_data.email,
                    simulate_typing=True
                )
                await async_human_delay(0.3, 0.8)
            
            # Пароль
            await human_fill(
                self.page,
                'input[name="reg_passwd__"]',
                self.account_data.password,
                simulate_typing=True
            )
            await async_human_delay(0.3, 0.8)
            
            # Дата рождения
            await self._fill_birthday()
            
            # Пол
            await self._select_gender()
            
            # Нажимаем регистрацию
            await human_click(self.page, 'button[name="websubmit"]')
            await async_human_delay(3.0, 5.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def _fill_birthday(self) -> None:
        """Заполнение даты рождения"""
        # День
        day = random.randint(1, 28)
        await self.page.select_option('select[name="birthday_day"]', str(day))
        await async_human_delay(0.2, 0.5)
        
        # Месяц
        month = random.randint(1, 12)
        await self.page.select_option('select[name="birthday_month"]', str(month))
        await async_human_delay(0.2, 0.5)
        
        # Год
        year = random.randint(1990, 2000)
        await self.page.select_option('select[name="birthday_year"]', str(year))
        await async_human_delay(0.2, 0.5)
    
    async def _select_gender(self) -> None:
        """Выбор пола"""
        gender = self.account_data.gender or random.choice(['male', 'female'])
        gender_value = '2' if gender == 'male' else '1'
        
        await self.page.click(f'input[name="sex"][value="{gender_value}"]')
        await async_human_delay(0.2, 0.5)
    
    async def handle_sms_verification(self) -> bool:
        """Обработка SMS верификации Facebook"""
        try:
            # Facebook может запросить телефон
            phone_input_selectors = [
                'input[name="phone_for_reg"]',
                'input[name="contactpoint"]'
            ]
            
            for selector in phone_input_selectors:
                if await self._check_element_exists(selector):
                    await human_fill(
                        self.page,
                        selector,
                        self.account_data.phone,
                        simulate_typing=True
                    )
                    await async_human_delay(0.5, 1.0)
                    break
            
            # Ждем SMS код
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Facebook",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                return True  # SMS может быть не нужен
            
            # Вводим код
            code_selectors = [
                'input[name="pin"]',
                'input[name="code"]',
                'input[type="text"]'
            ]
            
            for selector in code_selectors:
                if await self._check_element_exists(selector):
                    await human_fill(self.page, selector, code, simulate_typing=True)
                    await async_human_delay(0.5, 1.0)
                    break
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        """Завершение регистрации Facebook"""
        try:
            await async_human_delay(2.0, 3.0)
            
            # Пропускаем шаги настройки
            skip_selectors = [
                'button:has-text("Пропустить")',
                'button:has-text("Skip")',
                'button:has-text("Не сейчас")'
            ]
            
            for _ in range(5):  # Несколько экранов может быть
                for selector in skip_selectors:
                    if await self._check_element_exists(selector):
                        await human_click(self.page, selector)
                        await async_human_delay(1.0, 2.0)
                        break
                await async_human_delay(1.0, 2.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        """Проверка создания Facebook аккаунта"""
        try:
            current_url = self.page.url
            
            if "facebook.com" in current_url and "r.php" not in current_url:
                # Проверяем элементы главной страницы
                if await self._check_element_exists('[data-pagelet="FeedUnit"]'):
                    return True
                if await self._check_element_exists('div[role="feed"]'):
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Account verification error: {e}")
            return False
