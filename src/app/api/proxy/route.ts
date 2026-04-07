/**
 * API Route - Proxy Management
 * Handles proxy fetching, verification, and management
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchProxiesFromSources,
  verifyProxies,
  getWorkingProxies,
  getBestProxyForPlatform,
  getProxyStats,
  refreshProxies,
  onProxyEvent,
  type ProxyInfo
} from '@/lib/sim-auto/proxy-manager'
import { logger } from '@/lib/logger'

// GET - Get proxy stats and working proxies
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')
  
  try {
    switch (action) {
      case 'stats':
        const stats = await getProxyStats()
        return NextResponse.json({ success: true, stats })
        
      case 'list':
        const working = await getWorkingProxies()
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
        
      default:
        const defaultStats = await getProxyStats()
        const defaultWorking = await getWorkingProxies()
        return NextResponse.json({ 
          success: true, 
          stats: defaultStats,
          workingCount: defaultWorking.length
        })
    }
    
  } catch (error) {
    logger.error('[API Proxy GET] Error:', error as Error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Fetch and verify new proxies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action, proxies: inputProxies, concurrency = 20 } = body
    
    switch (action) {
      case 'fetch':
        // Fetch new proxies from sources
        const fetched = await fetchProxiesFromSources()
        return NextResponse.json({ 
          success: true, 
          count: fetched.length,
          message: `Fetched ${fetched.length} proxies` 
        })
        
      case 'verify':
        // Verify provided proxies or fetch new ones
        const toVerify = inputProxies || await fetchProxiesFromSources()
        const verified = await verifyProxies(toVerify.slice(0, 200), concurrency)
        const working = verified.filter(p => p.working)
        
        return NextResponse.json({ 
          success: true, 
          total: verified.length,
          working: working.length,
          proxies: working
        })
        
      case 'refresh':
        // Full refresh
        const refreshed = await refreshProxies()
        return NextResponse.json({ 
          success: true, 
          count: refreshed.length,
          message: `Found ${refreshed.length} working proxies` 
        })
        
      default:
        // Default: refresh proxies
        const defaultRefreshed = await refreshProxies()
        return NextResponse.json({ 
          success: true, 
          count: defaultRefreshed.length,
          message: `Found ${defaultRefreshed.length} working proxies` 
        })
    }
    
  } catch (error) {
    logger.error('[API Proxy POST] Error:', error as Error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
