/**
 * Персистентная очередь задач
 * 
 * Хранит задачи в SQLite для сохранения между перезапусками.
 * Поддерживает приоритеты, отложенное выполнение, повторы.
 */

import prisma from './prisma';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: TaskPriority;
  status: TaskStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

export interface TaskHandler<T = any, R = any> {
  name: string;
  handle: (task: Task<T>) => Promise<R>;
  onError?: (task: Task<T>, error: Error) => Promise<void>;
  onComplete?: (task: Task<T>, result: R) => Promise<void>;
  maxAttempts?: number;
  timeout?: number;
}

interface TaskQueueConfig {
  maxConcurrent: number;
  pollInterval: number;
  defaultMaxAttempts: number;
}

class PersistentTaskQueue {
  private handlers: Map<string, TaskHandler> = new Map();
  private config: TaskQueueConfig;
  private running: boolean = false;
  private currentTasks: Set<string> = new Set();
  private stats = {
    processed: 0,
    failed: 0,
    retried: 0
  };

  constructor(config?: Partial<TaskQueueConfig>) {
    this.config = {
      maxConcurrent: config?.maxConcurrent || 3,
      pollInterval: config?.pollInterval || 1000,
      defaultMaxAttempts: config?.defaultMaxAttempts || 3
    };
  }

  /**
   * Зарегистрировать обработчик задач
   */
  register<T, R>(handler: TaskHandler<T, R>): void {
    this.handlers.set(handler.name, handler);
    console.log(`📋 [Queue] Зарегистрирован обработчик: ${handler.name}`);
  }

  /**
   * Добавить задачу в очередь
   */
  async add<T>(
    type: string,
    payload: T,
    options?: {
      priority?: TaskPriority;
      maxAttempts?: number;
      scheduledAt?: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<Task<T>> {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for task type: ${type}`);
    }

    const task = await prisma.taskQueue.create({
      data: {
        type,
        payload: JSON.stringify(payload),
        priority: options?.priority || 'normal',
        status: 'pending',
        attempts: 0,
        maxAttempts: options?.maxAttempts || handler.maxAttempts || this.config.defaultMaxAttempts,
        scheduledAt: options?.scheduledAt || new Date(),
        metadata: options?.metadata ? JSON.stringify(options.metadata) : null
      }
    });

    console.log(`📋 [Queue] Задача добавлена: ${type} (${task.id})`);

    return {
      id: task.id,
      type: task.type,
      payload,
      priority: task.priority as TaskPriority,
      status: task.status as TaskStatus,
      attempts: task.attempts,
      maxAttempts: task.maxAttempts,
      createdAt: task.createdAt,
      scheduledAt: task.scheduledAt,
      metadata: options?.metadata
    };
  }

  /**
   * Добавить пакет задач
   */
  async addBatch<T>(
    type: string,
    items: T[],
    options?: {
      priority?: TaskPriority;
      maxAttempts?: number;
    }
  ): Promise<Task<T>[]> {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for task type: ${type}`);
    }

    const tasks: Task<T>[] = [];
    const now = new Date();

    for (const payload of items) {
      const task = await prisma.taskQueue.create({
        data: {
          type,
          payload: JSON.stringify(payload),
          priority: options?.priority || 'normal',
          status: 'pending',
          attempts: 0,
          maxAttempts: options?.maxAttempts || handler.maxAttempts || this.config.defaultMaxAttempts,
          scheduledAt: now
        }
      });

      tasks.push({
        id: task.id,
        type: task.type,
        payload,
        priority: task.priority as TaskPriority,
        status: task.status as TaskStatus,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        createdAt: task.createdAt,
        scheduledAt: task.scheduledAt
      });
    }

    console.log(`📋 [Queue] Добавлено ${tasks.length} задач типа ${type}`);
    return tasks;
  }

  /**
   * Запустить обработку очереди
   */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    console.log('📋 [Queue] Запущена обработка очереди');
    
