/**
 * API Endpoints для управления прокси
 * 
 * Безопасный менеджмент прокси с защитой критических данных
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProxyManager, getWorkingProxies, initializeProxies } from '@/lib/sim-auto/proxy-manager'

/**
 * GET /api/sim-auto/proxy
 * Получить статистику и список рабочих прокси
 * 
 * Query params:
 * - action: 'stats' | 'list' | 'security'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const manager = getProxyManager()
    
    switch (action) {
      case 'list':
        const proxies = getWorkingProxies()
        return NextResponse.json({
          success: true,
          proxies: proxies.map((p, i) => ({
            id: `${p.host}:${p.port}`,
            host: p.host,
            port: p.port,
            type: p.protocol,
            country: p.country,
            speed: p.responseTime,
            working: p.isWorking
          })),
          total: proxies.length
        })
        
      case 'security':
        const securityLog = manager.getSecurityLog()
        return NextResponse.json({
          success: true,
          securityEvents: securityLog.slice(-50)
        })
        
      case 'stats':
      default:
        const stats = manager.getStats()
        const securityLogDefault = manager.getSecurityLog()
        
        return NextResponse.json({
          success: true,
          data: {
            stats,
            securityEvents: securityLogDefault.slice(-20),
            message: stats.workingProxies > 0 
              ? `${stats.workingProxies} рабочих прокси доступно` 
              : 'Нет рабочих прокси. Нажмите "Найти новые прокси"'
          }
        })
    }
  } catch (error) {
    console.error('Error getting proxy stats:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/sim-auto/proxy
 * Управление прокси
 * 
 * Body:
 * - action: 'refresh' | 'clear' | 'blacklist' | 'add'
 * - host?: string (для blacklist/add)
 * - port?: number (для add)
 * - protocol?: string (для add: http, https, socks4, socks5)
 * - username?: string (для add)
 * - password?: string (для add)
 * - reason?: string (для blacklist)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, host, port, protocol, username, password, reason } = body
    const manager = getProxyManager()
    
    switch (action) {
      case 'refresh':
        // Запускаем обновление прокси в фоне
        console.log('🔄 Starting proxy refresh...')
        
        // Не ждём завершения - возвращаем ответ сразу
        initializeProxies().catch(err => {
          console.error('Proxy refresh error:', err)
        })
        
        return NextResponse.json({
          success: true,
          message: 'Обновление прокси запущено в фоне. Проверьте статус через минуту.',
          action: 'refresh'
        })
        
      case 'clear':
        manager.clearAll()
        return NextResponse.json({
          success: true,
          message: 'Все прокси очищены',
          action: 'clear'
        })
        
      case 'blacklist':
        if (!host) {
          return NextResponse.json({
            success: false,
            error: 'Host is required for blacklist action'
          }, { status: 400 })
        }
        
        manager.addToBlacklist(host, reason || 'Manual blacklist')
        return NextResponse.json({
          success: true,
          message: `Прокси ${host} добавлен в blacklist`,
          action: 'blacklist'
        })

      case 'add':
        if (!host || !port || !protocol) {
          return NextResponse.json({
            success: false,
            error: 'Host, port и protocol обязательны для добавления прокси'
          }, { status: 400 })
        }
        
        const validProtocols = ['http', 'https', 'socks4', 'socks5']
        if (!validProtocols.includes(protocol)) {
          return NextResponse.json({
            success: false,
            error: `Неверный протокол: ${protocol}. Используйте: ${validProtocols.join(', ')}`
          }, { status: 400 })
        }
        
        manager.addCustomProxy(host, port, protocol, username, password)
        return NextResponse.json({
          success: true,
          message: `Прокси ${host}:${port} (${protocol}) добавлен`,
          action: 'add'
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Use: refresh, clear, blacklist, add`
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error managing proxies:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
