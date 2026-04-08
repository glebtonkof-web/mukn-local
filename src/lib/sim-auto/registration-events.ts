/**
 * Registration Events - Real-time event emitter for SIM Auto Registration
 * Handles WebSocket events, progress updates, and notifications
 */

import { EventEmitter } from 'events'
import { emitToAll, emitToUser, getSocketIO } from '@/lib/socket'
import { logger } from '@/lib/logger'

// Types for registration events
export interface RegistrationStartedEvent {
  jobId: string
  platform: string
  phoneNumber: string
  deviceId: string
  timestamp: Date
}

export interface RegistrationProgressEvent {
  jobId: string
  platform: string
  stage: 'initializing' | 'launching_browser' | 'navigating' | 'entering_phone' | 'waiting_sms' | 'entering_code' | 'completing_profile' | 'verifying' | 'completed' | 'failed'
  message: string
  percent: number
  details?: Record<string, unknown>
  timestamp: Date
}

export interface RegistrationCompletedEvent {
  jobId: string
  platform: string
  phoneNumber: string
  success: boolean
  username?: string
  accountId?: string
  error?: string
  requiresManualAction?: boolean
  manualActionType?: 'captcha' | 'sms' | 'email' | 'other'
  duration: number
  timestamp: Date
}

export interface RegistrationErrorEvent {
  jobId: string
  platform: string
  error: string
  retryCount: number
  maxRetries: number
  willRetry: boolean
  timestamp: Date
}

export interface CaptchaDetectedEvent {
  jobId: string
  platform: string
  captchaType: 'recaptcha' | 'hcaptcha' | 'arkose' | 'image' | 'unknown'
  solveAttempts: number
  timestamp: Date
}

export interface SmsReceivedEvent {
  jobId: string
  platform: string
  code: string
  sender: string
  timestamp: Date
}

export interface ProxyChangeEvent {
  jobId: string
  platform: string
  oldProxy?: string
  newProxy: string
  reason: string
  timestamp: Date
}

// Global event emitter for registration events
const registrationEmitter = new EventEmitter()

// Increase max listeners for high-volume scenarios
registrationEmitter.setMaxListeners(100)

// Event names
export const REGISTRATION_EVENTS = {
  STARTED: 'registration:started',
  PROGRESS: 'registration:progress',
  COMPLETED: 'registration:completed',
  ERROR: 'registration:error',
  CAPTCHA_DETECTED: 'registration:captcha',
  CAPTCHA_SOLVED: 'registration:captcha:solved',
  SMS_RECEIVED: 'registration:sms',
  PROXY_CHANGE: 'registration:proxy:change',
  BROWSER_LAUNCHED: 'registration:browser:launched',
  PAGE_LOADED: 'registration:page:loaded',
  PHONE_ENTERED: 'registration:phone:entered',
  CODE_ENTERED: 'registration:code:entered',
  WARMING_STARTED: 'registration:warming:started',
  SCHEME_APPLIED: 'registration:scheme:applied',
} as const

/**
 * Emit registration started event
 */
export function emitRegistrationStarted(data: RegistrationStartedEvent): void {
  logger.info(`[RegistrationEvents] Registration started: ${data.platform} - ${data.jobId}`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.STARTED, data)
  
  // Emit via WebSocket
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.STARTED, data)
  }
}

/**
 * Emit registration progress event
 */
export function emitRegistrationProgress(data: RegistrationProgressEvent): void {
  logger.debug(`[RegistrationEvents] Progress: ${data.platform} - ${data.stage} (${data.percent}%)`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.PROGRESS, data)
  
  // Emit via WebSocket
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.PROGRESS, data)
  }
}

/**
 * Emit registration completed event
 */
export function emitRegistrationCompleted(data: RegistrationCompletedEvent): void {
  const status = data.success ? 'SUCCESS' : 'FAILED'
  logger.info(`[RegistrationEvents] Registration ${status}: ${data.platform} - ${data.jobId} (${data.duration}ms)`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.COMPLETED, data)
  
  // Emit via WebSocket
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.COMPLETED, data)
  }
}

/**
 * Emit registration error event
 */
export function emitRegistrationError(data: RegistrationErrorEvent): void {
  logger.error(`[RegistrationEvents] Error: ${data.platform} - ${data.error} (retry ${data.retryCount}/${data.maxRetries})`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.ERROR, data)
  
  // Emit via WebSocket
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.ERROR, data)
  }
}

