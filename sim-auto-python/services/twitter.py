"""
SIM Auto-Registration PRO - Twitter/X Service
Регистрация аккаунтов Twitter (X)
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class TwitterService(BaseRegistrationService):
    """Сервис регистрации Twitter/X аккаунтов"""
    
    PLATFORM_NAME = "twitter"
    REGISTRATION_URL = "https://twitter.com/i/flow/signup"
    USE_MOBILE = False
    REQUIRES_PROXY = True  # ЗАБЛОКИРОВАН В РФ!
    TIMEOUT = 300000
    
    SELECTORS = {
        'create_account': 'a[data-testid="signup"]',
        'email_option': 'span:has-text("Почта")',
        'name_input': 'input[name="name"]',
        'email_input': 'input[name="email"]',
        'phone_input': 'input[name="phone_number"]',
        'date_month': 'select[aria-label="Month"]',
        'date_day': 'select[aria-label="Day"]',
        'date_year': 'select[aria-label="Year"]',
        'next_button': 'button:has-text("Далее")',
        'next_button_en': 'button:has-text("Next")',
        'code_input': 'input[data-testid="ocfEnterTextTextInput"]',
        'verify_button': 'button[data-testid="ocfEnterTextNextButton"]',
        'password_input': 'input[name="password"]',
        'signup_button': 'button[data-testid="SignupButton"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Twitter', 'X.com', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Twitter/X аккаунта
        
        Особенности:
        - Можно зарегистрировать через email или телефон
        - Имя, дата рождения обязательны
        - SMS верификация
        - Username генерируется автоматически или выбирается
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Клик "Создать аккаунт"
            self.logger.info(f"[{self.PLATFORM_NAME}] Начало регистрации")
            
            await human_click(self.page, self.SELECTORS['create_account'])
            await human_delay(2, 4)
            
            # Выбор регистрации через телефон (если есть опция)
            try:
                await human_click(self.page, self.SELECTORS['email_option'], timeout=3000)
            except:
                pass
            
            await human_delay(1, 2)
            
            # Ввод имени
            name = f"{profile['first_name']} {profile['last_name']}"
            await human_typing(self.page, self.SELECTORS['name_input'], name)
            await human_delay(0.5, 1.5)
            
            # Ввод телефона
            formatted_phone = phone if phone.startswith('+') else f"+{phone}"
            await human_typing(self.page, self.SELECTORS['phone_input'], formatted_phone)
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            month_options = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            month = month_options[profile['birth_month'] - 1]
            
            await self.page.select_option(self.SELECTORS['date_month'], month)
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['date_day'], str(profile['birth_day']))
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['date_year'], str(profile['birth_year']))
            await human_delay(0.5, 1.5)
            
            # Кнопка "Далее"
            next_btn = self.page.locator(f'{self.SELECTORS["next_button"]}, {self.SELECTORS["next_button_en"]}')
            await next_btn.click()
            await human_delay(3, 6)
            
            # SMS верификация
            self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
            
            code = await self.wait_for_sms_code(timeout=180)
            
            if not code:
                return RegistrationResult(success=False, error="SMS code timeout")
            
            await human_typing(self.page, self.SELECTORS['code_input'], code)
            await human_delay(0.5, 1.5)
            
            await human_click(self.page, self.SELECTORS['verify_button'])
            await human_delay(3, 6)
            
            # Установка пароля
            password_visible = await self.page.locator(self.SELECTORS['password_input']).is_visible()
            if password_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Установка пароля")
                await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
                await human_delay(0.5, 1.5)
                
                await human_click(self.page, self.SELECTORS['signup_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'twitter.com/home' in current_url or 'x.com/home' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'username': profile.get('username', ''),
                    'password': profile['password'],
                    'phone': phone,
                    'email': profile['email'],
                    'name': name,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("twitter_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
