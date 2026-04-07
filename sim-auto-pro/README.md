# SIM Auto-Registration PRO
## МУКН Enterprise AI Automation Platform

Полностью автоматизированная система регистрации аккаунтов с прогревом и монетизацией 24/365.

## Возможности

- **Автоматическая регистрация** на 19+ платформах
- **Антидетект**: эмуляция человеческого поведения (Beziers, delays, typing)
- **SMS верификация** через ADB (Android Debug Bridge)
- **Прогрев аккаунтов** для избежания банов
- **Монетизация**: партнерки, аэрдропы, NFT
- **24/365 автономная работа**

## Поддерживаемые сервисы

| Сервис | SMS | Прокси | Статус |
|--------|-----|--------|--------|
| YouTube/Google | ✅ | Нет | Готов |
| TikTok | ✅ | Да* | Готов |
| Instagram | ✅ | Нет | Готов |
| Twitter/X | ✅ | Да* | Готов |
| Facebook | ✅ | Да* | Готов |
| VK | ✅ | Нет | Готов |
| Odnoklassniki | ✅ | Нет | Готов |
| Telegram | ✅ | Нет | Готов |
| WhatsApp Business | QR | Нет | Готов |
| Discord | Нет | Нет | Готов |
| Twitch | Нет | Нет | Готов |
| Spotify | Нет | Нет | Готов |
| Tinder | ✅ | Нет | Готов |
| LinkedIn | Нет | Нет | Готов |
| Pinterest | Нет | Нет | Готов |
| Reddit | Нет | Да* | Готов |
| Snapchat | ✅ | Нет | Готов |
| OnlyFans | Нет | Нет | Готов |
| Likee | ✅ | Нет | Готов |
| Trovo | Нет | Нет | Готов |
| Rumble | Нет | Нет | Готов |
| Odysee | Нет | Нет | Готов |

*\*Заблокированы в РФ - требуется прокси*

## Установка

### 1. Установка зависимостей

```bash
cd sim-auto-pro
pip install -r requirements.txt
playwright install chromium
```

### 2. Настройка ADB

```bash
# Ubuntu/Debian
sudo apt install android-tools-adb

# macOS
brew install android-platform-tools

# Windows - скачайте с https://developer.android.com/studio/releases/platform-tools
```

### 3. Подготовка телефона

1. Включите режим разработчика на Android
2. Включите USB-отладку
3. Подключите телефон к компьютеру через USB
4. Разрешите отладку на телефоне

### 4. Проверка подключения

```bash
adb devices
```

Должен показать ваше устройство.

## Настройка

### config.py

Отредактируйте номера телефонов в `config.py`:

```python
SIM_CARDS: Dict[SIMSlot, SIMConfig] = {
    SIMSlot.SIM_0: SIMConfig(
        slot=SIMSlot.SIM_0,
        phone_number="9059777510",  # Ваш номер без +7
    ),
    SIMSlot.SIM_1: SIMConfig(
        slot=SIMSlot.SIM_1,
        phone_number="9188805343",  # Ваш номер без +7
    )
}
```

### Прокси (для заблокированных сервисов)

Отредактируйте `config.py`:

```python
PROXY = ProxyConfig(
    enabled=True,
    type="socks5",
    host="proxy.example.com",
    port=1080,
    username="user",
    password="pass"
)
```

Или создайте файл `storage/proxies.txt` со списком прокси.

## Запуск

### Полный режим 24/365

```bash
python main.py
```

### Один цикл регистрации

```bash
python main.py --once
```

### Регистрация конкретного сервиса

```bash
python main.py --once --service tiktok --sim 0
```

### Показать статус

```bash
python main.py --status
```

### API сервер

```bash
python api.py
# или
uvicorn api:app --host 0.0.0.0 --port 8000
```

## API Endpoints

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/` | GET | Информация о сервисе |
| `/status` | GET | Текущий статус |
| `/services` | GET | Список сервисов |
| `/sims` | GET | Информация о SIM |
| `/register` | POST | Регистрация аккаунта |
| `/accounts` | GET | Список аккаунтов |
| `/accounts/{username}` | GET | Информация об аккаунте |
| `/health` | GET | Проверка здоровья |
| `/start` | POST | Запуск планировщика |
| `/stop` | POST | Остановка планировщика |

### Примеры API

```bash
# Получить статус
curl http://localhost:8000/status

# Зарегистрировать аккаунт
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{"service": "tiktok", "sim_slot": 0}'

# Получить список аккаунтов
curl http://localhost:8000/accounts

# Запустить планировщик
curl -X POST http://localhost:8000/start
```

## Структура проекта

```
sim-auto-pro/
├── main.py              # Точка входа
├── scheduler.py         # Главный оркестратор 24/365
├── api.py               # REST API сервер
├── config.py            # Конфигурация
├── utils.py             # Утилиты антидетекта
├── adb_sms.py           # Работа с ADB и SMS
├── requirements.txt     # Зависимости
├── services/            # Модули регистрации
│   ├── __init__.py
│   ├── base.py          # Базовый класс
│   ├── youtube.py
│   ├── tiktok.py
│   ├── instagram.py
│   └── ...              # Остальные сервисы
├── warmup/              # Система прогрева
│   └── __init__.py
├── monetization/        # Система монетизации
│   └── __init__.py
├── storage/             # Хранилище данных
│   ├── accounts.json    # База аккаунтов
│   └── proxies.txt      # Список прокси
├── logs/                # Логи
└── profiles/            # Профили браузера
```

## Антидетект

Система использует следующие техники для избежания блокировок:

### Движение мыши по кривым Безье

```python
# Реалистичное движение мыши
await human_mouse_move(page, target_x, target_y, steps=20)
```

### Человеческий ввод текста

```python
# Ввод с ошибками и исправлениями
await human_typing(page, selector, text, mistakes_rate=0.02)
```

### Случайные задержки

```python
# Экспоненциальное распределение задержек
await async_human_delay(min_sec=0.5, max_sec=2.0)
```

### Маскировка браузера

- Скрытие `navigator.webdriver`
- Рандомизация Canvas fingerprint
- Реалистичные User-Agent
- Соответствующие timezone и locale

## Прогрев аккаунтов

Система автоматически прогревает аккаунты после регистрации:

- **День 1-2**: Просмотр контента, случайные клики
- **День 3-4**: Лайки, подписки, поиск
- **День 5-7**: Полноценная активность

## Монетизация

После прогрева аккаунты монетизируются автоматически:

- **Партнерские программы**: Amazon, реферальные ссылки
- **Криптовалютные аэрдропы**: LayerZero, Starknet, ZkSync
- **NFT**: Free minting возможности

## Логирование

Все логи сохраняются в `logs/`:

- `sim_auto_reg_YYYYMMDD.log` - Основные логи
- `screenshots/` - Скриншоты при ошибках
- `scheduler_state.json` - Состояние планировщика

## Устранение неполадок

### ADB не видит устройство

```bash
# Перезапустите adb сервер
adb kill-server
adb start-server
adb devices
```

### SMS не приходят

1. Проверьте разрешение на чтение SMS
2. Убедитесь что телефон не в режиме "Не беспокоить"
3. Проверьте логи: `adb logcat | grep SMS`

### Капча

Для сервисов с капчей возможно потребуется ручное вмешательство. 
Рекомендуется использовать сервисы решения капчи (2Captcha, Anti-Captcha).

### Прокси

Для заблокированных в РФ сервисов (TikTok, Twitter, Facebook, Reddit) 
обязательно используйте прокси.

## Лицензия

MIT License

## Автор

МУКН Enterprise AI Automation Platform
