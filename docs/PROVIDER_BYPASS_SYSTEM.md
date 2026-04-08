# Provider Bypass System

## 🎯 Обзор

Комплексная система обхода ограничений провайдеров для обеспечения **24/365 непрерывной генерации контента**. Поддержка 10+ провайдеров с автоматической ротацией, адаптивной скоростью и множественными стратегиями обхода.

## 📊 Поддерживаемые провайдеры

| Провайдер | Тип | Free Tier | Лимиты | Multi-Account |
|-----------|-----|-----------|--------|---------------|
| Cerebras | Text | ✅ | 14,400/день | ✅ |
| Groq | Text | ✅ | 1,000/день | ✅ |
| Gemini | Text | ✅ | 500/день | ✅ |
| DeepSeek | Text | ❌ | По тарифу | ✅ |
| OpenRouter | Gateway | ✅ | 50/день | ✅ |
| Claude | Text | ❌ | По тарифу | ✅ |
| GPT-4 | Text/Image | ❌ | По тарифу | ✅ |
| Kling | Video | ✅ | 100/день | ✅ |
| Luma | Video | ✅ | 50/день | ✅ |
| Runway | Video | ✅ | 30/день | ✅ |
| Stability | Image | ✅ | 500/день | ✅ |
| ElevenLabs | Audio | ✅ | 100/день | ✅ |

## 🚀 Быстрый старт

### 1. Инициализация системы

```typescript
import { initializeBypassSystem } from '@/lib/provider-bypass';

// Инициализация с аккаунтами
const system = await initializeBypassSystem({
  accounts: [
    {
      id: 'cerebras-1',
      provider: 'cerebras',
      apiKey: process.env.CEREBRAS_API_KEY,
      priority: 1,
      dailyLimit: 14400,
    },
    {
      id: 'groq-1',
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      priority: 2,
      dailyLimit: 1000,
    },
    {
      id: 'gemini-1',
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      priority: 3,
      proxy: {
        host: 'proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
        type: 'http',
      },
    },
  ],
  config: {
    maxRetries: 5,
    fallbackChain: ['cerebras', 'groq', 'gemini', 'deepseek'],
    dailyCostLimit: 100,
  },
});
```

### 2. Генерация контента

```typescript
import { getContentStudio } from '@/lib/provider-bypass';

const studio = getContentStudio();

// Одиночная генерация
const result = await studio.generate({
  contentType: 'text',
  prompt: 'Напиши пост о преимуществах криптовалют',
  style: 'профессиональный',
  preferredProvider: 'cerebras',
  priority: 'high',
});

console.log(result);
// {
//   success: true,
//   content: '...',
//   provider: 'cerebras',
//   bypassStrategies: ['rate_adaptation'],
//   attempts: 1,
//   generationTime: 1234,
// }
```

### 3. Массовая генерация

```typescript
const prompts = [
  'Пост о биткоине',
  'Пост о эфириуме',
  'Пост о NFT',
  // ... до 100+ промптов
];

const results = await studio.generateBatch(
  prompts.map(prompt => ({
    contentType: 'text',
    prompt,
    priority: 'normal',
  })),
  {
    maxConcurrent: 5,
    progressCallback: (completed, total, results) => {
      console.log(`Прогресс: ${completed}/${total}`);
    },
  }
);
```

### 4. Непрерывная генерация 24/365

```typescript
const job = await studio.startContinuousGeneration({
  prompts: [
    'Ежедневный обзор крипторынка',
    'Аналитика трендов',
    'Новости блокчейна',
  ],
  contentType: 'text',
  intervalMinutes: 60, // Каждый час
  maxGenerations: 1000, // Опционально
  callback: (result) => {
    // Обработка результата
    if (result.success) {
      publishToChannel(result.content);
    }
  },
});

// Остановка генерации
job.stop();
```

## 🛡️ Стратегии обхода

### 1. Account Rotation
Автоматическая ротация между несколькими аккаунтами провайдера.

```typescript
// Добавление нескольких аккаунтов для одного провайдера
await fetch('/api/provider-bypass', {
  method: 'POST',
  body: JSON.stringify({
    action: 'add-accounts-batch',
    data: {
      accounts: [
        { provider: 'cerebras', apiKey: 'key1', priority: 1 },
        { provider: 'cerebras', apiKey: 'key2', priority: 2 },
        { provider: 'cerebras', apiKey: 'key3', priority: 3 },
      ],
    },
  }),
});
```

### 2. Provider Fallback
Автоматическое переключение на альтернативный провайдер при лимите.

```typescript
// Конфигурация fallback цепочки
await fetch('/api/provider-bypass', {
  method: 'POST',
  body: JSON.stringify({
    action: 'configure',
    data: {
      userId: 'user-1',
      fallbackChain: ['cerebras', 'groq', 'gemini', 'deepseek'],
      maxRetries: 5,
    },
  }),
});
```

### 3. Proxy Rotation
Ротация proxy для обхода IP-based ограничений.

```typescript
// Добавление аккаунта с proxy
await fetch('/api/provider-bypass', {
  method: 'POST',
  body: JSON.stringify({
    action: 'add-account',
    data: {
      provider: 'kling',
      email: 'user@example.com',
      password: 'password',
      proxy: {
        host: 'proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
        type: 'socks5',
      },
    },
  }),
});
```