    this.poll();
  }

  /**
   * Остановить обработку
   */
  stop(): void {
    this.running = false;
    console.log('📋 [Queue] Остановлена обработка очереди');
  }

  /**
   * Основной цикл опроса
   */
  private async poll(): Promise<void> {
    while (this.running) {
      try {
        await this.processNextTasks();
      } catch (error) {
        console.error('📋 [Queue] Ошибка при обработке:', error);
      }

      await this.sleep(this.config.pollInterval);
    }
  }

  /**
   * Обработать следующие задачи
   */
  private async processNextTasks(): Promise<void> {
    // Проверяем сколько задач уже выполняется
    if (this.currentTasks.size >= this.config.maxConcurrent) {
      return;
    }

    // Получаем следующую задачу
    const dbTask = await this.getNextTask();
    if (!dbTask) return;

    // Запускаем обработку
    this.processTask(dbTask.id);
  }

  /**
   * Получить следующую задачу
   */
  private async getNextTask() {
    // Приоритеты: critical > high > normal > low
    const priorityOrder = ['critical', 'high', 'normal', 'low'];

    for (const priority of priorityOrder) {
      const task = await prisma.taskQueue.findFirst({
        where: {
          status: 'pending',
          priority,
          scheduledAt: { lte: new Date() }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (task) return task;
    }

    return null;
  }

  /**
   * Обработать одну задачу
   */
  private async processTask(taskId: string): Promise<void> {
    if (this.currentTasks.has(taskId)) return;
    this.currentTasks.add(taskId);

    try {
      // Получаем и блокируем задачу
      const dbTask = await prisma.taskQueue.update({
        where: { id: taskId },
        data: {
          status: 'running',
          startedAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      const handler = this.handlers.get(dbTask.type);
      if (!handler) {
        throw new Error(`No handler for task type: ${dbTask.type}`);
      }

      const task: Task = {
        id: dbTask.id,
        type: dbTask.type,
        payload: JSON.parse(dbTask.payload as string),
        priority: dbTask.priority as TaskPriority,
        status: 'running',
        attempts: dbTask.attempts,
        maxAttempts: dbTask.maxAttempts,
        createdAt: dbTask.createdAt,
        scheduledAt: dbTask.scheduledAt,
        metadata: dbTask.metadata ? JSON.parse(dbTask.metadata as string) : undefined
      };

      console.log(`📋 [Queue] Обработка: ${task.type} (${task.id}), попытка ${task.attempts}/${task.maxAttempts}`);

      // Выполняем с таймаутом
      const timeout = handler.timeout || 300000; // 5 мин по умолчанию
      const result = await this.withTimeout(
        handler.handle(task),
        timeout
      );

      // Успешное завершение
      await prisma.taskQueue.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: JSON.stringify(result)
        }
      });

      this.stats.processed++;
      console.log(`✅ [Queue] Задача завершена: ${task.type} (${task.id})`);

      // Вызываем callback
      if (handler.onComplete) {
        await handler.onComplete(task, result);
      }

    } catch (error: any) {
      await this.handleTaskError(taskId, error);
    } finally {
      this.currentTasks.delete(taskId);
    }
  }

  /**
   * Обработать ошибку задачи
   */
  private async handleTaskError(taskId: string, error: Error): Promise<void> {
    const dbTask = await prisma.taskQueue.findUnique({
      where: { id: taskId }
    });

    if (!dbTask) return;

    const handler = this.handlers.get(dbTask.type);
    const attempts = dbTask.attempts;
    const maxAttempts = dbTask.maxAttempts;

    if (attempts >= maxAttempts) {
      // Все попытки исчерпаны
      await prisma.taskQueue.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message
        }
      });

      this.stats.failed++;
      console.error(`❌ [Queue] Задача провалена: ${dbTask.type} (${taskId}) - ${error.message}`);

      // Добавляем в Dead Letter Queue
      try {
        const { getDeadLetterQueue } = await import('./dead-letter-queue');
        await getDeadLetterQueue().add(
          taskId,
          dbTask.type,
          JSON.parse(dbTask.payload as string),
          error,
          {
            priority: dbTask.priority,
            metadata: dbTask.metadata ? JSON.parse(dbTask.metadata as string) : undefined
          }
        );
      } catch (dlqError) {
        console.error('❌ [Queue] Ошибка добавления в DLQ:', dlqError);
      }

      // Callback ошибки
      if (handler?.onError) {
        const task: Task = {
          id: dbTask.id,
          type: dbTask.type,
          payload: JSON.parse(dbTask.payload as string),
          priority: dbTask.priority as TaskPriority,
          status: 'failed',
          attempts: dbTask.attempts,
          maxAttempts: dbTask.maxAttempts,
          createdAt: dbTask.createdAt,
          scheduledAt: dbTask.scheduledAt,
          error: error.message
        };
        await handler.onError(task, error);
      }
    } else {
      // Повторная попытка с экспоненциальной задержкой
      const delay = Math.min(1000 * Math.pow(2, attempts - 1), 60000); // max 1 мин
      const scheduledAt = new Date(Date.now() + delay);

      await prisma.taskQueue.update({
        where: { id: taskId },
        data: {
          status: 'pending',
          scheduledAt,
          error: error.message
        }
      });

      this.stats.retried++;
      console.warn(`⚠️ [Queue] Повтор задачи: ${dbTask.type} (${taskId}) через ${delay}ms`);
    }
  }

  /**
   * Получить статистику
   */
  async getStats() {
    const [pending, running, completed, failed] = await Promise.all([
      prisma.taskQueue.count({ where: { status: 'pending' } }),
      prisma.taskQueue.count({ where: { status: 'running' } }),
      prisma.taskQueue.count({ where: { status: 'completed' } }),
      prisma.taskQueue.count({ where: { status: 'failed' } })
    ]);

    return {
      pending,
      running,
      completed,
      failed,
      currentWorkers: this.currentTasks.size,
      ...this.stats
    };
  }

  /**
   * Очистить выполненные задачи
   */
  async cleanCompleted(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await prisma.taskQueue.deleteMany({
      where: {
        status: { in: ['completed', 'failed', 'cancelled'] },
        completedAt: { lt: cutoff }
      }
    });

    console.log(`📋 [Queue] Удалено ${result.count} старых задач`);
    return result.count;
  }

  /**
   * Отменить задачу
   */
  async cancel(taskId: string): Promise<boolean> {
    const result = await prisma.taskQueue.updateMany({
      where: {
        id: taskId,
        status: 'pending'
      },
      data: { status: 'cancelled' }
    });

    return result.count > 0;
  }

  /**
   * Получить задачу по ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    const dbTask = await prisma.taskQueue.findUnique({
      where: { id: taskId }
    });

    if (!dbTask) return null;

    return {
      id: dbTask.id,
      type: dbTask.type,
      payload: JSON.parse(dbTask.payload as string),
      priority: dbTask.priority as TaskPriority,
      status: dbTask.status as TaskStatus,
      attempts: dbTask.attempts,
      maxAttempts: dbTask.maxAttempts,
      createdAt: dbTask.createdAt,
      scheduledAt: dbTask.scheduledAt,
      startedAt: dbTask.startedAt || undefined,
      completedAt: dbTask.completedAt || undefined,
      error: dbTask.error || undefined,
      result: dbTask.result ? JSON.parse(dbTask.result as string) : undefined,
      metadata: dbTask.metadata ? JSON.parse(dbTask.metadata as string) : undefined
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), ms)
      )
    ]);
  }
}

// Singleton
let queueInstance: PersistentTaskQueue | null = null;

export function getTaskQueue(): PersistentTaskQueue {
  if (!queueInstance) {
    queueInstance = new PersistentTaskQueue();
  }
  return queueInstance;
}

export function initTaskQueue(config?: Partial<TaskQueueConfig>): PersistentTaskQueue {
  queueInstance = new PersistentTaskQueue(config);
  return queueInstance;
}
