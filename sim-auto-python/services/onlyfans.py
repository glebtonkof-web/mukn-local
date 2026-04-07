"""
SIM Auto-Registration PRO - OnlyFans Service
Регистрация аккаунтов OnlyFans
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class OnlyFansService(BaseRegistrationService):
    """Сервис регистрации OnlyFans аккаунтов"""
    
    PLATFORM_NAME = "onlyfans"
    REGISTRATION_URL = "https://onlyfans.com/signup"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input[name="email"]',
        'name_input': 'input[name="name"]',
        'username_input': 'input[name="username"]',
        'password_input': 'input[name="password"]',
        'birthday_input': 'input[name="birthday"]',
        'signup_button': 'button[type="submit"]',
        'verify_button': 'button:has-text("Verify")',
    }
    
    def get_sms_keywords(self) -> list:
        return ['OnlyFans', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация OnlyFans аккаунта
        
        Особенности:
        - Email
        - Имя
        - Username
        - Пароль
        - Дата рождения (18+)
        - Email верификация
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
            
            # Имя
            full_name = f"{profile['first_name']} {profile['last_name']}"
            await human_typing(self.page, self.SELECTORS['name_input'], full_name)
            await human_delay(0.5, 1.5)
            
            # Username
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Дата рождения (формат MM/DD/YYYY)
            birthday = f"{profile['birth_month']:02d}/{profile['birth_day']:02d}/{profile['birth_year']}"
            await human_typing(self.page, self.SELECTORS['birthday_input'], birthday)
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(5, 10)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'onlyfans.com' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт создан! Требуется email верификация")
                
                account_data = {
                    'email': profile['email'],
                    'password': profile['password'],
                    'username': profile['username'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("onlyfans_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
