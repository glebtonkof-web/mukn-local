"""
SIM Auto-Registration PRO - Twitch Service
Регистрация аккаунтов Twitch
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class TwitchService(BaseRegistrationService):
    """Сервис регистрации Twitch аккаунтов"""
    
    PLATFORM_NAME = "twitch"
    REGISTRATION_URL = "https://www.twitch.tv/signup"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'username_input': 'input#signup-username',
        'password_input': 'input#password-input',
        'email_input': 'input[name="email"]',
        'birthday_month': 'select[aria-label="Birth Month"]',
        'birthday_day': 'select[aria-label="Birth Day"]',
        'birthday_year': 'select[aria-label="Birth Year"]',
        'signup_button': 'button[data-a-target="signup-button"]',
        'phone_input': 'input[autocomplete="tel-national"]',
        'code_input': 'input[autocomplete="one-time-code"]',
        'verify_button': 'button:has-text("Submit")',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Twitch', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Twitch аккаунта
        
        Особенности:
        - Username (уникальный)
        - Пароль
        - Email
        - Дата рождения
        - Phone verification (опционально)
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Ввод username
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод username: {profile['username']}")
            
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Ввод пароля
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Ввод email
            await human_typing(self.page, self.SELECTORS['email_input'], profile['email'])
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
            
            month_options = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
            month = month_options[profile['birth_month'] - 1]
            
            await self.page.select_option(self.SELECTORS['birthday_month'], month)
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['birthday_day'], str(profile['birth_day']))
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['birthday_year'], str(profile['birth_year']))
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(5, 10)
            
            # Phone verification (если требуется)
            phone_input_visible = await self.page.locator(self.SELECTORS['phone_input']).is_visible()
            
            if phone_input_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Требуется верификация телефона")
                
                formatted_phone = phone if phone.startswith('+') else f"+{phone}"
                await human_typing(self.page, self.SELECTORS['phone_input'], formatted_phone)
                await human_delay(1, 2)
                
                self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
                
                code = await self.wait_for_sms_code(timeout=180)
                
                if not code:
                    return RegistrationResult(success=False, error="SMS code timeout")
                
                await human_typing(self.page, self.SELECTORS['code_input'], code)
                await human_click(self.page, self.SELECTORS['verify_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'twitch.tv' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'username': profile['username'],
                    'password': profile['password'],
                    'email': profile['email'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("twitch_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
