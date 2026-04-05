// Система отказоустойчивости для МУКН | Трафик
// Retry с экспоненциальной задержкой, Circuit Breaker, Graceful Degradation

// ==================== КОНФИГУРАЦИЯ ====================

interface ResilienceConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  circuitBreakerThreshold: number; // количество ошибок для открытия
  circuitBreakerResetTime: number; // ms для полуоткрытого состояния
}

const defaultConfig: ResilienceConfig = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 30000,
};

// ==================== RETRY С ЭКСПОНЕНЦИАЛЬНОЙ ЗАДЕРЖКОЙ ====================

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<ResilienceConfig> = {}
): Promise<T> {
  const cfg = { ...defaultConfig, ...config };
  let lastError: Error | null = null;
  let delay = cfg.initialDelay;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === cfg.maxRetries) {
        break;
      }

      // Проверяем, является ли ошибка фатальной (не повторяем)
      if (isFatalError(error)) {
        throw error;
      }

      console.log(`[Retry] Attempt ${attempt + 1}/${cfg.maxRetries} failed. Retrying in ${delay}ms...`);
      
      await sleep(delay);
      delay = Math.min(delay * cfg.backoffMultiplier, cfg.maxDelay);
    }
  }

  throw lastError;
}

function isFatalError(error: unknown): boolean {
  const message = String(error).toLowerCase();
  // Ошибки, которые не стоит повторять
  const fatalPatterns = [
    'invalid api key',
    'authentication failed',
    'permission denied',
    'not found',
    'bad request',
    'validation error',
  ];
  
  return fatalPatterns.some(pattern => message.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== CIRCUIT BREAKER ====================

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  state: CircuitState;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

export function createCircuitBreaker(name: string, config: Partial<ResilienceConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };
  
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      failures: 0,
      lastFailureTime: null,
      state: 'closed',
    });
  }

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      const state = circuitBreakers.get(name)!;
      
      // Если цепь открыта, проверяем возможность перехода в полуоткрытое состояние
      if (state.state === 'open') {
        const timeSinceLastFailure = Date.now() - (state.lastFailureTime || 0);
        
        if (timeSinceLastFailure >= cfg.circuitBreakerResetTime) {
          state.state = 'half-open';
          console.log(`[CircuitBreaker:${name}] Transitioning to half-open state`);
        } else {
          throw new Error(`CircuitBreaker '${name}' is open. Service unavailable.`);
        }
      }

      try {
        const result = await fn();
        
        // Успешный вызов - сбрасываем счетчик
        if (state.state === 'half-open') {
          state.state = 'closed';
          console.log(`[CircuitBreaker:${name}] Closed after successful call`);
        }
        state.failures = 0;
        
        return result;
      } catch (error) {
        state.failures++;
        state.lastFailureTime = Date.now();
        
        if (state.failures >= cfg.circuitBreakerThreshold) {
          state.state = 'open';
          console.log(`[CircuitBreaker:${name}] Opened after ${state.failures} failures`);
        }
        
        throw error;
      }
    },
    
    getState(): CircuitState {
      return circuitBreakers.get(name)!.state;
    },
    
    reset(): void {
      circuitBreakers.set(name, {
        failures: 0,
        lastFailureTime: null,
        state: 'closed',
      });
      console.log(`[CircuitBreaker:${name}] Reset to closed state`);
    },
  };
}

// ==================== GRACEFUL DEGRADATION ====================

interface FallbackConfig<T> {
  primary: () => Promise<T>;
  fallback: () => Promise<T> | T;
  onPrimaryError?: (error: Error) => void;
}

export async function withFallback<T>(config: FallbackConfig<T>): Promise<T> {
  try {
    return await config.primary();
  } catch (error) {
    config.onPrimaryError?.(error as Error);
    console.log(`[GracefulDegradation] Primary failed, using fallback: ${(error as Error).message}`);
    return await config.fallback();
  }
}

// ==================== TEMPLATE FALLBACKS ====================

// Шаблоны постов при недоступности DeepSeek API
const postTemplates = {
  gambling: [
    '🎰 Сегодня удача на моей стороне! Очередной выигрыш заставляет сердце биться быстрее. Кто со мной?',
    '💰 Жизнь — это игра, и я играю по своим правилам. Главное — знать момент для выхода.',
    '🔥 Еще одна ночь, еще одна победа. Это не просто удача, это интуиция.',
  ],
  crypto: [
    '📈 Рынок снова показывает интересные движения. Кто следит за трендами?',
    '💎 HODL — это не просто стратегия, это философия. Держим позиции!',
    '🚀 Блокчейн меняет мир, и я рад быть частью этого процесса.',
  ],
  nutra: [
    '💪 Трансформация продолжается! Результаты превышают ожидания. Делюсь прогрессом.',
    '🥗 Здоровое питание — это не диета, это образ жизни. Почувствуйте разницу!',
    '✨ Энергия, уверенность, результат. Начни свой путь к лучшей версии себя.',
  ],
  bait: [
    '🔥 Иногда достаточно одного взгляда... Угадайте, о чем я думаю?',
    '💋 Загадочная улыбка может рассказать больше, чем тысячи слов.',
    '💕 Настроение — бунтарское. Кто готов к приключениям?',
  ],
  lifestyle: [
    '🌟 Новый день — новые возможности. Не упускай свой шанс!',
    '🎯 Успех — это не конечная точка, а путь. Наслаждайся каждым шагом.',
    '💫 Мечты сбываются у тех, кто действует. Какая у тебя цель на сегодня?',
  ],
};

