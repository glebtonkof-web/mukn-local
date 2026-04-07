"""
SIM Auto-Registration PRO - Anti-Detection Utilities
МУКН Enterprise AI Automation Platform

Модуль антидетекта: эмуляция человеческого поведения
- Движение мыши по кривым Безье
- Случайные задержки
- Человеческий ввод текста
- Скроллинг и движения мыши
"""

import random
import math
import time
import asyncio
from typing import Tuple, List, Optional
from dataclasses import dataclass
from playwright.async_api import Page, Locator
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# КРИВЫЕ БЕЗЬЕ ДЛЯ ДВИЖЕНИЯ МЫШИ
# ============================================================================

@dataclass
class Point:
    x: float
    y: float


def bezier_curve(points: List[Point], num_samples: int = 100) -> List[Point]:
    """
    Генерация кривой Безье по контрольным точкам
    
    Args:
        points: Контрольные точки кривой
        num_samples: Количество точек на кривой
        
    Returns:
        Список точек на кривой Безье
    """
    if len(points) < 2:
        return points
    
    def bezier_point(t: float, control_points: List[Point]) -> Point:
        """Вычисление точки на кривой Безье"""
        n = len(control_points) - 1
        x, y = 0.0, 0.0
        
        for i, point in enumerate(control_points):
            # Биномиальный коэффициент
            coef = math.comb(n, i)
            # Многочлен Бернштейна
            x += coef * (1 - t) ** (n - i) * t ** i * point.x
            y += coef * (1 - t) ** (n - i) * t ** i * point.y
            
        return Point(x, y)
    
    return [bezier_point(t / (num_samples - 1), points) for t in range(num_samples)]


def generate_human_mouse_path(
    start: Point, 
    end: Point, 
    steps: int = 20,
    curvature: float = 0.5
) -> List[Point]:
    """
    Генерация человеческой траектории движения мыши
    
    Args:
        start: Начальная точка
        end: Конечная точка
        steps: Количество шагов
        curvature: Кривизна траектории (0-1)
        
    Returns:
        Список точек траектории
    """
    # Прямая линия от старта до конца
    dx = end.x - start.x
    dy = end.y - start.y
    distance = math.sqrt(dx ** 2 + dy ** 2)
    
    if distance < 5:
        return [start, end]
    
    # Генерация контрольных точек для кривой Безье
    # Добавляем случайные отклонения для естественности
    mid_x = (start.x + end.x) / 2
    mid_y = (start.y + end.y) / 2
    
    # Перпендикулярное смещение
    perp_x = -dy / distance
    perp_y = dx / distance
    
    # Случайное смещение контрольных точек
    offset1 = random.uniform(-curvature, curvature) * distance * 0.3
    offset2 = random.uniform(-curvature, curvature) * distance * 0.3
    
    # Контрольные точки для кубической кривой Безье
    control_points = [
        start,
        Point(mid_x + perp_x * offset1, mid_y + perp_y * offset1),
        Point(mid_x + perp_x * offset2, mid_y + perp_y * offset2),
        end
    ]
    
    # Генерируем кривую
    curve = bezier_curve(control_points, steps)
    
    # Добавляем небольшой шум для естественности
    for i, point in enumerate(curve):
        if 0 < i < len(curve) - 1:
            noise_x = random.uniform(-2, 2)
            noise_y = random.uniform(-2, 2)
            curve[i] = Point(point.x + noise_x, point.y + noise_y)
    
    return curve


# ============================================================================
# ЗАДЕРЖКИ
# ============================================================================

def human_delay(min_sec: float = 0.5, max_sec: float = 2.0) -> float:
    """
    Генерация человеческой задержки с экспоненциальным распределением
    
    Args:
        min_sec: Минимальная задержка
        max_sec: Максимальная задержка
        
    Returns:
        Время задержки в секундах
    """
    # Используем экспоненциальное распределение с обрезкой
    # Большинство задержек будет ближе к минимуму
    lambda_param = 1.5 / (max_sec - min_sec)
    delay = random.expovariate(lambda_param)
    delay = min(delay + min_sec, max_sec)
    
    return delay


async def async_human_delay(min_sec: float = 0.5, max_sec: float = 2.0) -> None:
    """Асинхронная человеческая задержка"""
    delay = human_delay(min_sec, max_sec)
    await asyncio.sleep(delay)


