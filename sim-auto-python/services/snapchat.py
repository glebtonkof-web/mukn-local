"""
SIM Auto-Registration PRO - Snapchat Service
Регистрация аккаунтов Snapchat
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class SnapchatService(BaseRegistrationService):
    """Сервис регистрации Snapchat аккаунтов"""
    
    PLATFORM_NAME = "snapchat"
    REGISTRATION_URL = "https://www.snapchat.com/"
    USE_MOBILE = True
    REQUIRES_PROXY = False  # Работает в РФ (ограничённо)
    TIMEOUT = 300000
    
    SELECTORS = {
        'signup_button': 'a:has-text("Sign up")',
        'first_name': 'input[name="firstName"]',
        'last_name': 'input[name="lastName"]',
        'username': 'input[name="username"]',
        'birthday': 'input[name="birthDate"]',
        'password': 'input[name="password"]',
        'phone_option': 'button:has-text("phone")',
        'phone_input': 'input[type="tel"]',
        'continue_button': 'button[type="submit"]',
        'code_input': 'input[name="verificationCode"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Snapchat', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Snapchat аккаунта
        
        Особенности:
        - Имя, фамилия
        - Username
        - Дата рождения
        - Пароль
        - Phone verification
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Клик Sign Up
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(2, 4)
            
            # Ввод имени
            await human_typing(self.page, self.SELECTORS['first_name'], profile['first_name'])
            await human_delay(0.5, 1.5)
            
            # Ввод фамилии
            await human_typing(self.page, self.SELECTORS['last_name'], profile['last_name'])
            await human_delay(0.5, 1.5)
            
            # Username
            await human_typing(self.page, self.SELECTORS['username'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            birthday = f"{profile['birth_month']}/{profile['birth_day']}/{profile['birth_year']}"
            await human_typing(self.page, self.SELECTORS['birthday'], birthday)
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Продолжить
            await human_click(self.page, self.SELECTORS['continue_button'])
            await human_delay(3, 6)
            
            # Выбор телефона
            phone_option_visible = await self.page.locator(self.SELECTORS['phone_option']).is_visible()
            if phone_option_visible:
                await human_click(self.page, self.SELECTORS['phone_option'])
                await human_delay(1, 2)
            
            # Ввод телефона
            formatted_phone = phone if phone.startswith('+') else f"+{phone}"
            await human_typing(self.page, self.SELECTORS['phone_input'], formatted_phone)
            await human_click(self.page, self.SELECTORS['continue_button'])
            await human_delay(3, 6)
            
            # SMS верификация
            self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
            
            code = await self.wait_for_sms_code(timeout=180)
            
            if not code:
                return RegistrationResult(success=False, error="SMS code timeout")
            
            await human_typing(self.page, self.SELECTORS['code_input'], code)
            await human_click(self.page, self.SELECTORS['continue_button'])
            await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'snapchat.com' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'username': profile['username'],
                    'password': profile['password'],
                    'phone': phone,
                    'first_name': profile['first_name'],
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("snapchat_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
