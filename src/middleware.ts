import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware для защиты локального доступа
 * - Разрешает только localhost/127.0.0.1
 * - Требует авторизацию через API ключ или сессию
 */

// Пути которые не требуют авторизации
const PUBLIC_PATHS = [
  '/api/health',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/login',
]

// API ключ из переменной окружения (для локального доступа)
const LOCAL_API_KEY = process.env.LOCAL_API_KEY || process.env.MASTER_KEY

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl
  
  // Пропускаем публичные пути
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Статические файлы
  if (pathname.includes('.') || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // Проверяем что запрос с localhost
  const forwardedHost = request.headers.get('x-forwarded-host')
  const realHost = forwardedHost || hostname
  const hostHeader = request.headers.get('host') || ''
  
  // В режиме разработки разрешаем localhost и локальные IP
  const isLocalhost = 
    realHost === 'localhost' ||
    realHost === '127.0.0.1' ||
    realHost === '::1' ||
    hostHeader.includes('localhost') ||
    hostHeader.includes('127.0.0.1')

  // Если LOCAL_ONLY=true - блокируем внешние запросы
  if (process.env.LOCAL_ONLY === 'true' && !isLocalhost) {
    return new NextResponse('Access Denied - Local Only', { status: 403 })
  }

  // Если LOCAL_API_KEY не установлен - пропускаем (для первого запуска)
  if (!LOCAL_API_KEY) {
    return NextResponse.next()
  }

  // Проверяем авторизацию
  const sessionToken = request.cookies.get('session')?.value
  const authHeader = request.headers.get('authorization')
  const apiKeyHeader = request.headers.get('x-api-key')
  const apiKeyQuery = request.nextUrl.searchParams.get('apiKey')

  // Если есть API ключ в заголовке или query - проверяем
  const providedKey = apiKeyHeader || apiKeyQuery
  if (providedKey && providedKey === LOCAL_API_KEY) {
    return NextResponse.next()
  }

  // Bearer token авторизация
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === LOCAL_API_KEY) {
      return NextResponse.next()
    }
  }

  // Если есть сессия - пропускаем
  // (сессии проверяются в in-memory store на стороне сервера)
  if (sessionToken) {
    // Базовая проверка - наличие токена
    // Полная проверка происходит в API роутах
    return NextResponse.next()
  }

  // Для API роутов возвращаем 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Требуется авторизация' },
      { status: 401 }
    )
  }

  // Редирект на страницу авторизации
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
