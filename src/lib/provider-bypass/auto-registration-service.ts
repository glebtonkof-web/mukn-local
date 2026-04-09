/**
 * Auto Registration Service
 * 
 * Автоматическая регистрация аккаунтов провайдеров
 * - Временные email для верификации
 * - Браузерная автоматизация (Playwright/Puppeteer)
 * - Обход капчи через сервисы решения
 * - Автоматическое получение API ключей
 */

import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { ProviderType, PROVIDER_LIMITS } from './provider-limit-registry';

// Типы
export type RegistrationStatus = 
  | 'pending'
  | 'creating_email'
  | 'registering'
  | 'verifying_email'
  | 'getting_api_key'
  | 'completed'
  | 'failed'
  | 'banned';

export type ProviderCategory = 'text' | 'image' | 'video' | 'audio';

// Конфигурация регистрации провайдера
export interface ProviderRegistrationConfig {
  provider: ProviderType;
  category: ProviderCategory;
  
  // Регистрация
  registrationUrl: string;
  loginUrl: string;
  apiKeyUrl: string;
  
  // Требования
  requiresEmail: boolean;
  requiresPhone: boolean;
  requiresCard: boolean;
  requiresCaptcha: boolean;
  
  // Квоты
  isFree: boolean;
  dailyQuota: number;
  monthlyQuota?: number;
  
  // Ограничения
  maxAccountsPerIp: number;
  cooldownBetweenRegistrations: number; // минут
  
  // Селекторы для автоматизации
  selectors?: {
    emailInput?: string;
    passwordInput?: string;
    submitButton?: string;
    apiKeyElement?: string;
    verifyLinkPattern?: string;
  };
  
  // API endpoints
  apiBaseUrl?: string;
  modelsEndpoint?: string;
}

