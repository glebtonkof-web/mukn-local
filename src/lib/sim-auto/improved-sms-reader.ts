/**
 * Improved SMS Reader - Enhanced SMS Monitoring and Code Extraction
 * Works with dual SIM devices and handles real-time SMS monitoring
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { executeCommand } from './adb-client'
import { logger } from '@/lib/logger'

export interface SmsMessage {
  id: string
  deviceId: string
  slotIndex?: number
  sender: string
  body: string
  timestamp: Date
  receivedAt: Date
  isRead: boolean
}

export interface VerificationCode {
  code: string
  platform: string
  confidence: number
  sender: string
  receivedAt: Date
}

// Platform-specific SMS patterns
const PLATFORM_PATTERNS: Record<string, {
  keywords: string[]
  senders: string[]
  codePattern: RegExp
}> = {
  telegram: {
    keywords: ['Telegram', 'Teleg', 'TG', 'telegram'],
    senders: ['Telegram', 'Telegram.org', 'TG'],
    codePattern: /\b(\d{5,6})\b/
  },
  instagram: {
    keywords: ['Instagram', 'insta', 'IG'],
    senders: ['Instagram', 'Facebook'],
    codePattern: /\b(\d{6})\b/
  },
  tiktok: {
    keywords: ['TikTok', 'tiktok', 'TT'],
    senders: ['TikTok', 'TikTok Ltd'],
    codePattern: /\b(\d{4,6})\b/
  },
  twitter: {
    keywords: ['Twitter', 'verify', 'X.com'],
    senders: ['Twitter', 'Verify', 'X'],
    codePattern: /\b(\d{6})\b/
  },
  youtube: {
    keywords: ['Google', 'YouTube', 'YT', 'G-'],
    senders: ['Google', 'YouTube', 'G'],
    codePattern: /\b(\d{6})\b/
  },
  whatsapp: {
    keywords: ['WhatsApp', 'whatsapp', 'WA'],
    senders: ['WhatsApp', 'Verify'],
    codePattern: /\b(\d{6})\b/
  },
  viber: {
    keywords: ['Viber', 'viber'],
    senders: ['Viber'],
    codePattern: /\b(\d{4,6})\b/
  },
  signal: {
    keywords: ['Signal', 'signal'],
    senders: ['Signal'],
    codePattern: /\b(\d{6})\b/
  },
  discord: {
    keywords: ['Discord', 'discord'],
    senders: ['Discord'],
    codePattern: /\b(\d{6})\b/
  },
  reddit: {
    keywords: ['Reddit', 'reddit'],
    senders: ['Reddit'],
    codePattern: /\b(\d{6})\b/
  }
}

// Event emitter for SMS events
const smsEvents = new EventEmitter()

// Active logcat listeners
const activeListeners: Map<string, ChildProcess> = new Map()

// Recent SMS cache
const recentSmsCache: Map<string, SmsMessage[]> = new Map()

/**
 * Start real-time SMS monitoring for a device
 */
