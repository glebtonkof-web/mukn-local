"""
FastAPI HTTP Server for DeepSeek Free Module
HTTP API на порту 8765 для интеграции с МУКН Трафик

МУКН | Трафик - Enterprise AI-powered Telegram Automation Platform
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger

from .account_pool import AccountPool, LoadBalancer
from .cache import MultiLevelCache, CachePrefetcher
from .self_healing import SelfHealingEngine, ProxyRotator, UserAgentRotator, HealthMonitor
from .auto_register import AutoRegisterManager


# Pydantic models
class AskRequest(BaseModel):
    """Запрос к AI"""
    prompt: str = Field(..., description="Текст запроса")
    timeout: int = Field(120, description="Таймаут в секундах")
    replication: Optional[int] = Field(None, description="Количество реплик")
    priority: int = Field(0, description="Приоритет запроса")


class GenerateCommentRequest(BaseModel):
    """Генерация комментария"""
    post_content: str = Field(..., description="Содержимое поста")
    offer_info: str = Field(..., description="Информация об оффере")
    niche: str = Field("lifestyle", description="Ниша")
    style: str = Field("casual", description="Стиль")


class AnalyzeRiskRequest(BaseModel):
    """Анализ юридических рисков"""
    scheme_description: str = Field(..., description="Описание схемы")


class AnalyzeChannelRequest(BaseModel):
    """Анализ канала"""
    posts: List[str] = Field(..., description="Список постов")


class AddAccountRequest(BaseModel):
    """Добавление аккаунта"""
    email: str = Field(..., description="Email")
    password: str = Field(..., description="Пароль")
    proxy: Optional[Dict[str, Any]] = Field(None, description="Прокси")


class ApiResponse(BaseModel):
    """Стандартный ответ API"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    response_time: float


# Global state
pool: Optional[AccountPool] = None
cache: Optional[MultiLevelCache] = None
load_balancer: Optional[LoadBalancer] = None
healing_engine: Optional[SelfHealingEngine] = None
auto_register: Optional[AutoRegisterManager] = None
health_monitor: Optional[HealthMonitor] = None
prefetcher: Optional[CachePrefetcher] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    global pool, cache, load_balancer, healing_engine, auto_register, health_monitor, prefetcher
    
    logger.info("Starting DeepSeek Free Module...")
    
    # Инициализация компонентов
    cache = MultiLevelCache(
        semantic_enabled=True,
        semantic_threshold=0.95
    )
    await cache.initialize()
    
    pool = AccountPool(
        db_path="data/accounts.db",
        max_parallel_browsers=20,
        replication_factor=3,
        rotation_strategy="least_requests"
    )
    pool.load_accounts()
    
    # Инициализация аккаунтов (первые 5)
    await pool.initialize_accounts(max_parallel=5)
    
    # Proxy и UA ротаторы
    proxy_rotator = ProxyRotator(proxy_file="proxies.txt")
    ua_rotator = UserAgentRotator(user_agent_file="user_agents.txt")
    
    # Self-healing
    healing_engine = SelfHealingEngine(
        proxy_rotator=proxy_rotator,
        ua_rotator=ua_rotator,
        health_check_interval=30
    )
    healing_engine.set_accounts(pool.accounts)
    
    # Запуск self-healing в фоне
    asyncio.create_task(healing_engine.start())
    
    # Load balancer
    load_balancer = LoadBalancer(pool)
    await load_balancer.start(worker_count=5)
    
    # Auto-register
    auto_register = AutoRegisterManager(
        pool=pool,
        min_accounts=5,
        max_accounts=50
    )
    
    # Health monitor
    health_monitor = HealthMonitor(pool, cache, healing_engine)
    
    # Prefetcher
    prefetcher = CachePrefetcher(cache)
    
    logger.info("DeepSeek Free Module started successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down DeepSeek Free Module...")
    
    if load_balancer:
        await load_balancer.stop()
    
    if healing_engine:
        await healing_engine.stop()
    
    if pool:
        await pool.close_all()
    
    logger.info("DeepSeek Free Module stopped")


