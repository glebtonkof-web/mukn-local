"""
SIM Auto-Registration PRO - TikTok Service
Регистрация аккаунтов TikTok
"""

import asyncio
import random
from typing import Dict, Optional
from playwright.async_api import Page

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class TikTokService(BaseRegistrationService):
    """Сервис регистрации TikTok аккаунтов"""
    
    PLATFORM_NAME = "tiktok"
    REGISTRATION_URL = "https://www.tiktok.com/signup/phone"
    USE_MOBILE = True  # TikTok лучше работает с мобильной версией
    REQUIRES_PROXY = True  # ЗАБЛОКИРОВАН В РФ!
    TIMEOUT = 300000
    
    SELECTORS = {
        'phone_input': 'input[type="tel"]',
        'send_code_button': 'button:has-text("Send code")',
        'code_input': 'input[placeholder*="code"]',
        'password_input': 'input[type="password"]',
        'signup_button': 'button[type="submit"]',
        'date_birth_month': 'select[aria-label="Month"]',
        'date_birth_day': 'input[placeholder="Day"]',
        'date_birth_year': 'input[placeholder="Year"]',
        'error_toast': '[data-e2e="toast-error"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['TikTok', 'Tik Tok', 'verification']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация TikTok аккаунта
        
        Особенности:
        - Требует номер телефона и SMS верификацию
        - Дата рождения обязательна
        - Username и пароль можно задать позже
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Выбор страны/региона для номера
            # Нужно кликнуть на селектор страны и выбрать Россию
            
            # Ввод номера телефона
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод номера: {phone}")
            
            # Очищаем номер от +7 и оставляем 10 цифр для России
            clean_phone = phone.replace('+7', '').replace('+', '').replace('-', '').replace(' ', '')
            if clean_phone.startswith('7'):
                clean_phone = clean_phone[1:]
            
            await human_typing(self.page, self.SELECTORS['phone_input'], clean_phone)
            await human_delay(1, 2)
            
            # Кнопка отправки кода
            send_code_btn = self.page.locator('button:has-text("Send code"), button:has-text("Отправить код")')
            if await send_code_btn.is_visible():
                await human_click(self.page, 'button:has-text("Send code"), button:has-text("Отправить код")')
            
            await human_delay(2, 4)
            
            # Ожидание SMS кода
            self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
            
            code = await self.wait_for_sms_code(timeout=180)
            
            if not code:
                return RegistrationResult(success=False, error="SMS code timeout")
            
            # Ввод кода
            code_input = self.page.locator('input[placeholder*="code"], input[type="text"]').first
            await human_typing(self.page, 'input[placeholder*="code"]', code, clear_first=False)
            await human_delay(1, 3)
            
            # Дата рождения (если требуется)
            dob_visible = await self.page.locator(self.SELECTORS['date_birth_year']).is_visible()
            if dob_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
                
                await human_typing(self.page, self.SELECTORS['date_birth_year'], str(profile['birth_year']))
                await human_delay(0.3, 0.8)
                
                await human_typing(self.page, self.SELECTORS['date_birth_day'], str(profile['birth_day']))
                await human_delay(0.3, 0.8)
            
            # Установка пароля
            password_visible = await self.page.locator(self.SELECTORS['password_input']).is_visible()
            if password_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Установка пароля")
                await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
                await human_delay(0.5, 1.5)
            
            # Проверка успешной регистрации
            await human_delay(3, 6)
            
            current_url = self.page.url
            if 'tiktok.com/foryou' in current_url or 'tiktok.com/@' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'username': profile.get('username', ''),
                    'password': profile['password'],
                    'phone': phone,
                    'birth_year': profile['birth_year'],
                    'first_name': profile['first_name'],
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            # Проверка ошибки
            error = await self.page.locator(self.SELECTORS['error_toast']).text_content()
            if error:
                return RegistrationResult(success=False, error=error)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("tiktok_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
