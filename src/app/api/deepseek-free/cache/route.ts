/**
 * API: DeepSeek Free — Управление кэшем
 * GET /api/deepseek-free/cache — Получить статистику кэша
 * DELETE /api/deepseek-free/cache — Очистить кэш
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getDeepSeekFreeManager } from '@/lib/deepseek-free'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Статистика кэша
    const totalCount = await prisma.deepSeekCache.count()
    const activeCount = await prisma.deepSeekCache.count({
      where: { expiresAt: { gt: new Date() } }
    })
    const expiredCount = totalCount - activeCount

    // Топ записей
    const topEntries = await prisma.deepSeekCache.findMany({
      orderBy: { hitCount: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        promptPreview: true,
        hitCount: true,
        createdAt: true,
        expiresAt: true,
        lastHitAt: true
      }
    })

    // Общее количество попаданий
    const totalHits = await prisma.deepSeekCache.aggregate({
      _sum: { hitCount: true }
    })

    return NextResponse.json({
      success: true,
      cache: {
        totalCount,
        activeCount,
        expiredCount,
        totalHits: totalHits._sum.hitCount || 0,
        topEntries
      }
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Cache GET Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при получении статистики кэша'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clearAll = searchParams.get('all') === 'true'

    const manager = getDeepSeekFreeManager()
    await manager.clearCache()

    if (clearAll) {
      // Удаляем все записи из БД
      await prisma.deepSeekCache.deleteMany({})
    } else {
      // Удаляем только устаревшие
      await prisma.deepSeekCache.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      })
    }

    return NextResponse.json({
      success: true,
      message: clearAll ? 'Кэш полностью очищен' : 'Устаревший кэш очищен'
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Cache DELETE Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при очистке кэша'
    }, { status: 500 })
  }
}
