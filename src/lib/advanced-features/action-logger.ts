// Детальный логгер действий AI

import { db } from '../db';
import { nanoid } from 'nanoid';

export type LogAction = 'generate' | 'edit' | 'publish' | 'analyze' | 'train' | 'optimize' | 'fail' | 'retry';
export type LogEntityType = 'content' | 'image' | 'video' | 'campaign' | 'influencer' | 'account';

export interface LogEntry {
  action: LogAction;
  entityType: LogEntityType;
  entityId?: string;
  input?: any;
  output?: any;
  duration?: number;
  tokensUsed?: number;
  model?: string;
  status: 'success' | 'error' | 'partial';
  errorMessage?: string;
  debugInfo?: any;
  userId?: string;
}

export interface LogFilter {
  action?: LogAction;
  entityType?: LogEntityType;
  status?: 'success' | 'error' | 'partial';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  limit?: number;
  offset?: number;
}

class DetailedActionLogger {
  private logQueue: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly batchSize = 50;
  private readonly flushDelay = 5000;

  constructor() {
    this.startFlushInterval();
  }

  async log(entry: LogEntry): Promise<string> {
    const logRecord = await db.aIActionLog.create({
      data: {
        id: nanoid(),
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        input: entry.input ? JSON.stringify(entry.input) : null,
        output: entry.output ? JSON.stringify(entry.output) : null,
        duration: entry.duration,
        tokensUsed: entry.tokensUsed,
        model: entry.model,
        status: entry.status,
        errorMessage: entry.errorMessage,
        debugInfo: entry.debugInfo ? JSON.stringify(entry.debugInfo) : null,
        userId: entry.userId,
      },
    });

    this.logQueue.push(entry);
    return logRecord.id;
  }

  logAsync(entry: LogEntry): void {
    this.logQueue.push(entry);
    if (this.logQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  async logWithTiming<T>(
    action: LogAction,
    entityType: LogEntityType,
    operation: () => Promise<T>,
    metadata: Partial<LogEntry> = {}
  ): Promise<{ result: T; logId: string }> {
    const startTime = Date.now();
    let status: 'success' | 'error' | 'partial' = 'success';
    let errorMessage: string | undefined;
    let result: T;

    try {
      result = await operation();
    } catch (error) {
      status = 'error';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const logId = await this.log({
        action,
        entityType,
        status,
        errorMessage,
        duration,
        ...metadata,
      });
      return { result: result!, logId };
    }
  }

  async getLogs(filter: LogFilter = {}): Promise<any[]> {
    const where: any = {};
    if (filter.action) where.action = filter.action;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.status) where.status = filter.status;
    if (filter.userId) where.userId = filter.userId;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }

    return db.aIActionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 100,
      skip: filter.offset || 0,
    });
  }

  async getStats(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const logs = await db.aIActionLog.findMany({ where });

    const totalActions = logs.length;
    const successCount = logs.filter(l => l.status === 'success').length;
    const totalDuration = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
    const totalTokens = logs.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);

    const actionsByType: Record<string, number> = {};
    logs.forEach(log => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
    });

    return {
      totalActions,
      successRate: totalActions > 0 ? (successCount / totalActions) * 100 : 0,
      avgDuration: totalActions > 0 ? totalDuration / totalActions : 0,
      totalTokens,
      errorCount: totalActions - successCount,
      actionsByType,
    };
  }

  async getEntityLogs(entityType: LogEntityType, entityId: string): Promise<any[]> {
    return db.aIActionLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.aIActionLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    return result.count;
  }

  async exportLogs(format: 'json' | 'csv' = 'json', filter: LogFilter = {}): Promise<string> {
    const logs = await this.getLogs({ ...filter, limit: 10000 });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    const headers = ['id', 'action', 'entityType', 'entityId', 'status', 'duration', 'tokensUsed', 'createdAt'];
    const rows = logs.map(log => 
      headers.map(h => {
        const value = (log as any)[h];
        return typeof value === 'string' ? `"${value}"` : value ?? '';
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const batch = this.logQueue.splice(0, this.batchSize);

    try {
      await db.aIActionLog.createMany({
        data: batch.map(entry => ({
          id: nanoid(),
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          input: entry.input ? JSON.stringify(entry.input) : null,
          output: entry.output ? JSON.stringify(entry.output) : null,
          duration: entry.duration,
          tokensUsed: entry.tokensUsed,
          model: entry.model,
          status: entry.status,
          errorMessage: entry.errorMessage,
          debugInfo: entry.debugInfo ? JSON.stringify(entry.debugInfo) : null,
          userId: entry.userId,
        })),
      });
    } catch (error) {
      console.error('[ActionLogger] Flush error:', error);
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => this.flush(), this.flushDelay);
  }

  stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

let actionLoggerInstance: DetailedActionLogger | null = null;

export function getActionLogger(): DetailedActionLogger {
  if (!actionLoggerInstance) {
    actionLoggerInstance = new DetailedActionLogger();
  }
  return actionLoggerInstance;
}

export const actionLogger = {
  log: (entry: LogEntry) => getActionLogger().log(entry),
  logAsync: (entry: LogEntry) => getActionLogger().logAsync(entry),
  logWithTiming: <T>(action: LogAction, entityType: LogEntityType, operation: () => Promise<T>, metadata?: Partial<LogEntry>) => 
    getActionLogger().logWithTiming(action, entityType, operation, metadata),
  getLogs: (filter?: LogFilter) => getActionLogger().getLogs(filter),
  getStats: (startDate?: Date, endDate?: Date) => getActionLogger().getStats(startDate, endDate),
  getEntityLogs: (entityType: LogEntityType, entityId: string) => getActionLogger().getEntityLogs(entityType, entityId),
  cleanOldLogs: (days?: number) => getActionLogger().cleanOldLogs(days),
  exportLogs: (format?: 'json' | 'csv', filter?: LogFilter) => getActionLogger().exportLogs(format, filter),
};
