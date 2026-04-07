/**
 * Registration Manager - Core Registration Functions for SIM Auto Registration
 * Handles automatic account registration across multiple platforms
 */

import { db } from '@/lib/db'
import { generateSecureToken } from '@/lib/crypto'
import { PlaywrightAutomation, type StealthConfig, type ProfileData, type RegistrationResult } from './playwright-automation'
import { sessionManager, type Platform, PLATFORM_LIMITS } from './session-manager'

// Registration status
export type RegistrationStatus = 'pending' | 'registering' | 'verifying' | 'completed' | 'failed' | 'cancelled'

// Registration job
export interface RegistrationJob {
  id: string
  simCardId: string
  platform: Platform
  phoneNumber: string
  status: RegistrationStatus
  username?: string
  password?: string
  profileData?: ProfileData
  verificationCode?: string
  errorMessage?: string
  retryCount: number
  maxRetries: number
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Platform registration config
export interface PlatformRegistrationConfig {
  requiresEmail: boolean
  requiresUsername: boolean
  requiresPassword: boolean
  requiresDateOfBirth: boolean
  requiresPhoneVerification: boolean
  requiresEmailVerification: boolean
  supportsTwoFA: boolean
  minUsernameLength: number
  maxUsernameLength: number
  passwordMinLength: number
  registrationTimeout: number // ms
  verificationTimeout: number // ms
}

// Platform-specific configurations
const PLATFORM_CONFIGS: Record<Platform, PlatformRegistrationConfig> = {
  telegram: {
    requiresEmail: false,
    requiresUsername: true,
    requiresPassword: false,
    requiresDateOfBirth: false,
    requiresPhoneVerification: true,
    requiresEmailVerification: false,
    supportsTwoFA: true,
    minUsernameLength: 5,
    maxUsernameLength: 32,
    passwordMinLength: 0,
    registrationTimeout: 120000,
    verificationTimeout: 180000
  },
  instagram: {
    requiresEmail: true,
    requiresUsername: true,
    requiresPassword: true,
    requiresDateOfBirth: true,
    requiresPhoneVerification: true,
    requiresEmailVerification: true,
    supportsTwoFA: true,
    minUsernameLength: 3,
    maxUsernameLength: 30,
    passwordMinLength: 6,
    registrationTimeout: 180000,
    verificationTimeout: 300000
  },
  tiktok: {
    requiresEmail: true,
    requiresUsername: true,
    requiresPassword: true,
    requiresDateOfBirth: true,
    requiresPhoneVerification: true,
    requiresEmailVerification: false,
    supportsTwoFA: false,
    minUsernameLength: 2,
    maxUsernameLength: 24,
    passwordMinLength: 8,
    registrationTimeout: 180000,
    verificationTimeout: 300000
  },
  twitter: {
    requiresEmail: false,
    requiresUsername: true,
    requiresPassword: true,
    requiresDateOfBirth: true,
    requiresPhoneVerification: true,
    requiresEmailVerification: false,
    supportsTwoFA: true,
    minUsernameLength: 4,
    maxUsernameLength: 15,
    passwordMinLength: 8,
    registrationTimeout: 180000,
    verificationTimeout: 300000
  },
  youtube: {
    requiresEmail: true,
    requiresUsername: false,
    requiresPassword: true,
    requiresDateOfBirth: true,
    requiresPhoneVerification: true,
    requiresEmailVerification: true,
    supportsTwoFA: true,
    minUsernameLength: 3,
    maxUsernameLength: 30,
    passwordMinLength: 8,
    registrationTimeout: 300000,
    verificationTimeout: 600000
  },
  whatsapp: {
    requiresEmail: false,
    requiresUsername: false,
    requiresPassword: false,
    requiresDateOfBirth: false,
    requiresPhoneVerification: true,
    requiresEmailVerification: false,
    supportsTwoFA: true,
    minUsernameLength: 0,
    maxUsernameLength: 0,
    passwordMinLength: 0,
    registrationTimeout: 180000,
    verificationTimeout: 300000
  },
  viber: {
    requiresEmail: false,
    requiresUsername: false,
    requiresPassword: false,
    requiresDateOfBirth: false,
    requiresPhoneVerification: true,
    requiresEmailVerification: false,
    supportsTwoFA: false,
    minUsernameLength: 0,
    maxUsernameLength: 0,
    passwordMinLength: 0,
    registrationTimeout: 120000,
    verificationTimeout: 180000
  },
  signal: {
    requiresEmail: false,
    requiresUsername: false,
    requiresPassword: false,
    requiresDateOfBirth: false,
    requiresPhoneVerification: true,
    requiresEmailVerification: false,
    supportsTwoFA: true,
    minUsernameLength: 0,
    maxUsernameLength: 0,
    passwordMinLength: 0,
    registrationTimeout: 180000,
    verificationTimeout: 300000
  },
  discord: {
    requiresEmail: true,
    requiresUsername: true,
    requiresPassword: true,
    requiresDateOfBirth: true,
    requiresPhoneVerification: false,
    requiresEmailVerification: true,
    supportsTwoFA: true,
    minUsernameLength: 2,
    maxUsernameLength: 32,
    passwordMinLength: 8,
    registrationTimeout: 120000,
    verificationTimeout: 300000
  },
  reddit: {
    requiresEmail: true,
    requiresUsername: true,
    requiresPassword: true,
    requiresDateOfBirth: false,
    requiresPhoneVerification: false,
    requiresEmailVerification: true,
    supportsTwoFA: true,
    minUsernameLength: 3,
    maxUsernameLength: 20,
    passwordMinLength: 6,
    registrationTimeout: 120000,
    verificationTimeout: 300000
  }
}

// Active registration jobs cache
const activeJobs = new Map<string, RegistrationJob>()

/**
 * Registration Manager class
 */
export class RegistrationManager {
  private defaultMaxRetries = 3

