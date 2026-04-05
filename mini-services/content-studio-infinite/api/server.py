"""
Content Studio Infinite - FastAPI Server
HTTP API для управления генерацией контента

МУКН | Трафик - Enterprise AI-powered Content Generation Platform
"""

import asyncio
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from loguru import logger
import uvicorn

from core.types import (
    GenerateRequest, GenerateResponse, TaskStatusResponse,
    ProviderStatusResponse, StatsResponse
)
from core.infinite_generator import InfiniteGenerator


# API Models
class TaskCreateRequest(BaseModel):
    prompt: str
    duration: float = 10.0
    aspect_ratio: str = "9:16"
    provider: Optional[str] = None
    priority: str = "normal"


class BatchTaskRequest(BaseModel):
    prompts: List[str]
    duration: float = 10.0
    aspect_ratio: str = "9:16"
    provider: Optional[str] = None


class PromptGenerateRequest(BaseModel):
    count: int = 10
    template: Optional[str] = None
    theme: Optional[str] = None


class StitchRequest(BaseModel):
    video_paths: List[str]
    transition: str = "fade"
    audio_path: Optional[str] = None


class RegisterRequest(BaseModel):
    provider: str


# FastAPI App
app = FastAPI(
    title="Content Studio Infinite",
    description="Бесконечная генерация видео через 10+ бесплатных провайдеров",
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

# Global generator instance
generator: Optional[InfiniteGenerator] = None


@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    global generator
    
    logger.info("Starting Content Studio Infinite API...")
    
    generator = InfiniteGenerator(
        db_path="./data/content_studio.db",
        output_dir="./data/videos/raw",
        headless=True,
        parallel_workers=5,
        min_accounts_per_provider=3,
        max_accounts_per_provider=20
    )
    
    await generator.start()
    logger.info("Generator started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Очистка при завершении"""
    global generator
    
    logger.info("Shutting down Content Studio Infinite API...")
    
    if generator:
        await generator.stop()
    
    logger.info("Shutdown complete")


# === API Routes ===

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": "Content Studio Infinite",
        "version": "1.0.0",
        "status": "running" if generator and generator._running else "stopped"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья"""
    return {
        "status": "healthy",
        "generator_running": generator._running if generator else False,
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/generate", response_model=GenerateResponse)
async def create_task(request: TaskCreateRequest):
    """Создание задачи на генерацию"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    task_id = generator.add_task(
        prompt=request.prompt,
        duration=request.duration,
        aspect_ratio=request.aspect_ratio,
        provider=request.provider,
        priority=request.priority
    )
    
    return GenerateResponse(
        success=True,
        task_id=task_id,
        message=f"Task {task_id} added to queue"
    )


@app.post("/api/generate/batch")
async def create_batch_tasks(request: BatchTaskRequest):
    """Создание множества задач"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    task_ids = generator.add_batch_tasks(
        prompts=request.prompts,
        duration=request.duration,
        aspect_ratio=request.aspect_ratio,
        provider=request.provider
    )
    
    return {
        "success": True,
        "task_ids": task_ids,
        "count": len(task_ids)
    }


@app.get("/api/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Получение статуса задачи"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    task = generator.get_task_status(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    progress = 0.0
    if task['status'] == 'completed':
        progress = 100.0
    elif task['status'] == 'processing':
        progress = 50.0
    elif task['status'] == 'failed':
        progress = 0.0
    
    return TaskStatusResponse(
        task_id=task_id,
        status=task['status'],
        progress=progress,
        result=None  # TODO: Add result
    )


@app.get("/api/tasks")
async def list_tasks(status: Optional[str] = None, limit: int = 50):
    """Список задач"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    # Получаем задачи из очереди
    all_tasks = []
    
    # Pending
    for task in generator.queue._queue[:limit]:
        if status and task.status.value != status:
            continue
        all_tasks.append(task.to_dict())
    
    # Processing
    for task in generator.queue._processing.values():
        if status and task.status.value != status:
            continue
        all_tasks.append(task.to_dict())
    
    # Completed (последние)
    for task in generator.queue._completed[-limit:]:
        if status and task.status.value != status:
            continue
        all_tasks.append(task.to_dict())
    
    return {"tasks": all_tasks, "count": len(all_tasks)}


@app.get("/api/providers")
async def get_providers():
    """Статус всех провайдеров"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    providers = generator.get_providers_status()
    
    stats = generator.pool.get_stats()
    
    return {
        "providers": providers,
        "total_accounts": stats['total_accounts'],
        "active_accounts": stats['active_accounts'],
        "total_credits": stats['total_credits']
    }


@app.get("/api/accounts/{provider}")
async def get_provider_accounts(provider: str):
    """Аккаунты провайдера"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    accounts = generator.pool.get_accounts(provider)
    
    return {
        "provider": provider,
        "accounts": [acc.to_dict() for acc in accounts],
        "total": len(accounts),
        "active": len([a for a in accounts if a.status.value == 'active'])
    }


@app.post("/api/accounts/register")
async def register_account(request: RegisterRequest):
    """Регистрация нового аккаунта"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    result = await generator.register_account(request.provider)
    
    if result['success']:
        return {"success": True, "email": result['email']}
    else:
        raise HTTPException(status_code=400, detail=result.get('error', "Registration failed"))


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    """Статистика системы"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    stats = generator.get_stats()
    
    return StatsResponse(**stats)


@app.post("/api/prompts/generate")
async def generate_prompts(request: PromptGenerateRequest):
    """Генерация промптов"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    prompts = generator.generate_prompts(
        template=request.template,
        count=request.count,
        theme=request.theme
    )
    
    return {"prompts": prompts, "count": len(prompts)}


@app.post("/api/stitch")
async def stitch_videos(request: StitchRequest):
    """Склейка видео"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    result = await generator.stitch_videos(
        video_paths=request.video_paths,
        transition=request.transition,
        audio_path=request.audio_path
    )
    
    return result


@app.get("/api/queue/stats")
async def get_queue_stats():
    """Статистика очереди"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    return generator.queue.get_stats()


@app.post("/api/queue/clear")
async def clear_completed_tasks(max_age_hours: int = 24):
    """Очистка выполненных задач"""
    if not generator:
        raise HTTPException(status_code=503, detail="Generator not initialized")
    
    cleared = generator.queue.clear_completed(max_age_hours)
    
    return {"cleared": cleared}


# Static files для результатов
@app.get("/videos/{filename}")
async def get_video(filename: str):
    """Получение сгенерированного видео"""
    video_path = Path("./data/videos") / filename
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=filename
    )


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )


def run_server(host: str = "0.0.0.0", port: int = 8767):
    """Запуск сервера"""
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    run_server()
