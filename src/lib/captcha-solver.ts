/**
 * Captcha Solver Service
 * 
 * Интеграция с сервисами решения капчи:
 * - 2Captcha (2captcha.com)
 * - SolveCaptcha (solvecaptcha.com)
 * - Anti-Captcha (anti-captcha.com)
 * - CapMonster Cloud
 * 
 * Поддерживаемые типы капчи:
 * - reCAPTCHA v2/v3
 * - hCaptcha
 * - FunCaptcha
 * - Image CAPTCHA
 * - Turnstile (Cloudflare)
 */

export interface CaptchaSolverConfig {
  provider: '2captcha' | 'solvecaptcha' | 'anticaptcha' | 'capmonster';
  apiKey: string;
  timeout?: number; // ms, default 120000 (2 min)
  pollingInterval?: number; // ms, default 3000
}

export interface CaptchaTask {
  taskId: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  solution?: string;
  error?: string;
}

export interface RecaptchaV2Task {
  type: 'recaptcha_v2';
  siteKey: string;
  pageUrl: string;
  invisible?: boolean;
}

export interface RecaptchaV3Task {
  type: 'recaptcha_v3';
  siteKey: string;
  pageUrl: string;
  minScore?: number; // 0.1 - 0.9
  action?: string;
}

export interface HCaptchaTask {
  type: 'hcaptcha';
  siteKey: string;
  pageUrl: string;
  invisible?: boolean;
}

export interface FunCaptchaTask {
  type: 'funcaptcha';
  publicKey: string;
  pageUrl: string;
  serviceUrl?: string;
}

export interface TurnstileTask {
  type: 'turnstile';
  siteKey: string;
  pageUrl: string;
  action?: string;
  data?: string;
}

export interface ImageCaptchaTask {
  type: 'image';
  imageBase64: string;
}

export type CaptchaTaskType = RecaptchaV2Task | RecaptchaV3Task | HCaptchaTask | FunCaptchaTask | TurnstileTask | ImageCaptchaTask;

// API endpoints
const API_ENDPOINTS = {
  '2captcha': 'https://2captcha.com',
  'solvecaptcha': 'https://solvecaptcha.com',
  'anticaptcha': 'https://api.anti-captcha.com',
  'capmonster': 'https://api.capmonster.cloud'
};

export class CaptchaSolver {
  private config: Required<CaptchaSolverConfig>;
  private baseUrl: string;

  constructor(config: CaptchaSolverConfig) {
    this.config = {
      timeout: 120000,
      pollingInterval: 3000,
      ...config
    };
    this.baseUrl = API_ENDPOINTS[config.provider];
  }

  /**
   * Решить капчу
   */
  async solve(task: CaptchaTaskType): Promise<string> {
    console.log(`🔐 [Captcha] Начинаем решение ${task.type}...`);
    
    const startTime = Date.now();
    
    try {
      // Создаём задачу
      const taskId = await this.createTask(task);
      console.log(`🔐 [Captcha] Задача создана: ${taskId}`);
      
      // Ждём решения
      const solution = await this.waitForSolution(taskId, startTime);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [Captcha] Решено за ${elapsed}ms`);
      
      return solution;
    } catch (error: any) {
      console.error(`❌ [Captcha] Ошибка: ${error.message}`);
      throw error;
    }
  }

  /**
   * Создать задачу на решение
   */
  private async createTask(task: CaptchaTaskType): Promise<string> {
    switch (this.config.provider) {
      case '2captcha':
      case 'solvecaptcha':
        return this.create2CaptchaTask(task);
      case 'anticaptcha':
        return this.createAntiCaptchaTask(task);
      case 'capmonster':
        return this.createCapmonsterTask(task);
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  /**
   * 2Captcha / SolveCaptcha API
   */
  private async create2CaptchaTask(task: CaptchaTaskType): Promise<string> {
    const params: Record<string, string> = {
      key: this.config.apiKey,
      json: '1'
    };

    switch (task.type) {
      case 'recaptcha_v2':
        params.method = 'userrecaptcha';
        params.googlekey = task.siteKey;
        params.pageurl = task.pageUrl;
        if (task.invisible) params.invisible = '1';
        break;

      case 'recaptcha_v3':
        params.method = 'userrecaptcha';
        params.googlekey = task.siteKey;
        params.pageurl = task.pageUrl;
        params.version = 'v3';
        if (task.minScore) params.min_score = task.minScore.toString();
        if (task.action) params.action = task.action;
        break;

      case 'hcaptcha':
        params.method = 'hcaptcha';
        params.sitekey = task.siteKey;
        params.pageurl = task.pageUrl;
        break;

      case 'funcaptcha':
        params.method = 'funcaptcha';
        params.publickey = task.publicKey;
        params.pageurl = task.pageUrl;
        if (task.serviceUrl) params.surl = task.serviceUrl;
        break;

      case 'turnstile':
        params.method = 'turnstile';
        params.sitekey = task.siteKey;
        params.pageurl = task.pageUrl;
        if (task.action) params.action = task.action;
        if (task.data) params.data = task.data;
        break;

      case 'image':
        params.method = 'base64';
        params.body = task.imageBase64;
        break;
    }

    const response = await fetch(`${this.baseUrl}/in.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString()
    });

