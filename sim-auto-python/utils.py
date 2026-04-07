"""
SIM Auto-Registration PRO - Utilities Module
Функции имитации человека и работы с ADB для антидетекта
"""

import asyncio
import random
import subprocess
import re
import time
import json
import os
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any
from playwright.async_api import Page, BrowserContext


# =============================================================================
# КОНСТАНТЫ АНТИДЕТЕКТА
# =============================================================================

# Минимальные и максимальные задержки для разных действий
DELAY_CONFIG = {
    'page_load': (2, 5),
    'click': (0.3, 1.0),
    'typing_char': (0.02, 0.12),
    'form_field': (0.5, 2.0),
    'scroll': (0.3, 1.5),
    'mouse_move': (0.05, 0.15),
    'between_actions': (1, 3),
    'between_services': (180, 360),  # 3-6 минут между сервисами
    'before_submit': (1, 3),
    'after_submit': (2, 5),
}

# User-Agent для мобильных и десктопов
USER_AGENTS_MOBILE = [
    "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
]

USER_AGENTS_DESKTOP = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

# Русские имена и фамилии для генерации профилей
RUSSIAN_FIRST_NAMES_MALE = [
    'Александр', 'Дмитрий', 'Максим', 'Артём', 'Иван', 'Михаил', 'Никита', 'Егор',
    'Андрей', 'Илья', 'Алексей', 'Роман', 'Владимир', 'Павел', 'Константин', 'Арсений',
    'Денис', 'Владислав', 'Сергей', 'Николай', 'Виктор', 'Олег', 'Даниил', 'Кирилл'
]

RUSSIAN_FIRST_NAMES_FEMALE = [
    'Анастасия', 'Мария', 'Анна', 'Елена', 'Ольга', 'Наталья', 'Екатерина', 'Дарья',
    'Юлия', 'Татьяна', 'Ирина', 'Светлана', 'Александра', 'Виктория', 'Ксения', 'Полина',
    'Алиса', 'Марина', 'София', 'Варвара', 'Вероника', 'Кристина', 'Валерия', 'Елизавета'
]

RUSSIAN_LAST_NAMES = [
    'Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов',
    'Новиков', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров',
    'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров', 'Никитин'
]

RUSSIAN_CITIES = [
    'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород',
    'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону', 'Уфа', 'Красноярск', 'Пермь', 'Воронеж'
]


# =============================================================================
# ФУНКЦИИ ИМИТАЦИИ ЧЕЛОВЕКА
# =============================================================================

async def human_delay(min_sec: float = None, max_sec: float = None, action: str = 'between_actions') -> None:
    """
    Человекоподобная задержка с нормальным распределением
    
    Args:
        min_sec: Минимальная задержка (если None, берётся из DELAY_CONFIG)
        max_sec: Максимальная задержка (если None, берётся из DELAY_CONFIG)
        action: Тип действия для выбора из конфига
    """
    if min_sec is None or max_sec is None:
        min_sec, max_sec = DELAY_CONFIG.get(action, (0.5, 2.0))
    
    # Нормальное распределение с центром в середине диапазона
    mean = (min_sec + max_sec) / 2
    std = (max_sec - min_sec) / 4
    
    delay = random.gauss(mean, std)
    delay = max(min_sec, min(max_sec, delay))  # Ограничиваем диапазон
    
    await asyncio.sleep(delay)


