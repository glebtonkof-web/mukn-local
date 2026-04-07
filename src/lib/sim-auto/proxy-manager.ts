/**
 * Proxy Manager - Automatic Free Proxy Collection and Verification
 * Collects free proxies from multiple open sources for use in RF
 */

import { EventEmitter } from 'events'
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'

// Proxy types
export interface ProxyInfo {
  id: string
  host: string
  port: number
  type: 'http' | 'https' | 'socks4' | 'socks5'
  country?: string
  anonymity?: 'transparent' | 'anonymous' | 'elite'
  speed?: number // ms
  lastChecked?: Date
  working?: boolean
  source?: string
  failures?: number
  successes?: number
}

// Proxy sources configuration
const PROXY_SOURCES = {
  // Free proxy list APIs
  proxyscrape: {
    urls: [
      'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
      'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=10000&country=all',
      'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all',
    ],
    parser: 'line' // ip:port per line
  },
  
  // GitHub proxy lists (most reliable)
  github: {
    urls: [
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
      'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/proxy.txt',
      'https://raw.githubusercontent.com/mmpx12/proxy-list/master/https.txt',
    ],
    parser: 'line'
  },
  
  // Proxy-list.download
  proxylist: {
    urls: [
      'https://www.proxy-list.download/api/v1/get?type=http',
      'https://www.proxy-list.download/api/v1/get?type=https',
      'https://www.proxy-list.download/api/v1/get?type=socks4',
      'https://www.proxy-list.download/api/v1/get?type=socks5',
    ],
    parser: 'line'
  },
  
  // Geonode
  geonode: {
    urls: [
      'https://proxylist.geonode.com/api/proxy-list?limit=500&page=1&sort_by=lastChecked&sort_type=desc',
    ],
    parser: 'json',
    jsonPath: 'data'
  }
}

// Test URLs for proxy verification
const TEST_URLS = [
  { url: 'http://ip-api.com/json/', expectedField: 'query' },
  { url: 'https://api.ipify.org?format=json', expectedField: 'ip' },
  { url: 'http://myip.ipip.net', expectedField: null },
  { url: 'https://web.telegram.org/a/', expectedField: null },
  { url: 'https://www.instagram.com/', expectedField: null },
]

// Platform-specific test URLs
const PLATFORM_TEST_URLS: Record<string, string[]> = {
  telegram: ['https://web.telegram.org/a/', 'https://t.me/'],
  instagram: ['https://www.instagram.com/', 'https://i.instagram.com/'],
  tiktok: ['https://www.tiktok.com/', 'https://api.tiktok.com/'],
  twitter: ['https://x.com/', 'https://api.twitter.com/'],
  youtube: ['https://www.youtube.com/', 'https://api.youtube.com/'],
  whatsapp: ['https://web.whatsapp.com/', 'https://api.whatsapp.com/'],
  discord: ['https://discord.com/', 'https://discordapp.com/'],
  reddit: ['https://www.reddit.com/', 'https://api.reddit.com/'],
}

// Events
const proxyEvents = new EventEmitter()

// Cache
let proxyCache: ProxyInfo[] = []
let lastFetchTime: Date | null = null
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const MAX_PROXIES = 1000
const MIN_WORKING_PROXIES = 10

/**
 * Fetch proxies from all sources
 */
