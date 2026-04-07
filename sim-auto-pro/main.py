#!/usr/bin/env python3
"""
SIM Auto-Registration PRO - Main Entry Point
МУКН Enterprise AI Automation Platform

Запуск:
    python main.py                    # Полный режим 24/365
    python main.py --once             # Один цикл регистрации
    python main.py --service tiktok   # Регистрация конкретного сервиса
    python main.py --status           # Показать статус
"""

import asyncio
import sys
import os

# Добавляем текущую директорию в путь
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scheduler import main

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
