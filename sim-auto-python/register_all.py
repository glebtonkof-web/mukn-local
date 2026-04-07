#!/usr/bin/env python3
"""
SIM Auto-Registration PRO
Главный скрипт автоматической регистрации, прогрева и монетизации

Возможности:
- Автоматическая регистрация на 22+ платформах
- Прогрев аккаунтов с анти-бан защитой
- Автоматическая монетизация
- Работа 24/7 без участия
"""

import asyncio
import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Добавляем текущую директорию в путь
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils import (
    ADBClient, AccountStorage, Logger, 
    generate_profile, human_delay
)
from services import (
    SERVICES, BLOCKED_IN_RUSSIA, SMS_VERIFICATION_REQUIRED,
    get_service, list_services
)
from warming import WarmingManager, WarmingPhase
from monetization import MonetizationManager, RiskLevel


# =============================================================================
# КОНФИГУРАЦИЯ
# =============================================================================

DEFAULT_CONFIG = {
    # Режим работы
    'headless': False,  # Показывать браузер
    
    # Прокси (для заблокированных в РФ сервисов)
    'proxy': {
        'enabled': False,
        'server': '',
        'username': '',
        'password': '',
    },
    
    # Расписание регистрации
    'registration': {
        'platforms': [],  # Пусто = все платформы
        'max_accounts_per_sim': 3,
        'delay_between_services': (180, 360),  # 3-6 минут
        'retry_attempts': 3,
    },
    
    # Прогрев
    'warming': {
        'enabled': True,
        'auto_start': True,
        'risk_tolerance': 'medium',
    },
    
    # Монетизация
    'monetization': {
        'enabled': True,
        'auto_select': True,
        'min_warming_days': 14,
    },
}


