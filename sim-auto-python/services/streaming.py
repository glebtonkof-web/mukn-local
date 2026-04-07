"""
SIM Auto-Registration PRO - Video Streaming Services
Регистрация аккаунтов для видео платформ: Likee, Trovo, Rumble, Odysee
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class LikeeService(BaseRegistrationService):
    """Сервис регистрации Likee аккаунтов"""
    
    PLATFORM_NAME = "likee"
    REGISTRATION_URL = "https://likee.video/"
    USE_MOBILE = True
    REQUIRES_PROXY = False
    TIMEOUT = 300000
    
    SELECTORS = {
        'profile_button': 'a[href*="profile"]',
        'login_button': 'button:has-text("Login")',
        'phone_option': 'div:has-text("Phone")',
        'phone_input': 'input[type="tel"]',
        'code_input': 'input[placeholder*="code"]',
        'continue_button': 'button[type="submit"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Likee', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            # Likee требует мобильное приложение для полной регистрации
            self.logger.warning(f"[{self.PLATFORM_NAME}] Рекомендуется использовать мобильное приложение")
            
            return RegistrationResult(success=False, error="Use mobile app for full registration")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()


class TrovoService(BaseRegistrationService):
    """Сервис регистрации Trovo аккаунтов"""
    
    PLATFORM_NAME = "trovo"
    REGISTRATION_URL = "https://trovo.live/"
    USE_MOBILE = False
    REQUIRES_PROXY = False
    TIMEOUT = 300000
    
    SELECTORS = {
        'signup_button': 'a:has-text("Sign Up")',
        'email_input': 'input[type="email"]',
        'username_input': 'input[name="username"]',
        'password_input': 'input[type="password"]',
        'submit_button': 'button[type="submit"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Trovo', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(2, 4)
            
            # Email
            await human_typing(self.page, self.SELECTORS['email_input'], profile['email'])
            await human_delay(0.5, 1.5)
            
            # Username
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Submit
            await human_click(self.page, self.SELECTORS['submit_button'])
            await human_delay(5, 10)
            
            current_url = self.page.url
            
            if 'trovo.live' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
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
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()


class RumbleService(BaseRegistrationService):
    """Сервис регистрации Rumble аккаунтов"""
    
    PLATFORM_NAME = "rumble"
    REGISTRATION_URL = "https://rumble.com/register.php"
    USE_MOBILE = False
    REQUIRES_PROXY = False
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input[name="email"]',
        'username_input': 'input[name="username"]',
        'password_input': 'input[name="password"]',
        'confirm_password': 'input[name="password_confirm"]',
        'submit_button': 'button[type="submit"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Rumble', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            # Email
            await human_typing(self.page, self.SELECTORS['email_input'], profile['email'])
            await human_delay(0.5, 1.5)
            
            # Username
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Подтверждение пароля
            await human_typing(self.page, self.SELECTORS['confirm_password'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Submit
            await human_click(self.page, self.SELECTORS['submit_button'])
            await human_delay(5, 10)
            
            current_url = self.page.url
            
            if 'rumble.com' in current_url and 'register' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
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
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()


class OdyseeService(BaseRegistrationService):
    """Сервис регистрации Odysee аккаунтов"""
    
    PLATFORM_NAME = "odysee"
    REGISTRATION_URL = "https://odysee.com/$/signup"
    USE_MOBILE = False
    REQUIRES_PROXY = False
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input[name="email"]',
        'password_input': 'input[name="password"]',
        'submit_button': 'button[type="submit"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Odysee', 'LBRY', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            # Email
            await human_typing(self.page, self.SELECTORS['email_input'], profile['email'])
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Submit
            await human_click(self.page, self.SELECTORS['submit_button'])
            await human_delay(5, 10)
            
            current_url = self.page.url
            
            if 'odysee.com' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт создан! Проверьте email")
                
                account_data = {
                    'email': profile['email'],
                    'password': profile['password'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
