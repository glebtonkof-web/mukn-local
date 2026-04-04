/**
 * Webhook Dispatcher Library
 * Handles webhook registration, event dispatching, and retry logic
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Supported webhook events
export const WEBHOOK_EVENTS = [
  { value: 'campaign.started', label: 'Кампания запущена', description: 'При старте кампании' },
  { value: 'campaign.paused', label: 'Кампания приостановлена', description: 'При паузе кампании' },
  { value: 'campaign.completed', label: 'Кампания завершена', description: 'При завершении кампании' },
  { value: 'account.banned', label: 'Аккаунт забанен', description: 'При бане аккаунта' },
  { value: 'account.limited', label: 'Аккаунт ограничен', description: 'При ограничении аккаунта' },
  { value: 'lead.created', label: 'Лид создан', description: 'При создании нового лида' },
  { value: 'comment.posted', label: 'Комментарий отправлен', description: 'При отправке комментария' },
  { value: 'comment.deleted', label: 'Комментарий удалён', description: 'При удалении комментария' },
  { value: 'influencer.created', label: 'Инфлюенсер создан', description: 'При создании инфлюенсера' },
  { value: 'influencer.banned', label: 'Инфлюенсер забанен', description: 'При бане инфлюенсера' },
  { value: 'offer.clicked', label: 'Клик по офферу', description: 'При клике по офферу' },
  { value: 'offer.converted', label: 'Конверсия оффера', description: 'При конверсии по офферу' },
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number]['value'];

// Webhook payload type
export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

// In-memory queue for retry processing
const deliveryQueue: Map<string, NodeJS.Timeout> = new Map();

/**
 * Generate signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Webhook Dispatcher class
 */
export class WebhookDispatcher {
  /**
   * Dispatch event to all subscribed webhooks
   */
  async dispatch(
    event: WebhookEventType,
    data: Record<string, unknown>,
    options?: { userId?: string }
  ): Promise<{ dispatched: number; failed: number }> {
    try {
      // Find all active webhooks subscribed to this event
      const webhooks = await db.webhook.findMany({
        where: {
          isActive: true,
          ...(options?.userId ? { userId: options.userId } : {}),
        },
      });

      // Filter webhooks that are subscribed to this event
      const subscribedWebhooks = webhooks.filter(wh => {
        try {
          const events = JSON.parse(wh.events) as string[];
          return events.includes(event) || events.includes('*');
        } catch {
          return false;
        }
      });

      let dispatched = 0;
      let failed = 0;

      // Dispatch to each webhook
      for (const webhook of subscribedWebhooks) {
        const success = await this.dispatchToWebhook(webhook, event, data);
        if (success) {
          dispatched++;
        } else {
          failed++;
        }
      }

      logger.info('Webhook dispatch completed', { event, dispatched, failed });
      return { dispatched, failed };
    } catch (error) {
      logger.error('Webhook dispatch error', error as Error, { event });
      return { dispatched: 0, failed: 0 };
    }
  }

  /**
   * Dispatch to a specific webhook
   */
  private async dispatchToWebhook(
    webhook: { id: string; url: string; secret: string | null; retryCount: number; retryDelay: number; timeout: number },
    event: WebhookEventType,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);
    const signature = webhook.secret ? generateSignature(payloadString, webhook.secret) : undefined;

    // Create delivery log
    const deliveryLog = await db.webhookDeliveryLog.create({
      data: {
        webhookId: webhook.id,
        eventType: event,
        payload: payloadString,
        status: 'pending',
        attemptCount: 1,
        maxAttempts: webhook.retryCount + 1,
      },
    });

    // Attempt delivery
    const result = await this.sendWebhook(webhook, payloadString, signature);

    // Update delivery log
    await db.webhookDeliveryLog.update({
      where: { id: deliveryLog.id },
      data: {
        status: result.success ? 'success' : 'failed',
        statusCode: result.statusCode,
        response: result.response?.substring(0, 1000),
        error: result.error,
        sentAt: result.sentAt,
        deliveredAt: result.success ? new Date() : undefined,
      },
    });

    // Update webhook stats
    await db.webhook.update({
      where: { id: webhook.id },
      data: {
        totalSent: { increment: 1 },
        totalSuccess: result.success ? { increment: 1 } : undefined,
        totalFailed: result.success ? undefined : { increment: 1 },
        lastSentAt: new Date(),
        lastSuccessAt: result.success ? new Date() : undefined,
        lastError: result.success ? null : result.error,
      },
    });

    // Schedule retry if failed
    if (!result.success && webhook.retryCount > 0) {
      this.scheduleRetry(deliveryLog.id, webhook, payloadString, signature, 1);
    }

