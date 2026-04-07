/**
 * МУКН | Трафик - Alert Service
 * Централизованная система уведомлений и алертов
 */

import { logger } from './logger';
import { db } from './db';

// ==================== ТИПЫ ====================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertChannel = 'telegram' | 'webhook' | 'email' | 'database';

export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  telegram?: {
    botToken: string;
    chatId: string;
  };
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
  email?: {
    smtp: string;
    from: string;
    to: string[];
  };
  cooldown: number; // ms между одинаковыми алертами
  rateLimit: number; // максимум алертов в час
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  createdAt?: Date;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// Database Alert type (matches Prisma schema)
interface DbAlert {
  id: string;
  severity: string;
  title: string;
  message: string;
  source: string;
  metadata: string | null;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  createdAt: Date;
}

// ==================== СЕРВИС АЛЕРТОВ ====================

class AlertService {
  private config: AlertConfig;
  private recentAlerts: Map<string, number> = new Map();
  private alertCount: number = 0;
  private lastHourReset: number = Date.now();

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = {
      enabled: true,
      channels: ['database'],
      cooldown: 300000, // 5 минут
      rateLimit: 100, // 100 алертов в час
      ...config,
    };

    // Загружаем конфигурацию из переменных окружения
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      this.config.telegram = {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
      };
      if (!this.config.channels.includes('telegram')) {
        this.config.channels.push('telegram');
      }
    }

    if (process.env.ALERT_WEBHOOK_URL) {
      this.config.webhook = {
        url: process.env.ALERT_WEBHOOK_URL,
      };
      if (!this.config.channels.includes('webhook')) {
        this.config.channels.push('webhook');
      }
    }
  }

  /**
   * Отправить алерт
   */
  async send(
    severity: AlertSeverity,
    title: string,
    message: string,
    source: string = 'system',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    // Проверяем rate limit
    if (!this.checkRateLimit()) {
      logger.warn('Alert rate limit exceeded');
      return false;
    }

    // Проверяем cooldown для похожих алертов
    const alertKey = `${source}:${title}`;
    if (!this.checkCooldown(alertKey)) {
      logger.debug('Alert cooldown active', { alertKey });
      return false;
    }

    const alert: Alert = {
      id: this.generateId(),
      severity,
      title,
      message,
      source,
      timestamp: new Date(),
      metadata,
      acknowledged: false,
    };

    // Отправляем по всем каналам
    const results = await Promise.allSettled([
      this.sendToDatabase(alert),
      this.config.channels.includes('telegram') && this.config.telegram
        ? this.sendToTelegram(alert)
        : Promise.resolve(),
      this.config.channels.includes('webhook') && this.config.webhook
        ? this.sendToWebhook(alert)
        : Promise.resolve(),
    ]);

    // Логируем результат
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      logger.warn('Some alert channels failed', { failures });
    } else {
      logger.info('Alert sent successfully', { alertId: alert.id, severity, title });
    }

    return true;
  }

  /**
   * Быстрые методы для разных типов алертов
   */
  async info(title: string, message: string, source?: string, metadata?: Record<string, any>) {
    return this.send('info', title, message, source, metadata);
  }

  async warning(title: string, message: string, source?: string, metadata?: Record<string, any>) {
    return this.send('warning', title, message, source, metadata);
  }

  async error(title: string, message: string, source?: string, metadata?: Record<string, any>) {
    return this.send('error', title, message, source, metadata);
  }

  async critical(title: string, message: string, source?: string, metadata?: Record<string, any>) {
    return this.send('critical', title, message, source, metadata);
  }

  /**
   * Подтвердить алерт
   */
  async acknowledge(alertId: string, acknowledgedBy: string): Promise<boolean> {
    try {
      await db.alert.update({
        where: { id: alertId },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy,
        },
      });
      return true;
    } catch (error) {
      logger.error('Failed to acknowledge alert', error as Error);
      return false;
    }
  }

  /**
   * Получить неподавленные алерты
   */
  async getUnacknowledged(limit: number = 50): Promise<Alert[]> {
    try {
      const dbAlerts = await db.alert.findMany({
        where: { acknowledged: false },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }) as DbAlert[];
      // Convert DB alerts to Alert interface
      return dbAlerts.map(dbAlert => ({
        id: dbAlert.id,
        severity: dbAlert.severity as AlertSeverity,
        title: dbAlert.title,
        message: dbAlert.message,
        source: dbAlert.source,
        timestamp: dbAlert.createdAt,
        createdAt: dbAlert.createdAt,
        metadata: dbAlert.metadata ? JSON.parse(dbAlert.metadata) : undefined,
        acknowledged: dbAlert.acknowledged,
        acknowledgedAt: dbAlert.acknowledgedAt || undefined,
        acknowledgedBy: dbAlert.acknowledgedBy || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get unacknowledged alerts', error as Error);
      return [];
    }
  }

  // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================

  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Сброс счётчика каждый час
    if (now - this.lastHourReset > 3600000) {
      this.alertCount = 0;
      this.lastHourReset = now;
    }

    return ++this.alertCount <= this.config.rateLimit;
  }

  private checkCooldown(alertKey: string): boolean {
    const now = Date.now();
    const lastSent = this.recentAlerts.get(alertKey);

    if (lastSent && now - lastSent < this.config.cooldown) {
      return false;
    }

    this.recentAlerts.set(alertKey, now);
    return true;
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendToDatabase(alert: Alert): Promise<void> {
    try {
      await db.alert.create({
        data: {
          id: alert.id,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          source: alert.source,
          metadata: alert.metadata ? JSON.stringify(alert.metadata) : null,
          acknowledged: false,
        },
      });
    } catch (error) {
      logger.error('Failed to save alert to database', error as Error);
      throw error;
    }
  }

  private async sendToTelegram(alert: Alert): Promise<void> {
    if (!this.config.telegram) return;

    const emoji = this.getEmoji(alert.severity);
    const text = `${emoji} *${this.escapeMarkdown(alert.title)}*\n\n${this.escapeMarkdown(alert.message)}\n\n_Источник: ${alert.source}_\n_Время: ${alert.timestamp.toISOString()}_`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.telegram.chatId,
            text,
            parse_mode: 'MarkdownV2',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send Telegram alert', error as Error);
      throw error;
    }
  }

  private async sendToWebhook(alert: Alert): Promise<void> {
    if (!this.config.webhook) return;

    try {
      const response = await fetch(this.config.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.webhook.headers,
        },
        body: JSON.stringify({
          id: alert.id,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          source: alert.source,
          timestamp: alert.timestamp.toISOString(),
          metadata: alert.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', error as Error);
      throw error;
    }
  }

  private getEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '🔴';
      case 'critical': return '🚨';
    }
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }
}

// ==================== SINGLETON ====================

let alertServiceInstance: AlertService | null = null;

export function getAlertService(config?: Partial<AlertConfig>): AlertService {
  if (!alertServiceInstance) {
    alertServiceInstance = new AlertService(config);
  }
  return alertServiceInstance;
}

export const alerts = {
  send: (severity: AlertSeverity, title: string, message: string, source?: string, metadata?: Record<string, any>) =>
    getAlertService().send(severity, title, message, source, metadata),
  info: (title: string, message: string, source?: string, metadata?: Record<string, any>) =>
    getAlertService().info(title, message, source, metadata),
  warning: (title: string, message: string, source?: string, metadata?: Record<string, any>) =>
    getAlertService().warning(title, message, source, metadata),
  error: (title: string, message: string, source?: string, metadata?: Record<string, any>) =>
    getAlertService().error(title, message, source, metadata),
  critical: (title: string, message: string, source?: string, metadata?: Record<string, any>) =>
    getAlertService().critical(title, message, source, metadata),
  acknowledge: (alertId: string, acknowledgedBy: string) =>
    getAlertService().acknowledge(alertId, acknowledgedBy),
  getUnacknowledged: (limit?: number) =>
    getAlertService().getUnacknowledged(limit),
};

export default AlertService;