const commentTemplates = [
  'Отличный пост! 🔥',
  'Согласен на 100%!',
  'Спасибо за полезную информацию!',
  'Очень вдохновляет! 👏',
  'Интересная мысль...',
];

export function getFallbackPost(niche: string): string {
  const templates = postTemplates[niche as keyof typeof postTemplates] || postTemplates.lifestyle;
  return templates[Math.floor(Math.random() * templates.length)];
}

export function getFallbackComment(): string {
  return commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
}

// ==================== TIMEOUT ====================

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    fn()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ==================== RATE LIMITER ====================

interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

const rateLimiters = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(name: string, config: RateLimiterConfig) {
  return {
    check(): boolean {
      const now = Date.now();
      let limiter = rateLimiters.get(name);
      
      if (!limiter || now > limiter.resetTime) {
        limiter = { count: 0, resetTime: now + config.windowMs };
        rateLimiters.set(name, limiter);
      }
      
      if (limiter.count >= config.maxRequests) {
        return false;
      }
      
      limiter.count++;
      return true;
    },
    
    getRemaining(): number {
      const limiter = rateLimiters.get(name);
      if (!limiter || Date.now() > limiter.resetTime) {
        return config.maxRequests;
      }
      return Math.max(0, config.maxRequests - limiter.count);
    },
    
    getResetTime(): number {
      const limiter = rateLimiters.get(name);
      return limiter?.resetTime || Date.now() + config.windowMs;
    },
  };
}

// ==================== HEALTH CHECK ====================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: { status: string; latency?: number };
    ai: { status: string; circuitState?: CircuitState };
    storage: { status: string };
  };
  metrics: {
    totalInfluencers: number;
    activeAccounts: number;
    pendingTasks: number;
    errorsLastHour: number;
  };
}

// Время старта сервера
const serverStartTime = Date.now();

// Счётчик ошибок
const errorLog: { timestamp: number; error: string }[] = [];
const ERROR_LOG_MAX_AGE = 3600000; // 1 час

// Функция для записи ошибки
export function logError(error: string): void {
  errorLog.push({ timestamp: Date.now(), error });
  // Удаляем старые записи
  const oneHourAgo = Date.now() - ERROR_LOG_MAX_AGE;
  while (errorLog.length > 0 && errorLog[0].timestamp < oneHourAgo) {
    errorLog.shift();
  }
}

// Функция для получения количества ошибок за последний час
function getErrorsLastHour(): number {
  const oneHourAgo = Date.now() - ERROR_LOG_MAX_AGE;
  return errorLog.filter(e => e.timestamp > oneHourAgo).length;
}

export async function getHealthStatus(db: any): Promise<HealthStatus> {
  const errors: string[] = [];
  
  // Проверка базы данных
  let dbStatus = 'healthy';
  let dbLatency: number | undefined;
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
    if (dbLatency > 1000) {
      dbStatus = 'degraded';
    }
  } catch (e) {
    dbStatus = 'unhealthy';
    errors.push('Database connection failed');
  }

  // Проверка AI сервиса
  const aiCircuitBreaker = circuitBreakers.get('deepseek');
  const aiStatus = aiCircuitBreaker?.state === 'open' ? 'unhealthy' : 
                   aiCircuitBreaker?.state === 'half-open' ? 'degraded' : 'healthy';

  // Получаем метрики
  let totalInfluencers = 0;
  let activeAccounts = 0;
  let pendingTasks = 0;
  
  try {
    totalInfluencers = await db.influencer.count();
    activeAccounts = await db.account.count({ where: { status: 'active' } });
    pendingTasks = await db.contentQueue.count({ where: { status: 'pending' } });
  } catch (e) {
    // Игнорируем ошибки при сборе метрик
  }

  const overallStatus = errors.length > 0 ? 'unhealthy' : 
                       (dbStatus === 'degraded' || aiStatus === 'degraded') ? 'degraded' : 'healthy';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    version: '1.0.0',
    services: {
      database: { status: dbStatus, latency: dbLatency },
      ai: { status: aiStatus, circuitState: aiCircuitBreaker?.state },
      storage: { status: 'healthy' },
    },
    metrics: {
      totalInfluencers,
      activeAccounts,
      pendingTasks,
      errorsLastHour: getErrorsLastHour(),
    },
  };
}
