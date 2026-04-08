/**
 * Инициализация системы МУКН
 * 
 * Запускает все необходимые сервисы для автономной работы 24/365:
 * - Очередь задач
 * - Cron планировщик
 * - Обработчики задач
 * - Мониторинг
 */

import { startTaskSystem } from './task-handlers';
import { getEmailService } from './email-notifications';
import { initCaptchaSolver } from './captcha-solver';
import { addLog } from '@/app/api/sim-auto/logs/route';

let isInitialized = false;

export async function initializeSystem(): Promise<void> {
  if (isInitialized) {
    console.log('⚠️ Система уже инициализирована');
    return;
  }

  console.log('🚀 ========================================');
  console.log('🚀 МУКН - Инициализация системы');
  console.log('🚀 ========================================');

  try {
    // 1. Captcha Solver
    const captchaApiKey = process.env.CAPTCHA_API_KEY;
    const captchaProvider = (process.env.CAPTCHA_PROVIDER as any) || '2captcha';

    if (captchaApiKey) {
      initCaptchaSolver({
        provider: captchaProvider,
        apiKey: captchaApiKey
      });
      addLog('success', `🔐 Captcha solver инициализирован (${captchaProvider})`);
    } else {
      addLog('warn', '⚠️ Captcha API ключ не настроен');
    }

    // 2. Email Service
    const emailService = getEmailService();
    if (process.env.SMTP_HOST) {
      addLog('success', '📧 Email сервис настроен');
    } else {
      addLog('info', '📧 Email сервис не настроен (SMTP_* переменные отсутствуют)');
    }

    // 3. Task System (Queue + Cron + Handlers)
    await startTaskSystem();
    addLog('success', '📋 Система задач запущена');

    // 4. Proxy Manager инициализация (ленивая, при первом использовании)
    addLog('info', '🌐 Прокси менеджер готов к работе');

    isInitialized = true;

    console.log('🚀 ========================================');
    console.log('🚀 МУКН - Система готова к работе 24/365');
    console.log('🚀 ========================================');

    addLog('success', '🚀 МУКН полностью инициализирован и готов к работе');

  } catch (error: any) {
    console.error('❌ Ошибка инициализации:', error);
    addLog('error', `❌ Ошибка инициализации: ${error.message}`);
    throw error;
  }
}

/**
 * Проверка состояния системы
 */
export async function getSystemStatus(): Promise<{
  initialized: boolean;
  components: {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  }[];
}> {
  const components: { name: string; status: 'ok' | 'warning' | 'error'; message: string }[] = [];

  // Database
  try {
    const { default: prisma } = await import('./prisma');
    await prisma.$queryRaw`SELECT 1`;
    components.push({ name: 'Database', status: 'ok', message: 'Подключена' });
  } catch (error) {
    components.push({ name: 'Database', status: 'error', message: 'Ошибка подключения' });
  }

  // Captcha
  const captchaApiKey = process.env.CAPTCHA_API_KEY;
  components.push({
    name: 'Captcha Solver',
    status: captchaApiKey ? 'ok' : 'warning',
    message: captchaApiKey ? 'Настроен' : 'Не настроен (CAPTCHA_API_KEY)'
  });

  // Email
  components.push({
    name: 'Email Notifications',
    status: process.env.SMTP_HOST ? 'ok' : 'warning',
    message: process.env.SMTP_HOST ? 'Настроен' : 'Не настроен'
  });

  // Task Queue
  components.push({
    name: 'Task Queue',
    status: isInitialized ? 'ok' : 'warning',
    message: isInitialized ? 'Работает' : 'Не запущена'
  });

  // Cron Scheduler
  components.push({
    name: 'Cron Scheduler',
    status: isInitialized ? 'ok' : 'warning',
    message: isInitialized ? 'Работает' : 'Не запущен'
  });

  // Telegram Bot
  components.push({
    name: 'Telegram Notifications',
    status: process.env.TELEGRAM_BOT_TOKEN ? 'ok' : 'warning',
    message: process.env.TELEGRAM_BOT_TOKEN ? 'Настроен' : 'Не настроен'
  });

  return {
    initialized: isInitialized,
    components
  };
}

/**
 * Graceful shutdown
 */
export async function shutdownSystem(): Promise<void> {
  console.log('🛑 Остановка системы...');

  const { getTaskQueue } = await import('./task-queue');
  const { getCronScheduler } = await import('./cron-scheduler');

  try {
    getTaskQueue().stop();
    getCronScheduler().stop();

    isInitialized = false;
    console.log('🛑 Система остановлена');
  } catch (error) {
    console.error('Ошибка при остановке:', error);
  }
}

// Обработчики shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM получен');
    await shutdownSystem();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT получен');
    await shutdownSystem();
    process.exit(0);
  });
}
