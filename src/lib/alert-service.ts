/**
 * Alert Service
 * 
 * Система уведомлений о критических событиях для автономной работы 24/365.
 * Поддерживает: Telegram, Email, Webhook, логирование.
 */

import prisma from './prisma';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertCategory = 
  | 'system' 
  | 'registration' 
  | 'proxy' 
  | 'account' 
  | 'captcha' 
  | 'database'
  | 'queue'
  | 'security';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AlertConfig {
  telegramEnabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  emailEnabled: boolean;
  emailRecipients?: string[];
  webhookEnabled: boolean;
  webhookUrl?: string;
  minSeverity: AlertSeverity;
  cooldownMinutes: number;
}

const SEVERITY_LEVELS: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3
};

const DEFAULT_CONFIG: AlertConfig = {
  telegramEnabled: true,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  emailEnabled: false,
  webhookEnabled: false,
  minSeverity: 'warning',
  cooldownMinutes: 5
};

class AlertService {
  private config: AlertConfig;
  private lastAlerts: Map<string, Date> = new Map();

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Создать алерт
   */
  async alert(
    severity: AlertSeverity,
    category: AlertCategory,
    title: string,
    message: string,
    details?: Record<string, any>
  ): Promise<Alert> {
    const alertId = this.generateId();

    // Проверяем cooldown для одинаковых алертов
    const alertKey = `${category}:${title}`;
    const lastAlert = this.lastAlerts.get(alertKey);
    if (lastAlert) {
      const minutesSince = (Date.now() - lastAlert.getTime()) / (1000 * 60);
      if (minutesSince < this.config.cooldownMinutes) {
        console.log(`🔇 [Alert] Пропущен (cooldown): ${title}`);
        // Возвращаем "тихий" алерт
        return {
          id: alertId,
          severity,
          category,
          title,
          message,
          details,
          timestamp: new Date(),
          acknowledged: true // Не требует внимания
        };
      }
    }

    this.lastAlerts.set(alertKey, new Date());

    const alert: Alert = {
      id: alertId,
      severity,
      category,
      title,
      message,
      details,
      timestamp: new Date(),
      acknowledged: false
    };

    // Логируем
    this.logAlert(alert);

    // Проверяем минимальный уровень
    if (SEVERITY_LEVELS[severity] >= SEVERITY_LEVELS[this.config.minSeverity]) {
      // Отправляем уведомления параллельно
      await Promise.allSettled([
        this.sendTelegram(alert),
        this.sendEmail(alert),
        this.sendWebhook(alert)
      ]);
    }

    // Сохраняем в БД
    await this.saveAlert(alert);

    return alert;
  }

  /**
   * Быстрые методы для разных уровней
   */
  async info(category: AlertCategory, title: string, message: string, details?: any) {
    return this.alert('info', category, title, message, details);
  }

  async warning(category: AlertCategory, title: string, message: string, details?: any) {
    return this.alert('warning', category, title, message, details);
  }

  async error(category: AlertCategory, title: string, message: string, details?: any) {
    return this.alert('error', category, title, message, details);
  }

  async critical(category: AlertCategory, title: string, message: string, details?: any) {
    return this.alert('critical', category, title, message, details);
  }