def thinking_delay() -> float:
    """Задержка на 'обдумывание' действия"""
    return human_delay(1.0, 5.0)


def reading_delay(text_length: int) -> float:
    """
    Задержка на чтение текста
    
    Args:
        text_length: Длина текста
        
    Returns:
        Время в секундах
    """
    # Средняя скорость чтения ~200-300 слов/мин
    # Примерно 3-5 символов/сек
    words = text_length / 5  # Приблизительное количество слов
    reading_time = words / 4 * 60  # секунды
    
    # Добавляем случайность
    reading_time *= random.uniform(0.7, 1.3)
    
    return max(1.0, min(reading_time, 30.0))  # От 1 до 30 секунд


# ============================================================================
# ДВИЖЕНИЕ МЫШИ
# ============================================================================

async def human_mouse_move(
    page: Page, 
    target_x: float, 
    target_y: float,
    steps: int = 20,
    duration: float = None
) -> None:
    """
    Человеческое движение мыши к целевой точке
    
    Args:
        page: Страница Playwright
        target_x: Целевая координата X
        target_y: Целевая координата Y
        steps: Количество шагов
        duration: Общее время движения (если None - вычисляется автоматически)
    """
    # Получаем текущую позицию мыши
    try:
        current_pos = await page.evaluate("() => ({ x: window.mouseX || 0, y: window.mouseY || 0 })")
        start = Point(current_pos['x'], current_pos['y'])
    except:
        # Если не можем получить текущую позицию, начинаем из случайной точки
        start = Point(random.randint(100, 500), random.randint(100, 500))
    
    end = Point(target_x, target_y)
    
    # Вычисляем расстояние
    distance = math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
    
    # Автоматическое определение длительности
    if duration is None:
        # Время пропорционально расстоянию
        # Средняя скорость мыши ~500-1000 пикселей/сек
        duration = distance / random.uniform(400, 800)
        duration = max(0.1, min(duration, 2.0))  # От 0.1 до 2 секунд
    
    # Генерируем траекторию
    path = generate_human_mouse_path(start, end, steps)
    
    # Двигаемся по траектории
    step_duration = duration / len(path)
    
    for point in path:
        await page.mouse.move(point.x, point.y)
        await asyncio.sleep(step_duration * random.uniform(0.5, 1.5))
    
    # Устанавливаем финальную позицию
    await page.mouse.move(target_x, target_y)
    
    logger.debug(f"Mouse moved from ({start.x:.0f}, {start.y:.0f}) to ({target_x:.0f}, {target_y:.0f})")


async def human_click(
    page: Page,
    selector: str = None,
    x: float = None,
    y: float = None,
    double_click: bool = False
) -> bool:
    """
    Человеческий клик с движением мыши
    
    Args:
        page: Страница Playwright
        selector: CSS селектор элемента (если указан, игнорируем x, y)
        x: Координата X (если selector не указан)
        y: Координата Y (если selector не указан)
        double_click: Двойной клик
        
    Returns:
        Успешность клика
    """
    try:
        # Получаем координаты элемента если указан селектор
        if selector:
            element = page.locator(selector)
            if not await element.count():
                logger.warning(f"Element not found: {selector}")
                return False
            
            box = await element.bounding_box()
            if not box:
                logger.warning(f"Cannot get bounding box for: {selector}")
                return False
            
            # Кликаем в случайную точку внутри элемента
            x = box['x'] + random.uniform(box['width'] * 0.2, box['width'] * 0.8)
            y = box['y'] + random.uniform(box['height'] * 0.2, box['height'] * 0.8)
        
        if x is None or y is None:
            logger.error("No coordinates provided")
            return False
        
        # Двигаем мышь к точке
        await human_mouse_move(page, x, y)
        
        # Небольшая пауза перед кликом
        await async_human_delay(0.05, 0.2)
        
        # Клик
        if double_click:
            await page.mouse.dblclick(x, y)
        else:
            await page.mouse.click(x, y)
        
        # Пауза после клика
        await async_human_delay(0.1, 0.3)
        
        logger.debug(f"Clicked at ({x:.0f}, {y:.0f})")
        return True
        
    except Exception as e:
        logger.error(f"Click failed: {e}")
        return False


# ============================================================================
# ВВОД ТЕКСТА
# ============================================================================

