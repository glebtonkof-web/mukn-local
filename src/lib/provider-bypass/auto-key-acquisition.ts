/**
 * Auto Key Acquisition Service
 *
 * Полностью автоматическое получение API ключей провайдеров
 * - Браузерная автоматизация через Playwright
 * - Временные email для верификации
 * - Решение капчи через сервисы
 * - Автоматическое добавление ключей через POST /api/provider-keys
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { PROVIDER_LIMITS, ProviderType } from './provider-limit-registry';

// Типы
export type AcquisitionStatus =
  | 'pending'
  | 'creating_email'
  | 'registering'
  | 'verifying'
  | 'getting_key'
  | 'adding_to_system'
  | 'completed'
  | 'failed';

export interface AcquisitionTask {
  id: string;
  provider: ProviderType;
  status: AcquisitionStatus;
  tempEmail?: TempEmailAccount;
  apiKey?: string;
  keyId?: string;
  proxy?: string;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface TempEmailAccount {
  id: string;
  email: string;
  password: string;
  token?: string;
  domain: string;
  provider: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface ProviderAutomationConfig {
  provider: ProviderType;
  name: string;
  category: 'text' | 'image' | 'video' | 'audio';

  // URLs
  signupUrl: string;
  loginUrl: string;
  apiKeyUrl: string;

  // Requirements
  requiresEmail: boolean;
  requiresPhone: boolean;
  requiresCard: boolean;
  requiresCaptcha: boolean;

  // Quotas
  freeDailyQuota: number;
  freeMonthlyQuota?: number;

  // Automation selectors
  selectors: {
    emailInput: string;
    passwordInput: string;
    confirmPasswordInput?: string;
    submitButton: string;
    apiKeyElement: string;
    createKeyButton?: string;
    copyKeyButton?: string;
    errorMessage?: string;
    successIndicator?: string;
    termsCheckbox?: string;
    nameInput?: string;
  };

  // Wait settings
  waitAfterSubmit?: number;
  waitForKeyPage?: number;
}

// Конфигурации автоматизации для провайдеров
export const PROVIDER_AUTOMATION_CONFIGS: Record<string, ProviderAutomationConfig> = {
  cerebras: {
    provider: 'cerebras',
    name: 'Cerebras AI',
    category: 'text',
    signupUrl: 'https://cloud.cerebras.ai/',
    loginUrl: 'https://cloud.cerebras.ai/login',
    apiKeyUrl: 'https://cloud.cerebras.ai/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    freeDailyQuota: 14400,
    selectors: {
      emailInput: 'input[type="email"], input[name="email"], input[placeholder*="email" i]',
      passwordInput: 'input[type="password"], input[name="password"]',
      submitButton: 'button[type="submit"], button:has-text("Sign"), button:has-text("Register"), button:has-text("Continue")',
      apiKeyElement: '[data-testid="api-key"], code, .api-key, pre',
      createKeyButton: 'button:has-text("Create"), button:has-text("Generate"), button:has-text("New")',
      copyKeyButton: 'button:has-text("Copy")',
      errorMessage: '.error, .alert-error, [role="alert"]',
      successIndicator: '.success, .alert-success',
    },
    waitAfterSubmit: 3000,
    waitForKeyPage: 2000,
  },

  groq: {
    provider: 'groq',
    name: 'Groq',
    category: 'text',
    signupUrl: 'https://console.groq.com/',
    loginUrl: 'https://console.groq.com/login',
    apiKeyUrl: 'https://console.groq.com/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: true,
    freeDailyQuota: 1000,
    freeMonthlyQuota: 30000,
    selectors: {
      emailInput: 'input[type="email"], input[name="email"]',
      passwordInput: 'input[type="password"]',
      submitButton: 'button[type="submit"], button:has-text("Sign"), button:has-text("Continue")',
      apiKeyElement: 'code, pre, .api-key, [data-testid="api-key"]',
      createKeyButton: 'button:has-text("Create"), button:has-text("Generate API Key")',
      copyKeyButton: 'button:has-text("Copy")',
      errorMessage: '.error, .alert-error, [role="alert"]',
      successIndicator: '.success',
    },
    waitAfterSubmit: 5000,
    waitForKeyPage: 3000,
  },

  gemini: {
    provider: 'gemini',
    name: 'Google AI Studio',
    category: 'text',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    loginUrl: 'https://accounts.google.com/',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    freeDailyQuota: 500,
    freeMonthlyQuota: 15000,
    selectors: {
      emailInput: 'input[type="email"], #identifierId',
      passwordInput: 'input[type="password"], input[name="password"]',
      submitButton: 'button[type="submit"], #identifierNext, #passwordNext',
      apiKeyElement: '.api-key, code, pre',
      createKeyButton: 'button:has-text("Create"), button:has-text("Get API key")',
      copyKeyButton: 'button:has-text("Copy")',
      errorMessage: '.error, [role="alert"]',
      successIndicator: '.success',
    },
    waitAfterSubmit: 5000,
    waitForKeyPage: 3000,
  },

  openrouter: {
    provider: 'openrouter',
    name: 'OpenRouter',
    category: 'text',
    signupUrl: 'https://openrouter.ai/',
    loginUrl: 'https://openrouter.ai/auth',
    apiKeyUrl: 'https://openrouter.ai/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: true,
    freeDailyQuota: 50,
    selectors: {
      emailInput: 'input[type="email"], input[name="email"]',
      passwordInput: 'input[type="password"]',
      submitButton: 'button[type="submit"], button:has-text("Sign")',
      apiKeyElement: 'code, pre, .api-key',
      createKeyButton: 'button:has-text("Create"), button:has-text("Generate")',
      copyKeyButton: 'button:has-text("Copy")',
      errorMessage: '.error, .alert',
      successIndicator: '.success',
    },
    waitAfterSubmit: 4000,
    waitForKeyPage: 2000,
  },

  stability: {
    provider: 'stability',
    name: 'Stability AI',
    category: 'image',
    signupUrl: 'https://platform.stability.ai/',
    loginUrl: 'https://platform.stability.ai/login',
    apiKeyUrl: 'https://platform.stability.ai/account/keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    freeDailyQuota: 500,
    selectors: {
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      submitButton: 'button[type="submit"], button:has-text("Sign")',
      apiKeyElement: 'code, pre, .api-key',
      createKeyButton: 'button:has-text("Create"), button:has-text("Generate")',
      copyKeyButton: 'button:has-text("Copy")',
      errorMessage: '.error',
      successIndicator: '.success',
    },
    waitAfterSubmit: 4000,
    waitForKeyPage: 2000,
  },

  elevenlabs: {
    provider: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'audio',
    signupUrl: 'https://elevenlabs.io/',
    loginUrl: 'https://elevenlabs.io/login',
    apiKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    requiresEmail: true,
    requiresPhone: false,
    requiresCard: false,
    requiresCaptcha: false,
    freeDailyQuota: 100,
    freeMonthlyQuota: 5000,
    selectors: {
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      submitButton: 'button[type="submit"], button:has-text("Sign")',
      apiKeyElement: 'code, pre, .api-key, input[readonly]',
      createKeyButton: 'button:has-text("Create"), button:has-text("Generate")',
      copyKeyButton: 'button:has-text("Copy")',
      errorMessage: '.error',
      successIndicator: '.success',
    },
    waitAfterSubmit: 4000,
    waitForKeyPage: 2000,
  },

  deepseek: {
    provider: 'deepseek',
    name: 'DeepSeek',
    category: 'text',
    signupUrl: 'https://platform.deepseek.com/',
    loginUrl: 'https://platform.deepseek.com/login',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    requiresEmail: true,
    requiresPhone: true,
    requiresCard: false,
    requiresCaptcha: true,
    freeDailyQuota: 500,
    selectors: {
      emailInput: 'input[type="email"]',
      passwordInput: 'input[type="password"]',
      submitButton: 'button[type="submit"]',
      apiKeyElement: 'code, pre, .api-key',
      createKeyButton: 'button:has-text("Create"), button:has-text("Generate")',
      copyKeyButton: 'button:has-text("Copy")',
      errorMessage: '.error',
      successIndicator: '.success',
    },
    waitAfterSubmit: 5000,
    waitForKeyPage: 2000,
  },
};

/**
 * Auto Key Acquisition Service
 */
