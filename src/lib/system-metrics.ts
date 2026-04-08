/**
 * System Metrics Service
 * 
 * Сбор и хранение метрик системы для мониторинга и аналитики.
 */

import prisma from './prisma';

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}

export interface SystemOverview {
  accounts: {
    total: number;
    active: number;
    warming: number;
    banned: number;
  };
  simCards: {
    total: number;
    active: number;
    available: number;
  };
  proxies: {
    total: number;
    working: number;
    sticky: number;
  };
  tasks: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  dlq: {
    total: number;
    unresolved: number;
    recentErrors: number;
  };
  checkpoints: {
    total: number;
    inProgress: number;
  };
  registrations: {
    active: number;
    completed: number;
    failed: number;
  };
}

class SystemMetricsService {
  /**
   * Записать метрику
   */
  async record(metric: MetricData): Promise<void> {
    await prisma.systemMetric.create({
      data: {
        id: this.generateId(),
        metricName: metric.name,
        metricValue: metric.value,
        metricUnit: metric.unit,
        tags: metric.tags ? JSON.stringify(metric.tags) : null
      }
    });
  }

  /**
   * Записать несколько метрик
   */
  async recordBatch(metrics: MetricData[]): Promise<void> {
    const data = metrics.map(m => ({
      id: this.generateId(),
      metricName: m.name,
      metricValue: m.value,
      metricUnit: m.unit,
      tags: m.tags ? JSON.stringify(m.tags) : null
    }));

    await prisma.systemMetric.createMany({ data });
  }

