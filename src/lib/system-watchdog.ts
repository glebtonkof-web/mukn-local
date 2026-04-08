/**
 * System Watchdog
 * 
 * Постоянный мониторинг системы и автоматическое реагирование на проблемы.
 * Интегрирует Health Check, Alerts и Auto-Recovery.
 */

import { getAlertService } from './alert-service';
import { getAutoRecovery } from './auto-recovery';
import { getCircuitBreakerManager } from './circuit-breaker';

export interface WatchdogConfig {
  checkIntervalMs: number;       // Интервал проверки
  alertOnDegraded: boolean;      // Алерт при деградации
  alertOnCritical: boolean;      // Алерт при критическом состоянии
  autoRecover: boolean;          // Авто-восстановление
  memoryThreshold: number;       // % памяти для алерта
  diskThreshold: number;         // % диска для алерта
}

export interface WatchdogStatus {
  running: boolean;
  lastCheck?: Date;
  checksPerformed: number;
  issuesFound: number;
  recoveriesAttempted: number;
  recoveriesSuccessful: number;
  uptime: number;
}

const DEFAULT_CONFIG: WatchdogConfig = {
  checkIntervalMs: 30000, // 30 секунд
  alertOnDegraded: true,
  alertOnCritical: true,
  autoRecover: true,
  memoryThreshold: 85,
  diskThreshold: 90
};

class SystemWatchdog {
  private config: WatchdogConfig;
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private startTime = Date.now();
  private checksPerformed = 0;
  private issuesFound = 0;
  private recoveriesAttempted = 0;
  private recoveriesSuccessful = 0;
  private lastCheck?: Date;

  constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Запустить watchdog
   */
  start(): void {
    if (this.running) {
      console.log('⚠️ [Watchdog] Уже запущен');
      return;
    }

    this.running = true;
    this.startTime = Date.now();

    console.log(`🐕 [Watchdog] Запущен (интервал: ${this.config.checkIntervalMs / 1000}с)`);

    // Первая проверка сразу
    this.performCheck();

    // Периодические проверки
    this.intervalId = setInterval(() => {
      this.performCheck();
    }, this.config.checkIntervalMs);
  }

  /**
   * Остановить watchdog
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('🐕 [Watchdog] Остановлен');
  }

  /**
   * Выполнить проверку
   */
  private async performCheck(): Promise<void> {
    this.lastCheck = new Date();
    this.checksPerformed++;

    try {
      // Получаем detailed health check
      const response = await fetch('http://localhost:3000/api/health/detailed');
      const health = await response.json();

      // Обрабатываем результат
      await this.handleHealthResult(health);

    } catch (error: any) {
      console.error('❌ [Watchdog] Ошибка проверки:', error.message);
      
      // Отправляем алерт
      const alertService = getAlertService();
      await alertService.critical('system', 'Watchdog Check Failed', error.message);
    }
  }

  /**
   * Обработать результат health check
   */
  private async handleHealthResult(health: any): Promise<void> {
    const { overall, checks, metrics, recommendations } = health;

    // Проверяем критические проблемы
    if (overall === 'critical') {
      this.issuesFound++;

      if (this.config.alertOnCritical) {
        const alertService = getAlertService();
        await alertService.critical(
          'system',
          'Система в критическом состоянии',
          recommendations.join('\n'),
          { checks, metrics }
        );
      }

      if (this.config.autoRecover) {
        await this.attemptRecovery();
      }
    }
    // Проверяем деградацию
    else if (overall === 'degraded') {
      if (this.config.alertOnDegraded) {
        const alertService = getAlertService();
        await alertService.warning(
          'system',
          'Деградация системы',
          recommendations.join('\n'),
          { checks, metrics }
        );
      }

      if (this.config.autoRecover) {
        await this.attemptRecovery();
      }
    }

    // Проверяем память
    if (metrics?.memory?.percentage > this.config.memoryThreshold) {
      const alertService = getAlertService();
      await alertService.warning(
        'system',
        'Высокое использование памяти',
        `Использовано ${metrics.memory.percentage}% памяти`,
        metrics.memory
      );
    }

    // Проверяем диск
    if (metrics?.disk?.percentage > this.config.diskThreshold) {
      const alertService = getAlertService();
      await alertService.warning(
        'system',
        'Мало места на диске',
        `Использовано ${metrics.disk.percentage}% диска`,
        metrics.disk
      );
    }

    // Проверяем отдельные компоненты
    for (const check of checks) {
      if (check.status === 'error') {
        this.issuesFound++;
        console.warn(`⚠️ [Watchdog] Проблема: ${check.name} - ${check.message}`);
      }
    }
  }

  /**
   * Попытка восстановления
   */
  private async attemptRecovery(): Promise<void> {
    this.recoveriesAttempted++;

    try {
      const recovery = getAutoRecovery();
      const results = await recovery.runRecovery();

      const successful = results.filter(r => r.success).length;
      this.recoveriesSuccessful += successful;

      if (results.length > 0) {
        console.log(`🔧 [Watchdog] Recovery: ${successful}/${results.length} успешно`);
      }
    } catch (error: any) {
      console.error('❌ [Watchdog] Ошибка восстановления:', error.message);
    }
  }

  /**
   * Получить статус
   */
  getStatus(): WatchdogStatus {
    return {
      running: this.running,
      lastCheck: this.lastCheck,
      checksPerformed: this.checksPerformed,
      issuesFound: this.issuesFound,
      recoveriesAttempted: this.recoveriesAttempted,
      recoveriesSuccessful: this.recoveriesSuccessful,
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * Получить конфигурацию
   */
  getConfig(): WatchdogConfig {
    return { ...this.config };
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(config: Partial<WatchdogConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Перезапускаем с новым интервалом
    if (config.checkIntervalMs && this.running) {
      this.stop();
      this.start();
    }
  }

  /**
   * Принудительная проверка
   */
  async forceCheck(): Promise<any> {
    await this.performCheck();
    return this.getStatus();
  }
}

// Singleton
let watchdogInstance: SystemWatchdog | null = null;

export function getSystemWatchdog(config?: Partial<WatchdogConfig>): SystemWatchdog {
  if (!watchdogInstance) {
    watchdogInstance = new SystemWatchdog(config);
  }
  return watchdogInstance;
}

export { SystemWatchdog };
