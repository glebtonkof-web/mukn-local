"""
SIM Auto-Registration PRO - ADB SMS Handler
МУКН Enterprise AI Automation Platform

Модуль работы с ADB для получения SMS кодов:
- Определение подключенных устройств
- Чтение SMS с SIM-карт
- Извлечение кодов подтверждения
- Автоматический выбор SIM
"""

import asyncio
import re
import subprocess
import logging
import json
import os
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from config import SIMSlot, SIM_CARDS, ADB_DEVICE_ID, ADB_SMS_TIMEOUT, SMS_QUEUE_FILE

logger = logging.getLogger(__name__)


# ============================================================================
# МОДЕЛИ ДАННЫХ
# ============================================================================

@dataclass
class SMSMessage:
    """Модель SMS сообщения"""
    id: str
    address: str  # Номер отправителя
    body: str     # Текст сообщения
    date: datetime
    sim_slot: SIMSlot
    read: bool = False
    
    # Извлеченные данные
    code: Optional[str] = None
    service_name: Optional[str] = None


class SMSStatus(Enum):
    PENDING = "pending"
    RECEIVED = "received"
    TIMEOUT = "timeout"
    ERROR = "error"


@dataclass
class SMSRequest:
    """Запрос на ожидание SMS"""
    request_id: str
    sim_slot: SIMSlot
    expected_sender: Optional[str] = None
    expected_pattern: Optional[str] = None
    created_at: datetime
    status: SMSStatus = SMSStatus.PENDING
    message: Optional[SMSMessage] = None


# ============================================================================
# ADB MANAGER
# ============================================================================

class ADBManager:
    """Менеджер ADB для работы с Android устройством"""
    
    def __init__(self, device_id: str = None):
        self.device_id = device_id or ADB_DEVICE_ID
        self._connected = False
        self._device_info = {}
    
    async def check_adb_installed(self) -> bool:
        """Проверка установки ADB"""
        try:
            result = await self._run_adb_command(["version"])
            return "Android Debug Bridge" in result
        except Exception as e:
            logger.error(f"ADB not found: {e}")
            return False
    
    async def get_devices(self) -> List[Dict[str, str]]:
        """Получение списка подключенных устройств"""
        try:
            result = await self._run_adb_command(["devices", "-l"])
            devices = []
            
            for line in result.strip().split('\n')[1:]:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:
                        device_id = parts[0]
                        status = parts[1]
                        
                        device_info = {
                            "id": device_id,
                            "status": status,
                            "model": "",
                            "product": ""
                        }
                        
                        # Парсим дополнительную информацию
                        for part in parts[2:]:
                            if ':' in part:
                                key, value = part.split(':', 1)
                                device_info[key] = value
                        
                        devices.append(device_info)
            
            return devices
            
        except Exception as e:
            logger.error(f"Failed to get devices: {e}")
            return []
    
    async def connect(self) -> bool:
        """Подключение к устройству"""
        devices = await self.get_devices()
        
        if not devices:
            logger.error("No ADB devices found. Please connect your device.")
            return False
        
        # Если device_id не указан, берем первое доступное
        if not self.device_id:
            for device in devices:
                if device["status"] == "device":
                    self.device_id = device["id"]
                    break
        
        if not self.device_id:
            logger.error("No authorized device found")
            return False
        
        self._connected = True
        
        # Получаем информацию об устройстве
        self._device_info = await self.get_device_info()
        logger.info(f"Connected to device: {self.device_id}")
        logger.info(f"Device info: {self._device_info}")
        
        return True
    
    async def get_device_info(self) -> Dict[str, str]:
        """Получение информации об устройстве"""
        info = {}
        
        try:
            # Модель
            model = await self._run_adb_shell(["getprop", "ro.product.model"])
            info["model"] = model.strip()
            
            # Производитель
            manufacturer = await self._run_adb_shell(["getprop", "ro.product.manufacturer"])
            info["manufacturer"] = manufacturer.strip()
            
            # Версия Android
            version = await self._run_adb_shell(["getprop", "ro.build.version.release"])
            info["android_version"] = version.strip()
            
            # IMEI (требует root на некоторых устройствах)
            try:
                imei = await self._run_adb_shell(["service", "call", "iphonesubinfo", "1"])
                info["imei"] = imei.strip()
            except:
                info["imei"] = "unknown"
            
        except Exception as e:
            logger.error(f"Failed to get device info: {e}")
        
        return info
    
    async def _run_adb_command(self, args: List[str], timeout: int = 30) -> str:
        """Выполнение ADB команды"""
        cmd = ["adb"] + args
        if self.device_id and "devices" not in args:
            cmd = ["adb", "-s", self.device_id] + args
        
        logger.debug(f"Running ADB command: {' '.join(cmd)}")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            if process.returncode != 0:
                raise Exception(f"ADB command failed: {stderr.decode()}")
            
            return stdout.decode('utf-8', errors='ignore')
            
        except asyncio.TimeoutError:
            process.kill()
            raise Exception("ADB command timeout")
    
    async def _run_adb_shell(self, args: List[str], timeout: int = 30) -> str:
        """Выполнение ADB shell команды"""
        return await self._run_adb_command(["shell"] + args, timeout)


