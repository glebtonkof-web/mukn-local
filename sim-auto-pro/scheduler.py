"""
SIM Auto-Registration PRO - Main Scheduler
МУКН Enterprise AI Automation Platform

Главный оркестратор для 24/365 автономной работы:
- Регистрация аккаунтов
- Прогрев аккаунтов
- Монетизация
- Мониторинг и отчетность
"""

import asyncio
import json
import logging
import os
import random
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass

# Добавляем путь к модулям
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    SIM_CARDS, SERVICES, SIMSlot, ServiceConfig,
    ACCOUNTS_DB, LOGS_DIR, WARMUP, MONETIZATION
)
from services import get_service
from services.base import RegistrationStatus
from warmup import WarmupManager
from monetization import MonetizationManager
from adb_sms import SMSManager
from utils import async_human_delay

# Настройка логирования
def setup_logging():
    log_dir = Path(LOGS_DIR)
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_file = log_dir / f"sim_auto_reg_{datetime.now().strftime('%Y%m%d')}.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)


logger = setup_logging()


# ============================================================================
# МОДЕЛИ ДАННЫХ
# ============================================================================

@dataclass
class SchedulerState:
    """Состояние планировщика"""
    is_running: bool = False
    current_task: str = ""
    last_registration: Optional[datetime] = None
    last_warmup: Optional[datetime] = None
    last_monetization: Optional[datetime] = None
    
    # Статистика
    total_registrations: int = 0
    successful_registrations: int = 0
    failed_registrations: int = 0
    
    total_warmup_sessions: int = 0
    total_monetization_actions: int = 0
    
    started_at: Optional[datetime] = None


# ============================================================================
# ГЛАВНЫЙ ОРКЕСТРАТОР
# ============================================================================

