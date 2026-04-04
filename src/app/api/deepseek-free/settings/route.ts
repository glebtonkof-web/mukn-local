/**
 * API: DeepSeek Free — Настройки
 * GET /api/deepseek-free/settings — Получить настройки
 * POST /api/deepseek-free/settings — Сохранить настройки
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'default'

    let settings = await prisma.deepSeekFreeSettings.findUnique({
      where: { userId }
    })

    // Если настроек нет — создаём дефолтные
    if (!settings) {
      settings = await prisma.deepSeekFreeSettings.create({
        data: { userId }
      })
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Settings GET Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при получении настроек'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { userId, ...settings } = body

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Требуется userId'
      }, { status: 400 })
    }

    const updated = await prisma.deepSeekFreeSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...settings
      },
      update: {
        ...settings,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      settings: updated
    })

  } catch (error: any) {
    console.error('[DeepSeek Free Settings POST Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при сохранении настроек'
    }, { status: 500 })
  }
}
