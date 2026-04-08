/**
 * Сервис временных email
 * 
 * Интеграция с провайдерами временной почты:
 * - 1secmail.com
 * - TempMail.plus
 * - Guerrilla Mail
 * - Temp-mail.org
 * - Mail.tm
 * - Dropmail.me
 * - MinuteInbox
 * - Emailnator
 */

import prisma from './prisma';

export interface TempEmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

export interface TempEmailProvider {
  name: string;
  getDomains: () => Promise<string[]>;
  createEmail: (domain: string) => Promise<{ email: string; token?: string }>;
  getMessages: (email: string, token?: string) => Promise<TempEmailMessage[]>;
}

/**
 * 1secmail.com Provider
 */
class OneSecMailProvider implements TempEmailProvider {
  name = '1secmail';

  async getDomains(): Promise<string[]> {
    try {
      const response = await fetch('https://www.1secmail.com/api/v1/?action=getDomainList');
      const domains = await response.json();
      return domains;
    } catch (error) {
      console.error('1secmail getDomains error:', error);
      return ['1secmail.com', '1secmail.org', '1secmail.net'];
    }
  }

  async createEmail(domain: string): Promise<{ email: string; token?: string }> {
    const login = this.generateLogin();
    return {
      email: `${login}@${domain}`
    };
  }

  async getMessages(email: string): Promise<TempEmailMessage[]> {
    try {
      const [login, domain] = email.split('@');
      const response = await fetch(
        `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`
      );
      const messages = await response.json();

      if (!Array.isArray(messages)) return [];

      // Получаем полные сообщения
      const fullMessages = await Promise.all(
        messages.map(async (msg: any) => {
          const detailResponse = await fetch(
            `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${msg.id}`
          );
          const detail = await detailResponse.json();

          return {
            id: msg.id.toString(),
            from: msg.from,
            subject: msg.subject,
            body: detail.body || detail.textBody || '',
            receivedAt: new Date(msg.date)
          };
        })
      );

      return fullMessages;
    } catch (error) {
      console.error('1secmail getMessages error:', error);
      return [];
    }
  }

  private generateLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * TempMail.plus Provider
 */
class TempMailPlusProvider implements TempEmailProvider {
  name = 'tempmail-plus';

  async getDomains(): Promise<string[]> {
    return ['tempmail.plus', 'tmppro.xyz', 'tmpmail.org'];
  }

  async createEmail(domain: string): Promise<{ email: string; token?: string }> {
    const login = this.generateLogin();
    const email = `${login}@${domain}`;
    
    // Регистрируем email
    try {
      await fetch(`https://tempmail-plus.com/api/v1/mailbox/${login}`, {
        method: 'PUT'
      });
    } catch (error) {
      console.error('TempMail.plus create error:', error);
    }

    return { email, token: login };
  }

  async getMessages(email: string, token?: string): Promise<TempEmailMessage[]> {
    if (!token) return [];

    try {
      const response = await fetch(`https://tempmail-plus.com/api/v1/mailbox/${token}`);
      const data = await response.json();

      if (!data.mail_list || !Array.isArray(data.mail_list)) return [];

      return data.mail_list.map((msg: any) => ({
        id: msg.mail_id.toString(),
        from: msg.mail_from,
        subject: msg.mail_subject,
        body: msg.mail_excerpt || '',
        receivedAt: new Date(msg.mail_timestamp * 1000)
      }));
    } catch (error) {
      console.error('TempMail.plus getMessages error:', error);
      return [];
    }
  }

  private generateLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Mail.tm Provider
 */
class MailTmProvider implements TempEmailProvider {
  name = 'mail-tm';
  private baseUrl = 'https://api.mail.tm';

  async getDomains(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/domains`);
      const data = await response.json();
      return data['hydra:member']?.map((d: any) => d.domain) || ['mail.tm'];
    } catch {
      return ['mail.tm'];
    }
  }

  async createEmail(domain: string): Promise<{ email: string; token?: string }> {
    const login = this.generateLogin();
    const email = `${login}@${domain}`;
    const password = this.generatePassword();

    try {
      // Создаём аккаунт
      await fetch(`${this.baseUrl}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      });

      // Получаем токен
      const tokenResponse = await fetch(`${this.baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password })
      });
      const tokenData = await tokenResponse.json();

      return { email, token: tokenData.token };
    } catch (error) {
      console.error('Mail.tm create error:', error);
      return { email };
    }
  }

  async getMessages(email: string, token?: string): Promise<TempEmailMessage[]> {
    if (!token) return [];

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!data['hydra:member']) return [];

      const messages = await Promise.all(
        data['hydra:member'].map(async (msg: any) => {
          const detailResponse = await fetch(`${this.baseUrl}/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const detail = await detailResponse.json();

          return {
            id: msg.id,
            from: msg.from?.address || 'unknown',
            subject: msg.subject,
            body: detail.text || detail.html || '',
            receivedAt: new Date(msg.createdAt)
          };
        })
      );

      return messages;
    } catch (error) {
      console.error('Mail.tm getMessages error:', error);
      return [];
    }
  }

  private generateLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Guerrilla Mail Provider
 */
