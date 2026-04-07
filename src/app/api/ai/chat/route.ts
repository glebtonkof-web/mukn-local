/**
 * AI Chat Route
 * Обработка чата с AI с доступом к контексту системы
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// Валидация входных данных
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  mode: z.enum(['expert', 'normal']).optional().default('normal'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = ChatRequestSchema.parse(body)
    
    // Получаем контекст для AI
    const contextData = await getContextData()
    
    // Формируем ответ
    const response = {
      success: true,
      message: `AI ответ на: "${validated.message.substring(0, 50)}..."`,
      context: contextData,
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getContextData() {
  try {
    // Получаем только существующие в схеме поля
    const campaigns = await db.campaign.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        budget: true,
        spent: true,
        revenue: true,
        niche: true,
        leadsCount: true,
      },
      take: 20,
    })

    const accounts = await db.account.findMany({
      select: {
        id: true,
        username: true,
        platform: true,
        status: true,
      },
      take: 20,
    })

    return {
      campaignsCount: campaigns.length,
      accountsCount: accounts.length,
      campaigns: campaigns.slice(0, 5),
    }
  } catch (error) {
    console.error('Error getting context:', error)
    return { error: 'Could not load context' }
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Chat API is running',
    timestamp: new Date().toISOString()
  })
}
