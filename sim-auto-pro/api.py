"""
SIM Auto-Registration PRO - API Server
МУКН Enterprise AI Automation Platform

REST API для интеграции с Next.js приложением:
- Управление регистрациями
- Мониторинг статуса
- Получение отчетов
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import SIM_CARDS, SERVICES, SIMSlot, ACCOUNTS_DB, LOGS_DIR
from services import get_service
from services.base import RegistrationStatus
from adb_sms import SMSManager
from scheduler import SIMAutoRegistrationScheduler

# ============================================================================
# PYDANTIC МОДЕЛИ
# ============================================================================

class RegistrationRequest(BaseModel):
    service: str
    sim_slot: int = 0  # 0 или 1
    priority: float = 1.0


class RegistrationResponse(BaseModel):
    success: bool
    message: str
    account: Optional[Dict] = None
    error: Optional[str] = None


class StatusResponse(BaseModel):
    is_running: bool
    current_task: str
    total_registrations: int
    successful_registrations: int
    failed_registrations: int
    queue_size: int
    started_at: Optional[str] = None
    last_registration: Optional[str] = None


class ServiceInfo(BaseModel):
    name: str
    display_name: str
    category: str
    requires_proxy: bool
    requires_sms: bool


class SIMInfo(BaseModel):
    slot: int
    phone_number: str
    is_active: bool
    registrations_today: int
    daily_limit: int


# ============================================================================
# FASTAPI ПРИЛОЖЕНИЕ
# ============================================================================

app = FastAPI(
    title="SIM Auto-Registration PRO API",
    description="API для управления автоматической регистрацией аккаунтов",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальные переменные
scheduler: Optional[SIMAutoRegistrationScheduler] = None
sms_manager: Optional[SMSManager] = None


@app.on_event("startup")
async def startup():
    """Инициализация при запуске"""
    global sms_manager
    
    # Инициализация SMS менеджера
    sms_manager = SMSManager()
    await sms_manager.initialize()


# ============================================================================
# API ЭНДПОИНТЫ
# ============================================================================

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": "SIM Auto-Registration PRO",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Получение статуса системы"""
    state_file = Path(LOGS_DIR) / "scheduler_state.json"
    
    if state_file.exists():
        with open(state_file, 'r') as f:
            state = json.load(f)
        
        return StatusResponse(
            is_running=state.get("is_running", False),
            current_task=state.get("current_task", ""),
            total_registrations=state.get("total_registrations", 0),
            successful_registrations=state.get("successful_registrations", 0),
            failed_registrations=state.get("failed_registrations", 0),
            queue_size=0,  # TODO: Implement queue tracking
            started_at=state.get("started_at"),
            last_registration=state.get("last_registration")
        )
    
    return StatusResponse(
        is_running=False,
        current_task="",
        total_registrations=0,
        successful_registrations=0,
        failed_registrations=0,
        queue_size=0
    )


@app.get("/services", response_model=List[ServiceInfo])
async def get_services():
    """Получение списка доступных сервисов"""
    services = []
    
    for name, config in SERVICES.items():
        services.append(ServiceInfo(
            name=name,
            display_name=config.display_name,
            category=config.category.value,
            requires_proxy=config.requires_proxy,
            requires_sms=config.requires_sms
        ))
    
    return services


@app.get("/sims", response_model=List[SIMInfo])
async def get_sims():
    """Получение информации о SIM-картах"""
    sims = []
    
    for slot, config in SIM_CARDS.items():
        sims.append(SIMInfo(
            slot=slot.value,
            phone_number=f"+7{config.phone_number}",
            is_active=config.is_active,
            registrations_today=config.registrations_today,
            daily_limit=config.daily_limit
        ))
    
    return sims


