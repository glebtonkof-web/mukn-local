"""
SIM Auto-Registration PRO - YouTube/Google Service
Регистрация аккаунтов Google (YouTube, Gmail, etc.)
"""

import asyncio
import random
from typing import Dict, Optional
from playwright.async_api import Page

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading


class YouTubeService(BaseRegistrationService):
    """Сервис регистрации Google/YouTube аккаунтов"""
    
    PLATFORM_NAME = "youtube"
    REGISTRATION_URL = "https://accounts.google.com/signup"
    USE_MOBILE = False
    REQUIRES_PROXY = False
    TIMEOUT = 300000  # 5 минут
    
    # Селекторы страницы регистрации Google
    SELECTORS = {
        'name_input': 'input#firstName',
        'last_name_input': 'input#lastName',
        'username_input': 'input#username',
        'password_input': 'input[name="Passwd"]',
        'confirm_password': 'input[name="ConfirmPasswd"]',
        'next_button': 'button:has-text("Далее")',
        'phone_input': 'input#phoneNumberId',
        'code_input': 'input#code',
        'skip_phone': 'button:has-text("Пропустить")',
        'agree_button': 'button:has-text("Принимаю")',
        'error_message': '.LXRPh',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Google', 'G', 'YouTube', 'G-']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Google аккаунта
        
        Особенности:
        - Требует имя, фамилию, username (Gmail), пароль
        - Может потребовать номер телефона для верификации
        - Дата рождения и пол указываются позже
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            # Навигация
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            # Проверка на блокировку
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Шаг 1: Ввод имени и фамилии
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод имени: {profile['first_name']}")
            
            await human_typing(self.page, self.SELECTORS['name_input'], profile['first_name'])
            await human_delay(0.5, 1.5)
            
            await human_typing(self.page, self.SELECTORS['last_name_input'], profile['last_name'])
            await human_delay(0.5, 1.5)
            
            # Шаг 2: Ввод username (Gmail адрес)
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод username: {profile['username']}")
            
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Шаг 3: Ввод пароля
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод пароля")
            
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.3, 1)
            
            await human_typing(self.page, self.SELECTORS['confirm_password'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Кнопка "Далее"
            await human_click(self.page, self.SELECTORS['next_button'])
            await human_delay(3, 6)
            
            # Проверка на ошибку username
            error_visible = await self.page.locator(self.SELECTORS['error_message']).is_visible()
            if error_visible:
                error_text = await self.page.locator(self.SELECTORS['error_message']).text_content()
                self.logger.error(f"Username error: {error_text}")
                
                # Генерируем новый username и пробуем снова
                profile['username'] = f"{profile['username']}{random.randint(10, 999)}"
                await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
                await human_click(self.page, self.SELECTORS['next_button'])
                await human_delay(3, 6)
            
            # Шаг 4: Ввод номера телефона (если требуется)
            phone_input_visible = await self.page.locator(self.SELECTORS['phone_input']).is_visible()
            
            if phone_input_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ввод номера телефона: {phone}")
                
                # Форматируем номер для Google
                formatted_phone = phone if phone.startswith('+') else f"+{phone}"
                
                await human_typing(self.page, self.SELECTORS['phone_input'], formatted_phone)
                await human_delay(0.5, 1.5)
                
                await human_click(self.page, self.SELECTORS['next_button'])
                await human_delay(3, 5)
                
                # Шаг 5: Ввод SMS кода
                self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
                
                code = await self.wait_for_sms_code(timeout=180)
                
                if not code:
                    return RegistrationResult(success=False, error="SMS code timeout")
                
                await human_typing(self.page, self.SELECTORS['code_input'], code)
                await human_delay(0.5, 1.5)
                
                await human_click(self.page, self.SELECTORS['next_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'myaccount.google.com' in current_url or 'accounts.google.com/signin' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'username': profile['username'],
                    'email': f"{profile['username']}@gmail.com",
                    'password': profile['password'],
                    'first_name': profile['first_name'],
                    'last_name': profile['last_name'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                
                return RegistrationResult(success=True, account=account_data)
            
            # Проверка на необходимость принятия условий
            agree_visible = await self.page.locator(self.SELECTORS['agree_button']).is_visible()
            if agree_visible:
                await human_click(self.page, self.SELECTORS['agree_button'])
                await human_delay(2, 4)
                
                # Сохраняем аккаунт
                account_data = {
                    'username': profile['username'],
                    'email': f"{profile['username']}@gmail.com",
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
            await self.take_screenshot("youtube_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
