#!/usr/bin/env python3
"""
Content Studio Infinite - Main Entry Point
Бесконечная генерация видео через 10+ бесплатных провайдеров

МУКН | Трафик - Enterprise AI-powered Content Generation Platform

Usage:
    python main.py --server                    # Запуск API сервера
    python main.py --generate "prompt"         # Генерация одного видео
    python main.py --batch prompts.txt         # Генерация из файла
    python main.py --register kling            # Регистрация аккаунта
    python main.py --stitch videos.txt         # Склейка видео
    python main.py --status                    # Статус системы
"""

import argparse
import asyncio
import sys
from pathlib import Path
from datetime import datetime

from loguru import logger

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)
logger.add(
    "./data/logs/content_studio_{time:YYYY-MM-DD}.log",
    rotation="00:00",
    retention="7 days",
    level="DEBUG"
)


def parse_args():
    """Парсинг аргументов командной строки"""
    parser = argparse.ArgumentParser(
        description="Content Studio Infinite - Бесконечная генерация видео"
    )
    
    # Основные режимы
    parser.add_argument(
        '--server',
        action='store_true',
        help='Запустить API сервер'
    )
    
    parser.add_argument(
        '--generate',
        type=str,
        metavar='PROMPT',
        help='Сгенерировать видео по промпту'
    )
    
    parser.add_argument(
        '--batch',
        type=str,
        metavar='FILE',
        help='Генерация из файла с промптами (по одному на строку)'
    )
    
    parser.add_argument(
        '--register',
        type=str,
        metavar='PROVIDER',
        choices=['kling', 'wan', 'digen', 'qwen', 'runway', 'luma', 'pika', 'haiper', 'vidu'],
        help='Зарегистрировать аккаунт для провайдера'
    )
    
    parser.add_argument(
        '--stitch',
        type=str,
        metavar='FILE',
        help='Склеить видео из списка в файле'
    )
    
    parser.add_argument(
        '--status',
        action='store_true',
        help='Показать статус системы'
    )
    
    # Параметры генерации
    parser.add_argument(
        '--duration',
        type=float,
        default=10.0,
        help='Длительность видео в секундах (default: 10)'
    )
    
    parser.add_argument(
        '--ratio',
        type=str,
        default='9:16',
        choices=['9:16', '16:9', '1:1'],
        help='Соотношение сторон (default: 9:16)'
    )
    
    parser.add_argument(
        '--provider',
        type=str,
        help='Провайдер для генерации (auto если не указан)'
    )
    
    parser.add_argument(
        '--priority',
        type=str,
        default='normal',
        choices=['low', 'normal', 'high', 'urgent'],
        help='Приоритет задачи'
    )
    
    # Параметры склейки
    parser.add_argument(
        '--transition',
        type=str,
        default='fade',
        help='Тип перехода при склейке (fade, xfade, crossfade)'
    )
    
    parser.add_argument(
        '--audio',
        type=str,
        help='Аудио файл для склейки'
    )
    
    # Параметры сервера
    parser.add_argument(
        '--host',
        type=str,
        default='0.0.0.0',
        help='Хост для API сервера'
    )
    
    parser.add_argument(
        '--port',
        type=int,
        default=8767,
        help='Порт для API сервера'
    )
    
    parser.add_argument(
        '--workers',
        type=int,
        default=5,
        help='Количество параллельных воркеров'
    )
    
    parser.add_argument(
        '--headless',
        action='store_true',
        default=True,
        help='Без графического интерфейса браузера'
    )
    
    parser.add_argument(
        '--no-headless',
        action='store_true',
        help='Показывать браузер (для отладки)'
    )
    
    return parser.parse_args()


async def run_server(args):
    """Запуск API сервера"""
    from api.server import run_server as start_api
    
    logger.info(f"Starting API server on {args.host}:{args.port}")
    start_api(host=args.host, port=args.port)


async def generate_single(args):
    """Генерация одного видео"""
    from core.infinite_generator import InfiniteGenerator
    
    generator = InfiniteGenerator(
        headless=args.headless,
        parallel_workers=1
    )
    
    try:
        await generator.start()
        
        logger.info(f"Adding task: {args.generate[:50]}...")
        task_id = generator.add_task(
            prompt=args.generate,
            duration=args.duration,
            aspect_ratio=args.ratio,
            provider=args.provider,
            priority=args.priority
        )
        
        logger.info(f"Task ID: {task_id}")
        logger.info("Waiting for generation...")
        
        # Ждём завершения
        max_wait = 600  # 10 минут
        waited = 0
        
        while waited < max_wait:
            status = generator.get_task_status(task_id)
            
            if status['status'] == 'completed':
                logger.success(f"Generation complete!")
                logger.success(f"Result: {status.get('result_path', 'N/A')}")
                return status.get('result_path')
            
            elif status['status'] == 'failed':
                logger.error(f"Generation failed: {status.get('error', 'Unknown error')}")
                return None
            
            await asyncio.sleep(5)
            waited += 5
            logger.info(f"Status: {status['status']} ({waited}s)")
        
        logger.warning("Timeout waiting for generation")
        
    finally:
        await generator.stop()


