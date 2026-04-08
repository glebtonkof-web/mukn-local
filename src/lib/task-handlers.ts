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

  // Регистрация аккаунта
  queue.register({
    name: 'account-register',
    handle: async (task) => {
      const { platform, simCardId, deviceId } = task.payload;
      
      addLog('info', `📝 Регистрация аккаунта: ${platform}`, `SIM: ${simCardId}`);
      
      // Здесь вызываем логику регистрации
      // Это будет интегрировано с существующим кодом sim-auto
      
      return { registered: true, platform };
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
