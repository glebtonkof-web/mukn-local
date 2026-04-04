import { NextRequest, NextResponse } from 'next/server';
import { getProcessManager } from '@/lib/process-manager';

// GET /api/system/process-manager - Получить статус Process Manager
export async function GET() {
  try {
    const status = getProcessManager().getStatus();
    const health = getProcessManager().checkHealth();

    return NextResponse.json({
      success: true,
      data: {
        status,
        health,
        config: {
          autoRestart: true,
          maxRestarts: 10,
          restartWindow: 60000,
          shutdownTimeout: 30000,
          healthCheckInterval: 30000,
        },
      },
    });
  } catch (error) {
    console.error('Error getting process manager status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get process manager status' },
      { status: 500 }
    );
  }
}

// POST /api/system/process-manager - Управление Process Manager
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        getProcessManager().start();
        return NextResponse.json({ success: true, message: 'Process Manager started' });

      case 'health_check':
        const health = getProcessManager().checkHealth();
        return NextResponse.json({ success: true, health });

      case 'shutdown':
        const { reason } = body;
        await getProcessManager().gracefulShutdown(reason || 'manual_shutdown');
        return NextResponse.json({ success: true, message: 'Graceful shutdown initiated' });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in process manager action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
