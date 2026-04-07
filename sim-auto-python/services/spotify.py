"""
SIM Auto-Registration PRO - Spotify Service
Регистрация аккаунтов Spotify
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class SpotifyService(BaseRegistrationService):
    """Сервис регистрации Spotify аккаунтов"""
    
    PLATFORM_NAME = "spotify"
    REGISTRATION_URL = "https://www.spotify.com/signup"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ (ограничённо)
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input[id="email"]',
        'confirm_email': 'input[id="confirm"]',
        'password_input': 'input[id="password"]',
        'name_input': 'input[id="displayname"]',
        'birthday_day': 'input[id="day"]',
        'birthday_month': 'select[id="month"]',
        'birthday_year': 'input[id="year"]',
        'gender_male': 'input[id="gender_option_male"]',
        'gender_female': 'input[id="gender_option_female"]',
        'signup_button': 'button[type="submit"]',
        'code_input': 'input[name="verificationCode"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Spotify', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Spotify аккаунта
        
        Особенности:
        - Email (обязательно)
        - Пароль
        - Имя для профиля
        - Дата рождения
        - Пол
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
            
            # Ввод email
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод email: {profile['email']}")
            
            await human_typing(self.page, self.SELECTORS['email_input'], profile['email'])
            await human_delay(0.5, 1.5)
            
            # Подтверждение email
            await human_typing(self.page, self.SELECTORS['confirm_email'], profile['email'])
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Имя
            display_name = f"{profile['first_name']} {profile['last_name']}"
            await human_typing(self.page, self.SELECTORS['name_input'], display_name)
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
            
            await human_typing(self.page, self.SELECTORS['birthday_day'], str(profile['birth_day']))
            await human_delay(0.3, 0.8)
            
            month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']
            await self.page.select_option(self.SELECTORS['birthday_month'], month_names[profile['birth_month'] - 1])
            await human_delay(0.3, 0.8)
            
            await human_typing(self.page, self.SELECTORS['birthday_year'], str(profile['birth_year']))
            await human_delay(0.5, 1.5)
            
            # Пол
            gender_selector = self.SELECTORS['gender_male'] if profile['gender'] == 'male' else self.SELECTORS['gender_female']
            await human_click(self.page, gender_selector)
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(5, 10)
            
            # Проверка на phone verification
            code_input_visible = await self.page.locator(self.SELECTORS['code_input']).is_visible()
            
            if code_input_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
                
                code = await self.wait_for_sms_code(timeout=180)
                
                if not code:
                    return RegistrationResult(success=False, error="SMS code timeout")
                
                await human_typing(self.page, self.SELECTORS['code_input'], code)
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'spotify.com' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'email': profile['email'],
                    'password': profile['password'],
                    'display_name': display_name,
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("spotify_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