async def generate_batch(args):
    """Генерация из файла"""
    from core.infinite_generator import InfiniteGenerator
    
    # Читаем промпты из файла
    prompts_file = Path(args.batch)
    if not prompts_file.exists():
        logger.error(f"File not found: {prompts_file}")
        return
    
    prompts = [line.strip() for line in prompts_file.read_text().split('\n') if line.strip()]
    logger.info(f"Loaded {len(prompts)} prompts")
    
    generator = InfiniteGenerator(
        headless=args.headless,
        parallel_workers=args.workers
    )
    
    try:
        await generator.start()
        
        # Добавляем все задачи
        task_ids = generator.add_batch_tasks(
            prompts=prompts,
            duration=args.duration,
            aspect_ratio=args.ratio,
            provider=args.provider
        )
        
        logger.info(f"Added {len(task_ids)} tasks to queue")
        
        # Мониторинг
        while True:
            stats = generator.get_stats()
            queue_stats = generator.queue.get_stats()
            
            logger.info(
                f"Progress: {stats['completed_tasks']}/{stats['total_tasks']} | "
                f"Queue: {queue_stats['pending']} | "
                f"Generated: {stats['total_videos_generated']} videos ({stats['total_video_minutes']:.1f} min)"
            )
            
            if queue_stats['pending'] == 0 and queue_stats['processing'] == 0:
                logger.success("All tasks completed!")
                break
            
            await asyncio.sleep(30)
        
    finally:
        await generator.stop()


async def register_account(args):
    """Регистрация аккаунта"""
    from core.infinite_generator import InfiniteGenerator
    
    generator = InfiniteGenerator(
        headless=args.no_headless == False  # Если --no-headless, показываем браузер
    )
    
    try:
        logger.info(f"Registering account for {args.register}...")
        
        result = await generator.register_account(args.register)
        
        if result['success']:
            logger.success(f"Account registered: {result['email']}")
        else:
            logger.error(f"Registration failed: {result.get('error', 'Unknown error')}")
        
    finally:
        await generator.stop()


async def stitch_videos(args):
    """Склейка видео"""
    from core.video_stitcher import VideoStitcher
    
    # Читаем пути к видео из файла
    videos_file = Path(args.stitch)
    if not videos_file.exists():
        logger.error(f"File not found: {videos_file}")
        return
    
    video_paths = [line.strip() for line in videos_file.read_text().split('\n') if line.strip()]
    logger.info(f"Loaded {len(video_paths)} video paths")
    
    # Проверяем существование
    existing = [p for p in video_paths if Path(p).exists()]
    if len(existing) != len(video_paths):
        logger.warning(f"Only {len(existing)}/{len(video_paths)} files exist")
        video_paths = existing
    
    if not video_paths:
        logger.error("No valid video paths")
        return
    
    stitcher = VideoStitcher()
    
    logger.info(f"Stitching {len(video_paths)} videos...")
    
    result = await stitcher.stitch_videos(
        video_paths=video_paths,
        transition=args.transition,
        audio_path=args.audio
    )
    
    if result.success:
        logger.success(f"Stitching complete!")
        logger.success(f"Output: {result.output_path}")
        logger.success(f"Duration: {result.total_duration:.1f}s")
    else:
        logger.error(f"Stitching failed: {result.error}")


async def show_status(args):
    """Показать статус системы"""
    from core.infinite_generator import InfiniteGenerator
    from core.account_pool import AccountPool
    
    pool = AccountPool()
    
    print("\n" + "="*60)
    print("CONTENT STUDIO INFINITE - STATUS")
    print("="*60)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Статистика аккаунтов
    stats = pool.get_stats()
    print("ACCOUNTS:")
    print(f"  Total: {stats['total_accounts']}")
    print(f"  Active: {stats['active_accounts']}")
    print(f"  Rate Limited: {stats['rate_limited']}")
    print(f"  Errors: {stats['error_accounts']}")
    print(f"  Total Credits: {stats['total_credits']}")
    print()
    
    # По провайдерам
    print("BY PROVIDER:")
    for provider, pstats in stats['by_provider'].items():
        status = "✅" if pstats['active'] > 0 else "❌"
        print(f"  {status} {provider:10s}: {pstats['active']}/{pstats['total']} accounts, {pstats['credits']} credits")
    print()
    
    print("="*60 + "\n")


def main():
    """Главная функция"""
    args = parse_args()
    
    # Создаём необходимые директории
    Path("./data/logs").mkdir(parents=True, exist_ok=True)
    Path("./data/videos/raw").mkdir(parents=True, exist_ok=True)
    Path("./data/videos/final").mkdir(parents=True, exist_ok=True)
    
    # Определяем headless
    if args.no_headless:
        args.headless = False
    
    # Запуск соответствующей функции
    if args.server:
        asyncio.run(run_server(args))
    elif args.generate:
        asyncio.run(generate_single(args))
    elif args.batch:
        asyncio.run(generate_batch(args))
    elif args.register:
        asyncio.run(register_account(args))
    elif args.stitch:
        asyncio.run(stitch_videos(args))
    elif args.status:
        asyncio.run(show_status(args))
    else:
        # По умолчанию - сервер
        asyncio.run(run_server(args))


if __name__ == "__main__":
    main()
