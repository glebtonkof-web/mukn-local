/**
 * МУКН | Трафик - Watchdog Service
 * Мониторинг здоровья приложения и автоматическое восстановление
 * 
 * Запуск: npx ts-node scripts/watchdog.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// ==================== КОНФИГУРАЦИЯ ====================

interface WatchdogConfig {
  // Проверка здоровья
  healthCheckUrl: string;
  healthCheckInterval: number; // ms
  healthCheckTimeout: number; // ms

  // Пороги для принятия решений
  maxConsecutiveFailures: number;
  maxResponseTime: number; // ms

  // Автоматическое восстановление
  autoRestart: boolean;
  restartCooldown: number; // ms
  maxRestartsPerHour: number;

  // Алерты
  alertCooldown: number; // ms - минимальный интервал между алертами
  telegramBotToken?: string;
  telegramChatId?: string;
  webhookUrl?: string;

  // Логирование
  logFile: string;
  logRetentionDays: number;
}

const DEFAULT_CONFIG: WatchdogConfig = {
  healthCheckUrl: 'http://localhost:3000/api/health',
  healthCheckInterval: 30000, // 30 секунд
  healthCheckTimeout: 10000, // 10 секунд
  maxConsecutiveFailures: 3,
  maxResponseTime: 5000, // 5 секунд
  autoRestart: true,
  restartCooldown: 60000, // 1 минута
  maxRestartsPerHour: 5,
  alertCooldown: 300000, // 5 минут
  logFile: 'logs/watchdog.log',
  logRetentionDays: 7,
};

// ==================== WATCHDOG SERVICE ====================

class WatchdogService {
  private config: WatchdogConfig;
  private consecutiveFailures: number = 0;
  private lastRestartTime: number = 0;
  private restartsInLastHour: number[] = [];
  private lastAlertTime: number = 0;
  private checkTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  start(): void {
    if (this.isRunning) {
      this.log('Watchdog already running');
      return;
    }

    this.isRunning = true;
    this.log('Watchdog started');
    this.log(`Health check URL: ${this.config.healthCheckUrl}`);
    this.log(`Check interval: ${this.config.healthCheckInterval}ms`);

    // Немедленная проверка при старте
    this.performCheck();

    // Периодические проверки
    this.checkTimer = setInterval(() => {
      this.performCheck();
    }, this.config.healthCheckInterval);
  }

  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.isRunning = false;
    this.log('Watchdog stopped');
  }

  private async performCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheckTimeout);

      const response = await fetch(this.config.healthCheckUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Проверяем статус здоровья
      if (data.status === 'unhealthy') {
        this.handleUnhealthy(data);
        return;
      }

      // Проверяем время ответа
      if (responseTime > this.config.maxResponseTime) {
        this.log(`Warning: Slow response time ${responseTime}ms`);
      }

      // Всё в порядке
      this.consecutiveFailures = 0;
      this.log(`Health OK (${responseTime}ms) - Status: ${data.status}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleFailure(errorMessage);
    }
  }

  private handleUnhealthy(data: any): void {
    this.consecutiveFailures++;
    this.log(`Unhealthy status detected: ${JSON.stringify(data.services)}`);
    
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.takeAction('unhealthy_status', data);
    }
  }

  private handleFailure(error: string): void {
    this.consecutiveFailures++;
    this.log(`Health check failed (${this.consecutiveFailures}/${this.config.maxConsecutiveFailures}): ${error}`);

    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.takeAction('health_check_failed', { error });
    }
  }

  private async takeAction(reason: string, details: any): Promise<void> {
    this.log(`Taking action for: ${reason}`);

    // Очищаем старые записи о перезапусках
    const oneHourAgo = Date.now() - 3600000;
    this.restartsInLastHour = this.restartsInLastHour.filter(t => t > oneHourAgo);

    // Проверяем лимит перезапусков
    if (this.restartsInLastHour.length >= this.config.maxRestartsPerHour) {
      this.log(`Max restarts per hour reached (${this.config.maxRestartsPerHour})`);
      this.sendAlert(`🚨 CRITICAL: Max restarts reached for MUKN Traffic\nReason: ${reason}\nDetails: ${JSON.stringify(details)}`);
      return;
    }

    // Проверяем cooldown
    if (Date.now() - this.lastRestartTime < this.config.restartCooldown) {
      this.log('Restart cooldown active, skipping restart');
      return;
    }

    // Отправляем алерт
    this.sendAlert(`⚠️ MUKN Traffic issue detected\nReason: ${reason}\nAttempting automatic recovery...`);

    // Перезапуск
    if (this.config.autoRestart) {
      await this.restartService();
    }
  }

  private async restartService(): Promise<void> {
    this.log('Attempting to restart service...');
    
    try {
      // Определяем команду перезапуска
      let restartCmd: string;

      if (process.env.PM2_HOME) {
        // PM2
        restartCmd = 'pm2 restart mukn-traffic';
      } else if (fs.existsSync('/etc/systemd/system/mukn-traffic.service')) {
        // Systemd
        restartCmd = 'sudo systemctl restart mukn-traffic';
      } else {
        // Fallback - просто kill
        restartCmd = 'pkill -f "node.*server.js" || true';
      }

      const { stdout, stderr } = await execAsync(restartCmd);
      this.log(`Restart command executed: ${stdout || stderr}`);

      this.lastRestartTime = Date.now();
      this.restartsInLastHour.push(this.lastRestartTime);
      this.consecutiveFailures = 0;

      this.log('Service restart completed');
      this.sendAlert('✅ MUKN Traffic has been automatically restarted');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`Restart failed: ${errorMsg}`);
      this.sendAlert(`🚨 CRITICAL: Failed to restart MUKN Traffic\nError: ${errorMsg}`);
    }
  }

  private async sendAlert(message: string): Promise<void> {
    // Проверяем cooldown алертов
    if (Date.now() - this.lastAlertTime < this.config.alertCooldown) {
      this.log('Alert cooldown active, skipping alert');
      return;
    }

    this.lastAlertTime = Date.now();
    this.log(`Sending alert: ${message}`);

    // Telegram алерт
    if (this.config.telegramBotToken && this.config.telegramChatId) {
      try {
        await fetch(`https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.telegramChatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });
        this.log('Telegram alert sent');
      } catch (error) {
        this.log(`Failed to send Telegram alert: ${error}`);
      }
    }

    // Webhook алерт
    if (this.config.webhookUrl) {
      try {
        await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'mukn-traffic',
            message,
          }),
        });
        this.log('Webhook alert sent');
      } catch (error) {
        this.log(`Failed to send webhook alert: ${error}`);
      }
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    
    console.log(`[Watchdog] ${message}`);

    // Запись в файл
    try {
      fs.appendFileSync(this.config.logFile, logLine);
      this.rotateLogs();
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  private rotateLogs(): void {
    try {
      const stats = fs.statSync(this.config.logFile);
      const fileAge = Date.now() - stats.mtimeMs;
      const maxAge = this.config.logRetentionDays * 24 * 60 * 60 * 1000;

      if (fileAge > maxAge) {
        const rotatedFile = `${this.config.logFile}.${Date.now()}`;
        fs.renameSync(this.config.logFile, rotatedFile);
        this.log('Log rotated');
      }
    } catch {
      // Ignore
    }
  }
}

// ==================== ЗАПУСК ====================

// Читаем конфигурацию из переменных окружения
const config: Partial<WatchdogConfig> = {
  healthCheckUrl: process.env.WATCHDOG_HEALTH_URL || DEFAULT_CONFIG.healthCheckUrl,
  healthCheckInterval: parseInt(process.env.WATCHDOG_INTERVAL || '') || DEFAULT_CONFIG.healthCheckInterval,
  healthCheckTimeout: parseInt(process.env.WATCHDOG_TIMEOUT || '') || DEFAULT_CONFIG.healthCheckTimeout,
  maxConsecutiveFailures: parseInt(process.env.WATCHDOG_MAX_FAILURES || '') || DEFAULT_CONFIG.maxConsecutiveFailures,
  maxResponseTime: parseInt(process.env.WATCHDOG_MAX_RESPONSE_TIME || '') || DEFAULT_CONFIG.maxResponseTime,
  autoRestart: process.env.WATCHDOG_AUTO_RESTART !== 'false',
  restartCooldown: parseInt(process.env.WATCHDOG_RESTART_COOLDOWN || '') || DEFAULT_CONFIG.restartCooldown,
  maxRestartsPerHour: parseInt(process.env.WATCHDOG_MAX_RESTARTS || '') || DEFAULT_CONFIG.maxRestartsPerHour,
  alertCooldown: parseInt(process.env.WATCHDOG_ALERT_COOLDOWN || '') || DEFAULT_CONFIG.alertCooldown,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  webhookUrl: process.env.WATCHDOG_WEBHOOK_URL,
  logFile: process.env.WATCHDOG_LOG_FILE || DEFAULT_CONFIG.logFile,
};

const watchdog = new WatchdogService(config);

// Обработка сигналов
process.on('SIGTERM', () => {
  watchdog.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  watchdog.stop();
  process.exit(0);
});

// Запуск
watchdog.start();