  /**
   * Отправить в Telegram
   */
  private async sendTelegram(alert: Alert): Promise<void> {
    if (!this.config.telegramEnabled || !this.config.telegramBotToken || !this.config.telegramChatId) {
      return;
    }

    const emoji = this.getSeverityEmoji(alert.severity);
    const text = `
${emoji} *${alert.title}*

📍 Категория: ${alert.category}
⚠️ Уровень: ${alert.severity.toUpperCase()}

${alert.message}

🕐 ${alert.timestamp.toLocaleString('ru-RU')}
    `.trim();

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.telegramChatId,
            text,
            parse_mode: 'Markdown'
          })
        }
      );

      if (!response.ok) {
        console.error('❌ [Alert] Telegram error:', await response.text());
      }
    } catch (error: any) {
      console.error('❌ [Alert] Telegram failed:', error.message);
    }
  }

  /**
   * Отправить Email
   */
  private async sendEmail(alert: Alert): Promise<void> {
    if (!this.config.emailEnabled || !this.config.emailRecipients?.length) {
      return;
    }

    try {
      const { getEmailService } = await import('./email-notifications');
      const emailService = getEmailService();

      const subject = `[МУКН ${alert.severity.toUpperCase()}] ${alert.title}`;

      for (const recipient of this.config.emailRecipients) {
        await emailService.send({
          to: recipient,
          subject,
          html: `
            <h2>${this.getSeverityEmoji(alert.severity)} ${alert.title}</h2>
            <p><strong>Категория:</strong> ${alert.category}</p>
            <p><strong>Уровень:</strong> ${alert.severity}</p>
            <p><strong>Сообщение:</strong> ${alert.message}</p>
            <p><strong>Время:</strong> ${alert.timestamp.toLocaleString('ru-RU')}</p>
            ${alert.details ? `<pre>${JSON.stringify(alert.details, null, 2)}</pre>` : ''}
          `
        });
      }
    } catch (error: any) {
      console.error('❌ [Alert] Email failed:', error.message);
    }
  }

  /**
   * Отправить Webhook
   */
  private async sendWebhook(alert: Alert): Promise<void> {
    if (!this.config.webhookEnabled || !this.config.webhookUrl) {
      return;
    }

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alert,
          source: 'mukn-autonomous',
          timestamp: alert.timestamp.toISOString()
        })
      });
    } catch (error: any) {
      console.error('❌ [Alert] Webhook failed:', error.message);
    }
  }

  /**
   * Логирование алерта
   */
  private logAlert(alert: Alert): void {
    const logFn = {
      info: console.log,
      warning: console.warn,
      error: console.error,
      critical: console.error
    }[alert.severity];

    const emoji = this.getSeverityEmoji(alert.severity);
    logFn(`${emoji} [Alert] [${alert.category}] ${alert.title}: ${alert.message}`);
  }

  /**
   * Сохранение в БД
   */
  private async saveAlert(alert: Alert): Promise<void> {
    try {
      await prisma.alertLog.create({
        data: {
          id: alert.id,
          severity: alert.severity,
          category: alert.category,
          title: alert.title,
          message: alert.message,
          details: alert.details ? JSON.stringify(alert.details) : null,
          acknowledged: alert.acknowledged
        }
      });
    } catch (error: any) {
      console.error('❌ [Alert] Failed to save:', error.message);
    }
  }

  /**
   * Подтвердить алерт
   */
  async acknowledge(alertId: string, acknowledgedBy: string): Promise<boolean> {
    try {
      await prisma.alertLog.update({
        where: { id: alertId },
        data: {
          acknowledged: true,
          acknowledgedBy,
          acknowledgedAt: new Date()
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить непросмотренные алерты
   */
  async getUnacknowledged(limit: number = 50): Promise<Alert[]> {
    const logs = await prisma.alertLog.findMany({
      where: { acknowledged: false },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return logs.map(log => ({
      id: log.id,
      severity: log.severity as AlertSeverity,
      category: log.category as AlertCategory,
      title: log.title,
      message: log.message,
      details: log.details ? JSON.parse(log.details) : undefined,
      timestamp: log.createdAt,
      acknowledged: log.acknowledged,
      acknowledgedBy: log.acknowledgedBy || undefined,
      acknowledgedAt: log.acknowledgedAt || undefined
    }));
  }

  /**
   * Получить статистику алертов
   */
  async getStats(hours: number = 24): Promise<{
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    byCategory: Record<AlertCategory, number>;
    unacknowledged: number;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [total, bySeverity, byCategory, unacknowledged] = await Promise.all([
      prisma.alertLog.count({ where: { createdAt: { gte: since } } }),
      this.groupBy('severity', since),
      this.groupBy('category', since),
      prisma.alertLog.count({ where: { acknowledged: false } })
    ]);

    return {
      total,
      bySeverity: bySeverity as Record<AlertSeverity, number>,
      byCategory: byCategory as Record<AlertCategory, number>,
      unacknowledged
    };
  }

  private async groupBy(field: string, since: Date): Promise<Record<string, number>> {
    const logs = await prisma.alertLog.groupBy({
      by: [field as any],
      where: { createdAt: { gte: since } },
      _count: { [field]: true }
    });

    const result: Record<string, number> = {};
    for (const log of logs) {
      result[log[field as keyof typeof log] as string] = log._count[field as keyof typeof log._count];
    }
    return result;
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return emojis[severity];
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton
let alertInstance: AlertService | null = null;

export function getAlertService(config?: Partial<AlertConfig>): AlertService {
  if (!alertInstance) {
    alertInstance = new AlertService(config);
  }
  return alertInstance;
}

export { AlertService };