### 4. Rate Adaptation
Адаптивная подстройка скорости запросов.

```typescript
// Конфигурация адаптивной скорости
await fetch('/api/provider-bypass', {
  method: 'POST',
  body: JSON.stringify({
    action: 'configure',
    data: {
      userId: 'user-1',
      adaptiveRateEnabled: true,
      initialRate: 10, // запросов в минуту
      minRate: 1,
      maxRate: 100,
    },
  }),
});
```

### 5. Circuit Breaker
Защита от каскадных сбоев.

```typescript
// Автоматически активируется при ошибках
// Настраивается через BypassEngineConfig
```

## 📈 API Endpoints

### GET /api/provider-bypass

| Action | Описание |
|--------|----------|
| `status` | Статус системы |
| `providers` | Доступные провайдеры |
| `accounts` | Статистика аккаунтов |
| `recommendations` | Рекомендации по оптимизации |

### POST /api/provider-bypass

| Action | Описание |
|--------|----------|
| `add-account` | Добавить аккаунт |
| `add-accounts-batch` | Массовое добавление |
| `update-account` | Обновить аккаунт |
| `delete-account` | Удалить аккаунт |
| `configure` | Настройка системы |
| `reset-daily` | Сброс дневных счетчиков |
| `initialize` | Инициализация из БД |

## 📊 Мониторинг

```typescript
// Получение статистики
const stats = await studio.getStats();
console.log(stats);
// {
//   totalGenerated: 1234,
//   successfulRate: 0.98,
//   avgGenerationTime: 1234,
//   providersUsed: { cerebras: 800, groq: 300, gemini: 134 },
//   strategiesUsed: { rate_adaptation: 456, account_rotation: 123 },
// }

// Статус системы
const response = await fetch('/api/provider-bypass?action=status');
const status = await response.json();
```

## 🔧 Конфигурация

```typescript
interface BypassConfiguration {
  // Стратегии
  enabledStrategies: BypassStrategyType[];
  fallbackChain: ProviderType[];
  
  // Ретраи
  maxRetries: number;
  retryDelayMs: number;
  retryBackoff: number;
  
  // Timeouts
  requestTimeoutMs: number;
  totalTimeoutMs: number;
  
  // Стоимость
  maxCostPerRequest: number;
  dailyCostLimit: number;
  monthlyCostLimit?: number;
  
  // Адаптивная скорость
  adaptiveRateEnabled: boolean;
  initialRate: number;
  minRate: number;
  maxRate: number;
  
  // Proxy
  rotateProxyOnLimit: boolean;
  stickyProxySession: boolean;
  
  // Уведомления
  notifyOnLimit: boolean;
  notifyOnExhaustion: boolean;
  notifyOnBanned: boolean;
}
```

## 🗄️ Модели базы данных

### ProviderAccount
Аккаунты провайдеров с поддержкой multi-account и proxy.

### BypassLog
Логи использования стратегий обхода.

### ProviderDynamicLimit
Динамические лимиты, обнаруженные в runtime.

### ProviderUsageMetrics
Метрики использования провайдеров.

### BypassConfiguration
Пользовательская конфигурация.

### BypassProxyPool
Пул прокси для обхода.

### InfiniteGenerationJob
Jobs для непрерывной генерации.

## 💡 Примеры использования

### Генерация контента для Telegram канала

```typescript
import { getContentStudio } from '@/lib/provider-bypass';

const studio = getContentStudio();

// Запуск непрерывной генерации постов
const job = await studio.startContinuousGeneration({
  prompts: [
    'Новости криптовалют за день',
    'Аналитика рынка',
    'Советы для новичков',
  ],
  contentType: 'text',
  intervalMinutes: 120, // Каждые 2 часа
  style: 'информативный и дружелюбный',
  callback: async (result) => {
    if (result.success) {
      // Публикация в Telegram
      await publishToTelegram(result.content);
    }
  },
});
```

### Массовая генерация видео

```typescript
const videoPrompts = [
  'Обзор нового токена',
  'Как работает DeFi',
  // ... 50+ промптов
];

const results = await studio.generateBatch(
  videoPrompts.map(prompt => ({
    contentType: 'video',
    prompt,
    preferredProvider: 'kling',
    maxCost: 0.5,
  })),
  {
    maxConcurrent: 2, // Видео генерируются медленно
    progressCallback: (completed, total) => {
      console.log(`Видео: ${completed}/${total}`);
    },
  }
);
```

## 🚨 Обработка ошибок

Система автоматически обрабатывает следующие типы ошибок:

- **Rate Limit (429)**: Автоматический cooldown и повтор
- **Quota Exceeded**: Fallback на другой провайдер
- **Timeout**: Retry с backoff
- **Server Error (5xx)**: Circuit breaker
- **Banned**: Уведомление и переключение аккаунта

## 📝 Лучшие практики

1. **Минимум 3 аккаунта на провайдер** - обеспечит непрерывность
2. **Proxy для видео-провайдеров** - снижает риск бана
3. **Мониторинг дневных квот** - настраивайте уведомления
4. **Fallback цепочка** - минимум 3 провайдера
5. **Адаптивная скорость** - включена по умолчанию
