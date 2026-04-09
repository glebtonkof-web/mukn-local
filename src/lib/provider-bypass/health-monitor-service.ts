/**
 * Health Monitor Service
 * 
 * Мониторинг здоровья системы и автовосстановление
 * - Проверка доступности провайдеров
 * - Мониторинг API ключей
 * - Проверка прокси
 * - Автоматическое восстановление при сбоях
 * - Уведомления о критических ошибках
 * - Метрики и аналитика
 */

import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getProviderLimitRegistry, ProviderType, PROVIDER_LIMITS } from './provider-limit-registry';
import { getAutoApiKeyManager } from './auto-api-key-manager';
import { getInfiniteGenerationManager } from './infinite-generation-manager';
import { getProxyPoolManager } from './proxy-pool-manager';

// Типы
export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'offline';
export type ComponentType = 'provider' | 'api_key' | 'proxy' | 'generator' | 'database' | 'system';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Интерфейсы
export interface HealthCheckResult {
  component: ComponentType;
  componentId?: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
  checkedAt: Date;
  responseTime?: number;
}

export interface SystemHealth {
  overall: HealthStatus;
  components: {
    providers: HealthCheckResult[];
    apiKeys: HealthCheckResult[];
    proxies: HealthCheckResult[];
    generators: HealthCheckResult[];
    database: HealthCheckResult;
    system: HealthCheckResult;
  };
  metrics: SystemMetrics;
  alerts: Alert[];
  lastChecked: Date;
}

export interface SystemMetrics {
  // Провайдеры
  totalProviders: number;
  healthyProviders: number;
  degradedProviders: number;
  offlineProviders: number;
  
  // API ключи
  totalApiKeys: number;
  activeApiKeys: number;
  exhaustedApiKeys: number;
  invalidApiKeys: number;
  
  // Прокси
  totalProxies: number;
  activeProxies: number;
  avgProxyResponseTime: number;
  
  // Генераторы
  runningGenerators: number;
  pausedGenerators: number;
  totalGenerated24h: number;
  avgSuccessRate: number;
  
  // Система
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastError?: string;
  lastErrorAt?: Date;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  component: ComponentType;
  componentId?: string;
  message: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

// Конфигурация проверок
interface HealthCheckConfig {
  checkIntervalMs: number;
  providerTimeoutMs: number;
  alertCooldownMs: number;
  maxAlertsPerComponent: number;
  autoRecoveryEnabled: boolean;
  notificationsEnabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  checkIntervalMs: 60000, // 1 минута
  providerTimeoutMs: 10000, // 10 секунд
  alertCooldownMs: 300000, // 5 минут
  maxAlertsPerComponent: 10,
  autoRecoveryEnabled: true,
  notificationsEnabled: true,
};

/**
 * Health Monitor Service
 */
export class HealthMonitorService {
  private registry = getProviderLimitRegistry();
  private keyManager = getAutoApiKeyManager();
  private generationManager = getInfiniteGenerationManager();
  private proxyManager = getProxyPoolManager();
  
  private config: HealthCheckConfig;
  private alerts: Map<string, Alert> = new Map();
  private lastAlertTime: Map<string, Date> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();
  
  private lastHealth: SystemHealth | null = null;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startMonitoring();
  }

  /**
   * Получить текущее состояние системы
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [
      providerChecks,
      apiKeyChecks,
      proxyChecks,
      generatorChecks,
      databaseCheck,
      systemCheck,
    ] = await Promise.all([
      this.checkAllProviders(),
      this.checkAllApiKeys(),
      this.checkAllProxies(),
      this.checkAllGenerators(),
      this.checkDatabase(),
      this.checkSystem(),
    ]);

    const components = {
      providers: providerChecks,
      apiKeys: apiKeyChecks,
      proxies: proxyChecks,
      generators: generatorChecks,
      database: databaseCheck,
      system: systemCheck,
    };

    const metrics = await this.calculateMetrics(components);
    const alerts = this.getActiveAlerts();

    // Определяем общее состояние
    const overall = this.determineOverallStatus(components);

    this.lastHealth = {
      overall,
      components,
      metrics,
      alerts,
      lastChecked: new Date(),
    };

    return this.lastHealth;
  }

  /**
   * Проверить конкретный провайдер
   */
  async checkProvider(provider: ProviderType): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const limits = PROVIDER_LIMITS[provider];
    
