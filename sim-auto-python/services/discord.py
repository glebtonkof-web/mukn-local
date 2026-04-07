"""
SIM Auto-Registration PRO - Discord Service
Регистрация аккаунтов Discord
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class DiscordService(BaseRegistrationService):
    """Сервис регистрации Discord аккаунтов"""
    
    PLATFORM_NAME = "discord"
    REGISTRATION_URL = "https://discord.com/register"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    SELECTORS = {
        'email_input': 'input[name="email"]',
        'username_input': 'input[name="username"]',
        'password_input': 'input[name="password"]',
        'date_month': 'select[aria-label="Month"]',
        'date_day': 'select[aria-label="Day"]',
        'date_year': 'select[aria-label="Year"]',
        'continue_button': 'button[type="submit"]',
        'claim_account': 'button:has-text("Claim Account")',
        'captcha_frame': 'iframe[title*="captcha"]',
    }
    
    def get_sms_keywords(self) -> list:
        return ['Discord', 'verify']
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация Discord аккаунта
        
        Особенности:
        - Email (обязательно)
        - Username (без #)
        - Пароль
        - Дата рождения
        - Может потребоваться captcha
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
            
            # Ввод username
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод username: {profile['username']}")
            
            await human_typing(self.page, self.SELECTORS['username_input'], profile['username'])
            await human_delay(0.5, 1.5)
            
            # Ввод пароля
            await human_typing(self.page, self.SELECTORS['password_input'], profile['password'])
            await human_delay(0.5, 1.5)
            
            # Дата рождения
            self.logger.info(f"[{self.PLATFORM_NAME}] Ввод даты рождения")
            
            month_options = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
            month = month_options[profile['birth_month'] - 1]
            
            await self.page.select_option(self.SELECTORS['date_month'], month)
            await human_delay(0.3, 0.8)
            
            day = str(profile['birth_day']).zfill(2)
            await self.page.select_option(self.SELECTORS['date_day'], day)
            await human_delay(0.3, 0.8)
            
            await self.page.select_option(self.SELECTORS['date_year'], str(profile['birth_year']))
            await human_delay(0.5, 1.5)
            
            # Кнопка продолжения
            await human_click(self.page, self.SELECTORS['continue_button'])
            await human_delay(3, 6)
            
            # Проверка captcha
            captcha_visible = await self.page.locator(self.SELECTORS['captcha_frame']).is_visible()
            if captcha_visible:
                self.logger.warning(f"[{self.PLATFORM_NAME}] Требуется решение captcha!")
                return RegistrationResult(success=False, error="Captcha required", requires_manual=True)
            
            # Claim account
            claim_visible = await self.page.locator(self.SELECTORS['claim_account']).is_visible()
            if claim_visible:
                await human_click(self.page, self.SELECTORS['claim_account'])
                await human_delay(3, 6)
            
            # Проверка успешной регистрации
            current_url = self.page.url
            
            if 'discord.com/channels' in current_url or 'discord.com/app' in current_url:
                self.logger.success(f"[{self.PLATFORM_NAME}] Аккаунт успешно создан!")
                
                account_data = {
                    'email': profile['email'],
                    'username': profile['username'],
                    'password': profile['password'],
                    'phone': phone,
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Registration flow incomplete")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            await self.take_screenshot("discord_error.png")
            return RegistrationResult(success=False, error=str(e))
        
        finally:
            await self.close_browser()