class GuerrillaMailProvider implements TempEmailProvider {
  name = 'guerrilla-mail';
  private baseUrl = 'https://api.guerrillamail.com/ajax.php';

  async getDomains(): Promise<string[]> {
    return ['guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz'];
  }

  async createEmail(domain: string): Promise<{ email: string; token?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}?f=get_email_address&lang=en`);
      const data = await response.json();
      return { email: data.email_addr, token: data.sid_token };
    } catch (error) {
      console.error('Guerrilla Mail create error:', error);
      const login = this.generateLogin();
      return { email: `${login}@${domain}` };
    }
  }

  async getMessages(email: string, token?: string): Promise<TempEmailMessage[]> {
    if (!token) return [];

    try {
      const response = await fetch(`${this.baseUrl}?f=get_email_list&offset=0&sid_token=${token}`);
      const data = await response.json();

      if (!data.list) return [];

      return data.list.map((msg: any) => ({
        id: msg.mail_id,
        from: msg.mail_from,
        subject: msg.mail_subject,
        body: msg.mail_excerpt || '',
        receivedAt: new Date(msg.mail_timestamp * 1000)
      }));
    } catch (error) {
      console.error('Guerrilla Mail getMessages error:', error);
      return [];
    }
  }

  private generateLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Temp-mail.org Provider
 */
class TempMailOrgProvider implements TempEmailProvider {
  name = 'temp-mail-org';
  private baseUrl = 'https://www.temp-mail.org';

  async getDomains(): Promise<string[]> {
    return ['temp-mail.org'];
  }

  async createEmail(domain: string): Promise<{ email: string; token?: string }> {
    const login = this.generateLogin();
    return { email: `${login}@${domain}` };
  }

  async getMessages(email: string): Promise<TempEmailMessage[]> {
    try {
      const hash = this.md5(email);
      const response = await fetch(`${this.baseUrl}/mailbox/${hash}`);
      const data = await response.json();

      if (!Array.isArray(data)) return [];

      return data.map((msg: any) => ({
        id: msg.mail_id,
        from: msg.mail_from,
        subject: msg.mail_subject,
        body: msg.mail_text || msg.mail_html || '',
        receivedAt: new Date(msg.mail_timestamp * 1000)
      }));
    } catch (error) {
      console.error('Temp-mail.org getMessages error:', error);
      return [];
    }
  }

  private generateLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private md5(str: string): string {
    // Простая реализация MD5 хэша (для API temp-mail.org)
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex');
  }
}

/**
 * Dropmail.me Provider
 */
class DropmailProvider implements TempEmailProvider {
  name = 'dropmail';

  async getDomains(): Promise<string[]> {
    return ['dropmail.me', '10mail.org', 'vintomaper.com'];
  }

  async createEmail(domain: string): Promise<{ email: string; token?: string }> {
    const login = this.generateLogin();
    return { email: `${login}@${domain}` };
  }

  async getMessages(email: string): Promise<TempEmailMessage[]> {
    try {
      const [login, domain] = email.split('@');
      const response = await fetch(`https://dropmail.me/api/v1/mailbox/${login}@${domain}`);
      const data = await response.json();

      if (!data.messages) return [];

      return data.messages.map((msg: any) => ({
        id: msg.id,
        from: msg.from,
        subject: msg.subject,
        body: msg.body || msg.text || '',
        receivedAt: new Date(msg.date)
      }));
    } catch (error) {
      console.error('Dropmail getMessages error:', error);
      return [];
    }
  }

  private generateLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Emailnator Provider
 */
class EmailnatorProvider implements TempEmailProvider {
  name = 'emailnator';

  async getDomains(): Promise<string[]> {
    return ['emailnator.com', 'gmial.com'];
  }

