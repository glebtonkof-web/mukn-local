// AI Sandbox - Изоляция и санитизация AI-запросов
// Защита от prompt injection, ограничение времени выполнения

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface SandboxConfig {
  maxPromptLength: number;
  maxResponseLength: number;
  executionTimeout: number; // ms
  enableSanitization: boolean;
  enableInjectionDetection: boolean;
  blockedPatterns: string[];
  allowedCommands: string[];
}

export interface SanitizationResult {
  original: string;
  sanitized: string;
  wasModified: boolean;
  detectedIssues: string[];
}

export interface SandboxExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
  executionTime: number;
  sanitizedPrompt?: string;
  warnings: string[];
}

// ==================== КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ ====================

const DEFAULT_CONFIG: SandboxConfig = {
  maxPromptLength: 10000,
  maxResponseLength: 50000,
  executionTimeout: 30000, // 30 секунд
  enableSanitization: true,
  enableInjectionDetection: true,
  blockedPatterns: [
    // Prompt injection patterns
    'ignore previous instructions',
    'ignore all previous',
    'disregard all',
    'forget everything',
    'system prompt',
    'you are now',
    'new instructions',
    'override instructions',
    'jailbreak',
    'dan mode',
    'developer mode',
    'sudo mode',
    // Code execution attempts
    'execute(',
    'eval(',
    'function(',
    'setTimeout(',
    'setInterval(',
    'process.exit',
    'require(',
    'import ',
    // File system access
    'fs.',
    'readFile',
    'writeFile',
    'deleteFile',
    'rm -rf',
    'chmod',
    // Network access
    'fetch(',
    'axios.',
    'http://',
    'https://',
    'websocket',
    // Database access
    'DROP TABLE',
    'DELETE FROM',
    'TRUNCATE',
    'INSERT INTO',
    'UPDATE SET',
  ],
  allowedCommands: [
    'generate',
    'analyze',
    'translate',
    'summarize',
    'explain',
    'improve',
    'rewrite',
  ],
};

// ==================== AI SANDBOX CLASS ====================

class AISandboxService extends EventEmitter {
  private config: SandboxConfig;
  private executionCount: number = 0;
  private blockedCount: number = 0;
  private totalExecutionTime: number = 0;

