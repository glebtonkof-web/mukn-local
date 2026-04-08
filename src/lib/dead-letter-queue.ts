/**
 * Dead Letter Queue (DLQ) Service
 * 
 * Хранит окончательно проваленные задачи для ручного анализа и повторной обработки.
 * Позволяет анализировать причины сбоев и восстанавливать задачи.
 */

import prisma from './prisma';

export interface DeadLetterEntry {
  id: string;
  originalTaskId: string;
  taskType: string;
  payload: any;
  error: string;
  errorStack?: string;
  attempts: number;
  lastAttemptAt?: Date;
  originalPriority?: string;
  originalMetadata?: any;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

export interface DLQStats {
  total: number;
  unresolved: number;
  resolved: number;
  byType: Record<string, number>;
  recentErrors: number; // за последние 24 часа
}

class DeadLetterQueueService {
  /**
   * Добавить проваленную задачу в DLQ
   */
  async add(
    taskId: string,
    taskType: string,
    payload: any,
    error: Error | string,
    options?: {
      priority?: string;
      metadata?: any;
    }
  ): Promise<DeadLetterEntry> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    const entry = await prisma.deadLetterQueue.create({
      data: {
        id: this.generateId(),
        originalTaskId: taskId,
        taskType,
        payload: JSON.stringify(payload),
        error: errorMessage,
        errorStack,
        attempts: 1,
        lastAttemptAt: new Date(),
        originalPriority: options?.priority,
        originalMetadata: options?.metadata ? JSON.stringify(options.metadata) : null
      }
    });

    console.log(`💀 [DLQ] Задача добавлена: ${taskType} (${taskId}) - ${errorMessage}`);

    return {
      id: entry.id,
      originalTaskId: entry.originalTaskId,
      taskType: entry.taskType,
      payload: JSON.parse(entry.payload),
      error: entry.error,
      errorStack: entry.errorStack || undefined,
      attempts: entry.attempts,
      lastAttemptAt: entry.lastAttemptAt || undefined,
      originalPriority: entry.originalPriority || undefined,
      originalMetadata: entry.originalMetadata ? JSON.parse(entry.originalMetadata) : undefined,
      createdAt: entry.createdAt
    };
  }

  /**
   * Получить список записей из DLQ
   */
  async list(options?: {
    taskType?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<DeadLetterEntry[]> {
    const where: any = {};

    if (options?.taskType) {
      where.taskType = options.taskType;
    }

    if (options?.resolved === true) {
      where.resolvedAt = { not: null };
    } else if (options?.resolved === false) {
      where.resolvedAt = null;
    }

    const entries = await prisma.deadLetterQueue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0
    });

    return entries.map(entry => ({
      id: entry.id,
      originalTaskId: entry.originalTaskId,
      taskType: entry.taskType,
      payload: JSON.parse(entry.payload),
      error: entry.error,
      errorStack: entry.errorStack || undefined,
      attempts: entry.attempts,
      lastAttemptAt: entry.lastAttemptAt || undefined,
      originalPriority: entry.originalPriority || undefined,
      originalMetadata: entry.originalMetadata ? JSON.parse(entry.originalMetadata) : undefined,
      resolution: entry.resolution || undefined,
      resolvedAt: entry.resolvedAt || undefined,
      resolvedBy: entry.resolvedBy || undefined,
      createdAt: entry.createdAt
    }));
  }

  /**
   * Получить запись по ID
   */
  async get(id: string): Promise<DeadLetterEntry | null> {
    const entry = await prisma.deadLetterQueue.findUnique({
      where: { id }
    });

    if (!entry) return null;

    return {
      id: entry.id,
      originalTaskId: entry.originalTaskId,
      taskType: entry.taskType,
      payload: JSON.parse(entry.payload),
      error: entry.error,
      errorStack: entry.errorStack || undefined,
      attempts: entry.attempts,
      lastAttemptAt: entry.lastAttemptAt || undefined,
      originalPriority: entry.originalPriority || undefined,
      originalMetadata: entry.originalMetadata ? JSON.parse(entry.originalMetadata) : undefined,
      resolution: entry.resolution || undefined,
      resolvedAt: entry.resolvedAt || undefined,
      resolvedBy: entry.resolvedBy || undefined,
      createdAt: entry.createdAt
    };
  }

