"""
FastAPI HTTP Server for DeepSeek Free Service
Provides REST API endpoints for the main application
"""

import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger

from core import (
    DeepSeekAccount,
    DeepSeekPool,
    LoadBalancer,
    MultiLevelCache,
    SmartQueue,
    RequestPriority,
    AutoRegistrar,
    TempMailProvider,
    SelfHealingManager,
    HealthChecker,
)
from core.utils import load_config, setup_logging


# ==================== PYDANTIC MODELS ====================

class AskRequest(BaseModel):
    """Request model for /ask endpoint"""
    prompt: str = Field(..., min_length=1, max_length=32000)
    user_id: str = Field(default="default")
    context_type: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None
    priority: int = Field(default=5, ge=1, le=15)
    skip_cache: bool = False
    timeout: int = Field(default=120, ge=10, le=600)


class GenerateCommentRequest(BaseModel):
    """Request model for /generate_comment endpoint"""
    post_text: str
    offer_type: str
    style: str = Field(default="casual")
    user_id: str = Field(default="default")


class AnalyzeChannelRequest(BaseModel):
    """Request model for /analyze_channel endpoint"""
    channel_posts: List[str]
    user_id: str = Field(default="default")


class AnalyzeRiskRequest(BaseModel):
    """Request model for /analyze_risk endpoint"""
    offer_theme: str
    promotion_method: str
    user_id: str = Field(default="default")


class AddAccountRequest(BaseModel):
    """Request model for adding account"""
    email: str
    password: str
    proxy: Optional[Dict[str, Any]] = None
    auto_init: bool = True


class RegisterAccountRequest(BaseModel):
    """Request model for auto-registration"""
    count: int = Field(default=1, ge=1, le=10)
    proxy_list: Optional[List[Dict[str, Any]]] = None


class CacheClearRequest(BaseModel):
    """Request model for clearing cache"""
    all: bool = False
    prompt: Optional[str] = None


# ==================== GLOBAL STATE ====================

# Initialize state
pool: Optional[DeepSeekPool] = None
cache: Optional[MultiLevelCache] = None
queue: Optional[SmartQueue] = None
registrar: Optional[AutoRegistrar] = None
healing_manager: Optional[SelfHealingManager] = None
config: Dict[str, Any] = {}


# ==================== LIFESPAN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global pool, cache, queue, registrar, healing_manager, config
    
    # Load config
    config = load_config()
    
    # Setup logging
    log_level = config.get('log_level', 'INFO')
    log_file = config.get('log_file', './logs/deepseek-free.log')
    setup_logging(log_level, log_file)
    
    logger.info("Starting DeepSeek Free Service...")
    
    # Initialize components
    cache_config = config.get('cache', {})
    cache = MultiLevelCache(
        l1_size=cache_config.get('l1_size', 1000),
        l2_path=cache_config.get('l2_path', './data/cache.db'),
        l3_dir=cache_config.get('l3_dir', './data/cache_l3'),
        enable_semantic_search=cache_config.get('semantic_search', True),
    )
    
    pool_config = config.get('pool', {})
    pool = DeepSeekPool(
        load_balancer=LoadBalancer(pool_config.get('strategy', 'least_used')),
        max_concurrent_requests=pool_config.get('max_concurrent', 20),
        replication_factor=pool_config.get('replication_factor', 1),
    )
    
    queue_config = config.get('queue', {})
    queue = SmartQueue(
        max_concurrent=queue_config.get('max_concurrent', 20),
        min_delay=queue_config.get('min_delay', 5.0),
        max_delay=queue_config.get('max_delay', 15.0),
    )
    
    registrar = AutoRegistrar(
        mail_provider=TempMailProvider(config.get('temp_mail_provider', 'temp-mail.org')),
        headless=config.get('headless', True),
    )
    
    healing_manager = SelfHealingManager(
        health_checker=HealthChecker(),
        auto_heal_enabled=config.get('auto_heal', True),
    )
    
    # Load existing accounts from database
    await load_accounts()
    
    # Start health monitoring
    await healing_manager.start_monitoring(pool.accounts)
    
    logger.info("DeepSeek Free Service started")
    
    yield
    
    # Cleanup
    logger.info("Shutting down DeepSeek Free Service...")
    
    await healing_manager.stop_monitoring()
    await pool.close_all()
    await cache.close()
    await registrar.close()
    
    logger.info("DeepSeek Free Service stopped")


# ==================== APP ====================

app = FastAPI(
    title="DeepSeek Free Service",
    description="Industrial-grade free DeepSeek access via browser automation",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "DeepSeek Free",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "pool_accounts": len(pool.accounts) if pool else 0,
        "cache_size": (await cache.l2.get_stats())['size'] if cache else 0,
        "queue_size": len(queue._pending) if queue else 0,
    }


