/**
 * API: DeepSeek Free — Управление очередью
 * GET /api/deepseek-free/queue — Получить очередь
 * DELETE /api/deepseek-free/queue — Очистить очередь
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default'
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Размер очереди по статусам
    const queueStats = await prisma.deepSeekRequestQueue.groupBy({
      by: ['status'],
      where: { userId },
      _count: true
    })

    // Запросы в очереди
    const items = await prisma.deepSeekRequestQueue.findMany({
      where: { 
        userId,
        status: status as any
      },
      orderBy: [
        { priority: 'desc' },
        { queuedAt: 'asc' }
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        prompt: true,
        priority: true,
        status: true,
        attempts: true,
        queuedAt: true,
        startedAt: true,
        completedAt: true,
        error: true
      }
    })

    return NextResponse.json({
      success: true,
      queue: {
        stats: queueStats.reduce((acc, item) => {
          acc[item.status] = item._count
          return acc
        }, {} as Record<string, number>),
        items
      }
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Queue GET Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при получении очереди'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const queueId = searchParams.get('queueId')
    const clearCompleted = searchParams.get('clearCompleted') === 'true'

    if (queueId) {
      // Удалить конкретный запрос
      await prisma.deepSeekRequestQueue.delete({
        where: { id: queueId }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Запрос удалён из очереди'
      })
    }

    if (clearCompleted) {
      // Очистить выполненные запросы
      await prisma.deepSeekRequestQueue.deleteMany({
        where: { 
          status: { in: ['completed', 'failed'] }
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Выполненные запросы удалены'
      })
    }

    if (userId) {
      // Очистить всю очередь пользователя
      await prisma.deepSeekRequestQueue.deleteMany({
        where: { userId, status: 'pending' }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Очередь очищена'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Укажите userId, queueId или clearCompleted=true'
    }, { status: 400 })

  } catch (error: any) {
    console.error('[DeepSeek Free Queue DELETE Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при очистке очереди'
    }, { status: 500 })
  }
}
