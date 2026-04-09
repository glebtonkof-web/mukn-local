/**
 * Z-AI SDK Configuration
 * 
 * Централизованная конфигурация для z-ai-web-dev-sdk
 * Автоматически загружает настройки из .z-ai-config или переменных окружения
 */

import ZAI from 'z-ai-web-dev-sdk';

// Конфигурация по умолчанию
const DEFAULT_CONFIG = {
  apiKey: process.env.Z_AI_API_KEY || process.env.AI_API_KEY || '',
  baseUrl: process.env.Z_AI_BASE_URL || undefined,
  timeout: parseInt(process.env.Z_AI_TIMEOUT || '60000'),
  retries: parseInt(process.env.Z_AI_RETRIES || '3'),
};

// Singleton instance
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
let initPromise: Promise<Awaited<ReturnType<typeof ZAI.create>>> | null = null;

/**
 * Инициализация Z-AI SDK
 * Поддерживает несколько способов конфигурации:
 * 1. Файл .z-ai-config в корне проекта
 * 2. Переменные окружения (Z_AI_API_KEY, etc.)
 * 3. Конфигурация по умолчанию
 */
export async function getZAI(): Promise<Awaited<ReturnType<typeof ZAI.create>>> {
  // Возвращаем существующий инстанс
  if (zaiInstance) {
    return zaiInstance;
  }

  // Если уже идёт инициализация - ждём
  if (initPromise) {
    return initPromise;
  }

  // Начинаем инициализацию
  initPromise = initZAI();
  zaiInstance = await initPromise;
  return zaiInstance;
}

async function initZAI() {
  try {
    // Пробуем создать с конфигурацией
    const config: Record<string, unknown> = {};
    
    if (DEFAULT_CONFIG.apiKey) {
      config.apiKey = DEFAULT_CONFIG.apiKey;
    }
    if (DEFAULT_CONFIG.baseUrl) {
      config.baseUrl = DEFAULT_CONFIG.baseUrl;
    }
    if (Object.keys(config).length > 0) {
      console.log('[Z-AI] Initializing with config...');
      return await ZAI.create(config);
    }
    
    // Пробуем без конфигурации (SDK может найти .z-ai-config сам)
    console.log('[Z-AI] Initializing with default config...');
    return await ZAI.create();
  } catch (error: any) {
    console.error('[Z-AI] Initialization error:', error.message);
    throw new Error(`Z-AI SDK initialization failed: ${error.message}. Please check .z-ai-config or Z_AI_API_KEY environment variable.`);
  }
}

/**
 * Сбросить инстанс (для тестов)
 */
export function resetZAI(): void {
  zaiInstance = null;
  initPromise = null;
}

/**
 * Проверить инициализирован ли SDK
 */
export function isZAIReady(): boolean {
  return zaiInstance !== null;
}

// Экспорт типов
export type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>;

// Экспорт по умолчанию для совместимости
export default getZAI;