async def human_typing(
    page: Page,
    selector: str,
    text: str,
    delay_between_keys: float = None,
    mistakes_rate: float = 0.02,
    clear_first: bool = True
) -> bool:
    """
    Человеческий ввод текста с ошибками
    
    Args:
        page: Страница Playwright
        selector: CSS селектор поля ввода
        text: Текст для ввода
        delay_between_keys: Задержка между нажатиями (если None - случайная)
        mistakes_rate: Частота ошибок (0-1)
        clear_first: Очистить поле перед вводом
        
    Returns:
        Успешность ввода
    """
    try:
        element = page.locator(selector)
        if not await element.count():
            logger.warning(f"Input element not found: {selector}")
            return False
        
        # Кликаем в поле
        await human_click(page, selector)
        
        # Очищаем если нужно
        if clear_first:
            await page.keyboard.press("Control+A")
            await asyncio.sleep(0.1)
            await page.keyboard.press("Backspace")
            await asyncio.sleep(0.1)
        
        # Вводим текст посимвольно
        typed_text = ""
        i = 0
        
        while i < len(text):
            char = text[i]
            
            # Случайная задержка между символами
            if delay_between_keys is None:
                delay = human_delay(0.03, 0.15)
            else:
                delay = delay_between_keys * random.uniform(0.5, 1.5)
            
            # Имитация ошибки
            if random.random() < mistakes_rate and char.isalpha():
                # Вводим неправильный символ
                wrong_char = random.choice('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
                await page.keyboard.type(wrong_char)
                typed_text += wrong_char
                await asyncio.sleep(delay)
                
                # Исправляем ошибку
                await page.keyboard.press("Backspace")
                await asyncio.sleep(human_delay(0.1, 0.3))
            
            # Вводим правильный символ
            await page.keyboard.type(char)
            typed_text += char
            
            # Пауза после пробела или знаков препинания
            if char in ' .,!?;:':
                await asyncio.sleep(human_delay(0.1, 0.4))
            else:
                await asyncio.sleep(delay)
            
            i += 1
        
        logger.debug(f"Typed: {text[:20]}{'...' if len(text) > 20 else ''}")
        return True
        
    except Exception as e:
        logger.error(f"Typing failed: {e}")
        return False


async def human_fill(
    page: Page,
    selector: str,
    text: str,
    simulate_typing: bool = True
) -> bool:
    """
    Заполнение поля ввода (с имитацией печати или без)
    
    Args:
        page: Страница Playwright
        selector: CSS селектор
        text: Текст
        simulate_typing: Имитировать печать
        
    Returns:
        Успешность
    """
    if simulate_typing:
        return await human_typing(page, selector, text)
    else:
        try:
            await page.fill(selector, text)
            return True
        except Exception as e:
            logger.error(f"Fill failed: {e}")
            return False


# ============================================================================
# СКРОЛЛИНГ
# ============================================================================

async def random_scroll(
    page: Page,
    direction: str = "down",
    distance: int = None,
    smooth: bool = True
) -> None:
    """
    Случайный скроллинг страницы
    
    Args:
        page: Страница Playwright
        direction: Направление (up, down)
        distance: Расстояние в пикселях (если None - случайное)
        smooth: Плавный скроллинг
    """
    if distance is None:
        distance = random.randint(100, 500)
    
    if direction == "up":
        distance = -distance
    
    # Плавный скроллинг
    if smooth:
        steps = random.randint(5, 15)
        step_distance = distance / steps
        
        for _ in range(steps):
            await page.evaluate(f"window.scrollBy(0, {step_distance})")
            await asyncio.sleep(random.uniform(0.02, 0.1))
    else:
        await page.evaluate(f"window.scrollBy(0, {distance})")
    
    logger.debug(f"Scrolled {direction}: {abs(distance)}px")


async def human_scroll_to_element(
    page: Page,
    selector: str
) -> bool:
    """
    Человеческий скроллинг к элементу
    
    Args:
        page: Страница Playwright
        selector: CSS селектор элемента
        
    Returns:
        Успешность
    """
    try:
        element = page.locator(selector)
        if not await element.count():
            return False
        
        # Получаем позицию элемента
        box = await element.bounding_box()
        if not box:
            return False
        
        # Текущая позиция скролла
        current_scroll = await page.evaluate("() => window.pageYOffset")
        
        # Целевая позиция (центр элемента)
        target_scroll = box['y'] - 200  # Немного выше элемента
        
        # Скроллируем постепенно
        if target_scroll > current_scroll:
            while current_scroll < target_scroll:
                step = min(random.randint(100, 300), target_scroll - current_scroll)
                await page.evaluate(f"window.scrollBy(0, {step})")
                current_scroll += step
                await asyncio.sleep(random.uniform(0.05, 0.15))
        else:
            while current_scroll > target_scroll:
                step = min(random.randint(100, 300), current_scroll - target_scroll)
                await page.evaluate(f"window.scrollBy(0, -{step})")
                current_scroll -= step
                await asyncio.sleep(random.uniform(0.05, 0.15))
        
        return True
        
    except Exception as e:
        logger.error(f"Scroll to element failed: {e}")
        return False


# ============================================================================
# СЛУЧАЙНЫЕ ДЕЙСТВИЯ
# ============================================================================

async def random_mouse_movement(page: Page) -> None:
    """
    Случайное движение мыши по странице (имитация раздумий)
    
    Args:
        page: Страница Playwright
    """
    # Получаем размеры страницы
    viewport = page.viewport_size
    if not viewport:
        return
    
    width = viewport['width']
    height = viewport['height']
    
    # Случайное количество движений
    movements = random.randint(2, 5)
    
    for _ in range(movements):
        # Случайная точка
        target_x = random.randint(100, width - 100)
        target_y = random.randint(100, height - 100)
        
        await human_mouse_move(page, target_x, target_y)
        await async_human_delay(0.2, 0.8)


async def simulate_reading(page: Page, selector: str = "body") -> None:
    """
    Имитация чтения содержимого страницы
    
    Args:
        page: Страница Playwright
        selector: Селектор элемента для чтения
    """
    try:
        # Получаем текст страницы
        text = await page.locator(selector).inner_text()
        read_time = reading_delay(len(text))
        
        # Пока "читаем", делаем случайные движения
        start_time = time.time()
        while time.time() - start_time < read_time:
            await random_mouse_movement(page)
            await random_scroll(page, distance=random.randint(-200, 200))
            await async_human_delay(1.0, 3.0)
            
    except Exception as e:
        logger.error(f"Reading simulation failed: {e}")


async def random_page_interaction(page: Page) -> None:
    """
    Случайное взаимодействие со страницей (имитация активности)
    """
    actions = [
        lambda: random_scroll(page),
        lambda: random_scroll(page, "up"),
        lambda: random_mouse_movement(page),
        lambda: simulate_reading(page),
    ]
    
    # Выполняем 1-3 случайных действия
    for _ in range(random.randint(1, 3)):
        action = random.choice(actions)
        await action()
        await async_human_delay(0.5, 2.0)


# ============================================================================
# НАВИГАЦИЯ
# ============================================================================

async def human_navigate(
    page: Page,
    url: str,
    wait_until: str = "load"
) -> bool:
    """
    Человеческая навигация с ожиданием и случайными действиями
    
    Args:
        page: Страница Playwright
        url: URL для перехода
        wait_until: Условие ожидания
        
    Returns:
        Успешность
    """
    try:
        # Переходим на страницу
        await page.goto(url, wait_until=wait_until, timeout=60000)
        
        # Случайная задержка
        await async_human_delay(1.0, 3.0)
        
        # Имитация первичного осмотра страницы
        await random_mouse_movement(page)
        await random_scroll(page)
        
        return True
        
    except Exception as e:
        logger.error(f"Navigation failed: {e}")
        return False


# ============================================================================
# ОЖИДАНИЕ ЭЛЕМЕНТОВ
# ============================================================================

async def wait_for_element(
    page: Page,
    selector: str,
    timeout: int = 30000,
    state: str = "visible"
) -> bool:
    """
    Ожидание появления элемента
    
    Args:
        page: Страница Playwright
        selector: CSS селектор
        timeout: Таймаут в мс
        state: Состояние (visible, hidden, attached, detached)
        
    Returns:
        Элемент появился
    """
    try:
        await page.wait_for_selector(selector, timeout=timeout, state=state)
        return True
    except Exception as e:
        logger.debug(f"Element not found: {selector} - {e}")
        return False


async def wait_and_click(
    page: Page,
    selector: str,
    timeout: int = 30000
) -> bool:
    """
    Ожидание элемента и клик по нему
    
    Args:
        page: Страница Playwright
        selector: CSS селектор
        timeout: Таймаут в мс
        
    Returns:
        Успешность
    """
    if await wait_for_element(page, selector, timeout):
        return await human_click(page, selector)
    return False


# ============================================================================
# ФОРМИРОВАНИЕ ДАННЫХ
# ============================================================================

def generate_username(base: str = None) -> str:
    """Генерация имени пользователя"""
    prefixes = ["cool", "super", "mega", "pro", "best", "top", "real", "the"]
    suffixes = ["_official", "_2024", "_pro", "_real", "_official", "_live"]
    
    if base is None:
        base = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=random.randint(5, 8)))
    
    if random.random() > 0.5:
        username = random.choice(prefixes) + base
    else:
        username = base + random.choice(suffixes)
    
    return username.lower()


