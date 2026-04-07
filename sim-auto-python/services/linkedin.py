"""
SIM Auto-Registration PRO - LinkedIn Service
Регистрация аккаунтов LinkedIn
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class LinkedInService(BaseRegistrationService):
    """Сервис регистрации LinkedIn аккаунтов"""
    
    PLATFORM_NAME = "linkedin"
    REGISTRATION_URL = "https://www.linkedin.com/signup"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input[name="email-or-phone"]',
        'password_input': 'input[name="password"]',
        'join_button': 'button[type="submit"]',
        'first_name': 'input[name="first-name"]',
        'last_name': 'input[name="last-name"]',
        'continue_button': 'button:has-text("Continue")',
        'code_input': 'input[name="pin"]',
        'verify_button': 'button[type="submit"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['LinkedIn', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация LinkedIn аккаунта
        
        Особенности:
        - Email или телефон
        - Пароль
        - Имя, фамилия
        - SMS верификация
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
            
            # Ввод пароля
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Кнопка Join
            await human_click(self.page, self.SELECTORS['join_button'])
            await human_delay(3, 6)
            
            # Ввод имени и фамилии
            first_name_visible = await self.page.locator(self.SELECTORS['first_name']).is_visible()
            
            if first_name_visible:
                await human_typing(self.page, self.SELECTORS['first_name'], profile['first_name'])
                await human_delay(0.5, 1.5)
                
                await human_typing(self.page, self.SELECTORS['last_name'], profile['last_name'])
                await human_delay(0.5, 1.5)
                
                await human_click(self.page, self.SELECTORS['continue_button'])
                await human_delay(3, 6)
            
            # SMS верификация
            code_input_visible = await self.page.locator(self.SELECTORS['code_input']).is_visible()
            
            if code_input_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
                
                code = await self.wait_for_sms_code(timeout=180)
                
                if not code:
                    return RegistrationResult(success=False, error="SMS code timeout")
                
                await human_typing(self.page, self.SELECTORS['code_input'], code)
                await human_click(self.page, self.SELECTORS['verify_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'linkedin.com/feed' in current_url or 'linkedin.com/mynetwork' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'email': profile['email'],
                    'password': profile['password'],
                    'first_name': profile['first_name'],
                    'last_name': profile['last_name'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("linkedin_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