class SIMAutoRegistrationScheduler:
    """
    Главный планировщик для SIM Auto-Registration PRO
    
    Управляет:
    - Регистрацией аккаунтов на всех сервисах
    - Прогревом аккаунтов
    - Монетизацией
    - Ротацией SIM-карт
    """
    
    def __init__(self):
        self.state = SchedulerState()
        self.sms_manager: Optional[SMSManager] = None
        self.warmup_manager: Optional[WarmupManager] = None
        self.monetization_manager: Optional[MonetizationManager] = None
        
        # Очереди
        self.registration_queue: List[Dict] = []
        
        # Флаги
        self._shutdown_requested = False
        
        # Настройка обработчиков сигналов
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Обработчик сигналов для graceful shutdown"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self._shutdown_requested = True
    
    async def initialize(self) -> bool:
        """Инициализация всех компонентов"""
        logger.info("=" * 60)
        logger.info("SIM Auto-Registration PRO - Initializing...")
        logger.info("=" * 60)
        
        try:
            # Инициализация SMS менеджера
            logger.info("Initializing SMS Manager...")
            self.sms_manager = SMSManager()
            if not await self.sms_manager.initialize():
                logger.warning("SMS Manager initialization failed - SMS verification may not work")
            else:
                logger.info("SMS Manager initialized successfully")
            
            # Инициализация менеджера прогрева
            logger.info("Initializing Warmup Manager...")
            self.warmup_manager = WarmupManager()
            await self.warmup_manager.load_progress()
            logger.info("Warmup Manager initialized")
            
            # Инициализация менеджера монетизации
            logger.info("Initializing Monetization Manager...")
            self.monetization_manager = MonetizationManager()
            await self.monetization_manager.load_results()
            logger.info("Monetization Manager initialized")
            
            # Загрузка существующих аккаунтов
            await self._load_accounts()
            
            # Формирование очереди регистрации
            await self._build_registration_queue()
            
            self.state.started_at = datetime.now()
            self.state.is_running = True
            
            logger.info("=" * 60)
            logger.info("Initialization complete!")
            logger.info("=" * 60)
            
            return True
            
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            return False
    
    async def _load_accounts(self):
        """Загрузка существующих аккаунтов"""
        if os.path.exists(ACCOUNTS_DB):
            with open(ACCOUNTS_DB, 'r', encoding='utf-8') as f:
                accounts = json.load(f)
            logger.info(f"Loaded {len(accounts)} existing accounts")
            
            self.state.total_registrations = len(accounts)
            self.state.successful_registrations = len([a for a in accounts if a.get('is_active')])
    
    async def _build_registration_queue(self):
        """Формирование очереди регистрации"""
        self.registration_queue = []
        
        for service_name, service_config in SERVICES.items():
            for sim_slot in [SIMSlot.SIM_0, SIMSlot.SIM_1]:
                sim_config = SIM_CARDS.get(sim_slot)
                
                if not sim_config or not sim_config.is_active:
                    continue
                
                # Проверяем лимит регистраций
                if sim_config.registrations_today >= sim_config.daily_limit:
                    logger.info(f"SIM {sim_slot.name} reached daily limit")
                    continue
                
                # Добавляем в очередь
                self.registration_queue.append({
                    "service": service_name,
                    "sim_slot": sim_slot,
                    "priority": self._calculate_priority(service_name, sim_slot)
                })
        
        # Сортируем по приоритету
        self.registration_queue.sort(key=lambda x: x["priority"], reverse=True)
        
        logger.info(f"Registration queue: {len(self.registration_queue)} items")
    
    def _calculate_priority(self, service_name: str, sim_slot: SIMSlot) -> float:
        """Расчет приоритета регистрации"""
        priority = 1.0
        
        # Приоритет по категории сервиса
        service_config = SERVICES.get(service_name)
        if service_config:
            category_priorities = {
                "video": 1.5,
                "social": 1.3,
                "messaging": 1.2,
                "streaming": 1.1,
                "professional": 1.0,
                "dating": 0.9,
                "adult": 0.8,
                "music": 0.7
            }
            priority *= category_priorities.get(service_config.category.value, 1.0)
        
        # Случайный фактор для разнообразия
        priority *= random.uniform(0.8, 1.2)
        
        return priority
    
    # ========================================================================
    # ОСНОВНЫЕ МЕТОДЫ
    # ========================================================================
    
    async def register_account(self, service_name: str, sim_slot: SIMSlot) -> Dict:
        """
        Регистрация аккаунта
        
        Args:
            service_name: Название сервиса
            sim_slot: Слот SIM-карты
            
        Returns:
            Результат регистрации
        """
        logger.info(f"Starting registration: {service_name} on {sim_slot.name}")
        
        result = {
            "service": service_name,
            "sim_slot": sim_slot.name,
            "started_at": datetime.now().isoformat(),
            "success": False,
            "account": None,
            "error": None
        }
        
        try:
            # Получаем сервис регистрации
            service = get_service(
                service_name=service_name,
                sim_slot=sim_slot,
                sms_manager=self.sms_manager
            )
            
            # Выполняем регистрацию
            registration_result = await service.register()
            
            result["status"] = registration_result.status.value
            result["duration_seconds"] = registration_result.duration_seconds
            
            if registration_result.status == RegistrationStatus.SUCCESS:
                result["success"] = True
                result["account"] = registration_result.account.to_dict() if registration_result.account else None
                
                # Добавляем в прогрев
                if result["account"]:
                    await self.warmup_manager.add_account_to_warmup(result["account"])
                
                self.state.successful_registrations += 1
                logger.info(f"Registration successful: {service_name}")
                
            else:
                result["error"] = registration_result.error_message
                self.state.failed_registrations += 1
                logger.warning(f"Registration failed: {service_name} - {registration_result.error_message}")
            
            self.state.total_registrations += 1
            self.state.last_registration = datetime.now()
            
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Registration error: {service_name} - {e}")
        
        return result
    
    async def run_warmup_cycle(self):
        """Запуск цикла прогрева"""
        if not WARMUP.enabled:
            return
        
        logger.info("Starting warmup cycle...")
        self.state.current_task = "warmup"
        
        try:
            await self.warmup_manager.run_warmup_cycle()
            self.state.last_warmup = datetime.now()
            self.state.total_warmup_sessions += 1
            
        except Exception as e:
            logger.error(f"Warmup cycle error: {e}")
        
        self.state.current_task = ""
    
    async def run_monetization_cycle(self):
        """Запуск цикла монетизации"""
        if not MONETIZATION.enabled:
            return
        
        logger.info("Starting monetization cycle...")
        self.state.current_task = "monetization"
        
        try:
            await self.monetization_manager.run_monetization_cycle()
            self.state.last_monetization = datetime.now()
            self.state.total_monetization_actions += 1
            
        except Exception as e:
            logger.error(f"Monetization cycle error: {e}")
        
        self.state.current_task = ""
    
    # ========================================================================
    # ГЛАВНЫЙ ЦИКЛ
    # ========================================================================
    
    async def run_main_loop(self):
        """Главный цикл работы 24/365"""
        logger.info("Starting main loop (24/365 mode)...")
        
        while not self._shutdown_requested:
            try:
                # Текущее время
                now = datetime.now()
                hour = now.hour
                
                logger.info(f"\n{'='*60}")
                logger.info(f"Scheduler tick: {now.strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"{'='*60}")
                
                # 1. Регистрация аккаунтов (в активные часы)
                if 8 <= hour <= 23 and self.registration_queue:
                    await self._process_registration_queue()
                
                # 2. Прогрев аккаунтов (в активные часы)
                if WARMUP.active_hours_start <= hour <= WARMUP.active_hours_end:
                    await self.run_warmup_cycle()
                
                # 3. Монетизация (раз в несколько часов)
                if hour % 4 == 0:  # Каждые 4 часа
                    await self.run_monetization_cycle()
                
                # 4. Сохранение состояния
                await self._save_state()
                
                # 5. Отчет о статусе
                self._log_status()
                
                # 6. Пауза до следующего цикла (5 минут)
                logger.info("Waiting for next cycle (5 minutes)...")
                for _ in range(300):  # 5 минут с проверкой shutdown
                    if self._shutdown_requested:
                        break
                    await asyncio.sleep(1)
                
                # 7. Обновление очереди регистрации (новый день)
                if now.hour == 0 and now.minute < 5:
                    await self._reset_daily_limits()
                    await self._build_registration_queue()
                
            except Exception as e:
                logger.error(f"Main loop error: {e}")
                await asyncio.sleep(60)
        
        logger.info("Main loop stopped")
    
    async def _process_registration_queue(self):
        """Обработка очереди регистрации"""
        if not self.registration_queue:
            return
        
        # Берем следующий элемент
        queue_item = self.registration_queue.pop(0)
        
        service_name = queue_item["service"]
        sim_slot = queue_item["sim_slot"]
        
        # Проверяем cooldown для SIM
        sim_config = SIM_CARDS.get(sim_slot)
        service_config = SERVICES.get(service_name)
        
        if sim_config.last_registration:
            cooldown = timedelta(minutes=service_config.cooldown_minutes) if service_config else timedelta(minutes=30)
            if datetime.now() - datetime.fromtimestamp(sim_config.last_registration) < cooldown:
                logger.info(f"SIM {sim_slot.name} in cooldown, skipping...")
                return
        
        # Регистрируем
        result = await self.register_account(service_name, sim_slot)
        
        # Обновляем статистику SIM
        if result["success"]:
            sim_config.registrations_today += 1
            sim_config.last_registration = datetime.now().timestamp()
        
        # Пауза между регистрациями
        await async_human_delay(30.0, 60.0)
    
    async def _reset_daily_limits(self):
        """Сброс дневных лимитов"""
        for sim_config in SIM_CARDS.values():
            sim_config.registrations_today = 0
        logger.info("Daily limits reset")
    
    async def _save_state(self):
        """Сохранение состояния"""
        state_file = Path(LOGS_DIR) / "scheduler_state.json"
        
        state_data = {
            "is_running": self.state.is_running,
            "current_task": self.state.current_task,
            "last_registration": self.state.last_registration.isoformat() if self.state.last_registration else None,
            "last_warmup": self.state.last_warmup.isoformat() if self.state.last_warmup else None,
            "last_monetization": self.state.last_monetization.isoformat() if self.state.last_monetization else None,
            "total_registrations": self.state.total_registrations,
            "successful_registrations": self.state.successful_registrations,
            "failed_registrations": self.state.failed_registrations,
            "started_at": self.state.started_at.isoformat() if self.state.started_at else None
        }
        
        with open(state_file, 'w') as f:
            json.dump(state_data, f, indent=2)
    
    def _log_status(self):
        """Вывод статуса в лог"""
        logger.info("\n" + "=" * 40)
        logger.info("SCHEDULER STATUS")
        logger.info("=" * 40)
        logger.info(f"Running since: {self.state.started_at}")
        logger.info(f"Total registrations: {self.state.total_registrations}")
        logger.info(f"Successful: {self.state.successful_registrations}")
        logger.info(f"Failed: {self.state.failed_registrations}")
        logger.info(f"Warmup sessions: {self.state.total_warmup_sessions}")
        logger.info(f"Monetization actions: {self.state.total_monetization_actions}")
        logger.info(f"Queue size: {len(self.registration_queue)}")
        logger.info("=" * 40 + "\n")
    
    async def shutdown(self):
        """Graceful shutdown"""
        logger.info("Shutting down...")
        
        self.state.is_running = False
        await self._save_state()
        
        logger.info("Shutdown complete")
    
    # ========================================================================
    # ТОЧКА ВХОДА
    # ========================================================================
    
    async def run(self):
        """Запуск планировщика"""
        try:
            if not await self.initialize():
                logger.error("Initialization failed, exiting")
                return 1
            
            await self.run_main_loop()
            
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            return 1
        
        finally:
            await self.shutdown()
        
        return 0


# ============================================================================
# CLI
# ============================================================================

async def main():
    """Точка входа CLI"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SIM Auto-Registration PRO")
    parser.add_argument("--once", action="store_true", help="Run one registration cycle and exit")
    parser.add_argument("--service", type=str, help="Register specific service only")
    parser.add_argument("--sim", type=int, choices=[0, 1], help="Use specific SIM slot")
    parser.add_argument("--status", action="store_true", help="Show current status")
    
    args = parser.parse_args()
    
    scheduler = SIMAutoRegistrationScheduler()
    
    if args.status:
        # Показать статус
        state_file = Path(LOGS_DIR) / "scheduler_state.json"
        if state_file.exists():
            with open(state_file, 'r') as f:
                state = json.load(f)
            print(json.dumps(state, indent=2))
        else:
            print("No state file found")
        return 0
    
    if args.once:
        # Один цикл регистрации
        if not await scheduler.initialize():
            return 1
        
        if args.service and args.sim is not None:
            sim_slot = SIMSlot(args.sim)
            result = await scheduler.register_account(args.service, sim_slot)
            print(json.dumps(result, indent=2, default=str))
        else:
            await scheduler._process_registration_queue()
        
        await scheduler.shutdown()
        return 0
    
    # Полный режим 24/365
    return await scheduler.run()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)


# ============================================================================
# ЭКСПОРТ
# ============================================================================

__all__ = [
    'SIMAutoRegistrationScheduler',
    'SchedulerState',
]
