import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// Простой in-memory store для сессий (для локального использования)
// Экспортируем для middleware
export const sessions = new Map<string, { createdAt: number; ip: string }>()

// Очистка старых сессий каждые 5 минут
setInterval(() => {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now - session.createdAt > 24 * 60 * 60 * 1000) { // 24 часа
      sessions.delete(token)
    }
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, apiKey } = body

    const LOCAL_API_KEY = process.env.LOCAL_API_KEY || process.env.MASTER_KEY

    if (!LOCAL_API_KEY) {
      return NextResponse.json({ 
        error: 'Сервер не настроен. Установите LOCAL_API_KEY в .env' 
      }, { status: 500 })
    }

    const providedKey = password || apiKey

    if (!providedKey || providedKey !== LOCAL_API_KEY) {
      return NextResponse.json({ 
        error: 'Неверный пароль' 
      }, { status: 401 })
    }

    // Создаём сессию
    const sessionToken = randomUUID()
    sessions.set(sessionToken, {
      createdAt: Date.now(),
      ip: request.headers.get('x-forwarded-for') || 'local'
    })

    const response = NextResponse.json({ 
      success: true, 
      message: 'Авторизация успешна' 
    })

    // Устанавливаем cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: false, // localhost
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 часа
      path: '/'
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка авторизации' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value
  
  if (sessionToken) {
    sessions.delete(sessionToken)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('session')
  
  return response
}

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value
  
  if (sessionToken && sessions.has(sessionToken)) {
    return NextResponse.json({ authenticated: true })
  }

  return NextResponse.json({ authenticated: false }, { status: 401 })
}
