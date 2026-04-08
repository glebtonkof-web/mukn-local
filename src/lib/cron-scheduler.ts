/**
 * Cron Scheduler Service
 * 
 * Планировщик задач для регулярных операций:
 * - Обновление прокси
 * - Проверка аккаунтов
 * - Очистка старых данных
 * - Резервное копирование
 */

import prisma from './prisma';
import { getTaskQueue } from './task-queue';

export interface CronJobConfig {
  name: string;
  schedule: string; // cron expression
  taskType: string;
  taskPayload?: any;
  enabled?: boolean;
}

interface ParsedCron {
  minute: number | '*';
  hour: number | '*';
  dayOfMonth: number | '*';
  month: number | '*';
  dayOfWeek: number | '*';
}

class CronScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private checkInterval: number = 60000; // 1 минута

  /**
   * Запустить планировщик
   */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    console.log('⏰ [Cron] Планировщик запущен');
    
    // Проверяем каждую минуту
    this.intervalId = setInterval(() => this.tick(), this.checkInterval);
    
    // Первая проверка сразу
    this.tick();
  }

  /**
   * Остановить планировщик
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    console.log('⏰ [Cron] Планировщик остановлен');
  }

  /**
   * Тик планировщика
   */
  private async tick(): Promise<void> {
    try {
      const now = new Date();
      
      // Получаем все активные задачи
      const jobs = await prisma.cronJob.findMany({
        where: { enabled: true }
      });

      for (const job of jobs) {
        if (this.shouldRun(job, now)) {
          await this.runJob(job);
        }
      }
    } catch (error) {
      console.error('⏰ [Cron] Ошибка при проверке:', error);
    }
  }

  /**
   * Проверить, должна ли задача запуститься
   */
  private shouldRun(job: any, now: Date): boolean {
    // Проверяем nextRunAt
    if (job.nextRunAt && new Date(job.nextRunAt) > now) {
      return false;
    }

    const parsed = this.parseCron(job.schedule);
    if (!parsed) return false;

    const minute = now.getMinutes();
    const hour = now.getHours();
    const dayOfMonth = now.getDate();
    const month = now.getMonth() + 1;
    const dayOfWeek = now.getDay();

    return (
      this.matchCronPart(parsed.minute, minute) &&
      this.matchCronPart(parsed.hour, hour) &&
      this.matchCronPart(parsed.dayOfMonth, dayOfMonth) &&
      this.matchCronPart(parsed.month, month) &&
      this.matchCronPart(parsed.dayOfWeek, dayOfWeek)
    );
  }

  /**
   * Проверка совпадения части cron
   */
  private matchCronPart(part: number | '*', value: number): boolean {
    if (part === '*') return true;
    return part === value;
  }

  /**
   * Парсинг cron выражения
   */
  private parseCron(expression: string): ParsedCron | null {
    try {
      const parts = expression.trim().split(/\s+/);
      if (parts.length !== 5) return null;

      const parse = (p: string): number | '*' => {
        if (p === '*') return '*';
        return parseInt(p, 10);
      };

      return {
        minute: parse(parts[0]),
        hour: parse(parts[1]),
        dayOfMonth: parse(parts[2]),
        month: parse(parts[3]),
        dayOfWeek: parse(parts[4])
      };
    } catch {
      return null;
    }
  }

  /**
   * Запустить задачу
   */
  private async runJob(job: any): Promise<void> {
    console.log(`⏰ [Cron] Запуск: ${job.name}`);
    
    try {
      const queue = getTaskQueue();
      
      // Добавляем задачу в очередь
      await queue.add(job.taskType, job.taskPayload ? JSON.parse(job.taskPayload) : {}, {
        priority: 'normal'
      });

      // Обновляем время следующего запуска
      const nextRun = this.calculateNextRun(job.schedule);
      
      await prisma.cronJob.update({
        where: { id: job.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: nextRun,
          runCount: { increment: 1 }
        }
      });

      console.log(`⏰ [Cron] Задача ${job.name} добавлена в очередь. Следующий запуск: ${nextRun}`);
    } catch (error: any) {
      console.error(`⏰ [Cron] Ошибка запуска ${job.name}:`, error);
      
      await prisma.cronJob.update({
        where: { id: job.id },
        data: { lastError: error.message }
      });
    }
  }

  /**
   * Вычислить следующее время запуска
   */
  private calculateNextRun(schedule: string): Date {
    const parsed = this.parseCron(schedule);
    if (!parsed) return new Date(Date.now() + 3600000); // +1 час по умолчанию

    const now = new Date();
    let next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Простая логика - добавляем минимум 1 минуту
    next.setMinutes(next.getMinutes() + 1);

    // Для простых интервалов (каждые N минут)
    if (parsed.minute !== '*' && parsed.hour === '*' && parsed.dayOfMonth === '*') {
      const interval = parsed.minute;
      next = new Date(now);
      next.setMinutes(Math.ceil(next.getMinutes() / interval) * interval);
      if (next <= now) {
        next.setMinutes(next.getMinutes() + interval);
      }
    }

    return next;
  }

  /**
   * Добавить cron задачу
   */
  async addJob(config: CronJobConfig): Promise<any> {
    const nextRun = this.calculateNextRun(config.schedule);
    
    const job = await prisma.cronJob.create({
      data: {
        id: this.generateId(),
        name: config.name,
        schedule: config.schedule,
        taskType: config.taskType,
        taskPayload: config.taskPayload ? JSON.stringify(config.taskPayload) : null,
        enabled: config.enabled ?? true,
        nextRunAt: nextRun
      }
    });

    console.log(`⏰ [Cron] Добавлена задача: ${config.name} (${config.schedule})`);
    return job;
  }

  /**
   * Обновить cron задачу
   */
  async updateJob(name: string, updates: Partial<CronJobConfig>): Promise<any> {
    const data: any = {};
    
    if (updates.schedule) data.schedule = updates.schedule;
    if (updates.taskType) data.taskType = updates.taskType;
    if (updates.taskPayload) data.taskPayload = JSON.stringify(updates.taskPayload);
    if (updates.enabled !== undefined) data.enabled = updates.enabled;

    if (updates.schedule) {
      data.nextRunAt = this.calculateNextRun(updates.schedule);
    }

    const job = await prisma.cronJob.update({
      where: { name },
      data
    });

    console.log(`⏰ [Cron] Обновлена задача: ${name}`);
    return job;
  }

  /**
   * Удалить cron задачу
   */
  async removeJob(name: string): Promise<void> {
    await prisma.cronJob.delete({
      where: { name }
    });

    console.log(`⏰ [Cron] Удалена задача: ${name}`);
  }

  /**
   * Получить все задачи
   */
  async getJobs(): Promise<any[]> {
    return prisma.cronJob.findMany({
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Инициализировать стандартные задачи
   */
  async initDefaultJobs(): Promise<void> {
    const defaultJobs: CronJobConfig[] = [
      {
        name: 'proxy-refresh',
        schedule: '*/30 * * * *', // каждые 30 минут
        taskType: 'proxy-refresh',
        enabled: true
      },
      {
        name: 'proxy-validate',
        schedule: '0 * * * *', // каждый час
        taskType: 'proxy-validate',
        enabled: true
      },
      {
        name: 'accounts-health-check',
        schedule: '*/15 * * * *', // каждые 15 минут
        taskType: 'accounts-health-check',
        enabled: true
      },
      {
        name: 'cleanup-old-tasks',
        schedule: '0 3 * * *', // в 3:00 каждый день
        taskType: 'cleanup-old-tasks',
        taskPayload: { olderThanDays: 7 },
        enabled: true
      },
      {
        name: 'backup-database',
        schedule: '0 */6 * * *', // каждые 6 часов
        taskType: 'backup-database',
        enabled: true
      },
      {
        name: 'daily-stats-reset',
        schedule: '0 0 * * *', // в полночь
        taskType: 'daily-stats-reset',
        enabled: true
      },
      // Новые задачи для очистки и метрик
      {
        name: 'dlq-cleanup',
        schedule: '0 4 * * *', // в 4:00 каждый день
        taskType: 'dlq-cleanup',
        taskPayload: { olderThanDays: 30 },
        enabled: true
      },
      {
        name: 'checkpoints-cleanup',
        schedule: '0 */12 * * *', // каждые 12 часов
        taskType: 'checkpoints-cleanup',
        enabled: true
      },
      {
        name: 'sticky-sessions-cleanup',
        schedule: '*/30 * * * *', // каждые 30 минут
        taskType: 'sticky-sessions-cleanup',
        enabled: true
      },
      {
        name: 'collect-metrics',
        schedule: '*/5 * * * *', // каждые 5 минут
        taskType: 'collect-metrics',
        enabled: true
      },
      {
        name: 'metrics-cleanup',
        schedule: '0 5 * * *', // в 5:00 каждый день
        taskType: 'metrics-cleanup',
        taskPayload: { olderThanDays: 30 },
        enabled: true
      }
    ];

    for (const jobConfig of defaultJobs) {
      const existing = await prisma.cronJob.findUnique({
        where: { name: jobConfig.name }
      });

      if (!existing) {
        await this.addJob(jobConfig);
      }
    }

    console.log('⏰ [Cron] Стандартные задачи инициализированы');
  }

  private generateId(): string {
    return `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton
let schedulerInstance: CronScheduler | null = null;

export function getCronScheduler(): CronScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new CronScheduler();
  }
  return schedulerInstance;
}

/**
 * Cron выражения - шпаргалка:
 * 
 * ┌───────────── минута (0 - 59)
 * │ ┌───────────── час (0 - 23)
 * │ │ ┌───────────── день месяца (1 - 31)
 * │ │ │ ┌───────────── месяц (1 - 12)
 * │ │ │ │ ┌───────────── день недели (0 - 6) (0 = воскресенье)
 * │ │ │ │ │
 * * * * * *
 * 
 * Примеры:
 * "0,5,10,15... * * * *" - каждые 5 минут
 * "0 * * * *"       - каждый час
 * "0 0,6,12,18 * * *" - каждые 6 часов
 * "0 0 * * *"       - каждый день в полночь
 * "0 9 * * 1-5"     - в 9:00 по будням
 * "0 3 * * *"       - каждый день в 3:00
 */
