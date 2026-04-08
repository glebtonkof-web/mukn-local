/**
 * Email Notification Service
 * 
 * SMTP уведомления для критических событий
 */

import prisma from './prisma';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string[];
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  priority?: 'high' | 'normal' | 'low';
}

class EmailNotificationService {
  private config: EmailConfig | null = null;
  private nodemailer: any = null;

  /**
   * Инициализировать с конфигурацией
   */
  async init(config: EmailConfig): Promise<void> {
    this.config = config;

    try {
      // Динамический импорт nodemailer
      this.nodemailer = await import('nodemailer');
      console.log('📧 [Email] Сервис инициализирован');
    } catch (error) {
      console.warn('📧 [Email] nodemailer не установлен, используем заглушку');
    }
  }

  /**
   * Загрузить конфигурацию из переменных окружения
   */
  loadFromEnv(): void {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'noreply@mukn.local',
      to: (process.env.SMTP_TO || '').split(',').filter(Boolean)
    };
  }

  /**
   * Отправить email
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.config || !this.nodemailer) {
      console.warn('📧 [Email] Не настроен, сохраняем в БД');
      await this.saveToDatabase(options);
      return false;
    }

    try {
      const transporter = this.nodemailer.default.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass
        }
      });

      const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

      const info = await transporter.sendMail({
        from: this.config.from,
        to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        priority: options.priority || 'normal'
      });

      console.log(`📧 [Email] Отправлено: ${options.subject} -> ${to}`);
      return true;
    } catch (error: any) {
      console.error('📧 [Email] Ошибка отправки:', error.message);
      
      // Сохраняем для повторной отправки
      await this.saveToDatabase(options, error.message);
      return false;
    }
  }

  /**
   * Сохранить email в БД для повторной отправки
   */
  private async saveToDatabase(options: EmailOptions, error?: string): Promise<void> {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    await prisma.emailNotification.create({
      data: {
        id: this.generateId(),
        to,
        subject: options.subject,
        body: options.html || options.text || '',
        status: error ? 'failed' : 'pending',
        error
      }
    });
  }

  /**
   * Повторная отправка отложенных email
   */
  async retryPending(): Promise<number> {
    if (!this.config || !this.nodemailer) {
      return 0;
    }

    const pending = await prisma.emailNotification.findMany({
      where: {
        status: 'pending',
        retryCount: { lt: 3 }
      },
      take: 10
    });

    let sent = 0;

    for (const email of pending) {
      const success = await this.send({
        to: email.to.split(', '),
        subject: email.subject,
        html: email.body
      });

      if (success) {
        await prisma.emailNotification.update({
          where: { id: email.id },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        });
        sent++;
      } else {
        await prisma.emailNotification.update({
          where: { id: email.id },
          data: {
            retryCount: { increment: 1 }
          }
        });
      }
    }

    return sent;
  }

  /**
   * Отправить уведомление об ошибке
   */
  async sendErrorAlert(title: string, error: Error | string, context?: any): Promise<void> {
    const errorText = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' ? error.stack : '';

    const html = `
      <h2>🚨 ${title}</h2>
      <p><strong>Ошибка:</strong> ${errorText}</p>
      ${errorStack ? `<pre>${errorStack}</pre>` : ''}
      ${context ? `<h3>Контекст:</h3><pre>${JSON.stringify(context, null, 2)}</pre>` : ''}
      <hr>
      <p><small>МУКН - ${new Date().toLocaleString('ru-RU')}</small></p>
    `;

    const recipients = this.config?.to || [];
    if (recipients.length === 0) {
      console.warn('📧 [Email] Нет получателей для уведомления');
      return;
    }

    await this.send({
      to: recipients,
      subject: `🚨 МУКН: ${title}`,
      html,
      priority: 'high'
    });
  }

  /**
   * Отправить ежедневный отчёт
   */
  async sendDailyReport(stats: {
    registered: number;
    active: number;
    banned: number;
    revenue: number;
  }): Promise<void> {
    const html = `
      <h2>📊 Ежедневный отчёт МУКН</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;">Зарегистрировано</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${stats.registered}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">Активных</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${stats.active}</td>
        </tr>
        <tr style="background: #fff0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;">Заблокировано</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${stats.banned}</td>
        </tr>
        <tr style="background: #f0fff0;">
          <td style="padding: 10px; border: 1px solid #ddd;">Доход</td>
          <td style="padding: 10px; border: 1px solid #ddd;">$${stats.revenue.toFixed(2)}</td>
        </tr>
      </table>
      <hr>
      <p><small>${new Date().toLocaleDateString('ru-RU')}</small></p>
    `;

    const recipients = this.config?.to || [];
    if (recipients.length === 0) return;

    await this.send({
      to: recipients,
      subject: '📊 Ежедневный отчёт МУКН',
      html
    });
  }

  /**
   * Отправить уведомление о низком балансе
   */
  async sendLowBalanceAlert(service: string, balance: number, threshold: number): Promise<void> {
    const html = `
      <h2>⚠️ Низкий баланс</h2>
      <p><strong>Сервис:</strong> ${service}</p>
      <p><strong>Баланс:</strong> ${balance.toFixed(2)}</p>
      <p><strong>Порог:</strong> ${threshold.toFixed(2)}</p>
      <p>Необходимо пополнить баланс для продолжения работы.</p>
    `;

    const recipients = this.config?.to || [];
    if (recipients.length === 0) return;

    await this.send({
      to: recipients,
      subject: `⚠️ Низкий баланс: ${service}`,
      html,
      priority: 'high'
    });
  }

  private generateId(): string {
    return `mail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton
let emailServiceInstance: EmailNotificationService | null = null;

export function getEmailService(): EmailNotificationService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailNotificationService();
    emailServiceInstance.loadFromEnv();
  }
  return emailServiceInstance;
}

export function initEmailService(config: EmailConfig): EmailNotificationService {
  emailServiceInstance = new EmailNotificationService();
  emailServiceInstance.init(config);
  return emailServiceInstance;
}