  constructor(config: Partial<SandboxConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Безопасное выполнение AI-запроса
  async safeAsk(
    prompt: string,
    executor: (sanitizedPrompt: string) => Promise<string>
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    this.executionCount++;

    try {
      // 1. Проверка длины промпта
      if (prompt.length > this.config.maxPromptLength) {
        return {
          success: false,
          error: `Prompt too long: ${prompt.length} > ${this.config.maxPromptLength}`,
          executionTime: Date.now() - startTime,
          warnings: ['PROMPT_TOO_LONG'],
        };
      }

      // 2. Санитизация промпта
      let sanitizedPrompt = prompt;
      if (this.config.enableSanitization) {
        const sanitization = this.sanitize(prompt);
        sanitizedPrompt = sanitization.sanitized;
        
        if (sanitization.wasModified) {
          warnings.push(...sanitization.detectedIssues);
          this.emit('sanitization', { original: prompt, sanitized: sanitizedPrompt, issues: sanitization.detectedIssues });
        }
      }

      // 3. Проверка на инъекции
      if (this.config.enableInjectionDetection) {
        const injectionResult = this.detectInjection(sanitizedPrompt);
        if (injectionResult.detected) {
          this.blockedCount++;
          this.emit('injection:blocked', { prompt: sanitizedPrompt, patterns: injectionResult.patterns });
          
          return {
            success: false,
            error: 'Некорректный запрос: обнаружены запрещённые паттерны',
            executionTime: Date.now() - startTime,
            sanitizedPrompt,
            warnings: ['INJECTION_DETECTED', ...injectionResult.patterns],
          };
        }
      }

      // 4. Выполнение с таймаутом
      const response = await this.executeWithTimeout(
        executor(sanitizedPrompt),
        this.config.executionTimeout
      );

      // 5. Проверка длины ответа
      if (response.length > this.config.maxResponseLength) {
        warnings.push('RESPONSE_TRUNCATED');
        const truncated = response.substring(0, this.config.maxResponseLength);
        
        this.totalExecutionTime += Date.now() - startTime;
        
        return {
          success: true,
          response: truncated,
          executionTime: Date.now() - startTime,
          sanitizedPrompt,
          warnings,
        };
      }

      this.totalExecutionTime += Date.now() - startTime;
      this.emit('execution:success', { prompt: sanitizedPrompt, responseLength: response.length });

      return {
        success: true,
        response,
        executionTime: Date.now() - startTime,
        sanitizedPrompt,
        warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('timeout')) {
        this.emit('execution:timeout', { prompt });
        return {
          success: false,
          error: 'Превышено время выполнения запроса',
          executionTime: this.config.executionTimeout,
          warnings: ['TIMEOUT'],
        };
      }

      this.emit('execution:error', { prompt, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        warnings,
      };
    }
  }

  // Санитизация промпта
  sanitize(prompt: string): SanitizationResult {
    const detectedIssues: string[] = [];
    let sanitized = prompt;

    // Удаляем управляющие символы
    const controlCharsRemoved = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    if (controlCharsRemoved !== sanitized) {
      detectedIssues.push('CONTROL_CHARS_REMOVED');
      sanitized = controlCharsRemoved;
    }

    // Удаляем потенциально опасные HTML/JS
    const htmlSanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, 'data-blocked=');

    if (htmlSanitized !== sanitized) {
      detectedIssues.push('HTML_JS_REMOVED');
      sanitized = htmlSanitized;
    }

    // Нормализация Unicode
    const normalized = sanitized.normalize('NFC');
    if (normalized !== sanitized) {
      detectedIssues.push('UNICODE_NORMALIZED');
      sanitized = normalized;
    }

    // Экранирование специальных символов для промптов
    const escaped = sanitized
      .replace(/\{\{/g, '\\{\\{')
      .replace(/\}\}/g, '\\}\\}');

    if (escaped !== sanitized) {
      detectedIssues.push('TEMPLATE_CHARS_ESCAPED');
      sanitized = escaped;
    }

    return {
      original: prompt,
      sanitized,
      wasModified: detectedIssues.length > 0,
      detectedIssues,
    };
  }

  // Обнаружение инъекций
  detectInjection(prompt: string): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    for (const pattern of this.config.blockedPatterns) {
      if (lowerPrompt.includes(pattern.toLowerCase())) {
        detectedPatterns.push(pattern);
      }
    }

    // Дополнительные эвристики
    const suspiciousPatterns = [
      /ignore\s+(all\s+)?(previous|above|prior)/i,
      /disregard\s+(all\s+)?(previous|above|prior)/i,
      /forget\s+(everything|all)/i,
      /you\s+are\s+(now|a)\s+\w+/i,
      /new\s+(instructions|rules|guidelines)/i,
      /override\s+(previous|all|default)/i,
      /system:\s*\[/i,
      /\[SYSTEM\]/i,
      /\<\|.*?\|\>/g, // Special tokens
    ];

    for (const regex of suspiciousPatterns) {
      if (regex.test(prompt)) {
        detectedPatterns.push(`regex:${regex.source}`);
      }
    }

    // Проверка на множественные попытки обхода
    const attemptCount = (prompt.match(/ignore|disregard|forget|override/gi) || []).length;
    if (attemptCount >= 3) {
      detectedPatterns.push('MULTIPLE_BYPASS_ATTEMPTS');
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: [...new Set(detectedPatterns)],
    };
  }

  // Выполнение с таймаутом
  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Проверка разрешённой команды
  isCommandAllowed(command: string): boolean {
    return this.config.allowedCommands.some(allowed => 
      command.toLowerCase().includes(allowed.toLowerCase())
    );
  }

  // Добавить заблокированный паттерн
  addBlockedPattern(pattern: string): void {
    if (!this.config.blockedPatterns.includes(pattern)) {
      this.config.blockedPatterns.push(pattern);
      this.emit('pattern:added', { pattern });
    }
  }

  // Удалить заблокированный паттерн
  removeBlockedPattern(pattern: string): void {
    const index = this.config.blockedPatterns.indexOf(pattern);
    if (index > -1) {
      this.config.blockedPatterns.splice(index, 1);
      this.emit('pattern:removed', { pattern });
    }
  }

  // Получить статистику
  getStats(): {
    totalExecutions: number;
    blockedExecutions: number;
    blockRate: number;
    averageExecutionTime: number;
  } {
    return {
      totalExecutions: this.executionCount,
      blockedExecutions: this.blockedCount,
      blockRate: this.executionCount > 0 ? this.blockedCount / this.executionCount : 0,
      averageExecutionTime: this.executionCount > 0 
        ? this.totalExecutionTime / this.executionCount 
        : 0,
    };
  }

  // Получить конфигурацию
  getConfig(): SandboxConfig {
    return { ...this.config };
  }

  // Обновить конфигурацию
  updateConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', { config: this.config });
  }
}

// ==================== SINGLETON ====================

let sandboxInstance: AISandboxService | null = null;

export function getAISandbox(config?: Partial<SandboxConfig>): AISandboxService {
  if (!sandboxInstance) {
    sandboxInstance = new AISandboxService(config);
  }
  return sandboxInstance;
}

export const aiSandbox = {
  safeAsk: (prompt: string, executor: (p: string) => Promise<string>) => 
    getAISandbox().safeAsk(prompt, executor),
  sanitize: (prompt: string) => getAISandbox().sanitize(prompt),
  detectInjection: (prompt: string) => getAISandbox().detectInjection(prompt),
  getStats: () => getAISandbox().getStats(),
  getConfig: () => getAISandbox().getConfig(),
  updateConfig: (config: Partial<SandboxConfig>) => getAISandbox().updateConfig(config),
};
