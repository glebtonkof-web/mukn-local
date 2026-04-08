/**
 * Auto-Recovery Service
 * 
 * Автоматическое восстановление компонентов системы при сбоях.
 * Интегрируется с Health Check и Alert Service.
 */

import { getAlertService } from './alert-service';
import { getCircuitBreakerManager } from './circuit-breaker';

export interface RecoveryAction {
  name: string;
  check: () => Promise<boolean>;
  recover: () => Promise<boolean>;
  maxAttempts: number;
  cooldownMinutes: number;
  lastAttempt?: Date;
  attempts: number;
  recovering: boolean;
}

export interface RecoveryResult {
  action: string;
  success: boolean;
  attempts: number;
  message: string;
  timestamp: Date;
}

class AutoRecoveryService {
  private actions: Map<string, RecoveryAction> = new Map();
  private recoveryHistory: RecoveryResult[] = [];
  private isRunning = false;

  constructor() {
    this.registerDefaultActions();
  }

  /**
   * Регистрация действия восстановления
   */
  register(action: Omit<RecoveryAction, 'attempts' | 'recovering'>): void {
    this.actions.set(action.name, {
      ...action,
      attempts: 0,
      recovering: false
    });
  }

  /**
   * Стандартные действия восстановления
   */
  private registerDefaultActions(): void {
    // Database connection recovery
    this.register({
      name: 'database',
      check: async () => {
        try {
          const { default: prisma } = await import('./prisma');
          await prisma.$queryRaw`SELECT 1`;
          return true;
        } catch {
          return false;
        }
      },
      recover: async () => {
        console.log('🔄 [Recovery] Переподключение к БД...');
        try {
          const { default: prisma } = await import('./prisma');
          await prisma.$disconnect();
          await new Promise(r => setTimeout(r, 1000));
          await prisma.$connect();
          return true;
        } catch (error: any) {
          console.error('❌ [Recovery] Ошибка переподключения БД:', error.message);
          return false;
        }
      },
      maxAttempts: 3,
      cooldownMinutes: 5
    });

    // Task Queue recovery
    this.register({
      name: 'task-queue',
      check: async () => {
        try {
          const { getTaskQueue } = await import('./task-queue');
          const queue = getTaskQueue();
          const stats = queue.getStats();
          return stats.currentWorkers > 0;
        } catch {
          return false;
        }
      },
      recover: async () => {
        console.log('🔄 [Recovery] Перезапуск Task Queue...');
        try {
          const { startTaskSystem } = await import('./task-handlers');
          await startTaskSystem();
          return true;
        } catch (error: any) {
          console.error('❌ [Recovery] Ошибка перезапуска очереди:', error.message);
          return false;
        }
      },
      maxAttempts: 2,
      cooldownMinutes: 10
    });

    // Cron Scheduler recovery
    this.register({
      name: 'cron-scheduler',
      check: async () => {
        try {
          const { getCronScheduler } = await import('./cron-scheduler');
          const scheduler = getCronScheduler();
          const jobs = scheduler.getJobs();
          return jobs.some((j: any) => j.running);
        } catch {
          return false;
        }
      },
      recover: async () => {
        console.log('🔄 [Recovery] Перезапуск Cron Scheduler...');
        try {
          const { getCronScheduler } = await import('./cron-scheduler');
          const scheduler = getCronScheduler();
          await scheduler.initDefaultJobs();
          scheduler.start();
          return true;
        } catch (error: any) {
          console.error('❌ [Recovery] Ошибка перезапуска scheduler:', error.message);
          return false;
        }
      },
      maxAttempts: 2,
      cooldownMinutes: 10
    });

    // Proxy Manager recovery
    this.register({
      name: 'proxy-manager',
      check: async () => {
        try {
          const { getProxyManager } = await import('./sim-auto/proxy-manager');
          const manager = getProxyManager();
          const stats = manager.getStats();
          return stats.workingProxies >= 3;
        } catch {
          return false;
        }
      },
      recover: async () => {
        console.log('🔄 [Recovery] Обновление прокси...');
        try {
          const { getProxyManager } = await import('./sim-auto/proxy-manager');
          const manager = getProxyManager();
          await manager.refreshProxies();
          const stats = manager.getStats();
          return stats.workingProxies >= 3;
        } catch (error: any) {
          console.error('❌ [Recovery] Ошибка обновления прокси:', error.message);
          return false;
        }
      },
      maxAttempts: 3,
      cooldownMinutes: 15
    });

    // DLQ processing
    this.register({
      name: 'dlq-retry',
      check: async () => {
        try {
          const { getDeadLetterQueue } = await import('./dead-letter-queue');
          const dlq = getDeadLetterQueue();
          const stats = await dlq.getStats();
          return stats.unresolved < 50;
        } catch {
          return false;
        }
      },
      recover: async () => {
        console.log('🔄 [Recovery] Обработка DLQ...');
        try {
          const { getDeadLetterQueue } = await import('./dead-letter-queue');
          const dlq = getDeadLetterQueue();
          const entries = await dlq.list({ resolved: false, limit: 10 });
          
          let retried = 0;
          for (const entry of entries) {
            const success = await dlq.retry(entry.id);
            if (success) retried++;
            await new Promise(r => setTimeout(r, 1000)); // Пауза между retry
          }
          
          return retried > 0;
        } catch (error: any) {
          console.error('❌ [Recovery] Ошибка обработки DLQ:', error.message);
          return false;
        }
      },
      maxAttempts: 5,
      cooldownMinutes: 30
    });

    // Memory cleanup
    this.register({
      name: 'memory-cleanup',
      check: async () => {
        const mem = process.memoryUsage();
        const usagePercent = (mem.heapUsed / mem.heapTotal) * 100;
        return usagePercent < 85;
      },
      recover: async () => {
        console.log('🔄 [Recovery] Очистка памяти...');
        try {
          // Принудительный GC если доступен
          if (global.gc) {
            global.gc();
          }
          
          // Очистка кешей
          const { getCircuitBreakerManager } = await import('./circuit-breaker');
          getCircuitBreakerManager().resetAll();
          
          await new Promise(r => setTimeout(r, 2000));
          
          const mem = process.memoryUsage();
          const usagePercent = (mem.heapUsed / mem.heapTotal) * 100;
          return usagePercent < 85;
        } catch (error: any) {
          console.error('❌ [Recovery] Ошибка очистки памяти:', error.message);
          return false;
        }
      },
      maxAttempts: 3,
      cooldownMinutes: 5
    });
  }

