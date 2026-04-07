"""
SIM Auto-Registration PRO - Instagram Service
Регистрация аккаунтов Instagram (через веб)
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class InstagramService(BaseRegistrationService):
    """Сервис регистрации Instagram аккаунтов"""
    
    PLATFORM_NAME = "instagram"
    REGISTRATION_URL = "https://www.instagram.com/accounts/emailsignup/"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_phone_input': 'input[name="emailOrPhone"]',
        'fullname_input': 'input[name="fullName"]',
        'username_input': 'input[name="username"]',
        'password_input': 'input[name="password"]',
        'signup_button': 'button[type="submit"]',
        'birthday_month': 'select[title="Month"]',
        'birthday_day': 'select[title="Day"]',
        'birthday_year': 'select[title="Year"]',
        'confirm_birthday': 'button:has-text("Next")',
        'code_input': 'input[name="confirmationCode"]',
        'confirm_code': 'button:has-text("Confirm")',
        'error_message': '#slfErrorAlert',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Instagram', 'IG', 'Meta']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Instagram аккаунта
        
        Особенности:
        - Email или телефон (мы используем телефон)
        - Полное имя, username, пароль
        - Дата рождения
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
            
            # Шаг 1: Ввод данных
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод регистрационных данных")
            
            # Email/Phone
            formatted_phone = phone if phone.startswith('+') else f"+{phone}"
            await human_typing(self.page, self.SELECTORS['email_phone_input'], formatted_phone)
            await human_delay(0.5, 1.5)
            
            # Полное имя
            full_name = f"{profile['first_name']} {profile['last_name']}"
            await human_typing(self.page, self.SELECTORS['fullname_input'], full_name)
            await human_delay(0.5, 1.5)
            
            # Username
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Пароль
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Кнопка регистрации
            await human_click(self.page, self.SELECTORS['signup_button'])
            await human_delay(3, 6)
            
            # Шаг 2: Дата рождения (если появилась)
            dob_visible = await self.page.locator(self.SELECTORS['birthday_year']).is_visible()
            if dob_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
                
                # Выбор месяца
                month_options = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December']
                month = month_options[profile['birth_month'] - 1]
                
                await self.page.select_option(self.SELECTORS['birthday_month'], month)
                await human_delay(0.3, 0.8)
                
                # День
                await self.page.select_option(self.SELECTORS['birthday_day'], str(profile['birth_day']))
                await human_delay(0.3, 0.8)
                
                # Год
                await self.page.select_option(self.SELECTORS['birthday_year'], str(profile['birth_year']))
                await human_delay(0.5, 1.5)
                
                # Подтверждение
                await human_click(self.page, self.SELECTORS['confirm_birthday'])
                await human_delay(2, 4)
            
            # Шаг 3: SMS верификация
            code_input_visible = await self.page.locator(self.SELECTORS['code_input']).is_visible()
            
            if code_input_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
                
                code = await self.wait_for_sms_code(timeout=180)
                
                if not code:
                    return RegistrationResult(success=False, error="SMS code timeout")
                
                await human_typing(self.page, self.SELECTORS['code_input'], code)
                await human_delay(0.5, 1.5)
                
                await human_click(self.page, self.SELECTORS['confirm_code'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'instagram.com' in current_url and 'signup' not in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'username': profile['username'],
                    'password': profile['password'],
                    'email': profile['email'],
                    'phone': phone,
                    'full_name': full_name,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            # Проверка ошибки
            error_el = await self.page.locator(self.SELECTORS['error_message']).text_content()
            if error_el:
                return RegistrationResult(success=False, error=error_el)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("instagram_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