async def human_mouse_move(page: Page, target_x: int, target_y: int, steps: int = None) -> None:
    """
    Движение мыши по кривой Безье (человекоподобное)
    
    Args:
        page: Страница Playwright
        target_x: Целевая координата X
        target_y: Целевая координата Y
        steps: Количество шагов (если None, случайно)
    """
    if steps is None:
        steps = random.randint(15, 30)
    
    # Получаем текущую позицию мыши (приблизительно)
    try:
        current_pos = await page.evaluate('() => ({ x: window.mouseX || 0, y: window.mouseY || 0 })')
        start_x, start_y = current_pos['x'], current_pos['y']
    except:
        start_x, start_y = random.randint(100, 500), random.randint(100, 500)
    
    # Контрольные точки для кривой Безье
    ctrl_x = random.uniform(min(start_x, target_x), max(start_x, target_x))
    ctrl_y = random.uniform(min(start_y, target_y), max(start_y, target_y))
    
    # Добавляем случайное отклонение для естественности
    ctrl_x += random.uniform(-50, 50)
    ctrl_y += random.uniform(-50, 50)
    
    for i in range(steps + 1):
        t = i / steps
        
        # Квадратичная кривая Безье
        x = (1 - t) ** 2 * start_x + 2 * (1 - t) * t * ctrl_x + t ** 2 * target_x
        y = (1 - t) ** 2 * start_y + 2 * (1 - t) * t * ctrl_y + t ** 2 * target_y
        
        await page.mouse.move(x, y)
        await human_delay(0.01, 0.05, action='mouse_move')


async def human_click(page: Page, selector: str, timeout: int = 10000) -> bool:
    """
    Человекоподобный клик с движением мыши
    
    Args:
        page: Страница Playwright
        selector: CSS селектор элемента
        timeout: Таймаут ожидания элемента
    
    Returns:
        True если клик успешен
    """
    try:
        # Ждём появления элемента
        element = await page.wait_for_selector(selector, timeout=timeout)
        if not element:
            return False
        
        # Получаем позицию элемента
        box = await element.bounding_box()
        if not box:
            return False
        
        # Вычисляем точку клика с небольшим случайным смещением
        target_x = box['x'] + box['width'] / 2 + random.uniform(-5, 5)
        target_y = box['y'] + box['height'] / 2 + random.uniform(-5, 5)
        
        # Двигаем мышь к элементу
        await human_mouse_move(page, target_x, target_y)
        
        # Небольшая пауза перед кликом
        await human_delay(action='click')
        
        # Кликаем
        await page.mouse.click(target_x, target_y)
        
        # Пауза после клика
        await human_delay(0.2, 0.8)
        
        return True
    except Exception as e:
        print(f"[!] Ошибка клика {selector}: {e}")
        return False


async def human_typing(page: Page, selector: str, text: str, clear_first: bool = True) -> bool:
    """
    Человекоподобный ввод текста
    
    Args:
        page: Страница Playwright
        selector: CSS селектор поля ввода
        text: Текст для ввода
        clear_first: Очистить поле перед вводом
    
    Returns:
        True если ввод успешен
    """
    try:
        # Кликаем на поле
        clicked = await human_click(page, selector)
        if not clicked:
            return False
        
        # Очищаем поле если нужно
        if clear_first:
            await page.keyboard.press('Control+A')
            await page.keyboard.press('Backspace')
            await human_delay(0.2, 0.5)
        
        # Вводим текст посимвольно
        for i, char in enumerate(text):
            await page.keyboard.type(char)
            
            # Случайная задержка между символами
            base_delay = DELAY_CONFIG['typing_char']
            delay = random.uniform(*base_delay)
            
            # Иногда делаем более длинные паузы (как будто думаем)
            if random.random() < 0.05:
                delay += random.uniform(0.3, 1.0)
            
            await asyncio.sleep(delay)
        
        return True
    except Exception as e:
        print(f"[!] Ошибка ввода в {selector}: {e}")
        return False


async def random_scroll(page: Page, scrolls: int = None) -> None:
    """
    Случайная прокрутка страницы для имитации чтения
    
    Args:
        page: Страница Playwright
        scrolls: Количество прокруток (если None, случайно)
    """
    if scrolls is None:
        scrolls = random.randint(1, 5)
    
    for _ in range(scrolls):
        # Случайное направление и дистанция
        direction = random.choice([1, 1, 1, -1])  # Чаще вниз
        distance = random.randint(100, 400)
        
        # Прокрутка с плавным движением
        delta_y = direction * distance
        await page.mouse.wheel(0, delta_y)
        
        await human_delay(action='scroll')


