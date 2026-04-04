import { NextRequest, NextResponse } from 'next/server'
import invitationService from '@/lib/invitation-service'

// GET /api/invitations - Получить задачи приглашений
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (taskId) {
      const task = invitationService.getTaskStatus(taskId)
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      return NextResponse.json({ task })
    }

    const tasks = invitationService.getAllTasks()
    const templates = invitationService.getTemplates()
    
    return NextResponse.json({ tasks, templates })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/invitations - Создать задачу приглашений
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, groupId, targets, settings, message } = body

    let task

    switch (type) {
      case 'by_username':
        task = await invitationService.inviteByUsernames(groupId, targets, settings)
        break
      case 'by_id':
        task = await invitationService.inviteByIds(groupId, targets, settings)
        break
      case 'via_admin':
        task = await invitationService.inviteViaAdmins(groupId, targets, message, settings)
        break
      case 'via_bot':
        task = await invitationService.inviteViaBot(groupId, targets.botIds, targets.users, settings)
        break
      default:
        return NextResponse.json({ error: 'Invalid invitation type' }, { status: 400 })
    }

    return NextResponse.json({ task })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/invitations - Управление задачей
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, action } = body

    let result = false

    switch (action) {
      case 'pause':
        result = invitationService.pauseTask(taskId)
        break
      case 'resume':
        result = invitationService.resumeTask(taskId)
        break
      case 'cancel':
        result = invitationService.cancelTask(taskId)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/invitations/validate - Валидация usernames
export async function validate(request: NextRequest) {
  try {
    const body = await request.json()
    const { usernames } = body

    const result = invitationService.validateUsernames(usernames)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
