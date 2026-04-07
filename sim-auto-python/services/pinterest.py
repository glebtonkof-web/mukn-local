"""
SIM Auto-Registration PRO - Pinterest Service
Регистрация аккаунтов Pinterest
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class PinterestService(BaseRegistrationService):
    """Сервис регистрации Pinterest аккаунтов"""
    
    PLATFORM_NAME = "pinterest"
    REGISTRATION_URL = "https://www.pinterest.com/signup/"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input[id="email"]',
        'password_input': 'input[id="password"]',
        'age_input': 'input[id="age"]',
        'signup_button': 'button[type="submit"]',
        'name_input': 'input[id="name"]',
        'continue_button': 'button:has-text("Continue")',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Pinterest', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Pinterest аккаунта
        
        Особенности:
        - Email
        - Пароль
        - Возраст
        - Имя
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Ввод email
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод email: {profile['email']}")
            
            await human_typing(self.page, self.SELECTORS['email_input'], profile['email'])
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Возраст
            age = 2024 - profile['birth_year']
            await human_typing(self.page, self.SELECTORS['age_input'], str(age))
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(3, 6)
            
            # Ввод имени
            name_visible = await self.page.locator(self.SELECTORS['name_input']).is_visible()
            if name_visible:
                full_name = f"{profile['first_name']} {profile['last_name']}"
                await human_typing(self.page, self.SELECTORS['name_input'], full_name)
                await human_click(self.page, self.SELECTORS['continue_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'pinterest.com' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'email': profile['email'],
                    'password': profile['password'],
                    'phone': phone,
                    'first_name': profile['first_name'],
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("pinterest_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
