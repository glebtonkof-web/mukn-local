"""
SIM Auto-Registration PRO - VK Service
Регистрация аккаунтов VK (ВКонтакте)
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class VKService(BaseRegistrationService):
    """Сервис регистрации VK аккаунтов"""
    
    PLATFORM_NAME = "vk"
    REGISTRATION_URL = "https://vk.com/join"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'first_name': 'input[name="first_name"]',
        'last_name': 'input[name="last_name"]',
        'birthday_day': 'select[name="bday"]',
        'birthday_month': 'select[name="bmonth"]',
        'birthday_year': 'select[name="byear"]',
        'gender_male': 'input[name="sex"][value="2"]',
        'gender_female': 'input[name="sex"][value="1"]',
        'phone_input': 'input[name="mobile"]',
        'signup_button': 'button[type="submit"]',
        'code_input': 'input[name="code"]',
        'confirm_button': 'button[type="submit"]',
        'password_input': 'input[name="password"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['ВКонтакте', 'VK', 'VKontakte']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация VK аккаунта
        
        Особенности:
        - Имя, фамилия
        - Дата рождения
        - Пол
        - Номер телефона (SMS верификация)
        - Пароль устанавливается после подтверждения
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Ввод имени
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод имени: {profile['first_name']}")
            
            await human_typing(self.page, self.SELECTORS['first_name'], profile['first_name'])
            await human_delay(0.5, 1.5)
            
            # Ввод фамилии
            await human_typing(self.page, self.SELECTORS['last_name'], profile['last_name'])
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
            
            await self.page.select_option(self.SELECTORS['birthday_day'], str(profile['birth_day']))
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['birthday_month'], str(profile['birth_month']))
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['birthday_year'], str(profile['birth_year']))
            await human_delay(0.5, 1.5)
            
            # Пол
            gender_selector = self.SELECTORS['gender_male'] if profile['gender'] == 'male' else self.SELECTORS['gender_female']
            await human_click(self.page, gender_selector)
            await human_delay(0.5, 1.5)
            
            # Ввод телефона
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод телефона: {phone}")
            
            clean_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
            await human_typing(self.page, self.SELECTORS['phone_input'], clean_phone)
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(3, 6)
            
            # SMS верификация
            self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
            
            code = await self.wait_for_sms_code(timeout=180)
            
            if not code:
                return RegistrationResult(success=False, error="SMS code timeout")
            
            await human_typing(self.page, self.SELECTORS['code_input'], code)
            await human_click(self.page, self.SELECTORS['confirm_button'])
            await human_delay(3, 6)
            
            # Установка пароля
            password_visible = await self.page.locator(self.SELECTORS['password_input']).is_visible()
            
            if password_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Установка пароля")
                await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
                await human_click(self.page, self.SELECTORS['confirm_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'vk.com/feed' in current_url or 'vk.com/id' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'first_name': profile['first_name'],
                    'last_name': profile['last_name'],
                    'password': profile['password'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("vk_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
