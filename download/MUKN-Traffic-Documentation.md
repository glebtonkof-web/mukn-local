# МУКН | Трафик - Enterprise AI-платформа

## Обзор системы

МУКН | Трафик - это промышленная система для управления роем AI-инфлюенсеров с поддержкой 24/7/365.

### Ключевые возможности

- **AI-инфлюенсеры** - создание виртуальных персонажей с уникальной личностью
- **Мультиплатформенность** - Telegram, Instagram, TikTok, YouTube
- **Автоматизация** - генерация контента через DeepSeek API
- **Монетизация** - интеграция с CPA-сетями
- **Отказоустойчивость** - retry, circuit breaker, graceful degradation

## Архитектура

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/          # Health check endpoint
│   │   │   ├── dashboard/       # Статистика дашборда
│   │   │   ├── influencers/     # CRUD инфлюенсеров
│   │   │   ├── accounts/        # CRUD аккаунтов
│   │   │   ├── sim-cards/       # CRUD SIM-карт
│   │   │   ├── campaigns/       # CRUD кампаний
│   │   │   ├── offers/          # CRUD офферов
│   │   │   ├── tasks/           # Очередь задач
│   │   │   └── ai/
│   │   │       └── generate/    # AI генерация контента
│   │   └── page.tsx             # Главная страница
│   ├── components/
│   │   ├── dashboard/           # Компоненты дашборда
│   │   ├── influencer/          # Компоненты инфлюенсеров
│   │   └── ui/                  # shadcn/ui компоненты
│   ├── hooks/
│   │   └── use-data.ts          # Хуки для работы с API
│   ├── lib/
│   │   ├── db.ts                # Prisma клиент
│   │   ├── resilience.ts        # Система отказоустойчивости
│   │   └── logger.ts            # Система логирования
│   └── store/
│       └── index.ts             # Zustand store
├── prisma/
│   └── schema.prisma            # Схема базы данных
├── mini-services/
│   └── logs-service/            # WebSocket сервис логов
├── desktop-runner/
│   ├── runner.py                # Python раннер
│   ├── requirements.txt         # Python зависимости
│   └── README.md                # Документация раннера
└── worklog.md                   # Лог работы
```

## API Endpoints

### Health Check
- `GET /api/health` - Статус системы
- `HEAD /api/health` - Быстрая проверка

### Dashboard
- `GET /api/dashboard` - Вся статистика

### Influencers
- `GET /api/influencers` - Список инфлюенсеров
- `POST /api/influencers` - Создание инфлюенсера
- `PUT /api/influencers` - Обновление инфлюенсера
- `DELETE /api/influencers` - Удаление инфлюенсера

### Accounts
- `GET /api/accounts` - Список аккаунтов
- `POST /api/accounts` - Создание аккаунта
- `PUT /api/accounts` - Обновление аккаунта
- `DELETE /api/accounts` - Удаление аккаунта

### SIM Cards
- `GET /api/sim-cards` - Список SIM-карт
- `POST /api/sim-cards` - Добавление SIM-карты
- `PUT /api/sim-cards` - Обновление SIM-карты
- `DELETE /api/sim-cards` - Удаление SIM-карты

### Campaigns
- `GET /api/campaigns` - Список кампаний
- `POST /api/campaigns` - Создание кампании
- `PUT /api/campaigns` - Обновление кампании
- `DELETE /api/campaigns` - Удаление кампании

### Offers
- `GET /api/offers` - Список офферов
- `POST /api/offers` - Создание оффера
- `PUT /api/offers` - Обновление оффера

### Tasks
- `GET /api/tasks` - Задачи из очереди
- `POST /api/tasks` - Создание задачи
- `PUT /api/tasks` - Обновление статуса задачи
- `DELETE /api/tasks` - Удаление задачи

### AI Generation
- `POST /api/ai/generate` - Генерация контента через DeepSeek

## Система отказоустойчивости

### Retry с экспоненциальной задержкой
```typescript
import { withRetry } from '@/lib/resilience';

const result = await withRetry(
  () => fetchData(),
  { maxRetries: 5, initialDelay: 1000 }
);
```

### Circuit Breaker
```typescript
import { createCircuitBreaker } from '@/lib/resilience';

const breaker = createCircuitBreaker('api-service');
const result = await breaker.execute(() => callApi());
```

### Graceful Degradation
```typescript
import { withFallback, getFallbackPost } from '@/lib/resilience';

const post = await withFallback({
  primary: () => generatePostWithAI(),
  fallback: () => getFallbackPost('crypto'),
});
```

## Запуск

### Веб-сервер (автоматически)
```bash
bun run dev
```

### Logs Service
```bash
cd mini-services/logs-service
bun run dev
```

### Desktop Runner
```bash
cd desktop-runner
pip install -r requirements.txt
python runner.py
```

## Переменные окружения

Создайте `.env` файл:

```env
DATABASE_URL="file:./db/custom.db"

# Telegram API (для desktop runner)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# API endpoint
API_BASE=http://localhost:3000

# Runner ID
RUNNER_ID=runner-1
```

## Критерии готовности 24/7/365

✅ Health-check endpoint работает
✅ Retry с экспоненциальной задержкой
✅ Circuit Breaker для внешних вызовов
✅ Graceful degradation при недоступности AI
✅ Структурированное логирование
✅ WebSocket для real-time логов
✅ Автоматическое восстановление после сбоев
✅ Независимость компонентов (если один упал, другие работают)

## Мониторинг

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2026-04-03T01:43:11.098Z",
  "uptime": 260,
  "version": "1.0.0",
  "services": {
    "database": { "status": "healthy", "latency": 2 },
    "ai": { "status": "healthy" },
    "storage": { "status": "healthy" }
  },
  "metrics": {
    "totalInfluencers": 0,
    "activeAccounts": 0,
    "pendingTasks": 0,
    "errorsLastHour": 0
  }
}
```

### Логирование
- Все логи в структурированном формате
- Real-time логи через WebSocket (порт 3004)
- REST API для логов (порт 3005)

## Следующие шаги

1. **Настройка Telegram API** - получить credentials на my.telegram.org
2. **Подключение ADB** - установить Android SDK Platform Tools
3. **Запуск Desktop Runner** - для работы с реальными устройствами
4. **Интеграция CPA сетей** - добавить офферы в систему
5. **Настройка мониторинга** - Prometheus/Grafana или Telegram-бот
