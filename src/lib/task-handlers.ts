/**
 * Обработчики задач для очереди
 */

import { getTaskQueue, TaskHandler } from './task-queue';
import { getProxyManager } from './sim-auto/proxy-manager';
import { addLog } from '@/app/api/sim-auto/logs/route';
import prisma from './prisma';

/**
 * Инициализировать все обработчики задач
 */
export function initTaskHandlers(): void {
  const queue = getTaskQueue();

  // Обновление прокси
  queue.register({
    name: 'proxy-refresh',
    handle: async (task) => {
      addLog('info', '🔄 Начинаем обновление списка прокси...');
      
      const manager = getProxyManager();
      await manager.refreshProxies();
      
      const stats = manager.getStats();
      addLog('success', `✅ Прокси обновлены. Рабочих: ${stats.workingProxies}`);
      
      return { workingProxies: stats.workingProxies };
    },
    maxAttempts: 2,
    timeout: 300000 // 5 минут
  });

  // Валидация прокси
  queue.register({
    name: 'proxy-validate',
    handle: async (task) => {
      addLog('info', '🔍 Проверка работоспособности прокси...');
      
      const manager = getProxyManager();
      const stats = manager.getStats();
      
      // Если рабочих прокси мало, обновляем
      if (stats.workingProxies < 5) {
        addLog('warn', `⚠️ Мало рабочих прокси (${stats.workingProxies}), запускаем обновление...`);
        await manager.refreshProxies();
      }
      
      return { validated: true, workingProxies: manager.getStats().workingProxies };
    },
    maxAttempts: 2,
    timeout: 60000
  });

  // Проверка здоровья аккаунтов
  queue.register({
    name: 'accounts-health-check',
    handle: async (task) => {
      addLog('info', '🏥 Проверка состояния аккаунтов...');
      
      const accounts = await prisma.account.findMany({
        where: { status: 'active' }
      });

      let healthy = 0;
      let warnings = 0;
      let errors = 0;

      for (const account of accounts) {
        // Проверяем lastUsedAt
        const lastUsed = account.lastUsedAt ? new Date(account.lastUsedAt) : null;
        const hoursSinceUse = lastUsed 
          ? (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60)
          : 999;

        if (hoursSinceUse > 24) {
          warnings++;
        } else {
          healthy++;
        }

        // Проверяем banRisk
        if (account.banRisk > 70) {
          errors++;
          await prisma.account.update({
            where: { id: account.id },
            data: { status: 'warning' }
          });
        }
      }

      addLog('success', `🏥 Проверка завершена: ${healthy} здоровых, ${warnings} неактивных, ${errors} с рисками`);
      
      return { healthy, warnings, errors };
    },
    maxAttempts: 2,
    timeout: 120000
  });

  // Очистка старых задач
  queue.register({
    name: 'cleanup-old-tasks',
    handle: async (task) => {
      const olderThanDays = task.payload?.olderThanDays || 7;
      
      addLog('info', `🧹 Очистка задач старше ${olderThanDays} дней...`);
      
      const queue = getTaskQueue();
      const deleted = await queue.cleanCompleted(olderThanDays);
      
      addLog('success', `🧹 Удалено ${deleted} старых задач`);
      
      return { deleted };
    },
    maxAttempts: 1,
    timeout: 60000
  });

  // Резервное копирование БД
  queue.register({
    name: 'backup-database',
    handle: async (task) => {
      addLog('info', '💾 Создание резервной копии БД...');
      
      try {
        const fs = require('fs');
        const path = require('path');
        
        const dbPath = path.join(process.cwd(), 'db', 'custom.db');
        const backupDir = path.join(process.cwd(), 'backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
        
        // Создаём директорию если нет
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Копируем файл
        fs.copyFileSync(dbPath, backupPath);
        
        // Сжимаем
        const zlib = require('zlib');
        const gzip = zlib.createGzip();
        const compressedPath = `${backupPath}.gz`;
        
        await new Promise((resolve, reject) => {
          const input = fs.createReadStream(backupPath);
          const output = fs.createWriteStream(compressedPath);
          input.pipe(gzip).pipe(output);
          output.on('finish', () => {
            fs.unlinkSync(backupPath); // Удаляем несжатый
            resolve(void 0);
          });
          output.on('error', reject);
        });

        addLog('success', `💾 Бэкап создан: ${compressedPath}`);
        
        return { backupPath: compressedPath };
      } catch (error: any) {
        addLog('error', `❌ Ошибка бэкапа: ${error.message}`);
        throw error;
      }
    },
    maxAttempts: 2,
    timeout: 120000
  });

  // Сброс дневной статистики
  queue.register({
    name: 'daily-stats-reset',
    handle: async (task) => {
      addLog('info', '📊 Сброс дневной статистики...');
      
      // Сбрасываем дневные счётчики аккаунтов
      await prisma.account.updateMany({
        data: {
          dailyComments: 0,
          dailyDm: 0,
          dailyFollows: 0,
          dailyLikes: 0
        }
      });

      addLog('success', '📊 Дневная статистика сброшена');
      
      return { reset: true };
    },
    maxAttempts: 1,
    timeout: 60000
  });

  // Регистрация аккаунта с чекпоинтами и sticky sessions
  queue.register({
    name: 'account-register',
    handle: async (task) => {
      const { platform, simCardId, deviceId } = task.payload;
      
      addLog('info', `📝 Регистрация аккаунта: ${platform}`, `SIM: ${simCardId}`);
      
      const { getCheckpointService } = await import('./checkpoint-service');
      const { getStickySessions } = await import('./sticky-sessions');
      const { getProxyManager } = await import('./sim-auto/proxy-manager');
      
      const checkpointService = getCheckpointService();
      const stickySessions = getStickySessions();
      const proxyManager = getProxyManager();
      
      // Шаги регистрации
      const steps = [
        'init',
        'get-proxy',
        'bind-proxy',
        'open-app',
        'enter-phone',
        'verify-sms',
        'complete-profile',
        'verify-email',
        'finish'
      ];
      
      // Создаём сессию регистрации
      const sessionId = await checkpointService.createRegistrationSession(
        simCardId,
        platform,
        deviceId,
        steps
      );
      
      try {
        // Шаг 1: Получаем рабочий прокси
        await checkpointService.updateRegistrationProgress(sessionId, 'get-proxy', 1, steps.length);
        const proxy = await proxyManager.getWorkingProxy();
        
        if (!proxy) {
          throw new Error('Нет доступных рабочих прокси');
        }
        
        // Шаг 2: Привязываем прокси (sticky session)
        await checkpointService.updateRegistrationProgress(sessionId, 'bind-proxy', 2, steps.length, {
          proxyId: proxy.id,
          proxyHost: proxy.host
        });
        
        const stickySession = await stickySessions.bind(proxy.id, {
          host: proxy.host,
          port: proxy.port,
          username: proxy.username,
          password: proxy.password,
          protocol: proxy.protocol
        }, {
          platform,
          bindDuration: 7200 // 2 часа на регистрацию
        });
        
        addLog('info', `🔗 Прокси привязан: ${proxy.host}:${proxy.port}`);
        
        // Шаги 3-8: Выполняем регистрацию
        // Здесь будет интеграция с реальной логикой регистрации
        // sim-auto/improved-registration.ts
        
        for (let i = 2; i < steps.length - 1; i++) {
          await checkpointService.updateRegistrationProgress(sessionId, steps[i], i + 1, steps.length);
          // Имитация шага регистрации
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Финальный шаг
        await checkpointService.updateRegistrationProgress(sessionId, 'finish', steps.length, steps.length, {
          accountId: `acc_${Date.now()}`,
          registeredAt: new Date().toISOString()
        });
        
        addLog('success', `✅ Аккаунт зарегистрирован: ${platform}`);
        
        return { 
          registered: true, 
          platform, 
          sessionId,
          proxyId: proxy.id
        };
        
      } catch (error: any) {
        // Сохраняем ошибку в чекпоинте
        await checkpointService.fail('registration', sessionId, 'error', error.message, true);
        
        // Добавляем в DLQ если это последняя попытка
        if (task.attempts >= (task.maxAttempts || 3)) {
          const { getDeadLetterQueue } = await import('./dead-letter-queue');
          const dlq = getDeadLetterQueue();
          await dlq.add(task.id, 'account-register', task.payload, error, {
            priority: task.priority,
            metadata: { sessionId, simCardId, platform }
          });
        }
        
        throw error;
      }
    },
    maxAttempts: 3,
    timeout: 300000,
    onError: async (task, error) => {
      addLog('error', `❌ Ошибка регистрации: ${error.message}`);
    },
    onComplete: async (task, result) => {
      addLog('success', `✅ Аккаунт зарегистрирован: ${result.platform}`);
    }
  });

  // Прогрев аккаунта
  queue.register({
    name: 'account-warming',
    handle: async (task) => {
      const { accountId, platform } = task.payload;

      addLog('info', `🔥 Прогрев аккаунта: ${accountId}`, `Платформа: ${platform}`);

      // Обновляем статус
      await prisma.account.update({
        where: { id: accountId },
        data: {
          status: 'warming',
          warmingStartedAt: new Date()
        }
      });

      // Здесь будет логика прогрева
      // Интеграция с warming-manager

      return { warming: true, accountId };
    },
    maxAttempts: 2,
    timeout: 600000, // 10 минут
    onError: async (task, error) => {
      addLog('error', `❌ Ошибка прогрева: ${error.message}`);
    }
  });

  // Возобновление регистрации с чекпоинта
  queue.register({
    name: 'resume-registration',
    handle: async (task) => {
      const { sessionId } = task.payload;
      
      addLog('info', `🔄 Возобновление регистрации: ${sessionId}`);
      
      const { getCheckpointService } = await import('./checkpoint-service');
      const { getStickySessions } = await import('./sticky-sessions');
      
      const checkpointService = getCheckpointService();
      const stickySessions = getStickySessions();
      
      // Получаем последний чекпоинт
      const { canResume, step } = await checkpointService.canResume('registration', sessionId);
      
      if (!canResume || !step) {
        throw new Error('Невозможно возобновить регистрацию');
      }
      
      const data = step.data || {};
      
      addLog('info', `📍 Возобновление с шага ${step.stepNumber}/${step.totalSteps}: ${step.stepName}`);
      
      // Если есть привязанный прокси, проверяем сессию
      if (data.proxyId) {
        const existingSession = await stickySessions.getForProxy(data.proxyId);
        if (existingSession) {
          addLog('info', `🔗 Найдена активная sticky сессия для прокси ${data.proxyHost}`);
        }
      }
      
      // Продолжаем регистрацию с нужного шага
      const steps = [
        'init',
        'get-proxy',
        'bind-proxy',
        'open-app',
        'enter-phone',
        'verify-sms',
        'complete-profile',
        'verify-email',
        'finish'
      ];
      
      const startFrom = step.stepNumber;
      
      for (let i = startFrom; i < steps.length; i++) {
        await checkpointService.updateRegistrationProgress(sessionId, steps[i], i + 1, steps.length);
        // Имитация шага
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      addLog('success', `✅ Регистрация возобновлена и завершена: ${sessionId}`);
      
      return { resumed: true, sessionId };
    },
    maxAttempts: 3,
    timeout: 300000,
    onError: async (task, error) => {
      addLog('error', `❌ Ошибка возобновления: ${error.message}`);
    }
  });

  // Очистка DLQ
  queue.register({
    name: 'dlq-cleanup',
    handle: async (task) => {
      const { olderThanDays = 30 } = task.payload || {};
      addLog('info', `🧹 Очистка DLQ (старше ${olderThanDays} дней)...`);

      const { getDeadLetterQueue } = await import('./dead-letter-queue');
      const dlq = getDeadLetterQueue();
      const deleted = await dlq.cleanup(olderThanDays);

      addLog('success', `🧹 DLQ очищена: удалено ${deleted} записей`);
      return { deleted };
    },
    maxAttempts: 1,
    timeout: 60000
  });

  // Очистка истекших чекпоинтов
  queue.register({
    name: 'checkpoints-cleanup',
    handle: async (task) => {
      addLog('info', '🧹 Очистка истекших чекпоинтов...');

      const { getCheckpointService } = await import('./checkpoint-service');
      const checkpointService = getCheckpointService();
      const deleted = await checkpointService.cleanupExpired();

      addLog('success', `🧹 Удалено ${deleted} истекших чекпоинтов`);
      return { deleted };
    },
    maxAttempts: 1,
    timeout: 60000
  });

  // Очистка sticky сессий
  queue.register({
    name: 'sticky-sessions-cleanup',
    handle: async (task) => {
      addLog('info', '🧹 Очистка истекших sticky сессий...');

      const { getStickySessions } = await import('./sticky-sessions');
      const sticky = getStickySessions();
      const expired = await sticky.cleanupExpired();

      addLog('success', `🧹 Пометено как expired: ${expired} sticky сессий`);
      return { expired };
    },
    maxAttempts: 1,
    timeout: 60000
  });

  // Сбор системных метрик
  queue.register({
    name: 'collect-metrics',
    handle: async (task) => {
      addLog('info', '📊 Сбор системных метрик...');

      const { getSystemMetrics } = await import('./system-metrics');
      const metrics = getSystemMetrics();
      await metrics.collectSystemMetrics();

      addLog('success', '📊 Метрики собраны');
      return { collected: true };
    },
    maxAttempts: 1,
    timeout: 60000
  });

  // Очистка старых метрик
  queue.register({
    name: 'metrics-cleanup',
    handle: async (task) => {
      const { olderThanDays = 30 } = task.payload || {};
      addLog('info', `📊 Очистка метрик старше ${olderThanDays} дней...`);

      const { getSystemMetrics } = await import('./system-metrics');
      const metrics = getSystemMetrics();
      const deleted = await metrics.cleanup(olderThanDays);

      addLog('success', `📊 Удалено ${deleted} старых метрик`);
      return { deleted };
    },
    maxAttempts: 1,
    timeout: 60000
  });

  console.log('📋 [TaskHandlers] Обработчики инициализированы');
}

/**
 * Запустить систему задач
 */
export async function startTaskSystem(): Promise<void> {
  const { getCronScheduler } = await import('./cron-scheduler');
  const queue = getTaskQueue();
  const scheduler = getCronScheduler();

  // Инициализируем обработчики
  initTaskHandlers();

  // Инициализируем стандартные cron задачи
  await scheduler.initDefaultJobs();

  // Запускаем очередь
  queue.start();

  // Запускаем планировщик
  scheduler.start();

  console.log('🚀 [TaskSystem] Система задач запущена');
}
