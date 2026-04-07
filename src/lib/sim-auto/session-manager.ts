/**
 * Session Manager - AES-256 Encrypted Session Storage for SIM Auto Registration
 * Handles storing, loading, and validating platform sessions
 */

import { db } from '@/lib/db'
import { serverEncrypt, serverDecrypt, hash, generateSecureToken } from '@/lib/crypto'
import { Prisma } from '@prisma/client'

// Platform session types
export interface PlatformSession {
  platform: Platform
  accountId: string
  username?: string
  cookies?: Record<string, string>
  localStorage?: Record<string, string>
  sessionStorage?: Record<string, string>
  headers?: Record<string, string>
  tokens?: {
    access?: string
    refresh?: string
    csrf?: string
  }
  fingerprint?: {
    userAgent: string
    screenResolution: string
    timezone: string
    language: string
    webglRenderer?: string
    canvasHash?: string
  }
  proxy?: {
    type: string
    host: string
    port: number
    username?: string
    password?: string
  }
  twoFA?: {
    enabled: boolean
    secret?: string
    backupCodes?: string[]
  }
  createdAt: Date
  lastValidatedAt?: Date
  isValid?: boolean
}

export type Platform = 'telegram' | 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'whatsapp' | 'viber' | 'signal' | 'discord' | 'reddit'

// Platform limits (accounts per SIM)
export const PLATFORM_LIMITS: Record<Platform, number> = {
  telegram: 5,
  instagram: 3,
  tiktok: 3,
  twitter: 3,
  youtube: 2,
  whatsapp: 1,
  viber: 1,
  signal: 1,
  discord: 1,
  reddit: 1
}

// Platform registration URLs
export const PLATFORM_REGISTRATION_URLS: Record<Platform, string> = {
  telegram: 'https://web.telegram.org/',
  instagram: 'https://www.instagram.com/accounts/emailsignup/',
  tiktok: 'https://www.tiktok.com/signup',
  twitter: 'https://twitter.com/i/flow/signup',
  youtube: 'https://accounts.google.com/signup',
  whatsapp: 'https://web.whatsapp.com/',
  viber: 'https://www.viber.com/en/',
  signal: 'https://signal.org/install',
  discord: 'https://discord.com/register',
  reddit: 'https://www.reddit.com/register/'
}

// Platform session validation endpoints
export const PLATFORM_VALIDATION_ENDPOINTS: Record<Platform, string> = {
  telegram: 'https://web.telegram.org/',
  instagram: 'https://www.instagram.com/accounts/edit/',
  tiktok: 'https://www.tiktok.com/api/user/detail/',
  twitter: 'https://api.twitter.com/1.1/account/verify_credentials.json',
  youtube: 'https://www.youtube.com/feed/subscriptions',
  whatsapp: 'https://web.whatsapp.com/',
  viber: 'https://chat.viber.com/',
  signal: 'https://signal.org/',
  discord: 'https://discord.com/api/v9/users/@me',
  reddit: 'https://www.reddit.com/api/me.json'
}

/**
 * Session Manager class for handling platform sessions
 */