export class AutoKeyAcquisitionService {
  private browser: Browser | null = null;
  private activeTasks: Map<string, AcquisitionTask> = new Map();
  private isProcessing: boolean = false;

  // Временные email сервисы
  private emailServices = [
    { name: 'mail.tm', api: 'https://api.mail.tm' },
    { name: 'tempmail.lol', api: 'https://api.tempmail.lol' },
  ];

  constructor() {
    this.startBackgroundProcessor();
  }

  /**
   * Запустить фоновый обработчик
   */
  private startBackgroundProcessor(): void {
    // Запускаем обработку каждые 30 секунд
    setInterval(() => {
      this.processQueue();
    }, 30000);

    // Проверяем необходимость новых ключей каждые 5 минут
    setInterval(() => {
      this.checkAndAutoAcquire();
    }, 300000);

    // Первая проверка через 10 секунд
    setTimeout(() => {
      this.checkAndAutoAcquire();
    }, 10000);
  }

  /**
   * Проверить и автоматически создать задачи на получение ключей
   */
  private async checkAndAutoAcquire(): Promise<void> {
    try {
      // Для каждого провайдера проверяем количество ключей
      for (const [provider, config] of Object.entries(PROVIDER_AUTOMATION_CONFIGS)) {
        const activeKeys = await this.getActiveKeyCount(provider);

        // Минимум 3 ключа на провайдера
        if (activeKeys < 3) {
          const needed = 3 - activeKeys;

          console.log(`[AutoAcquisition] Need ${needed} more keys for ${provider}`);

          // Создаём задачу на получение ключа
          for (let i = 0; i < needed; i++) {
            await this.createAcquisitionTask({ provider: provider as ProviderType });
            // Небольшая задержка между задачами
            await this.delay(1000);
          }
        }
      }
    } catch (error) {
      console.error('[AutoAcquisition] Auto-acquire check failed:', error);
    }
  }