  async createEmail(domain: string): Promise<{ email: string; token?: string }> {
    try {
      const response = await fetch('https://www.emailnator.com/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: ['domainGmail'] })
      });
      const data = await response.json();
      return { email: data.email?.[0] || '' };
    } catch (error) {
      console.error('Emailnator create error:', error);
      const login = this.generateLogin();
      return { email: `${login}@${domain}` };
    }
  }

  async getMessages(email: string): Promise<TempEmailMessage[]> {
    try {
      const response = await fetch('https://www.emailnator.com/message-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!data.messageData) return [];

      return data.messageData.map((msg: any[], idx: number) => ({
        id: idx.toString(),
        from: msg[0],
        subject: msg[1],
        body: '',
        receivedAt: new Date()
      }));
    } catch (error) {
      console.error('Emailnator getMessages error:', error);
      return [];
    }
  }

  private generateLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Менеджер временной почты
 */
class TempEmailService {
  private providers: TempEmailProvider[];
  private currentProviderIndex: number = 0;

  constructor() {
    this.providers = [
      new OneSecMailProvider(),
      new TempMailPlusProvider(),
      new MailTmProvider(),
      new GuerrillaMailProvider(),
      new TempMailOrgProvider(),
      new DropmailProvider(),
      new EmailnatorProvider()
    ];
  }

  /**
   * Создать временный email
   */
  async createEmail(forPurpose?: string, forId?: string): Promise<string> {
    // Пытаемся создать через разных провайдеров
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[(this.currentProviderIndex + i) % this.providers.length];
      
      try {
        const domains = await provider.getDomains();
        const domain = domains[Math.floor(Math.random() * domains.length)];

        const { email, token } = await provider.createEmail(domain);

        // Сохраняем в БД
        await prisma.tempEmail.create({
          data: {
            id: this.generateId(),
            email,
            provider: provider.name,
            verificationCode: token,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 час
          }
        });

        console.log(`📧 [TempEmail] Создан: ${email} (${provider.name})`);
        return email;
      } catch (error) {
        console.error(`📧 [TempEmail] Provider ${provider.name} failed:`, error);
        continue;
      }
    }

    throw new Error('Все провайдеры временной почты недоступны');
  }

  /**
   * Проверить входящие сообщения
   */
  async checkMessages(email: string): Promise<TempEmailMessage[]> {
    const stored = await prisma.tempEmail.findUnique({
      where: { email }
    });

    if (!stored) {
      throw new Error('Email not found in database');
    }

    const provider = this.providers.find(p => p.name === stored.provider);
    if (!provider) {
      throw new Error(`Provider ${stored.provider} not found`);
    }

    const messages = await provider.getMessages(email, stored.verificationCode || undefined);

    console.log(`📧 [TempEmail] ${email}: ${messages.length} сообщений`);
    return messages;
  }

  /**
   * Ожидать код подтверждения
   */
  async waitForCode(
    email: string,
    options?: {
      timeout?: number;
      pattern?: RegExp;
      fromContains?: string;
    }
  ): Promise<string | null> {
    const timeout = options?.timeout || 300000; // 5 минут
    const pattern = options?.pattern || /\b\d{4,6}\b/; // 4-6 цифр
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const messages = await this.checkMessages(email);

        for (const msg of messages) {
          // Фильтр по отправителю
          if (options?.fromContains && !msg.from.toLowerCase().includes(options.fromContains.toLowerCase())) {
            continue;
          }

          // Ищем код в теме или теле
          const text = `${msg.subject} ${msg.body}`;
          const match = text.match(pattern);

          if (match) {
            console.log(`📧 [TempEmail] Код найден: ${match[0]}`);
            return match[0];
          }
        }
      } catch (error) {
        console.error('Error checking messages:', error);
      }

      // Ждём перед следующей проверкой
      await this.sleep(5000);
    }

    console.log(`📧 [TempEmail] Таймаут ожидания кода для ${email}`);
    return null;
  }

  /**
   * Получить email из БД
   */
  async getEmail(email: string) {
    return prisma.tempEmail.findUnique({
      where: { email }
    });
  }

  /**
   * Удалить email
   */
  async deleteEmail(email: string): Promise<void> {
    await prisma.tempEmail.delete({
      where: { email }
    });
    console.log(`📧 [TempEmail] Удалён: ${email}`);
  }

  /**
   * Очистить просроченные
   */
  async cleanExpired(): Promise<number> {
    const result = await prisma.tempEmail.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    console.log(`📧 [TempEmail] Удалено ${result.count} просроченных`);
    return result.count;
  }

  /**
   * Переключить провайдера
   */
  switchProvider(): void {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    console.log(`📧 [TempEmail] Провайдер переключен на: ${this.providers[this.currentProviderIndex].name}`);
  }

  /**
   * Получить список провайдеров
   */
  getProviders(): string[] {
    return this.providers.map(p => p.name);
  }

  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
let tempEmailInstance: TempEmailService | null = null;

export function getTempEmailService(): TempEmailService {
  if (!tempEmailInstance) {
    tempEmailInstance = new TempEmailService();
  }
  return tempEmailInstance;
}

export { TempEmailService };
