/**
 * Batch Processor Library
 * Handles mass operations on accounts, campaigns, and comments
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { webhookDispatcher } from './webhook-dispatcher';
import { nanoid } from 'nanoid';

// Supported batch operation types
export const BATCH_OPERATION_TYPES = [
  { value: 'account_action', label: 'Действия с аккаунтами', description: 'Массовые операции с аккаунтами' },
  { value: 'campaign_action', label: 'Действия с кампаниями', description: 'Массовые операции с кампаниями' },
  { value: 'comment_generate', label: 'Генерация комментариев', description: 'Массовая генерация комментариев' },
] as const;

// Supported batch actions
export const BATCH_ACTIONS = {
  account: [
    { value: 'pause', label: 'Приостановить', description: 'Приостановить все активности' },
    { value: 'resume', label: 'Возобновить', description: 'Возобновить активности' },
    { value: 'warm', label: 'Прогреть', description: 'Запустить прогрев' },
    { value: 'delete', label: 'Удалить', description: 'Удалить выбранные аккаунты' },
    { value: 'change_proxy', label: 'Сменить прокси', description: 'Сменить прокси для аккаунтов' },
    { value: 'export', label: 'Экспорт', description: 'Экспортировать данные' },
  ],
  campaign: [
    { value: 'pause', label: 'Приостановить', description: 'Приостановить кампании' },
    { value: 'resume', label: 'Возобновить', description: 'Возобновить кампании' },
    { value: 'complete', label: 'Завершить', description: 'Завершить кампании' },
    { value: 'delete', label: 'Удалить', description: 'Удалить кампании' },
    { value: 'duplicate', label: 'Дублировать', description: 'Создать копии кампаний' },
    { value: 'export', label: 'Экспорт', description: 'Экспортировать данные' },
  ],
  comment: [
    { value: 'generate', label: 'Сгенерировать', description: 'Сгенерировать комментарии' },
    { value: 'approve', label: 'Одобрить', description: 'Одобрить ожидающие комментарии' },
    { value: 'reject', label: 'Отклонить', description: 'Отклонить ожидающие комментарии' },
    { value: 'delete', label: 'Удалить', description: 'Удалить комментарии' },
  ],
} as const;

// In-memory batch queue (for SQLite)
const batchQueue: Map<string, { status: string; process: Promise<void> | null }> = new Map();

// Progress callbacks for real-time updates
const progressCallbacks: Map<string, (progress: BatchProgress) => void> = new Map();

export interface BatchProgress {
  operationId: string;
  status: string;
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  progressPercent: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
}

/**
 * Batch Processor class
 */
export class BatchProcessor {
  private batchSize: number;
  private delayBetweenBatches: number;

  constructor(options?: { batchSize?: number; delayBetweenBatches?: number }) {
    this.batchSize = options?.batchSize || 5;
    this.delayBetweenBatches = options?.delayBetweenBatches || 100;
  }

  /**
   * Register progress callback
   */
  onProgress(operationId: string, callback: (progress: BatchProgress) => void): void {
    progressCallbacks.set(operationId, callback);
  }

  /**
   * Unregister progress callback
   */
  offProgress(operationId: string): void {
    progressCallbacks.delete(operationId);
  }

