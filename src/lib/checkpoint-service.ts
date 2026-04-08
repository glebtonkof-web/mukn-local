/**
 * Checkpoint Service
 * 
 * Сохраняет прогресс длительных операций (регистрация, прогрев и т.д.)
 * для возможности восстановления после сбоев.
 */

import prisma from './prisma';

export type CheckpointStatus = 'in_progress' | 'completed' | 'failed' | 'expired';

export interface CheckpointData {
  id: string;
  entityType: string;
  entityId: string;
  stepName: string;
  stepNumber: number;
  totalSteps: number;
  data?: any;
  status: CheckpointStatus;
  error?: string;
  canResume: boolean;
  startedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export interface CheckpointConfig {
  entityType: string;
  entityId: string;
  totalSteps: number;
  expiresIn?: number; // TTL в секундах
}

class CheckpointService {
  /**
   * Создать или обновить чекпоинт
   */
  async save(
    entityType: string,
    entityId: string,
    stepName: string,
    stepNumber: number,
    totalSteps: number,
    data?: any,
    options?: {
      expiresIn?: number;
    }
  ): Promise<CheckpointData> {
    const expiresAt = options?.expiresIn
      ? new Date(Date.now() + options.expiresIn * 1000)
      : undefined;

    const checkpoint = await prisma.checkpoint.upsert({
      where: {
        entityType_entityId_stepName: {
          entityType,
          entityId,
          stepName
        }
      },
      create: {
        id: this.generateId(),
        entityType,
        entityId,
        stepName,
        stepNumber,
        totalSteps,
        data: data ? JSON.stringify(data) : null,
        status: 'in_progress',
        canResume: true,
        expiresAt
      },
      update: {
        stepNumber,
        totalSteps,
        data: data ? JSON.stringify(data) : null,
        status: 'in_progress',
        updatedAt: new Date(),
        expiresAt
      }
    });

    console.log(`📍 [Checkpoint] Сохранен: ${entityType}/${entityId} шаг ${stepNumber}/${totalSteps} (${stepName})`);

    return this.toCheckpointData(checkpoint);
  }

