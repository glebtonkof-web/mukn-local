/**
 * API: DeepSeek Free — Отправить запрос
 * POST /api/deepseek-free/ask
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDeepSeekFreeManager } from '@/lib/deepseek-free'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      userId, 
      prompt, 
      contextType, 
      contextData, 
      priority,
      skipCache 
    } = body

    if (!userId || !prompt) {
      return NextResponse.json({
        success: false,
        error: 'Требуются userId и prompt'
      }, { status: 400 })
    }

    const manager = getDeepSeekFreeManager()
    
    const result = await manager.ask(userId, prompt, {
      contextType,
      contextData,
      priority,
      skipCache
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[DeepSeek Free Ask Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при выполнении запроса'
    }, { status: 500 })
  }
}