  /**
   * Emit progress update
   */
  private emitProgress(progress: BatchProgress): void {
    const callback = progressCallbacks.get(progress.operationId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Start batch operation
   */
  async startOperation(
    userId: string,
    type: string,
    action: string,
    targetIds: string[],
    parameters?: Record<string, unknown>
  ): Promise<{ operationId: string; status: string }> {
    // Create operation record
    const operation = await db.batchOperation.create({
      data: {
        id: nanoid(),
        userId,
        operationType: type,
        type: type,
        entityType: 'generic',
        entityIds: JSON.stringify(targetIds),
        targetIds: JSON.stringify(targetIds),
        action,
        parameters: parameters ? JSON.stringify(parameters) : null,
        status: 'pending',
        totalItems: targetIds.length,
        processedItems: 0,
        successItems: 0,
        failedItems: 0,
        progressPercent: 0,
        updatedAt: new Date(),
      },
    });

    // Start processing asynchronously
    const processPromise = this.processOperation(operation.id);
    batchQueue.set(operation.id, { status: 'running', process: processPromise });

    return { operationId: operation.id, status: 'pending' };
  }

  /**
   * Process batch operation
   */
  private async processOperation(operationId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Get operation details
      const operation = await db.batchOperation.findUnique({
        where: { id: operationId },
      });

      if (!operation) {
        throw new Error('Operation not found');
      }

      // Update status to running
      await db.batchOperation.update({
        where: { id: operationId },
        data: {
          status: 'running',
          startedAt: new Date(),
          estimatedEndAt: new Date(Date.now() + operation.totalItems * 5000),
        },
      });

      const targetIds = JSON.parse(operation.targetIds || '[]') as string[];
      const parameters = operation.parameters ? JSON.parse(operation.parameters) : {};
      const results: { id: string; success: boolean; result?: unknown; error?: string }[] = [];
      const errors: { id: string; error: string }[] = [];

      let processedItems = 0;
      let successItems = 0;
      let failedItems = 0;

      // Process in batches
      for (let i = 0; i < targetIds.length; i += this.batchSize) {
        // Check if cancelled
        const currentOp = await db.batchOperation.findUnique({
          where: { id: operationId },
        });

        if (currentOp?.status === 'cancelled') {
          logger.info('Batch operation cancelled', { operationId });
          return;
        }

        const batch = targetIds.slice(i, i + this.batchSize);

        // Process batch
        for (const targetId of batch) {
          try {
            const result = await this.processItem(
              operation.type || operation.operationType,
              operation.action,
              targetId,
              parameters
            );

            results.push({ id: targetId, success: true, result });
            successItems++;
          } catch (error) {
            const errorMessage = (error as Error).message;
            results.push({ id: targetId, success: false, error: errorMessage });
            errors.push({ id: targetId, error: errorMessage });
            failedItems++;
          }

          processedItems++;

          // Update progress
          const progressPercent = Math.round((processedItems / operation.totalItems) * 100);
          const elapsed = Date.now() - startTime;
          const estimatedTimeRemaining = Math.round((elapsed / processedItems) * (operation.totalItems - processedItems));

          await db.batchOperation.update({
            where: { id: operationId },
            data: {
              processedItems,
              successItems,
              failedItems,
              progressPercent,
            },
          });

          this.emitProgress({
            operationId,
            status: 'running',
            totalItems: operation.totalItems,
            processedItems,
            successItems,
            failedItems,
            progressPercent,
            currentItem: targetId,
            estimatedTimeRemaining,
          });
        }

        // Delay between batches
        if (i + this.batchSize < targetIds.length) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
        }
      }

      // Update final status
      const finalStatus = failedItems === 0 ? 'completed' :
                         successItems === 0 ? 'failed' : 'completed';

      await db.batchOperation.update({
        where: { id: operationId },
        data: {
          status: finalStatus,
          results: JSON.stringify(results),
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
          completedAt: new Date(),
          progressPercent: 100,
        },
      });

      this.emitProgress({
        operationId,
        status: finalStatus,
        totalItems: operation.totalItems,
        processedItems,
        successItems,
        failedItems,
        progressPercent: 100,
      });

      batchQueue.delete(operationId);

      logger.info('Batch operation completed', {
        operationId,
        type: operation.type,
        action: operation.action,
        totalItems: operation.totalItems,
        successItems,
        failedItems,
      });

      // Trigger webhook events for certain operations
      if (operation.type === 'campaign_action' && (operation.action === 'pause' || operation.action === 'resume')) {
        await webhookDispatcher.dispatch(
          operation.action === 'pause' ? 'campaign.paused' : 'campaign.started',
          { operationId, affectedCount: successItems }
        );
      }
    } catch (error) {
      logger.error('Batch operation failed', error as Error, { operationId });

      await db.batchOperation.update({
        where: { id: operationId },
        data: {
          status: 'failed',
          errors: JSON.stringify([{ error: (error as Error).message }]),
          completedAt: new Date(),
        },
      });

      batchQueue.delete(operationId);
    }
  }

