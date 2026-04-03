// Система логирования для МУКН | Трафик
// Структурированные логи с контекстом и ротацией

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  service?: string;
  requestId?: string;
}

// Хранилище логов в памяти (ограниченное)
const logBuffer: LogEntry[] = [];
const MAX_LOGS = 1000;

// Счётчики для мониторинга
const logCounts = {
  debug: 0,
  info: 0,
  warn: 0,
  error: 0,
  critical: 0,
};

class Logger {
  private service: string;
  private requestId?: string;

  constructor(service: string = 'mukn-traffic') {
    this.service = service;
  }

  setRequestId(id: string): void {
    this.requestId = id;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: this.service,
      requestId: this.requestId,
    };

    // Добавляем в буфер
    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.shift();
    }

    // Обновляем счётчик
    logCounts[level]++;

    // Выводим в консоль с форматированием
    const logLevelColors = {
      debug: '\x1b[36m',  // cyan
      info: '\x1b[32m',   // green
      warn: '\x1b[33m',   // yellow
      error: '\x1b[31m',  // red
      critical: '\x1b[35m', // magenta
    };
    
    const reset = '\x1b[0m';
    const color = logLevelColors[level];
    
    console.log(
      `${color}[${level.toUpperCase()}]${reset} ${entry.timestamp} [${this.service}] ${message}`,
      context ? JSON.stringify(context) : ''
    );
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      service: this.service,
      requestId: this.requestId,
    };

    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.shift();
    }
    logCounts.error++;

    console.error(
      `\x1b[31m[ERROR]\x1b[0m ${entry.timestamp} [${this.service}] ${message}`,
      error ? `\n  Error: ${error.message}\n  Stack: ${error.stack}` : '',
      context ? JSON.stringify(context) : ''
    );
  }

  critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('critical', message, { ...context, error: error?.message });
    
    // Критические ошибки требуют внимания - можно добавить отправку уведомления
    if (process.env.CRITICAL_ALERTS_ENABLED === 'true') {
      // TODO: Интеграция с Telegram ботом для критических уведомлений
      this.sendCriticalAlert(message, error, context);
    }
  }

  private async sendCriticalAlert(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Отправка критического уведомления
      console.log('[ALERT] Critical error occurred:', message);
      // В реальной реализации здесь будет отправка в Telegram/Slack/Email
    } catch (e) {
      console.error('Failed to send critical alert:', e);
    }
  }

  // Методы для логирования действий с аккаунтами
  accountAction(
    accountId: string,
    action: string,
    result: 'success' | 'failed' | 'rate_limited',
    details?: Record<string, unknown>
  ): void {
    this.info(`Account action: ${action}`, {
      accountId,
      action,
      result,
      ...details,
    });
  }

  // Методы для логирования генерации контента
  contentGenerated(
    influencerId: string,
    contentType: string,
    platform: string,
    tokens?: number
  ): void {
    this.info('Content generated', {
      influencerId,
      contentType,
      platform,
      tokens,
    });
  }

  // Методы для логирования API вызовов
  apiCall(
    provider: string,
    endpoint: string,
    duration: number,
    success: boolean
  ): void {
    this.debug('API call', {
      provider,
      endpoint,
      duration: `${duration}ms`,
      success,
    });
  }

  // Логирование изменений риска бана
  banRiskChanged(
    accountId: string,
    oldRisk: number,
    newRisk: number,
    reason: string
  ): void {
    this.warn('Ban risk changed', {
      accountId,
      oldRisk,
      newRisk,
      reason,
    });
  }
}

// Экспортируем singleton instance
export const logger = new Logger();

// Экспортируем функцию для получения логов
export function getLogs(level?: LogLevel, limit = 100): LogEntry[] {
  let filtered = logBuffer;
  
  if (level) {
    filtered = logBuffer.filter(log => log.level === level);
  }
  
  return filtered.slice(-limit);
}

export function getLogStats(): { counts: typeof logCounts; total: number } {
  return {
    counts: { ...logCounts },
    total: logBuffer.length,
  };
}

// Очистка логов
export function clearLogs(): void {
  logBuffer.length = 0;
  Object.keys(logCounts).forEach(key => {
    logCounts[key as LogLevel] = 0;
  });
}
