/**
 * МУКН | Трафик - Process Manager
 * Автоматический перезапуск, Graceful Shutdown, Health Monitoring
 * Для 24/7 работы системы
 */

import { EventEmitter } from 'events';

export interface ProcessConfig {
  // Автоматический перезапуск
  autoRestart: boolean;
  maxRestarts: number;
  restartDelay: number;
  restartWindow: number;

  // Graceful Shutdown
  shutdownTimeout: number;

  // Health Check
  healthCheckInterval: number;
  memoryLimit: number; // MB
  cpuLimit: number; // %

  // Logging
  logInterval: number;
}

const DEFAULT_CONFIG: ProcessConfig = {
  autoRestart: true,
  maxRestarts: 10,
  restartDelay: 5000,
  restartWindow: 60000,
  shutdownTimeout: 30000,
  healthCheckInterval: 30000,
  memoryLimit: 2048, // 2GB (Next.js требует больше памяти)
  cpuLimit: 90,
  logInterval: 60000,
};

export interface ProcessStatus {
  uptime: number;
  restarts: number;
  lastRestart: Date | null;
  memoryUsage: NodeJS.MemoryUsage;
  status: 'running' | 'shutting_down' | 'restarting';
  health: 'healthy' | 'degraded' | 'unhealthy';
}

class ProcessManager extends EventEmitter {
  private config: ProcessConfig;
  private startTime: Date;
  private restartHistory: number[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private logTimer: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  private shutdownCallbacks: Array<() => Promise<void>> = [];

  constructor(config: Partial<ProcessConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();
    this.setupSignalHandlers();
  }

  /**
   * Запуск менеджера процессов
   */
  start(): void {
    console.log('[ProcessManager] Starting...');

    // Запуск мониторинга здоровья
    this.startHealthMonitoring();

    // Запуск периодического логирования
    this.startPeriodicLogging();

    // Запуск авто-бэкапа
    this.startAutoBackup();

    console.log('[ProcessManager] Started successfully');

    this.emit('started', {
      uptime: this.getUptime(),
      config: this.config,
    });
  }

  /**
   * Настройка обработчиков сигналов
   */
  private setupSignalHandlers(): void {
    // Graceful Shutdown на SIGTERM
    process.on('SIGTERM', async () => {
      console.log('[ProcessManager] SIGTERM received, starting graceful shutdown...');
      await this.gracefulShutdown('SIGTERM');
    });

    // Graceful Shutdown на SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('[ProcessManager] SIGINT received, starting graceful shutdown...');
      await this.gracefulShutdown('SIGINT');
    });

    // Обработка необработанных исключений
    process.on('uncaughtException', async (error) => {
      console.error('[ProcessManager] Uncaught Exception:', error);
      this.emit('error', { type: 'uncaughtException', error });

      // Попытка восстановления или graceful shutdown
      if (this.config.autoRestart) {
        await this.attemptRecovery('uncaughtException');
      } else {
        await this.gracefulShutdown('uncaughtException');
      }
    });

