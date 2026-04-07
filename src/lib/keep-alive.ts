/**
 * МУКН | Трафик - Keep-Alive Service
 * Поддержание соединений и предотвращение засыпания сервисов
 */

import { logger } from './logger';

interface KeepAliveConfig {
  enabled: boolean;
  interval: number; // ms
  endpoints: string[];
  telegramPolling: boolean;
  dbKeepAlive: boolean;
}

const DEFAULT_CONFIG: KeepAliveConfig = {
  enabled: true,
  interval: 60000, // 1 минута
  endpoints: [
    '/api/health',
  ],
  telegramPolling: true,
  dbKeepAlive: true,
};

class KeepAliveService {
  private config: KeepAliveConfig;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private db: any;

  constructor(config: Partial<KeepAliveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[KeepAlive] Service already running');
      return;
    }

    this.isRunning = true;
    logger.info('[KeepAlive] Service started');

    // Инициализируем БД
    try {
      const { db } = await import('./db');
      this.db = db;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn('[KeepAlive] Could not initialize database', { error: err.message });
    }

    // Периодические проверки
    this.timer = setInterval(() => {
      this.performKeepAlive();
    }, this.config.interval);

    // Первая проверка сразу
    await this.performKeepAlive();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('[KeepAlive] Service stopped');
  }

  private async performKeepAlive(): Promise<void> {
    const results: Record<string, boolean> = {};

    // Keep-alive для эндпоинтов
    for (const endpoint of this.config.endpoints) {
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : `http://localhost:${process.env.PORT || 3000}`;
        
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        
        results[endpoint] = response.ok;
        
        if (!response.ok) {
          logger.warn(`[KeepAlive] Endpoint ${endpoint} returned ${response.status}`);
        }
      } catch (error: unknown) {
        results[endpoint] = false;
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`[KeepAlive] Failed to ping ${endpoint}`, err);
      }
    }

    // Keep-alive для БД
    if (this.config.dbKeepAlive && this.db) {
      try {
        await this.db.$queryRaw`SELECT 1`;
        results['database'] = true;
      } catch (error: unknown) {
        results['database'] = false;
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('[KeepAlive] Database ping failed', err);
        
        // Пытаемся переподключиться
        try {
          await this.db.$disconnect();
          await this.db.$connect();
          logger.info('[KeepAlive] Database reconnected');
        } catch (reconnectError: unknown) {
          const recErr = reconnectError instanceof Error ? reconnectError : new Error(String(reconnectError));
          logger.error('[KeepAlive] Database reconnection failed', recErr);
        }
      }
    }

    // Логируем статус
    const allHealthy = Object.values(results).every(v => v);
    if (!allHealthy) {
      logger.warn('[KeepAlive] Some services are unhealthy', results);
    }
  }

  getStatus(): { running: boolean; interval: number } {
    return {
      running: this.isRunning,
      interval: this.config.interval,
    };
  }
}

// Singleton
let keepAliveInstance: KeepAliveService | null = null;

export function getKeepAliveService(config?: Partial<KeepAliveConfig>): KeepAliveService {
  if (!keepAliveInstance) {
    keepAliveInstance = new KeepAliveService(config);
  }
  return keepAliveInstance;
}

export const keepAlive = {
  start: () => getKeepAliveService().start(),
  stop: () => getKeepAliveService().stop(),
  getStatus: () => getKeepAliveService().getStatus(),
};

export default KeepAliveService;
