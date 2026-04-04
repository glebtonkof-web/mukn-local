import { NextRequest, NextResponse } from 'next/server'
import massActionsService from '@/lib/mass-actions-service'

// GET /api/mass-actions - Получить задачи массовых действий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (taskId) {
      const task = massActionsService.getTaskStatus(taskId)
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      return NextResponse.json({ task })
    }

    const tasks = massActionsService.getAllTasks()
    const accountStats = massActionsService.getAccountStats()
    
    return NextResponse.json({ tasks, accountStats })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/mass-actions - Создать задачу массовых действий
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, targets, accounts, settings } = body

    let task

    switch (type) {
      case 'reactions':
        task = await massActionsService.massReactions(targets, accounts, settings)
        break
      case 'views':
        task = await massActionsService.massViews(targets, accounts, settings)
        break
      case 'subscriptions':
        task = await massActionsService.massSubscriptions(targets, accounts, settings)
        break
      case 'combined':
        task = await massActionsService.combinedActions({ targets, accounts, settings })
        break
      default:
        return NextResponse.json({ error: 'Invalid action type' }, { status: 400 })
    }

    return NextResponse.json({ task })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/mass-actions - Управление задачей
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, action } = body

    let result = false

    switch (action) {
      case 'pause':
        result = massActionsService.pauseTask(taskId)
        break
      case 'resume':
        result = massActionsService.resumeTask(taskId)
        break
      case 'cancel':
        result = massActionsService.cancelTask(taskId)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/mass-actions/reset-stats - Сброс статистики
export async function resetStats(request: NextRequest) {
  try {
    massActionsService.resetDailyStats()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