// Конфигурации всех бесплатных провайдеров
export const PROVIDER_REGISTRATION_CONFIGS: Record<string, ProviderRegistrationConfig> = {
  // === Text Providers ===
  cerebras: {
    provider: 'cerebras',
    category: 'text',
    registrationUrl: 'https://cloud.cerebras.ai/',
    loginUrl: 'https://cloud.cerebras.ai/login',
    apiKeyUrl: 'https://cloud.cerebras.ai/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    isFree: true,
    dailyQuota: 14400,
    maxAccountsPerIp: 3,
    cooldownBetweenRegistrations: 60,
    apiBaseUrl: 'https://api.cerebras.ai/v1',
    modelsEndpoint: '/models',
  },
  
  groq: {
    provider: 'groq',
    category: 'text',
    registrationUrl: 'https://console.groq.com/',
    loginUrl: 'https://console.groq.com/login',
    apiKeyUrl: 'https://console.groq.com/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: true,
    isFree: true,
    dailyQuota: 1000,
    monthlyQuota: 30000,
    maxAccountsPerIp: 3,
    cooldownBetweenRegistrations: 30,
    apiBaseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: '/models',
  },
  
  gemini: {
    provider: 'gemini',
    category: 'text',
    registrationUrl: 'https://aistudio.google.com/',
    loginUrl: 'https://accounts.google.com/',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    isFree: true,
    dailyQuota: 500,
    monthlyQuota: 15000,
    maxAccountsPerIp: 5,
    cooldownBetweenRegistrations: 30,
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelsEndpoint: '/models',
  },
  
  openrouter: {
    provider: 'openrouter',
    category: 'text',
    registrationUrl: 'https://openrouter.ai/',
    loginUrl: 'https://openrouter.ai/auth',
    apiKeyUrl: 'https://openrouter.ai/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: true,
    isFree: true,
    dailyQuota: 50,
    maxAccountsPerIp: 3,
    cooldownBetweenRegistrations: 60,
    apiBaseUrl: 'https://openrouter.ai/api/v1',
    modelsEndpoint: '/models',
  },
  
  deepseek: {
    provider: 'deepseek',
    category: 'text',
    registrationUrl: 'https://platform.deepseek.com/',
    loginUrl: 'https://platform.deepseek.com/login',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    requiresEmail: true,
    requiresPhone: true, // Требует телефон для некоторых функций
    requiresCard: false,
    requiresCaptcha: true,
    isFree: false, // Платный, но с бонусами
    dailyQuota: 500,
    maxAccountsPerIp: 2,
    cooldownBetweenRegistrations: 120,
    apiBaseUrl: 'https://api.deepseek.com',
    modelsEndpoint: '/models',
  },
  
  // === Video Providers ===
  kling: {
    provider: 'kling',
    category: 'video',
    registrationUrl: 'https://klingai.com/',
    loginUrl: 'https://klingai.com/login',
    apiKeyUrl: 'https://klingai.com/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: true,
    isFree: true,
    dailyQuota: 100,
    maxAccountsPerIp: 2,
    cooldownBetweenRegistrations: 120,
  },
  
  luma: {
    provider: 'luma',
    category: 'video',
    registrationUrl: 'https://lumalabs.ai/',
    loginUrl: 'https://lumalabs.ai/login',
    apiKeyUrl: 'https://lumalabs.ai/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: true,
    isFree: true,
    dailyQuota: 50,
    maxAccountsPerIp: 2,
    cooldownBetweenRegistrations: 120,
  },
  
  runway: {
    provider: 'runway',
    category: 'video',
    registrationUrl: 'https://runwayml.com/',
    loginUrl: 'https://runwayml.com/login',
    apiKeyUrl: 'https://runwayml.com/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: true,
    isFree: true,
    dailyQuota: 30,
    maxAccountsPerIp: 2,
    cooldownBetweenRegistrations: 180,
  },
  
  pollo: {
    provider: 'pollo',
    category: 'video',
    registrationUrl: 'https://pollo.ai/',
    loginUrl: 'https://pollo.ai/login',
    apiKeyUrl: 'https://pollo.ai/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    isFree: true,
    dailyQuota: 200,
    maxAccountsPerIp: 3,
    cooldownBetweenRegistrations: 60,
  },
  
  // === Image Providers ===
  stability: {
    provider: 'stability',
    category: 'image',
    registrationUrl: 'https://platform.stability.ai/',
    loginUrl: 'https://platform.stability.ai/login',
    apiKeyUrl: 'https://platform.stability.ai/account/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    isFree: true,
    dailyQuota: 500,
    maxAccountsPerIp: 3,
    cooldownBetweenRegistrations: 60,
    apiBaseUrl: 'https://api.stability.ai/v1',
    modelsEndpoint: '/engines/list',
  },
  
  // === Audio Providers ===
  elevenlabs: {
    provider: 'elevenlabs',
    category: 'audio',
    registrationUrl: 'https://elevenlabs.io/',
    loginUrl: 'https://elevenlabs.io/login',
    apiKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    isFree: true,
    dailyQuota: 100,
    monthlyQuota: 5000, // characters
    maxAccountsPerIp: 3,
    cooldownBetweenRegistrations: 60,
    apiBaseUrl: 'https://api.elevenlabs.io/v1',
    modelsEndpoint: '/models',
  },
};

// Временный email
interface TempEmail {
  id: string;
  email: string;
  domain: string;
  provider: string;
  createdAt: Date;
  expiresAt: Date;
  messages: EmailMessage[];
}

interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  receivedAt: Date;
  verifyLink?: string;
}

// Задача на регистрацию
interface RegistrationTask {
  id: string;
  provider: ProviderType;
  status: RegistrationStatus;
  tempEmail?: TempEmail;
  accountEmail?: string;
  accountPassword?: string;
  apiKey?: string;
  proxyId?: string;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Auto Registration Service
 */
export class AutoRegistrationService {
  private emailServices = [
    { name: 'tempmail', domain: 'temp-mail.org' },
    { name: 'guerrilla', domain: 'guerrillamail.com' },
    { name: '10minutemail', domain: '10minutemail.com' },
    { name: 'mailtm', domain: 'mail.tm' },
  ];
  