async def random_mouse_movement(page: Page, movements: int = None) -> None:
    """
    Случайные движения мышью по странице
    
    Args:
        page: Страница Playwright
        movements: Количество движений
    """
    if movements is None:
        movements = random.randint(2, 6)
    
    # Получаем размер viewport
    viewport = page.viewport_size or {'width': 1920, 'height': 1080}
    
    for _ in range(movements):
        # Случайная точка на странице
        x = random.randint(50, viewport['width'] - 50)
        y = random.randint(50, viewport['height'] - 50)
        
        await human_mouse_move(page, x, y)
        await human_delay(0.1, 0.5)


async def simulate_reading(page: Page, seconds: float = None) -> None:
    """
    Имитация чтения страницы
    
    Args:
        page: Страница Playwright
        seconds: Длительность чтения в секундах
    """
    if seconds is None:
        seconds = random.uniform(3, 10)
    
    start_time = time.time()
    
    while time.time() - start_time < seconds:
        # Случайное действие
        action = random.random()
        
        if action < 0.4:
            await random_scroll(page, 1)
        elif action < 0.7:
            await random_mouse_movement(page, 1)
        else:
            await human_delay(0.5, 2)


# =============================================================================
# ADB ФУНКЦИИ ДЛЯ ЧТЕНИЯ SMS
# =============================================================================

