/**
 * API: DeepSeek Free — Генерация комментария
 * POST /api/deepseek-free/generate-comment
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDeepSeekFreeManager } from '@/lib/deepseek-free'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      userId, 
      postText, 
      offerType, 
      style 
    } = body

    if (!userId || !postText || !offerType) {
      return NextResponse.json({
        success: false,
        error: 'Требуются userId, postText и offerType'
      }, { status: 400 })
    }

    const manager = getDeepSeekFreeManager()
    
    const result = await manager.generateComment(userId, postText, offerType, style || 'casual')

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[DeepSeek Free Generate Comment Error]', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ошибка при генерации комментария'
    }, { status: 500 })
  }
}