export async function startSmsMonitoring(deviceId: string): Promise<{
  success: boolean
  error?: string
}> {
  logger.info(`Starting SMS monitoring for device: ${deviceId}`)
  
  if (activeListeners.has(deviceId)) {
    return { success: true }
  }
  
  const adbPath = process.env.ADB_PATH || 'adb'
  
  try {
    // Start logcat listener for SMS broadcasts
    const logcatProcess = spawn(adbPath, [
      '-s', deviceId,
      'logcat',
      '-v', 'time',
      '-s',
      'SmsReceiver:*',
      'SMS:*',
      'Telephony:*',
      'GsmInboundSmsHandler:*',
      'InboundSmsHandler:*',
      'WapPush:*',
      '*:S'
    ], {
      shell: false,
      env: process.env
    })
    
    let buffer = ''
    
    logcatProcess.stdout.on('data', (data) => {
      buffer += data.toString()
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        const message = parseLogcatLine(line, deviceId)
        if (message) {
          // Add to cache
          addToCache(deviceId, message)
          
          // Emit event
          smsEvents.emit('sms_received', message)
          
          // Check for verification code
          const code = extractVerificationCode(message)
          if (code) {
            logger.info(`Verification code detected: ${code.code} for ${code.platform}`)
            smsEvents.emit('verification_code', code)
          }
        }
      }
    })
    
    logcatProcess.stderr.on('data', (data) => {
      logger.debug(`SMS logcat stderr: ${data.toString()}`)
    })
    
    logcatProcess.on('error', (error) => {
      logger.error(`SMS logcat process error`, error)
      activeListeners.delete(deviceId)
    })
    
    logcatProcess.on('close', (code) => {
      logger.info(`SMS logcat closed for ${deviceId}, exit code: ${code}`)
      activeListeners.delete(deviceId)
    })
    
    activeListeners.set(deviceId, logcatProcess)
    
    // Also do an initial read of recent SMS
    await readRecentSms(deviceId)
    
    logger.info(`SMS monitoring started for ${deviceId}`)
    
    return { success: true }
    
  } catch (error) {
    logger.error(`Failed to start SMS monitoring for ${deviceId}`, error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Stop SMS monitoring for a device
 */
export async function stopSmsMonitoring(deviceId: string): Promise<boolean> {
  const process = activeListeners.get(deviceId)
  
  if (!process) {
    return false
  }
  
  try {
    process.kill('SIGTERM')
    activeListeners.delete(deviceId)
    logger.info(`SMS monitoring stopped for ${deviceId}`)
    return true
  } catch (error) {
    logger.error(`Failed to stop SMS monitoring for ${deviceId}`, error as Error)
    return false
  }
}

/**
 * Read recent SMS messages from device
 */
export async function readRecentSms(deviceId: string, limit: number = 50): Promise<SmsMessage[]> {
  logger.debug(`Reading recent SMS for ${deviceId}`)
  
  const messages: SmsMessage[] = []
  
  try {
    // Method 1: Content provider (most reliable)
    const contentResult = await executeCommand(deviceId,
      `content query --uri content://sms/inbox --projection address:body:date:read --sort "date DESC LIMIT ${limit}"`
    )
    
    if (contentResult.success && contentResult.output.trim()) {
      const parsed = parseContentProviderOutput(contentResult.output, deviceId)
      messages.push(...parsed)
    }
    
    // Method 2: Direct database access (requires root or special permissions)
    if (messages.length === 0) {
      const dbResult = await executeCommand(deviceId,
        'sqlite3 /data/data/com.android.providers.telephony/databases/mmssms.db "SELECT address, body, date, read FROM sms ORDER BY date DESC LIMIT 20"'
      )
      
      if (dbResult.success && dbResult.output.trim()) {
        const parsed = parseSqliteOutput(dbResult.output, deviceId)
        messages.push(...parsed)
      }
    }
    
    // Update cache
    if (messages.length > 0) {
      recentSmsCache.set(deviceId, messages)
    }
    
  } catch (error) {
    logger.error(`Error reading SMS for ${deviceId}`, error as Error)
  }
  
  return messages
}

/**
 * Wait for verification code from SMS
 */
export async function waitForVerificationCode(params: {
  deviceId: string
  platform?: string
  timeout?: number
  phoneNumber?: string
}): Promise<VerificationCode | null> {
  const { deviceId, platform, timeout = 180000, phoneNumber } = params
  
  logger.info(`Waiting for verification code on ${deviceId}`, { platform, timeout })
  
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      logger.warn(`Verification code timeout for ${deviceId}`)
      cleanup()
      resolve(null)
    }, timeout)
    
    const handler = (code: VerificationCode) => {
      // Check if this is the code we're waiting for
      if (platform && code.platform !== platform && code.platform !== 'unknown') {
        return
      }
      
      logger.info(`Verification code received: ${code.code}`)
      cleanup()
      resolve(code)
    }
    
    const cleanup = () => {
      clearTimeout(timeoutId)
      smsEvents.off('verification_code', handler)
    }
    
    smsEvents.on('verification_code', handler)
    
    // Also poll for SMS in case we miss the logcat event
    const pollInterval = setInterval(async () => {
      try {
        const messages = await readRecentSms(deviceId, 10)
        
        for (const message of messages) {
          const age = Date.now() - message.timestamp.getTime()
          
          // Only check messages from last 5 minutes
          if (age < 300000) {
            const code = extractVerificationCode(message)
            
            if (code && (!platform || code.platform === platform || code.platform === 'unknown')) {
              logger.info(`Verification code found via polling: ${code.code}`)
              cleanup()
              clearInterval(pollInterval)
              resolve(code)
              return
            }
          }
        }
      } catch (error) {
        logger.debug(`Polling error: ${error}`)
      }
    }, 3000)
    
    // Clean up interval on timeout
    setTimeout(() => clearInterval(pollInterval), timeout)
  })
}

/**
 * Parse logcat line for SMS information
 */
function parseLogcatLine(line: string, deviceId: string): SmsMessage | null {
  // Look for SMS content in logcat
  const patterns = [
    // SMS received pattern
    /(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+).*SMS.*from[:\s]+([+\d]+).*body[:\s]+(.+)/i,
    /(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+).*SmsReceiver.*from[:\s]+([+\d]+).*text[:\s]+(.+)/i,
    /(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+).*PDU.*address[:\s]+([+\d]+).*message[:\s]+(.+)/i,
    // General SMS content
    /(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+).*SMS message.*([+\d]{10,}).*[:\s]+(.{4,})/i
  ]
  
  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      const [_, timestamp, sender, body] = match
      
      // Parse timestamp
      const currentYear = new Date().getFullYear()
      const dateStr = `${currentYear}-${timestamp.replace(' ', 'T')}`
      const timestamp_date = new Date(dateStr)
      
      return {
        id: generateId(),
        deviceId,
        sender: sender.trim(),
        body: body.trim(),
        timestamp: isNaN(timestamp_date.getTime()) ? new Date() : timestamp_date,
        receivedAt: new Date(),
        isRead: false
      }
    }
  }
  
  return null
}