@app.post("/register", response_model=RegistrationResponse)
async def register_account(request: RegistrationRequest, background_tasks: BackgroundTasks):
    """
    Регистрация аккаунта
    
    Запускает регистрацию в фоновом режиме и возвращает результат
    """
    # Проверяем сервис
    if request.service not in SERVICES:
        raise HTTPException(status_code=400, detail=f"Unknown service: {request.service}")
    
    # Проверяем SIM
    sim_slot = SIMSlot(request.sim_slot)
    if sim_slot not in SIM_CARDS:
        raise HTTPException(status_code=400, detail=f"Invalid SIM slot: {request.sim_slot}")
    
    sim_config = SIM_CARDS[sim_slot]
    if not sim_config.is_active:
        raise HTTPException(status_code=400, detail=f"SIM {sim_slot.name} is not active")
    
    if sim_config.registrations_today >= sim_config.daily_limit:
        raise HTTPException(status_code=400, detail=f"SIM {sim_slot.name} reached daily limit")
    
    # Регистрируем
    try:
        service = get_service(
            service_name=request.service,
            sim_slot=sim_slot,
            sms_manager=sms_manager
        )
        
        result = await service.register()
        
        if result.status == RegistrationStatus.SUCCESS:
            sim_config.registrations_today += 1
            
            return RegistrationResponse(
                success=True,
                message="Registration successful",
                account=result.account.to_dict() if result.account else None
            )
        else:
            return RegistrationResponse(
                success=False,
                message="Registration failed",
                error=result.error_message
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/accounts")
async def get_accounts(
    service: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Получение списка зарегистрированных аккаунтов"""
    if not os.path.exists(ACCOUNTS_DB):
        return {"accounts": [], "total": 0}
    
    with open(ACCOUNTS_DB, 'r', encoding='utf-8') as f:
        accounts = json.load(f)
    
    # Фильтрация
    if service:
        accounts = [a for a in accounts if a.get('service') == service]
    
    total = len(accounts)
    accounts = accounts[offset:offset + limit]
    
    return {
        "accounts": accounts,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@app.get("/accounts/{username}")
async def get_account(username: str):
    """Получение информации об аккаунте"""
    if not os.path.exists(ACCOUNTS_DB):
        raise HTTPException(status_code=404, detail="Account not found")
    
    with open(ACCOUNTS_DB, 'r', encoding='utf-8') as f:
        accounts = json.load(f)
    
    for account in accounts:
        if account.get('username') == username:
            return account
    
    raise HTTPException(status_code=404, detail="Account not found")


@app.delete("/accounts/{username}")
async def delete_account(username: str):
    """Удаление аккаунта из базы"""
    if not os.path.exists(ACCOUNTS_DB):
        raise HTTPException(status_code=404, detail="Account not found")
    
    with open(ACCOUNTS_DB, 'r', encoding='utf-8') as f:
        accounts = json.load(f)
    
    for i, account in enumerate(accounts):
        if account.get('username') == username:
            accounts.pop(i)
            
            with open(ACCOUNTS_DB, 'w', encoding='utf-8') as f:
                json.dump(accounts, f, ensure_ascii=False, indent=2)
            
            return {"message": f"Account {username} deleted"}
    
    raise HTTPException(status_code=404, detail="Account not found")


@app.get("/health")
async def health_check():
    """Проверка здоровья системы"""
    health = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {}
    }
    
    # Проверка SMS менеджера
    if sms_manager:
        sms_health = await sms_manager.health_check()
        health["components"]["sms_manager"] = sms_health
    else:
        health["components"]["sms_manager"] = {"status": "not_initialized"}
    
    # Проверка аккаунтов
    if os.path.exists(ACCOUNTS_DB):
        with open(ACCOUNTS_DB, 'r') as f:
            accounts = json.load(f)
        health["components"]["accounts_db"] = {
            "status": "ok",
            "count": len(accounts)
        }
    else:
        health["components"]["accounts_db"] = {"status": "empty"}
    
    return health


@app.post("/start")
async def start_scheduler(background_tasks: BackgroundTasks):
    """Запуск планировщика в фоновом режиме"""
    global scheduler
    
    if scheduler and scheduler.state.is_running:
        return {"message": "Scheduler already running"}
    
    scheduler = SIMAutoRegistrationScheduler()
    background_tasks.add_task(run_scheduler)
    
    return {"message": "Scheduler started"}


async def run_scheduler():
    """Запуск планировщика (для background task)"""
    global scheduler
    await scheduler.run()


@app.post("/stop")
async def stop_scheduler():
    """Остановка планировщика"""
    global scheduler
    
    if scheduler:
        scheduler._shutdown_requested = True
        await scheduler.shutdown()
        return {"message": "Scheduler stopped"}
    
    return {"message": "Scheduler not running"}


# ============================================================================
# ЗАПУСК
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
