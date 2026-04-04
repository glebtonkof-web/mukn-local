/**
 * Webhooks API Endpoint
 * Handles webhook CRUD operations and testing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  webhookDispatcher,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhook,
  listWebhooks,
  WEBHOOK_EVENTS,
  WebhookEventType,
} from '@/lib/webhook-dispatcher';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET /api/webhooks
 * List webhooks or get specific webhook
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const webhookId = searchParams.get('id');
    const userId = searchParams.get('userId') || 'default-user';
    const action = searchParams.get('action');

    // Get available events
    if (action === 'events') {
      return NextResponse.json({
        events: WEBHOOK_EVENTS,
      });
    }

    // Get specific webhook
    if (webhookId) {
      const webhook = await getWebhook(webhookId);

      if (!webhook) {
        return NextResponse.json(
          { error: 'Webhook not found' },
          { status: 404 }
        );
      }

      // Parse events
      let events: string[] = [];
      try {
        events = JSON.parse(webhook.events);
      } catch {
        events = [];
      }

      return NextResponse.json({
        webhook: {
          id: webhook.id,
          userId: webhook.userId,
          name: webhook.name,
          url: webhook.url,
          hasSecret: !!webhook.secret,
          events,
          isActive: webhook.isActive,
          retryCount: webhook.retryCount,
          retryDelay: webhook.retryDelay,
          timeout: webhook.timeout,
          totalSent: webhook.totalSent,
          totalSuccess: webhook.totalSuccess,
          totalFailed: webhook.totalFailed,
          lastSentAt: webhook.lastSentAt,
          lastSuccessAt: webhook.lastSuccessAt,
          lastError: webhook.lastError,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
          deliveryLogs: webhook.WebhookDeliveryLog.map(log => ({
            id: log.id,
            eventType: log.eventType,
            status: log.status,
            statusCode: log.statusCode,
            attemptCount: log.attemptCount,
            error: log.error,
            sentAt: log.sentAt,
            deliveredAt: log.deliveredAt,
            createdAt: log.createdAt,
          })),
        },
      });
    }

    // List all webhooks for user
    const webhooks = await listWebhooks(userId);

    return NextResponse.json({
      webhooks: webhooks.map(wh => {
        let events: string[] = [];
        try {
          events = JSON.parse(wh.events);
        } catch {
          events = [];
        }

        return {
          id: wh.id,
          name: wh.name,
          url: wh.url,
          hasSecret: !!wh.secret,
          events,
          isActive: wh.isActive,
          totalSent: wh.totalSent,
          totalSuccess: wh.totalSuccess,
          totalFailed: wh.totalFailed,
          lastSentAt: wh.lastSentAt,
          deliveryLogsCount: wh._count.WebhookDeliveryLog,
          createdAt: wh.createdAt,
        };
      }),
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (error) {
    logger.error('Failed to get webhooks', error as Error);
    return NextResponse.json(
      { error: 'Failed to get webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks
 * Create new webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, url, secret, events, retryCount, retryDelay, timeout, test } = body;

    // Test mode: just test the URL without creating
    if (test && url) {
      const result = await webhookDispatcher.testWebhook(url, secret);

      return NextResponse.json({
        success: result.success,
        statusCode: result.statusCode,
        response: result.response,
        error: result.error,
        latency: result.latency,
      });
    }

    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Name, URL, and at least one event are required' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = WEBHOOK_EVENTS.map(e => e.value);
    const invalidEvents = events.filter((e: string) => e !== '*' && !validEvents.includes(e as WebhookEventType));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create webhook
    const webhook = await createWebhook({
      userId: userId || 'default-user',
      name,
      url,
      secret,
      events,
      retryCount: retryCount ?? 3,
      retryDelay: retryDelay ?? 1000,
      timeout: timeout ?? 5000,
    });

    // Test the webhook
    const testResult = await webhookDispatcher.testWebhook(url, webhook.secret || undefined);

    logger.info('Webhook created', { webhookId: webhook.id, name, url });

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret, // Only shown once on creation
        events,
        isActive: webhook.isActive,
      },
      testResult: {
        success: testResult.success,
        statusCode: testResult.statusCode,
        error: testResult.error,
        latency: testResult.latency,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create webhook', error as Error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/webhooks
 * Update webhook
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, url, secret, events, isActive, retryCount, retryDelay, timeout } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Check webhook exists
    const existing = await getWebhook(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Validate events if provided
    if (events && Array.isArray(events)) {
      const validEvents = WEBHOOK_EVENTS.map(e => e.value);
      const invalidEvents = events.filter((e: string) => e !== '*' && !validEvents.includes(e as WebhookEventType));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalidEvents.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    const updateData: Parameters<typeof updateWebhook>[1] = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (secret !== undefined) updateData.secret = secret;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (retryCount !== undefined) updateData.retryCount = retryCount;
    if (retryDelay !== undefined) updateData.retryDelay = retryDelay;
    if (timeout !== undefined) updateData.timeout = timeout;

    const webhook = await updateWebhook(id, updateData);

    logger.info('Webhook updated', { webhookId: id });

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: JSON.parse(webhook.events),
        isActive: webhook.isActive,
      },
    });
  } catch (error) {
    logger.error('Failed to update webhook', error as Error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks
 * Delete webhook
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Check webhook exists
    const existing = await getWebhook(webhookId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    await deleteWebhook(webhookId);

    logger.info('Webhook deleted', { webhookId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete webhook', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/webhooks
 * Test webhook or trigger manual dispatch
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, webhookId, event, data } = body;

    if (action === 'test' && webhookId) {
      // Test existing webhook
      const webhook = await getWebhook(webhookId);
      if (!webhook) {
        return NextResponse.json(
          { error: 'Webhook not found' },
          { status: 404 }
        );
      }

      const result = await webhookDispatcher.testWebhook(webhook.url, webhook.secret || undefined);

      return NextResponse.json({
        success: result.success,
        statusCode: result.statusCode,
        response: result.response,
        error: result.error,
        latency: result.latency,
      });
    }

    if (action === 'dispatch' && webhookId && event) {
      // Manual dispatch to specific webhook
      const webhook = await getWebhook(webhookId);
      if (!webhook) {
        return NextResponse.json(
          { error: 'Webhook not found' },
          { status: 404 }
        );
      }

      const result = await webhookDispatcher.dispatch(event as any, data || {}, {
        userId: webhook.userId,
      });

      return NextResponse.json({
        dispatched: result.dispatched,
        failed: result.failed,
      });
    }

    if (action === 'trigger' && event) {
      // Trigger event to all webhooks
      const result = await webhookDispatcher.dispatch(event as any, data || {});

      return NextResponse.json({
        dispatched: result.dispatched,
        failed: result.failed,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Webhook action failed', error as Error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}

/**
 * Get delivery logs for webhook
 */
export async function getDeliveryLogs(webhookId: string, limit = 50, offset = 0) {
  return db.webhookDeliveryLog.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