/**
 * Parse content provider output
 */
function parseContentProviderOutput(output: string, deviceId: string): SmsMessage[] {
  const messages: SmsMessage[] = []
  const lines = output.split('\n')
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    const message: Partial<SmsMessage> = {
      id: generateId(),
      deviceId,
      receivedAt: new Date(),
      isRead: true
    }
    
    // Parse key=value pairs
    const pairs = line.matchAll(/(\w+)=([^\s]+(?:\s+[^\s=]+)*?)(?=\s+\w+=|$)/g)
    
    for (const match of pairs) {
      const [, key, value] = match
      const cleanValue = value.replace(/^["']|["']$/g, '')
      
      switch (key.toLowerCase()) {
        case 'address':
          message.sender = cleanValue
          break
        case 'body':
          try {
            message.body = decodeURIComponent(cleanValue.replace(/\+/g, ' '))
          } catch {
            // If decode fails, use as-is
            message.body = cleanValue.replace(/\+/g, ' ')
          }
          break
        case 'date':
          const ts = parseInt(cleanValue)
          if (!isNaN(ts)) {
            message.timestamp = new Date(ts)
          }
          break
        case 'read':
          message.isRead = cleanValue === '1'
          break
      }
    }
    
    if (message.sender && message.body) {
      if (!message.timestamp) {
        message.timestamp = new Date()
      }
      messages.push(message as SmsMessage)
    }
  }
  
  return messages
}

/**
 * Parse SQLite output
 */
function parseSqliteOutput(output: string, deviceId: string): SmsMessage[] {
  const messages: SmsMessage[] = []
  const lines = output.split('\n')
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    // SQLite output format: address|body|date|read
    const parts = line.split('|')
    
    if (parts.length >= 2) {
      const [sender, body, dateStr, readStr] = parts
      
      messages.push({
        id: generateId(),
        deviceId,
        sender: sender?.trim() || 'unknown',
        body: body?.trim() || '',
        timestamp: dateStr ? new Date(parseInt(dateStr)) : new Date(),
        receivedAt: new Date(),
        isRead: readStr === '1'
      })
    }
  }
  
  return messages
}

/**
 * Extract verification code from SMS message
 */
function extractVerificationCode(message: SmsMessage): VerificationCode | null {
  const body = message.body
  const sender = message.sender.toLowerCase()
  
  // Check each platform
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    // Check if sender matches
    const senderMatches = patterns.senders.some(s => 
      sender.includes(s.toLowerCase())
    )
    
    // Check if keywords match
    const keywordMatches = patterns.keywords.some(k => 
      body.toLowerCase().includes(k.toLowerCase())
    )
    
    if (senderMatches || keywordMatches) {
      // Try to extract code
      const codeMatch = body.match(patterns.codePattern)
      
      if (codeMatch) {
        return {
          code: codeMatch[1],
          platform,
          confidence: senderMatches ? 0.95 : 0.8,
          sender: message.sender,
          receivedAt: message.receivedAt
        }
      }
    }
  }
  
  // Fallback: Look for any 4-6 digit code
  const codeMatch = body.match(/\b(\d{4,6})\b/)
  if (codeMatch) {
    return {
      code: codeMatch[1],
      platform: 'unknown',
      confidence: 0.3,
      sender: message.sender,
      receivedAt: message.receivedAt
    }
  }
  
  return null
}

/**
 * Add message to cache
 */
function addToCache(deviceId: string, message: SmsMessage): void {
  let cache = recentSmsCache.get(deviceId) || []
  cache.unshift(message)
  
  // Keep only last 100 messages
  if (cache.length > 100) {
    cache = cache.slice(0, 100)
  }
  
  recentSmsCache.set(deviceId, cache)
}

/**
 * Get cached messages for device
 */
export function getCachedMessages(deviceId: string): SmsMessage[] {
  return recentSmsCache.get(deviceId) || []
}

/**
 * Subscribe to SMS events
 */
export function onSmsReceived(callback: (message: SmsMessage) => void): () => void {
  smsEvents.on('sms_received', callback)
  return () => smsEvents.off('sms_received', callback)
}

/**
 * Subscribe to verification code events
 */
export function onVerificationCode(callback: (code: VerificationCode) => void): () => void {
  smsEvents.on('verification_code', callback)
  return () => smsEvents.off('verification_code', callback)
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * Get all active listeners
 */
export function getActiveListeners(): string[] {
  return Array.from(activeListeners.keys())
}

/**
 * Clean up all listeners on process exit
 */
process.on('SIGINT', () => {
  for (const [deviceId, process] of activeListeners) {
    try {
      process.kill('SIGTERM')
      logger.info(`Cleaned up SMS listener for ${deviceId}`)
    } catch {
      // Ignore errors during cleanup
    }
  }
})

export default {
  startSmsMonitoring,
  stopSmsMonitoring,
  readRecentSms,
  waitForVerificationCode,
  getCachedMessages,
  onSmsReceived,
  onVerificationCode,
  getActiveListeners
}
