/**
 * Dashboard Widgets API Endpoint
 * Manages customizable dashboard widgets
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/widgets - Get all widgets for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';
    const type = searchParams.get('type');
    const visibleOnly = searchParams.get('visibleOnly') === 'true';
    
    const where: any = { userId };
    
    if (type) {
      where.type = type;
    }
    
    if (visibleOnly) {
      where.isVisible = true;
    }
    
    const widgets = await db.dashboardWidget.findMany({
      where,
      orderBy: [
        { positionY: 'asc' },
        { positionX: 'asc' },
      ],
    });
    
    return NextResponse.json({
      widgets: widgets.map(w => ({
        id: w.id,
        type: w.type,
        title: w.title,
        positionX: w.positionX,
        positionY: w.positionY,
        width: w.width,
        height: w.height,
        config: w.config ? JSON.parse(w.config) : null,
        dataSource: w.dataSource,
        filters: w.filters ? JSON.parse(w.filters) : null,
        refreshInterval: w.refreshInterval,
        isVisible: w.isVisible,
        isPinned: w.isPinned,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching widgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widgets' },
      { status: 500 }
    );
  }
}

// POST /api/widgets - Create a new widget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      userId = 'default-user',
      type,
      title,
      positionX = 0,
      positionY = 0,
      width = 1,
      height = 1,
      config,
      dataSource,
      filters,
      refreshInterval = 60,
      isVisible = true,
      isPinned = false,
    } = body;
    
    if (!type || !title) {
      return NextResponse.json(
        { error: 'Type and title are required' },
        { status: 400 }
      );
    }
    
    const widget = await db.dashboardWidget.create({
      data: {
        id: nanoid(),
        userId,
        widgetType: type,
        type: type,
        title,
        positionX,
        positionY,
        width,
        height,
        config: config ? JSON.stringify(config) : null,
        dataSource: dataSource || null,
        filters: filters ? JSON.stringify(filters) : null,
        refreshInterval,
        isVisible,
        isPinned,
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({
      widget: {
        id: widget.id,
        type: widget.type,
        title: widget.title,
        positionX: widget.positionX,
        positionY: widget.positionY,
        width: widget.width,
        height: widget.height,
        config: widget.config ? JSON.parse(widget.config) : null,
        dataSource: widget.dataSource,
        filters: widget.filters ? JSON.parse(widget.filters) : null,
        refreshInterval: widget.refreshInterval,
        isVisible: widget.isVisible,
        isPinned: widget.isPinned,
      },
    });
  } catch (error) {
    console.error('Error creating widget:', error);
    return NextResponse.json(
      { error: 'Failed to create widget' },
      { status: 500 }
    );
  }
}

// PUT /api/widgets - Update widget positions (batch update)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { widgets } = body;
    
    if (!Array.isArray(widgets)) {
      return NextResponse.json(
        { error: 'widgets array is required' },
        { status: 400 }
      );
    }
    
    // Batch update positions
    const updates = widgets.map(w =>
      db.dashboardWidget.update({
        where: { id: w.id },
        data: {
          positionX: w.positionX,
          positionY: w.positionY,
          width: w.width,
          height: w.height,
          updatedAt: new Date(),
        },
      })
    );
    
    await Promise.all(updates);
    
    return NextResponse.json({ success: true, updated: widgets.length });
  } catch (error) {
    console.error('Error updating widgets:', error);
    return NextResponse.json(
      { error: 'Failed to update widgets' },
      { status: 500 }
    );
  }
}

// PATCH /api/widgets - Update a single widget
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Widget id is required' },
        { status: 400 }
      );
    }
    
    const data: any = {};
    
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.positionX !== undefined) data.positionX = updates.positionX;
    if (updates.positionY !== undefined) data.positionY = updates.positionY;
    if (updates.width !== undefined) data.width = updates.width;
    if (updates.height !== undefined) data.height = updates.height;
    if (updates.config !== undefined) data.config = JSON.stringify(updates.config);
    if (updates.dataSource !== undefined) data.dataSource = updates.dataSource;
    if (updates.filters !== undefined) data.filters = JSON.stringify(updates.filters);
    if (updates.refreshInterval !== undefined) data.refreshInterval = updates.refreshInterval;
    if (updates.isVisible !== undefined) data.isVisible = updates.isVisible;
    if (updates.isPinned !== undefined) data.isPinned = updates.isPinned;
    
    const widget = await db.dashboardWidget.update({
      where: { id },
      data,
    });
    
    return NextResponse.json({
      widget: {
        id: widget.id,
        type: widget.type,
        title: widget.title,
        positionX: widget.positionX,
        positionY: widget.positionY,
        width: widget.width,
        height: widget.height,
        config: widget.config ? JSON.parse(widget.config) : null,
        dataSource: widget.dataSource,
        filters: widget.filters ? JSON.parse(widget.filters) : null,
        refreshInterval: widget.refreshInterval,
        isVisible: widget.isVisible,
        isPinned: widget.isPinned,
      },
    });
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json(
      { error: 'Failed to update widget' },
      { status: 500 }
    );
  }
}

// DELETE /api/widgets - Delete a widget
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    if (id) {
      await db.dashboardWidget.delete({
        where: { id },
      });
      
      return NextResponse.json({ success: true });
    }
    
    if (userId) {
      // Delete all widgets for user (reset dashboard)
      await db.dashboardWidget.deleteMany({
        where: { userId },
      });
      
      return NextResponse.json({ success: true, message: 'All widgets deleted' });
    }
    
    return NextResponse.json(
      { error: 'Either id or userId parameter is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json(
      { error: 'Failed to delete widget' },
      { status: 500 }
    );
  }
}
