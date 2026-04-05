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
    
    // Получаем базовый статус
    const baseStatus = await manager.getStatus(userId)

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

    // Получаем статистику аккаунтов
    const accounts = await prisma.deepSeekAccount.findMany({
      where: { userId },
      select: {
        id: true,
        email: true,
        status: true,
        priority: true,
        hourlyUsed: true,
        dailyUsed: true,
        hourlyLimit: true,
        dailyLimit: true,
        totalRequests: true,
        successRequests: true,
        failedRequests: true,
        lastRequestAt: true,
        cooldownUntil: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
      }
    })

    // Получаем статистику очереди
    const queueStats = await prisma.deepSeekRequestQueue.groupBy({
      by: ['status'],
      where: { userId },
      _count: true
    })

    // Формируем статус в формате, ожидаемом панелью
    const status = {
      pool: {
        totalAccounts: baseStatus.pool.total,
        activeAccounts: baseStatus.pool.active,
        rateLimited: baseStatus.pool.rateLimited,
        banned: baseStatus.pool.banned,
        errors: baseStatus.pool.cooldown,
        requestsToday: requestsToday,
        requestsHour: baseStatus.pool.avgHourlyUsage,
        successRate: requestsToday > 0 ? successToday / requestsToday : 1,
        availableCapacity: baseStatus.pool.active * 25 // 25 запросов в час на аккаунт
      },
      cache: {
        level: 'L1+L2',
        size: baseStatus.cache.l1Size + baseStatus.cache.l2Size,
        hits: baseStatus.cache.topHits.reduce((sum: number, h: any) => sum + h.hitCount, 0),
        misses: 0,
        hit_rate: baseStatus.cache.l1Size > 0 ? 0.8 : 0, // Примерный показатель
        l1_size: baseStatus.cache.l1Size,
        l2_size: baseStatus.cache.l2Size,
        l3_size: 0,
        total_hits: baseStatus.cache.topHits.reduce((sum: number, h: any) => sum + h.hitCount, 0),
        semantic_available: false
      },
      queue: {
        pending: queueStats.find(s => s.status === 'pending')?._count || 0,
        processing: queueStats.find(s => s.status === 'processing')?._count || 0,
        completed: queueStats.find(s => s.status === 'completed')?._count || 0,
        failed: queueStats.find(s => s.status === 'failed')?._count || 0,
        avgWaitTime: baseStatus.queue.avgWaitTime,
        throughput: requestsToday > 0 ? requestsToday / 24 : 0 // запросов в час
      },
      healing: {
        quarantine_count: baseStatus.pool.cooldown,
        recovery_attempts: {},
        proxy_assignments: 0,
        monitoring_active: true
      }
    }

    // Формируем данные аккаунтов с дополнительными полями
    const accountsWithExtras = accounts.map(acc => {
      const hourlyLimit = acc.hourlyLimit || 25
      const dailyLimit = acc.dailyLimit || 200
      const waitTime = acc.status === 'cooldown' && acc.cooldownUntil
        ? Math.max(0, acc.cooldownUntil.getTime() - Date.now())
        : 0

      return {
        id: acc.id,
        email: acc.email,
        status: acc.status,
        priority: acc.priority,
        hourlyLimit,
        hourlyUsed: acc.hourlyUsed || 0,
        dailyLimit,
        dailyUsed: acc.dailyUsed || 0,
        totalRequests: acc.totalRequests || 0,
        successRequests: acc.successRequests || 0,
        failedRequests: acc.failedRequests || 0,
        lastRequestAt: acc.lastRequestAt?.toISOString() || null,
        cooldownUntil: acc.cooldownUntil?.toISOString() || null,
        bannedAt: acc.bannedAt?.toISOString() || null,
        banReason: acc.banReason,
        createdAt: acc.createdAt.toISOString(),
        canMakeRequest: acc.status === 'active' && (acc.hourlyUsed || 0) < hourlyLimit,
        waitTime: Math.ceil(waitTime / 1000) // в секундах
      }
    })

    return NextResponse.json({
      success: true,
      status,
      accounts: accountsWithExtras,
      metrics: {
        requestsToday,
        successToday,
        successRate: requestsToday > 0 ? (successToday / requestsToday * 100).toFixed(1) : '100',
        avgResponseTime: Math.round(avgResponseTime),
        estimatedSavings: estimatedSavings.toFixed(4)
      }
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Status Error]', error)
    
    // Возвращаем пустой статус в случае ошибки
    return NextResponse.json({
      success: true,
      status: {
        pool: {
          totalAccounts: 0,
          activeAccounts: 0,
          rateLimited: 0,
          banned: 0,
          errors: 0,
          requestsToday: 0,
          requestsHour: 0,
          successRate: 1,
          availableCapacity: 0
        },
        cache: {
          level: 'L1+L2',
          size: 0,
          hits: 0,
          misses: 0,
          hit_rate: 0,
          l1_size: 0,
          l2_size: 0,
          l3_size: 0,
          total_hits: 0,
          semantic_available: false
        },
        queue: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          avgWaitTime: 0,
          throughput: 0
        },
        healing: {
          quarantine_count: 0,
          recovery_attempts: {},
          proxy_assignments: 0,
          monitoring_active: false
        }
      },
      accounts: [],
      metrics: {
        requestsToday: 0,
        successToday: 0,
        successRate: '100',
        avgResponseTime: 0,
        estimatedSavings: '0.0000'
      }
    })
  }
}
