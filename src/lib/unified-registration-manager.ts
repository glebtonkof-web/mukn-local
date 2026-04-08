/**
 * Unified Registration Manager
 * 
 * Единый менеджер регистрации, который:
 * 1. Регистрирует email аккаунты
 * 2. Использует их для регистрации социальных сетей
 * 3. Координирует весь процесс регистрации
 */

import { EventEmitter } from 'events'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getEmailRegistrationService, type EmailProvider } from './email-registration-service'
import { getTempEmailService } from './temp-email-service'
import { runEnhancedRegistration, PLATFORM_CONFIGS } from './sim-auto/enhanced-registration'
import type { Platform } from './sim-auto/types'

// Типы
export type RegistrationStatus = 'pending' | 'registering_email' | 'email_ready' | 'registering_social' | 'completed' | 'failed'

export interface UnifiedRegistrationTask {
  id: string
  status: RegistrationStatus
  platform: Platform
  emailProvider?: EmailProvider
  useTempEmail?: boolean
  
  // Email данные
  emailAccountId?: string
  email?: string
  emailPassword?: string
  
  // Соцсеть данные
  phoneNumber?: string
  deviceId?: string
  username?: string
  password?: string
  firstName?: string
  lastName?: string
  
  // Результаты
  socialAccountId?: string
  socialUsername?: string
  
  // Ошибки
  error?: string
  retryCount: number
  maxRetries: number
  
  // Временные метки
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface UnifiedRegistrationResult {
  success: boolean
  email?: string
  emailPassword?: string
  socialUsername?: string
  socialAccountId?: string
  error?: string
}

/**
 * Менеджер унифицированной регистрации
 */
export class UnifiedRegistrationManager extends EventEmitter {
  private tasks = new Map<string, UnifiedRegistrationTask>()
  private processing = false
  private maxConcurrent = 3

  constructor() {
    super()
  }

  /**
   * Создать задачу на регистрацию
   */
  async createTask(params: {
    platform: Platform
    phoneNumber?: string
    deviceId?: string
    emailProvider?: EmailProvider
    useTempEmail?: boolean
    username?: string
    password?: string
    firstName?: string
    lastName?: string
  }): Promise<string> {
    const taskId = crypto.randomUUID()

    const task: UnifiedRegistrationTask = {
      id: taskId,
      status: 'pending',
      platform: params.platform,
      emailProvider: params.emailProvider || 'yandex',
      useTempEmail: params.useTempEmail || false,
      phoneNumber: params.phoneNumber,
      deviceId: params.deviceId,
      username: params.username,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)

    this.emit('task:created', {
      taskId,
      platform: params.platform,
      timestamp: new Date()
    })

    return taskId
  }

  /**
   * Запустить обработку задач
   */
  async startProcessing(): Promise<void> {
    if (this.processing) return
    this.processing = true

    this.emit('processing:started', { timestamp: new Date() })

    // Обрабатываем задачи параллельно
    while (this.processing) {
      const pendingTasks = Array.from(this.tasks.values())
        .filter(t => t.status === 'pending')
        .slice(0, this.maxConcurrent)

      if (pendingTasks.length === 0) {
        await this.sleep(5000)
        continue
      }

      await Promise.all(pendingTasks.map(task => this.processTask(task.id)))
    }
  }

  /**
   * Остановить обработку
   */
  stopProcessing(): void {
    this.processing = false
    this.emit('processing:stopped', { timestamp: new Date() })
  }

