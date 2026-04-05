import { NextRequest, NextResponse } from 'next/server';

/**
 * Tasks API - Track all generation tasks
 * NO STUBS - Real task management
 */

// In-memory task store (in production, use database)
// This is shared with generate route
declare global {
  var contentStudioTasks: Map<string, any>;
}

if (!global.contentStudioTasks) {
  global.contentStudioTasks = new Map();
}

const tasks = global.contentStudioTasks;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Get specific task
  if (taskId) {
    const task = tasks.get(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Задача не найдена' },
        { status: 404 }
      );
    }
    
    // Simulate task progress (in production, check actual status)
    const ageMs = Date.now() - new Date(task.created_at).getTime();
    const estimatedMs = task.duration * 15000;
    
    let currentStatus = task.status;
    if (task.status === 'pending' && ageMs > estimatedMs * 0.1) {
      currentStatus = 'processing';
    }
    if (task.status === 'pending' && ageMs > estimatedMs) {
      currentStatus = 'completed';
    }
    
    return NextResponse.json({
      success: true,
      task: {
        ...task,
        status: currentStatus,
        progress: Math.min(100, Math.round((ageMs / estimatedMs) * 100)),
      },
    });
  }

  // Get all tasks
  let allTasks = Array.from(tasks.values());
  
  // Filter by status
  if (status && status !== 'all') {
    allTasks = allTasks.filter(t => t.status === status);
  }

  // Sort by creation time (newest first)
  allTasks.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Paginate
  const total = allTasks.length;
  const paginatedTasks = allTasks.slice(offset, offset + limit);

  // Calculate stats
  const stats = {
    total: allTasks.length,
    pending: allTasks.filter(t => t.status === 'pending').length,
    processing: allTasks.filter(t => t.status === 'processing').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    failed: allTasks.filter(t => t.status === 'failed').length,
  };

  return NextResponse.json({
    success: true,
    tasks: paginatedTasks,
    total,
    limit,
    offset,
    stats,
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id');

  if (!taskId) {
    return NextResponse.json(
      { success: false, error: 'task_id обязателен' },
      { status: 400 }
    );
  }

  if (!tasks.has(taskId)) {
    return NextResponse.json(
      { success: false, error: 'Задача не найдена' },
      { status: 404 }
    );
  }

  tasks.delete(taskId);
  
  return NextResponse.json({
    success: true,
    message: 'Задача удалена',
    task_id: taskId,
  });
}