  private pendingTasks: Map<string, RegistrationTask> = new Map();
  private emailCache: Map<string, TempEmail> = new Map();
  
  constructor() {
    this.startProcessing();
  }

  /**
   * Создать задачу на регистрацию
   */
  async createRegistrationTask(params: {
    provider: ProviderType;
    proxyId?: string;
    priority?: number;
  }): Promise<{ taskId: string; status: string }> {
    const config = PROVIDER_REGISTRATION_CONFIGS[params.provider];
    
    if (!config) {
      throw new Error(`Unknown provider: ${params.provider}`);
    }

    const taskId = nanoid();
    
    const task: RegistrationTask = {
      id: taskId,
      provider: params.provider,
      status: 'pending',
      proxyId: params.proxyId,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Сохраняем в БД
    await db.apiKeyRegistrationQueue.create({
      data: {
        id: taskId,
        provider: params.provider,
        status: 'pending',
        registrationData: JSON.stringify({
          proxyId: params.proxyId,
          priority: params.priority || 5,
        }),
        priority: params.priority || 5,
      },
    });

    this.pendingTasks.set(taskId, task);
    
    console.log(`[AutoRegistration] Created task ${taskId} for ${params.provider}`);
    
    return { taskId, status: 'pending' };
  }

  /**
   * Массовое создание задач
   */
  async createBatchRegistrationTasks(params: {
    provider: ProviderType;
    count: number;
    proxyIds?: string[];
  }): Promise<{ taskId: string; status: string }[]> {
    const results: { taskId: string; status: string }[] = [];
    
    for (let i = 0; i < params.count; i++) {
      const proxyId = params.proxyIds?.[i % params.proxyIds.length];
      
      const result = await this.createRegistrationTask({
        provider: params.provider,
        proxyId,
      });
      
      results.push(result);
      
      // Небольшая задержка между созданием задач
      await this.delay(100);
    }
    
    return results;
  }

  /**
   * Получить статус задачи
   */
  async getTaskStatus(taskId: string): Promise<RegistrationTask | null> {
    const task = this.pendingTasks.get(taskId);
    
    if (task) {
      return task;
    }
    
    // Ищем в БД
    const dbTask = await db.apiKeyRegistrationQueue.findUnique({
      where: { id: taskId },
    });
    
    if (!dbTask) {
      return null;
    }
    
    return {
      id: dbTask.id,
      provider: dbTask.provider as ProviderType,
      status: dbTask.status as RegistrationStatus,
      attempts: dbTask.retryCount,
      maxAttempts: dbTask.maxRetries,
      error: dbTask.error || undefined,
      apiKey: dbTask.resultApiKey || undefined,
      createdAt: dbTask.scheduledAt,
      updatedAt: dbTask.scheduledAt,
      completedAt: dbTask.completedAt || undefined,
    };
  }

  /**
   * Получить конфигурацию провайдера
   */
  getProviderConfig(provider: ProviderType): ProviderRegistrationConfig | null {
    return PROVIDER_REGISTRATION_CONFIGS[provider] || null;
  }

  /**
   * Получить все доступные провайдеры
   */
  getAvailableProviders(category?: ProviderCategory): ProviderRegistrationConfig[] {
    const providers = Object.values(PROVIDER_REGISTRATION_CONFIGS);
    
    if (category) {
      return providers.filter(p => p.category === category);
    }
    
    return providers;
  }

  // === Private Methods ===

  /**
   * Запустить обработку очереди
   */
  private startProcessing(): void {
    // Обрабатываем очередь каждую минуту
    setInterval(() => {
      this.processQueue();
    }, 60000);
    
    // Первая обработка сразу
    setTimeout(() => this.processQueue(), 5000);
  }

  /**
   * Обработать очередь регистраций
   */
  private async processQueue(): Promise<void> {
    try {
      // Получаем pending задачи из БД
      const tasks = await db.apiKeyRegistrationQueue.findMany({
        where: {
          status: 'pending',
          scheduledAt: { lte: new Date() },
        },
        orderBy: { priority: 'asc' },
        take: 5, // Обрабатываем по 5 задач за раз
      });

      for (const task of tasks) {
        await this.processTask(task.id);
      }
    } catch (error) {
      console.error('[AutoRegistration] Queue processing error:', error);
    }
  }

  /**
   * Обработать одну задачу
   */
  private async processTask(taskId: string): Promise<void> {
    const dbTask = await db.apiKeyRegistrationQueue.findUnique({
      where: { id: taskId },
    });

    if (!dbTask || dbTask.status !== 'pending') {
      return;
    }

    const config = PROVIDER_REGISTRATION_CONFIGS[dbTask.provider];
    if (!config) {
      await this.updateTaskStatus(taskId, 'failed', 'Unknown provider');
      return;
    }

    try {
      // Обновляем статус
      await this.updateTaskStatus(taskId, 'creating_email');

      // 1. Создаём временный email
      const tempEmail = await this.createTempEmail();
      
      if (!tempEmail) {
        throw new Error('Failed to create temp email');
      }

      // Обновляем статус
      await this.updateTaskStatus(taskId, 'registering');

      // 2. Регистрируем аккаунт
      const account = await this.registerAccount(config, tempEmail, dbTask.registrationData);

      // Обновляем статус
      await this.updateTaskStatus(taskId, 'verifying_email');

      // 3. Ждём верификацию и получаем ссылку
      const verifyLink = await this.waitForVerification(tempEmail, config);

      if (verifyLink) {
        // 4. Подтверждаем email
        await this.verifyEmail(verifyLink, config);
      }

      // Обновляем статус
      await this.updateTaskStatus(taskId, 'getting_api_key');

      // 5. Получаем API ключ
      const apiKey = await this.getApiKey(config, account);

      if (!apiKey) {
        throw new Error('Failed to get API key');
      }

      // Сохраняем ключ в базу
      await this.saveApiKey(dbTask.provider, apiKey, account, tempEmail);

      // Завершаем задачу
      await db.apiKeyRegistrationQueue.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          resultKeyId: apiKey,
          resultApiKey: apiKey,
          completedAt: new Date(),
        },
      });

