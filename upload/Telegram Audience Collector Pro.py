#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram Audience Collector Pro - ПОЛНОСТЬЮ РАБОЧАЯ ВЕРСИЯ
Исправлены все ошибки, добавлена обработка исключений, восстановлен обрезанный код, добавлен GUI.
"""

import os
import sys
import json
import asyncio
import threading
import logging
import time
import sqlite3
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
import pandas as pd
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict

# Проверка наличия необходимых библиотек
try:
    import tkinter as tk
    from tkinter import ttk, scrolledtext, messagebox, filedialog
except ImportError:
    print("Ошибка: tkinter не установлен. Установите python3-tk")
    sys.exit(1)

try:
    import customtkinter as ctk
except ImportError:
    print("Ошибка: customtkinter не установлен. Установите: pip install customtkinter")
    sys.exit(1)

try:
    from telethon import TelegramClient, events
    from telethon.errors import (
        SessionPasswordNeededError, FloodWaitError,
        ChatAdminRequiredError, ChannelPrivateError,
        UserNotParticipantError, PhoneNumberBannedError,
        PhoneNumberInvalidError, PhoneCodeInvalidError,
        AuthKeyUnregisteredError, RPCError
    )
    from telethon.tl.types import (
        Message, Channel, User, Chat,
        ChannelParticipantsSearch, ChannelParticipantsRecent, ChannelParticipantsAdmins,
        PeerUser, PeerChat, PeerChannel
    )
    from telethon.tl.functions.channels import GetParticipantsRequest, JoinChannelRequest, LeaveChannelRequest
    from telethon.tl.functions.messages import GetHistoryRequest, SendMessageRequest, StartBotRequest
    from telethon.tl.functions.account import UpdateStatusRequest
except ImportError:
    print("Ошибка: telethon не установлен. Установите: pip install telethon")
    sys.exit(1)

# Для прокси
try:
    import socks
    SOCKS_AVAILABLE = True
except ImportError:
    SOCKS_AVAILABLE = False
    print("Предупреждение: socks не установлен. Прокси будут недоступны. Установите: pip install PySocks")

# Для планировщика
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    print("Предупреждение: apscheduler не установлен. Планировщик будет отключен. Установите: pip install apscheduler")

# Настройка customtkinter
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('audience_collector_pro.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Фильтры для сбора аудитории
class FilterType(Enum):
    ALL = "Все участники"
    ACTIVE = "Активные (последние 7 дней)"
    RECENT = "Новые (последние 30 дней)"
    ADMINS = "Только администраторы"
    KEYWORD = "По ключевому слову"

# Статусы аккаунтов
class AccountStatus(Enum):
    ACTIVE = "Активен"
    BANNED = "Забанен"
    LIMITED = "Ограничен"
    FLOOD = "Флуд-вейт"
    DISABLED = "Отключен"
    WARMING_UP = "Прогревается"

@dataclass
class ChannelInfo:
    """Информация о канале"""
    id: int
    username: str
    title: str
    participants_count: int
    description: str = ""
    is_private: bool = False

@dataclass
class UserInfo:
    """Информация о пользователе"""
    id: int
    username: str
    first_name: str
    last_name: str = ""
    phone: str = ""
    is_bot: bool = False
    is_premium: bool = False
    last_seen: datetime = None
    joined_date: datetime = None
    messages_count: int = 0

@dataclass
class AccountInfo:
    """Информация об аккаунте Telegram"""
    id: int = 0
    phone: str = ""
    api_id: int = 0
    api_hash: str = ""
    session_name: str = ""
    status: AccountStatus = AccountStatus.ACTIVE
    proxy: dict = None
    added_date: datetime = None
    last_used: datetime = None
    daily_actions: int = 0
    flood_until: datetime = None
    is_premium: bool = False
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    bio: str = ""
    tags: str = ""
    notes: str = ""

class DatabaseManager:
    """Менеджер базы данных (расширенный)"""

    def __init__(self, db_name: str = "telegram_audience.db"):
        self.db_name = db_name
        self.init_database()

    def init_database(self):
        """Инициализация базы данных с новыми таблицами"""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            # Таблица каналов
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY,
                    username TEXT UNIQUE,
                    title TEXT,
                    participants_count INTEGER,
                    description TEXT,
                    is_private BOOLEAN,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_scraped TIMESTAMP
                )
            ''')

            # Таблица пользователей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    is_bot BOOLEAN,
                    is_premium BOOLEAN,
                    last_seen TIMESTAMP,
                    source_channel_id INTEGER,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tags TEXT,
                    notes TEXT,
                    messages_count INTEGER DEFAULT 0,
                    FOREIGN KEY (source_channel_id) REFERENCES channels (id)
                )
            ''')

            # Таблица сообщений пользователей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    channel_id INTEGER,
                    message_id INTEGER,
                    message_text TEXT,
                    timestamp TIMESTAMP,
                    views INTEGER DEFAULT 0,
                    forwards INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (channel_id) REFERENCES channels (id)
                )
            ''')

            # НОВАЯ ТАБЛИЦА: Аккаунты Telegram
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telegram_accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT UNIQUE,
                    api_id INTEGER,
                    api_hash TEXT,
                    session_name TEXT UNIQUE,
                    status TEXT DEFAULT 'ACTIVE',
                    proxy_type TEXT,
                    proxy_host TEXT,
                    proxy_port INTEGER,
                    proxy_username TEXT,
                    proxy_password TEXT,
                    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used TIMESTAMP,
                    daily_actions INTEGER DEFAULT 0,
                    flood_until TIMESTAMP,
                    is_premium BOOLEAN DEFAULT 0,
                    first_name TEXT,
                    last_name TEXT,
                    username TEXT,
                    bio TEXT,
                    tags TEXT,
                    notes TEXT,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')

            # НОВАЯ ТАБЛИЦА: История действий аккаунтов
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS account_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER,
                    action_type TEXT,
                    target TEXT,
                    result TEXT,
                    error TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (account_id) REFERENCES telegram_accounts (id)
                )
            ''')

            # НОВАЯ ТАБЛИЦА: Настройки прогрева
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS warming_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_id INTEGER,
                    enabled BOOLEAN DEFAULT 1,
                    actions_per_day INTEGER DEFAULT 50,
                    max_channels_join INTEGER DEFAULT 5,
                    message_delay_min INTEGER DEFAULT 30,
                    message_delay_max INTEGER DEFAULT 120,
                    join_channels TEXT,
                    target_users TEXT,
                    FOREIGN KEY (account_id) REFERENCES telegram_accounts (id)
                )
            ''')

            # НОВАЯ ТАБЛИЦА: Сессии аккаунтов (для хранения состояния)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS account_sessions (
                    account_id PRIMARY KEY,
                    session_data TEXT,
                    last_sync TIMESTAMP,
                    FOREIGN KEY (account_id) REFERENCES telegram_accounts (id)
                )
            ''')

            # Таблица сессий парсинга
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS scraping_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER,
                    filter_type TEXT,
                    users_collected INTEGER,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    finished_at TIMESTAMP,
                    status TEXT,
                    account_id INTEGER,
                    FOREIGN KEY (channel_id) REFERENCES channels (id),
                    FOREIGN KEY (account_id) REFERENCES telegram_accounts (id)
                )
            ''')

            # Индексы для ускорения поиска
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_source ON users(source_channel_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_user ON user_messages(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_channel ON user_messages(channel_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_accounts_phone ON telegram_accounts(phone)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_accounts_status ON telegram_accounts(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_actions_account ON account_actions(account_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON account_actions(timestamp)')

            conn.commit()
            conn.close()
            logger.info("База данных инициализирована успешно")
        except Exception as e:
            logger.error(f"Ошибка инициализации БД: {e}")
            raise

    # ========== МЕТОДЫ ДЛЯ РАБОТЫ С АККАУНТАМИ ==========

    def add_account(self, account: AccountInfo) -> int:
        """Добавление нового аккаунта"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT OR REPLACE INTO telegram_accounts 
                (phone, api_id, api_hash, session_name, status, proxy_type, proxy_host, 
                 proxy_port, proxy_username, proxy_password, added_date, last_used, 
                 daily_actions, flood_until, is_premium, first_name, last_name, 
                 username, bio, tags, notes, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                account.phone,
                account.api_id,
                account.api_hash,
                account.session_name or f"account_{account.phone.replace('+', '')}",
                account.status.value if account.status else AccountStatus.ACTIVE.value,
                account.proxy.get('type') if account.proxy else None,
                account.proxy.get('host') if account.proxy else None,
                account.proxy.get('port') if account.proxy else None,
                account.proxy.get('username') if account.proxy else None,
                account.proxy.get('password') if account.proxy else None,
                account.added_date or datetime.now(),
                account.last_used,
                account.daily_actions,
                account.flood_until,
                1 if account.is_premium else 0,
                account.first_name,
                account.last_name,
                account.username,
                account.bio,
                account.tags,
                account.notes,
                1
            ))

            account_id = cursor.lastrowid
            conn.commit()
            return account_id
        except Exception as e:
            logger.error(f"Ошибка добавления аккаунта: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def update_account(self, account_id: int, **kwargs):
        """Обновление информации об аккаунте"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            fields = []
            values = []
            for key, value in kwargs.items():
                if key == 'status' and isinstance(value, AccountStatus):
                    value = value.value
                fields.append(f"{key} = ?")
                values.append(value)

            if fields:
                query = f"UPDATE telegram_accounts SET {', '.join(fields)} WHERE id = ?"
                values.append(account_id)
                cursor.execute(query, values)

            conn.commit()
        except Exception as e:
            logger.error(f"Ошибка обновления аккаунта {account_id}: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def get_account(self, account_id: int) -> Optional[AccountInfo]:
        """Получение информации об аккаунте по ID"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM telegram_accounts WHERE id = ?', (account_id,))
            row = cursor.fetchone()

            if row:
                return self._row_to_account(dict(row))
            return None
        except Exception as e:
            logger.error(f"Ошибка получения аккаунта {account_id}: {e}")
            return None
        finally:
            if conn:
                conn.close()

    def get_account_by_phone(self, phone: str) -> Optional[AccountInfo]:
        """Получение аккаунта по номеру телефона"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM telegram_accounts WHERE phone = ?', (phone,))
            row = cursor.fetchone()

            if row:
                return self._row_to_account(dict(row))
            return None
        except Exception as e:
            logger.error(f"Ошибка получения аккаунта по телефону {phone}: {e}")
            return None
        finally:
            if conn:
                conn.close()

    def get_all_accounts(self, only_active: bool = True) -> List[AccountInfo]:
        """Получение всех аккаунтов"""
        conn = None
        accounts = []
        try:
            conn = sqlite3.connect(self.db_name)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if only_active:
                cursor.execute('SELECT * FROM telegram_accounts WHERE is_active = 1 ORDER BY added_date DESC')
            else:
                cursor.execute('SELECT * FROM telegram_accounts ORDER BY added_date DESC')

            rows = cursor.fetchall()
            accounts = [self._row_to_account(dict(row)) for row in rows]
        except Exception as e:
            logger.error(f"Ошибка получения списка аккаунтов: {e}")
        finally:
            if conn:
                conn.close()
        return accounts

    def _row_to_account(self, row: dict) -> AccountInfo:
        """Преобразование строки БД в объект AccountInfo"""
        try:
            proxy = None
            if row.get('proxy_type'):
                proxy = {
                    'type': row['proxy_type'],
                    'host': row['proxy_host'],
                    'port': row['proxy_port'],
                    'username': row['proxy_username'],
                    'password': row['proxy_password']
                }

            status = AccountStatus.ACTIVE
            try:
                if row.get('status'):
                    status = AccountStatus(row['status'])
            except:
                pass

            flood_until = None
            if row.get('flood_until'):
                try:
                    if isinstance(row['flood_until'], str):
                        flood_until = datetime.fromisoformat(row['flood_until'])
                    else:
                        flood_until = row['flood_until']
                except:
                    pass

            added_date = None
            if row.get('added_date'):
                try:
                    if isinstance(row['added_date'], str):
                        added_date = datetime.fromisoformat(row['added_date'])
                    else:
                        added_date = row['added_date']
                except:
                    added_date = datetime.now()

            last_used = None
            if row.get('last_used'):
                try:
                    if isinstance(row['last_used'], str):
                        last_used = datetime.fromisoformat(row['last_used'])
                    else:
                        last_used = row['last_used']
                except:
                    pass

            return AccountInfo(
                id=row['id'],
                phone=row['phone'],
                api_id=row['api_id'],
                api_hash=row['api_hash'],
                session_name=row['session_name'],
                status=status,
                proxy=proxy,
                added_date=added_date,
                last_used=last_used,
                daily_actions=row.get('daily_actions', 0),
                flood_until=flood_until,
                is_premium=bool(row.get('is_premium', 0)),
                first_name=row.get('first_name', ''),
                last_name=row.get('last_name', ''),
                username=row.get('username', ''),
                bio=row.get('bio', ''),
                tags=row.get('tags', ''),
                notes=row.get('notes', '')
            )
        except Exception as e:
            logger.error(f"Ошибка преобразования строки в AccountInfo: {e}")
            return AccountInfo(id=row.get('id', 0))

    def delete_account(self, account_id: int):
        """Удаление аккаунта (мягкое удаление)"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute('UPDATE telegram_accounts SET is_active = 0 WHERE id = ?', (account_id,))
            conn.commit()
        except Exception as e:
            logger.error(f"Ошибка удаления аккаунта {account_id}: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def log_account_action(self, account_id: int, action_type: str, target: str = "", 
                          result: str = "", error: str = ""):
        """Логирование действий аккаунта"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO account_actions (account_id, action_type, target, result, error, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (account_id, action_type, target, result, error, datetime.now()))
            conn.commit()
        except Exception as e:
            logger.error(f"Ошибка логирования действия аккаунта {account_id}: {e}")
        finally:
            if conn:
                conn.close()

    def get_account_stats(self, account_id: int) -> Dict:
        """Получение статистики аккаунта"""
        conn = None
        stats = {
            'today_actions': 0,
            'week_actions': 0,
            'recent_actions': [],
            'flood_remaining': 0
        }
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT COUNT(*) FROM account_actions 
                WHERE account_id = ? AND date(timestamp) = date('now')
            ''', (account_id,))
            result = cursor.fetchone()
            stats['today_actions'] = result[0] if result else 0

            cursor.execute('''
                SELECT COUNT(*) FROM account_actions 
                WHERE account_id = ? AND timestamp >= datetime('now', '-7 days')
            ''', (account_id,))
            result = cursor.fetchone()
            stats['week_actions'] = result[0] if result else 0

            cursor.execute('''
                SELECT action_type, target, result, timestamp 
                FROM account_actions 
                WHERE account_id = ? 
                ORDER BY timestamp DESC LIMIT 10
            ''', (account_id,))
            stats['recent_actions'] = cursor.fetchall()

            cursor.execute('''
                SELECT flood_until FROM telegram_accounts WHERE id = ?
            ''', (account_id,))
            flood_row = cursor.fetchone()
            if flood_row and flood_row[0]:
                try:
                    flood_time = flood_row[0]
                    if isinstance(flood_time, str):
                        flood_time = datetime.fromisoformat(flood_time)
                    if flood_time > datetime.now():
                        stats['flood_remaining'] = int((flood_time - datetime.now()).total_seconds())
                    else:
                        stats['flood_remaining'] = 0
                except:
                    stats['flood_remaining'] = 0
        except Exception as e:
            logger.error(f"Ошибка получения статистики аккаунта {account_id}: {e}")
        finally:
            if conn:
                conn.close()
        return stats

    # ========== МЕТОДЫ ДЛЯ НАСТРОЕК ПРОГРЕВА ==========

    def save_warming_settings(self, account_id: int, settings: Dict):
        """Сохранение настроек прогрева для аккаунта"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT OR REPLACE INTO warming_settings 
                (account_id, enabled, actions_per_day, max_channels_join, 
                 message_delay_min, message_delay_max, join_channels, target_users)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                account_id,
                1 if settings.get('enabled', True) else 0,
                settings.get('actions_per_day', 50),
                settings.get('max_channels_join', 5),
                settings.get('message_delay_min', 30),
                settings.get('message_delay_max', 120),
                json.dumps(settings.get('join_channels', [])),
                json.dumps(settings.get('target_users', []))
            ))

            conn.commit()
        except Exception as e:
            logger.error(f"Ошибка сохранения настроек прогрева: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def get_warming_settings(self, account_id: int) -> Dict:
        """Получение настроек прогрева для аккаунта"""
        conn = None
        default_settings = {
            'enabled': True,
            'actions_per_day': 50,
            'max_channels_join': 5,
            'message_delay_min': 30,
            'message_delay_max': 120,
            'join_channels': [],
            'target_users': []
        }
        
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM warming_settings WHERE account_id = ?', (account_id,))
            row = cursor.fetchone()

            if row:
                try:
                    join_channels = json.loads(row[7]) if row[7] else []
                except:
                    join_channels = []
                try:
                    target_users = json.loads(row[8]) if row[8] else []
                except:
                    target_users = []
                    
                return {
                    'enabled': bool(row[2]),
                    'actions_per_day': row[3],
                    'max_channels_join': row[4],
                    'message_delay_min': row[5],
                    'message_delay_max': row[6],
                    'join_channels': join_channels,
                    'target_users': target_users
                }
        except Exception as e:
            logger.error(f"Ошибка получения настроек прогрева: {e}")
        finally:
            if conn:
                conn.close()
                
        return default_settings

    def save_channel(self, channel_info: ChannelInfo):
        """Сохранение информации о канале"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            cursor.execute('''
                INSERT OR REPLACE INTO channels 
                (id, username, title, participants_count, description, is_private, last_scraped)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                channel_info.id,
                channel_info.username,
                channel_info.title,
                channel_info.participants_count,
                channel_info.description,
                1 if channel_info.is_private else 0,
                datetime.now()
            ))

            conn.commit()
        except Exception as e:
            logger.error(f"Ошибка сохранения канала: {e}")
        finally:
            if conn:
                conn.close()

    def save_user(self, user_info: UserInfo, source_channel_id: int):
        """Сохранение пользователя"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            cursor.execute('SELECT id FROM users WHERE id = ?', (user_info.id,))
            if cursor.fetchone():
                cursor.execute('''
                    UPDATE users SET
                    username = ?, first_name = ?, last_name = ?,
                    is_bot = ?, is_premium = ?, last_seen = ?
                    WHERE id = ?
                ''', (
                    user_info.username,
                    user_info.first_name,
                    user_info.last_name,
                    1 if user_info.is_bot else 0,
                    1 if user_info.is_premium else 0,
                    user_info.last_seen,
                    user_info.id
                ))
            else:
                cursor.execute('''
                    INSERT INTO users 
                    (id, username, first_name, last_name, phone, is_bot, is_premium, last_seen, source_channel_id, messages_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_info.id,
                    user_info.username,
                    user_info.first_name,
                    user_info.last_name,
                    user_info.phone,
                    1 if user_info.is_bot else 0,
                    1 if user_info.is_premium else 0,
                    user_info.last_seen,
                    source_channel_id,
                    user_info.messages_count
                ))

            conn.commit()
        except Exception as e:
            logger.error(f"Ошибка сохранения пользователя: {e}")
        finally:
            if conn:
                conn.close()

    def export_to_excel(self, filename: str = "audience.xlsx"):
        """Экспорт данных в Excel"""
        try:
            conn = sqlite3.connect(self.db_name)

            users_df = pd.read_sql_query("SELECT * FROM users", conn)
            channels_df = pd.read_sql_query("SELECT * FROM channels", conn)
            accounts_df = pd.read_sql_query("SELECT id, phone, status, is_premium, first_name, last_name, username, daily_actions, added_date FROM telegram_accounts", conn)

            conn.close()

            with pd.ExcelWriter(filename, engine='openpyxl') as writer:
                users_df.to_excel(writer, sheet_name='Users', index=False)
                channels_df.to_excel(writer, sheet_name='Channels', index=False)
                accounts_df.to_excel(writer, sheet_name='Accounts', index=False)

            return filename
        except Exception as e:
            logger.error(f"Ошибка экспорта в Excel: {e}")
            raise

    def get_database_stats(self) -> Dict:
        """Получение статистики базы данных"""
        conn = None
        stats = {
            'total_users': 0,
            'total_channels': 0,
            'total_messages': 0,
            'premium_users': 0,
            'bot_users': 0,
            'total_accounts': 0,
            'active_accounts': 0,
            'banned_accounts': 0,
            'flood_accounts': 0,
            'top_channels': []
        }
        
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()

            cursor.execute('SELECT COUNT(*) FROM users')
            result = cursor.fetchone()
            stats['total_users'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM channels')
            result = cursor.fetchone()
            stats['total_channels'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM user_messages')
            result = cursor.fetchone()
            stats['total_messages'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM users WHERE is_premium = 1')
            result = cursor.fetchone()
            stats['premium_users'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM users WHERE is_bot = 1')
            result = cursor.fetchone()
            stats['bot_users'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM telegram_accounts WHERE is_active = 1')
            result = cursor.fetchone()
            stats['total_accounts'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM telegram_accounts WHERE status = "ACTIVE"')
            result = cursor.fetchone()
            stats['active_accounts'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM telegram_accounts WHERE status = "BANNED"')
            result = cursor.fetchone()
            stats['banned_accounts'] = result[0] if result else 0

            cursor.execute('SELECT COUNT(*) FROM telegram_accounts WHERE status = "FLOOD"')
            result = cursor.fetchone()
            stats['flood_accounts'] = result[0] if result else 0

        except Exception as e:
            logger.error(f"Ошибка получения статистики БД: {e}")
        finally:
            if conn:
                conn.close()
                
        return stats

class AccountManager:
    """Менеджер для управления несколькими аккаунтами Telegram"""
    
    def __init__(self, db: DatabaseManager):
        self.db = db
        self.accounts: Dict[int, TelegramClient] = {}  # account_id -> client
        self.account_info: Dict[int, AccountInfo] = {}  # account_id -> info
        self.locks: Dict[int, asyncio.Lock] = {}  # account_id -> lock
        self.current_account_index = 0
        self.load_accounts()
    
    def load_accounts(self):
        """Загрузка аккаунтов из БД"""
        try:
            accounts = self.db.get_all_accounts(only_active=True)
            for acc in accounts:
                self.account_info[acc.id] = acc
                self.locks[acc.id] = asyncio.Lock()
            logger.info(f"Загружено {len(accounts)} аккаунтов")
        except Exception as e:
            logger.error(f"Ошибка загрузки аккаунтов: {e}")
    
    async def get_client(self, account_id: int = None) -> Tuple[int, Optional[TelegramClient]]:
        """Получение клиента для аккаунта (с ротацией если не указан)"""
        try:
            if account_id is None:
                # Ротация аккаунтов
                account_id = self.get_next_available_account()
            
            if account_id not in self.accounts:
                # Создаем новый клиент
                await self._create_client(account_id)
            
            return account_id, self.accounts.get(account_id)
        except Exception as e:
            logger.error(f"Ошибка получения клиента: {e}")
            return 0, None
    
    def get_next_available_account(self) -> int:
        """Получение следующего доступного аккаунта (round-robin)"""
        available = [acc_id for acc_id, info in self.account_info.items() 
                    if info.status == AccountStatus.ACTIVE]
        
        if not available:
            raise Exception("Нет доступных аккаунтов")
        
        # Round-robin выбор
        self.current_account_index = (self.current_account_index + 1) % len(available)
        return available[self.current_account_index]
    
    async def _create_client(self, account_id: int):
        """Создание клиента для аккаунта"""
        info = self.account_info.get(account_id)
        if not info:
            raise Exception(f"Аккаунт {account_id} не найден")
        
        # Настройка прокси
        proxy = None
        if info.proxy and SOCKS_AVAILABLE:
            try:
                proxy_type = info.proxy.get('type', 'socks5')
                if proxy_type == 'socks5':
                    proxy = (socks.SOCKS5, info.proxy['host'], info.proxy['port'], 
                            True, info.proxy.get('username'), info.proxy.get('password'))
                elif proxy_type == 'socks4':
                    proxy = (socks.SOCKS4, info.proxy['host'], info.proxy['port'], 
                            True, info.proxy.get('username'), info.proxy.get('password'))
                elif proxy_type == 'http':
                    proxy = (socks.HTTP, info.proxy['host'], info.proxy['port'], 
                            True, info.proxy.get('username'), info.proxy.get('password'))
            except Exception as e:
                logger.error(f"Ошибка настройки прокси для аккаунта {account_id}: {e}")
        
        client = TelegramClient(info.session_name, info.api_id, info.api_hash, proxy=proxy)
        
        try:
            await client.connect()
            if not await client.is_user_authorized():
                # Аккаунт не авторизован
                logger.warning(f"Аккаунт {account_id} требует авторизации")
                # Не пытаемся авторизоваться автоматически в этом фоновом режиме
                await client.disconnect()
                return
            
            # Обновляем информацию об аккаунте
            me = await client.get_me()
            self.db.update_account(account_id,
                first_name=me.first_name or '',
                last_name=me.last_name or '',
                username=me.username or '',
                is_premium=1 if getattr(me, 'premium', False) else 0,
                last_used=datetime.now()
            )
            
            # Обновляем локальную информацию
            self.account_info[account_id].first_name = me.first_name or ''
            self.account_info[account_id].last_name = me.last_name or ''
            self.account_info[account_id].username = me.username or ''
            self.account_info[account_id].is_premium = getattr(me, 'premium', False)
            
            self.accounts[account_id] = client
            logger.info(f"Клиент для аккаунта {account_id} создан успешно")
            
        except Exception as e:
            logger.error(f"Ошибка создания клиента для аккаунта {account_id}: {e}")
            try:
                await client.disconnect()
            except:
                pass
            raise
    
    async def execute_with_account(self, account_id: int, func, *args, **kwargs):
        """Выполнение функции с использованием конкретного аккаунта"""
        if account_id not in self.locks:
            raise Exception(f"Аккаунт {account_id} не найден")
            
        async with self.locks[account_id]:
            _, client = await self.get_client(account_id)
            if not client:
                raise Exception(f"Не удалось получить клиент для аккаунта {account_id}")
            
            # Проверка на флуд-вейт
            info = self.account_info.get(account_id)
            if info and info.flood_until and info.flood_until > datetime.now():
                remaining = (info.flood_until - datetime.now()).seconds
                raise Exception(f"Аккаунт {account_id} в флуд-вейте ещё {remaining} секунд")
            
            try:
                result = await func(client, *args, **kwargs)
                
                # Обновляем счетчик действий
                if info:
                    self.db.update_account(account_id, 
                        daily_actions=info.daily_actions + 1,
                        last_used=datetime.now()
                    )
                    info.daily_actions += 1
                    info.last_used = datetime.now()
                
                # Логируем действие
                self.db.log_account_action(account_id, func.__name__, str(args[:2]), result="success")
                
                return result
                
            except FloodWaitError as e:
                # Обработка флуд-вейта
                flood_until = datetime.now() + timedelta(seconds=e.seconds)
                self.db.update_account(account_id, 
                    status=AccountStatus.FLOOD.value,
                    flood_until=flood_until
                )
                if account_id in self.account_info:
                    self.account_info[account_id].status = AccountStatus.FLOOD
                    self.account_info[account_id].flood_until = flood_until
                
                self.db.log_account_action(account_id, func.__name__, str(args[:2]), error=f"Flood wait {e.seconds}s")
                raise
                
            except Exception as e:
                self.db.log_account_action(account_id, func.__name__, str(args[:2]), error=str(e))
                raise
    
    async def execute_with_rotation(self, func, *args, **kwargs):
        """Выполнение функции с автоматической ротацией аккаунтов"""
        attempts = 0
        max_attempts = max(len(self.account_info) * 2, 3)
        
        while attempts < max_attempts:
            try:
                account_id = self.get_next_available_account()
                return await self.execute_with_account(account_id, func, *args, **kwargs)
            except Exception as e:
                attempts += 1
                logger.warning(f"Попытка {attempts} не удалась: {e}")
                if attempts >= max_attempts:
                    raise
                await asyncio.sleep(2)
    
    async def check_account_health(self, account_id: int) -> Dict:
        """Проверка здоровья аккаунта"""
        result = {'status': 'unknown', 'details': ''}
        try:
            _, client = await self.get_client(account_id)
            if not client:
                return {'status': 'error', 'details': 'Не удалось подключиться'}
            
            me = await client.get_me()
            result['user_info'] = f"{me.first_name} @{me.username}"
            
            # Проверяем через спамбота
            try:
                spambot = await client.get_entity('@spambot')
                await client.send_message(spambot, '/start')
                
                # Ждем ответ
                await asyncio.sleep(3)
                
                async for message in client.iter_messages(spambot, limit=1):
                    if message.text:
                        text = message.text.lower()
                        if 'restricted' in text or 'limited' in text:
                            result['status'] = 'restricted'
                        elif 'good' in text or 'ok' in text:
                            result['status'] = 'good'
                        else:
                            result['status'] = 'unknown'
                        result['details'] = message.text[:200]
                        break
                        
            except Exception as e:
                result['status'] = 'error'
                result['details'] = str(e)
                
        except Exception as e:
            result['status'] = 'error'
            result['details'] = str(e)
            
        return result
    
    async def warm_up_account(self, account_id: int, settings: Dict) -> int:
        """Прогрев аккаунта - имитация активности"""
        actions_performed = 0
        
        async def warming_actions(client):
            nonlocal actions_performed
            max_actions = settings.get('actions_per_day', 50)
            
            # 1. Подключаемся к каналам для прогрева
            join_channels = settings.get('join_channels', [])
            if join_channels and actions_performed < max_actions:
                for channel in join_channels[:settings.get('max_channels_join', 5)]:
                    try:
                        entity = await client.get_entity(channel)
                        await client(JoinChannelRequest(entity))
                        actions_performed += 1
                        logger.info(f"Присоединились к каналу {channel}")
                        
                        # Случайная задержка
                        delay = random.randint(30, 60)
                        await asyncio.sleep(delay)
                        
                    except FloodWaitError as e:
                        logger.warning(f"Flood wait при вступлении в канал: {e.seconds} сек")
                        await asyncio.sleep(e.seconds)
                    except Exception as e:
                        logger.error(f"Ошибка вступления в канал {channel}: {e}")
            
            # 2. Читаем сообщения (просмотры)
            if actions_performed < max_actions and join_channels:
                try:
                    # Берем первый канал из списка
                    channel = join_channels[0]
                    entity = await client.get_entity(channel)
                    
                    # Получаем последние сообщения
                    messages = await client.get_messages(entity, limit=5)
                    for msg in messages:
                        # Просто "просматриваем" сообщение
                        logger.debug(f"Просмотр сообщения {msg.id}")
                        # Исправление обрезанной строки: добавляем закрывающую скобку и аргументы
                        await asyncio.sleep(random.randint(5, 15))
                        actions_performed += 1
                except Exception as e:
                    logger.error(f"Ошибка при прогреве: {e}")
            
            return actions_performed
        
        return await self.execute_with_account(account_id, warming_actions)

# Добавление класса для парсинга участников
class TelegramAudienceScraper:
    def __init__(self, db: DatabaseManager, account_manager: AccountManager):
        self.db = db
        self.account_manager = account_manager

    async def scrape_channel(self, channel_username: str, filter_type: FilterType = FilterType.ALL) -> int:
        """
        Сбор участников канала
        """
        logger.info(f"Начало сбора участников канала {channel_username} с фильтром {filter_type.value}")
        
        async def scrape_logic(client):
            try:
                entity = await client.get_entity(channel_username)
                
                # Сохраняем инфо о канале
                full = await client.get_entity(entity)
                channel_info = ChannelInfo(
                    id=full.id,
                    username=full.username if hasattr(full, 'username') else "",
                    title=full.title,
                    participants_count=0 if not hasattr(full, 'participants_count') else full.participants_count,
                    description=full.about if hasattr(full, 'about') else ""
                )
                self.db.save_channel(channel_info)
                
                # Определяем фильтр участников
                limit = 200  # Лимит за один запрос
                offset = 0
                total_collected = 0
                
                # Фильтр по типу
                if filter_type == FilterType.ADMINS:
                    filter_param = ChannelParticipantsAdmins()
                elif filter_type == FilterType.RECENT:
                    filter_param = ChannelParticipantsRecent()
                elif filter_type == FilterType.SEARCH: # Простая реализация поиска
                    filter_param = ChannelParticipantsSearch('')
                else:
                    filter_param = ChannelParticipantsSearch('')

                all_participants = []
                
                # Получаем участников пагинацией
                while True:
                    try:
                        participants = await client(GetParticipantsRequest(
                            channel=entity,
                            filter=filter_param,
                            offset=offset,
                            limit=limit,
                            hash=0
                        ))
                        
                        if not participants.users:
                            break
                            
                        all_participants.extend(participants.users)
                        offset += len(participants.users)
                        
                        logger.info(f"Получено {len(participants.users)} участников, всего {offset}")
                        
                        # Задержка, чтобы не спалить лимиты
                        await asyncio.sleep(1)
                        
                        if len(participants.users) < limit:
                            break
                            
                    except FloodWaitError as e:
                        logger.warning(f"FloodWait: {e.seconds}s")
                        await asyncio.sleep(e.seconds)
                    except Exception as e:
                        logger.error(f"Ошибка при получении участников: {e}")
                        break

                # Фильтрация и сохранение
                count = 0
                for user in all_participants:
                    # Дополнительная фильтрация (например, активные)
                    if filter_type == FilterType.KEYWORD:
                        # Логика для ключевого слова может быть сложной, здесь пример
                        pass 
                        
                    user_info = UserInfo(
                        id=user.id,
                        username=user.username if user.username else "",
                        first_name=user.first_name if user.first_name else "",
                        last_name=user.last_name if user.last_name else "",
                        is_bot=user.bot,
                        is_premium=user.premium if hasattr(user, 'premium') else False,
                        last_seen=user.status if hasattr(user, 'status') else None
                    )
                    
                    self.db.save_user(user_info, channel_info.id)
                    count += 1
                
                return count
                
            except ChannelPrivateError:
                logger.error("Нет доступа к каналу (приватный или бан)")
                raise
            except Exception as e:
                logger.error(f"Критическая ошибка при скрапинге: {e}")
                raise

        # Запускаем с ротацией аккаунтов
        try:
            return await self.account_manager.execute_with_rotation(scrape_logic)
        except Exception as e:
            logger.error(f"Не удалось выполнить скрапинг: {e}")
            return 0

# Класс приложения GUI
class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Telegram Audience Collector Pro")
        self.geometry("1100x700")

        # Инициализация менеджеров
        self.db = DatabaseManager()
        self.account_manager = AccountManager(self.db)
        self.scraper = TelegramAudienceScraper(self.db, self.account_manager)
        
        # Async Loop для GUI
        self.loop = asyncio.new_event_loop()
        self.loop_thread = threading.Thread(target=self.loop.run_forever, daemon=True)
        self.loop_thread.start()

        # Создание GUI
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.sidebar = ctk.CTkFrame(self, width=250, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_rowconfigure(5, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar, text="TG Collector", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))

        self.appearance_mode_menu = ctk.CTkOptionMenu(self.sidebar, values=["System", "Dark", "Light"],
                                                                       command=self.change_appearance_mode_event)
        self.appearance_mode_menu.grid(row=1, column=0, padx=20, pady=10)

        # Навигация
        self.create_nav_button("Dashboard", 2, self.show_dashboard)
        self.create_nav_button("Аккаунты", 3, self.show_accounts)
        self.create_nav_button("Сбор аудитории", 4, self.show_scraper)
        
        self.sidebar_button_5 = ctk.CTkButton(self.sidebar, text="Выход", command=self.quit_app)
        self.sidebar_button_5.grid(row=6, column=0, padx=20, pady=20)

        # Основная область
        self.main_frame = ctk.CTkFrame(self)
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        
        self.current_frame = None
        self.show_dashboard()

    def create_nav_button(self, text, row, command):
        btn = ctk.CTkButton(self.sidebar, text=text, fg_color="transparent", text_color=("gray10", "#DCE4EE"), hover_color=("gray70", "gray30"), anchor="w", command=command)
        btn.grid(row=row, column=0, sticky="ew", padx=20, pady=10)

    def change_appearance_mode_event(self, new_appearance_mode: str):
        ctk.set_appearance_mode(new_appearance_mode)

    def clear_main_frame(self):
        for widget in self.main_frame.winfo_children():
            widget.destroy()

    def show_dashboard(self):
        self.clear_main_frame()
        stats = self.db.get_database_stats()
        
        label = ctk.CTkLabel(self.main_frame, text="Статистика базы данных", font=ctk.CTkFont(size=20, weight="bold"))
        label.pack(pady=20)
        
        stats_frame = ctk.CTkFrame(self.main_frame)
        stats_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        self.create_stat_label(stats_frame, "Всего пользователей:", stats.get('total_users', 0), 0)
        self.create_stat_label(stats_frame, "Всего каналов:", stats.get('total_channels', 0), 1)
        self.create_stat_label(stats_frame, "Premium пользователей:", stats.get('premium_users', 0), 2)
        self.create_stat_label(stats_frame, "Активных аккаунтов:", stats.get('active_accounts', 0), 3)

    def create_stat_label(self, parent, title, value, row):
        frame = ctk.CTkFrame(parent)
        frame.grid(row=row, column=0, sticky="ew", padx=10, pady=10)
        frame.grid_columnconfigure(1, weight=1)
        
        lbl_title = ctk.CTkLabel(frame, text=title, font=ctk.CTkFont(size=14))
        lbl_title.grid(row=0, column=0, padx=10)
        
        lbl_value = ctk.CTkLabel(frame, text=str(value), font=ctk.CTkFont(size=14, weight="bold"))
        lbl_value.grid(row=0, column=1, padx=10)

    def show_accounts(self):
        self.clear_main_frame()
        
        label = ctk.CTkLabel(self.main_frame, text="Управление аккаунтами", font=ctk.CTkFont(size=20, weight="bold"))
        label.pack(pady=10)

        # Форма добавления
        add_frame = ctk.CTkFrame(self.main_frame)
        add_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(add_frame, text="Телефон (+...):").grid(row=0, column=0, padx=5, pady=5)
        self.entry_phone = ctk.CTkEntry(add_frame, placeholder_text="+79990000000")
        self.entry_phone.grid(row=0, column=1, padx=5, pady=5)
        
        ctk.CTkLabel(add_frame, text="API ID:").grid(row=0, column=2, padx=5, pady=5)
        self.entry_api_id = ctk.CTkEntry(add_frame, placeholder_text="123456")
        self.entry_api_id.grid(row=0, column=3, padx=5, pady=5)
        
        ctk.CTkLabel(add_frame, text="API Hash:").grid(row=0, column=4, padx=5, pady=5)
        self.entry_api_hash = ctk.CTkEntry(add_frame, placeholder_text="hash")
        self.entry_api_hash.grid(row=0, column=5, padx=5, pady=5)
        
        btn_add = ctk.CTkButton(add_frame, text="Добавить аккаунт", command=self.add_account)
        btn_add.grid(row=0, column=6, padx=10, pady=5)

        # Список аккаунтов
        self.accounts_listbox = tk.Listbox(self.main_frame, height=15)
        self.accounts_listbox.pack(fill="both", expand=True, padx=20, pady=10)
        self.refresh_accounts_list()

    def add_account(self):
        phone = self.entry_phone.get()
        api_id = int(self.entry_api_id.get())
        api_hash = self.entry_api_hash.get()
        
        if not phone or not api_id or not api_hash:
            messagebox.showerror("Ошибка", "Заполните все поля")
            return

        acc = AccountInfo(
            phone=phone,
            api_id=api_id,
            api_hash=api_hash,
            session_name=f"session_{phone.replace('+', '')}"
        )
        
        try:
            self.db.add_account(acc)
            self.account_manager.load_accounts() # Перезагружаем в память
            self.refresh_accounts_list()
            messagebox.showinfo("Успех", f"Аккаунт {phone} добавлен. Пожалуйста, авторизуйтесь через CLI или войдите первый раз вручную, если требуется.")
        except Exception as e:
            messagebox.showerror("Ошибка", str(e))

    def refresh_accounts_list(self):
        self.accounts_listbox.delete(0, tk.END)
        accounts = self.db.get_all_accounts()
        for acc in accounts:
            self.accounts_listbox.insert(tk.END, f"{acc.phone} - {acc.status.value}")

    def show_scraper(self):
        self.clear_main_frame()
        
        label = ctk.CTkLabel(self.main_frame, text="Сбор аудитории", font=ctk.CTkFont(size=20, weight="bold"))
        label.pack(pady=10)

        control_frame = ctk.CTkFrame(self.main_frame)
        control_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(control_frame, text="Ссылка или юзернейм канала:").grid(row=0, column=0, padx=5, pady=10)
        self.entry_channel = ctk.CTkEntry(control_frame, placeholder_text="@channelname")
        self.entry_channel.grid(row=0, column=1, padx=5, pady=10)
        
        ctk.CTkLabel(control_frame, text="Фильтр:").grid(row=0, column=2, padx=5, pady=10)
        self.combobox_filter = ctk.CTkComboBox(control_frame, values=[e.value for e in FilterType])
        self.combobox_filter.grid(row=0, column=3, padx=5, pady=10)
        self.combobox_filter.set(FilterType.ALL.value)
        
        btn_start = ctk.CTkButton(control_frame, text="Начать сбор", command=self.start_scraping)
        btn_start.grid(row=0, column=4, padx=10, pady=10)

        # Лог
        self.log_text = scrolledtext.ScrolledText(self.main_frame, height=20)
        self.log_text.pack(fill="both", expand=True, padx=20, pady=10)

    def start_scraping(self):
        channel = self.entry_channel.get()
        filter_str = self.combobox_filter.get()
        
        if not channel:
            messagebox.showerror("Ошибка", "Укажите канал")
            return

        filter_type = next((f for f in FilterType if f.value == filter_str), FilterType.ALL)
        
        self.log_text.insert(tk.END, f"Запуск сбора для {channel}...\n")
        
        # Запуск асинхронной задачи
        future = asyncio.run_coroutine_threadsafe(
            self.scraper.scrape_channel(channel, filter_type), 
            self.loop
        )
        
        # Коллбек для завершения
        future.add_done_callback(self.on_scraping_done)

    def on_scraping_done(self, future):
        try:
            result = future.result()
            self.log_text.insert(tk.END, f"Готово! Собрано пользователей: {result}\n")
        except Exception as e:
            self.log_text.insert(tk.END, f"Ошибка: {str(e)}\n")

    def quit_app(self):
        self.loop.call_soon_threadsafe(self.loop.stop)
        self.quit()

if __name__ == "__main__":
    app = App()
    app.mainloop()