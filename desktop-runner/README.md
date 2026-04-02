# МУКН | Трафик - Desktop Runner

Десктопный раннер для выполнения задач через ADB и Telethon.

## Функции

- **Регистрация Telegram аккаунтов** через ADB с физическими SIM-картами
- **Автоматический ввод SMS-кодов** (чтение через ADB)
- **Установка 2FA** (облачный пароль)
- **Создание Telegram каналов**
- **Отправка сообщений** и публикация контента
- **Прогрев аккаунтов** с защитой от банов

## Установка

### Требования

- Python 3.10+
- ADB (Android Debug Bridge) - для работы с устройствами
- Telegram API credentials (получить на my.telegram.org)

### Установка зависимостей

```bash
cd desktop-runner
pip install -r requirements.txt
```

### Установка ADB

**Ubuntu/Debian:**
```bash
sudo apt install android-tools-adb
```

**Windows:**
Скачайте [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)

**macOS:**
```bash
brew install android-platform-tools
```

## Настройка

Создайте файл `.env`:

```env
# Telegram API (получить на my.telegram.org)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash_here

# API endpoint веб-сервера
API_BASE=http://localhost:3000

# Идентификатор раннера
RUNNER_ID=runner-1

# ADB настройки
ADB_HOST=127.0.0.1
ADB_PORT=5037
```

## Запуск

```bash
python runner.py
```

## Архитектура

```
desktop-runner/
├── runner.py          # Основной файл раннера
├── requirements.txt   # Python зависимости
├── .env              # Конфигурация (создать)
├── sessions/         # Telegram сессии
└── logs/             # Логи
```

## Классы

### ADBManager
Управление Android устройствами через ADB:
- Подключение к устройствам
- Чтение SMS кодов
- Ввод текста и тапы по экрану

### TelegramManager
Работа с Telegram через Telethon:
- Авторизация по номеру телефона
- Отправка и верификация кодов
- Создание каналов
- Отправка сообщений

### TaskExecutor
Получение и выполнение задач из очереди:
- Polling задач из API
- Диспетчеризация по типам
- Retry с экспоненциальной задержкой
- Обновление статусов

## Типы задач

| Тип | Описание |
|-----|----------|
| `register_account` | Регистрация нового аккаунта |
| `verify_sms` | Верификация SMS кодом |
| `setup_2fa` | Установка 2FA |
| `create_channel` | Создание канала |
| `send_message` | Отправка сообщения |
| `post_content` | Публикация контента |
| `join_channel` | Вступление в канал |
| `warm_account` | Прогрев аккаунта |

## Отказоустойчивость

- **Retry с backoff** - автоматический повтор при ошибках
- **Health checks** - проверка доступности API
- **Graceful shutdown** - корректное завершение работы
- **Логирование** - все действия логируются в файл и консоль

## Безопасность

⚠️ **Важно:**
- Никогда не коммитьте `.env` файл с реальными credentials
- Храните `sessions/` директорию в секрете
- Используйте отдельные API credentials для каждого раннера

## Мониторинг

Логи пишутся в:
- `runner.log` - файл с логами
- stdout - консольный вывод

## Интеграция с веб-сервером

Раннер взаимодействует с API:
- `GET /api/tasks` - получение задач
- `PUT /api/tasks` - обновление статуса
- `GET /api/health` - проверка здоровья

## Множественные раннеры

Можно запускать несколько раннеров параллельно:

```bash
# Раннер 1
RUNNER_ID=runner-1 python runner.py

# Раннер 2
RUNNER_ID=runner-2 python runner.py
```

Задачи будут распределяться между раннерами автоматически.