  /**
   * Получить последний чекпоинт для сущности
   */
  async getLatest(entityType: string, entityId: string): Promise<CheckpointData | null> {
    const checkpoint = await prisma.checkpoint.findFirst({
      where: {
        entityType,
        entityId,
        status: 'in_progress',
        canResume: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { stepNumber: 'desc' }
    });

    if (!checkpoint) return null;

    return this.toCheckpointData(checkpoint);
  }

  /**
   * Получить все чекпоинты для сущности
   */
  async getAll(entityType: string, entityId: string): Promise<CheckpointData[]> {
    const checkpoints = await prisma.checkpoint.findMany({
      where: { entityType, entityId },
      orderBy: { stepNumber: 'asc' }
    });

    return checkpoints.map(this.toCheckpointData);
  }

  /**
   * Пометить чекпоинт как завершенный
   */
  async complete(entityType: string, entityId: string, stepName: string): Promise<boolean> {
    try {
      await prisma.checkpoint.update({
        where: {
          entityType_entityId_stepName: {
            entityType,
            entityId,
            stepName
          }
        },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });

      console.log(`✅ [Checkpoint] Завершен: ${entityType}/${entityId} (${stepName})`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Пометить чекпоинт как failed
   */
  async fail(
    entityType: string,
    entityId: string,
    stepName: string,
    error: string,
    canResume: boolean = true
  ): Promise<boolean> {
    try {
      await prisma.checkpoint.update({
        where: {
          entityType_entityId_stepName: {
            entityType,
            entityId,
            stepName
          }
        },
        data: {
          status: 'failed',
          error,
          canResume
        }
      });

      console.log(`❌ [Checkpoint] Ошибка: ${entityType}/${entityId} (${stepName}) - ${error}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Проверить, можно ли возобновить операцию
   */
  async canResume(entityType: string, entityId: string): Promise<{ canResume: boolean; step?: CheckpointData }> {
    const latest = await this.getLatest(entityType, entityId);

    if (!latest) {
      return { canResume: false };
    }

    if (latest.status === 'in_progress' && latest.canResume) {
      return { canResume: true, step: latest };
    }

    return { canResume: false, step: latest };
  }

  /**
   * Возобновить операцию с последнего чекпоинта
   */
  async resume<T>(
    entityType: string,
    entityId: string,
    resumeHandler: (checkpoint: CheckpointData) => Promise<T>
  ): Promise<T | null> {
    const { canResume, step } = await this.canResume(entityType, entityId);

    if (!canResume || !step) {
      console.log(`⚠️ [Checkpoint] Невозможно возобновить: ${entityType}/${entityId}`);
      return null;
    }

    console.log(`🔄 [Checkpoint] Возобновление: ${entityType}/${entityId} с шага ${step.stepNumber}`);

    try {
      const result = await resumeHandler(step);
      await this.complete(entityType, entityId, step.stepName);
      return result;
    } catch (error: any) {
      await this.fail(entityType, entityId, step.stepName, error.message);
      throw error;
    }
  }

  /**
   * Удалить чекпоинты для сущности
   */
  async clear(entityType: string, entityId: string): Promise<number> {
    const result = await prisma.checkpoint.deleteMany({
      where: { entityType, entityId }
    });

    console.log(`🧹 [Checkpoint] Удалено ${result.count} чекпоинтов для ${entityType}/${entityId}`);
    return result.count;
  }

  /**
   * Очистить истекшие чекпоинты
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.checkpoint.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    console.log(`🧹 [Checkpoint] Удалено ${result.count} истекших чекпоинтов`);
    return result.count;
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{
    total: number;
    inProgress: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    const [total, inProgress, completed, failed, byType] = await Promise.all([
      prisma.checkpoint.count(),
      prisma.checkpoint.count({ where: { status: 'in_progress' } }),
      prisma.checkpoint.count({ where: { status: 'completed' } }),
      prisma.checkpoint.count({ where: { status: 'failed' } }),
      this.getStatsByType()
    ]);

    return { total, inProgress, completed, failed, byType };
  }

  private async getStatsByType(): Promise<Record<string, number>> {
    const entries = await prisma.checkpoint.groupBy({
      by: ['entityType'],
      _count: { entityType: true }
    });

    const result: Record<string, number> = {};
    for (const entry of entries) {
      result[entry.entityType] = entry._count.entityType;
    }

    return result;
  }

  /**
   * Создать сессию регистрации с чекпоинтами
   */
  async createRegistrationSession(
    simCardId: string,
    platform: string,
    deviceId: string,
    steps: string[]
  ): Promise<string> {
    const sessionId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Создаем запись в RegistrationSession
    await prisma.registrationSession.create({
      data: {
        id: sessionId,
        simCardId,
        platform,
        currentStep: steps[0] || 'init',
        deviceId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
      }
    });

    // Создаем начальный чекпоинт
    await this.save(
      'registration',
      sessionId,
      'init',
      0,
      steps.length,
      { simCardId, platform, deviceId }
    );

    console.log(`📝 [Checkpoint] Создана сессия регистрации: ${sessionId}`);

    return sessionId;
  }

  /**
   * Обновить прогресс регистрации
   */
  async updateRegistrationProgress(
    sessionId: string,
    stepName: string,
    stepNumber: number,
    totalSteps: number,
    data?: any
  ): Promise<void> {
    // Обновляем сессию
    await prisma.registrationSession.update({
      where: { id: sessionId },
      data: {
        currentStep: stepName,
        lastActivityAt: new Date(),
        stepData: data ? JSON.stringify(data) : null
      }
    });

    // Сохраняем чекпоинт
    const session = await prisma.registrationSession.findUnique({
      where: { id: sessionId }
    });

    if (session) {
      await this.save(
        'registration',
        sessionId,
        stepName,
        stepNumber,
        totalSteps,
        data
      );
    }
  }

  /**
   * Получить активные сессии регистрации
   */
  async getActiveRegistrations(): Promise<any[]> {
    return prisma.registrationSession.findMany({
      where: {
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      orderBy: { startedAt: 'desc' }
    });
  }

  private toCheckpointData(checkpoint: any): CheckpointData {
    return {
      id: checkpoint.id,
      entityType: checkpoint.entityType,
      entityId: checkpoint.entityId,
      stepName: checkpoint.stepName,
      stepNumber: checkpoint.stepNumber,
      totalSteps: checkpoint.totalSteps,
      data: checkpoint.data ? JSON.parse(checkpoint.data) : undefined,
      status: checkpoint.status as CheckpointStatus,
      error: checkpoint.error || undefined,
      canResume: checkpoint.canResume,
      startedAt: checkpoint.startedAt,
      completedAt: checkpoint.completedAt || undefined,
      expiresAt: checkpoint.expiresAt || undefined
    };
  }

  private generateId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton
let checkpointInstance: CheckpointService | null = null;

export function getCheckpointService(): CheckpointService {
  if (!checkpointInstance) {
    checkpointInstance = new CheckpointService();
  }
  return checkpointInstance;
}

export { CheckpointService };