# ============================================================================
# SMS READER
# ============================================================================

class SMSReader:
    """Читатель SMS с Android устройства"""
    
    # Паттерны для извлечения кодов подтверждения
    CODE_PATTERNS = [
        # Стандартные форматы
        r'(?:код|code|Код|Code|КОД|CODE)[:\s]*(\d{4,8})',
        r'(?:verify|verification|подтверждение)[:\s]*(\d{4,8})',
        r'(?:PIN|Pin|pin)[:\s]*(\d{4,8})',
        r'(?:пароль|password)[:\s]*(\d{4,8})',
        
        # Ссылки с кодом
        r'(?:code|код)[/=:](\d{4,8})',
        
        # Просто код в сообщении
        r'\b(\d{4,8})\b',
    ]
    
    # Известные отправители сервисов
    SERVICE_SENDERS = {
        # Российские сервисы
        "YouTube": ["Google", "GOOGLE", "Google", "23456"],
        "TikTok": ["TikTok", "TIKTOK", "TikTok"],
        "Instagram": ["Instagram", "INSTAGRAM", "Facebook"],
        "Twitter": ["Twitter", "TWITTER", "X"],
        "Facebook": ["Facebook", "FB", "FACEBOOK"],
        "VK": ["VK", "ВК", "VKontakte", "ВКонтакте"],
        "OK": ["OK", "OK.ru", "Odnoklassniki"],
        "Telegram": ["Telegram", "TELEGRAM"],
        "WhatsApp": ["WhatsApp", "WHATSAPP"],
        "Tinder": ["Tinder", "TINDER"],
        "Discord": ["Discord", "DISCORD"],
        
        # Короткие номера
        "Google": ["Google", "GOOGLE"],
        "Generic": ["INFO", "INFO", "SERVICE", "NOTICE"],
    }
    
    def __init__(self, adb: ADBManager):
        self.adb = adb
        self._last_sms_id = {}
    
    async def get_sms_list(
        self,
        sim_slot: SIMSlot = None,
        limit: int = 50,
        unread_only: bool = False
    ) -> List[SMSMessage]:
        """
        Получение списка SMS с устройства
        
        Args:
            sim_slot: Слот SIM-карты (если None - все)
            limit: Максимальное количество SMS
            unread_only: Только непрочитанные
            
        Returns:
            Список SMS сообщений
        """
        try:
            # Формируем запрос к content provider
            # Требует разрешения READ_SMS на устройстве
            
            projection = "_id,address,body,date,sim_id,read"
            selection = ""
            
            if unread_only:
                selection = "read=0"
            
            # Получаем SMS через content query
            query = f"content://sms/inbox"
            
            result = await self.adb._run_adb_shell([
                "content", "query",
                "--uri", query,
                "--projection", projection,
                *(["--where", selection] if selection else []),
                "--sort", "date DESC"
            ])
            
            messages = self._parse_sms_result(result, sim_slot)
            
            return messages[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get SMS list: {e}")
            # Альтернативный метод через dumpsys
            return await self._get_sms_via_dumpsys(sim_slot, limit)
    
    async def _get_sms_via_dumpsys(
        self,
        sim_slot: SIMSlot = None,
        limit: int = 50
    ) -> List[SMSMessage]:
        """Альтернативный метод получения SMS через dumpsys"""
        try:
            # Используем service call isms
            result = await self.adb._run_adb_shell([
                "dumpsys", "isms"
            ])
            
            messages = []
            # Парсим вывод dumpsys
            # Формат зависит от версии Android
            
            # Это упрощенный парсер
            current_sms = {}
            
            for line in result.split('\n'):
                line = line.strip()
                
                if 'sms:' in line.lower() or 'SMS:' in line:
                    if current_sms and 'body' in current_sms:
                        messages.append(self._create_sms_from_dict(current_sms))
                    current_sms = {}
                
                # Пытаемся извлечь данные
                if 'address=' in line:
                    match = re.search(r'address=([^\s,]+)', line)
                    if match:
                        current_sms['address'] = match.group(1)
                
                if 'body=' in line or 'text=' in line:
                    match = re.search(r'(?:body|text)=([^\n]+)', line)
                    if match:
                        current_sms['body'] = match.group(1)
            
            if current_sms and 'body' in current_sms:
                messages.append(self._create_sms_from_dict(current_sms))
            
            return messages[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get SMS via dumpsys: {e}")
            return []
    
    def _parse_sms_result(
        self,
        result: str,
        sim_slot: SIMSlot = None
    ) -> List[SMSMessage]:
        """Парсинг результата запроса SMS"""
        messages = []
        
        for line in result.strip().split('\n'):
            if not line.strip():
                continue
            
            try:
                # Формат: _id=1, address=+79001234567, body=Code: 1234, date=1234567890, sim_id=0, read=1
                data = {}
                
                for part in line.split(','):
                    if '=' in part:
                        key, value = part.split('=', 1)
                        data[key.strip()] = value.strip()
                
                if 'body' not in data:
                    continue
                
                # Определяем слот SIM
                sim_id = int(data.get('sim_id', 0))
                message_sim_slot = SIMSlot(sim_id)
                
                # Фильтруем по слоту если нужно
                if sim_slot and message_sim_slot != sim_slot:
                    continue
                
                # Создаем сообщение
                sms = SMSMessage(
                    id=data.get('_id', ''),
                    address=data.get('address', ''),
                    body=data.get('body', ''),
                    date=datetime.fromtimestamp(int(data.get('date', 0)) / 1000),
                    sim_slot=message_sim_slot,
                    read=data.get('read', '1') == '1'
                )
                
                # Извлекаем код
                sms.code, sms.service_name = self._extract_code(sms.body, sms.address)
                
                messages.append(sms)
                
            except Exception as e:
                logger.debug(f"Failed to parse SMS line: {e}")
                continue
        
        return messages
    
    def _create_sms_from_dict(self, data: dict) -> SMSMessage:
        """Создание SMSMessage из словаря"""
        body = data.get('body', '')
        address = data.get('address', '')
        
        code, service_name = self._extract_code(body, address)
        
        return SMSMessage(
            id=data.get('id', ''),
            address=address,
            body=body,
            date=datetime.now(),
            sim_slot=SIMSlot.SIM_0,
            code=code,
            service_name=service_name
        )
    
    def _extract_code(
        self,
        body: str,
        sender: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Извлечение кода подтверждения из SMS
        
        Args:
            body: Текст SMS
            sender: Номер отправителя
            
        Returns:
            (код, название сервиса)
        """
        # Извлекаем код
        code = None
        for pattern in self.CODE_PATTERNS:
            match = re.search(pattern, body, re.IGNORECASE)
            if match:
                code = match.group(1)
                break
        
        # Определяем сервис
        service_name = None
        body_lower = body.lower()
        
        for service, keywords in self.SERVICE_SENDERS.items():
            for keyword in keywords:
                if keyword.lower() in body_lower or keyword.lower() in sender.lower():
                    service_name = service
                    break
            if service_name:
                break
        
        return code, service_name
    
    async def wait_for_sms(
        self,
        sim_slot: SIMSlot,
        expected_sender: str = None,
        expected_pattern: str = None,
        timeout: int = ADB_SMS_TIMEOUT,
        poll_interval: float = 2.0
    ) -> Optional[SMSMessage]:
        """
        Ожидание SMS с кодом подтверждения
        
        Args:
            sim_slot: Слот SIM-карты
            expected_sender: Ожидаемый отправитель (часть имени или номера)
            expected_pattern: Паттерн для поиска кода
            timeout: Таймаут в секундах
            poll_interval: Интервал опроса
            
        Returns:
            SMS сообщение или None при таймауте
        """
        logger.info(f"Waiting for SMS on {sim_slot.name}...")
        
        # Запоминаем время начала
        start_time = datetime.now()
        last_sms_ids = set()
        
        # Получаем текущие SMS чтобы не обрабатывать старые
        current_sms = await self.get_sms_list(sim_slot, limit=10)
        for sms in current_sms:
            last_sms_ids.add(sms.id)
        
        while (datetime.now() - start_time).total_seconds() < timeout:
            # Получаем новые SMS
            messages = await self.get_sms_list(sim_slot, limit=10)
            
            for sms in messages:
                # Пропускаем уже обработанные
                if sms.id in last_sms_ids:
                    continue
                
                # Проверяем отправителя
                if expected_sender:
                    if expected_sender.lower() not in sms.address.lower() and \
                       expected_sender.lower() not in sms.body.lower():
                        continue
                
                # Если нашли код - возвращаем
                if sms.code:
                    logger.info(f"SMS received: {sms.body[:50]}...")
                    return sms
                
                # Если указан паттерн - проверяем
                if expected_pattern:
                    match = re.search(expected_pattern, sms.body, re.IGNORECASE)
                    if match:
                        sms.code = match.group(1) if match.groups() else match.group(0)
                        logger.info(f"SMS received with matching pattern")
                        return sms
                
                # Иначе возвращаем любое новое сообщение с возможным кодом
                if re.search(r'\d{4,8}', sms.body):
                    logger.info(f"SMS received (potential code): {sms.body[:50]}...")
                    return sms
                
                last_sms_ids.add(sms.id)
            
            # Ждем перед следующим опросом
            await asyncio.sleep(poll_interval)
        
        logger.warning(f"SMS wait timeout on {sim_slot.name}")
        return None
    
    async def get_last_code(
        self,
        sim_slot: SIMSlot,
        within_seconds: int = 300
    ) -> Optional[str]:
        """
        Получение последнего полученного кода
        
        Args:
            sim_slot: Слот SIM-карты
            within_seconds: Искать в течение N секунд
            
        Returns:
            Код подтверждения или None
        """
        cutoff_time = datetime.now() - timedelta(seconds=within_seconds)
        
        messages = await self.get_sms_list(sim_slot, limit=20)
        
        for sms in messages:
            if sms.date > cutoff_time and sms.code:
                return sms.code
        
        return None


# ============================================================================
# SMS MANAGER (HIGH-LEVEL API)
# ============================================================================

class SMSManager:
    """Высокоуровневый менеджер SMS"""
    
    def __init__(self):
        self.adb = ADBManager()
        self.reader: Optional[SMSReader] = None
        self._initialized = False
        self._pending_requests: Dict[str, SMSRequest] = {}
    
    async def initialize(self) -> bool:
        """Инициализация менеджера"""
        logger.info("Initializing SMS Manager...")
        
        # Проверяем ADB
        if not await self.adb.check_adb_installed():
            logger.error("ADB is not installed or not in PATH")
            return False
        
        # Подключаемся к устройству
        if not await self.adb.connect():
            logger.error("Failed to connect to ADB device")
            return False
        
        self.reader = SMSReader(self.adb)
        self._initialized = True
        
        logger.info("SMS Manager initialized successfully")
        return True
    
    async def wait_for_code(
        self,
        sim_slot: SIMSlot,
        service_name: str = None,
        timeout: int = ADB_SMS_TIMEOUT
    ) -> Optional[str]:
        """
        Ожидание кода подтверждения для сервиса
        
        Args:
            sim_slot: Слот SIM-карты
            service_name: Название сервиса (для фильтрации)
            timeout: Таймаут
            
        Returns:
            Код подтверждения или None
        """
        if not self._initialized:
            await self.initialize()
        
        logger.info(f"Waiting for SMS code for {service_name or 'any service'} on {sim_slot.name}")
        
        # Формируем паттерн отправителя
        expected_sender = service_name if service_name else None
        
        sms = await self.reader.wait_for_sms(
            sim_slot=sim_slot,
            expected_sender=expected_sender,
            timeout=timeout
        )
        
        if sms and sms.code:
            logger.info(f"Received code: {sms.code}")
            return sms.code
        
        return None
    
    async def get_recent_codes(
        self,
        sim_slot: SIMSlot = None,
        limit: int = 10
    ) -> List[Dict]:
        """Получение последних кодов"""
        if not self._initialized:
            await self.initialize()
        
        messages = await self.reader.get_sms_list(sim_slot, limit=limit)
        
        return [
            {
                "code": sms.code,
                "service": sms.service_name,
                "sender": sms.address,
                "body": sms.body,
                "date": sms.date.isoformat(),
                "sim_slot": sms.sim_slot.name
            }
            for sms in messages if sms.code
        ]
    
    async def get_sim_info(self, sim_slot: SIMSlot) -> Dict:
        """Получение информации о SIM-карте"""
        if not self._initialized:
            await self.initialize()
        
        config = SIM_CARDS.get(sim_slot)
        
        return {
            "slot": sim_slot.name,
            "phone_number": f"+7{config.phone_number}" if config else None,
            "active": config.is_active if config else False,
            "registrations_today": config.registrations_today if config else 0
        }
    
    async def health_check(self) -> Dict:
        """Проверка состояния SMS менеджера"""
        result = {
            "adb_installed": False,
            "device_connected": False,
            "device_info": {},
            "sim_cards": [],
            "recent_sms": 0
        }
        
        try:
            result["adb_installed"] = await self.adb.check_adb_installed()
            
            if result["adb_installed"]:
                devices = await self.adb.get_devices()
                result["device_connected"] = len(devices) > 0
                
                if result["device_connected"]:
                    result["device_info"] = self.adb._device_info
                    
                    # Получаем информацию о SIM
                    for slot in SIMSlot:
                        result["sim_cards"].append(await self.get_sim_info(slot))
                    
                    # Считаем недавние SMS
                    if self.reader:
                        messages = await self.reader.get_sms_list(limit=100)
                        result["recent_sms"] = len(messages)
        
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            result["error"] = str(e)
        
        return result


# ============================================================================
# СИНХРОННЫЕ ФУНКЦИИ ДЛЯ ПРОСТОГО ИСПОЛЬЗОВАНИЯ
# ============================================================================

def run_async(coro):
    """Запуск асинхронной функции в синхронном контексте"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)


def wait_for_sms_code(
    sim_slot: SIMSlot,
    service_name: str = None,
    timeout: int = 300
) -> Optional[str]:
    """
    Синхронная функция для ожидания SMS кода
    
    Args:
        sim_slot: SIMSlot.SIM_0 или SIMSlot.SIM_1
        service_name: Название сервиса
        timeout: Таймаут в секундах
        
    Returns:
        Код подтверждения или None
    """
    async def _wait():
        manager = SMSManager()
        if await manager.initialize():
            return await manager.wait_for_code(sim_slot, service_name, timeout)
        return None
    
    return run_async(_wait())


# ============================================================================
# CLI
# ============================================================================

async def cli_main():
    """CLI для тестирования SMS менеджера"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SMS Manager CLI")
    parser.add_argument("--check", action="store_true", help="Health check")
    parser.add_argument("--list", action="store_true", help="List recent SMS")
    parser.add_argument("--wait", type=int, help="Wait for SMS on SIM (0 or 1)")
    parser.add_argument("--service", type=str, help="Service name to wait for")
    
    args = parser.parse_args()
    
    manager = SMSManager()
    
    if args.check:
        result = await manager.health_check()
        print(json.dumps(result, indent=2, default=str))
    
    elif args.list:
        if await manager.initialize():
            codes = await manager.get_recent_codes(limit=20)
            print(json.dumps(codes, indent=2, default=str))
    
    elif args.wait is not None:
        sim_slot = SIMSlot(args.wait)
        if await manager.initialize():
            code = await manager.wait_for_code(sim_slot, args.service)
            print(f"Code: {code}" if code else "Timeout")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    asyncio.run(cli_main())


# ============================================================================
# ЭКСПОРТ
# ============================================================================

__all__ = [
    'ADBManager',
    'SMSReader',
    'SMSManager',
    'SMSMessage',
    'SMSRequest',
    'SMSStatus',
    'wait_for_sms_code',
    'run_async',
]
