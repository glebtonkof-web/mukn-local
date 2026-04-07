"""
SIM Auto-Registration PRO - Reddit Service
Регистрация аккаунтов Reddit
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class RedditService(BaseRegistrationService):
    """Сервис регистрации Reddit аккаунтов"""
    
    PLATFORM_NAME = "reddit"
    REGISTRATION_URL = "https://www.reddit.com/register/"
    USE_MOBILE = False
    REQUIRES_PROXY = True  # ЗАБЛОКИРОВАН В РФ!
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input#reg-email',
        'continue_button': 'button:has-text("Continue")',
        'username_input': 'input#reg-username',
        'password_input': 'input#reg-password',
        'signup_button': 'button[type="submit"]',
        'captcha': '.g-recaptcha',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Reddit', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Reddit аккаунта
        
        Особенности:
        - Email (обязательно)
        - Username (уникальный)
        - Пароль
        - Может потребоваться captcha
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
            
            # Кнопка Continue
            await human_click(self.page, self.SELECTORS['continue_button'])
            await human_delay(3, 6)
            
            # Проверка captcha
            captcha_visible = await self.page.locator(self.SELECTORS['captcha']).is_visible()
            if captcha_visible:
                self.logger.warning(f"[{self.PLATFORM_NAME}] Требуется решение captcha!")
                return RegistrationResult(success=False, error="Captcha required", requires_manual=True)
            
            # Ввод username
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод username: {profile['username']}")
            
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Ввод пароля
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(5, 10)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'reddit.com' in current_url and 'register' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'email': profile['email'],
                    'username': profile['username'],
                    'password': profile['password'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("reddit_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