  /**
   * Повторить задачу (вернуть в очередь)
   */
  async retry(id: string): Promise<boolean> {
    const entry = await prisma.deadLetterQueue.findUnique({
      where: { id }
    });

    if (!entry || entry.resolvedAt) {
      return false;
    }

    const { getTaskQueue } = await import('./task-queue');
    const queue = getTaskQueue();

    try {
      // Добавляем задачу обратно в очередь
      await queue.add(
        entry.taskType,
        JSON.parse(entry.payload),
        {
          priority: (entry.originalPriority as any) || 'normal',
          metadata: entry.originalMetadata ? JSON.parse(entry.originalMetadata) : undefined
        }
      );

      // Помечаем как resolved
      await prisma.deadLetterQueue.update({
        where: { id },
        data: {
          resolution: 'retried',
          resolvedAt: new Date(),
          resolvedBy: 'system'
        }
      });

      console.log(`💀 [DLQ] Задача возвращена в очередь: ${entry.taskType} (${id})`);
      return true;
    } catch (error: any) {
      console.error(`💀 [DLQ] Ошибка при retry: ${error.message}`);
      return false;
    }
  }

  /**
   * Пометить как resolved
   */
  async resolve(id: string, resolution: string, resolvedBy: string = 'manual'): Promise<boolean> {
    try {
      await prisma.deadLetterQueue.update({
        where: { id },
        data: {
          resolution,
          resolvedAt: new Date(),
          resolvedBy
        }
      });

      console.log(`💀 [DLQ] Запись помечена как resolved: ${id}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Удалить resolved записи старше N дней
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.deadLetterQueue.deleteMany({
      where: {
        resolvedAt: { not: null, lt: cutoff }
      }
    });

    console.log(`💀 [DLQ] Удалено ${result.count} старых resolved записей`);
    return result.count;
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<DLQStats> {
    const [total, unresolved, resolved, byType, recentErrors] = await Promise.all([
      prisma.deadLetterQueue.count(),
      prisma.deadLetterQueue.count({ where: { resolvedAt: null } }),
      prisma.deadLetterQueue.count({ where: { resolvedAt: { not: null } } }),
      this.getErrorsByType(),
      this.getRecentErrorsCount()
    ]);

    return {
      total,
      unresolved,
      resolved,
      byType,
      recentErrors
    };
  }

  /**
   * Получить количество ошибок по типам
   */
  private async getErrorsByType(): Promise<Record<string, number>> {
    const entries = await prisma.deadLetterQueue.groupBy({
      by: ['taskType'],
      _count: { taskType: true }
    });

    const result: Record<string, number> = {};
    for (const entry of entries) {
      result[entry.taskType] = entry._count.taskType;
    }

    return result;
  }

  /**
   * Получить количество ошибок за последние 24 часа
   */
  private async getRecentErrorsCount(): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return prisma.deadLetterQueue.count({
      where: { createdAt: { gte: yesterday } }
    });
  }

  /**
   * Пакетная обработка
   */
  async bulkRetry(ids: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      const result = await this.retry(id);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Получить наиболее частые ошибки
   */
  async getTopErrors(limit: number = 10): Promise<{ error: string; count: number; taskType: string }[]> {
    const entries = await prisma.deadLetterQueue.findMany({
      where: { resolvedAt: null },
      select: { error: true, taskType: true }
    });

    const errorCounts = new Map<string, { count: number; taskType: string }>();

    for (const entry of entries) {
      const key = entry.error.substring(0, 100); // Первые 100 символов ошибки
      const existing = errorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        errorCounts.set(key, { count: 1, taskType: entry.taskType });
      }
    }

    return Array.from(errorCounts.entries())
      .map(([error, data]) => ({ error, count: data.count, taskType: data.taskType }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private generateId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton
let dlqInstance: DeadLetterQueueService | null = null;

export function getDeadLetterQueue(): DeadLetterQueueService {
  if (!dlqInstance) {
    dlqInstance = new DeadLetterQueueService();
  }
  return dlqInstance;
}

export { DeadLetterQueueService };