  /**
   * Process single item
   */
  private async processItem(
    type: string,
    action: string,
    targetId: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    switch (type) {
      case 'account_action':
        return this.processAccountAction(action, targetId, parameters);

      case 'campaign_action':
        return this.processCampaignAction(action, targetId, parameters);

      case 'comment_generate':
        return this.processCommentAction(action, targetId, parameters);

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Process account action
   */
  private async processAccountAction(
    action: string,
    accountId: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    const account = await db.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    switch (action) {
      case 'pause':
        await db.account.update({
          where: { id: accountId },
          data: { status: 'limited' },
        });
        return { status: 'paused' };

      case 'resume':
        await db.account.update({
          where: { id: accountId },
          data: { status: 'active' },
        });
        return { status: 'resumed' };

      case 'warm':
        await db.account.update({
          where: { id: accountId },
          data: {
            status: 'warming',
            warmingStartedAt: new Date(),
            warmingProgress: 0,
          },
        });
        return { status: 'warming_started' };

      case 'delete':
        await db.account.delete({
          where: { id: accountId },
        });
        return { status: 'deleted' };

      case 'change_proxy':
        const { proxyHost, proxyPort, proxyUsername, proxyPassword, proxyType } = parameters;
        await db.account.update({
          where: { id: accountId },
          data: {
            proxyHost: proxyHost as string | null,
            proxyPort: proxyPort as number | null,
            proxyUsername: proxyUsername as string | null,
            proxyPassword: proxyPassword as string | null,
            proxyType: proxyType as string | null,
          },
        });
        return { status: 'proxy_changed', proxy: `${proxyHost}:${proxyPort}` };

      case 'export':
        return {
          id: account.id,
          platform: account.platform,
          username: account.username,
          status: account.status,
          banRisk: account.banRisk,
        };

      default:
        throw new Error(`Unknown account action: ${action}`);
    }
  }

  /**
   * Process campaign action
   */
  private async processCampaignAction(
    action: string,
    campaignId: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    switch (action) {
      case 'pause':
        await db.campaign.update({
          where: { id: campaignId },
          data: { status: 'paused' },
        });
        return { status: 'paused' };

      case 'resume':
        await db.campaign.update({
          where: { id: campaignId },
          data: { status: 'active' },
        });
        return { status: 'resumed' };

      case 'complete':
        await db.campaign.update({
          where: { id: campaignId },
          data: { status: 'completed', endDate: new Date() },
        });
        return { status: 'completed' };

      case 'delete':
        await db.campaign.delete({
          where: { id: campaignId },
        });
        return { status: 'deleted' };

      case 'duplicate':
        const newCampaign = await db.campaign.create({
          data: {
            id: nanoid(),
            userId: campaign.userId,
            name: `${campaign.name} (копия)`,
            description: campaign.description,
            type: campaign.type,
            niche: campaign.niche,
            geo: campaign.geo,
            budget: campaign.budget,
            currency: campaign.currency,
            status: 'draft',
            updatedAt: new Date(),
          },
        });
        return { status: 'duplicated', newCampaignId: newCampaign.id };

      case 'export':
        return {
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          niche: campaign.niche,
          geo: campaign.geo,
          budget: campaign.budget,
          leadsCount: campaign.leadsCount,
          revenue: campaign.revenue,
        };

      default:
        throw new Error(`Unknown campaign action: ${action}`);
    }
  }

  /**
   * Process comment action
   */
  private async processCommentAction(
    action: string,
    targetId: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    switch (action) {
      case 'generate':
        // Generate comment using AI
        const { influencerId, targetPlatform, targetType, channelId, postId } = parameters;

        const influencer = await db.influencer.findUnique({
          where: { id: influencerId as string },
        });

        if (!influencer) {
          throw new Error('Influencer not found');
        }

        // Create pending comment
        const comment = await db.comment.create({
          data: {
            id: nanoid(),
            influencerId: influencerId as string,
            content: '', // Will be filled by AI
            targetPlatform: targetPlatform as string,
            targetType: targetType as string,
            targetId: `${channelId}:${postId}`,
            status: 'pending',
            aiGenerated: true,
          },
        });

        return { commentId: comment.id, status: 'generated' };

      case 'approve':
        await db.comment.update({
          where: { id: targetId },
          data: { status: 'pending' }, // Ready to post
        });
        return { status: 'approved' };

      case 'reject':
        await db.comment.update({
          where: { id: targetId },
          data: { status: 'failed' },
        });
        return { status: 'rejected' };

      case 'delete':
        await db.comment.delete({
          where: { id: targetId },
        });
        return { status: 'deleted' };

      default:
        throw new Error(`Unknown comment action: ${action}`);
    }
  }

  /**
   * Cancel operation
   */
  async cancelOperation(operationId: string, reason?: string): Promise<boolean> {
    const operation = await db.batchOperation.findUnique({
      where: { id: operationId },
    });

    if (!operation || operation.status !== 'running') {
      return false;
    }

    await db.batchOperation.update({
      where: { id: operationId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || 'User cancelled',
      },
    });

    batchQueue.delete(operationId);

    return true;
  }

  /**
   * Get operation status
   */
  async getOperationStatus(operationId: string): Promise<{
    operation: {
      id: string;
      type: string;
      action: string;
      status: string;
      totalItems: number;
      processedItems: number;
      successItems: number;
      failedItems: number;
      progressPercent: number;
      results?: unknown[];
      errors?: { id: string; error: string }[];
      startedAt?: Date;
      completedAt?: Date;
      estimatedEndAt?: Date;
      canCancel: boolean;
    } | null;
    queueStatus?: string;
  }> {
    const operation = await db.batchOperation.findUnique({
      where: { id: operationId },
    });

    if (!operation) {
      return { operation: null };
    }

    const queueStatus = batchQueue.get(operationId)?.status;

    return {
      operation: {
        id: operation.id,
        type: operation.type || operation.operationType,
        action: operation.action,
        status: operation.status,
        totalItems: operation.totalItems,
        processedItems: operation.processedItems,
        successItems: operation.successItems,
        failedItems: operation.failedItems,
        progressPercent: operation.progressPercent,
        results: operation.results ? JSON.parse(operation.results) : undefined,
        errors: operation.errors ? JSON.parse(operation.errors) : undefined,
        startedAt: operation.startedAt || undefined,
        completedAt: operation.completedAt || undefined,
        estimatedEndAt: operation.estimatedEndAt || undefined,
        canCancel: operation.canCancel && operation.status === 'running',
      },
      queueStatus,
    };
  }

  /**
   * Get operation history
   */
  async getOperationHistory(
    userId: string,
    options?: { type?: string; status?: string; limit?: number; offset?: number }
  ): Promise<{
    operations: {
      id: string;
      type: string;
      action: string;
      status: string;
      totalItems: number;
      successItems: number;
      failedItems: number;
      progressPercent: number;
      createdAt: Date;
      completedAt?: Date;
    }[];
    total: number;
  }> {
    const where: Record<string, unknown> = { userId };
    if (options?.type) where.type = options.type;
    if (options?.status) where.status = options.status;

    const operations = await db.batchOperation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    const total = await db.batchOperation.count({ where });

    return {
      operations: operations.map(op => ({
        id: op.id,
        type: op.type || op.operationType,
        action: op.action,
        status: op.status,
        totalItems: op.totalItems,
        successItems: op.successItems,
        failedItems: op.failedItems,
        progressPercent: op.progressPercent,
        createdAt: op.createdAt,
        completedAt: op.completedAt || undefined,
      })),
      total,
    };
  }
}

// Export singleton instance
export const batchProcessor = new BatchProcessor();
