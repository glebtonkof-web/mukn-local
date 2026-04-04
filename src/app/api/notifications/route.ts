/**
 * Notifications API Endpoint
 * Manages user notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';

// GET /api/notifications - Get notifications for user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const where: any = { userId };
    
    if (unreadOnly) {
      where.isRead = false;
    }
    
    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({
        where: { userId, isRead: false },
      }),
    ]);
    
    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        entityType: n.entityType,
        entityId: n.entityId,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userId, type, title, message, entityType, entityId } = body;
    
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }
    
    const notification = await db.notification.create({
      data: {
        id: nanoid(),
        userId: userId || 'default-user',
        type: type || 'info',
        title,
        message,
        entityType: entityType || null,
        entityId: entityId || null,
        isRead: false,
      },
    });
    
    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications - Mark as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, markAllRead, userId } = body;
    
    if (markAllRead && userId) {
      // Mark all as read for user
      await db.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }
    
    if (ids && ids.length > 0) {
      // Mark specific notifications as read
      await db.notification.updateMany({
        where: { id: { in: ids } },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
      
      return NextResponse.json({ success: true, message: 'Notifications marked as read' });
    }
    
    return NextResponse.json(
      { error: 'Either markAllRead with userId or ids array is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ids = searchParams.getAll('ids');
    const userId = searchParams.get('userId');
    const read = searchParams.get('read');
    
    if (ids.length > 0) {
      await db.notification.deleteMany({
        where: { id: { in: ids } },
      });
      
      return NextResponse.json({ success: true, deleted: ids.length });
    }
    
    if (userId && read === 'true') {
      // Delete all read notifications for user
      const result = await db.notification.deleteMany({
        where: { userId, isRead: true },
      });
      
      return NextResponse.json({ success: true, deleted: result.count });
    }
    
    return NextResponse.json(
      { error: 'Either ids or userId with read parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