    try {
      // Проверяем наличие API ключей
      const keys = await this.keyManager.getActiveKeys(provider);
      
      if (keys.length === 0) {
        return {
          component: 'provider',
          componentId: provider,
          status: 'offline',
          message: `No API keys available for ${provider}`,
          checkedAt: new Date(),
        };
      }

      // Проверяем доступность провайдера через тестовый запрос
      const isAvailable = await this.testProviderConnection(provider, keys[0].apiKey);
      const responseTime = Date.now() - startTime;

      const stats = this.registry.getUsageStats(provider);
      
      const status: HealthStatus = isAvailable 
        ? (responseTime < 2000 ? 'healthy' : 'degraded')
        : 'offline';

      return {
        component: 'provider',
        componentId: provider,
        status,
        message: isAvailable 
          ? `${provider} is responding (${responseTime}ms)`
          : `${provider} is not responding`,
        details: {
          responseTime,
          activeKeys: keys.length,
          dailyUsed: stats.currentDayRequests,
          dailyLimit: limits?.dailyQuota,
          remaining: limits?.dailyQuota ? limits.dailyQuota - stats.currentDayRequests : 'unlimited',
        },
        checkedAt: new Date(),
        responseTime,
      };
      
    } catch (error) {
      return {
        component: 'provider',
        componentId: provider,
        status: 'offline',
        message: `Error checking ${provider}: ${error}`,
        checkedAt: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Проверить все провайдеры
   */
  async checkAllProviders(): Promise<HealthCheckResult[]> {
    const providers = Object.keys(PROVIDER_LIMITS) as ProviderType[];
    const results: HealthCheckResult[] = [];

    for (const provider of providers) {
      const result = await this.checkProvider(provider);
      results.push(result);
      
      // Создаём алерт если нужно
      if (result.status === 'offline' || result.status === 'critical') {
        await this.createAlert({
          severity: result.status === 'offline' ? 'critical' : 'error',
          component: 'provider',
          componentId: provider,
          message: result.message,
          details: result.details,
        });
      }
    }

    return results;
  }

  /**
   * Проверить все API ключи
   */
  async checkAllApiKeys(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    try {
      const stats = await this.keyManager.getStats();
      
      results.push({
        component: 'api_key',
        status: stats.activeKeys > 0 ? 'healthy' : 'critical',
        message: `${stats.activeKeys} active API keys out of ${stats.totalKeys} total`,
        details: stats,
        checkedAt: new Date(),
      });

      // Проверяем каждый провайдер отдельно
      for (const [provider, providerStats] of Object.entries(stats.byProvider)) {
        if (providerStats.active === 0 && PROVIDER_LIMITS[provider as ProviderType]?.isFree) {
          results.push({
            component: 'api_key',
            componentId: provider,
            status: 'warning' as HealthStatus,
            message: `No active API keys for ${provider}`,
            checkedAt: new Date(),
          });
        }
      }
      
    } catch (error) {
      results.push({
        component: 'api_key',
        status: 'critical',
        message: `Error checking API keys: ${error}`,
        checkedAt: new Date(),
      });
    }

    return results;
  }

  /**
   * Проверить все прокси
   */
  async checkAllProxies(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    try {
      const stats = this.proxyManager.getPoolStats();
      
      results.push({
        component: 'proxy',
        status: stats.active > 0 ? 'healthy' : 'warning',
        message: `${stats.active} active proxies out of ${stats.total} total`,
        details: stats,
        checkedAt: new Date(),
      });

      if (stats.active === 0 && stats.total > 0) {
        results.push({
          component: 'proxy',
          status: 'critical',
          message: 'All proxies are inactive',
          checkedAt: new Date(),
        });
      }
      
    } catch (error) {
      results.push({
        component: 'proxy',
        status: 'critical',
        message: `Error checking proxies: ${error}`,
        checkedAt: new Date(),
      });
    }

    return results;
  }

  /**
   * Проверить все генераторы
   */
  async checkAllGenerators(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    try {
      const generators = this.generationManager.getActiveGenerators();
      
      for (const gen of generators) {
        const stats = gen.stats;
        const status: HealthStatus = 
          gen.state.status === 'running' && stats.successRate > 0.5 ? 'healthy' :
          gen.state.status === 'paused' ? 'degraded' :
          stats.successRate < 0.3 ? 'critical' :
          'degraded';

        results.push({
          component: 'generator',
          componentId: gen.id,
          status,
          message: `Generator ${gen.id}: ${gen.state.status}, success rate: ${(stats.successRate * 100).toFixed(1)}%`,
          details: {
            status: gen.state.status,
            generated: gen.state.generated,
            errors: gen.state.errors,
            successRate: stats.successRate,
            currentProvider: gen.state.currentProvider,
          },
          checkedAt: new Date(),
        });
      }
      
    } catch (error) {
      results.push({
        component: 'generator',
        status: 'critical',
        message: `Error checking generators: ${error}`,
        checkedAt: new Date(),
      });
    }

    return results;
  }

  /**
   * Проверить базу данных
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Простой запрос для проверки соединения
      await db.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        message: `Database responding (${responseTime}ms)`,
        details: { responseTime },
        checkedAt: new Date(),
        responseTime,
      };
      
    } catch (error) {
      return {
        component: 'database',
        status: 'critical',
        message: `Database error: ${error}`,
        checkedAt: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Проверить систему
   */
  async checkSystem(): Promise<HealthCheckResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const memoryPercent = heapUsedMB / heapTotalMB;
      
      const uptime = (Date.now() - this.startTime.getTime()) / 1000;
      
      // Простая проверка CPU (через нагрузку event loop)
      const start = Date.now();
      await new Promise(resolve => setImmediate(resolve));
      const eventLoopLag = Date.now() - start;
      
      const status: HealthStatus = 
        memoryPercent > 0.9 ? 'critical' :
        memoryPercent > 0.8 ? 'degraded' :
        eventLoopLag > 100 ? 'degraded' :
        'healthy';

      return {
        component: 'system',
        status,
        message: `System ${status}: memory ${(memoryPercent * 100).toFixed(1)}%, event loop lag ${eventLoopLag}ms`,
        details: {
          uptime,
          memoryHeapUsed: heapUsedMB,
          memoryHeapTotal: heapTotalMB,
          memoryPercent,
          eventLoopLag,
          nodeVersion: process.version,
          platform: process.platform,
        },
        checkedAt: new Date(),
      };
      
    } catch (error) {
      return {
        component: 'system',
        status: 'critical',
        message: `System check error: ${error}`,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Создать алерт
   */
  async createAlert(params: {
    severity: AlertSeverity;
    component: ComponentType;
    componentId?: string;
    message: string;
    details?: Record<string, unknown>;
  }): Promise<Alert> {
    const key = `${params.component}:${params.componentId || 'global'}`;
    
    // Проверяем кулдаун
    const lastAlert = this.lastAlertTime.get(key);
    if (lastAlert && Date.now() - lastAlert.getTime() < this.config.alertCooldownMs) {
      return this.alerts.get(key)!;
    }

    const alert: Alert = {
      id: nanoid(),
      severity: params.severity,
      component: params.component,
      componentId: params.componentId,
      message: params.message,
      details: params.details,
      createdAt: new Date(),
    };

    this.alerts.set(key, alert);
    this.lastAlertTime.set(key, new Date());

    // Отправляем уведомление
    if (this.config.notificationsEnabled) {
      await this.sendNotification(alert);
    }

    // Логируем
    console.log(`[HealthMonitor] Alert [${params.severity}]: ${params.message}`);

    // Попытка автовосстановления
    if (this.config.autoRecoveryEnabled && params.severity === 'critical') {
      await this.attemptRecovery(params);
    }

    return alert;
  }

  /**
   * Получить активные алерты
   */
  getActiveAlerts(): Alert[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    return Array.from(this.alerts.values())
      .filter(a => a.createdAt > oneHourAgo && !a.resolvedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Подтвердить алерт
   */
  acknowledgeAlert(alertId: string): void {
    for (const [key, alert] of this.alerts) {
      if (alert.id === alertId) {
        alert.acknowledgedAt = new Date();
        this.alerts.set(key, alert);
        break;
      }
    }
  }

  /**
   * Разрешить алерт
   */
  resolveAlert(alertId: string): void {
    for (const [key, alert] of this.alerts) {
      if (alert.id === alertId) {
        alert.resolvedAt = new Date();
        this.alerts.set(key, alert);
        break;
      }
    }
  }

  /**
   * Получить метрики для Prometheus/Grafana
   */
  getPrometheusMetrics(): string {
    const metrics: string[] = [];
    
    if (this.lastHealth) {
      const h = this.lastHealth;
      const m = h.metrics;
      
      // Provider metrics
      metrics.push(`# HELP mukn_providers_total Total number of providers`);
      metrics.push(`# TYPE mukn_providers_total gauge`);
      metrics.push(`mukn_providers_total ${m.totalProviders}`);
      
      metrics.push(`# HELP mukn_providers_healthy Healthy providers`);
      metrics.push(`mukn_providers_healthy ${m.healthyProviders}`);
      
      metrics.push(`# HELP mukn_providers_offline Offline providers`);
      metrics.push(`mukn_providers_offline ${m.offlineProviders}`);
      
      // API Keys metrics
      metrics.push(`# HELP mukn_api_keys_total Total API keys`);
      metrics.push(`mukn_api_keys_total ${m.totalApiKeys}`);
      
      metrics.push(`# HELP mukn_api_keys_active Active API keys`);
      metrics.push(`mukn_api_keys_active ${m.activeApiKeys}`);
      
      // Proxy metrics
      metrics.push(`# HELP mukn_proxies_total Total proxies`);
      metrics.push(`mukn_proxies_total ${m.totalProxies}`);
      
      metrics.push(`# HELP mukn_proxies_active Active proxies`);
      metrics.push(`mukn_proxies_active ${m.activeProxies}`);
      
      // Generator metrics
      metrics.push(`# HELP mukn_generators_running Running generators`);
      metrics.push(`mukn_generators_running ${m.runningGenerators}`);
      
      metrics.push(`# HELP mukn_generated_24h Content generated in last 24h`);
      metrics.push(`mukn_generated_24h ${m.totalGenerated24h}`);
      
      metrics.push(`# HELP mukn_success_rate Average success rate`);
      metrics.push(`mukn_success_rate ${m.avgSuccessRate}`);
      
      // System metrics
      metrics.push(`# HELP mukn_uptime_seconds System uptime`);
      metrics.push(`mukn_uptime_seconds ${m.uptime}`);
      
      metrics.push(`# HELP mukn_memory_usage Memory usage percent`);
      metrics.push(`mukn_memory_usage ${m.memoryUsage}`);
      
      // Health status (0=healthy, 1=degraded, 2=critical, 3=offline)
      const statusMap = { healthy: 0, degraded: 1, critical: 2, offline: 3 };
      metrics.push(`# HELP mukn_health_status Overall health status`);
      metrics.push(`mukn_health_status ${statusMap[h.overall]}`);
    }
    
    return metrics.join('\n');
  }

  // === Private Methods ===

  /**
   * Запустить мониторинг
   */
  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.getSystemHealth().catch(console.error);
    }, this.config.checkIntervalMs);

    // Первая проверка
    setTimeout(() => {
      this.getSystemHealth().catch(console.error);
    }, 5000);
  }

  /**
   * Остановить мониторинг
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Тест соединения с провайдером
   */
  private async testProviderConnection(provider: ProviderType, apiKey: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'cerebras':
          const cerebrasResp = await fetch('https://api.cerebras.ai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(this.config.providerTimeoutMs),
          });
          return cerebrasResp.ok;
          
        case 'groq':
          const groqResp = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(this.config.providerTimeoutMs),
          });
          return groqResp.ok;
          
