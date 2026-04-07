"""
SIM Auto-Registration PRO - WhatsApp Service
Регистрация аккаунтов WhatsApp (через веб)
"""

import asyncio
import random
from typing import Dict, Optional

from .base import BaseRegistrationService, RegistrationResult
from utils import human_delay, human_click, human_typing, random_scroll, simulate_reading, generate_profile


class WhatsAppService(BaseRegistrationService):
    """Сервис регистрации WhatsApp аккаунтов через веб"""
    
    PLATFORM_NAME = "whatsapp"
    REGISTRATION_URL = "https://web.whatsapp.com/"
    USE_MOBILE = False
    REQUIRES_PROXY = False  # Работает в РФ
    TIMEOUT = 300000
    
    # WhatsApp Web использует QR код для входа, 
    # для регистрации нужен мобильный клиент
    
    async def register(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация WhatsApp аккаунта
        
        Особенности:
        - WhatsApp Web не поддерживает регистрацию!
        - Регистрация происходит только через мобильное приложение
        - Можно только войти по QR коду
        
        Для автоматической регистрации нужен ADB для работы
        с приложением WhatsApp на Android
        """
        
        self.logger.warning(f"[{self.PLATFORM_NAME}] Регистрация через веб невозможна!")
        self.logger.info(f"[{self.PLATFORM_NAME}] Используйте ADB для регистрации через мобильное приложение")
        
        # Возвращаем информацию о необходимости использования ADB
        return RegistrationResult(
            success=False, 
            error="WhatsApp registration requires mobile app. Use ADB automation.",
            requires_manual=True
        )
    
    async def register_via_adb(self, phone: str, profile: Dict = None) -> RegistrationResult:
        """
        Регистрация WhatsApp через ADB (мобильное приложение)
        
        Требует:
        - Установленное приложение WhatsApp на Android
        - Root права или special permissions для UI automation
        """
        if profile is None:
            profile = generate_profile(self.PLATFORM_NAME, phone)
        
        try:
            if not self.adb:
                return RegistrationResult(success=False, error="ADB not initialized")
            
            self.logger.info(f"[{self.PLATFORM_NAME}] Регистрация через ADB...")
            
            # Запуск WhatsApp
            success, _ = self.adb._run_adb("shell am start -n com.whatsapp/.Main")
            if not success:
                return RegistrationResult(success=False, error="Failed to launch WhatsApp")
            
            await human_delay(3, 5)
            
            # Здесь нужна реализация UI автоматизации через ADB
            # Это требует accessibility service или root
            
            self.logger.info(f"[{self.PLATFORM_NAME}] Нажмите 'Accept & Continue' если появилось")
            
            # Ожидание SMS кода
            code = await self.wait_for_sms_code(timeout=180)
            
            if code:
                account_data = {
                    'phone': phone,
                    'name': f"{profile['first_name']} {profile['last_name']}",
                }
                
                await self.save_account(account_data)
                return RegistrationResult(success=True, account=account_data)
            
            return RegistrationResult(success=False, error="Manual registration required")
            
        except Exception as e:
            self.logger.error(f"Registration error: {e}")
            return RegistrationResult(success=False, error=str(e))
