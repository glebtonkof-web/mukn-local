/**
 * API: DeepSeek Free — Статус системы
 * GET /api/deepseek-free/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getDeepSeekFreeManager } from '@/lib/deepseek-free'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default'

    const manager = getDeepSeekFreeManager()
    
    // Получаем полный статус
    const status = await manager.getStatus(userId)

    // Получаем метрики за сегодня
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayMetrics = await prisma.deepSeekRequestLog.findMany({
      where: {
        createdAt: { gte: today }
      },
      select: {
        success: true,
        responseTime: true,
        estimatedCost: true
      }
    })

    const requestsToday = todayMetrics.length
    const successToday = todayMetrics.filter(m => m.success).length
    const avgResponseTime = todayMetrics.length > 0
      ? todayMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / todayMetrics.length
      : 0
    const estimatedSavings = todayMetrics.reduce((sum, m) => sum + (m.estimatedCost || 0), 0)

    // Получаем размер кэша
    const cacheSize = await prisma.deepSeekCache.count()

    return NextResponse.json({
      success: true,
      status: {
        ...status,
        metrics: {
          requestsToday,
          successToday,
          successRate: requestsToday > 0 ? (successToday / requestsToday * 100).toFixed(1) : 100,
          avgResponseTime: Math.round(avgResponseTime),
          estimatedSavings: estimatedSavings.toFixed(4)
        },
        cacheSize
      }
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Status Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при получении статуса'
    }, { status: 500 })
  }
}
