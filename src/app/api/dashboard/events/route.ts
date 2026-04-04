import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/dashboard/events - Последние события
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Получаем последние уведомления из базы
    const notifications = await db.notification.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Получаем последние действия с аккаунтами
    const accountActions = await db.accountAction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        Account: {
          select: {
            platform: true,
            username: true,
            phone: true,
          },
        },
      },
    });

    // Получаем последние логи действий
    const actionLogs = await db.actionLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Формируем список событий
    const events: Array<{
      id: string;
      type: 'warning' | 'error' | 'success' | 'info';
      title: string;
      message: string;
      timestamp: Date;
      entityType?: string;
      entityId?: string;
    }> = [];

    // Добавляем уведомления
    notifications.forEach(n => {
      events.push({
        id: n.id,
        type: n.type as 'warning' | 'error' | 'success' | 'info',
        title: n.title,
        message: n.message,
        timestamp: n.createdAt,
        entityType: n.entityType || undefined,
        entityId: n.entityId || undefined,
      });
    });

    // Добавляем действия с аккаунтами
    accountActions.forEach(action => {
      const accountName = action.Account?.username || action.Account?.phone || 'Неизвестный аккаунт';
      let eventType: 'warning' | 'error' | 'success' | 'info' = 'info';
      let title = '';
      let message = '';

      switch (action.actionType) {
        case 'comment':
          title = 'Комментарий отправлен';
          message = `Аккаунт @${accountName}: комментарий успешно опубликован`;
          eventType = 'success';
          break;
        case 'dm':
          title = 'Сообщение отправлено';
          message = `Аккаунт @${accountName}: DM успешно доставлен`;
          eventType = 'success';
          break;
        case 'follow':
          title = 'Подписка выполнена';
          message = `Аккаунт @${accountName}: подписка на пользователя`;
          eventType = 'info';
          break;
        case 'like':
          title = 'Лайк поставлен';
          message = `Аккаунт @${accountName}: лайк на публикации`;
          eventType = 'info';
          break;
        case 'post':
          title = 'Пост опубликован';
          message = `Аккаунт @${accountName}: новый пост опубликован`;
          eventType = 'success';
          break;
        default:
          title = 'Действие выполнено';
          message = `Аккаунт @${accountName}: ${action.actionType}`;
      }

      if (action.result === 'failed' || action.result === 'rate_limited') {
        eventType = action.result === 'failed' ? 'error' : 'warning';
        title = action.result === 'failed' ? 'Ошибка действия' : 'Ограничение скорости';
        message = `Аккаунт @${accountName}: ${action.error || 'Неизвестная ошибка'}`;
      }

      events.push({
        id: action.id,
        type: eventType,
        title,
        message,
        timestamp: action.createdAt,
        entityType: 'account',
        entityId: action.accountId,
      });
    });

    // Добавляем логи действий
    actionLogs.forEach(log => {
      events.push({
        id: log.id,
        type: 'info',
        title: log.action,
        message: log.details ? JSON.parse(log.details).message || log.action : log.action,
        timestamp: log.createdAt,
        entityType: log.entityType || undefined,
        entityId: log.entityId || undefined,
      });
    });

    // Сортируем по времени (новые первые) и берём топ
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedEvents = events.slice(0, limit);

    logger.debug('Dashboard events fetched', { count: limitedEvents.length });

    return NextResponse.json({ events: limitedEvents });
  } catch (error) {
    logger.error('Failed to fetch dashboard events', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch events', events: [] },
      { status: 500 }
    );
  }
}
