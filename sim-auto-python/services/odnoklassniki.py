"""
SIM Auto-Registration PRO - Odnoklassniki Service
Регистрация аккаунтов Odnoklassniki (OK.ru)
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class OKService(BaseRegistrationService):
    """Сервис регистрации Odnoklassniki аккаунтов"""
    
    PLATFORM_NAME = "odnoklassniki"
    REGISTRATION_URL = "https://ok.ru/dk?st.cmd=anonymRegistration"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'phone_input': 'input[name="st.r.phone"]',
        'name_input': 'input[name="st.r.fname"]',
        'surname_input': 'input[name="st.r.lname"]',
        'birthday_day': 'select[name="st.r.day"]',
        'birthday_month': 'select[name="st.r.month"]',
        'birthday_year': 'select[name="st.r.year"]',
        'gender_male': 'input[name="st.r.gender"][value="1"]',
        'gender_female': 'input[name="st.r.gender"][value="2"]',
        'continue_button': 'input[type="submit"]',
        'code_input': 'input[name="st.r.code"]',
        'confirm_button': 'input[type="submit"]',
        'password_input': 'input[name="st.r.password"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Одноклассники', 'OK.ru', 'Odnoklassniki']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Odnoklassniki аккаунта
        
        Особенности:
        - Номер телефона
        - Имя, фамилия
        - Дата рождения
        - Пол
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
            
            # Ввод телефона
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод телефона: {phone}")
            
            clean_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
            await human_typing(self.page, self.SELECTORS['phone_input'], clean_phone)
            await human_delay(0.5, 1.5)
            
            # Ввод имени
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод имени: {profile['first_name']}")
            
            await human_typing(self.page, self.SELECTORS['name_input'], profile['first_name'])
            await human_delay(0.5, 1.5)
            
            # Ввод фамилии
            await human_typing(self.page, self.SELECTORS['surname_input'], profile['last_name'])
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
            
            await self.page.select_option(self.SELECTORS['birthday_day'], str(profile['birth_day']))
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['birthday_month'], str(profile['birth_month']))
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['birthday_year'], str(profile['birth_year']))
            await human_delay(0.5, 1.5)
            
            # Пол
            gender_selector = self.SELECTORS['gender_male'] if profile['gender'] == 'male' else self.SELECTORS['gender_female']
            await human_click(self.page, gender_selector)
            await human_delay(0.5, 1.5)
            
            # Кнопка продолжения
            await human_click(self.page, self.SELECTORS['continue_button'])
            await human_delay(3, 6)
            
            # SMS верификация
            self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
            
            code = await self.wait_for_sms_code(timeout=180)
            
            if not code:
                return RegistrationResult(success=False, error="SMS code timeout")
            
            await human_typing(self.page, self.SELECTORS['code_input'], code)
            await human_click(self.page, self.SELECTORS['confirm_button'])
            await human_delay(3, 6)
            
            # Установка пароля
            password_visible = await self.page.locator(self.SELECTORS['password_input']).is_visible()
            
            if password_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Установка пароля")
                await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
                await human_click(self.page, self.SELECTORS['confirm_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'ok.ru/profile' in current_url or 'ok.ru/feed' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'first_name': profile['first_name'],
                    'last_name': profile['last_name'],
                    'password': profile['password'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("ok_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
