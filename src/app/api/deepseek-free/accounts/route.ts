/**
 * API: DeepSeek Free — Управление аккаунтами
 * GET /api/deepseek-free/accounts — Получить список аккаунтов
 * POST /api/deepseek-free/accounts — Добавить аккаунт
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getDeepSeekFreeManager } from '@/lib/deepseek-free'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Требуется userId'
      }, { status: 400 })
    }

    const accounts = await prisma.deepSeekAccount.findMany({
      where: { userId },
      orderBy: { priority: 'desc' },
      select: {
        id: true,
        email: true,
        status: true,
        hourlyLimit: true,
        hourlyUsed: true,
        dailyLimit: true,
        dailyUsed: true,
        priority: true,
        totalRequests: true,
        successRequests: true,
        failedRequests: true,
        lastRequestAt: true,
        cooldownUntil: true,
        bannedAt: true,
        banReason: true,
        createdAt: true
      }
    })

    // Добавляем вычисляемые поля
    const accountsWithExtras = accounts.map(acc => {
      const hourlyLimit = acc.hourlyLimit || 25
      const waitTime = acc.status === 'cooldown' && acc.cooldownUntil
        ? Math.max(0, acc.cooldownUntil.getTime() - Date.now())
        : 0

      return {
        ...acc,
        hourlyLimit,
        dailyLimit: acc.dailyLimit || 200,
        canMakeRequest: acc.status === 'active' && (acc.hourlyUsed || 0) < hourlyLimit,
        waitTime: Math.ceil(waitTime / 1000) // в секундах
      }
    })

    return NextResponse.json({
      success: true,
      accounts: accountsWithExtras
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Accounts GET Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при получении аккаунтов'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { userId, email, password, priority } = body

    if (!userId || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Требуются userId, email и password'
      }, { status: 400 })
    }

    const manager = getDeepSeekFreeManager()
    
    const account = await manager.addAccount(userId, email, password, priority || 5)

    return NextResponse.json({
      success: true,
      account
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Accounts POST Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при добавлении аккаунта'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Требуется accountId'
      }, { status: 400 })
    }

    await prisma.deepSeekAccount.delete({
      where: { id: accountId }
    })

    return NextResponse.json({
      success: true,
      message: 'Аккаунт удалён'
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Accounts DELETE Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при удалении аккаунта'
    }, { status: 500 })
  }
}
