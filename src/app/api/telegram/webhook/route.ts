/**
 * Telegram Bot Webhook API Endpoint
 * Handles incoming webhook events from Telegram Bot API
 */

import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotHandler, telegramBot, TelegramUpdate } from '@/lib/telegram-bot';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

// Maximum allowed update age in seconds (5 minutes)
const MAX_UPDATE_AGE = 300;

/**
 * POST /api/telegram/webhook
 * Receive webhook events from Telegram Bot API
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-telegram-bot-api-secret-token') || '';

    // Parse the update
    let update: TelegramUpdate;
    try {
      update = JSON.parse(rawBody);
    } catch {
      logger.error('Invalid JSON in Telegram webhook request');
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Verify update age (prevent replay attacks)
    const message = update.message || update.channel_post || update.edited_channel_post ||
                    update.callback_query?.message;
    if (message?.date) {
      const updateAge = Date.now() / 1000 - message.date;
      if (updateAge > MAX_UPDATE_AGE) {
        logger.warn('Ignoring old Telegram update', { updateId: update.update_id, age: updateAge });
        return NextResponse.json({ ok: true, message: 'Update too old' });
      }
    }

    // Initialize bot handler
    const bot = new TelegramBotHandler();

    // Process the update
    const result = await bot.processUpdate(update);

    logger.info('Telegram webhook processed', {
      updateId: update.update_id,
      eventType: result.eventType,
      success: result.success
    });

    return NextResponse.json({
      ok: true,
      updateId: update.update_id,
      ...result
    });
  } catch (error) {
    logger.error('Telegram webhook error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telegram/webhook
 * Get webhook status and recent events
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const eventType = searchParams.get('eventType');
    const processed = searchParams.get('processed');

    // Handle different actions
    if (action === 'status') {
      // Get webhook info from Telegram
      const bot = new TelegramBotHandler();
      const webhookInfo = await bot.getWebhookInfo();

      return NextResponse.json({
        webhook: webhookInfo,
        configured: !!process.env.TELEGRAM_BOT_TOKEN,
      });
    }

    if (action === 'set') {
      // Set webhook URL
      const webhookUrl = searchParams.get('url');
      if (!webhookUrl) {
        return NextResponse.json(
          { error: 'Webhook URL is required' },
          { status: 400 }
        );
      }

      const bot = new TelegramBotHandler();
      const result = await bot.setWebhook(webhookUrl);

      return NextResponse.json(result);
    }

    if (action === 'delete') {
      // Delete webhook
      const bot = new TelegramBotHandler();
      const result = await bot.deleteWebhook();

      return NextResponse.json(result);
    }

    // Default: list recent events
    const where: Record<string, unknown> = {};
    if (eventType) where.eventType = eventType;
    if (processed !== null) where.processed = processed === 'true';

    const events = await db.telegramBotEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.telegramBotEvent.count({ where });

    // Get event type counts
    const eventTypeCounts = await db.telegramBotEvent.groupBy({
      by: ['eventType'],
      _count: true,
    });

    return NextResponse.json({
      events: events.map(e => ({
        id: e.id,
        eventType: e.eventType,
        chatId: e.chatId,
        chatTitle: e.chatTitle,
        userId: e.userId,
        username: e.username,
        messageId: e.messageId,
        text: e.text?.substring(0, 200),
        processed: e.processed,
        processingError: e.processingError,
        accountId: e.accountId,
        notificationSent: e.notificationSent,
        createdAt: e.createdAt,
        processedAt: e.processedAt,
      })),
      eventTypeCounts: eventTypeCounts.map(c => ({
        eventType: c.eventType,
        count: c._count,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + events.length < total,
      },
    });
  } catch (error) {
    logger.error('Failed to get Telegram webhook info', error as Error);
    return NextResponse.json(
      { error: 'Failed to get webhook info' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/telegram/webhook
 * Update event (mark as processed)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, processed, processingError, accountId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (processed !== undefined) {
      updateData.processed = processed;
      if (processed) updateData.processedAt = new Date();
    }
    if (processingError !== undefined) updateData.processingError = processingError;
    if (accountId !== undefined) updateData.accountId = accountId;

    const event = await db.telegramBotEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    return NextResponse.json({ event });
  } catch (error) {
    logger.error('Failed to update Telegram event', error as Error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/telegram/webhook
 * Delete old events (cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const beforeDate = new Date();
    beforeDate.setDate(beforeDate.getDate() - days);

    const result = await db.telegramBotEvent.deleteMany({
      where: {
        createdAt: { lt: beforeDate },
        processed: true, // Only delete processed events
      }
    });

    logger.info('Cleaned up old Telegram events', { deletedCount: result.count, days });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      deletedBefore: beforeDate,
    });
  } catch (error) {
    logger.error('Failed to cleanup Telegram events', error as Error);
    return NextResponse.json(
      { error: 'Failed to cleanup events' },
      { status: 500 }
    );
  }
}