export class SessionManager {
  private encryptionKey: string

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || process.env.ENCRYPTION_KEY || generateSecureToken(32)
  }

  /**
   * Save session to encrypted storage
   */
  async saveSession(accountId: string, sessionData: PlatformSession): Promise<void> {
    try {
      // Encrypt sensitive session data
      const encryptedData = this.encryptData(JSON.stringify(sessionData))

      // Calculate session hash for integrity verification
      const sessionHash = hash(JSON.stringify(sessionData))

      // Store in database
      await db.simCardAccount.update({
        where: { id: accountId },
        data: {
          sessionData: encryptedData,
          twoFASecret: sessionData.twoFA?.secret ? this.encryptData(sessionData.twoFA.secret) : null,
          twoFABackupCodes: sessionData.twoFA?.backupCodes ? this.encryptData(JSON.stringify(sessionData.twoFA.backupCodes)) : null,
          lastActivityAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Also save to cache for quick access
      await this.cacheSession(accountId, sessionData)

      console.log(`[SessionManager] Session saved for account ${accountId}`)
    } catch (error) {
      console.error('[SessionManager] Error saving session:', error)
      throw new Error(`Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Load session from encrypted storage
   */
  async loadSession(accountId: string): Promise<PlatformSession | null> {
    try {
      // Try cache first
      const cachedSession = await this.getCachedSession(accountId)
      if (cachedSession) {
        return cachedSession
      }

      // Load from database
      const account = await db.simCardAccount.findUnique({
        where: { id: accountId },
        select: {
          sessionData: true,
          twoFASecret: true,
          twoFABackupCodes: true,
          platform: true,
          username: true,
          phoneNumber: true
        }
      })

      if (!account || !account.sessionData) {
        return null
      }

      // Decrypt session data
      const decryptedData = this.decryptData(account.sessionData)
      const session: PlatformSession = JSON.parse(decryptedData)

      // Add 2FA data if available
      if (account.twoFASecret) {
        session.twoFA = {
          enabled: true,
          secret: this.decryptData(account.twoFASecret),
          backupCodes: account.twoFABackupCodes
            ? JSON.parse(this.decryptData(account.twoFABackupCodes))
            : undefined
        }
      }

      return session
    } catch (error) {
      console.error('[SessionManager] Error loading session:', error)
      return null
    }
  }

  /**
   * Validate session is still valid
   */
  async validateSession(accountId: string): Promise<{
    valid: boolean
    reason?: string
    session?: PlatformSession
  }> {
    try {
      const session = await this.loadSession(accountId)

      if (!session) {
        return { valid: false, reason: 'Session not found' }
      }

      // Check session age
      const sessionAge = Date.now() - session.createdAt.getTime()
      const maxAge = this.getSessionMaxAge(session.platform)

      if (sessionAge > maxAge) {
        return { valid: false, reason: 'Session expired', session }
      }

      // Platform-specific validation
      const validationResult = await this.validateWithPlatform(session)

      // Update last validated timestamp
      if (validationResult.valid) {
        session.lastValidatedAt = new Date()
        session.isValid = true
        await this.saveSession(accountId, session)
      }

      return {
        valid: validationResult.valid,
        reason: validationResult.reason,
        session
      }
    } catch (error) {
      console.error('[SessionManager] Error validating session:', error)
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Unknown validation error'
      }
    }
  }

  /**
   * Encrypt data using AES-256
   */
  encryptData(data: string): string {
    return serverEncrypt(data)
  }

  /**
   * Decrypt data
   */
  decryptData(encrypted: string): string {
    return serverDecrypt(encrypted)
  }

  /**
   * Export session for transfer/backup
   */
  async exportSession(accountId: string): Promise<string> {
    const session = await this.loadSession(accountId)
    if (!session) {
      throw new Error('Session not found')
    }

    // Encrypt the entire session for export
    const exportData = {
      ...session,
      exportedAt: new Date(),
      accountId
    }

    return this.encryptData(JSON.stringify(exportData))
  }

  /**
   * Import session from backup
   */
  async importSession(
    accountId: string,
    encryptedExport: string
  ): Promise<PlatformSession> {
    const decrypted = this.decryptData(encryptedExport)
    const session: PlatformSession = JSON.parse(decrypted)

    // Update account ID for new owner
    session.accountId = accountId
    session.createdAt = new Date()

    await this.saveSession(accountId, session)

    return session
  }

  /**
   * Delete session
   */
  async deleteSession(accountId: string): Promise<void> {
    await db.simCardAccount.update({
      where: { id: accountId },
      data: {
        sessionData: null,
        twoFASecret: null,
        twoFABackupCodes: null,
        status: 'banned',
        updatedAt: new Date()
      }
    })

    // Clear from cache
    await this.clearCachedSession(accountId)
  }

  /**
   * Get all sessions for a SIM card
   */
  async getSessionsForSimCard(simCardId: string): Promise<PlatformSession[]> {
    const accounts = await db.simCardAccount.findMany({
      where: {
        simCardId,
        sessionData: { not: null }
      }
    })

    const sessions: PlatformSession[] = []

    for (const account of accounts) {
      if (account.sessionData) {
        try {
          const session = await this.loadSession(account.id)
          if (session) {
            sessions.push(session)
          }
        } catch (error) {
          console.error(`[SessionManager] Error loading session for account ${account.id}:`, error)
        }
      }
    }

    return sessions
  }

  /**
   * Rotate session tokens (if supported by platform)
   */
  async rotateTokens(accountId: string): Promise<PlatformSession> {
    const session = await this.loadSession(accountId)

    if (!session) {
      throw new Error('Session not found')
    }

    // Platform-specific token rotation
    switch (session.platform) {
      case 'telegram':
        // Telegram doesn't require token rotation in the same way
        break

      case 'discord':
        // Discord token refresh if we have refresh token
        if (session.tokens?.refresh) {
          const newTokens = await this.refreshDiscordToken(session.tokens.refresh)
          session.tokens = {
            ...session.tokens,
            ...newTokens
          }
        }
        break

      case 'reddit':
        // Reddit OAuth token refresh
        if (session.tokens?.refresh) {
          const newTokens = await this.refreshRedditToken(session.tokens.refresh)
          session.tokens = {
            ...session.tokens,
            ...newTokens
          }
        }
        break

      default:
        // Most platforms require re-authentication
        console.log(`[SessionManager] Token rotation not supported for ${session.platform}`)
    }

    await this.saveSession(accountId, session)
    return session
  }

  // Private helper methods

  private getSessionMaxAge(platform: Platform): number {
    // Session max age in milliseconds
    const maxAges: Record<Platform, number> = {
      telegram: 365 * 24 * 60 * 60 * 1000, // 1 year
      instagram: 90 * 24 * 60 * 60 * 1000, // 90 days
      tiktok: 30 * 24 * 60 * 60 * 1000, // 30 days
      twitter: 365 * 24 * 60 * 60 * 1000, // 1 year
      youtube: 365 * 24 * 60 * 60 * 1000, // 1 year
      whatsapp: 365 * 24 * 60 * 60 * 1000, // 1 year
      viber: 365 * 24 * 60 * 60 * 1000, // 1 year
      signal: 365 * 24 * 60 * 60 * 1000, // 1 year
      discord: 7 * 24 * 60 * 60 * 1000, // 7 days
      reddit: 30 * 24 * 60 * 60 * 1000 // 30 days
    }

    return maxAges[platform]
  }

  private async validateWithPlatform(session: PlatformSession): Promise<{
    valid: boolean
    reason?: string
  }> {
    // In production, this would make actual API calls to verify the session
    // For now, we'll do basic validation

    switch (session.platform) {
      case 'telegram':
        return { valid: !!session.sessionStorage }

      case 'instagram':
        return { valid: !!session.cookies?.sessionid }

      case 'tiktok':
        return { valid: !!session.cookies?.sessionid }

      case 'twitter':
        return { valid: !!session.tokens?.access }

      case 'youtube':
        return { valid: !!session.tokens?.access }

      case 'whatsapp':
        return { valid: !!session.localStorage }

      case 'discord':
        return { valid: !!session.tokens?.access }

      case 'reddit':
        return { valid: !!session.tokens?.access }

      default:
        return { valid: !!session.cookies || !!session.tokens?.access }
    }
  }

  private async cacheSession(accountId: string, session: PlatformSession): Promise<void> {
    // Simple in-memory cache (in production, use Redis)
    const cache = (global as unknown as { sessionCache: Map<string, { session: PlatformSession; timestamp: number }> }).sessionCache || new Map()
    ;(global as unknown as { sessionCache: Map<string, { session: PlatformSession; timestamp: number }> }).sessionCache = cache

    cache.set(accountId, {
      session,
      timestamp: Date.now()
    })
  }

  private async getCachedSession(accountId: string): Promise<PlatformSession | null> {
    const cache = (global as unknown as { sessionCache: Map<string, { session: PlatformSession; timestamp: number }> }).sessionCache

    if (!cache) {
      return null
    }

    const cached = cache.get(accountId)

    if (!cached) {
      return null
    }

    // Cache is valid for 5 minutes
    if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
      cache.delete(accountId)
      return null
    }

    return cached.session
  }

  private async clearCachedSession(accountId: string): Promise<void> {
    const cache = (global as unknown as { sessionCache: Map<string, { session: PlatformSession; timestamp: number }> }).sessionCache

    if (cache) {
      cache.delete(accountId)
    }
  }

  private async refreshDiscordToken(refreshToken: string): Promise<{ access: string; refresh: string }> {
    // In production, implement actual Discord OAuth token refresh
    // For now, return mock data
    return {
      access: generateSecureToken(32),
      refresh: refreshToken
    }
  }

  private async refreshRedditToken(refreshToken: string): Promise<{ access: string; refresh: string }> {
    // In production, implement actual Reddit OAuth token refresh
    // For now, return mock data
    return {
      access: generateSecureToken(32),
      refresh: refreshToken
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()

// Helper functions for quick access
export async function saveSession(accountId: string, sessionData: PlatformSession): Promise<void> {
  return sessionManager.saveSession(accountId, sessionData)
}

export async function loadSession(accountId: string): Promise<PlatformSession | null> {
  return sessionManager.loadSession(accountId)
}

export async function validateSession(accountId: string): Promise<{
  valid: boolean
  reason?: string
  session?: PlatformSession
}> {
  return sessionManager.validateSession(accountId)
}

export function encryptData(data: string): string {
  return sessionManager.encryptData(data)
}

export function decryptData(encrypted: string): string {
  return sessionManager.decryptData(encrypted)
}

export default SessionManager
