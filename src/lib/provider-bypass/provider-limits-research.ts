/**
 * Provider Limits Research
 * 
 * Детальное исследование ограничений каждого провайдера
 * и способы их обхода для 24/365 генерации контента
 */

// ============================================================
// 1. CEREBRAS AI
// ============================================================
export const CEREBRAS_LIMITS = {
  provider: 'cerebras',
  
  // Официальные лимиты (бесплатный tier)
  limits: {
    // Rate limits
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 14400, // ~10 запросов в минуту в среднем
    
    // Token limits  
    tokensPerMinute: 60000000, // 60M tokens/min - очень много!
    tokensPerRequest: 128000,
    
    // Concurrent
    maxConcurrent: 10,
    
    // Pricing
    isFree: true,
    costPer1MTokens: 0, // Бесплатно!
  },
  
  // Специфика
  features: {
    extremeSpeed: true, // Самый быстрый inference
    models: ['llama-3.3-70b', 'llama-3.1-70b', 'llama-3.1-8b'],
    streaming: true,
    functionCalling: true,
  },
  
  // Ограничения
  restrictions: {
    noImageGeneration: true,
    noVideoGeneration: true,
    textOnly: true,
    requiresApiKey: true,
    geoRestrictions: [], // Нет гео-ограничений
  },
  
  // Способы обхода
  bypassStrategies: {
    // Стратегия 1: Multi-account rotation
    multiAccount: {
      description: 'Регистрация нескольких аккаунтов',
      effectiveness: 'high',
      method: 'Создать 5-10 аккаунтов с разными email',
      dailyCapacity: '14400 × N аккаунтов',
    },
    
    // Стратегия 2: Request queueing
    requestQueue: {
      description: 'Распределение запросов во времени',
      effectiveness: 'medium',
      method: 'Равномерное распределение 14400 запросов на 24 часа',
      optimalRate: '10 req/min steady',
    },
    
    // Стратегия 3: Token optimization
    tokenOptimization: {
      description: 'Оптимизация размера запросов',
      effectiveness: 'medium',
      method: 'Меньше токенов = больше запросов',
    },
  },
  
  // Известные ошибки
  errors: {
    rateLimit: {
      code: 429,
      message: 'Rate limit exceeded',
      cooldown: 60000, // 1 минута
      retryAfter: true,
    },
    contextLimit: {
      code: 400,
      message: 'Context length exceeded',
      solution: 'Уменьшить размер контекста',
    },
  },
};