    const data = await response.json();
    
    if (data.status !== 1) {
      throw new Error(`2Captcha error: ${data.request || 'Unknown error'}`);
    }

    return data.request;
  }

  /**
   * Anti-Captcha API
   */
  private async createAntiCaptchaTask(task: CaptchaTaskType): Promise<string> {
    let taskData: any = {};

    switch (task.type) {
      case 'recaptcha_v2':
        taskData = {
          type: 'NoCaptchaTaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey
        };
        break;

      case 'recaptcha_v3':
        taskData = {
          type: 'RecaptchaV3TaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey,
          minScore: task.minScore || 0.3,
          pageAction: task.action
        };
        break;

      case 'hcaptcha':
        taskData = {
          type: 'HCaptchaTaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey
        };
        break;

      case 'funcaptcha':
        taskData = {
          type: 'FunCaptchaTaskProxyless',
          websiteURL: task.pageUrl,
          websitePublicKey: task.publicKey
        };
        break;

      case 'turnstile':
        taskData = {
          type: 'TurnstileTaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey,
          action: task.action,
          data: task.data
        };
        break;

      case 'image':
        taskData = {
          type: 'ImageToTextTask',
          body: task.imageBase64
        };
        break;
    }

    const response = await fetch(`${this.baseUrl}/createTask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: this.config.apiKey,
        task: taskData
      })
    });

    const data = await response.json();

    if (data.errorId !== 0) {
      throw new Error(`Anti-Captcha error: ${data.errorDescription || 'Unknown error'}`);
    }

    return data.taskId.toString();
  }

  /**
   * CapMonster Cloud API
   */
  private async createCapmonsterTask(task: CaptchaTaskType): Promise<string> {
    // CapMonster использует тот же API что и Anti-Captcha
    return this.createAntiCaptchaTask(task);
  }

  /**
   * Ожидание решения
   */
  private async waitForSolution(taskId: string, startTime: number): Promise<string> {
    while (Date.now() - startTime < this.config.timeout) {
      await this.sleep(this.config.pollingInterval);

      try {
        const result = await this.getTaskResult(taskId);
        
        if (result.status === 'ready') {
          return result.solution!;
        }
        
        if (result.status === 'error') {
          throw new Error(result.error || 'Task failed');
        }
      } catch (error: any) {
        // Продолжаем опрос если это не фатальная ошибка
        if (error.message.includes('CAPCHA_NOT_READY')) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Timeout waiting for captcha solution');
  }

  /**
   * Получить результат задачи
   */
  private async getTaskResult(taskId: string): Promise<CaptchaTask> {
    switch (this.config.provider) {
      case '2captcha':
      case 'solvecaptcha':
        return this.get2CaptchaResult(taskId);
      case 'anticaptcha':
      case 'capmonster':
        return this.getAntiCaptchaResult(taskId);
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  /**
   * Получить результат от 2Captcha
   */
  private async get2CaptchaResult(taskId: string): Promise<CaptchaTask> {
    const response = await fetch(
      `${this.baseUrl}/res.php?key=${this.config.apiKey}&action=get&id=${taskId}&json=1`
    );

    const data = await response.json();

    if (data.status === 1) {
      return {
        taskId,
        status: 'ready',
        solution: data.request
      };
    }

    if (data.request === 'CAPCHA_NOT_READY') {
      return {
        taskId,
        status: 'processing'
      };
    }

    return {
      taskId,
      status: 'error',
      error: data.request
    };
  }

  /**
   * Получить результат от Anti-Captcha
   */
  private async getAntiCaptchaResult(taskId: string): Promise<CaptchaTask> {
    const response = await fetch(`${this.baseUrl}/getTaskResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: this.config.apiKey,
        taskId: parseInt(taskId)
      })
    });

    const data = await response.json();

    if (data.errorId !== 0) {
      return {
        taskId,
        status: 'error',
        error: data.errorDescription
      };
    }

    if (data.status === 'ready') {
      return {
        taskId,
        status: 'ready',
        solution: data.solution.text || data.solution.gRecaptchaResponse
      };
    }

    return {
      taskId,
      status: 'processing'
    };
  }

  /**
   * Получить баланс
   */
  async getBalance(): Promise<number> {
    switch (this.config.provider) {
      case '2captcha':
      case 'solvecaptcha':
        const response1 = await fetch(
          `${this.baseUrl}/res.php?key=${this.config.apiKey}&action=getbalance&json=1`
        );
        const data1 = await response1.json();
        return parseFloat(data1.request || 0);

      case 'anticaptcha':
      case 'capmonster':
        const response2 = await fetch(`${this.baseUrl}/getBalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientKey: this.config.apiKey })
        });
        const data2 = await response2.json();
        return data2.balance || 0;

      default:
        return 0;
    }
  }

  /**
   * Сообщить о неверном решении (для возврата средств)
   */
  async reportIncorrect(taskId: string): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case '2captcha':
        case 'solvecaptcha':
          const response = await fetch(
            `${this.baseUrl}/res.php?key=${this.config.apiKey}&action=reportbad&id=${taskId}&json=1`
          );
          const data = await response.json();
          return data.status === 1;

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton экземпляр
let captchaSolverInstance: CaptchaSolver | null = null;

/**
 * Инициализировать solver
 */
export function initCaptchaSolver(config: CaptchaSolverConfig): CaptchaSolver {
  captchaSolverInstance = new CaptchaSolver(config);
  return captchaSolverInstance;
}

/**
 * Получить solver
 */
export function getCaptchaSolver(): CaptchaSolver | null {
  return captchaSolverInstance;
}

/**
 * Быстрое решение reCAPTCHA v2
 */
export async function solveRecaptchaV2(
  siteKey: string,
  pageUrl: string,
  options?: { invisible?: boolean }
): Promise<string> {
  if (!captchaSolverInstance) {
    throw new Error('Captcha solver not initialized. Call initCaptchaSolver first.');
  }

  return captchaSolverInstance.solve({
    type: 'recaptcha_v2',
    siteKey,
    pageUrl,
    invisible: options?.invisible
  });
}

/**
 * Быстрое решение hCaptcha
 */
export async function solveHCaptcha(
  siteKey: string,
  pageUrl: string
): Promise<string> {
  if (!captchaSolverInstance) {
    throw new Error('Captcha solver not initialized. Call initCaptchaSolver first.');
  }

  return captchaSolverInstance.solve({
    type: 'hcaptcha',
    siteKey,
    pageUrl
  });
}

/**
 * Быстрое решение Cloudflare Turnstile
 */
export async function solveTurnstile(
  siteKey: string,
  pageUrl: string,
  options?: { action?: string; data?: string }
): Promise<string> {
  if (!captchaSolverInstance) {
    throw new Error('Captcha solver not initialized. Call initCaptchaSolver first.');
  }

  return captchaSolverInstance.solve({
    type: 'turnstile',
    siteKey,
    pageUrl,
    action: options?.action,
    data: options?.data
  });
}

/**
 * Быстрое решение FunCaptcha
 */
export async function solveFunCaptcha(
  publicKey: string,
  pageUrl: string,
  serviceUrl?: string
): Promise<string> {
  if (!captchaSolverInstance) {
    throw new Error('Captcha solver not initialized. Call initCaptchaSolver first.');
  }

  return captchaSolverInstance.solve({
    type: 'funcaptcha',
    publicKey,
    pageUrl,
    serviceUrl
  });
}
