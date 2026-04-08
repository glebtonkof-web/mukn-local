# МУКН - Автоматизация регистрации аккаунтов

Полнофункциональная система автоматизации регистрации аккаунтов с поддержкой автономной работы 24/365.

## 🚀 Быстрый старт

```bash
# Одна команда для запуска
git clone https://github.com/glebtonkof-web/mukn-local.git && cd mukn-local && npm install && npx prisma generate && npx prisma db push && npm run dev
```

Приложение будет доступно: http://localhost:3000

## 📋 Страницы

| URL | Описание |
|-----|----------|
| `/` | Главная страница |
| `/system` | 🎛️ Панель управления системой |
| `/proxy-manager` | 🔐 Менеджер прокси |
| `/logs` | 📋 Логи в реальном времени |

## ⚙️ Настройка

Создайте `.env` файл:

```env
# База данных
DATABASE_URL="file:./db/custom.db"

# Captcha Solver
CAPTCHA_PROVIDER="2captcha"  # или: solvecaptcha, anticaptcha, capmonster
CAPTCHA_API_KEY="your-api-key"

# Email уведомления (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@mukn.local"
SMTP_TO="admin@example.com"

# Telegram уведомления
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"
```

## 🏗️ Компоненты системы

### 📋 Очередь задач
- Персистентное хранение в SQLite
- Приоритеты: low, normal, high, critical
- Автоматические повторы с backoff
- Обработка ошибок

### ⏰ Cron планировщик
Стандартные задачи:
- `proxy-refresh` — каждые 30 минут
- `accounts-health-check` — каждые 15 минут
- `backup-database` — каждые 6 часов
- `daily-stats-reset` — ежедневно в 00:00
- `cleanup-old-tasks` — ежедневно в 03:00

### 🔐 Прокси менеджер
- 10+ источников прокси (GitHub, ProxyScrape, Geonode...)
- HTTP/HTTPS/SOCKS4/SOCKS5
- Авто-ротация при падении
- Health check
- Sticky sessions

### 📧 Временная почта
- 1secmail.com
- TempMail.plus
- Авто-ожидание кодов

### 🤖 Captcha Solver
- 2Captcha
- SolveCaptcha
- Anti-Captcha
- CapMonster Cloud

## 🐳 Docker

```bash
# Сборка
docker-compose build

# Запуск
docker-compose up -d

# Логи
docker-compose logs -f
```

## 🔧 PM2 (Production)

```bash
# Установка PM2
npm install -g pm2

# Запуск
pm2 start ecosystem.config.js

# Мониторинг
pm2 status
pm2 logs mukn-web

# Сохранение конфигурации
pm2 save
pm2 startup
```

## 📡 API Endpoints

### Система
```
GET  /api/system          # Статус системы
POST /api/system          # Запуск/остановка (action: start|stop|restart)
```

### Задачи
```
GET  /api/tasks           # Статистика очереди
POST /api/tasks           # Добавить задачу
DELETE /api/tasks         # Отменить задачу
```

### Cron
```
GET  /api/cron            # Список задач
POST /api/cron            # Добавить задачу
DELETE /api/cron          # Удалить задачу
```

### Прокси
```
GET  /api/sim-auto/proxy?action=stats|list
POST /api/sim-auto/proxy  # refresh|clear|add|blacklist
```

### Временная почта
```
GET  /api/temp-email?email=xxx  # Проверить сообщения
POST /api/temp-email            # Создать email
```

## 🛠️ Требования

- Node.js 18+
- npm или yarn
- ADB (для работы с Android)
- Docker (опционально)

## 📁 Структура

```
src/
├── app/
│   ├── api/              # API routes
│   ├── system/           # Панель управления
│   ├── proxy-manager/    # Менеджер прокси
│   └── logs/             # Логи
├── lib/
│   ├── bootstrap.ts      # Инициализация
│   ├── captcha-solver.ts # Решение капчи
│   ├── task-queue.ts     # Очередь задач
│   ├── cron-scheduler.ts # Планировщик
│   ├── temp-email.ts     # Временная почта
│   ├── email-notifications.ts # Email
│   └── sim-auto/
│       ├── proxy-manager.ts
│       └── ...
└── prisma/
    └── schema.prisma
```

## 📊 Мониторинг

- **Панель управления**: http://localhost:3000/system
- **Health Check**: `GET /api/system`
- **Метрики**: в панели управления

## 🔒 Безопасность

- Данные форм не идут через прокси
- Blacklist небезопасных прокси
- Защита критических данных
- Graceful shutdown

## 📝 Лицензия

MIT
