/**
 * Proxy Pool Manager
 * 
 * Управление пулом прокси для обхода IP ограничений
 * - Автоматическая проверка работоспособности
 * - Ротация прокси
 * - Sticky sessions для провайдеров с привязкой к IP
 * - Поддержка разных типов прокси (HTTP, HTTPS, SOCKS5)
 * - Интеграция с провайдерами прокси
 */

import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// Типы
export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5';
export type ProxyStatus = 'active' | 'inactive' | 'checking' | 'banned' | 'cooldown';
export type ProxyProvider = 'manual' | 'brightdata' | 'oxylabs' | 'smartproxy' | 'luminati' | 'custom';

// Интерфейсы
export interface ProxyConfig {
  id: string;
  host: string;
  port: number;
  type: ProxyType;
  username?: string;
  password?: string;
  
  // Метаданные
  provider: ProxyProvider;
  country?: string;
  city?: string;
  isp?: string;
  asn?: string;
  
  // Состояние
  status: ProxyStatus;
  isWorking: boolean;
  lastCheckedAt?: Date;
  lastUsedAt?: Date;
  responseTime?: number;
  
  // Ограничения
  maxRequests?: number;
  currentRequests: number;
  cooldownUntil?: Date;
  bannedUntil?: Date;
  
  // Sticky session
  stickySession?: boolean;
  sessionId?: string;
  sessionExpiresAt?: Date;
  
  // Статистика
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  
  // Привязка
  assignedToProvider?: string;
  assignedToAccount?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Конфигурация провайдера прокси
export interface ProxyProviderConfig {
  name: ProxyProvider;
  apiEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  dashboardUrl?: string;
  
  // Лимиты
  monthlyBandwidth?: number; // GB
  currentBandwidth?: number;
  monthlyRequests?: number;
  currentRequests?: number;
  
  // Доступные страны
  countries?: string[];
  
  // Цены
  pricePerGb?: number;
  pricePerRequest?: number;
  
  // Настройки
  autoRotate: boolean;
  stickySessionSupported: boolean;
  minResponseTime: number;
  maxConnections: number;
}

// Конфигурации провайдеров прокси
export const PROXY_PROVIDER_CONFIGS: Record<ProxyProvider, ProxyProviderConfig> = {
  manual: {
    name: 'manual',
    autoRotate: false,
    stickySessionSupported: false,
    minResponseTime: 0,
    maxConnections: 100,
  },
  
  brightdata: {
    name: 'brightdata',
    apiEndpoint: 'https://brightdata.com/api',
    dashboardUrl: 'https://brightdata.com/cp',
    autoRotate: true,
    stickySessionSupported: true,
    minResponseTime: 500,
    maxConnections: 1000,
    countries: ['US', 'GB', 'DE', 'FR', 'JP', 'AU', 'CA', 'NL', 'ES', 'IT'],
  },
  
  oxylabs: {
    name: 'oxylabs',
    apiEndpoint: 'https://api.oxylabs.io',
    dashboardUrl: 'https://oxylabs.io/dashboard',
    autoRotate: true,
    stickySessionSupported: true,
    minResponseTime: 400,
    maxConnections: 2000,
    countries: ['US', 'GB', 'DE', 'FR', 'JP', 'AU', 'CA', 'NL', 'ES', 'IT', 'RU', 'BR', 'IN'],
  },
  
  smartproxy: {
    name: 'smartproxy',
    apiEndpoint: 'https://api.smartproxy.com',
    dashboardUrl: 'https://smartproxy.com/dashboard',
    autoRotate: true,
    stickySessionSupported: true,
    minResponseTime: 600,
    maxConnections: 500,
    countries: ['US', 'GB', 'DE', 'FR', 'JP', 'AU', 'CA'],
  },
  
  luminati: {
    name: 'luminati',
    apiEndpoint: 'https://luminati.io/api',
    dashboardUrl: 'https://luminati.io/cp',
    autoRotate: true,
    stickySessionSupported: true,
    minResponseTime: 500,
    maxConnections: 1500,
    countries: ['US', 'GB', 'DE', 'FR', 'JP', 'AU', 'CA', 'NL', 'ES', 'IT'],
  },
  
  custom: {
    name: 'custom',
    autoRotate: false,
    stickySessionSupported: true,
    minResponseTime: 0,
    maxConnections: 100,
  },
};

/**
 * Proxy Pool Manager
 */
export class ProxyPoolManager {
  private proxyCache: Map<string, ProxyConfig> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.loadProxies();
    this.startHealthCheck();
  }