# Create app
app = FastAPI(
    title="DeepSeek Free Module",
    description="Self-healing, multi-threaded module for unlimited free DeepSeek access",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== MAIN ENDPOINTS ====================

@app.post("/ask", response_model=ApiResponse)
async def ask(request: AskRequest):
    """
    Универсальный метод для любых задач.
    Отправляет запрос через пул аккаунтов с репликацией.
    """
    start_time = time.time()
    
    try:
        # Сначала проверяем кэш
        cached = await cache.get(request.prompt)
        if cached:
            return ApiResponse(
                success=True,
                data={
                    'response': cached,
                    'from_cache': True
                },
                response_time=time.time() - start_time
            )
        
        # Отправляем через пул
        result = await pool.ask(
            prompt=request.prompt,
            replication=request.replication,
            timeout=request.timeout
        )
        
        # Сохраняем в кэш при успехе
        if result.get('success') and result.get('response'):
            await cache.set(request.prompt, result['response'])
        
        # Записываем для prefetcher
        if prefetcher:
            prefetcher.record_query(request.prompt)
        
        return ApiResponse(
            success=result.get('success', False),
            data=result,
            error=result.get('error'),
            response_time=time.time() - start_time
        )
    
    except Exception as e:
        logger.error(f"/ask error: {e}")
        return ApiResponse(
            success=False,
            error=str(e),
            response_time=time.time() - start_time
        )


@app.post("/generate_comment", response_model=ApiResponse)
async def generate_comment(request: GenerateCommentRequest):
    """
    Генерация спам-комментария под пост.
    Анализирует стиль и адаптирует комментарий.
    """
    start_time = time.time()
    
    # Формирование промпта
    prompt = f"""Создай комментарий для поста в Telegram канале.

Пост:
{request.post_content}

Оффер/продукт:
{request.offer_info}

Ниша: {request.niche}
Стиль: {request.style}

Требования:
- Естественный, живой язык
- Не более 50 слов
- Вовлекающий, вызывает желание узнать больше
- Умеренное использование эмодзи (2-3 шт)
- Соответствует стилю ниши

Верни только текст комментария."""

    try:
        result = await pool.ask(prompt)
        
        return ApiResponse(
            success=result.get('success', False),
            data={
                'comment': result.get('response'),
                'niche': request.niche,
                'style': request.style
            },
            error=result.get('error'),
            response_time=time.time() - start_time
        )
    
    except Exception as e:
        return ApiResponse(
            success=False,
            error=str(e),
            response_time=time.time() - start_time
        )


@app.post("/analyze_risk", response_model=ApiResponse)
async def analyze_risk(request: AnalyzeRiskRequest):
    """
    Анализ юридических рисков схемы.
    Возвращает JSON с оценкой рисков.
    """
    start_time = time.time()
    
    prompt = f"""Проанализируй юридические риски следующей схемы заработка.
Верни результат в формате JSON с полями:
- risk_level: "low" | "medium" | "high" | "critical"
- legal_issues: список юридических проблем
- recommendations: рекомендации по снижению рисков
- summary: краткое резюме

Схема:
{request.scheme_description}

Верни только валидный JSON."""

    try:
        result = await pool.ask(prompt)
        
        response_data = {
            'analysis': result.get('response'),
            'raw': result.get('response')
        }
        
        # Попытка распарсить JSON
        try:
            if result.get('response'):
                # Извлечение JSON из ответа
                response_text = result['response']
                import re
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    response_data['parsed'] = json.loads(json_match.group())
        except:
            pass
        
        return ApiResponse(
            success=result.get('success', False),
            data=response_data,
            error=result.get('error'),
            response_time=time.time() - start_time
        )
    
    except Exception as e:
        return ApiResponse(
            success=False,
            error=str(e),
            response_time=time.time() - start_time
        )


@app.post("/analyze_channel", response_model=ApiResponse)
async def analyze_channel(request: AnalyzeChannelRequest):
    """
    Анализ канала по постам.
    Возвращает JSON с характеристиками канала.
    """
    start_time = time.time()
    
    posts_text = "\n\n---\n\n".join(request.posts[:10])  # Максимум 10 постов
    
    prompt = f"""Проанализируй Telegram канал по следующим постам.
Верни результат в формате JSON с полями:
- niche: ниша канала
- audience_type: тип аудитории
- engagement_level: "low" | "medium" | "high"
- content_style: стиль контента
- posting_frequency: оценка частоты постинга
- monetization_potential: потенциал монетизации (1-10)
- recommendations: рекомендации для работы с каналом
- summary: краткое резюме

Посты:
{posts_text}

Верни только валидный JSON."""

    try:
        result = await pool.ask(prompt)
        
        return ApiResponse(
            success=result.get('success', False),
            data={
                'analysis': result.get('response'),
                'posts_analyzed': len(request.posts)
            },
            error=result.get('error'),
            response_time=time.time() - start_time
        )
    
    except Exception as e:
        return ApiResponse(
            success=False,
            error=str(e),
            response_time=time.time() - start_time
        )


# ==================== ACCOUNT MANAGEMENT ====================

@app.post("/accounts/add", response_model=ApiResponse)
async def add_account(request: AddAccountRequest):
    """Добавление аккаунта в пул"""
    try:
        account_id = pool.add_account(
            email=request.email,
            password=request.password,
            proxy=request.proxy
        )
        
        if account_id:
            # Инициализация нового аккаунта
            account = pool.accounts[account_id]
            init_success = await account.initialize()
            
            return ApiResponse(
                success=True,
                data={
                    'account_id': account_id,
                    'initialized': init_success,
                    'status': account.status.value
                },
                response_time=0
            )
        
        return ApiResponse(
            success=False,
            error="Failed to add account",
            response_time=0
        )
    
    except Exception as e:
        return ApiResponse(
            success=False,
            error=str(e),
            response_time=0
        )


@app.get("/accounts/list")
async def list_accounts():
    """Список всех аккаунтов"""
    accounts = []
    
    for account in pool.accounts.values():
        accounts.append(account.get_stats())
    
    return {
        'total': len(accounts),
        'accounts': accounts
    }


@app.get("/accounts/stats")
async def accounts_stats():
    """Статистика пула аккаунтов"""
    return pool.get_stats()


@app.delete("/accounts/{account_id}")
async def remove_account(account_id: str):
    """Удаление аккаунта"""
    success = pool.remove_account(account_id)
    
    return {
        'success': success,
        'account_id': account_id
    }


@app.post("/accounts/auto-register")
async def auto_register_accounts(count: int = 5):
    """Автоматическая регистрация новых аккаунтов"""
    registered = await auto_register.register_batch(count)
    
    return {
        'success': True,
        'registered': registered,
        'requested': count
    }


# ==================== CACHE MANAGEMENT ====================

@app.get("/cache/stats")
async def cache_stats():
    """Статистика кэша"""
    return cache.get_stats()


@app.delete("/cache/clear")
async def clear_cache():
    """Очистка кэша"""
    await cache.clear()
    
    return {
        'success': True,
        'message': 'Cache cleared'
    }


@app.post("/cache/prefetch")
async def prefetch_cache(queries: List[str]):
    """Прогрев кэша предсказанными запросами"""
    cache.prefetch_warmup(queries)
    
    return {
        'success': True,
        'queries_queued': len(queries)
    }


# ==================== HEALTH & MONITORING ====================

@app.get("/health")
async def health_check():
    """Проверка здоровья системы"""
    return await health_monitor.check_all()


@app.get("/health/history")
async def health_history(limit: int = 10):
    """История проверок здоровья"""
    return health_monitor.get_history(limit)


@app.get("/stats")
async def full_stats():
    """Полная статистика системы"""
    return {
        'timestamp': datetime.now().isoformat(),
        'pool': pool.get_stats(),
        'cache': cache.get_stats(),
        'self_healing': healing_engine.get_recovery_stats() if healing_engine else None,
        'load_balancer': {
            'queue_size': load_balancer.get_queue_size() if load_balancer else 0
        }
    }


# ==================== PROXY & USER-AGENT ====================

@app.get("/proxy/stats")
async def proxy_stats():
    """Статистика прокси"""
    if healing_engine:
        return healing_engine.proxy_rotator.get_stats()
    return {'error': 'Healing engine not initialized'}


@app.post("/proxy/add")
async def add_proxy(proxy: Dict[str, Any]):
    """Добавление прокси"""
    if healing_engine:
        healing_engine.proxy_rotator.proxies.append(proxy)
        return {'success': True}
    return {'success': False, 'error': 'Healing engine not initialized'}


@app.get("/user-agent/stats")
async def user_agent_stats():
    """Статистика User-Agent"""
    if healing_engine:
        return healing_engine.ua_rotator.get_stats()
    return {'error': 'Healing engine not initialized'}


# ==================== CONFIG ====================

@app.get("/config")
async def get_config():
    """Текущая конфигурация"""
    return {
        'max_parallel_browsers': pool.max_parallel_browsers,
        'replication_factor': pool.replication_factor,
        'rotation_strategy': pool.rotation_strategy,
        'semantic_search_enabled': cache.semantic_enabled,
        'semantic_threshold': cache.semantic_threshold
    }


# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            'success': False,
            'error': str(exc),
            'timestamp': datetime.now().isoformat()
        }
    )


# Main entry point
def run_server():
    """Запуск HTTP сервера"""
    import uvicorn
    
    uvicorn.run(
        "core.server:app",
        host="0.0.0.0",
        port=8765,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    run_server()
