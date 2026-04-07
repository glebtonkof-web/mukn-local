/**
 * API Route - Proxy Management
 * Безопасное управление прокси с защитой критических данных
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getProxyManager,
  getWorkingProxies,
  getBestProxyForPlatform,
  initializeProxies,
  type ProxyInfo
} from '@/lib/sim-auto/proxy-manager'

// GET - Get proxy stats and working proxies
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  
  try {
    const manager = getProxyManager()
    
    switch (action) {
      case 'stats':
        const stats = manager.getStats()
        return NextResponse.json({ success: true, stats })
        
      case 'list':
        const working = getWorkingProxies()
        return NextResponse.json({ 
          success: true, 
          proxies: working.slice(0, 50),
          total: working.length 
        })
        
      case 'best':
        const platform = searchParams.get('platform') || 'telegram'
        const best = await getBestProxyForPlatform(platform)
        return NextResponse.json({ 
          success: true, 
          proxy: best 
        })
        
      case 'security':
        const securityLog = manager.getSecurityLog()
        return NextResponse.json({
          success: true,
          securityEvents: securityLog.slice(-50)
        })
        
      default:
        const defaultStats = manager.getStats()
        const defaultWorking = getWorkingProxies()
        return NextResponse.json({ 
          success: true, 
          stats: defaultStats,
          workingCount: defaultWorking.length
        })
    }
    
  } catch (error) {
    console.error('[API Proxy GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Manage proxies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, host, reason } = body
    const manager = getProxyManager()
    
    switch (action) {
      case 'refresh':
        // Запускаем обновление в фоне
        initializeProxies().catch(err => {
          console.error('Proxy refresh error:', err)
        })
        return NextResponse.json({ 
          success: true,
          message: 'Proxy refresh started in background' 
        })
        
      case 'blacklist':
        if (!host) {
          return NextResponse.json({ 
            success: false, 
            error: 'Host is required' 
          }, { status: 400 })
        }
        manager.addToBlacklist(host, reason || 'Manual blacklist')
        return NextResponse.json({ 
          success: true,
          message: `Proxy ${host} added to blacklist` 
        })
        
      case 'clear':
        manager.clearAll()
        return NextResponse.json({ 
          success: true,
          message: 'All proxies cleared' 
        })
        
      default:
        // Default: refresh proxies
        initializeProxies().catch(err => {
          console.error('Proxy refresh error:', err)
        })
        return NextResponse.json({ 
          success: true,
          message: 'Proxy refresh started in background' 
        })
    }
    
  } catch (error) {
    console.error('[API Proxy POST] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
