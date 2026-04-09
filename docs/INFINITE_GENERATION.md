# Система 24/365 Генерации Контента

## Обзор

Полностью автоматизированная система непрерывной генерации контента без ограничений. Позволяет создавать контент 24 часа в сутки, 365 дней в году.

## Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Content Studio 24/365                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐    ┌──────────────────────┐               │
│  │  Infinite           │    │  Health Monitor      │               │
│  │  Generation Manager │◄───┤  Service             │               │
│  └─────────┬───────────┘    └──────────────────────┘               │
│            │                                                        │
│            ▼                                                        │
│  ┌─────────────────────┐    ┌──────────────────────┐               │
│  │  Provider Bypass    │    │  Auto Registration   │               │
│  │  Strategy Engine    │◄───┤  Service             │               │
│  └─────────┬───────────┘    └──────────────────────┘               │
│            │                                                        │
│            ▼                                                        │
│  ┌─────────────────────┐    ┌──────────────────────┐               │
│  │  API Key Manager    │    │  Proxy Pool Manager  │               │
│  └─────────────────────┘    └──────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Компоненты

### 1. InfiniteGenerationManager

Главный менеджер непрерывной генерации:

```typescript
import { getInfiniteGenerationManager } from '@/lib/provider-bypass';

const manager = getInfiniteGenerationManager();

// Запуск генерации
const result = await manager.startGeneration({
  name: 'Мой генератор',
  contentType: 'text',
  prompts: ['Создай пост о технологиях', 'Напиши обзор продукта'],
  intervalSeconds: 60,
  preferredProviders: ['cerebras', 'groq', 'gemini'],
  maxGenerationsPerDay: 1000,
});

// Управление
await manager.pauseGeneration(generatorId);
await manager.resumeGeneration(generatorId);
await manager.stopGeneration(generatorId);

// Мониторинг
const state = manager.getState(generatorId);
const stats = manager.getStats(generatorId);
```

### 2. AutoRegistrationService

Автоматическая регистрация аккаунтов провайдеров:

```typescript
import { getAutoRegistrationService } from '@/lib/provider-bypass';

const service = getAutoRegistrationService();

// Создать задачу на регистрацию
const task = await service.createRegistrationTask({
  provider: 'cerebras',
  proxyId: 'proxy-123',
});

// Массовая регистрация
const tasks = await service.createBatchRegistrationTasks({
  provider: 'groq',
  count: 5,
  proxyIds: ['proxy-1', 'proxy-2'],
});

// Проверка статуса
const status = await service.getTaskStatus(task.taskId);
```

### 3. ProxyPoolManager

Управление пулом прокси:

```typescript
import { getProxyPoolManager } from '@/lib/provider-bypass';

const proxyManager = getProxyPoolManager();

// Добавить прокси
const proxy = await proxyManager.addProxy({
  host: 'proxy.example.com',
  port: 8080,
  type: 'http',
  username: 'user',
  password: 'pass',
  country: 'US',
});

// Получить лучший прокси
const bestProxy = await proxyManager.getBestProxy({
  type: 'http',
  country: 'US',
});

// Импорт из файла
const result = await proxyManager.importFromFile(content, 'txt');

// Статистика
const stats = proxyManager.getPoolStats();
```

### 4. HealthMonitorService

Мониторинг здоровья системы:

```typescript
import { getHealthMonitor } from '@/lib/provider-bypass';

const monitor = getHealthMonitor();

// Получить состояние системы
const health = await monitor.getSystemHealth();
console.log(health.overall); // 'healthy' | 'degraded' | 'critical' | 'offline'

// Prometheus метрики
const metrics = monitor.getPrometheusMetrics();

// Управление алертами
monitor.acknowledgeAlert(alertId);
monitor.resolveAlert(alertId);
```

## Поддерживаемые провайдеры

### Text (Текст)
| Провайдер | Бесплатный | Дневная квота | Требования |
|-----------|------------|---------------|------------|
| Cerebras  | ✅         | 14,400        | Email      |
| Groq      | ✅         | 1,000         | Email      |
| Gemini    | ✅         | 500           | Email      |
| OpenRouter| ✅         | 50            | Email      |
| DeepSeek  | ❌         | Платный       | Email + Телефон |

### Video (Видео)
| Провайдер | Бесплатный | Дневная квота | Требования |
|-----------|------------|---------------|------------|
| Kling     | ✅         | 100           | Email      |
| Luma      | ✅         | 50            | Email      |
| Runway    | ✅         | 30            | Email      |
| Pollo     | ✅         | 200           | Email      |
| Pika      | ✅         | 50            | Email      |

### Image (Изображения)
| Провайдер | Бесплатный | Дневная квота | Требования |
|-----------|------------|---------------|------------|
| Stability | ✅         | 500           | Email      |
| Midjourney| ❌         | Платный       | Подписка   |

### Audio (Аудио)
| Провайдер | Бесплатный | Дневная квота | Требования |
|-----------|------------|---------------|------------|
| ElevenLabs | ✅        | 100           | Email      |

## API Endpoints

### GET /api/infinite-generation

Получение информации о системе:

```bash
# Список генераторов
GET /api/infinite-generation?action=list

# Статус конкретного генератора
GET /api/infinite-generation?action=status&id=gen-123

# Здоровье системы
GET /api/infinite-generation?action=health

# Prometheus метрики
GET /api/infinite-generation?action=metrics

# Прокси
GET /api/infinite-generation?action=proxies

# Доступные провайдеры для регистрации
GET /api/infinite-generation?action=registration
```