def generate_password(length: int = 16) -> str:
    """Генерация надежного пароля"""
    import string
    
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = "!@#$%^&*"
    
    # Гарантируем наличие всех типов символов
    password = [
        random.choice(lowercase),
        random.choice(uppercase),
        random.choice(digits),
        random.choice(special)
    ]
    
    # Заполняем остальное
    remaining = length - 4
    all_chars = lowercase + uppercase + digits + special
    password.extend(random.choices(all_chars, k=remaining))
    
    # Перемешиваем
    random.shuffle(password)
    
    return ''.join(password)


def generate_email(username: str = None, domains: List[str] = None) -> str:
    """Генерация email адреса"""
    if domains is None:
        domains = ["gmail.com", "yahoo.com", "outlook.com", "proton.me", "mail.ru"]
    
    if username is None:
        username = generate_username()
    
    domain = random.choice(domains)
    
    return f"{username}@{domain}"


def generate_name() -> Tuple[str, str]:
    """Генерация имени и фамилии"""
    first_names = [
        "Александр", "Дмитрий", "Максим", "Артём", "Иван",
        "Анна", "Мария", "Елена", "Ольга", "Наталья",
        "Alex", "John", "Mike", "David", "James",
        "Emma", "Sarah", "Lisa", "Kate", "Mary"
    ]
    
    last_names = [
        "Иванов", "Петров", "Сидоров", "Козлов", "Новиков",
        "Ivanov", "Petrov", "Smith", "Johnson", "Williams"
    ]
    
    return random.choice(first_names), random.choice(last_names)


