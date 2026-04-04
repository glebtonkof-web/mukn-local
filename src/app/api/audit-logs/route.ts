/**
 * Audit Logs API Endpoint
 * Provides read and write access to the ActionLog table for tracking all system changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/audit-logs - Get audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Filters
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = searchParams.get('search');
    
    // Build where clause
    const where: any = {};
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (entityId) {
      where.entityId = entityId;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }
    
    // Get total count
    const total = await db.actionLog.count({ where });
    
    // Get logs with pagination
    const logs = await db.actionLog.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
    
    // Get unique values for filters
    const [entityTypes, actions] = await Promise.all([
      db.actionLog.findMany({
        where: {},
        select: { entityType: true },
        distinct: ['entityType'],
      }),
      db.actionLog.findMany({
        where: {},
        select: { action: true },
        distinct: ['action'],
      }),
    ]);
    
    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details ? JSON.parse(log.details) : null,
        createdAt: log.createdAt,
        user: log.User,
      })),
      total,
      hasMore: offset + logs.length < total,
      filters: {
        entityTypes: entityTypes.map(e => e.entityType).filter(Boolean),
        actions: actions.map(a => a.action).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST /api/audit-logs - Create a new audit log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { action, entityType, entityId, details, userId } = body;
    
    if (!action || !entityType) {
      return NextResponse.json(
        { error: 'Action and entityType are required' },
        { status: 400 }
      );
    }
    
    // Create audit log
    const log = await db.actionLog.create({
      data: {
        id: nanoid(),
        action,
        entityType,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        userId: userId || 'system',
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      log: {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details ? JSON.parse(log.details) : null,
        createdAt: log.createdAt,
        user: log.User,
      },
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

// DELETE /api/audit-logs - Delete audit logs (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const olderThanDays = searchParams.get('olderThanDays');
    const ids = searchParams.getAll('ids');
    
    if (ids.length > 0) {
      // Delete specific logs by ID
      await db.actionLog.deleteMany({
        where: {
          id: { in: ids },
        },
      });
      
      return NextResponse.json({
        success: true,
        deleted: ids.length,
      });
    }
    
    if (olderThanDays) {
      // Delete logs older than X days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));
      
      const result = await db.actionLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });
      
      return NextResponse.json({
        success: true,
        deleted: result.count,
      });
    }
    
    return NextResponse.json(
      { error: 'Either ids or olderThanDays parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit logs' },
      { status: 500 }
    );
  }
}