  /**
   * Register Telegram account via web
   */
  async registerTelegram(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('telegram', phoneNumber, simCardId)
  }

  /**
   * Register Instagram account
   */
  async registerInstagram(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('instagram', phoneNumber, simCardId)
  }

  /**
   * Register TikTok account
   */
  async registerTikTok(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('tiktok', phoneNumber, simCardId)
  }

  /**
   * Register Twitter/X account
   */
  async registerTwitter(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('twitter', phoneNumber, simCardId)
  }

  /**
   * Register YouTube account
   */
  async registerYouTube(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('youtube', phoneNumber, simCardId)
  }

  /**
   * Register WhatsApp account
   */
  async registerWhatsApp(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('whatsapp', phoneNumber, simCardId)
  }

  /**
   * Register Viber account
   */
  async registerViber(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('viber', phoneNumber, simCardId)
  }

  /**
   * Register Signal account
   */
  async registerSignal(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('signal', phoneNumber, simCardId)
  }

  /**
   * Register Discord account
   */
  async registerDiscord(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('discord', phoneNumber, simCardId)
  }

  /**
   * Register Reddit account
   */
  async registerReddit(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
    return this.registerAccount('reddit', phoneNumber, simCardId)
  }

  /**
   * Core registration function
   */
  async registerAccount(
    platform: Platform,
    phoneNumber: string,
    simCardId: string,
    options?: {
      profileData?: ProfileData
      proxy?: StealthConfig['proxy']
      maxRetries?: number
    }
  ): Promise<RegistrationResult> {
    const config = PLATFORM_CONFIGS[platform]

    try {
      // Check platform limits
      const limitCheck = await this.checkPlatformLimit(simCardId, platform)
      if (!limitCheck.allowed) {
        return {
          success: false,
          error: limitCheck.reason
        }
      }

      // Check if phone number is already registered
      const existingAccount = await db.simCardAccount.findFirst({
        where: {
          platform,
          phoneNumber
        }
      })

      if (existingAccount) {
        return {
          success: false,
          error: `Phone number already registered on ${platform}`
        }
      }

      // Create registration job
      const jobId = generateSecureToken(16)
      const job = await this.createRegistrationJob({
        id: jobId,
        simCardId,
        platform,
        phoneNumber,
        status: 'pending',
        profileData: options?.profileData,
        retryCount: 0,
        maxRetries: options?.maxRetries || this.defaultMaxRetries,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Start registration process
      return await this.executeRegistration(job, options?.proxy)
    } catch (error) {
      console.error(`[RegistrationManager] Error registering ${platform} account:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Execute registration with retry logic
   */
  private async executeRegistration(
    job: RegistrationJob,
    proxy?: StealthConfig['proxy']
  ): Promise<RegistrationResult> {
    const config = PLATFORM_CONFIGS[job.platform]
    let automation: PlaywrightAutomation | null = null

    for (let attempt = 0; attempt <= job.maxRetries; attempt++) {
      try {
        // Update job status
        job.status = 'registering'
        job.retryCount = attempt
        job.startedAt = new Date()
        await this.updateRegistrationJob(job)

        // Launch browser with stealth
        automation = new PlaywrightAutomation(job.platform, { proxy })
        await automation.launchBrowser()
        await automation.navigateToRegistration()

        // Fill phone number
        await automation.fillPhoneNumber(job.phoneNumber)

        // Generate profile data if not provided
        const profileData = job.profileData || await this.generateProfileData(job.platform)

        // Wait for SMS verification
        job.status = 'verifying'
        await this.updateRegistrationJob(job)

        // For platforms requiring SMS verification
        if (config.requiresPhoneVerification) {
          // Wait for SMS code (to be provided via API)
          const verificationResult = await this.waitForVerification(job.id, config.verificationTimeout)

          if (!verificationResult.success) {
            throw new Error(verificationResult.error || 'Verification timeout')
          }

          if (verificationResult.code) {
            await automation.handleSmsVerification(verificationResult.code)
          }
        }

        // Complete profile
        if (config.requiresUsername || config.requiresPassword) {
          await automation.completeProfile(profileData)
          job.username = profileData.username
        }

        // Create account record
        const accountId = generateSecureToken(16)
        const account = await db.simCardAccount.create({
          data: {
            id: accountId,
            simCardId: job.simCardId,
            jobId: job.id,
            platform: job.platform,
            phoneNumber: job.phoneNumber,
            username: profileData.username,
            password: profileData ? await this.encryptPassword(generateSecureToken(12)) : null,
            status: 'registered',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Save session
        const session = await automation.saveSession(account.id)

        // Update job as completed
        job.status = 'completed'
        job.username = profileData.username
        job.completedAt = new Date()
        await this.updateRegistrationJob(job)

        console.log(`[RegistrationManager] Successfully registered ${job.platform} account: ${profileData.username}`)

        return {
          success: true,
          accountId: account.id,
          username: profileData.username,
          session,
          retryCount: attempt
        }
      } catch (error) {
        console.error(`[RegistrationManager] Registration attempt ${attempt + 1} failed:`, error)

        // Update job with error
        job.status = attempt < job.maxRetries ? 'pending' : 'failed'
        job.errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await this.updateRegistrationJob(job)

        if (attempt >= job.maxRetries) {
          return {
            success: false,
            error: job.errorMessage,
            retryCount: attempt,
            requiresManualAction: this.requiresManualAction(error)
          }
        }

        // Wait before retry
        await this.delay(5000 * (attempt + 1))
      } finally {
        if (automation) {
          await automation.close()
        }
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      retryCount: job.maxRetries
    }
  }

  /**
   * Check platform limit for SIM card
   */
  async checkPlatformLimit(simCardId: string, platform: Platform): Promise<{
    allowed: boolean
    reason?: string
    current: number
    limit: number
  }> {
    const limit = PLATFORM_LIMITS[platform]

    const currentCount = await db.simCardAccount.count({
      where: {
        simCardId,
        platform,
        status: { in: ['registered', 'warming', 'active'] }
      }
    })

    if (currentCount >= limit) {
      return {
        allowed: false,
        reason: `Platform limit reached for ${platform}: ${currentCount}/${limit}`,
        current: currentCount,
        limit
      }
    }

    return {
      allowed: true,
      current: currentCount,
      limit
    }
  }

  /**
   * Get registration status
   */
  async getRegistrationStatus(jobId: string): Promise<RegistrationJob | null> {
    // Check cache first
    const cachedJob = activeJobs.get(jobId)
    if (cachedJob) {
      return cachedJob
    }

    // Load from database
    const dbJob = await db.simCardRegistrationJob.findUnique({
      where: { id: jobId }
    })

    if (!dbJob) {
      return null
    }

    return {
      id: dbJob.id,
      simCardId: dbJob.simCardId,
      platform: dbJob.platform as Platform,
      phoneNumber: '', // Not stored in job table
      status: dbJob.status as RegistrationStatus,
      username: dbJob.username || undefined,
      password: dbJob.password || undefined,
      verificationCode: dbJob.verificationCode || undefined,
      errorMessage: dbJob.errorMessage || undefined,
      retryCount: dbJob.retryCount,
      maxRetries: dbJob.maxRetries,
      startedAt: dbJob.startedAt || undefined,
      completedAt: dbJob.completedAt || undefined,
      createdAt: dbJob.createdAt,
      updatedAt: dbJob.updatedAt
    }
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(jobId: string): Promise<boolean> {
    const job = await this.getRegistrationStatus(jobId)

    if (!job) {
      return false
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false
    }

    // Update job status
    await db.simCardRegistrationJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    })

    // Remove from cache
    activeJobs.delete(jobId)

    return true
  }

  /**
   * Provide verification code
   */
  async provideVerificationCode(jobId: string, code: string): Promise<boolean> {
    const job = await this.getRegistrationStatus(jobId)

    if (!job || job.status !== 'verifying') {
      return false
    }

    // Store verification code for the waiting process
    const verificationKey = `verification_${jobId}`
    ;(global as unknown as Map<string, { code: string; timestamp: number }>).set(verificationKey, {
      code,
      timestamp: Date.now()
    })

    // Update job
    await db.simCardRegistrationJob.update({
      where: { id: jobId },
      data: {
        verificationCode: code,
        updatedAt: new Date()
      }
    })

    return true
  }

  /**
   * Get all registered accounts
   */
  async getRegisteredAccounts(filters?: {
    simCardId?: string
    platform?: Platform
    status?: string
  }): Promise<unknown[]> {
    const where: Record<string, unknown> = {}

    if (filters?.simCardId) {
      where.simCardId = filters.simCardId
    }

    if (filters?.platform) {
      where.platform = filters.platform
    }

    if (filters?.status) {
      where.status = filters.status
    }

    return db.simCardAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Delete account
   */
  async deleteAccount(accountId: string): Promise<boolean> {
    try {
      // Delete session
      await sessionManager.deleteSession(accountId)

      // Delete account
      await db.simCardAccount.delete({
        where: { id: accountId }
      })

      return true
    } catch (error) {
      console.error('[RegistrationManager] Error deleting account:', error)
      return false
    }
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform: Platform): PlatformRegistrationConfig {
    return PLATFORM_CONFIGS[platform]
  }

  /**
   * Get all platform limits
   */
  getPlatformLimits(): Record<Platform, number> {
    return { ...PLATFORM_LIMITS }
  }

  // Private helper methods

  private async createRegistrationJob(job: RegistrationJob): Promise<RegistrationJob> {
    // Store in database
    await db.simCardRegistrationJob.create({
      data: {
        id: job.id,
        simCardId: job.simCardId,
        platform: job.platform,
        status: job.status,
        username: job.username,
        password: job.password,
        verificationCode: job.verificationCode,
        errorMessage: job.errorMessage,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    })

    // Cache the job
    activeJobs.set(job.id, job)

    return job
  }

  private async updateRegistrationJob(job: RegistrationJob): Promise<void> {
    // Update database
    await db.simCardRegistrationJob.update({
      where: { id: job.id },
      data: {
        status: job.status,
        username: job.username,
        password: job.password,
        verificationCode: job.verificationCode,
        errorMessage: job.errorMessage,
        retryCount: job.retryCount,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        updatedAt: new Date()
      }
    })

    // Update cache
    job.updatedAt = new Date()
    activeJobs.set(job.id, job)
  }

  private async generateProfileData(platform: Platform): Promise<ProfileData> {
    const config = PLATFORM_CONFIGS[platform]

    // Generate random profile
    const firstNames = ['Александр', 'Дмитрий', 'Максим', 'Артём', 'Иван', 'Михаил', 'Никита', 'Егор']
    const lastNames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов']

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]

    const profile: ProfileData = {
      firstName,
      lastName,
      dateOfBirth: config.requiresDateOfBirth ? this.generateRandomDateOfBirth() : undefined,
      gender: Math.random() > 0.5 ? 'male' : 'female'
    }

    // Generate username if required
    if (config.requiresUsername) {
      const usernameBase = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`
      const randomSuffix = Math.floor(Math.random() * 9999)
      profile.username = `${usernameBase}${randomSuffix}`.substring(0, config.maxUsernameLength)
    }

    // Generate email if required
    if (config.requiresEmail) {
      const domains = ['gmail.com', 'mail.ru', 'yandex.ru', 'outlook.com']
      const domain = domains[Math.floor(Math.random() * domains.length)]
      profile.email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Date.now()}@${domain}`
    }

    return profile
  }

  private generateRandomDateOfBirth(): { day: number; month: number; year: number } {
    const year = Math.floor(Math.random() * (2000 - 1985) + 1985)
    const month = Math.floor(Math.random() * 12) + 1
    const day = Math.floor(Math.random() * 28) + 1

    return { day, month, year }
  }

  private async waitForVerification(jobId: string, timeout: number): Promise<{
    success: boolean
    code?: string
    error?: string
  }> {
    const verificationKey = `verification_${jobId}`
    const startTime = Date.now()

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const verification = (global as unknown as Map<string, { code: string; timestamp: number }>).get(verificationKey)

        if (verification) {
          clearInterval(checkInterval)
          ;(global as unknown as Map<string, unknown>).delete(verificationKey)
          resolve({
            success: true,
            code: verification.code
          })
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          resolve({
            success: false,
            error: 'Verification timeout'
          })
        }
      }, 1000)
    })
  }

  private async encryptPassword(password: string): Promise<string> {
    return sessionManager.encryptData(password)
  }

  private requiresManualAction(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const manualActionKeywords = [
      'captcha',
      'recaptcha',
      'hcaptcha',
      'cloudflare',
      'rate limit',
      'suspicious',
      'blocked',
      'banned',
      'verification required'
    ]

    return manualActionKeywords.some(keyword =>
      error.message.toLowerCase().includes(keyword)
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const registrationManager = new RegistrationManager()

// Export convenience functions
export async function registerTelegram(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerTelegram(phoneNumber, simCardId)
}

export async function registerInstagram(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerInstagram(phoneNumber, simCardId)
}

export async function registerTikTok(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerTikTok(phoneNumber, simCardId)
}

export async function registerTwitter(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerTwitter(phoneNumber, simCardId)
}

export async function registerYouTube(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerYouTube(phoneNumber, simCardId)
}

export async function registerWhatsApp(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerWhatsApp(phoneNumber, simCardId)
}

export async function registerViber(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerViber(phoneNumber, simCardId)
}

export async function registerSignal(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerSignal(phoneNumber, simCardId)
}

export async function registerDiscord(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerDiscord(phoneNumber, simCardId)
}

export async function registerReddit(phoneNumber: string, simCardId: string): Promise<RegistrationResult> {
  return registrationManager.registerReddit(phoneNumber, simCardId)
}

export default RegistrationManager