class SIMAutoRegistration:
    """Главный класс автоматической регистрации"""
    
    def __init__(self, config_path: str = None):
        self.config = DEFAULT_CONFIG.copy()
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                self._merge_config(user_config)
        
        self.logger = Logger('sim-auto')
        self.adb = ADBClient()
        self.storage = AccountStorage()
        self.warming = WarmingManager(self.storage)
        self.monetization = MonetizationManager(self.storage)
        
        # Состояние
        self.devices: List[Dict] = []
        self.sim_cards: List[Dict] = []
        self.active_tasks: List[asyncio.Task] = []
    
    def _merge_config(self, user_config: Dict):
        """Глубокое слияние конфигураций"""
        for key, value in user_config.items():
            if isinstance(value, dict) and key in self.config:
                self.config[key].update(value)
            else:
                self.config[key] = value
    
    async def initialize(self):
        """Инициализация системы"""
        self.logger.info("=" * 60)
        self.logger.info("SIM Auto-Registration PRO")
        self.logger.info("=" * 60)
        
        # Подключение к ADB
        self.logger.info("[1/3] Подключение к ADB...")
        
        if not self.adb.connect():
            self.logger.error("Не удалось подключиться к ADB")
            self.logger.info("Убедитесь что:")
            self.logger.info("  1. ADB установлен (apt install adb)")
            self.logger.info("  2. На телефоне включена отладка USB")
            self.logger.info("  3. Телефон подключён через USB")
            return False
        
        # Получение устройств
        self.devices = self.adb.list_devices()
        self.logger.info(f"Найдено устройств: {len(self.devices)}")
        
        for device in self.devices:
            self.logger.info(f"  - {device['id']}: {device['status']}")
        
        if not self.devices:
            self.logger.error("Нет подключённых устройств")
            return False
        
        # Получение информации о SIM картах
        self.logger.info("[2/3] Сканирование SIM-карт...")
        
        for device in self.devices:
            self.adb.device_id = device['id']
            sim_info = self.adb.get_sim_info()
            
            for i, sim in enumerate(sim_info):
                if 'phone' in sim or 'operator' in sim:
                    self.sim_cards.append({
                        'device_id': device['id'],
                        'slot': i,
                        'phone': sim.get('phone', 'Unknown'),
                        'operator': sim.get('operator', 'Unknown'),
                    })
        
        self.logger.info(f"Найдено SIM-карт: {len(self.sim_cards)}")
        
        for sim in self.sim_cards:
            self.logger.info(f"  - {sim['phone']} ({sim['operator']}) - Device: {sim['device_id']}")
        
        if not self.sim_cards:
            self.logger.error("Не удалось обнаружить SIM-карты")
            return False
        
        # Загрузка существующих аккаунтов
        self.logger.info("[3/3] Загрузка аккаунтов...")
        accounts = self.storage.load_all()
        total_accounts = sum(len(acc) for acc in accounts.values())
        self.logger.info(f"Всего аккаунтов в базе: {total_accounts}")
        
        for platform, accs in accounts.items():
            if accs:
                self.logger.info(f"  - {platform}: {len(accs)} аккаунтов")
        
        return True
    
    async def register_platform(
        self,
        platform: str,
        phone: str,
        device_id: str,
        profile: Dict = None
    ):
        """Регистрация на одной платформе"""
        
        # Получение сервиса
        service_class = get_service(platform)
        if not service_class:
            self.logger.error(f"Неизвестная платформа: {platform}")
            return None
        
        # Проверка блокировки в РФ
        if platform in BLOCKED_IN_RUSSIA:
            if not self.config['proxy']['enabled']:
                self.logger.warning(f"{platform} заблокирован в РФ! Нужен VPN/Proxy")
                return None
        
        # Создание прокси конфигурации
        proxy = None
        if self.config['proxy']['enabled']:
            proxy = {
                'server': self.config['proxy']['server'],
                'username': self.config['proxy']['username'],
                'password': self.config['proxy']['password'],
            }
        
        # Создание сервиса
        service = service_class(
            adb=self.adb,
            storage=self.storage,
            proxy=proxy,
            logger=self.logger
        )
        
        # Регистрация с повторными попытками
        max_retries = self.config['registration']['retry_attempts']
        result = await service.run_with_retry(phone, profile, max_retries)
        
        return result
    
    async def register_all_platforms(
        self,
        phone: str,
        device_id: str,
        platforms: List[str] = None
    ):
        """Регистрация на всех платформах для одного номера"""
        
        if platforms is None:
            platforms = list_services()
        
        # Фильтрация уже зарегистрированных
        existing = self.storage.get_accounts
        registered_platforms = []
        
        for platform in platforms:
            accounts = self.storage.get_accounts(platform)
            if any(acc.get('phone') == phone for acc in accounts):
                self.logger.info(f"[{platform}] Уже зарегистрирован для {phone}")
                registered_platforms.append(platform)
        
        platforms_to_register = [p for p in platforms if p not in registered_platforms]
        
        self.logger.info(f"Регистрация {phone} на {len(platforms_to_register)} платформах")
        
        results = []
        
        for i, platform in enumerate(platforms_to_register, 1):
            self.logger.info(f"\n[{i}/{len(platforms_to_register)}] Регистрация {platform.upper()}")
            
            # Генерация профиля
            profile = generate_profile(platform, phone)
            
            # Регистрация
            result = await self.register_platform(platform, phone, device_id, profile)
            
            if result:
                results.append({
                    'platform': platform,
                    'success': result.success,
                    'error': result.error,
                    'account': result.account if result.success else None,
                })
                
                if result.success:
                    self.logger.success(f"[{platform}] Успешно зарегистрирован!")
                else:
                    self.logger.error(f"[{platform}] Ошибка: {result.error}")
            else:
                results.append({
                    'platform': platform,
                    'success': False,
                    'error': 'Service not available',
                })
            
            # Пауза между сервисами
            if i < len(platforms_to_register):
                delay = self.config['registration']['delay_between_services']
                pause = asyncio.get_event_loop().run_in_executor(
                    None, lambda: time.sleep(
                        __import__('random').uniform(*delay)
                    )
                )
                await pause
        
        return results
    
    async def auto_register_all(self):
        """Автоматическая регистрация всех SIM на всех платформах"""
        
        self.logger.info("\n" + "=" * 60)
        self.logger.info("НАЧАЛО АВТОМАТИЧЕСКОЙ РЕГИСТРАЦИИ")
        self.logger.info("=" * 60)
        
        results = {}
        
        for sim in self.sim_cards:
            phone = sim['phone']
            device_id = sim['device_id']
            
            self.logger.info(f"\nОбработка SIM: {phone}")
            
            # Определение платформ для регистрации
            max_per_sim = self.config['registration']['max_accounts_per_sim']
            all_platforms = list_services()
            
            # Выбираем платформы с учётом лимита
            selected_platforms = all_platforms[:max_per_sim]
            
            # Регистрация
            sim_results = await self.register_all_platforms(
                phone, device_id, selected_platforms
            )
            
            results[phone] = sim_results
        
        # Итоговый отчёт
        self.logger.info("\n" + "=" * 60)
        self.logger.info("ИТОГОВЫЙ ОТЧЁТ")
        self.logger.info("=" * 60)
        
        total_success = 0
        total_failed = 0
        
        for phone, phone_results in results.items():
            success = sum(1 for r in phone_results if r['success'])
            failed = sum(1 for r in phone_results if not r['success'])
            total_success += success
            total_failed += failed
            
            self.logger.info(f"\n{phone}:")
            self.logger.info(f"  Успешно: {success}")
            self.logger.info(f"  Ошибок: {failed}")
            
            for r in phone_results:
                status = "✓" if r['success'] else "✗"
                self.logger.info(f"    {status} {r['platform']}: {r.get('error', 'OK')}")
        
        self.logger.info(f"\nВСЕГО:")
        self.logger.info(f"  Успешно: {total_success}")
        self.logger.info(f"  Ошибок: {total_failed}")
        
        return results
    
    def get_warming_plan(self, platform: str, account_data: Dict):
        """Получение плана прогрева для аккаунта"""
        return self.warming.generate_daily_plan(platform, 1)
    
    def get_monetization_schemes(
        self,
        platform: str,
        accounts_count: int = 1,
        warming_days: int = 14
    ):
        """Получение схем монетизации"""
        return self.monetization.get_suitable_schemes(
            platform,
            accounts_count,
            warming_days,
            RiskLevel.MEDIUM
        )
    
    def save_config(self, path: str):
        """Сохранение конфигурации"""
        with open(path, 'w') as f:
            json.dump(self.config, f, indent=2)
        self.logger.info(f"Конфигурация сохранена: {path}")


