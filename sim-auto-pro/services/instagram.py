"""
SIM Auto-Registration PRO - Instagram Registration
МУКН Enterprise AI Automation Platform

Регистрация аккаунтов Instagram:
- Создание аккаунта через телефон/email
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


class InstagramRegistration(BaseRegistrationService):
    """Регистрация Instagram аккаунтов"""
    
    @property
    def service_name(self) -> str:
        return "instagram"
    
    async def get_registration_url(self) -> str:
        """URL страницы регистрации Instagram"""
        return "https://www.instagram.com/accounts/emailsignup/"
    
    async def fill_registration_form(self) -> bool:
        """Заполнение формы регистрации Instagram"""
        try:
            # Ждем загрузки страницы
            await wait_for_element(self.page, 'input[name="emailOrPhone"]', timeout=15000)
            await async_human_delay(1.0, 2.0)
            
            # Принимаем cookies если есть
            cookie_selectors = [
                'button:has-text("Разрешить все cookies")',
                'button:has-text("Allow all cookies")',
                'button:has-text("Принять")',
                'button:has-text("Accept")'
            ]
            
            for selector in cookie_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(0.5, 1.0)
                    break
            
            # Вводим email или телефон
            self.logger.info("Filling email/phone...")
            await human_fill(
                self.page,
                'input[name="emailOrPhone"]',
                self.account_data.email,
                simulate_typing=True
            )
            await async_human_delay(0.5, 1.0)
            
            # Вводим полное имя
            self.logger.info("Filling full name...")
            full_name = f"{self.account_data.first_name} {self.account_data.last_name}"
            await human_fill(
                self.page,
                'input[name="fullName"]',
                full_name,
                simulate_typing=True
            )
            await async_human_delay(0.5, 1.0)
            
            # Вводим username
            self.logger.info("Filling username...")
            await human_fill(
                self.page,
                'input[name="username"]',
                self.account_data.username,
                simulate_typing=True
            )
            await async_human_delay(0.5, 1.0)
            
            # Вводим пароль
            self.logger.info("Filling password...")
            await human_fill(
                self.page,
                'input[name="password"]',
                self.account_data.password,
                simulate_typing=True
            )
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем регистрация
            self.logger.info("Clicking Sign up...")
            signup_selectors = [
                'button[type="submit"]',
                'button:has-text("Регистрация")',
                'button:has-text("Sign up")'
            ]
            
            for selector in signup_selectors:
                if await wait_and_click(self.page, selector, timeout=3000):
                    break
            
            await async_human_delay(2.0, 3.0)
            
            # Проверяем на ошибку username
            if await self._check_username_error():
                # Пробуем другой username
                new_username = f"{self.account_data.username}{random.randint(100, 999)}"
                self.account_data.username = new_username
                
                # Очищаем и вводим заново
                await self.page.fill('input[name="username"]', '')
                await human_fill(
                    self.page,
                    'input[name="username"]',
                    new_username,
                    simulate_typing=True
                )
                
                # Нажимаем регистрация снова
                for selector in signup_selectors:
                    if await wait_and_click(self.page, selector, timeout=3000):
                        break
                
                await async_human_delay(2.0, 3.0)
            
            # Дата рождения может потребоваться
            await self._handle_birthday_dialog()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Form fill error: {e}")
            return False
    
    async def _check_username_error(self) -> bool:
        """Проверка ошибки username"""
        error_selectors = [
            'span:has-text("недоступно")',
            'span:has-text("unavailable")',
            'span:has-text("уже занято")',
            'div[id*="error"]'
        ]
        
        for selector in error_selectors:
            if await self._check_element_exists(selector):
                return True
        
        return False
    
    async def _handle_birthday_dialog(self) -> bool:
        """Обработка диалога даты рождения"""
        try:
            # Проверяем наличие диалога
            birthday_selectors = [
                'select[title="Month"]',
                'select[title="День"]',
                'select[title="Год"]'
            ]
            
            has_birthday = False
            for selector in birthday_selectors:
                if await self._check_element_exists(selector):
                    has_birthday = True
                    break
            
            if not has_birthday:
                return True
            
            self.logger.info("Filling birthday...")
            
            # Выбираем месяц
            month = random.randint(1, 12)
            await self.page.select_option('select[title="Month"]', str(month))
            await async_human_delay(0.3, 0.6)
            
            # Выбираем день
            day = random.randint(1, 28)
            await self.page.select_option('select[title="Day"]', str(day))
            await async_human_delay(0.3, 0.6)
            
            # Выбираем год
            year = random.randint(1990, 2000)
            await self.page.select_option('select[title="Year"]', str(year))
            await async_human_delay(0.3, 0.6)
            
            # Нажимаем далее
            next_selectors = [
                'button:has-text("Далее")',
                'button:has-text("Next")',
                'button[type="button"]'
            ]
            
            for selector in next_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            await async_human_delay(1.0, 2.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Birthday dialog error: {e}")
            return False
    
    async def handle_sms_verification(self) -> bool:
        """Обработка SMS верификации Instagram"""
        try:
            # Instagram может запросить подтверждение телефона
            await async_human_delay(2.0, 3.0)
            
            # Проверяем нужен ли ввод телефона
            phone_add_selectors = [
                'button:has-text("Добавить номер телефона")',
                'button:has-text("Add phone number")'
            ]
            
            for selector in phone_add_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    
                    # Вводим телефон
                    phone_input_selectors = [
                        'input[type="tel"]',
                        'input[name="phoneNumber"]'
                    ]
                    
                    for phone_sel in phone_input_selectors:
                        if await self._check_element_exists(phone_sel):
                            await human_fill(
                                self.page,
                                phone_sel,
                                self.account_data.phone,
                                simulate_typing=True
                            )
                            break
                    
                    # Нажимаем далее
                    await human_click(self.page, 'button:has-text("Далее")')
                    await async_human_delay(1.0, 2.0)
                    break
            
            # Ждем SMS код
            code = await self.sms_manager.wait_for_code(
                sim_slot=self.sim_slot,
                service_name="Instagram",
                timeout=self.config.sms_wait_timeout
            )
            
            if not code:
                self.logger.warning("SMS code not received, checking if needed")
                # Проверяем не перешли ли мы дальше
                current_url = self.page.url
                if "challenge" not in current_url:
                    return True
                return False
            
            # Вводим код
            code_selectors = [
                'input[name="confirmationCode"]',
                'input[type="text"]',
                'input[placeholder*="код"]'
            ]
            
            for selector in code_selectors:
                if await wait_for_element(self.page, selector, timeout=3000):
                    await human_fill(self.page, selector, code, simulate_typing=True)
                    break
            
            await async_human_delay(0.5, 1.0)
            
            # Нажимаем подтвердить
            verify_selectors = [
                'button:has-text("Подтвердить")',
                'button:has-text("Confirm")',
                'button[type="submit"]'
            ]
            
            for selector in verify_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    break
            
            await async_human_delay(2.0, 3.0)
            
            return True
            
        except Exception as e:
            self.logger.error(f"SMS verification error: {e}")
            return False
    
    async def complete_registration(self) -> bool:
        """Завершение регистрации Instagram"""
        try:
            await async_human_delay(2.0, 3.0)
            
            # Пропускаем сохранение информации
            save_selectors = [
                'button:has-text("Сохранить")',
                'button:has-text("Save")'
            ]
            
            for selector in save_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            # Пропускаем синхронизацию контактов
            sync_selectors = [
                'button:has-text("Пропустить")',
                'button:has-text("Skip")',
                'button:has-text("Не сейчас")'
            ]
            
            for selector in sync_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            # Пропускаем добавление фото
            for selector in sync_selectors:  # Те же селекторы
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            # Пропускаем рекомендации
            for selector in sync_selectors:
                if await self._check_element_exists(selector):
                    await human_click(self.page, selector)
                    await async_human_delay(1.0, 2.0)
                    break
            
            return True
            
        except Exception as e:
            self.logger.error(f"Complete registration error: {e}")
            return False
    
    async def verify_account(self) -> bool:
        """Проверка создания Instagram аккаунта"""
        try:
            current_url = self.page.url
            
            # Проверяем успешные URL
            success_indicators = [
                'instagram.com/',
                'instagram.com/accounts/onetap'
            ]
            
            for indicator in success_indicators:
                if indicator in current_url and "signup" not in current_url:
                    self.logger.info(f"Account verified - URL: {current_url}")
                    return True
            
            # Проверяем наличие элементов профиля
            profile_selectors = [
                'img[alt*="profile"]',
                'nav a[href="/"]',
                'svg[aria-label="Home"]'
            ]
            
            for selector in profile_selectors:
                if await self._check_element_exists(selector):
                    self.logger.info("Account verified by element")
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Account verification error: {e}")
            return False
