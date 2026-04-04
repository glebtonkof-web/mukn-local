/**
 * МУКН | Трафик - Сервис приглашений
 * Приглашения по username, по ID, через админов, через ботов
 */

export interface InvitationTask {
  id: string
  type: 'by_username' | 'by_id' | 'via_admin' | 'via_bot'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  targetGroupId: string
  totalTargets: number
  invitedCount: number
  failedCount: number
  progress: number
  targets: InvitationTarget[]
  results: InvitationResult[]
  settings: InvitationSettings
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
}

export interface InvitationTarget {
  id: string
  type: 'username' | 'user_id' | 'admin_id' | 'bot_id'
  value: string
  status: 'pending' | 'invited' | 'failed' | 'skipped'
  error?: string
  invitedAt?: Date
}

export interface InvitationResult {
  targetId: string
  success: boolean
  error?: string
  timestamp: Date
}

export interface InvitationSettings {
  delayBetweenInvites: number // секунды
  maxInvitesPerHour: number
  maxInvitesPerDay: number
  retryOnFail: boolean
  maxRetries: number
  skipIfAlreadyMember: boolean
  message?: string // Персональное сообщение с приглашением
  useProxy: boolean
  proxyRotation: boolean
}

export interface InvitationTemplate {
  id: string
  name: string
  message: string
  variables: string[] // {name}, {group_name}, etc.
}

class InvitationService {
  private tasks: Map<string, InvitationTask> = new Map()
  private hourlyLimits: Map<string, number> = new Map()
  private dailyLimits: Map<string, number> = new Map()

  /**
   * Создать задачу приглашения по username
   */
  async inviteByUsernames(
    groupId: string,
    usernames: string[],
    settings: Partial<InvitationSettings> = {}
  ): Promise<InvitationTask> {
    const taskId = `invite_username_${Date.now()}`
    
    const task: InvitationTask = {
      id: taskId,
      type: 'by_username',
      status: 'pending',
      targetGroupId: groupId,
      totalTargets: usernames.length,
      invitedCount: 0,
      failedCount: 0,
      progress: 0,
      targets: usernames.map(u => ({
        id: `target_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'username',
        value: u,
        status: 'pending'
      })),
      results: [],
      settings: {
        delayBetweenInvites: settings.delayBetweenInvites || 60,
        maxInvitesPerHour: settings.maxInvitesPerHour || 20,
        maxInvitesPerDay: settings.maxInvitesPerDay || 100,
        retryOnFail: settings.retryOnFail ?? true,
        maxRetries: settings.maxRetries || 3,
        skipIfAlreadyMember: settings.skipIfAlreadyMember ?? true,
        useProxy: settings.useProxy ?? true,
        proxyRotation: settings.proxyRotation ?? true
      },
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)
    this.executeInvitation(taskId).catch(console.error)

    return task
  }

  /**
   * Создать задачу приглашения по ID
   */
  async inviteByIds(
    groupId: string,
    userIds: string[],
    settings: Partial<InvitationSettings> = {}
  ): Promise<InvitationTask> {
    const taskId = `invite_id_${Date.now()}`
    
    const task: InvitationTask = {
      id: taskId,
      type: 'by_id',
      status: 'pending',
      targetGroupId: groupId,
      totalTargets: userIds.length,
      invitedCount: 0,
      failedCount: 0,
      progress: 0,
      targets: userIds.map(id => ({
        id: `target_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'user_id',
        value: id,
        status: 'pending'
      })),
      results: [],
      settings: {
        delayBetweenInvites: settings.delayBetweenInvites || 30,
        maxInvitesPerHour: settings.maxInvitesPerHour || 30,
        maxInvitesPerDay: settings.maxInvitesPerDay || 150,
        retryOnFail: settings.retryOnFail ?? true,
        maxRetries: settings.maxRetries || 3,
        skipIfAlreadyMember: settings.skipIfAlreadyMember ?? true,
        useProxy: settings.useProxy ?? true,
        proxyRotation: settings.proxyRotation ?? true
      },
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)
    this.executeInvitation(taskId).catch(console.error)

    return task
  }

  /**
   * Приглашение через админов (просим админов добавить)
   */
  async inviteViaAdmins(
    groupId: string,
    adminIds: string[],
    message: string,
    settings: Partial<InvitationSettings> = {}
  ): Promise<InvitationTask> {
    const taskId = `invite_admin_${Date.now()}`
    
    const task: InvitationTask = {
      id: taskId,
      type: 'via_admin',
      status: 'pending',
      targetGroupId: groupId,
      totalTargets: adminIds.length,
      invitedCount: 0,
      failedCount: 0,
      progress: 0,
      targets: adminIds.map(id => ({
        id: `target_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'admin_id',
        value: id,
        status: 'pending'
      })),
      results: [],
      settings: {
        delayBetweenInvites: settings.delayBetweenInvites || 300, // 5 минут между запросами к админам
        maxInvitesPerHour: settings.maxInvitesPerHour || 10,
        maxInvitesPerDay: settings.maxInvitesPerDay || 50,
        retryOnFail: settings.retryOnFail ?? true,
        maxRetries: settings.maxRetries || 2,
        skipIfAlreadyMember: settings.skipIfAlreadyMember ?? true,
        useProxy: settings.useProxy ?? true,
        proxyRotation: settings.proxyRotation ?? false,
        message
      },
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)
    this.executeInvitation(taskId).catch(console.error)

    return task
  }

  /**
   * Приглашение через ботов (если бот в группе)
   */
  async inviteViaBot(
    groupId: string,
    botIds: string[],
    targetUsers: string[],
    settings: Partial<InvitationSettings> = {}
  ): Promise<InvitationTask> {
    const taskId = `invite_bot_${Date.now()}`
    
    const task: InvitationTask = {
      id: taskId,
      type: 'via_bot',
      status: 'pending',
      targetGroupId: groupId,
      totalTargets: targetUsers.length,
      invitedCount: 0,
      failedCount: 0,
      progress: 0,
      targets: targetUsers.map(u => ({
        id: `target_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: 'username',
        value: u,
        status: 'pending'
      })),
      results: [],
      settings: {
        delayBetweenInvites: settings.delayBetweenInvites || 5,
        maxInvitesPerHour: settings.maxInvitesPerHour || 100,
        maxInvitesPerDay: settings.maxInvitesPerDay || 500,
        retryOnFail: settings.retryOnFail ?? true,
        maxRetries: settings.maxRetries || 3,
        skipIfAlreadyMember: settings.skipIfAlreadyMember ?? true,
        useProxy: settings.useProxy ?? false,
        proxyRotation: settings.proxyRotation ?? false
      },
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)
    this.executeInvitation(taskId).catch(console.error)

    return task
  }

