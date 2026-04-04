import { NextRequest, NextResponse } from 'next/server'
import { autoBackup } from '@/lib/auto-backup'

// GET /api/system/backup - статус бэкапов
export async function GET(request: NextRequest) {
  try {
    const status = autoBackup.getStatus()
    const metrics = autoBackup.getMetrics()
    const backups = autoBackup.listBackups()

    return NextResponse.json({
      status,
      metrics,
      backups: backups.slice(-20), // Последние 20 бэкапов
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/system/backup - управление бэкапами
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, backupPath } = body

    switch (action) {
      case 'start':
        autoBackup.start()
        return NextResponse.json({ success: true, message: 'Auto-backup started' })

      case 'stop':
        autoBackup.stop()
        return NextResponse.json({ success: true, message: 'Auto-backup stopped' })

      case 'backup':
        const result = await autoBackup.performBackup()
        return NextResponse.json(result)

      case 'restore':
        if (!backupPath) {
          return NextResponse.json({ error: 'backupPath required' }, { status: 400 })
        }
        const restoreResult = await autoBackup.restore(backupPath)
        return NextResponse.json(restoreResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