/**
 * Emit captcha detected event
 */
export function emitCaptchaDetected(data: CaptchaDetectedEvent): void {
  logger.info(`[RegistrationEvents] Captcha detected: ${data.captchaType} for ${data.platform}`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.CAPTCHA_DETECTED, data)
  
  // Emit via WebSocket
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.CAPTCHA_DETECTED, data)
  }
}

/**
 * Emit captcha solved event
 */
export function emitCaptchaSolved(data: { jobId: string; platform: string; captchaType: string; solveTime: number }): void {
  logger.info(`[RegistrationEvents] Captcha solved: ${data.captchaType} for ${data.platform} in ${data.solveTime}ms`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.CAPTCHA_SOLVED, data)
  
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.CAPTCHA_SOLVED, data)
  }
}

/**
 * Emit SMS received event
 */
export function emitSmsReceived(data: SmsReceivedEvent): void {
  // Mask the code in logs
  const maskedCode = data.code.substring(0, 2) + '****'
  logger.info(`[RegistrationEvents] SMS received: ${data.sender} -> ${maskedCode}`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.SMS_RECEIVED, data)
  
  // Emit via WebSocket (with masked code for security)
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.SMS_RECEIVED, {
      ...data,
      code: maskedCode // Don't send full code via WebSocket
    })
  }
}

/**
 * Emit proxy change event
 */
export function emitProxyChange(data: ProxyChangeEvent): void {
  logger.info(`[RegistrationEvents] Proxy changed: ${data.oldProxy || 'none'} -> ${data.newProxy} (${data.reason})`)
  
  registrationEmitter.emit(REGISTRATION_EVENTS.PROXY_CHANGE, data)
  
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.PROXY_CHANGE, data)
  }
}

/**
 * Emit browser launched event
 */
export function emitBrowserLaunched(data: { jobId: string; platform: string; proxy?: string }): void {
  registrationEmitter.emit(REGISTRATION_EVENTS.BROWSER_LAUNCHED, data)
  
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.BROWSER_LAUNCHED, data)
  }
}

/**
 * Emit page loaded event
 */
export function emitPageLoaded(data: { jobId: string; platform: string; url: string; title: string }): void {
  registrationEmitter.emit(REGISTRATION_EVENTS.PAGE_LOADED, data)
  
  if (getSocketIO()) {
    emitToAll(REGISTRATION_EVENTS.PAGE_LOADED, data)
  }
}

/**
 * Subscribe to registration events
 */
export function onRegistrationEvent(
  event: typeof REGISTRATION_EVENTS[keyof typeof REGISTRATION_EVENTS],
  callback: (data: unknown) => void
): () => void {
  registrationEmitter.on(event, callback)
  return () => registrationEmitter.off(event, callback)
}

/**
 * Subscribe to all registration events
 */
export function onAllRegistrationEvents(callback: (event: string, data: unknown) => void): () => void {
  const events = Object.values(REGISTRATION_EVENTS)
  const handlers: Array<() => void> = []
  
  for (const event of events) {
    const handler = (data: unknown) => callback(event, data)
    registrationEmitter.on(event, handler)
    handlers.push(() => registrationEmitter.off(event, handler))
  }
  
  return () => {
    for (const unsubscribe of handlers) {
      unsubscribe()
    }
  }
}

/**
 * Get registration event history (from memory, limited)
 */
const eventHistory: Array<{ event: string; data: unknown; timestamp: Date }> = []
const MAX_HISTORY = 1000

// Store all events in history
onAllRegistrationEvents((event, data) => {
  eventHistory.push({ event, data, timestamp: new Date() })
  
  // Trim history
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift()
  }
})

/**
 * Get recent events
 */
export function getRecentEvents(limit: number = 50): Array<{ event: string; data: unknown; timestamp: Date }> {
  return eventHistory.slice(-limit)
}

/**
 * Get events for specific job
 */
export function getJobEvents(jobId: string): Array<{ event: string; data: unknown; timestamp: Date }> {
  return eventHistory.filter(e => {
    const d = e.data as { jobId?: string }
    return d.jobId === jobId
  })
}

export default registrationEmitter