  /**
   * Выполнение приглашений
   */
  private async executeInvitation(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      task.status = 'running'
      task.startedAt = new Date()

      const { settings } = task
      let hourlyCount = 0
      let dailyCount = 0

      for (const target of task.targets) {
        // Проверка лимитов
        if (hourlyCount >= settings.maxInvitesPerHour) {
          await this.delay(60 * 60 * 1000) // Ждём час
          hourlyCount = 0
        }

        if (dailyCount >= settings.maxInvitesPerDay) {
          task.status = 'paused'
          // Ждём до следующего дня
          await this.delay(24 * 60 * 60 * 1000)
          task.status = 'running'
          dailyCount = 0
        }

        // Задержка между приглашениями
        await this.delay(settings.delayBetweenInvites * 1000)

        // Попытка приглашения
        let retries = 0
        let success = false

        while (!success && retries < settings.maxRetries) {
          try {
            // Имитация API вызова
            const result = await this.sendInvitation(task, target)
            
            if (result.success) {
              target.status = 'invited'
              target.invitedAt = new Date()
              task.invitedCount++
              success = true
            } else {
              throw new Error(result.error || 'Unknown error')
            }
          } catch (error: any) {
            target.error = error.message
            
            if (settings.retryOnFail && retries < settings.maxRetries - 1) {
              retries++
              await this.delay(settings.delayBetweenInvites * 1000 * (retries + 1))
            } else {
              target.status = 'failed'
              task.failedCount++
            }
          }
        }

        task.results.push({
          targetId: target.id,
          success: target.status === 'invited',
          error: target.error,
          timestamp: new Date()
        })

        hourlyCount++
        dailyCount++
        task.progress = Math.round(((task.invitedCount + task.failedCount) / task.totalTargets) * 100)
      }

      task.status = 'completed'
      task.completedAt = new Date()

    } catch (error: any) {
      task.status = 'failed'
      console.error('Invitation task failed:', error)
    }
  }

  /**
   * Отправка приглашения (интеграция с Telegram API)
   */
  private async sendInvitation(
    task: InvitationTask,
    target: InvitationTarget
  ): Promise<{ success: boolean; error?: string }> {
    // В реальной реализации - вызов Telegram API
    // Здесь симуляция с 85% успешностью
    
    await this.delay(500 + Math.random() * 500)

    const random = Math.random()
    
    if (random < 0.85) {
      return { success: true }
    } else if (random < 0.90) {
      return { success: false, error: 'USER_PRIVACY_RESTRICTED' }
    } else if (random < 0.95) {
      return { success: false, error: 'USER_NOT_MUTUAL_CONTACT' }
    } else {
      return { success: false, error: 'PEER_FLOOD' }
    }
  }

  /**
   * Получить статус задачи
   */
  getTaskStatus(taskId: string): InvitationTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Получить все задачи
   */
  getAllTasks(): InvitationTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * Пауза задачи
   */
  pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (task && task.status === 'running') {
      task.status = 'paused'
      return true
    }
    return false
  }

  /**
   * Возобновление задачи
   */
  resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (task && task.status === 'paused') {
      task.status = 'running'
      this.executeInvitation(taskId).catch(console.error)
      return true
    }
    return false
  }

  /**
   * Отмена задачи
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (task && (task.status === 'running' || task.status === 'paused')) {
      task.status = 'failed'
      return true
    }
    return false
  }

  /**
   * Шаблоны приглашений
   */
  getTemplates(): InvitationTemplate[] {
    return [
      {
        id: 'template_1',
        name: 'Дружелюбное приглашение',
        message: 'Привет, {name}! 👋 Приглашаю тебя в нашу группу {group_name}. Там много интересного по теме {topic}!',
        variables: ['name', 'group_name', 'topic']
      },
      {
        id: 'template_2',
        name: 'Деловое приглашение',
        message: 'Здравствуйте, {name}! Хочу пригласить вас в профессиональное сообщество {group_name}. Буду рад видеть вас среди участников.',
        variables: ['name', 'group_name']
      },
      {
        id: 'template_3',
        name: 'Минималистичное',
        message: '{name}, добро пожаловать в {group_name}! 🎉',
        variables: ['name', 'group_name']
      }
    ]
  }

  /**
   * Валидация списка username
   */
  validateUsernames(usernames: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = []
    const invalid: string[] = []
    
    const usernameRegex = /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/
    
    for (const username of usernames) {
      const normalized = username.startsWith('@') ? username : `@${username}`
      if (usernameRegex.test(normalized.slice(1))) {
        valid.push(normalized)
      } else {
        invalid.push(username)
      }
    }
    
    return { valid, invalid }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const invitationService = new InvitationService()
export default invitationService
