"""
SIM Auto-Registration PRO - Tinder Service
Регистрация аккаунтов Tinder
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class TinderService(BaseRegistrationService):
    """Сервис регистрации Tinder аккаунтов"""
    
    PLATFORM_NAME = "tinder"
    REGISTRATION_URL = "https://tinder.com/"
    USE_MOBILE = True
    REQUIRES_PROXY = False  # Работает в РФ (ограничённо)
    TIMEOUT = 300000
    
    SELECTORS = {
        'login_button': 'button:has-text("Log in")',
        'phone_option': 'div:has-text("Log in with phone number")',
        'phone_input': 'input[type="tel"]',
        'continue_button': 'button:has-text("Continue")',
        'code_input': 'input[type="text"]',
        'verify_button': 'button:has-text("Continue")',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Tinder', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Tinder аккаунта
        
        Особенности:
        - Только через номер телефона
        - SMS верификация
        - Профиль заполняется после регистрации
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Клик Login
            await human_click(self.page, self.SELECTORS['login_button'])
            await human_delay(2, 4)
            
            # Выбор входа по телефону
            await human_click(self.page, self.SELECTORS['phone_option'])
            await human_delay(2, 4)
            
            # Ввод телефона
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод телефона: {phone}")
            
            formatted_phone = phone if phone.startswith('+') else f"+{phone}"
            await human_typing(self.page, self.SELECTORS['phone_input'], formatted_phone)
            await human_delay(1, 2)
            
            # Кнопка Continue
            await human_click(self.page, self.SELECTORS['continue_button'])
            await human_delay(3, 6)
            
            # SMS верификация
            self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
            
            code = await self.wait_for_sms_code(timeout=180)
            
            if not code:
                return RegistrationResult(success=False, error="SMS code timeout")
            
            await human_typing(self.page, self.SELECTORS['code_input'], code)
            await human_click(self.page, self.SELECTORS['verify_button'])
            await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'tinder.com/app' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'phone': phone,
                    'first_name': profile['first_name'],
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("tinder_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