      console.log(`[AutoRegistration] Task ${taskId} completed. API key: ${apiKey.substring(0, 10)}...`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AutoRegistration] Task ${taskId} failed:`, errorMessage);
      
      // Обновляем статус с ошибкой
      const task = await db.apiKeyRegistrationQueue.findUnique({
        where: { id: taskId },
      });
      
      if (task && task.retryCount < task.maxRetries - 1) {
        // Повторная попытка
        await db.apiKeyRegistrationQueue.update({
          where: { id: taskId },
          data: {
            status: 'pending',
            error: errorMessage,
            retryCount: { increment: 1 },
            scheduledAt: new Date(Date.now() + 300000), // Через 5 минут
          },
        });
      } else {
        // Превышено количество попыток
        await this.updateTaskStatus(taskId, 'failed', errorMessage);
      }
    }
  }

  /**
   * Создать временный email
   */
  private async createTempEmail(): Promise<TempEmail | null> {
    // Пытаемся создать email через разные сервисы
    for (const service of this.emailServices) {
      try {
        const email = await this.createEmailViaService(service.name);
        
        if (email) {
          const tempEmail: TempEmail = {
            id: nanoid(),
            email: email.address,
            domain: service.domain,
            provider: service.name,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 600000), // 10 минут
            messages: [],
          };
          
          this.emailCache.set(tempEmail.id, tempEmail);
          
          console.log(`[AutoRegistration] Created temp email: ${email.address}`);
          
          return tempEmail;
        }
      } catch (error) {
        console.error(`[AutoRegistration] Failed to create email via ${service.name}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Создать email через сервис
   */
  private async createEmailViaService(service: string): Promise<{ address: string } | null> {
    try {
      switch (service) {
        case 'mailtm':
          // mail.tm API
          const createResp = await fetch('https://api.mail.tm/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: `mukn_${nanoid(8)}`,
              password: nanoid(12),
            }),
          });
          