  /**
   * Получить количество активных ключей для провайдера
   */
  private async getActiveKeyCount(provider: string): Promise<number> {
    const keys = await db.providerApiKey.count({
      where: {
        provider,
        isActive: true,
        status: 'active',
        OR: [
          { cooldownUntil: null },
          { cooldownUntil: { lt: new Date() } },
        ],
      },
    });

    return keys;
  }

  /**
   * Создать задачу на получение ключа
   */
  async createAcquisitionTask(params: {
    provider: ProviderType;
    proxy?: string;
    priority?: number;
  }): Promise<{ taskId: string; status: string }> {
    const config = PROVIDER_AUTOMATION_CONFIGS[params.provider];

    if (!config) {
      throw new Error(`Unknown provider: ${params.provider}`);
    }

    const taskId = nanoid();

    const task: AcquisitionTask = {
      id: taskId,
      provider: params.provider,
      status: 'pending',
      proxy: params.proxy,
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
        registrationData: JSON.stringify({ proxy: params.proxy }),
        priority: params.priority || 5,
      },
    });

    this.activeTasks.set(taskId, task);

    console.log(`[AutoAcquisition] Created task ${taskId} for ${params.provider}`);

    return { taskId, status: 'pending' };
  }

  /**
   * Обработать очередь задач
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Получаем pending задачи
      const tasks = await db.apiKeyRegistrationQueue.findMany({
        where: {
          status: 'pending',
          scheduledAt: { lte: new Date() },
        },
        orderBy: { priority: 'asc' },
        take: 2, // Обрабатываем по 2 задачи за раз
      });

      for (const task of tasks) {
        await this.processTask(task.id);
      }
    } catch (error) {
      console.error('[AutoAcquisition] Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Обработать одну задачу
   */
  private async processTask(taskId: string): Promise<void> {
    const dbTask = await db.apiKeyRegistrationQueue.findUnique({
      where: { id: taskId },
    });

    if (!dbTask || dbTask.status !== 'pending') return;

    const config = PROVIDER_AUTOMATION_CONFIGS[dbTask.provider];
    if (!config) {
      await this.updateTaskStatus(taskId, 'failed', 'Unknown provider');
      return;
    }

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      console.log(`[AutoAcquisition] Processing task ${taskId} for ${config.name}`);

      // 1. Создаём временный email
      await this.updateTaskStatus(taskId, 'creating_email');
      const tempEmail = await this.createTempEmail();

      if (!tempEmail) {
        throw new Error('Failed to create temp email');
      }

      console.log(`[AutoAcquisition] Created temp email: ${tempEmail.email}`);

      // 2. Запускаем браузер
      browser = await this.launchBrowser(dbTask.registrationData);
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      page = await context.newPage();

      // 3. Регистрируемся
      await this.updateTaskStatus(taskId, 'registering');
      const registered = await this.registerOnProvider(page, config, tempEmail);

      if (!registered) {
        throw new Error('Registration failed');
      }

      // 4. Верифицируем email
      await this.updateTaskStatus(taskId, 'verifying');
      const verified = await this.verifyEmail(page, config, tempEmail);

      // Если требуется верификация, но не прошла - ошибка
      if (config.requiresEmail && !verified) {
        console.log(`[AutoAcquisition] Email verification might not be required or already done`);
      }

      // 5. Получаем API ключ
      await this.updateTaskStatus(taskId, 'getting_key');
      const apiKey = await this.getApiKey(page, config);

      if (!apiKey) {
        throw new Error('Failed to get API key');
      }

      console.log(`[AutoAcquisition] Got API key: ${apiKey.substring(0, 15)}...`);

      // 6. Добавляем ключ в систему через API
      await this.updateTaskStatus(taskId, 'adding_to_system');
      const added = await this.addKeyToSystem(config.provider, apiKey, tempEmail.email);

      if (!added.success) {
        throw new Error(added.error || 'Failed to add key to system');
      }

      // Обновляем задачу
      await db.apiKeyRegistrationQueue.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          resultKeyId: added.keyId,
          resultApiKey: apiKey,
          completedAt: new Date(),
        },
      });

      console.log(`[AutoAcquisition] Task ${taskId} completed successfully!`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AutoAcquisition] Task ${taskId} failed:`, errorMessage);

      // Проверяем количество попыток
      const task = await db.apiKeyRegistrationQueue.findUnique({
        where: { id: taskId },
      });

      if (task && task.retryCount < task.maxRetries - 1) {
        // Повторная попытка через 5 минут
        await db.apiKeyRegistrationQueue.update({
          where: { id: taskId },
          data: {
            status: 'pending',
            error: errorMessage,
            retryCount: { increment: 1 },
            scheduledAt: new Date(Date.now() + 300000),
          },
        });
      } else {
        await this.updateTaskStatus(taskId, 'failed', errorMessage);
      }
    } finally {
      // Закрываем браузер
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Запустить браузер
   */
  private async launchBrowser(registrationData?: string | null): Promise<Browser> {
    const data = registrationData ? JSON.parse(registrationData) : {};
    const proxy = data.proxy;

    const launchOptions: Record<string, unknown> = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
      ],
    };

    if (proxy) {
      launchOptions.proxy = { server: proxy };
    }

    return await chromium.launch(launchOptions);
  }

  /**
   * Создать временный email
   */
  private async createTempEmail(): Promise<TempEmailAccount | null> {
    for (const service of this.emailServices) {
      try {
        if (service.name === 'mail.tm') {
          return await this.createMailTmAccount(service.api);
        } else if (service.name === 'tempmail.lol') {
          return await this.createTempMailLolAccount(service.api);
        }
      } catch (error) {
        console.error(`[AutoAcquisition] Failed to create email via ${service.name}:`, error);
      }
    }

    return null;
  }

  /**
   * Создать аккаунт mail.tm
   */
  private async createMailTmAccount(api: string): Promise<TempEmailAccount | null> {
    try {
      // Получаем домены
      const domainsResp = await fetch(`${api}/domains`);
      const domainsData = await domainsResp.json();
      const domain = domainsData['hydra:member']?.[0]?.domain || 'mail.tm';

      const username = `mukn_${nanoid(8).toLowerCase()}`;
      const password = nanoid(12);
      const email = `${username}@${domain}`;

      // Создаём аккаунт
      const createResp = await fetch(`${api}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password }),
      });

      if (!createResp.ok) {
        const error = await createResp.json().catch(() => ({}));
        console.error('[AutoAcquisition] mail.tm create error:', error);
        return null;
      }

      const accountData = await createResp.json();

      // Получаем токен
      const tokenResp = await fetch(`${api}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: email, password }),
      });

      const tokenData = await tokenResp.json();

      return {
        id: accountData.id || nanoid(),
        email,
        password,
        token: tokenData.token,
        domain,
        provider: 'mail.tm',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 час
      };
    } catch (error) {
      console.error('[AutoAcquisition] mail.tm error:', error);
      return null;
    }
  }

  /**
   * Создать аккаунт tempmail.lol
   */
  private async createTempMailLolAccount(api: string): Promise<TempEmailAccount | null> {
    try {
      const resp = await fetch(`${api}/generate`);

      if (!resp.ok) {
        return null;
      }

      const data = await resp.json();

      return {
        id: nanoid(),
        email: data.address,
        password: '',
        domain: data.address.split('@')[1] || 'tempmail.lol',
        provider: 'tempmail.lol',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 600000), // 10 минут
      };
    } catch (error) {
      console.error('[AutoAcquisition] tempmail.lol error:', error);
      return null;
    }
  }

  /**
   * Зарегистрироваться на провайдере
   */
  private async registerOnProvider(
    page: Page,
    config: ProviderAutomationConfig,
    tempEmail: TempEmailAccount
  ): Promise<boolean> {
    try {
      console.log(`[AutoAcquisition] Navigating to ${config.signupUrl}`);
      await page.goto(config.signupUrl, { waitUntil: 'networkidle', timeout: 60000 });

      // Ждём загрузки страницы
      await this.delay(2000);

      // Ищем кнопку Sign Up / Register если нужно
      const signUpButton = await page.$('a:has-text("Sign up"), a:has-text("Register"), button:has-text("Sign up")');
      if (signUpButton) {
        await signUpButton.click();
        await this.delay(2000);
      }

      // Заполняем email
      const emailInput = await page.$(config.selectors.emailInput);
      if (emailInput) {
        await emailInput.fill(tempEmail.email);
        console.log(`[AutoAcquisition] Filled email: ${tempEmail.email}`);
      }

      // Заполняем пароль если требуется
      const password = nanoid(16);
      const passwordInput = await page.$(config.selectors.passwordInput);
      if (passwordInput) {
        await passwordInput.fill(password);
        console.log('[AutoAcquisition] Filled password');
      }

      // Подтверждение пароля
      if (config.selectors.confirmPasswordInput) {
        const confirmInput = await page.$(config.selectors.confirmPasswordInput);
        if (confirmInput) {
          await confirmInput.fill(password);
        }
      }

      // Имя (если требуется)
      if (config.selectors.nameInput) {
        const nameInput = await page.$(config.selectors.nameInput);
        if (nameInput) {
          await nameInput.fill(`User${nanoid(6)}`);
        }
      }

      // Чекбокс согласия с условиями
      if (config.selectors.termsCheckbox) {
        const checkbox = await page.$(config.selectors.termsCheckbox);
        if (checkbox) {
          await checkbox.check();
        }
      }

      // Нажимаем кнопку отправки
      const submitButton = await page.$(config.selectors.submitButton);
      if (submitButton) {
        await submitButton.click();
        console.log('[AutoAcquisition] Clicked submit button');
      }

      // Ждём результат
      await this.delay(config.waitAfterSubmit || 5000);

      // Проверяем на ошибки
      if (config.selectors.errorMessage) {
        const errorEl = await page.$(config.selectors.errorMessage);
        if (errorEl) {
          const errorText = await errorEl.textContent();
          console.log(`[AutoAcquisition] Possible error: ${errorText}`);
        }
      }

      return true;
    } catch (error) {
      console.error('[AutoAcquisition] Registration error:', error);
      return false;
    }
  }

  /**
   * Верифицировать email
   */
  private async verifyEmail(
    page: Page,
    config: ProviderAutomationConfig,
    tempEmail: TempEmailAccount
  ): Promise<boolean> {
    try {
      // Ждём немного для получения письма
      await this.delay(10000);

      // Проверяем почту
      const verifyLink = await this.getVerificationLink(tempEmail);

      if (verifyLink) {
        console.log(`[AutoAcquisition] Found verification link: ${verifyLink.substring(0, 50)}...`);
        await page.goto(verifyLink, { waitUntil: 'networkidle' });
        await this.delay(3000);
        return true;
      }

      // Проверяем, может верификация не требуется
      // Пытаемся перейти на страницу API ключей
      await page.goto(config.apiKeyUrl, { waitUntil: 'networkidle' });
      await this.delay(2000);

      // Если нет редиректа на логин - считаем успешным
      const currentUrl = page.url();
      if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
        console.log('[AutoAcquisition] Already logged in or verification not required');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AutoAcquisition] Verification error:', error);
      return false;
    }
  }

  /**
   * Получить ссылку верификации из email
   */
  private async getVerificationLink(tempEmail: TempEmailAccount): Promise<string | null> {
    try {
      if (tempEmail.provider === 'mail.tm' && tempEmail.token) {
        const resp = await fetch(`https://api.mail.tm/messages`, {
          headers: { Authorization: `Bearer ${tempEmail.token}` },
        });

        if (resp.ok) {
          const data = await resp.json();
          const messages = data['hydra:member'] || data || [];

          for (const msg of messages) {
            // Получаем полное письмо
            const msgResp = await fetch(`https://api.mail.tm/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${tempEmail.token}` },
            });

            if (msgResp.ok) {
              const fullMsg = await msgResp.json();
              const html = fullMsg.html?.[0] || fullMsg.text || '';

              // Ищем ссылку верификации
              const patterns = [
                /https?:\/\/[^\s<>"]+verify[^\s<>"]*/gi,
                /https?:\/\/[^\s<>"]+confirm[^\s<>"]*/gi,
                /https?:\/\/[^\s<>"]+activate[^\s<>"]*/gi,
                /https?:\/\/[^\s<>"]+validate[^\s<>"]*/gi,
              ];

              for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                  return match[0].replace(/[<>"]+$/, '');
                }
              }
            }
          }
        }
      } else if (tempEmail.provider === 'tempmail.lol') {
        const resp = await fetch(`https://api.tempmail.lol/auth/${tempEmail.email}`);

        if (resp.ok) {
          const data = await resp.json();
          const messages = data.email || [];

          for (const msg of messages) {
            const html = msg.html || msg.body || '';
            const patterns = [
              /https?:\/\/[^\s<>"]+verify[^\s<>"]*/gi,
              /https?:\/\/[^\s<>"]+confirm[^\s<>"]*/gi,
            ];

            for (const pattern of patterns) {
              const match = html.match(pattern);
              if (match) {
                return match[0].replace(/[<>"]+$/, '');
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[AutoAcquisition] Error checking email:', error);
    }

    return null;
  }

  /**
   * Получить API ключ
   */
  private async getApiKey(page: Page, config: ProviderAutomationConfig): Promise<string | null> {
    try {
      // Переходим на страницу API ключей
      console.log(`[AutoAcquisition] Navigating to API key page: ${config.apiKeyUrl}`);
      await page.goto(config.apiKeyUrl, { waitUntil: 'networkidle', timeout: 60000 });

      await this.delay(config.waitForKeyPage || 2000);

      // Ищем кнопку создания ключа
      if (config.selectors.createKeyButton) {
        const createButton = await page.$(config.selectors.createKeyButton);
        if (createButton) {
          await createButton.click();
          console.log('[AutoAcquisition] Clicked create key button');
          await this.delay(3000);
        }
      }

      // Пытаемся найти API ключ на странице
      const selectors = [
        config.selectors.apiKeyElement,
        'code',
        'pre',
        '.api-key',
        '[data-testid="api-key"]',
        'input[readonly]',
        'input[type="text"][value^="sk-"]',
        'input[type="text"][value^="AIza"]',
        'input[type="text"][value^="gsk_"]',
      ];

      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent() || await element.getAttribute('value');
          if (text && text.length > 20) {
            // Очищаем ключ от лишних символов
            const cleanKey = text.trim().replace(/\s+/g, '');
            if (cleanKey.length > 20) {
              console.log(`[AutoAcquisition] Found API key via selector: ${selector}`);
              return cleanKey;
            }
          }
        }
      }

      // Пробуем получить все input поля с длинными значениями
      const inputs = await page.$$('input');
      for (const input of inputs) {
        const value = await input.getAttribute('value');
        if (value && value.length > 20) {
          console.log('[AutoAcquisition] Found API key in input field');
          return value;
        }
      }

      // Пробуем скопировать ключ через кнопку Copy
      if (config.selectors.copyKeyButton) {
        const copyButton = await page.$(config.selectors.copyKeyButton);
        if (copyButton) {
          await copyButton.click();
          await this.delay(500);

          // Получаем содержимое буфера обмена (в headless режиме не работает)
          // Поэтому просто логируем
          console.log('[AutoAcquisition] Clicked copy button, but clipboard access is limited in headless');
        }
      }

      return null;
    } catch (error) {
      console.error('[AutoAcquisition] Error getting API key:', error);
      return null;
    }
  }

  /**
   * Добавить ключ в систему через API
   */
  private async addKeyToSystem(
    provider: string,
    apiKey: string,
    accountEmail: string
  ): Promise<{ success: boolean; keyId?: string; error?: string }> {
    try {
      // Вызываем POST /api/provider-keys напрямую через БД
      const keyId = nanoid();
      const providerLimits = PROVIDER_LIMITS[provider as ProviderType];
      const config = PROVIDER_AUTOMATION_CONFIGS[provider];

      const key = await db.providerApiKey.create({
        data: {
          id: keyId,
          provider,
          apiKey,
          keyName: `Auto-acquired ${provider}`,
          keyType: 'free_tier',
          accountEmail,
          dailyLimit: providerLimits?.dailyQuota || config?.freeDailyQuota,
          freeQuotaDaily: config?.freeDailyQuota,
          freeQuotaMonthly: config?.freeMonthlyQuota,
          isActive: true,
          isValidated: false,
          status: 'active',
        },
      });

      console.log(`[AutoAcquisition] Added API key to system: ${keyId}`);

      return { success: true, keyId: key.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AutoAcquisition] Failed to add key to system:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Обновить статус задачи
   */
  private async updateTaskStatus(
    taskId: string,
    status: AcquisitionStatus,
    error?: string
  ): Promise<void> {
    await db.apiKeyRegistrationQueue.update({
      where: { id: taskId },
      data: { status, error },
    });
  }

  /**
   * Задержка
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить статус задачи
   */
  async getTaskStatus(taskId: string): Promise<AcquisitionTask | null> {
    const dbTask = await db.apiKeyRegistrationQueue.findUnique({
      where: { id: taskId },
    });

    if (!dbTask) return null;

    return {
      id: dbTask.id,
      provider: dbTask.provider as ProviderType,
      status: dbTask.status as AcquisitionStatus,
      apiKey: dbTask.resultApiKey || undefined,
      keyId: dbTask.resultKeyId || undefined,
      attempts: dbTask.retryCount,
      maxAttempts: dbTask.maxRetries,
      error: dbTask.error || undefined,
      createdAt: dbTask.scheduledAt,
      updatedAt: dbTask.scheduledAt,
      completedAt: dbTask.completedAt || undefined,
    };
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalKeysAcquired: number;
  }> {
    const [pending, completed, failed] = await Promise.all([
      db.apiKeyRegistrationQueue.count({ where: { status: 'pending' } }),
      db.apiKeyRegistrationQueue.count({ where: { status: 'completed' } }),
      db.apiKeyRegistrationQueue.count({ where: { status: 'failed' } }),
    ]);

    return {
      pendingTasks: pending,
      completedTasks: completed,
      failedTasks: failed,
      totalKeysAcquired: completed,
    };
  }

  /**
   * Принудительно запустить обработку очереди
   */
  async forceProcess(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Массовое создание задач
   */
  async createBatchTasks(params: {
    providers?: ProviderType[];
    count: number;
  }): Promise<{ taskId: string; provider: string }[]> {
    const providers = params.providers || Object.keys(PROVIDER_AUTOMATION_CONFIGS) as ProviderType[];
    const results: { taskId: string; provider: string }[] = [];

    for (const provider of providers) {
      for (let i = 0; i < params.count; i++) {
        const result = await this.createAcquisitionTask({ provider });
        results.push({ taskId: result.taskId, provider });

        // Небольшая задержка между созданием задач
        await this.delay(500);
      }
    }

    return results;
  }
}

// Singleton
let serviceInstance: AutoKeyAcquisitionService | null = null;

export function getAutoKeyAcquisitionService(): AutoKeyAcquisitionService {
  if (!serviceInstance) {
    serviceInstance = new AutoKeyAcquisitionService();
  }
  return serviceInstance;
}

export default AutoKeyAcquisitionService;