// ============================================================
// 2. GROQ
// ============================================================
export const GROQ_LIMITS = {
  provider: 'groq',
  
  limits: {
    // Free tier
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 1000, // Строже чем Cerebras!
    
    // Token limits
    tokensPerMinute: 18000, // Намного меньше
    tokensPerRequest: 131072,
    
    // Concurrent
    maxConcurrent: 5,
    
    // Pricing
    isFree: true,
    costPer1MTokens: 0,
  },
  
  features: {
    fastInference: true,
    models: ['llama-3.3-70b-versatile', 'llama-3.3-70b-specdec', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    streaming: true,
    functionCalling: true,
    jsonMode: true,
  },
  
  restrictions: {
    textOnly: true,
    requiresApiKey: true,
    tierSystem: true, // Free vs Pro tiers
  },
  
  bypassStrategies: {
    multiAccount: {
      description: 'Несколько аккаунтов',
      effectiveness: 'high',
      method: 'Каждый аккаунт = 1000 запросов/день',
      recommended: '3-5 аккаунтов минимум',
    },
    
    tierUpgrade: {
      description: 'Upgrade на Pro tier',
      effectiveness: 'high',
      method: 'Платный tier снимает дневной лимит',
      cost: '~$0.59/1M tokens',
    },
    
    rateSpreading: {
      description: 'Равномерное распределение',
      effectiveness: 'medium',
      method: '1000 / 1440 мин = ~0.7 req/min',
    },
  },
  
  errors: {
    rateLimit: {
      code: 429,
      message: 'Rate limit reached',
      header: 'x-ratelimit-reset',
      cooldown: 60000,
    },
    tokenLimit: {
      message: 'Token limit exceeded',
      solution: 'Уменьшить max_tokens',
    },
  },
};

// ============================================================
// 3. GOOGLE GEMINI
// ============================================================
export const GEMINI_LIMITS = {
  provider: 'gemini',
  
  limits: {
    // Free tier
    requestsPerMinute: 15,
    requestsPerHour: 100,
    requestsPerDay: 500, // 1500 для некоторых моделей
    
    // Token limits
    tokensPerMinute: 1000000, // 1M TPM
    tokensPerRequest: 200000, // 2M для Pro
    
    // Concurrent
    maxConcurrent: 10,
    
    // Pricing
    isFree: true,
    paidTiers: ['free', 'pay-as-you-go', 'pro'],
  },
  
  features: {
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    multimodal: true, // Изображения!
    longContext: true, // До 2M токенов
    streaming: true,
    codeExecution: true,
  },
  
  restrictions: {
    requiresApiKey: true,
    regionLock: true,
    blockedRegions: ['CN', 'RU', 'IR', 'KP', 'CU'], // Нужно proxy!
    contentFiltering: true, // Strict safety filters
  },
  
  bypassStrategies: {
    proxyRotation: {
      description: 'Proxy для обхода geo-ограничений',
      effectiveness: 'critical',
      method: 'Proxy в разрешенных регионах (US, EU)',
      proxyTypes: ['residential', 'datacenter'],
    },
    
    multiAccount: {
      description: 'Несколько Google аккаунтов',
      effectiveness: 'high',
      method: 'Google accounts с разными proxy',
      dailyCapacity: '500 × N',
    },
    
    modelRotation: {
      description: 'Чередование моделей',
      effectiveness: 'medium',
      method: 'Flash быстрее, Pro умнее',
    },
    
    safetyBypass: {
      description: 'Обход content filtering',
      effectiveness: 'variable',
      method: 'Переформулировка промптов',
      tips: ['Избегать_sensitive_words', 'Использовать_euphemisms'],
    },
  },
  
  errors: {
    rateLimit: {
      code: 429,
      message: 'RESOURCE_EXHAUSTED',
      header: 'x-ratelimit-remaining',
    },
    safetyBlocked: {
      code: 400,
      message: 'SAFETY',
      solution: 'Модифицировать промпт',
    },
    geoBlocked: {
      message: 'Location not supported',
      solution: 'Использовать proxy',
    },
  },
};

// ============================================================
// 4. DEEPSEEK
// ============================================================
export const DEEPSEEK_LIMITS = {
  provider: 'deepseek',
  
  limits: {
    // Платный сервис
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    
    // Token limits
    tokensPerMinute: 1000000,
    tokensPerRequest: 64000,
    
    // Pricing (очень дешёвый!)
    isFree: false,
    pricing: {
      input: '$0.14/1M tokens', // DeepSeek Chat
      output: '$0.28/1M tokens',
      reasoner: {
        input: '$0.55/1M tokens',
        output: '$2.19/1M tokens',
      },
    },
  },
  
  features: {
    models: ['deepseek-chat', 'deepseek-reasoner'],
    reasoning: true, // R1 модель!
    coding: true, // Отлично для кода
    streaming: true,
    longContext: true,
  },
  
  restrictions: {
    requiresApiKey: true,
    requiresPayment: true,
    minimumBalance: 5,
  },
  
  bypassStrategies: {
    multiAccount: {
      description: 'Несколько аккаунтов с балансом',
      effectiveness: 'high',
      method: 'Разные email, разные способы оплаты',
      cost: 'Минимальный баланс $5/аккаунт',
    },
    
    accountPool: {
      description: 'Пул аккаунтов с предоплатой',
      effectiveness: 'high',
      method: 'Предварительно пополнить несколько аккаунтов',
    },
    
    deepseekFreeWeb: {
      description: 'Бесплатный веб-интерфейс',
      effectiveness: 'medium',
      method: 'Автоматизация через браузер',
      limitations: ['Rate limits ниже', 'Нет API', 'Нужна автоматизация'],
    },
  },
  
  errors: {
    insufficientBalance: {
      message: 'Insufficient balance',
      solution: 'Пополнить баланс',
    },
    rateLimit: {
      code: 429,
      cooldown: 60000,
    },
  },
};

// ============================================================
// 5. OPENROUTER
// ============================================================
export const OPENROUTER_LIMITS = {
  provider: 'openrouter',
  
  limits: {
    // Free tier
    requestsPerMinute: 20,
    requestsPerHour: 200,
    requestsPerDay: 50, // Строго!
    
    // Token limits
    tokensPerRequest: 128000,
    
    // Pricing
    isFree: true, // С ограничениями
    freeModels: ['google/gemini-2.0-flash-exp:free'],
    paidModels: ['deepseek/*', 'anthropic/*', 'openai/*'],
  },
  
  features: {
    models: '100+ моделей от разных провайдеров',
    aggregation: true, // Единый API для всех
    fallback: true, // Автоматический fallback
  },
  
  restrictions: {
    requiresApiKey: true,
    credits: true, // Credit system
    freeModelsLimited: true,
  },
  
  bypassStrategies: {
    multiAccount: {
      description: 'Несколько аккаунтов',
      effectiveness: 'high',
      method: 'Каждый = 50 бесплатных запросов',
    },
    
    paidCredits: {
      description: 'Покупка кредитов',
      effectiveness: 'high',
      method: 'Кредиты не имеют дневного лимита',
      cost: '$5 минимум',
    },
    
    modelSelection: {
      description: 'Выбор бесплатных моделей',
      effectiveness: 'medium',
      method: 'Использовать :free модели',
    },
  },
};

// ============================================================
// 6. ANTHROPIC CLAUDE
// ============================================================
export const CLAUDE_LIMITS = {
  provider: 'claude',
  
  limits: {
    // По tier'ам
    tiers: {
      free: {
        requestsPerDay: 10,
        tokensPerDay: 50000,
      },
      tier1: {
        requestsPerMinute: 5,
        tokensPerMinute: 100000,
      },
      tier2: {
        requestsPerMinute: 20,
        tokensPerMinute: 400000,
      },
      tier3: {
        requestsPerMinute: 50,
        tokensPerMinute: 800000,
      },
      tier4: {
        requestsPerMinute: 100,
        tokensPerMinute: 2000000,
      },
    },
    
    tokensPerRequest: 200000,
    
    // Pricing
    isFree: false,
    pricing: {
      'claude-3.5-sonnet': {
        input: '$3/1M tokens',
        output: '$15/1M tokens',
      },
      'claude-3-opus': {
        input: '$15/1M tokens',
        output: '$75/1M tokens',
      },
    },
  },
  
  features: {
    models: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    longContext: true,
    vision: true,
    codeExecution: true,
    artifacts: true,
  },
  
  restrictions: {
    requiresApiKey: true,
    requiresPayment: true,
    strictTiers: true,
    usageBasedTierUpgrade: true,
  },
  
  bypassStrategies: {
    multiAccount: {
      description: 'Несколько аккаунтов с разными tier',
      effectiveness: 'medium',
      method: 'Требует разные способы оплаты',
      limitations: ['Антифрод системы', 'Верификация'],
    },
    
    tierProgression: {
      description: 'Постепенное повышение tier',
      effectiveness: 'high',
      method: 'Активное использование → автоматический апгрейд',
    },
    
    haikuFallback: {
      description: 'Использование Haiku для простых задач',
      effectiveness: 'high',
      method: 'Haiku дешевле и быстрее',
      cost: '$0.25/1M input',
    },
  },
};

// ============================================================
// 7. VIDEO PROVIDERS (Kling, Luma, Runway, Pika)
// ============================================================
export const VIDEO_PROVIDERS = {
  kling: {
    provider: 'kling',
    
    limits: {
      requestsPerDay: 100, // Free tier
      videoLength: '5-10 sec', // Бесплатно
      resolution: '720p',
      queue: true, // Очередь генерации
      waitTime: '2-10 min', // Время ожидания
    },
    
    restrictions: {
      requiresAccount: true,
      geoRestrictions: true,
      contentPolicy: true,
    },
    
    bypassStrategies: {
      multiAccount: {
        description: 'Несколько аккаунтов',
        effectiveness: 'high',
        method: 'Разные email + proxy',
      },
      proxy: {
        description: 'Proxy для обхода geo',
        effectiveness: 'critical',
        regions: ['US', 'EU', 'JP'],
      },
      schedule: {
        description: 'Генерация в off-peak часы',
        effectiveness: 'medium',
        bestTimes: ['Night', 'Early morning'],
      },
    },
  },
  
  luma: {
    provider: 'luma',
    
    limits: {
      requestsPerDay: 50,
      videoLength: '5 sec',
      resolution: '720p',
      waitTime: '1-5 min',
    },
    
    bypassStrategies: {
      multiAccount: {
        effectiveness: 'high',
        method: '5+ аккаунтов для 250+ видео/день',
      },
    },
  },
  
  runway: {
    provider: 'runway',
    
    limits: {
      requestsPerDay: 30,
      videoLength: '4 sec',
      resolution: '720p',
      waitTime: '5-15 min',
      credits: true, // Credit system
    },
    
    pricing: {
      free: '30 credits/month',
      standard: '$12/month = 625 credits',
    },
    
    bypassStrategies: {
      multiAccount: {
        effectiveness: 'medium',
        method: 'Лимит на аккаунт',
      },
      creditPurchase: {
        effectiveness: 'high',
        cost: '$0.02/credit',
      },
    },
  },
  
  pika: {
    provider: 'pika',
    
    limits: {
      requestsPerDay: 50,
      videoLength: '3 sec',
      waitTime: '2-5 min',
    },
    
    bypassStrategies: {
      multiAccount: {
        effectiveness: 'high',
      },
      discordBot: {
        description: 'Использование Discord бота',
        effectiveness: 'medium',
      },
    },
  },
};

// ============================================================
// 8. IMAGE PROVIDERS (Stability, Midjourney, DALL-E)
// ============================================================
export const IMAGE_PROVIDERS = {
  stability: {
    provider: 'stability',
    
    limits: {
      requestsPerDay: 500, // Free tier
      requestsPerMinute: 10,
      imagesPerRequest: 1,
    },
    
    pricing: {
      free: '500 credits/month',
      paid: '$0.002-0.02/image',
    },
    
    bypassStrategies: {
      multiAccount: {
        effectiveness: 'high',
        method: 'Разные email аккаунты',
      },
    },
  },
  
  midjourney: {
    provider: 'midjourney',
    
    limits: {
      concurrentJobs: 3, // Basic tier
      fastHours: '3.3/month', // Basic
      relaxMode: true, // Неограниченно в Basic+
    },
    
    pricing: {
      basic: '$10/month',
      standard: '$30/month',
      pro: '$60/month',
    },
    
    bypassStrategies: {
      multiAccount: {
        effectiveness: 'medium',
        limitations: ['Discord account required', 'Payment verification'],
      },
      relaxMode: {
        description: 'Relax mode для неограниченной генерации',
        effectiveness: 'high',
        waitTime: '1-10 min',
      },
    },
  },
  
  dalle: {
    provider: 'dalle',
    
    limits: {
      dependsOnTier: true,
      tier1: '500 images/day',
    },
    
    pricing: {
      standard: '$0.04/image (1024x1024)',
      hd: '$0.08/image (1024x1024)',
    },
    
    bypassStrategies: {
      multiAccount: {
        effectiveness: 'high',
        method: 'Разные OpenAI аккаунты',
      },
    },
  },
};

// ============================================================
// 9. AUDIO PROVIDERS (ElevenLabs)
// ============================================================
export const AUDIO_PROVIDERS = {
  elevenlabs: {
    provider: 'elevenlabs',
    
    limits: {
      charactersPerMonth: 5000, // Free tier
      concurrentRequests: 3,
    },
    
    pricing: {
      free: '5K chars/month',
      starter: '$5/mo = 30K chars',
      creator: '$22/mo = 100K chars',
    },
    
    bypassStrategies: {
      multiAccount: {
        effectiveness: 'high',
        method: 'Разные email = 5K chars каждый',
      },
      voiceCloning: {
        limitations: 'Требует платный tier',
      },
    },
  },
};

// ============================================================
// COMPREHENSIVE BYPASS RECOMMENDATIONS
// ============================================================
export const BYPASS_RECOMMENDATIONS = {
  
  // Для текстовой генерации 24/365
  textGeneration: {
    primaryProvider: 'cerebras',
    primaryReason: 'Самые высокие лимиты, бесплатно',
    
    fallbackChain: ['cerebras', 'groq', 'gemini', 'deepseek'],
    
    recommendedSetup: {
      accounts: {
        cerebras: 3, // 43,200 requests/day
        groq: 3,     // 3,000 requests/day
        gemini: 2,   // 1,000 requests/day
      },
      proxy: {
        required: ['gemini'],
        recommended: ['cerebras', 'groq'],
        type: 'residential',
      },
      dailyCapacity: '47,200+ requests',
    },
  },
  
  // Для генерации видео
  videoGeneration: {
    primaryProvider: 'kling',
    fallbackChain: ['kling', 'luma', 'runway', 'pika'],
    
    recommendedSetup: {
      accounts: {
        kling: 5,   // 500 videos/day
        luma: 3,    // 150 videos/day
        runway: 2,  // 60 videos/day
      },
      proxy: 'Required for all',
      dailyCapacity: '710 videos',
    },
  },
  
  // Для генерации изображений
  imageGeneration: {
    primaryProvider: 'stability',
    fallbackChain: ['stability', 'dalle', 'midjourney'],
    
    recommendedSetup: {
      accounts: {
        stability: 3,  // 1500 images/day
        dalle: 2,      // 1000 images/day
      },
      dailyCapacity: '2500+ images',
    },
  },
  
  // Общие принципы
  generalPrinciples: [
    'Всегда иметь минимум 3 аккаунта на провайдера',
    'Использовать proxy для всех провайдеров',
    'Настроить автоматический fallback',
    'Мониторить использование квот',
    'Равномерно распределять нагрузку',
    'Использовать очередь запросов',
    'Кэшировать повторяющиеся запросы',
  ],
};

export default {
  cerebras: CEREBRAS_LIMITS,
  groq: GROQ_LIMITS,
  gemini: GEMINI_LIMITS,
  deepseek: DEEPSEEK_LIMITS,
  openrouter: OPENROUTER_LIMITS,
  claude: CLAUDE_LIMITS,
  video: VIDEO_PROVIDERS,
  image: IMAGE_PROVIDERS,
  audio: AUDIO_PROVIDERS,
  recommendations: BYPASS_RECOMMENDATIONS,
};