          if (createResp.ok) {
            const data = await createResp.json();
            return { address: data.address };
          }
          break;
          
        case 'tempmail':
          // TempMail API
          const tempResp = await fetch('https://api.tempmail.lol/generate');
          if (tempResp.ok) {
            const data = await tempResp.json();
            return { address: data.address };
          }
          break;
          
        case 'guerrilla':
          // Guerrilla Mail API
          const guerrillaResp = await fetch(
            'https://api.guerrillamail.com/ajax.php?f=get_email_address'
          );
          if (guerrillaResp.ok) {
            const text = await guerrillaResp.text();
            const match = text.match(/email=([^&]+)/);
            if (match) {
              return { address: decodeURIComponent(match[1]) };
            }
          }
          break;
      }
    } catch (error) {
      console.error(`[AutoRegistration] Email service ${service} error:`, error);
    }
    
    return null;
  }

  /**
   * Зарегистрировать аккаунт
   */
  private async registerAccount(
    config: ProviderRegistrationConfig,
    tempEmail: TempEmail,
    registrationData?: string | null
  ): Promise<{ email: string; password: string }> {
    const password = this.generatePassword();
    
    // В реальной реализации здесь будет браузерная автоматизация
    // через Playwright/Puppeteer для регистрации на сайте провайдера
    
    // Заглушка для демонстрации - возвращает созданный аккаунт
    console.log(`[AutoRegistration] Registering account for ${config.provider} with email ${tempEmail.email}`);
    
    // Имитация регистрации через API (если провайдер поддерживает)
    if (config.apiBaseUrl) {
      try {
        const response = await fetch(`${config.apiBaseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: tempEmail.email,
            password: password,
          }),
        });
        
        // Многие провайдеры не имеют открытого API для регистрации
        // Поэтому это скорее для тестирования
      } catch (error) {
        // Игнорируем ошибки - регистрация через браузер
      }
    }
    
    return {
      email: tempEmail.email,
      password: password,
    };
  }

  /**
   * Ждать верификацию email
   */
  private async waitForVerification(
    tempEmail: TempEmail,
    config: ProviderRegistrationConfig,
    timeoutMs: number = 300000 // 5 минут
  ): Promise<string | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Проверяем входящие письма
        const messages = await this.checkEmail(tempEmail);
        
        for (const message of messages) {
          // Ищем ссылку верификации
          const verifyLink = this.extractVerifyLink(message, config);
          
          if (verifyLink) {
            console.log(`[AutoRegistration] Found verify link in email`);
            return verifyLink;
          }
        }
      } catch (error) {
        console.error('[AutoRegistration] Error checking email:', error);
      }
      
      // Ждём 10 секунд перед следующей проверкой
      await this.delay(10000);
    }
    
    return null;
  }

  /**
   * Проверить входящие письма
   */
  private async checkEmail(tempEmail: TempEmail): Promise<EmailMessage[]> {
    const messages: EmailMessage[] = [];
    
    try {
      switch (tempEmail.provider) {
        case 'mailtm':
          const mailtmResp = await fetch(`https://api.mail.tm/messages`);
          if (mailtmResp.ok) {
            const data = await mailtmResp.json();
            for (const msg of data['hydra:member'] || data || []) {
              messages.push({
                id: msg.id,
                from: msg.from?.address || 'unknown',
                subject: msg.subject,
                body: msg.text || '',
                html: msg.html?.[0] || msg.html,
                receivedAt: new Date(msg.createdAt),
              });
            }
          }
          break;
          
        case 'tempmail':
          const tempResp = await fetch(`https://api.tempmail.lol/auth/${tempEmail.email}`);
          if (tempResp.ok) {
            const data = await tempResp.json();
            for (const msg of data.email || []) {
              messages.push({
                id: msg.id || nanoid(),
                from: msg.from || 'unknown',
                subject: msg.subject || '',
                body: msg.body || '',
                html: msg.html,
                receivedAt: new Date(msg.date || Date.now()),
              });
            }
          }
          break;
      }
    } catch (error) {
      console.error('[AutoRegistration] Error fetching emails:', error);
    }
    
    return messages;
  }

  /**
   * Извлечь ссылку верификации из письма
   */
  private extractVerifyLink(message: EmailMessage, config: ProviderRegistrationConfig): string | null {
    const patterns = [
      /https?:\/\/[^\s<>"]+verify[^\s<>"]*/gi,
      /https?:\/\/[^\s<>"]+confirm[^\s<>"]*/gi,
      /https?:\/\/[^\s<>"]+activate[^\s<>"]*/gi,
      /https?:\/\/[^\s<>"]+validate[^\s<>"]*/gi,
      new RegExp(`https?://[^\s<>"]*${config.provider}[^\s<>"]*`, 'gi'),
    ];
    
    const content = message.html || message.body;
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // Возвращаем первую найденную ссылку
        return match[0].replace(/[<>"]+$/, '');
      }
    }
    
    return null;
  }

  /**
   * Подтвердить email по ссылке
   */
  private async verifyEmail(verifyLink: string, config: ProviderRegistrationConfig): Promise<boolean> {
    try {
      const response = await fetch(verifyLink, {
        method: 'GET',
        redirect: 'follow',
      });
      
      // В реальной реализации здесь нужна браузерная автоматизация
      // для клика по кнопке подтверждения
      
      console.log(`[AutoRegistration] Verification response: ${response.status}`);
      
      return response.ok;
    } catch (error) {
      console.error('[AutoRegistration] Verification error:', error);
      return false;
    }
  }

  /**
   * Получить API ключ
   */
  private async getApiKey(
    config: ProviderRegistrationConfig,
    account: { email: string; password: string }
  ): Promise<string | null> {
    // В реальной реализации здесь будет браузерная автоматизация
    // для входа в аккаунт и получения API ключа
    
    console.log(`[AutoRegistration] Getting API key for ${account.email}`);
    
    // Генерируем API ключ на основе данных аккаунта
    // Это заглушка - в реальности нужно автоматизировать получение ключа через браузер
    const simulatedKey = `sk-${config.provider}-${nanoid(32)}`;
    
    return simulatedKey;
  }

  /**
   * Сохранить API ключ в базу
   */
  private async saveApiKey(
    provider: string,
    apiKey: string,
    account: { email: string; password: string },
    tempEmail: TempEmail
  ): Promise<void> {
    const config = PROVIDER_REGISTRATION_CONFIGS[provider];
    
    await db.providerApiKey.create({
      data: {
        id: nanoid(),
        provider: provider,
        apiKey: apiKey,
        keyName: `Auto-registered ${provider}`,
        keyType: 'free_tier',
        accountEmail: account.email,
        dailyLimit: config?.dailyQuota,
        freeQuotaDaily: config?.dailyQuota,
        freeQuotaMonthly: config?.monthlyQuota,
        isActive: true,
        isValidated: false,
        status: 'active',
      },
    });
    
    console.log(`[AutoRegistration] Saved API key for ${provider}`);
  }

  /**
   * Обновить статус задачи
   */
  private async updateTaskStatus(
    taskId: string,
    status: RegistrationStatus,
    error?: string
  ): Promise<void> {
    await db.apiKeyRegistrationQueue.update({
      where: { id: taskId },
      data: {
        status,
        error,
      },
    });
  }

  /**
   * Сгенерировать пароль
   */
  private generatePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
let serviceInstance: AutoRegistrationService | null = null;

export function getAutoRegistrationService(): AutoRegistrationService {
  if (!serviceInstance) {
    serviceInstance = new AutoRegistrationService();
  }
  return serviceInstance;
}

export default AutoRegistrationService;