  /**
   * Обработать одну задачу
   */
  async processTask(taskId: string): Promise<UnifiedRegistrationResult> {
    const task = this.tasks.get(taskId)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    try {
      // Шаг 1: Получить или создать email
      task.status = 'registering_email'
      task.startedAt = new Date()
      this.tasks.set(taskId, task)

      this.emit('task:progress', {
        taskId,
        stage: 'email_registration',
        message: 'Регистрация/получение email...',
        percent: 10
      })

      const emailResult = await this.getOrCreateEmail(task)
      
      if (!emailResult.success || !emailResult.email) {
        throw new Error(emailResult.error || 'Не удалось получить email')
      }

      task.email = emailResult.email
      task.emailPassword = emailResult.emailPassword
      task.emailAccountId = emailResult.emailAccountId
      task.status = 'email_ready'
      this.tasks.set(taskId, task)

      this.emit('task:progress', {
        taskId,
        stage: 'email_ready',
        message: `Email готов: ${emailResult.email}`,
        percent: 30
      })

      // Шаг 2: Зарегистрировать соцсеть
      task.status = 'registering_social'
      this.tasks.set(taskId, task)

      this.emit('task:progress', {
        taskId,
        stage: 'social_registration',
        message: `Регистрация ${task.platform}...`,
        percent: 40
      })

      const socialResult = await this.registerSocialAccount(task)

      if (!socialResult.success) {
        throw new Error(socialResult.error || 'Не удалось зарегистрировать аккаунт')
      }

      // Шаг 3: Сохранить результаты
      task.status = 'completed'
      task.socialAccountId = socialResult.socialAccountId
      task.socialUsername = socialResult.socialUsername
      task.completedAt = new Date()
      this.tasks.set(taskId, task)

      this.emit('task:completed', {
        taskId,
        platform: task.platform,
        email: task.email,
        username: task.socialUsername,
        accountId: task.socialAccountId,
        duration: task.completedAt.getTime() - task.createdAt.getTime()
      })

      return {
        success: true,
        email: task.email,
        emailPassword: task.emailPassword,
        socialUsername: task.socialUsername,
        socialAccountId: task.socialAccountId
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка'
      
      task.status = 'failed'
      task.error = errorMsg
      task.retryCount++
      this.tasks.set(taskId, task)

      this.emit('task:failed', {
        taskId,
        error: errorMsg,
        retryCount: task.retryCount
      })

      // Если есть попытки, вернуть в pending
      if (task.retryCount < task.maxRetries) {
        task.status = 'pending'
        this.tasks.set(taskId, task)
      }

      return {
        success: false,
        error: errorMsg
      }
    }
  }

  /**
   * Получить или создать email для регистрации
   */
  private async getOrCreateEmail(task: UnifiedRegistrationTask): Promise<{
    success: boolean
    email?: string
    emailPassword?: string
    emailAccountId?: string
    error?: string
  }> {
    try {
      // Если используем временный email
      if (task.useTempEmail) {
        const tempService = getTempEmailService()
        const email = await tempService.createEmail()
        return { success: true, email }
      }

      // Если указан провайдер - пытаемся получить существующий или создать новый
      const emailService = getEmailRegistrationService()
      
      // Сначала ищем свободный email
      const available = await emailService.getAvailableEmail(task.emailProvider)
      
      if (available) {
        return {
          success: true,
          email: available.email,
          emailPassword: available.password,
          emailAccountId: available.accountId
        }
      }

      // Если нет свободного - регистрируем новый
      const result = await emailService.registerEmail({
        provider: task.emailProvider || 'yandex',
        phoneNumber: task.phoneNumber,
        deviceId: task.deviceId,
        firstName: task.firstName,
        lastName: task.lastName
      })

      if (result.success) {
        return {
          success: true,
          email: result.email,
          emailPassword: result.password,
          emailAccountId: result.accountId
        }
      }

      return {
        success: false,
        error: result.error || 'Ошибка регистрации email'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка получения email'
      }
    }
  }

  /**
   * Зарегистрировать аккаунт в соцсети
   */
  private async registerSocialAccount(task: UnifiedRegistrationTask): Promise<{
    success: boolean
    socialAccountId?: string
    socialUsername?: string
    error?: string
  }> {
    try {
      // Генерируем данные если не указаны
      const username = task.username || this.generateUsername(task.platform)
      const password = task.password || this.generatePassword()
      const firstName = task.firstName || this.generateFirstName()
      const lastName = task.lastName || this.generateLastName()

      // Регистрируем через enhanced registration
      const result = await runEnhancedRegistration({
        platform: task.platform,
        phoneNumber: task.phoneNumber || '',
        deviceId: task.deviceId || '',
        jobId: task.id,
        profile: {
          username,
          password,
          email: task.email,
          firstName,
          lastName
        }
      })

      if (result.success) {
        // Сохраняем связь email с аккаунтом
        if (task.emailAccountId) {
          await this.linkEmailToAccount(task.emailAccountId, result.accountId || '')
        }

        return {
          success: true,
          socialAccountId: result.accountId,
          socialUsername: result.username
        }
      }

      return {
        success: false,
        error: result.error || 'Ошибка регистрации'
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка регистрации соцсети'
      }
    }
  }

  /**
   * Связать email с аккаунтом
   */
  private async linkEmailToAccount(emailAccountId: string, socialAccountId: string): Promise<void> {
    try {
      const emailAccount = await db.emailAccount.findUnique({
        where: { id: emailAccountId }
      })

      if (emailAccount) {
        const usedForAccounts = emailAccount.usedForAccounts 
          ? JSON.parse(emailAccount.usedForAccounts) 
          : []

        usedForAccounts.push(socialAccountId)

        await db.emailAccount.update({
          where: { id: emailAccountId },
          data: {
            usedForAccounts: JSON.stringify(usedForAccounts),
            usedCount: { increment: 1 }
          }
        })
      }
    } catch (error) {
      logger.error('[UnifiedRegistration] Failed to link email to account:', error as Error)
    }
  }

  /**
   * Массовая регистрация
   */
  async batchRegister(params: {
    platforms: Platform[]
    count: number
    phoneNumber?: string
    deviceId?: string
    emailProvider?: EmailProvider
    useTempEmail?: boolean
  }): Promise<string[]> {
    const taskIds: string[] = []

    for (const platform of params.platforms) {
      for (let i = 0; i < params.count; i++) {
        const taskId = await this.createTask({
          platform,
          phoneNumber: params.phoneNumber,
          deviceId: params.deviceId,
          emailProvider: params.emailProvider,
          useTempEmail: params.useTempEmail
        })
        taskIds.push(taskId)
      }
    }

    // Запускаем обработку
    this.startProcessing().catch(console.error)

    return taskIds
  }

  /**
   * Получить статус задачи
   */
  getTask(taskId: string): UnifiedRegistrationTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Получить все задачи
   */
  getAllTasks(): UnifiedRegistrationTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * Получить статистику
   */
  getStats(): {
    total: number
    pending: number
    inProgress: number
    completed: number
    failed: number
  } {
    const tasks = Array.from(this.tasks.values())
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => ['registering_email', 'email_ready', 'registering_social'].includes(t.status)).length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    }
  }

  /**
   * Генерация данных
   */
  private generateUsername(platform: string): string {
    const prefix = platform.substring(0, 3).toLowerCase()
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = prefix + '_'
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private generatePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
    let password = ''
    for (let i = 0; i < 14; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  private generateFirstName(): string {
    const names = ['Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Мария', 'Анна', 'Елена', 'Ольга', 'Наталья']
    return names[Math.floor(Math.random() * names.length)]
  }

  private generateLastName(): string {
    const surnames = ['Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петрова', 'Соколова', 'Михайлова']
    return surnames[Math.floor(Math.random() * surnames.length)]
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton
let unifiedManagerInstance: UnifiedRegistrationManager | null = null

export function getUnifiedRegistrationManager(): UnifiedRegistrationManager {
  if (!unifiedManagerInstance) {
    unifiedManagerInstance = new UnifiedRegistrationManager()
  }
  return unifiedManagerInstance
}

// Экспорт платформ для удобства
export const SUPPORTED_PLATFORMS = Object.keys(PLATFORM_CONFIGS) as Platform[]