# ==================== MAIN API ====================

@app.post("/ask")
async def ask(request: AskRequest):
    """
    Send prompt to DeepSeek and get response.
    
    Features:
    - Automatic cache lookup
    - Load balancing across accounts
    - Request queuing when at capacity
    """
    start_time = time.time()
    
    # Check cache first
    if not request.skip_cache:
        cached = await cache.get(request.prompt)
        if cached:
            response, is_semantic = cached
            return {
                "success": True,
                "response": response,
                "from_cache": True,
                "semantic_match": is_semantic,
                "response_time": time.time() - start_time,
            }
    
    # Send request
    result = await pool.ask(
        prompt=request.prompt,
        timeout=request.timeout,
    )
    
    # Cache successful response
    if result.get('success') and not request.skip_cache:
        await cache.set(
            prompt=request.prompt,
            response=result['response'],
            response_time=result.get('response_time'),
        )
    
    return result


@app.post("/generate_comment")
async def generate_comment(request: GenerateCommentRequest):
    """
    Generate spam comment for post.
    
    Specialized prompt for comment generation with style adaptation.
    """
    prompt = f"""Ты — активный пользователь Telegram. Напиши естественный комментарий под постом.

Пост: "{request.post_text}"

Тема: {request.offer_type}
Стиль: {request.style}

Требования:
- Комментарий должен выглядеть как от реального человека
- 1-2 предложения
- Без явной рекламы
- Естественный язык

Напиши только комментарий, без пояснений."""
    
    result = await pool.ask(prompt)
    
    return {
        **result,
        "comment": result.get('response', ''),
    }


@app.post("/analyze_channel")
async def analyze_channel(request: AnalyzeChannelRequest):
    """
    Analyze Telegram channel.
    
    Determines theme, tone, audience, and moderation level.
    """
    posts_text = "\n---\n".join(request.channel_posts[:5])
    
    prompt = f"""Проанализируй Telegram-канал по последним постам:

{posts_text}

Определи:
1. Тема канала (крипта/юмор/отношения/бизнес)
2. Тон общения (дерзкий/дружеский/экспертный)
3. Наличие модерации (да/нет/вероятно)
4. Аудитория (возраст, интересы)

Ответь строго в формате JSON."""
    
    result = await pool.ask(prompt)
    
    return {
        **result,
        "analysis": result.get('response', ''),
    }


@app.post("/analyze_risk")
async def analyze_risk(request: AnalyzeRiskRequest):
    """
    Analyze legal risks of promotion scheme.
    
    Returns risk level and potential legal issues.
    """
    prompt = f"""Оцени юридические риски следующей рекламной схемы в Telegram:

Тема оффера: {request.offer_theme}
Способ привлечения: {request.promotion_method}

Ответь строго в формате JSON:
{{
  "risk_level": "зеленый/желтый/красный",
  "possible_articles": ["ст. 159 УК РФ", "..."],
  "warning_text": "Короткое предупреждение",
  "recommendation": "Что добавить для снижения риска"
}}"""
    
    result = await pool.ask(prompt)
    
    return {
        **result,
        "risk_analysis": result.get('response', ''),
    }


@app.post("/batch")
async def batch_ask(
    prompts: List[str] = Body(...),
    max_concurrent: int = Query(default=10, ge=1, le=50),
):
    """
    Process multiple prompts in parallel.
    
    Efficient batch processing with concurrency control.
    """
    results = await pool.batch_ask(prompts, max_concurrent=max_concurrent)
    
    success_count = sum(1 for r in results if r.get('success'))
    
    return {
        "total": len(prompts),
        "successful": success_count,
        "failed": len(prompts) - success_count,
        "results": results,
    }


# ==================== QUEUE API ====================

@app.post("/queue/enqueue")
async def queue_enqueue(request: AskRequest):
    """Add request to queue for async processing"""
    item = await queue.enqueue(
        prompt=request.prompt,
        priority=request.priority,
        context_type=request.context_type,
        context_data=request.context_data,
    )
    
    return {
        "success": True,
        "queue_id": item.id,
        "position": len(queue._pending),
    }


