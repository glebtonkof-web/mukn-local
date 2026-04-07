"""
SIM Auto-Registration PRO - Facebook Service
Регистрация аккаунтов Facebook
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class FacebookService(BaseRegistrationService):
    """Сервис регистрации Facebook аккаунтов"""
    
    PLATFORM_NAME = "facebook"
    REGISTRATION_URL = "https://www.facebook.com/r.php"
    USE_MOBILE = False
    REQUIRES_PROXY = True  # ЗАБЛОКИРОВАН В РФ!
    TIMEOUT = 300000
    
    SELECTORS = {
        'first_name': 'input[name="firstname"]',
        'last_name': 'input[name="lastname"]',
        'email_input': 'input[name="reg_email__"]',
        'password_input': 'input[name="reg_passwd__"]',
        'birth_day': 'select[name="birthday_day"]',
        'birth_month': 'select[name="birthday_month"]',
        'birth_year': 'select[name="birthday_year"]',
        'gender_male': 'input[value="2"]',
        'gender_female': 'input[value="1"]',
        'signup_button': 'button[name="websubmit"]',
        'code_input': 'input[name="approvals_code"]',
        'confirm_button': 'button[type="submit"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Facebook', 'FB', 'Meta']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Facebook аккаунта
        
        Особенности:
        - Имя, фамилия
        - Email или телефон
        - Пароль
        - Дата рождения
        - Пол
        - Строгие проверки на ботов!
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
            
            # Ввод email/телефона
            formatted_phone = phone if phone.startswith('+') else f"+{phone}"
            await human_typing(self.page, self.SELECTORS['email_input'], formatted_phone)
            await human_delay(0.5, 1.5)
            
            # Ввод пароля
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
            
            await self.page.select_option(self.SELECTORS['birth_day'], str(profile['birth_day']))
            await human_delay(0.3, 0.8)
            
            month_value = str(profile['birth_month'])
            await self.page.select_option(self.SELECTORS['birth_month'], month_value)
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['birth_year'], str(profile['birth_year']))
            await human_delay(0.5, 1.5)
            
            # Пол
            gender_selector = self.SELECTORS['gender_male'] if profile['gender'] == 'male' else self.SELECTORS['gender_female']
            await human_click(self.page, gender_selector)
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(5, 10)
            
            # Проверка на SMS верификацию
            code_input_visible = await self.page.locator(self.SELECTORS['code_input']).is_visible()
            
            if code_input_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
                
                code = await self.wait_for_sms_code(timeout=180)
                
                if not code:
                    return RegistrationResult(success=False, error="SMS code timeout")
                
                await human_typing(self.page, self.SELECTORS['code_input'], code)
                await human_click(self.page, self.SELECTORS['confirm_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'facebook.com' in current_url and ('checkpoint' not in current_url or 'success' in current_url):
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
            await self.take_screenshot("facebook_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