class ADBClient:
    """Клиент для работы с ADB (Android Debug Bridge)"""
    
    def __init__(self, device_id: str = None):
        """
        Args:
            device_id: ID устройства ADB (если None, берётся первое)
        """
        self.device_id = device_id
        self._connected = False
    
    def _run_adb(self, command: str, timeout: int = 30) -> Tuple[bool, str]:
        """Выполнение ADB команды"""
        try:
            if self.device_id:
                full_cmd = f"adb -s {self.device_id} {command}"
            else:
                full_cmd = f"adb {command}"
            
            result = subprocess.run(
                full_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return result.returncode == 0, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return False, "Timeout"
        except Exception as e:
            return False, str(e)
    
    def list_devices(self) -> List[Dict[str, str]]:
        """Получение списка подключённых устройств"""
        success, output = self._run_adb("devices -l")
        if not success:
            return []
        
        devices = []
        lines = output.strip().split('\n')[1:]  # Пропускаем заголовок
        
        for line in lines:
            if not line.strip():
                continue
            
            parts = line.split()
            if len(parts) >= 2:
                devices.append({
                    'id': parts[0],
                    'status': parts[1],
                    'info': ' '.join(parts[2:]) if len(parts) > 2 else ''
                })
        
        return devices
    
    def connect(self) -> bool:
        """Подключение к устройству"""
        if self.device_id is None:
            devices = self.list_devices()
            if not devices:
                print("[!] Нет подключённых ADB устройств")
                return False
            self.device_id = devices[0]['id']
        
        success, _ = self._run_adb("wait-for-device")
        self._connected = success
        return success
    
    def get_device_info(self) -> Dict[str, str]:
        """Получение информации об устройстве"""
        info = {}
        
        commands = {
            'model': 'getprop ro.product.model',
            'brand': 'getprop ro.product.brand',
            'android': 'getprop ro.build.version.release',
            'imei': 'service call iphonesubinfo 1',
            'phone1': 'service call iphonesubinfo 15',
            'phone2': 'service call iphonesubinfo 16',
        }
        
        for key, cmd in commands.items():
            success, output = self._run_adb(f"shell {cmd}")
            if success:
                info[key] = output.strip()
        
        return info
    
    def read_sms(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Чтение SMS с устройства
        
        Args:
            limit: Максимальное количество SMS
        
        Returns:
            Список SMS сообщений
        """
        # Команда для чтения SMS через content provider
        cmd = f"shell content query --uri content://sms/inbox --projection address:body:date --sort \"date DESC LIMIT {limit}\""
        
        success, output = self._run_adb(cmd, timeout=10)
        if not success:
            return []
        
        messages = []
        lines = output.strip().split('\n')
        
        for line in lines:
            if not line.strip():
                continue
            
            # Парсинг строки SMS
            msg = self._parse_sms_line(line)
            if msg:
                messages.append(msg)
        
        return messages
    
    def _parse_sms_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Парсинг строки SMS из content query"""
        try:
            msg = {}
            
            # Извлекаем address (отправитель)
            address_match = re.search(r'address=([^\s,]+)', line)
            if address_match:
                msg['sender'] = address_match.group(1)
            
            # Извлекаем body (текст сообщения)
            body_match = re.search(r'body=(.+?)(?:,|$)', line)
            if body_match:
                msg['body'] = body_match.group(1).strip()
            
            # Извлекаем date
            date_match = re.search(r'date=(\d+)', line)
            if date_match:
                timestamp = int(date_match.group(1)) / 1000
                msg['timestamp'] = datetime.fromtimestamp(timestamp)
            
            if 'body' in msg:
                return msg
            return None
        except:
            return None
    
    def wait_for_sms_code(self, timeout: int = 180, keywords: List[str] = None) -> Optional[str]:
        """
        Ожидание SMS с кодом подтверждения
        
        Args:
            timeout: Таймаут ожидания в секундах
            keywords: Ключевые слова для поиска (['Telegram', 'TikTok', etc.])
        
        Returns:
            Код подтверждения или None
        """
        if keywords is None:
            keywords = []
        
        start_time = time.time()
        check_interval = 3
        seen_bodies = set()
        
        # Сначала читаем текущие SMS чтобы не повторять
        current_sms = self.read_sms(5)
        for msg in current_sms:
            seen_bodies.add(msg.get('body', ''))
        
        print(f"[*] Ожидание SMS кода (таймаут: {timeout}с)...")
        
        while time.time() - start_time < timeout:
            messages = self.read_sms(10)
            
            for msg in messages:
                body = msg.get('body', '')
                
                # Пропускаем уже виденные
                if body in seen_bodies:
                    continue
                seen_bodies.add(body)
                
                # Проверяем ключевые слова
                if keywords:
                    body_lower = body.lower()
                    if not any(kw.lower() in body_lower for kw in keywords):
                        continue
                
                # Ищем код в сообщении
                code = self._extract_code(body)
                if code:
                    print(f"[+] Получен SMS код: {code}")
                    return code
            
            time.sleep(check_interval)
        
        print("[!] Таймаут ожидания SMS")
        return None
    
    def _extract_code(self, text: str) -> Optional[str]:
        """Извлечение кода из текста SMS"""
        # Паттерны для разных форматов кодов
        patterns = [
            r'(?:код|code|verify|pin)[:\s]*(\d{4,6})',
            r'(\d{4,6})\s*(?:код|code)',
            r'>(\d{4,6})<',
            r'\b(\d{6})\b',  # 6-значный код
            r'\b(\d{4})\b',  # 4-значный код
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                code = match.group(1)
                # Проверяем что это не часть номера телефона
                if len(code) >= 4 and len(code) <= 6:
                    return code
        
        return None
    
    def get_sim_info(self) -> List[Dict[str, str]]:
        """Получение информации о SIM картах"""
        sim_cards = []
        
        # Получаем информацию о SIM через service call или getprop
        for slot in range(2):  # Обычно 2 SIM слота
            info = {'slot': slot}
            
            # Номер телефона (не всегда доступен)
            cmd = f"shell service call iphonesubinfo {15 + slot}"
            success, output = self._run_adb(cmd)
            if success and output:
                # Парсим номер из ответа
                phone_match = re.search(r'(\+?\d{10,15})', output)
                if phone_match:
                    info['phone'] = phone_match.group(1)
            
            # Оператор
            cmd = f"shell getprop gsm.sim.operator.alpha.{slot}"
            success, output = self._run_adb(cmd)
            if success and output.strip():
                info['operator'] = output.strip()
            
            sim_cards.append(info)
        
        return sim_cards


# =============================================================================
# ГЕНЕРАЦИЯ ПРОФИЛЕЙ
# =============================================================================

def generate_profile(platform: str, phone: str = None) -> Dict[str, str]:
    """
    Генерация профиля пользователя для регистрации
    
    Args:
        platform: Платформа для которой создаётся профиль
        phone: Номер телефона
    
    Returns:
        Словарь с данными профиля
    """
    gender = random.choice(['male', 'female'])
    
    if gender == 'male':
        first_name = random.choice(RUSSIAN_FIRST_NAMES_MALE)
        last_name = random.choice(RUSSIAN_LAST_NAMES)
    else:
        first_name = random.choice(RUSSIAN_FIRST_NAMES_FEMALE)
        last_name = random.choice(RUSSIAN_LAST_NAMES) + 'а'
    
    # Генерация username
    username_bases = [
        f"{first_name.lower()}.{last_name.lower()}",
        f"{first_name.lower()}_{last_name.lower()}",
        f"{first_name.lower()}{random.randint(100, 9999)}",
        f"{first_name.lower()}{last_name.lower()[:3]}{random.randint(10, 99)}",
    ]
    username = random.choice(username_bases)
    
    # Генерация email
    domains = ['gmail.com', 'mail.ru', 'yandex.ru', 'outlook.com', 'rambler.ru']
    email = f"{first_name.lower()}.{last_name.lower()}{random.randint(100, 9999)}@{random.choice(domains)}"
    
    # Пароль
    password = generate_password()
    
    # Дата рождения (18-45 лет)
    year = random.randint(1980, 2006)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    
    profile = {
        'first_name': first_name,
        'last_name': last_name,
        'username': username,
        'email': email,
        'password': password,
        'gender': gender,
        'birth_day': day,
        'birth_month': month,
        'birth_year': year,
        'city': random.choice(RUSSIAN_CITIES),
        'phone': phone,
        'platform': platform,
        'created_at': datetime.now().isoformat(),
    }
    
    return profile


def generate_password(length: int = 12) -> str:
    """Генерация надёжного пароля"""
    import string
    
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = '!@#$%^&*'
    
    # Гарантируем наличие каждого типа символов
    password = [
        random.choice(lowercase),
        random.choice(uppercase),
        random.choice(digits),
        random.choice(special),
    ]
    
    # Добавляем остальные символы
    all_chars = lowercase + uppercase + digits + special
    for _ in range(length - 4):
        password.append(random.choice(all_chars))
    
    # Перемешиваем
    random.shuffle(password)
    return ''.join(password)


# =============================================================================
# БЫЗОВАЯ КОНФИГУРАЦИЯ БРАУЗЕРА
# =============================================================================

async def create_stealth_context(browser, platform: str = 'desktop', proxy: Dict = None) -> BrowserContext:
    """
    Создание stealth контекста браузера с антидетектом
    
    Args:
        browser: Экземпляр браузера Playwright
        platform: 'desktop' или 'mobile'
        proxy: Конфигурация прокси {'server': '', 'username': '', 'password': ''}
    
    Returns:
        BrowserContext с антидетектом
    """
    # Выбор User-Agent
    if platform == 'mobile':
        user_agent = random.choice(USER_AGENTS_MOBILE)
        viewport = {'width': random.randint(360, 420), 'height': random.randint(700, 900)}
    else:
        user_agent = random.choice(USER_AGENTS_DESKTOP)
        viewport = {'width': random.randint(1280, 1920), 'height': random.randint(720, 1080)}
    
    # Настройки контекста
    context_options = {
        'user_agent': user_agent,
        'viewport': viewport,
        'locale': 'ru-RU',
        'timezone_id': 'Europe/Moscow',
        'geolocation': {'latitude': 55.7558, 'longitude': 37.6173},  # Москва
        'permissions': ['geolocation'],
    }
    
    # Добавляем прокси если указано
    if proxy:
        context_options['proxy'] = proxy
    
    context = await browser.new_context(**context_options)
    
    # Инъекция антидетект скриптов
    await context.add_init_script("""
        // Скрываем webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        
        // Модифицируем plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' }
            ]
        });
        
        // Модифицируем languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['ru-RU', 'ru', 'en-US', 'en']
        });
        
        // Случайный Canvas fingerprint
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attributes) {
            if (type === '2d') {
                const context = originalGetContext.call(this, type, attributes);
                const originalGetImageData = context.getImageData;
                context.getImageData = function(x, y, w, h) {
                    const data = originalGetImageData.call(this, x, y, w, h);
                    // Добавляем шум
                    for (let i = 0; i < data.data.length; i += 4) {
                        data.data[i] = data.data[i] ^ (Math.random() * 2 | 0);
                    }
                    return data;
                };
                return context;
            }
            return originalGetContext.call(this, type, attributes);
        };
        
        // WebGL fingerprint
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter.call(this, parameter);
        };
        
        // Отслеживание позиции мыши
        window.mouseX = 0;
        window.mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            window.mouseX = e.clientX;
            window.mouseY = e.clientY;
        });
    """)
    
    return context


# =============================================================================
# ХРАНИЛИЩЕ АККАУНТОВ
# =============================================================================

class AccountStorage:
    """Хранилище зарегистрированных аккаунтов"""
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), 'data')
        
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.accounts_file = os.path.join(data_dir, 'accounts.json')
        self._ensure_file()
    
    def _ensure_file(self):
        """Создание файла если не существует"""
        if not os.path.exists(self.accounts_file):
            with open(self.accounts_file, 'w', encoding='utf-8') as f:
                json.dump({}, f)
    
    def load_all(self) -> Dict[str, List[Dict]]:
        """Загрузка всех аккаунтов"""
        with open(self.accounts_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def save_all(self, accounts: Dict[str, List[Dict]]):
        """Сохранение всех аккаунтов"""
        with open(self.accounts_file, 'w', encoding='utf-8') as f:
            json.dump(accounts, f, ensure_ascii=False, indent=2)
    
    def add_account(self, platform: str, account: Dict):
        """Добавление аккаунта"""
        accounts = self.load_all()
        
        if platform not in accounts:
            accounts[platform] = []
        
        accounts[platform].append(account)
        self.save_all(accounts)
    
    def get_accounts(self, platform: str) -> List[Dict]:
        """Получение аккаунтов платформы"""
        accounts = self.load_all()
        return accounts.get(platform, [])
    
    def get_all_platforms(self) -> List[str]:
        """Получение списка всех платформ"""
        accounts = self.load_all()
        return list(accounts.keys())


# =============================================================================
# ЛОГИРОВАНИЕ
# =============================================================================

class Logger:
    """Логгер с файловым выводом"""
    
    def __init__(self, name: str, log_dir: str = None):
        self.name = name
        if log_dir is None:
            log_dir = os.path.join(os.path.dirname(__file__), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        self.log_file = os.path.join(log_dir, f"{name}.log")
    
    def _write(self, level: str, message: str):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        line = f"[{timestamp}] [{level}] {message}\n"
        
        print(line.strip())
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(line)
    
    def info(self, message: str):
        self._write('INFO', message)
    
    def error(self, message: str):
        self._write('ERROR', message)
    
    def success(self, message: str):
        self._write('SUCCESS', message)
    
    def warning(self, message: str):
        self._write('WARNING', message)


# =============================================================================
# ЭКСПОРТ
# =============================================================================

__all__ = [
    'human_delay',
    'human_mouse_move',
    'human_click',
    'human_typing',
    'random_scroll',
    'random_mouse_movement',
    'simulate_reading',
    'ADBClient',
    'create_stealth_context',
    'generate_profile',
    'generate_password',
    'AccountStorage',
    'Logger',
    'DELAY_CONFIG',
    'USER_AGENTS_MOBILE',
    'USER_AGENTS_DESKTOP',
]