  /**
   * Запустить проверку и восстановление
   */
  async runRecovery(): Promise<RecoveryResult[]> {
    if (this.isRunning) {
      console.log('⏳ [Recovery] Уже выполняется...');
      return [];
    }

    this.isRunning = true;
    const results: RecoveryResult[] = [];

    try {
      for (const [name, action] of this.actions) {
        // Проверяем cooldown
        if (action.lastAttempt) {
          const minutesSince = (Date.now() - action.lastAttempt.getTime()) / (1000 * 60);
          if (minutesSince < action.cooldownMinutes) {
            continue;
          }
        }

        // Пропускаем если уже восстанавливается
        if (action.recovering) {
          continue;
        }

        // Проверяем состояние
        const isHealthy = await action.check();

        if (!isHealthy) {
          console.log(`⚠️ [Recovery] ${name} требует восстановления`);
          action.recovering = true;
          action.lastAttempt = new Date();

          let success = false;
          let attempts = 0;

          for (let i = 0; i < action.maxAttempts; i++) {
            attempts++;
            action.attempts++;

            try {
              success = await action.recover();
              if (success) break;
            } catch (error: any) {
              console.error(`❌ [Recovery] Попытка ${i + 1} для ${name}:`, error.message);
            }

            await new Promise(r => setTimeout(r, 5000)); // Пауза между попытками
          }

          action.recovering = false;

          const result: RecoveryResult = {
            action: name,
            success,
            attempts,
            message: success 
              ? `Восстановлено за ${attempts} попыток` 
              : `Не удалось восстановить (${attempts} попыток)`,
            timestamp: new Date()
          };

          results.push(result);
          this.recoveryHistory.push(result);

          // Отправляем алерт
          const alertService = getAlertService();
          if (success) {
            await alertService.info('system', `Recovery: ${name}`, result.message);
          } else {
            await alertService.error('system', `Recovery Failed: ${name}`, result.message);
          }

          // Сбрасываем счётчик при успехе
          if (success) {
            action.attempts = 0;
          }
        }
      }
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Принудительное восстановление конкретного компонента
   */
  async forceRecover(name: string): Promise<RecoveryResult | null> {
    const action = this.actions.get(name);
    if (!action) {
      return null;
    }

    action.recovering = true;
    action.lastAttempt = new Date();

    let success = false;
    let attempts = 0;

    for (let i = 0; i < action.maxAttempts; i++) {
      attempts++;
      try {
        success = await action.recover();
        if (success) break;
      } catch (error: any) {
        console.error(`❌ [Recovery] Force попытка ${i + 1}:`, error.message);
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    action.recovering = false;

    const result: RecoveryResult = {
      action: name,
      success,
      attempts,
      message: success 
        ? `Восстановлено за ${attempts} попыток` 
        : `Не удалось восстановить`,
      timestamp: new Date()
    };

    this.recoveryHistory.push(result);
    return result;
  }

  /**
   * Получить историю восстановлений
   */
  getHistory(limit: number = 50): RecoveryResult[] {
    return this.recoveryHistory.slice(-limit);
  }

  /**
   * Получить статус всех действий
   */
  getStatus(): Record<string, {
    attempts: number;
    recovering: boolean;
    lastAttempt?: Date;
  }> {
    const result: Record<string, any> = {};
    for (const [name, action] of this.actions) {
      result[name] = {
        attempts: action.attempts,
        recovering: action.recovering,
        lastAttempt: action.lastAttempt
      };
    }
    return result;
  }

  /**
   * Запустить периодическую проверку
   */
  startPeriodicCheck(intervalMs: number = 60000): void {
    console.log(`🔄 [Recovery] Запуск периодической проверки (каждые ${intervalMs / 1000}с)`);
    
    setInterval(async () => {
      try {
        await this.runRecovery();
      } catch (error: any) {
        console.error('❌ [Recovery] Ошибка периодической проверки:', error.message);
      }
    }, intervalMs);
  }
}

// Singleton
let recoveryInstance: AutoRecoveryService | null = null;

export function getAutoRecovery(): AutoRecoveryService {
  if (!recoveryInstance) {
    recoveryInstance = new AutoRecoveryService();
  }
  return recoveryInstance;
}

export { AutoRecoveryService };
