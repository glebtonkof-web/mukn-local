import { NextRequest, NextResponse } from 'next/server';
import { orchestrator, MICROSERVICES } from '@/lib/microservice-orchestrator';
import { autoBackup } from '@/lib/auto-backup';

// GET /api/system/status - Получение статуса системы
export async function GET(request: NextRequest) {
  try {
    const orchestratorStatus = orchestrator.getAllStatuses();
    const backupStatus = autoBackup.getStatus();
    const backupMetrics = autoBackup.getMetrics();

    return NextResponse.json({
      success: true,
      data: {
        orchestrator: {
          services: orchestratorStatus,
          uptime: orchestrator.getOrchestratorUptime(),
        },
        backup: {
          status: backupStatus,
          metrics: backupMetrics,
        },
        config: {
          microservices: MICROSERVICES.map(s => ({
            name: s.name,
            port: s.port,
            dependencies: s.dependencies,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error getting system status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get system status' },
      { status: 500 }
    );
  }
}

// POST /api/system/status - Управление сервисами
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, serviceName } = body;

    switch (action) {
      case 'start_all':
        await orchestrator.startAll();
        return NextResponse.json({ success: true, message: 'All services started' });

      case 'stop_all':
        await orchestrator.stopAll();
        return NextResponse.json({ success: true, message: 'All services stopped' });

      case 'start_service':
        if (!serviceName) {
          return NextResponse.json({ success: false, error: 'serviceName required' }, { status: 400 });
        }
        await orchestrator.startService(serviceName);
        return NextResponse.json({ success: true, message: `Service ${serviceName} started` });

      case 'stop_service':
        if (!serviceName) {
          return NextResponse.json({ success: false, error: 'serviceName required' }, { status: 400 });
        }
        await orchestrator.stopService(serviceName);
        return NextResponse.json({ success: true, message: `Service ${serviceName} stopped` });

      case 'restart_service':
        if (!serviceName) {
          return NextResponse.json({ success: false, error: 'serviceName required' }, { status: 400 });
        }
        await orchestrator.restartService(serviceName);
        return NextResponse.json({ success: true, message: `Service ${serviceName} restarted` });

      case 'start_backup':
        autoBackup.start();
        return NextResponse.json({ success: true, message: 'Backup service started' });

      case 'stop_backup':
        autoBackup.stop();
        return NextResponse.json({ success: true, message: 'Backup service stopped' });

      case 'perform_backup':
        const result = await autoBackup.performBackup();
        return NextResponse.json({ success: result.success, result });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in system action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