    // Обработка необработанных rejection
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('[ProcessManager] Unhandled Rejection at:', promise, 'reason:', reason);
      this.emit('error', { type: 'unhandledRejection', reason, promise });
    });

    // Предупреждение о памяти
    process.on('warning', (warning) => {
      console.warn('[ProcessManager] Warning:', warning.message);
      this.emit('warning', warning);
    });
  }

  /**
   * Запуск мониторинга здоровья
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      const health = this.checkHealth();

      if (health.status === 'unhealthy') {
        console.error('[ProcessManager] Health check failed:', health.issues);
        this.emit('unhealthy', health);

        if (this.config.autoRestart) {
          this.attemptRecovery('health_check_failed');
        }
      } else if (health.status === 'degraded') {
        console.warn('[ProcessManager] System degraded:', health.issues);
        this.emit('degraded', health);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Проверка здоровья системы
   */
  checkHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: Record<string, any>;
  } {
    const issues: string[] = [];
    const metrics: Record<string, any> = {};

    // Проверка памяти
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;

    metrics.memory = {
      heapUsedMB: heapUsedMB.toFixed(2),
      heapTotalMB: heapTotalMB.toFixed(2),
      rssMB: rssMB.toFixed(2),
    };

    if (rssMB > this.config.memoryLimit) {
      issues.push(`Memory usage (${rssMB.toFixed(0)}MB) exceeds limit (${this.config.memoryLimit}MB)`);
    }

    // Проверка uptime
    const uptimeSeconds = this.getUptime();
    metrics.uptime = uptimeSeconds;

    // Проверка частоты перезапусков
    const recentRestarts = this.restartHistory.filter(
      t => Date.now() - t < this.config.restartWindow
    ).length;
    metrics.recentRestarts = recentRestarts;

    if (recentRestarts >= this.config.maxRestarts) {
      issues.push(`Too many restarts (${recentRestarts}) in the last ${this.config.restartWindow / 1000}s`);
    }

    // Определение статуса
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(i => i.includes('exceeds') || i.includes('Too many')) ? 'unhealthy' : 'degraded';
    }

    return { status, issues, metrics };
  }

  /**
   * Запуск периодического логирования
   */
  private startPeriodicLogging(): void {
    this.logTimer = setInterval(() => {
      const status = this.getStatus();
      console.log('[ProcessManager] Status:', {
        uptime: `${Math.floor(status.uptime / 60)}m`,
        memory: `${(status.memoryUsage.rss / 1024 / 1024).toFixed(0)}MB`,
        restarts: status.restarts,
        health: status.health,
      });
    }, this.config.logInterval);
  }

  /**
   * Запуск авто-бэкапа
   */
  private startAutoBackup(): void {
    // Импортируем и запускаем auto-backup
    import('./auto-backup').then(({ autoBackup }) => {
      autoBackup.start();
      console.log('[ProcessManager] Auto-backup started');
    }).catch(err => {
      console.warn('[ProcessManager] Could not start auto-backup:', err.message);
    });
  }

  /**
   * Попытка восстановления
   */
  private async attemptRecovery(reason: string): Promise<void> {
    console.log(`[ProcessManager] Attempting recovery due to: ${reason}`);

    // Очищаем старые записи из истории перезапусков
    const now = Date.now();
    this.restartHistory = this.restartHistory.filter(
      t => now - t < this.config.restartWindow
    );

    // Проверяем лимит перезапусков
    if (this.restartHistory.length >= this.config.maxRestarts) {
      console.error('[ProcessManager] Max restarts reached, shutting down');
      await this.gracefulShutdown('max_restarts_reached');
      return;
    }

    // Записываем попытку
    this.restartHistory.push(now);

    // Ждём перед перезапуском
    await this.delay(this.config.restartDelay);

    // Эмитим событие для перезапуска внешних сервисов
    this.emit('restarting', { reason, attempt: this.restartHistory.length });

    console.log(`[ProcessManager] Recovery attempt ${this.restartHistory.length}/${this.config.maxRestarts}`);
  }

  /**
   * Graceful Shutdown
   */
  async gracefulShutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log('[ProcessManager] Already shutting down, waiting...');
      return;
    }

    this.isShuttingDown = true;
    console.log(`[ProcessManager] Starting graceful shutdown (reason: ${reason})`);

    this.emit('shutdown', { reason, uptime: this.getUptime() });

    // Останавливаем таймеры
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.logTimer) {
      clearInterval(this.logTimer);
    }

    // Останавливаем авто-бэкап
    try {
      const { autoBackup } = await import('./auto-backup');
      autoBackup.stop();
    } catch {
      // Ignore
    }

    // Выполняем callback'и shutdown
    const shutdownPromises = this.shutdownCallbacks.map(cb =>
      cb().catch(err => console.error('[ProcessManager] Shutdown callback error:', err))
    );

    // Ждём завершения с таймаутом
    await Promise.race([
      Promise.all(shutdownPromises),
      this.delay(this.config.shutdownTimeout),
    ]);

    console.log('[ProcessManager] Graceful shutdown completed');

    // Выходим
    process.exit(reason === 'SIGTERM' || reason === 'SIGINT' ? 0 : 1);
  }

  /**
   * Регистрация callback для shutdown
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Получить статус
   */
  getStatus(): ProcessStatus {
    const health = this.checkHealth();
    return {
      uptime: this.getUptime(),
      restarts: this.restartHistory.length,
      lastRestart: this.restartHistory.length > 0
        ? new Date(this.restartHistory[this.restartHistory.length - 1])
        : null,
      memoryUsage: process.memoryUsage(),
      status: this.isShuttingDown ? 'shutting_down' : 'running',
      health: health.status,
    };
  }

  /**
   * Получить uptime в секундах
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
let processManagerInstance: ProcessManager | null = null;

export function getProcessManager(config?: Partial<ProcessConfig>): ProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new ProcessManager(config);
  }
  return processManagerInstance;
}

export const processManager = {
  start: () => getProcessManager().start(),
  getStatus: () => getProcessManager().getStatus(),
  checkHealth: () => getProcessManager().checkHealth(),
  onShutdown: (cb: () => Promise<void>) => getProcessManager().onShutdown(cb),
  gracefulShutdown: (reason: string) => getProcessManager().gracefulShutdown(reason),
};

export default ProcessManager;
