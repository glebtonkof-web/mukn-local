import { NextRequest, NextResponse } from 'next/server'
import { orchestrator } from '@/lib/microservice-orchestrator'

// GET /api/system/services - статус всех микросервисов
export async function GET(request: NextRequest) {
  try {
    const statuses = orchestrator.getAllStatuses()
    const uptime = orchestrator.getOrchestratorUptime()

    const summary = {
      total: statuses.length,
      running: statuses.filter(s => s.status === 'running').length,
      stopped: statuses.filter(s => s.status === 'stopped').length,
      crashed: statuses.filter(s => s.status === 'crashed').length,
      restarting: statuses.filter(s => s.status === 'restarting').length,
    }

    return NextResponse.json({
      orchestrator: {
        uptime,
        status: summary.crashed > 0 ? 'degraded' : 'healthy',
      },
      summary,
      services: statuses,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/system/services - управление сервисами
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, serviceName } = body

    switch (action) {
      case 'start_all':
        await orchestrator.startAll()
        return NextResponse.json({ success: true, message: 'All services starting' })

      case 'stop_all':
        await orchestrator.stopAll()
        return NextResponse.json({ success: true, message: 'All services stopped' })

      case 'start':
        if (!serviceName) {
          return NextResponse.json({ error: 'serviceName required' }, { status: 400 })
        }
        await orchestrator.startService(serviceName)
        return NextResponse.json({ success: true, message: `Service ${serviceName} started` })

      case 'stop':
        if (!serviceName) {
          return NextResponse.json({ error: 'serviceName required' }, { status: 400 })
        }
        await orchestrator.stopService(serviceName)
        return NextResponse.json({ success: true, message: `Service ${serviceName} stopped` })

      case 'restart':
        if (!serviceName) {
          return NextResponse.json({ error: 'serviceName required' }, { status: 400 })
        }
        await orchestrator.restartService(serviceName)
        return NextResponse.json({ success: true, message: `Service ${serviceName} restarted` })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
