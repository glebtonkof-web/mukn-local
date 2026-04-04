/**
 * API: DeepSeek Free — Metrics
 * GET /api/deepseek-free/metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'default'

    // Get pool stats
    const accounts = await prisma.deepSeekAccount.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        totalRequests: true,
        successRequests: true,
        hourlyUsed: true,
        dailyUsed: true,
        hourlyLimit: true,
      }
    })

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Get today's metrics
    const todayLogs = await prisma.deepSeekRequestLog.findMany({
      where: {
        createdAt: { gte: today }
      },
      select: {
        success: true,
        responseTime: true
      }
    })

    const hourLogs = await prisma.deepSeekRequestLog.findMany({
      where: {
        createdAt: { gte: hourAgo }
      }
    })

    // Calculate stats
    const activeAccounts = accounts.filter(a => a.status === 'active').length
    const requestsToday = todayLogs.length
    const requestsHour = hourLogs.length
    const successCount = todayLogs.filter(l => l.success).length
    const successRate = requestsToday > 0 ? successCount / requestsToday : 1

    // Cache stats
    const cacheStats = await prisma.deepSeekCache.aggregate({
      _count: { id: true },
      _sum: { hitCount: true }
    })

    const totalHits = cacheStats._sum.hitCount || 0
    const cacheSize = cacheStats._count.id || 0
    
    // Estimate cache hit rate
    const cacheHitRate = requestsToday > 0 ? Math.min(0.9, totalHits / (requestsToday + totalHits)) : 0

    // Calculate available capacity
    const availableCapacity = accounts
      .filter(a => a.status === 'active')
      .reduce((sum, a) => sum + (a.hourlyLimit - a.hourlyUsed), 0)

    return NextResponse.json({
      success: true,
      metrics: {
        accountsTotal: accounts.length,
        accountsActive: activeAccounts,
        requestsToday,
        requestsHour,
        successRate,
        cacheHitRate,
        cacheSize,
        queueSize: 0,
        availableCapacity
      }
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Metrics Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при получении метрик'
    }, { status: 500 })
  }
}