# =============================================================================
# CLI ИНТЕРФЕЙС
# =============================================================================

async def main():
    parser = argparse.ArgumentParser(
        description='SIM Auto-Registration PRO',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры:
  python register_all.py                    # Регистрация на всех платформах
  python register_all.py -p telegram tiktok # Только указанные платформы
  python register_all.py --list             # Список всех платформ
  python register_all.py --scan             # Только сканирование SIM
        """
    )
    
    parser.add_argument(
        '-p', '--platforms',
        nargs='+',
        help='Платформы для регистрации'
    )
    
    parser.add_argument(
        '--config',
        help='Путь к файлу конфигурации'
    )
    
    parser.add_argument(
        '--headless',
        action='store_true',
        help='Скрытый режим браузера'
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help='Показать список платформ'
    )
    
    parser.add_argument(
        '--scan',
        action='store_true',
        help='Только сканирование SIM-карт'
    )
    
    parser.add_argument(
        '--schemes',
        action='store_true',
        help='Показать схемы монетизации'
    )
    
    parser.add_argument(
        '--proxy',
        help='Прокси сервер (socks5://user:pass@host:port)'
    )
    
    args = parser.parse_args()
    
    # Список платформ
    if args.list:
        print("\nДоступные платформы:")
        print("-" * 40)
        
        for platform in list_services():
            status = ""
            if platform in BLOCKED_IN_RUSSIA:
                status = " [ЗАБЛОКИРОВАН В РФ]"
            elif platform in SMS_VERIFICATION_REQUIRED:
                status = " [SMS]"
            
            print(f"  • {platform}{status}")
        
        print(f"\nВсего: {len(list_services())} платформ")
        return
    
    # Схемы монетизации
    if args.schemes:
        print("\nСхемы монетизации:")
        print("-" * 60)
        
        from monetization import MONETIZATION_SCHEMES
        
        for scheme in MONETIZATION_SCHEMES:
            income = scheme.estimated_daily_income
            print(f"\n{scheme.name}")
            print(f"  Тип: {scheme.type.value}")
            print(f"  Платформы: {', '.join(scheme.platforms)}")
            print(f"  Доход: {income[0]}-{income[1]} руб/день")
            print(f"  Риск: {scheme.risk_level.value}")
            print(f"  Автоматизация: {scheme.automation_level * 100:.0f}%")
        
        return
    
    # Создание экземпляра
    auto_reg = SIMAutoRegistration(args.config)
    
    if args.headless:
        auto_reg.config['headless'] = True
    
    if args.proxy:
        auto_reg.config['proxy']['enabled'] = True
        # Парсинг прокси (упрощённый)
        auto_reg.config['proxy']['server'] = args.proxy
    
    # Инициализация
    if not await auto_reg.initialize():
        sys.exit(1)
    
    # Только сканирование
    if args.scan:
        print("\nСканирование завершено")
        return
    
    # Регистрация
    if args.platforms:
        # Регистрация на указанных платформах
        for sim in auto_reg.sim_cards:
            await auto_reg.register_all_platforms(
                sim['phone'],
                sim['device_id'],
                args.platforms
            )
    else:
        # Автоматическая регистрация всех SIM на всех платформах
        await auto_reg.auto_register_all()


if __name__ == '__main__':
    asyncio.run(main())
