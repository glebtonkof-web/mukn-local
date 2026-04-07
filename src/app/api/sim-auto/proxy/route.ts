/**
 * API Endpoints для управления прокси
 * 
 * Безопасный менеджмент прокси с защитой критических данных
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProxyManager, initializeProxies } from '@/lib/sim-auto/proxy-manager'

/**
 * GET /api/sim-auto/proxy
 * Получить статистику и список рабочих прокси
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getProxyManager()
    const stats = manager.getStats()
    const securityLog = manager.getSecurityLog()
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        securityEvents: securityLog.slice(-20), // Последние 20 событий безопасности
        message: stats.workingProxies > 0 
          ? `${stats.workingProxies} рабочих прокси доступно` 
          : 'Нет рабочих прокси. Запустите /api/sim-auto/proxy/refresh'
      }
    })
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
 * - action: 'refresh' | 'clear' | 'blacklist'
 * - host?: string (для blacklist)
 * - reason?: string (для blacklist)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, host, reason } = body
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
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Use: refresh, clear, blacklist`
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