def generate_birthdate(min_age: int = 18, max_age: int = 45) -> str:
    """Генерация даты рождения"""
    from datetime import datetime, timedelta
    
    today = datetime.now()
    min_date = today - timedelta(days=max_age * 365)
    max_date = today - timedelta(days=min_age * 365)
    
    random_date = min_date + timedelta(
        days=random.randint(0, (max_date - min_date).days)
    )
    
    return random_date.strftime("%d.%m.%Y")


# ============================================================================
# КОНТЕКСТНЫЙ МЕНЕДЖЕР
# ============================================================================

class HumanBehavior:
    """Контекстный менеджер для добавления человеческого поведения"""
    
    def __init__(self, page: Page, add_noise: bool = True):
        self.page = page
        self.add_noise = add_noise
    
    async def __aenter__(self):
        # Инициализация позиции мыши
        viewport = self.page.viewport_size
        if viewport:
            await self.page.mouse.move(
                random.randint(100, viewport['width'] - 100),
                random.randint(100, viewport['height'] - 100)
            )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.add_noise:
            # Случайное движение перед выходом
            await random_mouse_movement(self.page)


# ============================================================================
# ЭКСПОРТ
# ============================================================================

__all__ = [
    # Кривые Безье
    'bezier_curve',
    'generate_human_mouse_path',
    'Point',
    
    # Задержки
    'human_delay',
    'async_human_delay',
    'thinking_delay',
    'reading_delay',
    
    # Движение мыши
    'human_mouse_move',
    'human_click',
    
    # Ввод текста
    'human_typing',
    'human_fill',
    
    # Скроллинг
    'random_scroll',
    'human_scroll_to_element',
    
    # Случайные действия
    'random_mouse_movement',
    'simulate_reading',
    'random_page_interaction',
    
    # Навигация
    'human_navigate',
    
    # Ожидание
    'wait_for_element',
    'wait_and_click',
    
    # Генерация данных
    'generate_username',
    'generate_password',
    'generate_email',
    'generate_name',
    'generate_birthdate',
    
    # Контекстный менеджер
    'HumanBehavior',
]
