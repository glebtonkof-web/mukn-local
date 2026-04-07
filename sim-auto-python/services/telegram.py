"""
SIM Auto-Registration PRO - Telegram Service
Регистрация аккаунтов Telegram (через веб)
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class TelegramService(BaseRegistrationService):
    """Сервис регистрации Telegram аккаунтов через веб"""
    
    PLATFORM_NAME = "telegram"
    REGISTRATION_URL = "https://web.telegram.org/"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'phone_input': 'input.input-phone',
        'next_button': 'button.btn-primary',
        'code_input': 'input[name="code"]',
        'first_name': 'input[name="first_name"]',
        'last_name': 'input[name="last_name"]',
        'signup_button': 'button[type="submit"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Telegram', 'TG', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Telegram аккаунта
        
        Особенности:
        - Только номер телефона
        - SMS или звонок для верификации
        - Имя и фамилия (без пароля!)
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            await self.init_browser(headless=False)
            
            if not await self.navigate_to_registration():
                return RegistrationResult(success=False, error="Failed to navigate")
            
            if await self.detect_block():
                return RegistrationResult(success=False, error="Blocked/Captcha", requires_manual=True)
            
            # Ввод номера телефона
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод номера: {phone}")
            
            formatted_phone = phone if phone.startswith('+') else f"+{phone}"
            await human_typing(self.page, self.SELECTORS['phone_input'], formatted_phone)
            await human_delay(1, 2)
            
            # Кнопка "Next" / "Далее"
            await human_click(self.page, self.SELECTORS['next_button'])
            await human_delay(3, 6)
            
            # Подтверждение номера (может появиться диалог)
            confirm_btn = self.page.locator('button:has-text("OK"), button:has-text("Да")')
            if await confirm_btn.is_visible():
                await confirm_btn.click()
                await human_delay(2, 4)
            
            # Ожидание SMS кода
            self.logger.info(f"[{self.PLATFORM_NAME}] Ожидание SMS кода...")
            
            code = await self.wait_for_sms_code(timeout=180)
            
            if not code:
                return RegistrationResult(success=False, error="SMS code timeout")
            
            # Ввод кода
            code_visible = await self.page.locator(self.SELECTORS['code_input']).is_visible()
            if code_visible:
                await human_typing(self.page, self.SELECTORS['code_input'], code)
                await human_delay(2, 4)
            
            # Ввод имени и фамилии (для новых номеров)
            first_name_visible = await self.page.locator(self.SELECTORS['first_name']).is_visible()
            
            if first_name_visible:
                self.logger.info(f"[{self.PLATFORM_NAME}] Ввод имени: {profile['first_name']}")
                
                await human_typing(self.page, self.SELECTORS['first_name'], profile['first_name'])
                await human_delay(0.5, 1.5)
                
                await human_typing(self.page, self.SELECTORS['last_name'], profile['last_name'])
                await human_delay(0.5, 1.5)
                
                await human_click(self.page, self.SELECTORS['signup_button'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            # Telegram Web показывает чаты после успешного входа
            await human_delay(3, 6)
            
            # Проверяем что не на странице ввода кода
            current_url = self.page.url
            page_content = await self.page.content()
            
            if 'chat' in current_url or 'telegram.org' in current_url:
                if 'confirmation code' not in page_content.lower():
                    self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                    
                    account_data = {
                        'phone': phone,
                        'first_name': profile['first_name'],
                        'last_name': profile['last_name'],
                        'username': profile.get('username', ''),
                    }
                    
                    await self.save_account(account_data)
                    return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("telegram_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
