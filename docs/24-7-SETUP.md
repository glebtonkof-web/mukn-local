# МУКН | Трафик - Документация 24/7

## Обзор

Это руководство описывает настройку и эксплуатацию системы МУКН для работы в режиме 24/7.

## Архитектура 24/7

```
┌─────────────────────────────────────────────────────────────┐
│                     МУКН | Трафик                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Next.js   │  │   Prisma    │  │  Telegram   │         │
│  │   Server    │  │    DB       │  │    Bot      │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────┴────────────────┴────────────────┴──────┐         │
│  │              Process Manager                   │         │
│  │  • Graceful Shutdown                           │         │
│  │  • Health Monitoring                           │         │
│  │  • Auto-restart on failure                     │         │
│  └───────────────────────┬───────────────────────┘         │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────┐         │
│  │              Watchdog Service                  │         │
│  │  • Health checks every 30s                     │         │
│  │  • Auto-restart on 3+ failures                 │         │
│  │  • Telegram/Webhook alerts                     │         │
│  └───────────────────────┬───────────────────────┘         │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────┐         │
│  │              Keep-Alive Service                │         │
│  │  • DB connection keepalive                     │         │
│  │  • Endpoint ping                               │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │              Auto-Backup Service               │         │
│  │  • Every 5 minutes                             │         │
│  │  • GZIP compression                            │         │
│  │  • Retention: 30 days                          │         │
│  └───────────────────────────────────────────────┘         │
│                                                             │
│  ┌───────────────────────────────────────────────┐         │
│  │              Alert Service                     │         │
│  │  • Telegram notifications                      │         │
│  │  • Webhook integration                         │         │
│  │  • Rate limiting                               │         │
│  └───────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты

### 1. Process Manager (`/src/lib/process-manager.ts`)

Отвечает за:
- Graceful shutdown (корректное завершение)
- Health monitoring каждые 30 секунд
- Автоматический перезапуск при ошибках
- Мониторинг использования памяти
- Интеграцию с auto-backup

### 2. Watchdog (`/scripts/watchdog.ts`)

Внешний мониторинг:
- Проверка `/api/health` каждые 30 секунд
- Автоматический перезапуск после 3+ сбоев
- Уведомления в Telegram и/или webhook
- Логирование в файл

### 3. Keep-Alive (`/src/lib/keep-alive.ts`)

Поддержание соединений:
- Ping базы данных каждую минуту
- Проверка эндпоинтов
- Автоматическое переподключение при разрыве

### 4. Auto-Backup (`/src/lib/auto-backup.ts`)

Резервное копирование:
- Бэкап каждые 5 минут
- GZIP сжатие
- Ротация по возрасту (30 дней) и размеру (10 GB)
- Максимум 100 бэкапов

### 5. Alert Service (`/src/lib/alert-service.ts`)

Система уведомлений:
- 4 уровня серьёзности: info, warning, error, critical
- Интеграция с Telegram
- Webhook для внешних систем
- Rate limiting (100 алертов/час)

## Способы запуска

### Вариант 1: Systemd (рекомендуется для production)

```bash
# Установка как systemd сервис
sudo bash scripts/install-service.sh

# Управление
sudo systemctl start mukn-traffic
sudo systemctl stop mukn-traffic
sudo systemctl restart mukn-traffic
sudo systemctl status mukn-traffic

# Просмотр логов
sudo journalctl -u mukn-traffic -f
```

### Вариант 2: PM2

```bash
# Установка PM2
npm install -g pm2

# Запуск
npm run start:pm2

# Управление
pm2 status
pm2 logs mukn-traffic
pm2 restart mukn-traffic
pm2 stop mukn-traffic

# Автозапуск при загрузке
pm2 startup
pm2 save
```

### Вариант 3: Скрипт управления

```bash
# Использование service.sh
bash scripts/service.sh start
bash scripts/service.sh stop
bash scripts/service.sh restart
bash scripts/service.sh status
bash scripts/service.sh logs
bash scripts/service.sh health
```

## Переменные окружения

Добавьте в `.env`:

```env
# Watchdog Configuration
WATCHDOG_HEALTH_URL=http://localhost:3000/api/health
WATCHDOG_INTERVAL=30000
WATCHDOG_MAX_FAILURES=3
WATCHDOG_AUTO_RESTART=true
WATCHDOG_MAX_RESTARTS=5

# Telegram Alerts (опционально)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Webhook Alerts (опционально)
ALERT_WEBHOOK_URL=https://your-webhook.com/alerts
```

## Health Check API

### GET /api/health

Возвращает статус системы:

```json
{
  "status": "healthy",
  "timestamp": "2026-04-05T12:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "services": {
    "database": { "status": "healthy", "latency": 5 },
    "ai": { "status": "healthy", "circuitState": "closed" },
    "storage": { "status": "healthy" }
  },
  "metrics": {
    "totalInfluencers": 10,
    "activeAccounts": 5,
    "pendingTasks": 2,
    "errorsLastHour": 0
  }
}
```

### HEAD /api/health

Быстрая проверка для load balancer:
- 200 - система работает
- 503 - система недоступна

## Мониторинг

### Логи

- `/logs/out.log` - стандартный вывод
- `/logs/error.log` - ошибки
- `/logs/watchdog.log` - логи watchdog

### Ротация логов

Настроена через logrotate (`/etc/logrotate.d/mukn-traffic`):
- Ежедневная ротация
- Хранение 14 дней
- Сжатие старых логов

### Метрики

В базе данных хранятся:
- `ServiceHeartbeat` - сердцебиение сервиса
- `Alert` - все алерты
- `ScheduledTask` - запланированные задачи

## Восстановление

### Из бэкапа

```bash
# Список бэкапов
ls -la backups/

# Восстановление (через API или скрипт)
bash scripts/service.sh restore backups/backup_2026-04-05T12-00-00.db.gz
```

### После сбоя

1. Проверьте логи: `bash scripts/service.sh logs`
2. Проверьте здоровье: `curl http://localhost:3000/api/health`
3. При необходимости перезапустите: `bash scripts/service.sh restart`

## NPM Scripts

```bash
npm run start           # Запуск в production
npm run start:pm2       # Запуск через PM2
npm run stop:pm2        # Остановка через PM2
npm run restart:pm2     # Перезапуск через PM2
npm run logs:pm2        # Логи через PM2
npm run watchdog        # Запуск watchdog
npm run health          # Проверка здоровья
npm run service:install # Установка systemd сервиса
npm run service:start   # Запуск через скрипт
npm run service:stop    # Остановка через скрипт
npm run service:status  # Статус сервиса
npm run db:backup       # Создать бэкап вручную
npm run db:studio       # Prisma Studio
```

## Troubleshooting

### Сервис не запускается

1. Проверьте логи: `bash scripts/service.sh logs 200`
2. Проверьте порт: `lsof -i :3000`
3. Проверьте базу данных: `npm run db:studio`

### Высокое потребление памяти

1. Проверьте метрики: `curl http://localhost:3000/api/health`
2. Перезапустите сервис: `bash scripts/service.sh restart`
3. Проверьте утечки памяти в логах

### База данных недоступна

1. Проверьте файл БД: `ls -la db/custom.db`
2. Восстановите из бэкапа: `bash scripts/service.sh restore`
3. Проверьте права доступа

## Обновление

```bash
# Остановка сервиса
npm run service:stop

# Обновление кода
git pull

# Установка зависимостей
npm install

# Миграция БД
npx prisma db push

# Сборка
npm run build

# Запуск
npm run service:start
```