  /**
   * Добавить прокси
   */
  async addProxy(params: {
    host: string;
    port: number;
    type: ProxyType;
    username?: string;
    password?: string;
    provider?: ProxyProvider;
    country?: string;
    city?: string;
  }): Promise<ProxyConfig> {
    const id = nanoid();
    
    const proxy: ProxyConfig = {
      id,
      host: params.host,
      port: params.port,
      type: params.type,
      username: params.username,
      password: params.password,
      provider: params.provider || 'manual',
      country: params.country,
      city: params.city,
      status: 'active',
      isWorking: false,
      currentRequests: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Сохраняем в БД
    await db.bypassProxyPool.create({
      data: {
        id: proxy.id,
        host: proxy.host,
        port: proxy.port,
        type: proxy.type,
        username: proxy.username,
        password: proxy.password,
        country: proxy.country,
        status: proxy.status,
        isActive: true,
        lastChecked: proxy.lastCheckedAt,
        responseTime: proxy.responseTime,
      },
    });

    // Проверяем работоспособность
    await this.checkProxy(proxy);
    
    this.proxyCache.set(id, proxy);
    
    return proxy;
  }

  /**
   * Массовое добавление прокси
   */
  async addProxiesBatch(
    proxies: Array<{
      host: string;
      port: number;
      type: ProxyType;
      username?: string;
      password?: string;
      country?: string;
    }>
  ): Promise<{ added: number; failed: number }> {
    let added = 0;
    let failed = 0;

    for (const p of proxies) {
      try {
        await this.addProxy(p);
        added++;
      } catch (error) {
        console.error(`[ProxyPool] Failed to add proxy ${p.host}:${p.port}:`, error);
        failed++;
      }
    }

    return { added, failed };
  }

  /**
   * Получить лучший доступный прокси
   */
  async getBestProxy(params?: {
    type?: ProxyType;
    country?: string;
    provider?: string;
    excludeIds?: string[];
    stickySession?: boolean;
  }): Promise<ProxyConfig | null> {
    const candidates = Array.from(this.proxyCache.values()).filter(p => {
      if (p.status !== 'active' || !p.isWorking) return false;
      if (p.cooldownUntil && p.cooldownUntil > new Date()) return false;
      if (p.bannedUntil && p.bannedUntil > new Date()) return false;
      if (params?.type && p.type !== params.type) return false;
      if (params?.country && p.country !== params.country) return false;
      if (params?.excludeIds?.includes(p.id)) return false;
      if (params?.stickySession && !p.stickySession && p.sessionId) return false;
      if (params?.provider && p.assignedToProvider && p.assignedToProvider !== params.provider) return false;
      return true;
    });

    if (candidates.length === 0) {
      return null;
    }

    // Сортируем по успешности и времени ответа
    candidates.sort((a, b) => {
      // Сначала по успешности
      if (a.successRate !== b.successRate) {
        return b.successRate - a.successRate;
      }
      // Потом по времени ответа
      return (a.responseTime || 9999) - (b.responseTime || 9999);
    });

    return candidates[0];
  }

  /**
   * Получить прокси по ID
   */
  getProxy(id: string): ProxyConfig | null {
    return this.proxyCache.get(id) || null;
  }

  /**
   * Получить все активные прокси
   */
  getActiveProxies(): ProxyConfig[] {
    return Array.from(this.proxyCache.values()).filter(p => 
      p.status === 'active' && p.isWorking
    );
  }

  /**
   * Получить статистику пула
   */
  getPoolStats(): {
    total: number;
    active: number;
    inactive: number;
    checking: number;
    banned: number;
    byCountry: Record<string, number>;
    byType: Record<string, number>;
    avgResponseTime: number;
    avgSuccessRate: number;
  } {
    const proxies = Array.from(this.proxyCache.values());
    
    const stats = {
      total: proxies.length,
      active: 0,
      inactive: 0,
      checking: 0,
      banned: 0,
      byCountry: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      avgResponseTime: 0,
      avgSuccessRate: 0,
    };

    let totalResponseTime = 0;
    let totalSuccessRate = 0;
    let validProxies = 0;

    for (const p of proxies) {
      switch (p.status) {
        case 'active':
          if (p.isWorking) stats.active++;
          else stats.inactive++;
          break;
        case 'inactive':
          stats.inactive++;
          break;
        case 'checking':
          stats.checking++;
          break;
        case 'banned':
        case 'cooldown':
          stats.banned++;
          break;
      }

      if (p.country) {
        stats.byCountry[p.country] = (stats.byCountry[p.country] || 0) + 1;
      }
      
      stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
      
      if (p.responseTime) {
        totalResponseTime += p.responseTime;
        validProxies++;
      }
      
      totalSuccessRate += p.successRate;
    }

    stats.avgResponseTime = validProxies > 0 ? totalResponseTime / validProxies : 0;
    stats.avgSuccessRate = proxies.length > 0 ? totalSuccessRate / proxies.length : 0;

    return stats;
  }

  /**
   * Записать использование прокси
   */
  async recordUsage(proxyId: string, success: boolean, error?: string): Promise<void> {
    const proxy = this.proxyCache.get(proxyId);
    
    if (!proxy) return;

    proxy.lastUsedAt = new Date();
    proxy.currentRequests++;
    proxy.totalRequests++;
    
    if (success) {
      proxy.successfulRequests++;
    } else {
      proxy.failedRequests++;
    }
    
    proxy.successRate = proxy.totalRequests > 0 
      ? proxy.successfulRequests / proxy.totalRequests 
      : 0;

    // Если слишком много ошибок, ставим на кулдаун
    if (!success && proxy.failedRequests >= 5) {
      const recentFailRate = proxy.failedRequests / proxy.totalRequests;
      if (recentFailRate > 0.5) {
        proxy.status = 'cooldown';
        proxy.cooldownUntil = new Date(Date.now() + 300000); // 5 минут
      }
    }

    this.proxyCache.set(proxyId, proxy);

    // Обновляем БД
    await db.bypassProxyPool.update({
      where: { id: proxyId },
      data: {
        lastUsed: proxy.lastUsedAt,
        successRate: proxy.successRate,
        status: proxy.status,
      },
    }).catch(console.error);
  }

  /**
   * Проверить работоспособность прокси
   */
  async checkProxy(proxy: ProxyConfig): Promise<boolean> {
    proxy.status = 'checking';
    this.proxyCache.set(proxy.id, proxy);

    try {
      const startTime = Date.now();
      
      // Проверяем через тестовый запрос
      const testUrl = 'https://api.ipify.org?format=json';
      
      const proxyUrl = this.buildProxyUrl(proxy);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        // @ts-ignore - Node.js fetch поддерживает proxy
        proxy: proxyUrl,
        signal: AbortSignal.timeout(10000), // 10 секунд таймаут
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        proxy.isWorking = true;
        proxy.responseTime = responseTime;
        proxy.status = 'active';
        proxy.lastCheckedAt = new Date();
        
        // Получаем IP и местоположение
        try {
          const data = await response.json();
          // Можно добавить геолокацию по IP
        } catch (e) {
          // Игнорируем
        }
        
        console.log(`[ProxyPool] Proxy ${proxy.host}:${proxy.port} is working (${responseTime}ms)`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      proxy.isWorking = false;
      proxy.status = 'inactive';
      proxy.lastCheckedAt = new Date();
      
      console.log(`[ProxyPool] Proxy ${proxy.host}:${proxy.port} is not working:`, error);
      return false;
    } finally {
      proxy.updatedAt = new Date();
      this.proxyCache.set(proxy.id, proxy);
      
      // Обновляем БД
      await db.bypassProxyPool.update({
        where: { id: proxy.id },
        data: {
          status: proxy.status,
          isActive: proxy.isWorking,
          lastChecked: proxy.lastCheckedAt,
          responseTime: proxy.responseTime,
        },
      }).catch(console.error);
    }
  }

  /**
   * Создать sticky session
   */
  async createStickySession(proxyId: string, durationMinutes: number = 30): Promise<string | null> {
    const proxy = this.proxyCache.get(proxyId);
    
    if (!proxy || !proxy.isWorking) {
      return null;
    }

    const sessionId = nanoid(16);
    
    proxy.stickySession = true;
    proxy.sessionId = sessionId;
    proxy.sessionExpiresAt = new Date(Date.now() + durationMinutes * 60000);
    
    this.proxyCache.set(proxyId, proxy);
    
    console.log(`[ProxyPool] Created sticky session ${sessionId} for proxy ${proxyId}`);
    
    return sessionId;
  }

  /**
   * Получить прокси по sticky session
   */
  getProxyBySession(sessionId: string): ProxyConfig | null {
    for (const proxy of this.proxyCache.values()) {
      if (proxy.sessionId === sessionId) {
        // Проверяем, не истекла ли сессия
        if (proxy.sessionExpiresAt && proxy.sessionExpiresAt > new Date()) {
          return proxy;
        } else {
          // Сессия истекла, очищаем
          proxy.stickySession = false;
          proxy.sessionId = undefined;
          proxy.sessionExpiresAt = undefined;
          this.proxyCache.set(proxy.id, proxy);
        }
      }
    }
    
    return null;
  }

  /**
   * Удалить прокси
   */
  async removeProxy(proxyId: string): Promise<boolean> {
    const proxy = this.proxyCache.get(proxyId);
    
    if (!proxy) {
      return false;
    }

    this.proxyCache.delete(proxyId);

    await db.bypassProxyPool.delete({
      where: { id: proxyId },
    }).catch(console.error);

    return true;
  }

  /**
   * Заблокировать прокси
   */
  async banProxy(proxyId: string, reason: string, durationMinutes: number = 60): Promise<void> {
    const proxy = this.proxyCache.get(proxyId);
    
    if (!proxy) return;

    proxy.status = 'banned';
    proxy.bannedUntil = new Date(Date.now() + durationMinutes * 60000);
    
    this.proxyCache.set(proxyId, proxy);

    await db.bypassProxyPool.update({
      where: { id: proxyId },
      data: {
        status: 'banned',
      },
    }).catch(console.error);

    console.log(`[ProxyPool] Banned proxy ${proxyId}: ${reason}`);
  }

  /**
   * Получить прокси от провайдера
   */
  async getProxyFromProvider(params: {
    provider: ProxyProvider;
    country?: string;
    city?: string;
    sticky?: boolean;
  }): Promise<ProxyConfig | null> {
    const config = PROXY_PROVIDER_CONFIGS[params.provider];
    
    if (!config || !config.apiEndpoint) {
      return null;
    }

    // Здесь будет интеграция с API провайдера прокси
    // Например, для Bright Data, Oxylabs и т.д.
    
    console.log(`[ProxyPool] Getting proxy from ${params.provider} for ${params.country || 'any'}`);
    
    // Заглушка - в реальности нужно интегрировать с API провайдеров
    return null;
  }

  /**
   * Импортировать прокси из файла
   */
  async importFromFile(content: string, format: 'txt' | 'csv' | 'json'): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      let proxies: Array<{
        host: string;
        port: number;
        type: ProxyType;
        username?: string;
        password?: string;
        country?: string;
      }> = [];

      switch (format) {
        case 'txt':
          // Формат: host:port или host:port:user:pass или host:port:type:user:pass
          const lines = content.split('\n').filter(l => l.trim());
          
          for (const line of lines) {
            const parts = line.trim().split(':');
            
            if (parts.length >= 2) {
              const proxy: typeof proxies[0] = {
                host: parts[0],
                port: parseInt(parts[1]) || 80,
                type: 'http',
              };
              
              if (parts.length >= 4) {
                proxy.username = parts[2];
                proxy.password = parts[3];
              }
              
              if (parts.length >= 5) {
                proxy.type = parts[4] as ProxyType || 'http';
              }
              
              proxies.push(proxy);
            }
          }
          break;
          
        case 'csv':
          // CSV формат
          const csvLines = content.split('\n').filter(l => l.trim());
          const headers = csvLines[0]?.split(',').map(h => h.trim().toLowerCase());
          
          for (let i = 1; i < csvLines.length; i++) {
            const values = csvLines[i].split(',');
            const proxy: typeof proxies[0] = {
              host: '',
              port: 80,
              type: 'http',
            };
            
            for (let j = 0; j < headers.length; j++) {
              switch (headers[j]) {
                case 'host':
                case 'ip':
                  proxy.host = values[j]?.trim();
                  break;
                case 'port':
                  proxy.port = parseInt(values[j]) || 80;
                  break;
                case 'type':
                case 'protocol':
                  proxy.type = values[j]?.trim() as ProxyType || 'http';
                  break;
                case 'username':
                case 'user':
                  proxy.username = values[j]?.trim();
                  break;
                case 'password':
                case 'pass':
                  proxy.password = values[j]?.trim();
                  break;
                case 'country':
                  proxy.country = values[j]?.trim();
                  break;
              }
            }
            
            if (proxy.host) {
              proxies.push(proxy);
            }
          }
          break;
          
        case 'json':
          proxies = JSON.parse(content);
          break;
      }

      // Добавляем прокси
      for (const p of proxies) {
        try {
          await this.addProxy(p);
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to add ${p.host}:${p.port}: ${error}`);
        }
      }
      
    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  // === Private Methods ===

  /**
   * Загрузить прокси из БД
   */
  private async loadProxies(): Promise<void> {
    try {
      const proxies = await db.bypassProxyPool.findMany({
        where: { isActive: true },
      });

      for (const p of proxies) {
        const proxy: ProxyConfig = {
          id: p.id,
          host: p.host,
          port: p.port,
          type: p.type as ProxyType,
          username: p.username || undefined,
          password: p.password || undefined,
          provider: 'manual',
          country: p.country || undefined,
          status: p.status as ProxyStatus || 'active',
          isWorking: true,
          lastCheckedAt: p.lastChecked || undefined,
          lastUsedAt: p.lastUsed || undefined,
          responseTime: p.responseTime || undefined,
          currentRequests: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          successRate: p.successRate || 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
        
        this.proxyCache.set(p.id, proxy);
      }

      console.log(`[ProxyPool] Loaded ${proxies.length} proxies`);
      
    } catch (error) {
      console.error('[ProxyPool] Failed to load proxies:', error);
    }
  }

  /**
   * Запустить периодическую проверку
   */
  private startHealthCheck(): void {
    // Проверяем все прокси каждые 10 минут
    this.checkInterval = setInterval(() => {
      this.checkAllProxies();
    }, 600000);

    // Первая проверка через 30 секунд после старта
    setTimeout(() => this.checkAllProxies(), 30000);
  }

  /**
   * Проверить все прокси
   */
  private async checkAllProxies(): Promise<void> {
    console.log('[ProxyPool] Starting health check...');
    
    const proxies = Array.from(this.proxyCache.values());
    
    // Проверяем параллельно по 10 прокси
    const batchSize = 10;
    
    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(p => this.checkProxy(p))
      );
    }
    
    console.log('[ProxyPool] Health check completed');
  }

  /**
   * Построить URL прокси
   */
  private buildProxyUrl(proxy: ProxyConfig): string {
    if (proxy.username && proxy.password) {
      return `${proxy.type}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    }
    return `${proxy.type}://${proxy.host}:${proxy.port}`;
  }
}

// Singleton
let managerInstance: ProxyPoolManager | null = null;

export function getProxyPoolManager(): ProxyPoolManager {
  if (!managerInstance) {
    managerInstance = new ProxyPoolManager();
  }
  return managerInstance;
}

export default ProxyPoolManager;
