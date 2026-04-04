import { NextRequest, NextResponse } from 'next/server'
import parsingService from '@/lib/parsing-service'

// GET /api/parsing/tasks - Получить все задачи парсинга
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (taskId) {
      const task = parsingService.getTaskStatus(taskId)
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      return NextResponse.json({ task })
    }

    const tasks = parsingService.getAllTasks()
    return NextResponse.json({ tasks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/parsing/tasks - Создать задачу парсинга
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, target, options } = body

    let task

    switch (type) {
      case 'group_members':
        task = await parsingService.parseGroupMembers(target, options)
        break
      case 'comments':
        task = await parsingService.parseComments(target, options)
        break
      case 'global_search':
        task = await parsingService.globalSearch(target, options)
        break
      default:
        return NextResponse.json({ error: 'Invalid parse type' }, { status: 400 })
    }

    return NextResponse.json({ task })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/parsing/tasks - Отменить задачу
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const cancelled = parsingService.cancelTask(taskId)
    return NextResponse.json({ cancelled })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