        case 'gemini':
          const geminiResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { signal: AbortSignal.timeout(this.config.providerTimeoutMs) }
          );
          return geminiResp.ok;
          
        case 'openrouter':
          const orResp = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(this.config.providerTimeoutMs),
          });
          return orResp.ok;
          
        case 'deepseek':
          const dsResp = await fetch('https://api.deepseek.com/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(this.config.providerTimeoutMs),
          });
          return dsResp.ok;
          
        default:
          return true; // Для неизвестных провайдеров считаем доступными
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Вычислить метрики
   */
  private async calculateMetrics(components: SystemHealth['components']): Promise<SystemMetrics> {
    const providerStats = {
      total: components.providers.length,
      healthy: components.providers.filter(p => p.status === 'healthy').length,
      degraded: components.providers.filter(p => p.status === 'degraded').length,
      offline: components.providers.filter(p => p.status === 'offline' || p.status === 'critical').length,
    };

    const keyStats = await this.keyManager.getStats();
    const proxyStats = this.proxyManager.getPoolStats();
    const generators = this.generationManager.getActiveGenerators();

    return {
      totalProviders: providerStats.total,
      healthyProviders: providerStats.healthy,
      degradedProviders: providerStats.degraded,
      offlineProviders: providerStats.offline,
      
      totalApiKeys: keyStats.totalKeys,
      activeApiKeys: keyStats.activeKeys,
      exhaustedApiKeys: keyStats.exhaustedKeys,
      invalidApiKeys: keyStats.invalidKeys,
      
      totalProxies: proxyStats.total,
      activeProxies: proxyStats.active,
      avgProxyResponseTime: proxyStats.avgResponseTime,
      
      runningGenerators: generators.filter(g => g.state.status === 'running').length,
      pausedGenerators: generators.filter(g => g.state.status === 'paused').length,
      totalGenerated24h: generators.reduce((sum, g) => sum + g.stats.todayGenerated, 0),
      avgSuccessRate: generators.length > 0 
        ? generators.reduce((sum, g) => sum + g.stats.successRate, 0) / generators.length 
        : 0,
      
      uptime: (Date.now() - this.startTime.getTime()) / 1000,
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
      cpuUsage: 0, // TODO: добавить измерение CPU
    };
  }

  /**
   * Определить общее состояние
   */
  private determineOverallStatus(components: SystemHealth['components']): HealthStatus {
    // Если база данных недоступна - критично
    if (components.database.status === 'critical') {
      return 'critical';
    }

    // Если система в критическом состоянии
    if (components.system.status === 'critical') {
      return 'critical';
    }

    // Считаем количество проблемных компонентов
    const allChecks = [
      ...components.providers,
      ...components.apiKeys,
      ...components.proxies,
      ...components.generators,
      components.database,
      components.system,
    ];

    const criticalCount = allChecks.filter(c => c.status === 'critical' || c.status === 'offline').length;
    const degradedCount = allChecks.filter(c => c.status === 'degraded').length;

    if (criticalCount > allChecks.length * 0.3) {
      return 'critical';
    }
    
    if (criticalCount > 0 || degradedCount > allChecks.length * 0.5) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Отправить уведомление
   */
  private async sendNotification(alert: Alert): Promise<void> {
    // Telegram уведомление
    if (this.config.telegramBotToken && this.config.telegramChatId) {
      try {
        const emoji = {
          info: 'ℹ️',
          warning: '⚠️',
          error: '🔴',
          critical: '🚨',
        };

        const message = `${emoji[alert.severity]} *${alert.severity.toUpperCase()}*\n\n` +
          `Component: ${alert.component}${alert.componentId ? ` (${alert.componentId})` : ''}\n` +
          `Message: ${alert.message}\n` +
          `Time: ${alert.createdAt.toISOString()}`;

        await fetch(`https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.telegramChatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });
      } catch (error) {
        console.error('[HealthMonitor] Failed to send Telegram notification:', error);
      }
    }
  }

  /**
   * Попытка автовосстановления
   */
  private async attemptRecovery(params: {
    component: ComponentType;
    componentId?: string;
    message: string;
  }): Promise<void> {
    console.log(`[HealthMonitor] Attempting recovery for ${params.component}:${params.componentId}`);
    
    switch (params.component) {
      case 'provider':
        // Пробуем переключиться на другой провайдер
        // Или зарегистрировать новый API ключ
        break;
        
      case 'api_key':
        // Пробуем получить новый ключ
        if (params.componentId) {
          // await autoRegistrationService.createRegistrationTask({
          //   provider: params.componentId as ProviderType,
          // });
        }
        break;
        
      case 'proxy':
        // Пробуем найти другой прокси
        break;
        
      case 'generator':
        // Пробуем перезапустить генератор
        if (params.componentId) {
          await this.generationManager.resumeGeneration(params.componentId);
        }
        break;
        
      case 'database':
        // База данных - только логируем
        console.error('[HealthMonitor] Database is down!');
        break;
        
      case 'system':
        // Системные проблемы - логируем и пытаемся освободить память
        if (global.gc) {
          global.gc();
          console.log('[HealthMonitor] Triggered garbage collection');
        }
        break;
    }
  }
}

// Singleton
let monitorInstance: HealthMonitorService | null = null;

export function getHealthMonitor(): HealthMonitorService {
  if (!monitorInstance) {
    monitorInstance = new HealthMonitorService();
  }
  return monitorInstance;
}

export default HealthMonitorService;