### POST /api/infinite-generation

Управление генераторами:

```bash
# Запуск генерации
POST /api/infinite-generation
{
  "action": "start",
  "name": "Мой генератор",
  "contentType": "text",
  "prompts": ["Промпт 1", "Промпт 2"],
  "intervalSeconds": 60,
  "preferredProviders": ["cerebras", "groq"],
  "maxGenerationsPerDay": 1000
}

# Остановка
POST /api/infinite-generation
{"action": "stop", "generatorId": "gen-123"}

# Пауза
POST /api/infinite-generation
{"action": "pause", "generatorId": "gen-123"}

# Возобновление
POST /api/infinite-generation
{"action": "resume", "generatorId": "gen-123"}

# Регистрация аккаунта
POST /api/infinite-generation
{"action": "register", "provider": "cerebras"}

# Добавление прокси
POST /api/infinite-generation
{
  "action": "add-proxy",
  "host": "proxy.example.com",
  "port": 8080,
  "type": "http"
}
```

## Стратегии обхода ограничений

### 1. Ротация провайдеров
Автоматическое переключение между провайдерами при достижении лимитов:

```typescript
{
  preferredProviders: ['cerebras', 'groq', 'gemini'],
  fallbackProviders: ['openrouter', 'deepseek'],
  autoSwitchOnLimit: true,
}
```

### 2. Ротация аккаунтов
Использование нескольких аккаунтов одного провайдера:

```typescript
// Автоматическая регистрация новых аккаунтов
await service.createBatchRegistrationTasks({
  provider: 'cerebras',
  count: 10, // 10 аккаунтов = 144,000 запросов/день
});
```

### 3. Ротация прокси
Обход IP ограничений через пул прокси:

```typescript
// Добавление пула прокси
await proxyManager.importFromFile(proxiesFile, 'txt');

// Автоматический выбор лучшего прокси
const proxy = await proxyManager.getBestProxy({ country: 'US' });
```

### 4. Адаптивный rate control
Автоматическая регулировка скорости запросов:

```typescript
{
  intervalSeconds: 60,
  randomizeInterval: true,
  intervalMinSeconds: 30,
  intervalMaxSeconds: 120,
}
```

## Мониторинг

### Метрики Prometheus

```
# Провайдеры
mukn_providers_total 17
mukn_providers_healthy 15
mukn_providers_offline 2

# API ключи
mukn_api_keys_total 25
mukn_api_keys_active 23

# Прокси
mukn_proxies_total 50
mukn_proxies_active 45

# Генераторы
mukn_generators_running 3
mukn_generated_24h 5000
mukn_success_rate 0.95
```

### Алерты

Система автоматически создаёт алерты при:
- Недоступности провайдера
- Исчерпании API ключей
- Критическом уровне ошибок
- Проблемах с прокси

### Telegram уведомления

```typescript
const monitor = new HealthMonitorService({
  telegramBotToken: 'bot-token',
  telegramChatId: 'chat-id',
  notificationsEnabled: true,
});
```

## Примеры использования

### Базовая генерация текста

```typescript
const manager = getInfiniteGenerationManager();

await manager.startGeneration({
  name: 'Генератор постов',
  contentType: 'text',
  prompts: [
    'Напиши интересный пост о технологиях',
    'Создай обзор нового продукта',
  ],
  intervalSeconds: 300, // каждые 5 минут
  preferredProviders: ['cerebras', 'groq'],
  maxGenerationsPerDay: 500,
});
```

### Генерация видео

```typescript
await manager.startGeneration({
  name: 'Генератор видео',
  contentType: 'video',
  prompts: [
    'Создай видео о природе',
    'Сгенерируй рекламный ролик',
  ],
  intervalSeconds: 1800, // каждые 30 минут
  preferredProviders: ['kling', 'luma', 'runway'],
  maxGenerationsPerDay: 100,
});
```

### Массовая регистрация

```typescript
// Регистрируем 10 аккаунтов Cerebras
// Это даст 144,000 запросов в день бесплатно
const tasks = await service.createBatchRegistrationTasks({
  provider: 'cerebras',
  count: 10,
});

// Регистрируем 5 аккаунтов Groq
// Это даст 5,000 запросов в день бесплатно
await service.createBatchRegistrationTasks({
  provider: 'groq',
  count: 5,
});
```

## Best Practices

1. **Используйте несколько провайдеров** - это обеспечивает отказоустойчивость
2. **Регистрируйте несколько аккаунтов** - увеличивает общую квоту
3. **Добавьте резервные прокси** - для обхода IP ограничений
4. **Настройте уведомления** - для быстрого реагирования на проблемы
5. **Мониторьте метрики** - следите за здоровьем системы

## Troubleshooting

### "No API keys available"
Решение: Зарегистрируйте новые аккаунты или добавьте API ключи вручную

### "All providers rate limited"
Решение: Дождитесь сброса лимитов или добавьте новых провайдеров

### "High error rate"
Решение: Проверьте здоровье провайдеров через `/api/infinite-generation?action=health`

### "Proxy not working"
Решение: Проверьте прокси через health check, добавьте новые рабочие прокси