  /**
   * Получить метрики за период
   */
  async getMetrics(
    name: string,
    options?: {
      from?: Date;
      to?: Date;
      tags?: Record<string, string>;
      limit?: number;
    }
  ): Promise<{ timestamp: Date; value: number; tags?: Record<string, string> }[]> {
    const where: any = { metricName: name };

    if (options?.from || options?.to) {
      where.timestamp = {};
      if (options.from) where.timestamp.gte = options.from;
      if (options.to) where.timestamp.lte = options.to;
    }

    const metrics = await prisma.systemMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 100
    });

    return metrics.map(m => ({
      timestamp: m.timestamp,
      value: m.metricValue,
      tags: m.tags ? JSON.parse(m.tags) : undefined
    }));
  }

  /**
   * Получить среднее значение метрики
   */
  async getAverage(
    name: string,
    options?: {
      from?: Date;
      to?: Date;
    }
  ): Promise<number> {
    const metrics = await this.getMetrics(name, options);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Получить обзор системы
   */
  async getOverview(): Promise<SystemOverview> {
    // Аккаунты
    const [accountsTotal, accountsActive, accountsWarming, accountsBanned] = await Promise.all([
      prisma.account.count(),
      prisma.account.count({ where: { status: 'active' } }),
      prisma.account.count({ where: { status: 'warming' } }),
      prisma.account.count({ where: { status: 'banned' } })
    ]);

    // SIM-карты
    const [simCardsTotal, simCardsActive] = await Promise.all([
      prisma.simCardDetected.count(),
      prisma.simCardDetected.count({ where: { isActive: true } })
    ]);

    // Прокси (из ProxyManager)
    let proxyStats = { total: 0, working: 0 };
    try {
      const { getProxyManager } = await import('./sim-auto/proxy-manager');
      proxyStats = getProxyManager().getStats();
    } catch {
      // ProxyManager может быть не инициализирован
    }

    // Sticky сессии
    const stickyCount = await prisma.proxyStickySession.count({
      where: { status: 'active', expiresAt: { gt: new Date() } }
    });

    // Задачи
    const [tasksPending, tasksRunning, tasksCompleted, tasksFailed] = await Promise.all([
      prisma.taskQueue.count({ where: { status: 'pending' } }),
      prisma.taskQueue.count({ where: { status: 'running' } }),
      prisma.taskQueue.count({ where: { status: 'completed' } }),
      prisma.taskQueue.count({ where: { status: 'failed' } })
    ]);

    // DLQ
    const [dlqTotal, dlqUnresolved, dlqRecent] = await Promise.all([
      prisma.deadLetterQueue.count(),
      prisma.deadLetterQueue.count({ where: { resolvedAt: null } }),
      prisma.deadLetterQueue.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      })
    ]);

    // Чекпоинты
    const [checkpointsTotal, checkpointsInProgress] = await Promise.all([
      prisma.checkpoint.count(),
      prisma.checkpoint.count({ where: { status: 'in_progress' } })
    ]);

    // Регистрации
    const [registrationsActive, registrationsCompleted, registrationsFailed] = await Promise.all([
      prisma.registrationSession.count({
        where: { status: 'pending', expiresAt: { gt: new Date() } }
      }),
      prisma.simCardAccount.count({ where: { status: 'registered' } }),
      prisma.simCardAccount.count({ where: { status: 'failed' } })
    ]);

    return {
      accounts: {
        total: accountsTotal,
        active: accountsActive,
        warming: accountsWarming,
        banned: accountsBanned
      },
      simCards: {
        total: simCardsTotal,
        active: simCardsActive,
        available: simCardsActive // Те же, что активные
      },
      proxies: {
        total: proxyStats.total,
        working: proxyStats.working,
        sticky: stickyCount
      },
      tasks: {
        pending: tasksPending,
        running: tasksRunning,
        completed: tasksCompleted,
        failed: tasksFailed
      },
      dlq: {
        total: dlqTotal,
        unresolved: dlqUnresolved,
        recentErrors: dlqRecent
      },
      checkpoints: {
        total: checkpointsTotal,
        inProgress: checkpointsInProgress
      },
      registrations: {
        active: registrationsActive,
        completed: registrationsCompleted,
        failed: registrationsFailed
      }
    };
  }

  /**
   * Собрать все метрики системы
   */
  async collectSystemMetrics(): Promise<void> {
    const overview = await this.getOverview();

    const metrics: MetricData[] = [
      { name: 'accounts.total', value: overview.accounts.total },
      { name: 'accounts.active', value: overview.accounts.active },
      { name: 'accounts.warming', value: overview.accounts.warming },
      { name: 'accounts.banned', value: overview.accounts.banned },

      { name: 'sim_cards.total', value: overview.simCards.total },
      { name: 'sim_cards.active', value: overview.simCards.active },

      { name: 'proxies.total', value: overview.proxies.total },
      { name: 'proxies.working', value: overview.proxies.working },
      { name: 'proxies.sticky', value: overview.proxies.sticky },

      { name: 'tasks.pending', value: overview.tasks.pending },
      { name: 'tasks.running', value: overview.tasks.running },
      { name: 'tasks.completed', value: overview.tasks.completed },
      { name: 'tasks.failed', value: overview.tasks.failed },

      { name: 'dlq.total', value: overview.dlq.total },
      { name: 'dlq.unresolved', value: overview.dlq.unresolved },

      { name: 'checkpoints.in_progress', value: overview.checkpoints.inProgress },

      { name: 'registrations.active', value: overview.registrations.active },
      { name: 'registrations.completed', value: overview.registrations.completed }
    ];

    await this.recordBatch(metrics);
    console.log('📊 [Metrics] Собрано метрик:', metrics.length);
  }

  /**
   * Очистить старые метрики
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.systemMetric.deleteMany({
      where: { timestamp: { lt: cutoff } }
    });

    console.log(`📊 [Metrics] Удалено ${result.count} старых метрик`);
    return result.count;
  }

  /**
   * Получить агрегированные метрики по часам
   */
  async getHourlyAggregation(
    name: string,
    hours: number = 24
  ): Promise<{ hour: string; avg: number; min: number; max: number; count: number }[]> {
    const from = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await prisma.systemMetric.findMany({
      where: {
        metricName: name,
        timestamp: { gte: from }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Группируем по часам
    const hourlyData = new Map<string, number[]>();

    for (const m of metrics) {
      const hour = m.timestamp.toISOString().substring(0, 13) + ':00:00';
      const existing = hourlyData.get(hour) || [];
      existing.push(m.metricValue);
      hourlyData.set(hour, existing);
    }

    // Вычисляем агрегаты
    const result: { hour: string; avg: number; min: number; max: number; count: number }[] = [];

    for (const [hour, values] of hourlyData) {
      result.push({
        hour,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      });
    }

    return result.sort((a, b) => a.hour.localeCompare(b.hour));
  }

  /**
   * Экспорт метрик в формате для Grafana/Prometheus
   */
  async exportPrometheusFormat(): Promise<string> {
    const overview = await this.getOverview();
    const lines: string[] = [];

    // Accounts
    lines.push('# HELP mukn_accounts_total Total accounts');
    lines.push('# TYPE mukn_accounts_total gauge');
    lines.push(`mukn_accounts_total ${overview.accounts.total}`);
    lines.push(`mukn_accounts_active ${overview.accounts.active}`);
    lines.push(`mukn_accounts_warming ${overview.accounts.warming}`);
    lines.push(`mukn_accounts_banned ${overview.accounts.banned}`);

    // Proxies
    lines.push('# HELP mukn_proxies_total Total proxies');
    lines.push('# TYPE mukn_proxies_total gauge');
    lines.push(`mukn_proxies_total ${overview.proxies.total}`);
    lines.push(`mukn_proxies_working ${overview.proxies.working}`);
    lines.push(`mukn_proxies_sticky ${overview.proxies.sticky}`);

    // Tasks
    lines.push('# HELP mukn_tasks Tasks in queue');
    lines.push('# TYPE mukn_tasks gauge');
    lines.push(`mukn_tasks_pending ${overview.tasks.pending}`);
    lines.push(`mukn_tasks_running ${overview.tasks.running}`);
    lines.push(`mukn_tasks_completed ${overview.tasks.completed}`);
    lines.push(`mukn_tasks_failed ${overview.tasks.failed}`);

    // DLQ
    lines.push('# HELP mukn_dlq Dead letter queue');
    lines.push('# TYPE mukn_dlq gauge');
    lines.push(`mukn_dlq_total ${overview.dlq.total}`);
    lines.push(`mukn_dlq_unresolved ${overview.dlq.unresolved}`);

    return lines.join('\n');
  }

  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton
let metricsInstance: SystemMetricsService | null = null;

export function getSystemMetrics(): SystemMetricsService {
  if (!metricsInstance) {
    metricsInstance = new SystemMetricsService();
  }
  return metricsInstance;
}

export { SystemMetricsService };
