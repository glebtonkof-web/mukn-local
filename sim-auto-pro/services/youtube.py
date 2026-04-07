"""
SIM Auto-Registration PRO - YouTube/Google Registration
МУКН Enterprise AI Automation Platform

Регистрация аккаунтов Google/YouTube:
- Создание Google аккаунта
- Привязка телефона
- Настройка YouTube канала
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


class YouTubeRegistration(BaseRegistrationService):
    """Регистрация Google/YouTube аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "youtube"
    
    async def get_registration_url(self) -> str:
        """URL страницы регистрации Google"""
        return "https://accounts.google.com/signup/v2/webcreateaccount?flowName=GlifWebSignIn&flowEntry=SignUp"
    
    async def fill_registration_form(self) -> bool:
        """Заполнение формы регистрации Google"""
        try:
            # Ждем загрузки формы
            await wait_for_element(self.page, 'input[name="firstName"]', timeout=10000)
            
            # Имитация чтения страницы
            await async_human_delay(1.0, 2.0)
            await random_scroll(self.page)
            
            # Заполняем имя
            self.logger.info("Filling first name...")
            await human_fill(
                self.page,
                'input[name="firstName"]',
                self.account_data.first_name,
                simulate_typing=True
            )
            await async_human_delay(0.5, 1.0)
            
            # Заполняем фамилию
            self.logger.info("Filling last name...")
            await human_fill(
                self.page,
                'input[name="lastName"]',
                self.account_data.last_name,
                simulate_typing=True
            )
            await async_human_delay(0.5, 1.0)
            
            # Заполняем email/username
            self.logger.info("Filling username...")
            
            # Google требует уникальный username
            username = self.account_data.username
            if await self._check_username_available(username):
                await human_fill(
                    self.page,
                    'input[name="Username"]',
                    username,
                    simulate_typing=True
                )
            else:
                # Пробуем с суффиксами
                for suffix in ['pro', 'official', '2024', random.randint(100, 999)]:
                    new_username = f"{username}{suffix}"
                    if await self._check_username_available(new_username):
                        self.account_data.username = new_username
                        await human_fill(
                            self.page,
                            'input[name="Username"]',
                            new_username,
                            simulate_typing=True
                        )
                        break
            
            await async_human_delay(0.5, 1.0)
            
            # Заполняем пароль
            self.logger.info("Filling password...")
            await human_fill(
                self.page,
                'input[name="Passwd"]',
                self.account_data.password,
                simulate_typing=True
            )
            await async_human_delay(0.3, 0.8)
            
            # Подтверждение пароля
            await human_fill(
                self.page,
                'input[name="ConfirmPasswd"]',
                self.account_data.password,
                simulate_typing=True
            )
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем "Далее"
            self.logger.info("Clicking Next...")
            next_button = '#accountDetailsNext > div > button'
            if not await wait_and_click(self.page, next_button, timeout=5000):
                # Альтернативные селекторы
                await human_click(self.page, 'button:has-text("Далее")')
            
            await self._wait_for_navigation()
            
            # Проверяем требуется ли номер телефона
            await async_human_delay(2.0, 3.0)
            
            if await self._check_phone_verification_required():
                self.logger.info("Phone verification required")
                return await self._fill_phone_number()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def _check_username_available(self, username: str) -> bool:
        """Проверка доступности имени пользователя"""
        # Это базовая проверка - в реальности Google проверяет на сервере
        return True
    
    async def _check_phone_verification_required(self) -> bool:
        """Проверка требуется ли верификация телефона"""
        phone_selectors = [
            'input[name="phoneNumber"]',
            'input[type="tel"]',
            '#phoneNumberId'
        ]
        
        for selector in phone_selectors:
            if await self._check_element_exists(selector):
                return True
        
        return False
    
    async def _fill_phone_number(self) -> bool:
        """Заполнение номера телефона"""
        try:
            # Ищем поле ввода телефона
            phone_selectors = [
                'input[name="phoneNumber"]',
                'input[type="tel"]',
                '#phoneNumberId',
                '#grads-idv1-phoneNumberId'
            ]
            
            phone_input = None
            for selector in phone_selectors:
                if await wait_for_element(self.page, selector, timeout=3000):
                    phone_input = selector
                    break
            
            if not phone_input:
                self.logger.error("Phone input not found")
                return False
            
            # Вводим номер
            phone_number = self.account_data.phone
            self.logger.info(f"Entering phone: {phone_number}")
            
            await human_fill(self.page, phone_input, phone_number, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем далее
            next_selectors = [
                '#grads-idv1-next',
                'button:has-text("Далее")',
                'button:has-text("Next")',
                'button[type="submit"]'
            ]
            
            for selector in next_selectors:
                if await wait_and_click(self.page, selector, timeout=3000):
                    break
            
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Phone fill error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        """Обработка SMS верификации Google"""
        try:
            # Ждем SMS код
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Google",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                self.logger.error("SMS code not received")
                return False
            
            # Ищем поле ввода кода
            code_selectors = [
                'input[name="code"]',
                'input[type="text"][maxlength="6"]',
                '#code',
                '#grads-idv1-code'
            ]
            
            for selector in code_selectors:
                if await wait_for_element(self.page, selector, timeout=5000):
                    await human_fill(self.page, selector, code, simulate_typing=True)
                    break
            else:
                # Если поле для кода не найдено, возможно код нужно ввести в отдельные поля
                code_inputs = await self.page.locator('input[type="text"]').all()
                if len(code_inputs) >= 6:
                    # Вводим по одной цифре в каждое поле
                    for i, digit in enumerate(code[:6]):
                        if i < len(code_inputs):
                            await code_inputs[i].fill(digit)
                            await async_human_delay(0.1, 0.3)
            
            await async_human_delay(1.0, 2.0)
            
            # Нажимаем подтвердить
            verify_selectors = [
                '#grads-idv1-verify',
                'button:has-text("Подтвердить")',
                'button:has-text("Verify")',
                'button[type="submit"]'
            ]
            
            for selector in verify_selectors:
                if await wait_and_click(self.page, selector, timeout=3000):
                    break
            
            await self._wait_for_navigation()
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        """Завершение регистрации Google"""
        try:
            await async_human_delay(2.0, 3.0)
            
            # Пропускаем добавление телефона если предлагается
            skip_selectors = [
                'button:has-text("Пропустить")',
                'button:has-text("Skip")',
                'button:has-text("Не сейчас")',
                'button:has-text("Not now")'
            ]
            
            for selector in skip_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            # Принимаем условия использования
            agree_selectors = [
                'button:has-text("Принимаю")',
                'button:has-text("I agree")',
                'button:has-text("Согласен")',
                '#submitApproveAccess'
            ]
            
            for selector in agree_selectors:
                if await wait_and_click(self.page, selector, timeout=5000):
                    break
            
            await self._wait_for_navigation()
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        """Проверка создания Google аккаунта"""
        try:
            # Проверяем URL - должны быть на myaccount.google.com или подобном
            current_url = self.page.url
            
            success_indicators = [
                'myaccount.google.com',
                'accounts.google.com/SignOutOptions',
                'youtube.com',
                'mail.google.com'
            ]
            
            for indicator in success_indicators:
                if indicator in current_url:
                    self.logger.info(f"Account verified - URL: {current_url}")
                    return True
            
            # Проверяем наличие элементов успешной регистрации
            success_selectors = [
                '[aria-label*="Google Account"]',
                'img[alt*="Google Account"]',
                'button[aria-label*="Account"]'
            ]
            
            for selector in success_selectors:
                if await self._check_element_exists(selector):
                    self.logger.info("Account verified by element")
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Account verification error: {e}")
            return False
