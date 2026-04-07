"""
SIM Auto-Registration PRO - TikTok Registration
МУКN Enterprise AI Automation Platform

Регистрация аккаунтов TikTok:
- Создание аккаунта через телефон
- SMS верификация
- Пропуск вопросов при регистрации
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


class TikTokRegistration(BaseRegistrationService):
    """Регистрация TikTok аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "tiktok"
    
    async def get_registration_url(self) -> str:
        """URL страницы регистрации TikTok"""
        return "https://www.tiktok.com/signup/phone"
    
    async def fill_registration_form(self) -> bool:
        """Заполнение формы регистрации TikTok"""
        try:
            # Ждем загрузки страницы
            await asyncio.sleep(3)
            
            # TikTok может показать капчу или другие экраны
            await self._handle_initial_screens()
            
            # Проверяем что мы на странице регистрации по телефону
            current_url = self.page.url
            if "signup" not in current_url:
                await human_navigate(self.page, "https://www.tiktok.com/signup/phone")
            
            # Выбираем регистрацию по телефону если нужно
            phone_tab_selectors = [
                '[data-e2e="signup-phone-tab"]',
                'div:has-text("Телефон")',
                'button:has-text("Phone")',
                '[data-testid="signup-phone-tab"]'
            ]
            
            for selector in phone_tab_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            # Выбираем код страны
            await self._select_country_code()
            
            # Вводим номер телефона
            phone_selectors = [
                'input[type="tel"]',
                'input[name="phone"]',
                'input[placeholder*="phone"]',
                'input[placeholder*="номер"]',
                '[data-e2e="signup-phone-input"]'
            ]
            
            phone_input = None
            for selector in phone_selectors:
                if await wait_for_element(self.page, selector, timeout=5000):
                    phone_input = selector
                    break
            
            if not phone_input:
                self.logger.error("Phone input not found")
                return False
            
            # Вводим номер без кода страны
            phone_number = self.account_data.phone.replace("+7", "")
            self.logger.info(f"Entering phone: {phone_number}")
            
            await human_fill(self.page, phone_input, phone_number, simulate_typing=True)
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем кнопку отправки кода
            send_code_selectors = [
                '[data-e2e="send-code-button"]',
                'button:has-text("Отправить код")',
                'button:has-text("Send code")',
                'button[type="submit"]'
            ]
            
            for selector in send_code_selectors:
                if await wait_and_click(self.page, selector, timeout=3000):
                    break
            
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def _handle_initial_screens(self) -> bool:
        """Обработка начальных экранов TikTok"""
        try:
            # Может появиться экран с cookies
            accept_cookies_selectors = [
                'button:has-text("Принять все")',
                'button:has-text("Accept all")',
                'button:has-text("OK")',
                '#onetrust-accept-btn-handler'
            ]
            
            for selector in accept_cookies_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            # Может появиться экран выбора регистрации
            signup_selectors = [
                'button:has-text("Зарегистрироваться")',
                'button:has-text("Sign up")',
                '[data-e2e="signup-button"]'
            ]
            
            for selector in signup_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            return True
            
        except Exception as e:
            self.logger.error(f"Initial screens error: {e}")
            return False
    
    async def _select_country_code(self) -> bool:
        """Выбор кода страны +7 (Россия)"""
        try:
            # Ищем кнопку выбора страны
            country_selectors = [
                '[data-e2e="country-code-button"]',
                'div[class*="country"]',
                'button:has-text("+")'
            ]
            
            for selector in country_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(0.5, 1.0)
                    break
            else:
                # Возможно код страны уже выбран правильно
                return True
            
            # Ищем Россию в списке
            russia_selectors = [
                'div:has-text("Russia")',
                'div:has-text("Россия")',
                'div:has-text("+7")',
                '[data-country-code="RU"]'
            ]
            
            for selector in russia_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(0.5, 1.0)
                    break
            
            return True
            
        except Exception as e:
            self.logger.error(f"Country selection error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        """Обработка SMS верификации TikTok"""
        try:
            # Ждем SMS код
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="TikTok",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                self.logger.error("SMS code not received")
                return False
            
            # Ищем поле ввода кода
            code_selectors = [
                'input[name="code"]',
                'input[type="text"]',
                '[data-e2e="verify-code-input"]',
                'input[placeholder*="код"]',
                'input[placeholder*="code"]'
            ]
            
            for selector in code_selectors:
                if await wait_for_element(self.page, selector, timeout=5000):
                    await human_fill(self.page, selector, code, simulate_typing=True)
                    break
            else:
                # TikTok может использовать отдельные поля для каждой цифры
                code_inputs = await self.page.locator('input[type="text"]').all()
                if len(code_inputs) >= 4:
                    for i, digit in enumerate(code[:4]):
                        if i < len(code_inputs):
                            await code_inputs[i].fill(digit)
                            await async_human_delay(0.1, 0.3)
            
            await async_human_delay(1.0, 2.0)
            
            # Код может подтверждаться автоматически
            # Или нужно нажать кнопку
            verify_selectors = [
                'button:has-text("Подтвердить")',
                'button:has-text("Verify")',
                'button[type="submit"]'
            ]
            
            for selector in verify_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        """Завершение регистрации TikTok"""
        try:
            await async_human_delay(2.0, 3.0)
            
            # Может потребоваться создать пароль
            password_selectors = [
                'input[type="password"]',
                'input[name="password"]'
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
                    
                    # Подтверждение пароля если есть
                    confirm_selectors = [
                        'input[name="confirmPassword"]',
                        'input[name="confirm_password"]'
                    ]
                    
                    for conf_selector in confirm_selectors:
                        if await self._check_element_exists(conf_selector):
                            await human_fill(
                                self.page,
                                conf_selector,
                                self.account_data.password,
                                simulate_typing=True
                            )
                            break
                    
                    # Нажимаем далее
                    next_selectors = [
                        'button:has-text("Далее")',
                        'button:has-text("Next")',
                        'button[type="submit"]'
                    ]
                    
                    for next_sel in next_selectors:
                        if await self._check_element_exists(next_sel):
                            await human_click(self.page, next_sel)
                            break
                    
                    await async_human_delay(2.0, 3.0)
                    break
            
            # Пропускаем вопросы о возрасте если есть
            await self._skip_birthday_selection()
            
            # Пропускаем рекомендации
            skip_selectors = [
                'button:has-text("Пропустить")',
                'button:has-text("Skip")',
                'button:has-text("Не сейчас")'
            ]
            
            for selector in skip_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def _skip_birthday_selection(self) -> bool:
        """Пропуск выбора даты рождения"""
        try:
            # TikTok может показать выбор возраста
            month_selectors = [
                'select[name="month"]',
                'div:has-text("Месяц")'
            ]
            
            for selector in month_selectors:
                if await self._check_element_exists(selector):
                    # Выбираем случайный месяц
                    month = random.randint(1, 12)
                    await self.page.select_option(selector, str(month))
                    await async_human_delay(0.3, 0.6)
                    break
            
            day_selectors = [
                'select[name="day"]',
                'div:has-text("День")'
            ]
            
            for selector in day_selectors:
                if await self._check_element_exists(selector):
                    day = random.randint(1, 28)
                    await self.page.select_option(selector, str(day))
                    await async_human_delay(0.3, 0.6)
                    break
            
            year_selectors = [
                'select[name="year"]',
                'div:has-text("Год")'
            ]
            
            for selector in year_selectors:
                if await self._check_element_exists(selector):
                    year = random.randint(1990, 2000)
                    await self.page.select_option(selector, str(year))
                    await async_human_delay(0.3, 0.6)
                    break
            
            # Нажимаем далее
            next_selectors = [
                'button:has-text("Далее")',
                'button:has-text("Next")'
            ]
            
            for selector in next_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            return True
            
        except Exception as e:
            self.logger.error(f"Birthday selection error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        """Проверка создания TikTok аккаунта"""
        try:
            current_url = self.page.url
            
            # Проверяем успешные индикаторы
            success_indicators = [
                'tiktok.com/foryou',
                'tiktok.com/@',
                'tiktok.com/home'
            ]
            
            for indicator in success_indicators:
                if indicator in current_url:
                    self.logger.info(f"Account verified - URL: {current_url}")
                    return True
            
            # Проверяем наличие элементов профиля
            profile_selectors = [
                '[data-e2e="profile-icon"]',
                '[data-e2e="profile-avatar"]',
                'div[class*="profile"]'
            ]
            
            for selector in profile_selectors:
                if await self._check_element_exists(selector):
                    self.logger.info("Account verified by profile element")
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Account verification error: {e}")
            return False