    return result.success;
  }

  /**
   * Send webhook request
   */
  private async sendWebhook(
    webhook: { url: string; timeout: number },
    payload: string,
    signature?: string
  ): Promise<{
    success: boolean;
    statusCode?: number;
    response?: string;
    error?: string;
    sentAt: Date;
  }> {
    const sentAt = new Date();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature || '',
          'X-Webhook-Timestamp': sentAt.toISOString(),
          'User-Agent': 'MUKN-Webhook/1.0',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseText,
        sentAt,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        sentAt,
      };
    }
  }

  /**
   * Schedule retry for failed webhook
   */
  private scheduleRetry(
    deliveryLogId: string,
    webhook: { id: string; url: string; timeout: number; retryDelay: number; retryCount: number },
    payload: string,
    signature: string | undefined,
    attemptNumber: number
  ): void {
    // Cancel existing retry if any
    const existingTimeout = deliveryQueue.get(deliveryLogId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new retry
    const delay = webhook.retryDelay * Math.pow(2, attemptNumber - 1); // Exponential backoff
    const timeout = setTimeout(async () => {
      deliveryQueue.delete(deliveryLogId);

      // Get current delivery log state
      const deliveryLog = await db.webhookDeliveryLog.findUnique({
        where: { id: deliveryLogId },
      });

      if (!deliveryLog || deliveryLog.status === 'success') {
        return;
      }

      // Check if cancelled
      if (deliveryLog.status === 'cancelled') {
        return;
      }

      // Update attempt count
      await db.webhookDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: 'retrying',
          attemptCount: attemptNumber + 1,
          nextRetryAt: null,
        },
      });

      // Attempt delivery
      const result = await this.sendWebhook(webhook, payload, signature);

      if (result.success || attemptNumber >= webhook.retryCount) {
        // Final status
        await db.webhookDeliveryLog.update({
          where: { id: deliveryLogId },
          data: {
            status: result.success ? 'success' : 'failed',
            statusCode: result.statusCode,
            response: result.response?.substring(0, 1000),
            error: result.error,
            deliveredAt: result.success ? new Date() : undefined,
          },
        });
      } else {
        // Schedule next retry
        this.scheduleRetry(deliveryLogId, webhook, payload, signature, attemptNumber + 1);
      }
    }, delay);

    deliveryQueue.set(deliveryLogId, timeout);

    // Update next retry time
    db.webhookDeliveryLog.update({
      where: { id: deliveryLogId },
      data: { nextRetryAt: new Date(Date.now() + delay) },
    }).catch(err => logger.error('Failed to update retry time', err as Error));
  }

  /**
   * Cancel pending retries for a webhook
   */
  cancelRetries(webhookId: string): void {
    // This would need to be implemented with a proper job queue
    // For now, we just mark them as cancelled in the database
    db.webhookDeliveryLog.updateMany({
      where: {
        webhookId,
        status: 'retrying',
      },
      data: { status: 'cancelled' as string },
    }).catch(err => logger.error('Failed to cancel retries', err as Error));
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(
    url: string,
    secret?: string
  ): Promise<{
    success: boolean;
    statusCode?: number;
    response?: string;
    error?: string;
    latency?: number;
  }> {
    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { test: true, message: 'Test webhook from МУКН | Трафик' },
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = secret ? generateSignature(payloadString, secret) : undefined;

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature || '',
          'X-Webhook-Test': 'true',
          'User-Agent': 'MUKN-Webhook/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      const latency = Date.now() - startTime;

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseText.substring(0, 500),
        latency,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        latency: Date.now() - startTime,
      };
    }
  }
}

// Export singleton instance
export const webhookDispatcher = new WebhookDispatcher();

/**
 * Database helper functions
 */
export async function createWebhook(data: {
  userId: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}) {
  return db.webhook.create({
    data: {
      userId: data.userId,
      name: data.name,
      url: data.url,
      secret: data.secret || crypto.randomBytes(32).toString('hex'),
      events: JSON.stringify(data.events),
      retryCount: data.retryCount || 3,
      retryDelay: data.retryDelay || 1000,
      timeout: data.timeout || 5000,
    },
  });
}

export async function updateWebhook(
  webhookId: string,
  data: Partial<{
    name: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
    retryCount: number;
    retryDelay: number;
    timeout: number;
  }>
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.events) {
    updateData.events = JSON.stringify(data.events);
  }

  return db.webhook.update({
    where: { id: webhookId },
    data: updateData,
  });
}

export async function deleteWebhook(webhookId: string) {
  return db.webhook.delete({
    where: { id: webhookId },
  });
}

export async function getWebhook(webhookId: string) {
  return db.webhook.findUnique({
    where: { id: webhookId },
    include: {
      deliveryLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
}

export async function listWebhooks(userId: string) {
  return db.webhook.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { deliveryLogs: true },
      },
    },
  });
}