@app.get("/queue/status/{queue_id}")
async def queue_status(queue_id: str):
    """Get queue item status"""
    status = await queue.get_status(queue_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    return status


@app.get("/queue/stats")
async def queue_stats():
    """Get queue statistics"""
    return queue.get_stats()..__dict__


# ==================== ACCOUNT MANAGEMENT ====================

@app.get("/accounts")
async def list_accounts():
    """List all accounts"""
    accounts = []
    
    for acc_id, acc in pool.accounts.items():
        accounts.append(acc.get_stats())
    
    return {
        "total": len(accounts),
        "accounts": accounts,
    }


@app.post("/accounts")
async def add_account(request: AddAccountRequest):
    """Add new account to pool"""
    try:
        account = await pool.add_account(
            account_id=f"acc_{int(time.time())}_{len(pool.accounts)}",
            email=request.email,
            password=request.password,
            proxy=request.proxy,
            auto_init=request.auto_init,
        )
        
        return {
            "success": True,
            "account_id": account.account_id,
            "status": account.status.value,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/accounts/{account_id}")
async def remove_account(account_id: str):
    """Remove account from pool"""
    if account_id not in pool.accounts:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await pool.remove_account(account_id)
    
    return {"success": True, "message": f"Account {account_id} removed"}


@app.post("/accounts/register")
async def register_accounts(request: RegisterAccountRequest):
    """Auto-register new accounts via temp mail"""
    results = await registrar.register_batch(
        count=request.count,
        proxy_list=request.proxy_list,
    )
    
    # Add successful registrations to pool
    for result in results:
        if result.success:
            await pool.add_account(
                account_id=f"auto_{int(time.time())}_{result.email[:8]}",
                email=result.email,
                password=result.password,
            )
    
    return {
        "total": len(results),
        "successful": sum(1 for r in results if r.success),
        "results": [
            {
                "email": r.email,
                "success": r.success,
                "error": r.error,
            }
            for r in results
        ],
    }


# ==================== CACHE MANAGEMENT ====================

@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics"""
    return cache.get_stats()


@app.delete("/cache")
async def clear_cache(request: CacheClearRequest):
    """Clear cache"""
    if request.all:
        count = await cache.clear()
        return {"success": True, "message": f"Cleared {count} entries"}
    
    if request.prompt:
        await cache.delete(request.prompt)
        return {"success": True, "message": "Entry deleted"}
    
    raise HTTPException(status_code=400, detail="Specify 'all' or 'prompt'")


@app.post("/cache/cleanup")
async def cache_cleanup():
    """Cleanup expired cache entries"""
    result = await cache.cleanup()
    return {"success": True, **result}


# ==================== STATUS & MONITORING ====================

@app.get("/status")
async def get_status():
    """Get full system status"""
    pool_stats = pool.get_stats()
    cache_stats = cache.get_stats()
    queue_stats_s = queue.get_stats()
    healing_stats = healing_manager.get_recovery_stats()
    
    return {
        "pool": {
            "total_accounts": pool_stats.total_accounts,
            "active_accounts": pool_stats.active_accounts,
            "rate_limited": pool_stats.rate_limited_accounts,
            "banned": pool_stats.banned_accounts,
            "errors": pool_stats.error_accounts,
            "requests_today": pool_stats.total_requests_today,
            "requests_hour": pool_stats.total_requests_hour,
            "success_rate": pool_stats.success_rate,
            "available_capacity": pool_stats.available_capacity,
        },
        "cache": cache_stats,
        "queue": {
            "pending": queue_stats_s.pending_items,
            "processing": queue_stats_s.processing_items,
            "completed": queue_stats_s.completed_items,
            "failed": queue_stats_s.failed_items,
            "avg_wait_time": queue_stats_s.avg_wait_time,
            "throughput": queue_stats_s.throughput_per_minute,
        },
        "healing": healing_stats,
    }


@app.get("/metrics")
async def get_metrics():
    """Get metrics for monitoring"""
    pool_stats = pool.get_stats()
    
    return {
        "accounts_total": pool_stats.total_accounts,
        "accounts_active": pool_stats.active_accounts,
        "requests_today": pool_stats.total_requests_today,
        "requests_hour": pool_stats.total_requests_hour,
        "success_rate": pool_stats.success_rate,
        "cache_hit_rate": cache.get_stats().get('hit_rate', 0),
        "queue_size": len(queue._pending),
        "available_capacity": pool_stats.available_capacity,
    }


# ==================== HELPERS ====================

async def load_accounts():
    """Load accounts from database"""
    # In production, load from Prisma/SQLite
    # For now, load from config
    accounts_config = config.get('accounts', [])
    
    for acc_config in accounts_config:
        try:
            await pool.add_account(
                account_id=acc_config.get('id', f"loaded_{int(time.time())}"),
                email=acc_config['email'],
                password=acc_config['password'],
                proxy=acc_config.get('proxy'),
            )
        except Exception as e:
            logger.error(f"Failed to load account: {e}")


# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8765,
        reload=True,
    )