export async function fetchProxiesFromSources(): Promise<ProxyInfo[]> {
  logger.info('[ProxyManager] Starting proxy fetch from all sources...')
  
  const allProxies: ProxyInfo[] = []
  const errors: string[] = []
  
  // Fetch from each source type
  for (const [sourceName, source] of Object.entries(PROXY_SOURCES)) {
    for (const url of source.urls) {
      try {
        logger.debug(`[ProxyManager] Fetching from ${sourceName}: ${url}`)
        
        const response = await fetchWithTimeout(url, 15000)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const text = await response.text()
        let proxies: ProxyInfo[] = []
        
        // Determine proxy type from URL
        let proxyType: ProxyInfo['type'] = 'http'
        if (url.includes('socks4')) proxyType = 'socks4'
        else if (url.includes('socks5')) proxyType = 'socks5'
        else if (url.includes('https')) proxyType = 'https'
        
        if (source.parser === 'line') {
          proxies = parseLineFormat(text, proxyType, sourceName)
        } else if (source.parser === 'json') {
          proxies = parseJsonFormat(text, source.jsonPath || '', proxyType, sourceName)
        }
        
        allProxies.push(...proxies)
        logger.info(`[ProxyManager] Fetched ${proxies.length} proxies from ${sourceName}`)
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${sourceName}: ${errorMsg}`)
        logger.warn(`[ProxyManager] Failed to fetch from ${sourceName}: ${errorMsg}`)
      }
    }
  }
  
  // Remove duplicates
  const uniqueProxies = deduplicateProxies(allProxies)
  
  logger.info(`[ProxyManager] Total unique proxies: ${uniqueProxies.length}`)
  
  if (errors.length > 0) {
    logger.warn(`[ProxyManager] Fetch errors: ${errors.join(', ')}`)
  }
  
  return uniqueProxies
}

/**
 * Parse line format (ip:port)
 */
function parseLineFormat(text: string, type: ProxyInfo['type'], source: string): ProxyInfo[] {
  const proxies: ProxyInfo[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Match ip:port format
    const match = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})$/)
    
    if (match) {
      const [, host, portStr] = match
      const port = parseInt(portStr)
      
      if (port > 0 && port <= 65535) {
        proxies.push({
          id: `${host}:${port}`,
          host,
          port,
          type,
          source,
          failures: 0,
          successes: 0
        })
      }
    }
  }
  
  return proxies
}

/**
 * Parse JSON format
 */
function parseJsonFormat(text: string, jsonPath: string, type: ProxyInfo['type'], source: string): ProxyInfo[] {
  const proxies: ProxyInfo[] = []
  
  try {
    const data = JSON.parse(text)
    const items = jsonPath ? data[jsonPath] : data
    
    if (!Array.isArray(items)) return proxies
    
    for (const item of items) {
      const host = item.ip || item.host || item.proxy
      const port = item.port || parseInt(item.port)
      
      if (host && port) {
        proxies.push({
          id: `${host}:${port}`,
          host,
          port,
          type: item.protocol || type,
          country: item.country,
          anonymity: item.anonymity,
          source,
          failures: 0,
          successes: 0
        })
      }
    }
  } catch (error) {
    logger.debug(`[ProxyManager] JSON parse error: ${error}`)
  }
  
  return proxies
}

/**
 * Remove duplicate proxies
 */
function deduplicateProxies(proxies: ProxyInfo[]): ProxyInfo[] {
  const seen = new Set<string>()
  const unique: ProxyInfo[] = []
  
  for (const proxy of proxies) {
    const key = `${proxy.host}:${proxy.port}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(proxy)
    }
  }
  
  return unique
}

/**
 * Verify a single proxy
 */
export async function verifyProxy(proxy: ProxyInfo): Promise<ProxyInfo> {
  const startTime = Date.now()
  
  try {
    // Use fetch with proxy (Node.js 18+)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    // Build proxy URL
    const proxyUrl = `${proxy.type}://${proxy.host}:${proxy.port}`
    
    // Test with a simple IP check
    const response = await fetch('http://ip-api.com/json/', {
      signal: controller.signal,
      // @ts-expect-error - Node.js specific
      agent: new (await import('undici')).ProxyAgent(proxyUrl),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const data = await response.json()
      proxy.speed = Date.now() - startTime
      proxy.working = true
      proxy.lastChecked = new Date()
      proxy.country = data.countryCode || proxy.country
      proxy.successes = (proxy.successes || 0) + 1
      
      logger.debug(`[ProxyManager] Proxy ${proxy.id} works (${proxy.speed}ms)`)
    } else {
      proxy.working = false
      proxy.failures = (proxy.failures || 0) + 1
      proxy.lastChecked = new Date()
    }
    
  } catch (error) {
    proxy.working = false
    proxy.failures = (proxy.failures || 0) + 1
    proxy.lastChecked = new Date()
    
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logger.debug(`[ProxyManager] Proxy ${proxy.id} failed: ${errorMsg}`)
  }
  
  return proxy
}

/**
 * Verify proxy works for specific platform
 */
export async function verifyProxyForPlatform(
  proxy: ProxyInfo, 
  platform: string
): Promise<boolean> {
  const testUrls = PLATFORM_TEST_URLS[platform] || []
  
  for (const url of testUrls) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const proxyUrl = `${proxy.type}://${proxy.host}:${proxy.port}`
      
      const response = await fetch(url, {
        signal: controller.signal,
        // @ts-expect-error - Node.js specific
        agent: new (await import('undici')).ProxyAgent(proxyUrl),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok || response.status === 302) {
        logger.info(`[ProxyManager] Proxy ${proxy.id} works for ${platform}`)
        return true
      }
      
    } catch (error) {
      // Try next URL
    }
  }
  
  return false
}

/**
 * Batch verify proxies
 */
export async function verifyProxies(
  proxies: ProxyInfo[], 
  concurrency: number = 10,
  onProgress?: (checked: number, total: number) => void
): Promise<ProxyInfo[]> {
  logger.info(`[ProxyManager] Verifying ${proxies.length} proxies...`)
  
  const verified: ProxyInfo[] = []
  let checked = 0
  
  // Process in batches
  for (let i = 0; i < proxies.length; i += concurrency) {
    const batch = proxies.slice(i, i + concurrency)
    
    const results = await Promise.all(
      batch.map(proxy => verifyProxy(proxy))
    )
    
    verified.push(...results)
    checked += batch.length
    
    if (onProgress) {
      onProgress(checked, proxies.length)
    }
    
    // Emit progress event
    proxyEvents.emit('verification_progress', {
      checked,
      total: proxies.length,
      working: verified.filter(p => p.working).length
    })
    
    // Small delay between batches
    if (i + concurrency < proxies.length) {
      await delay(100)
    }
  }
  
  const workingProxies = verified.filter(p => p.working)
  logger.info(`[ProxyManager] Verification complete: ${workingProxies.length}/${proxies.length} working`)
  
  return verified
}

/**
 * Get working proxies, fetching and verifying if needed
 */
export async function getWorkingProxies(forceRefresh: boolean = false): Promise<ProxyInfo[]> {
  // Check cache
  if (!forceRefresh && proxyCache.length > 0 && lastFetchTime) {
    const cacheAge = Date.now() - lastFetchTime.getTime()
    
    if (cacheAge < CACHE_TTL) {
      const working = proxyCache.filter(p => p.working)
      if (working.length >= MIN_WORKING_PROXIES) {
        return working
      }
    }
  }
  
  // Fetch new proxies
  const proxies = await fetchProxiesFromSources()
  
  // Limit to prevent overwhelming verification
  const toVerify = proxies.slice(0, MAX_PROXIES)
  
  // Verify
  const verified = await verifyProxies(toVerify)
  
  // Store working proxies in database
  const working = verified.filter(p => p.working)
  await storeProxiesInDb(working)
  
  // Update cache
  proxyCache = verified
  lastFetchTime = new Date()
  
  return working
}

/**
 * Get best proxy for platform
 */
export async function getBestProxyForPlatform(platform: string): Promise<ProxyInfo | null> {
  const working = await getWorkingProxies()
  
  // Sort by speed and success rate
  const sorted = working
    .filter(p => p.working && p.speed && p.speed < 10000)
    .sort((a, b) => {
      // Prefer faster proxies
      const speedDiff = (a.speed || 9999) - (b.speed || 9999)
      if (Math.abs(speedDiff) > 2000) return speedDiff
      
      // Then prefer higher success rate
      const aRate = (a.successes || 0) / Math.max(1, (a.successes || 0) + (a.failures || 0))
      const bRate = (b.successes || 0) / Math.max(1, (b.successes || 0) + (b.failures || 0))
      return bRate - aRate
    })
  
  if (sorted.length === 0) {
    logger.warn(`[ProxyManager] No working proxies available for ${platform}`)
    return null
  }
  
  // Verify the top proxy works for this platform
  const topProxy = sorted[0]
  
  // 30% chance to verify for platform (to save time)
  if (Math.random() < 0.3) {
    const works = await verifyProxyForPlatform(topProxy, platform)
    if (!works && sorted.length > 1) {
      return sorted[1]
    }
  }
  
  return topProxy
}

/**
 * Get random working proxy
 */
export async function getRandomProxy(): Promise<ProxyInfo | null> {
  const working = await getWorkingProxies()
  
  if (working.length === 0) return null
  
  // Random selection from top 20 fastest
  const top = working
    .filter(p => p.working && p.speed && p.speed < 8000)
    .sort((a, b) => (a.speed || 9999) - (b.speed || 9999))
    .slice(0, 20)
  
  if (top.length === 0) return working[0]
  
  return top[Math.floor(Math.random() * top.length)]
}

/**
 * Store proxies in database
 */
async function storeProxiesInDb(proxies: ProxyInfo[]): Promise<void> {
  try {
    // Clear old proxies
    await db.proxy.deleteMany({
      where: {
        provider: 'free_auto'
      }
    })
    
    // Insert new ones
    for (const proxy of proxies.slice(0, 100)) {
      await db.proxy.create({
        data: {
          id: generateId(),
          type: proxy.type,
          host: proxy.host,
          port: proxy.port,
          country: proxy.country,
          status: proxy.working ? 'active' : 'inactive',
          responseTime: proxy.speed,
          provider: 'free_auto'
        }
      })
    }
    
    logger.info(`[ProxyManager] Stored ${Math.min(proxies.length, 100)} proxies in database`)
    
  } catch (error) {
    logger.error('[ProxyManager] Failed to store proxies in DB', error as Error)
  }
}

/**
 * Load proxies from database
 */
export async function loadProxiesFromDb(): Promise<ProxyInfo[]> {
  try {
    const stored = await db.proxy.findMany({
      where: {
        status: 'active',
        provider: 'free_auto'
      },
      orderBy: {
        responseTime: 'asc'
      },
      take: 100
    })
    
    return stored.map(p => ({
      id: `${p.host}:${p.port}`,
      host: p.host,
      port: p.port,
      type: p.type as ProxyInfo['type'],
      country: p.country || undefined,
      speed: p.responseTime || undefined,
      working: true,
      lastChecked: p.lastCheckAt || undefined
    }))
    
  } catch (error) {
    logger.error('[ProxyManager] Failed to load proxies from DB', error as Error)
    return []
  }
}

/**
 * Get proxy statistics
 */
export async function getProxyStats(): Promise<{
  total: number
  working: number
  byType: Record<string, number>
  byCountry: Record<string, number>
  avgSpeed: number
}> {
  const working = await getWorkingProxies()
  
  const byType: Record<string, number> = {}
  const byCountry: Record<string, number> = {}
  let totalSpeed = 0
  
  for (const proxy of working) {
    byType[proxy.type] = (byType[proxy.type] || 0) + 1
    if (proxy.country) {
      byCountry[proxy.country] = (byCountry[proxy.country] || 0) + 1
    }
    if (proxy.speed) {
      totalSpeed += proxy.speed
    }
  }
  
  return {
    total: proxyCache.length,
    working: working.length,
    byType,
    byCountry,
    avgSpeed: working.length > 0 ? totalSpeed / working.length : 0
  }
}

/**
 * Subscribe to proxy events
 */
export function onProxyEvent(
  event: 'verification_progress' | 'proxies_updated',
  callback: (data: unknown) => void
): () => void {
  proxyEvents.on(event, callback)
  return () => proxyEvents.off(event, callback)
}

/**
 * Refresh proxy list
 */
export async function refreshProxies(): Promise<ProxyInfo[]> {
  logger.info('[ProxyManager] Manual proxy refresh requested')
  
  proxyCache = []
  lastFetchTime = null
  
  return getWorkingProxies(true)
}

// Utility functions
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      }
    })
    
    clearTimeout(timeoutId)
    return response
    
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

// Export
export default {
  fetchProxiesFromSources,
  verifyProxy,
  verifyProxies,
  getWorkingProxies,
  getBestProxyForPlatform,
  getRandomProxy,
  getProxyStats,
  refreshProxies,
  onProxyEvent
}
