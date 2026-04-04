/**
 * Analytics Service - Сбор и анализ метрик
 * Порт: 3006
 */

import { createServer } from 'http';
import { parse } from 'url';

const PORT = 3006;

// Типы
interface MetricEvent {
  id: string;
  type: 'view' | 'click' | 'conversion' | 'engagement' | 'error' | 'custom';
  category: string;
  action: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  influencerId?: string;
  campaignId?: string;
  platform?: string;
}

interface AnalyticsAggregation {
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
    engagement: number;
    errors: number;
  };
  breakdown: Record<string, number>;
}

// Хранилище метрик
const metricsStore: MetricEvent[] = [];
const MAX_METRICS = 100000;

// Агрегаты
const hourlyAggregates = new Map<string, AnalyticsAggregation>();
const dailyAggregates = new Map<string, AnalyticsAggregation>();

// Статистика
const stats = {
  totalEvents: 0,
  eventsByType: {} as Record<string, number>,
  eventsByCategory: {} as Record<string, number>,
  lastEventAt: null as Date | null,
};

// Запись события
function recordEvent(event: Omit<MetricEvent, 'id' | 'timestamp'>): MetricEvent {
  const fullEvent: MetricEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  metricsStore.push(fullEvent);

  // Ограничение размера
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }

  // Обновляем статистику
  stats.totalEvents++;
  stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
  stats.eventsByCategory[event.category] = (stats.eventsByCategory[event.category] || 0) + 1;
  stats.lastEventAt = fullEvent.timestamp;

  // Обновляем агрегаты
  updateAggregates(fullEvent);

  console.log(`[Analytics] Event recorded: ${event.type}:${event.category}:${event.action}`);

  return fullEvent;
}

// Обновление агрегатов
function updateAggregates(event: MetricEvent): void {
  const hour = event.timestamp.toISOString().slice(0, 13);
  const day = event.timestamp.toISOString().slice(0, 10);

  // Часовой агрегат
  if (!hourlyAggregates.has(hour)) {
    hourlyAggregates.set(hour, createEmptyAggregate('hour'));
  }
  const hourly = hourlyAggregates.get(hour)!;
  updateAggregateMetrics(hourly, event);

  // Дневной агрегат
  if (!dailyAggregates.has(day)) {
    dailyAggregates.set(day, createEmptyAggregate('day'));
  }
  const daily = dailyAggregates.get(day)!;
  updateAggregateMetrics(daily, event);
}

function createEmptyAggregate(period: 'hour' | 'day' | 'week' | 'month'): AnalyticsAggregation {
  return {
    period,
    metrics: {
      views: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      engagement: 0,
      errors: 0,
    },
    breakdown: {},
  };
}

function updateAggregateMetrics(aggregate: AnalyticsAggregation, event: MetricEvent): void {
  switch (event.type) {
    case 'view':
      aggregate.metrics.views++;
      break;
    case 'click':
      aggregate.metrics.clicks++;
      break;
    case 'conversion':
      aggregate.metrics.conversions++;
      if (event.value) aggregate.metrics.revenue += event.value;
      break;
    case 'engagement':
      aggregate.metrics.engagement++;
      break;
    case 'error':
      aggregate.metrics.errors++;
      break;
  }

  // Breakdown по категории
  const key = `${event.category}:${event.action}`;
  aggregate.breakdown[key] = (aggregate.breakdown[key] || 0) + 1;
}

// Получение метрик
function getMetrics(options: {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  category?: string;
  influencerId?: string;
  campaignId?: string;
  limit?: number;
}): MetricEvent[] {
  let filtered = [...metricsStore];

  if (options.startDate) {
    filtered = filtered.filter(e => e.timestamp >= options.startDate!);
  }
  if (options.endDate) {
    filtered = filtered.filter(e => e.timestamp <= options.endDate!);
  }
  if (options.type) {
    filtered = filtered.filter(e => e.type === options.type);
  }
  if (options.category) {
    filtered = filtered.filter(e => e.category === options.category);
  }
  if (options.influencerId) {
    filtered = filtered.filter(e => e.influencerId === options.influencerId);
  }
  if (options.campaignId) {
    filtered = filtered.filter(e => e.campaignId === options.campaignId);
  }

  const limit = options.limit || 1000;
  return filtered.slice(-limit);
}

// Получение агрегатов
function getAggregates(period: 'hour' | 'day', count: number = 24): AnalyticsAggregation[] {
  const source = period === 'hour' ? hourlyAggregates : dailyAggregates;
  const entries = Array.from(source.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, count)
    .map(([, aggregate]) => aggregate);

  return entries;
}

// Расчёт KPI
function calculateKPI(): {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  avgRevenuePerConversion: number;
  errorRate: number;
} {
  const totals = {
    views: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    errors: 0,
  };

  metricsStore.forEach(e => {
    switch (e.type) {
      case 'view':
        totals.views++;
        break;
      case 'click':
        totals.clicks++;
        break;
      case 'conversion':
        totals.conversions++;
        if (e.value) totals.revenue += e.value;
        break;
      case 'error':
        totals.errors++;
        break;
    }
  });

  return {
    totalViews: totals.views,
    totalClicks: totals.clicks,
    ctr: totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0,
    totalConversions: totals.conversions,
    conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
    totalRevenue: totals.revenue,
    avgRevenuePerConversion: totals.conversions > 0 ? totals.revenue / totals.conversions : 0,
    errorRate: stats.totalEvents > 0 ? (totals.errors / stats.totalEvents) * 100 : 0,
  };
}

// HTTP сервер
const server = createServer(async (req, res) => {
  const url = parse(req.url || '', true);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /event - записать событие
  if (req.method === 'POST' && url.pathname === '/event') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        const recorded = recordEvent(event);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: recorded.id }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid event' }));
      }
    });
    return;
  }

  // GET /metrics - получить метрики
  if (req.method === 'GET' && url.pathname === '/metrics') {
    const options = {
      startDate: url.query?.startDate ? new Date(url.query.startDate as string) : undefined,
      endDate: url.query?.endDate ? new Date(url.query.endDate as string) : undefined,
      type: url.query?.type as string,
      category: url.query?.category as string,
      influencerId: url.query?.influencerId as string,
      campaignId: url.query?.campaignId as string,
      limit: url.query?.limit ? parseInt(url.query.limit as string) : 1000,
    };

    const metrics = getMetrics(options);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ metrics, count: metrics.length }));
    return;
  }

  // GET /aggregates - получить агрегаты
  if (req.method === 'GET' && url.pathname === '/aggregates') {
    const period = (url.query?.period as 'hour' | 'day') || 'hour';
    const count = url.query?.count ? parseInt(url.query.count as string) : 24;

    const aggregates = getAggregates(period, count);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ aggregates }));
    return;
  }

  // GET /kpi - получить KPI
  if (req.method === 'GET' && url.pathname === '/kpi') {
    const kpi = calculateKPI();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(kpi));
    return;
  }

  // GET /stats - статистика сервиса
  if (req.method === 'GET' && url.pathname === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...stats,
      storeSize: metricsStore.length,
      hourlyAggregates: hourlyAggregates.size,
      dailyAggregates: dailyAggregates.size,
    }));
    return;
  }

  // GET /health - health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      totalEvents: stats.totalEvents,
      storeSize: metricsStore.length,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[Analytics] Running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Analytics] Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('[Analytics] Server closed');
    process.exit(0);
  });
});

export { recordEvent, getMetrics, calculateKPI };
