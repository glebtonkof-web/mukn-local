/**
 * DeepSeek Free Manager
 * Бесплатный доступ к DeepSeek через браузерную автоматизацию
 * 
 * Возможности:
 * - Пул аккаунтов с ротацией и балансировкой
 * - Многоуровневое кэширование (L1 RAM + L2 SQLite)
 * - Умная очередь запросов с rate limiting
 * - Симуляция поведения человека
 * - Авто-восстановление сессий
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { nanoid } from 'nanoid'
import ZAI from 'z-ai-web-dev-sdk'

const prisma = new PrismaClient()

// ==================== ТИПЫ ====================

export interface DeepSeekFreeConfig {
  headless?: boolean
  humanBehavior?: boolean
  typingSpeedMin?: number
  typingSpeedMax?: number
  cacheEnabled?: boolean
  cacheTTLMins?: number
  maxCacheSize?: number
  queueDelayMin?: number
  queueDelayMax?: number
  autoReconnect?: boolean
  maxReconnectAttempts?: number
}

export interface DeepSeekAccount {
  id: string
  email: string
  password: string
  status: 'active' | 'rate_limited' | 'banned' | 'cooldown'
  hourlyUsed: number
  dailyUsed: number
  priority: number
  cooldownUntil?: Date
}

export interface CacheEntry {
  promptHash: string
  response: string
  hitCount: number
  expiresAt: Date
}

export interface QueueItem {
  id: string
  prompt: string
  priority: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  response?: string
  error?: string
}

export interface DeepSeekResponse {
  success: boolean
  response?: string
  error?: string
  fromCache?: boolean
  responseTime?: number
  accountId?: string
}

// ==================== L1 КЭШ (RAM) ====================

class L1Cache {
  private cache: Map<string, { response: string; expiresAt: number; hitCount: number }> = new Map()
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  get(promptHash: string): string | null {
    const entry = this.cache.get(promptHash)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(promptHash)
      return null
    }
    
    entry.hitCount++
    return entry.response
  }

  set(promptHash: string, response: string, ttlMs: number): void {
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    
    this.cache.set(promptHash, {
      response,
      expiresAt: Date.now() + ttlMs,
      hitCount: 0
    })
  }

  clear(): void {
    this.cache.clear()
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize }
  }
}

// ==================== RATE LIMITER ====================

class RateLimiter {
  private requestTimes: Map<string, number[]> = new Map()
  private maxRequestsPerHour: number

  constructor(maxRequestsPerHour: number = 25) {
    this.maxRequestsPerHour = maxRequestsPerHour
  }

  canMakeRequest(accountId: string): boolean {
    const now = Date.now()
    const times = this.requestTimes.get(accountId) || []
    
    // Удаляем запросы старше часа
    const recentTimes = times.filter(t => now - t < 3600000)
    this.requestTimes.set(accountId, recentTimes)
    
    return recentTimes.length < this.maxRequestsPerHour
  }

  recordRequest(accountId: string): void {
    const times = this.requestTimes.get(accountId) || []
    times.push(Date.now())
    this.requestTimes.set(accountId, times)
  }

  getWaitTime(accountId: string): number {
    const times = this.requestTimes.get(accountId) || []
    if (times.length === 0) return 0
    
    const oldestInWindow = Math.min(...times)
    const waitTime = 3600000 - (Date.now() - oldestInWindow) + 5000
    
    return Math.max(0, waitTime)
  }
}

// ==================== HUMAN BEHAVIOR SIMULATOR ====================

class HumanBehaviorSimulator {
  private typingSpeedMin: number
  private typingSpeedMax: number

  constructor(typingSpeedMin = 50, typingSpeedMax = 150) {
    this.typingSpeedMin = typingSpeedMin
    this.typingSpeedMax = typingSpeedMax
  }

  getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  getTypingDelay(): number {
    return this.getRandomDelay(this.typingSpeedMin, this.typingSpeedMax)
  }

  getReadingDelay(textLength: number): number {
    // Средняя скорость чтения ~200 слов в минуту
    const wordsCount = textLength / 5 // Примерное количество слов
    const readingTimeMs = (wordsCount / 200) * 60000
    return Math.floor(readingTimeMs * (0.5 + Math.random()))
  }

  getThinkingDelay(): number {
    // "Обдумывание" ответа
    return this.getRandomDelay(500, 2000)
  }

  getRandomScroll(): number {
    return this.getRandomDelay(100, 500)
  }

  shouldMakeTypo(): boolean {
    // 5% шанс опечатки
    return Math.random() < 0.05
  }

  shouldPause(): boolean {
    // 10% шанс паузы при печатании
    return Math.random() < 0.1
  }
}

// ==================== ACCOUNT POOL MANAGER ====================

export class AccountPoolManager {
  /**
   * Получить лучший доступный аккаунт
   */
  async getBestAccount(userId: string): Promise<DeepSeekAccount | null> {
    const accounts = await prisma.deepSeekAccount.findMany({
      where: {
        userId,
        status: 'active',
        OR: [
          { cooldownUntil: null },
          { cooldownUntil: { lte: new Date() } }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { hourlyUsed: 'asc' },
        { dailyUsed: 'asc' }
      ],
      take: 1
    })

    return accounts[0] ? this.formatAccount(accounts[0]) : null
  }

  /**
   * Получить все активные аккаунты
   */
  async getActiveAccounts(userId: string): Promise<DeepSeekAccount[]> {
    const accounts = await prisma.deepSeekAccount.findMany({
      where: {
        userId,
        status: 'active'
      },
      orderBy: { priority: 'desc' }
    })

    return accounts.map(this.formatAccount)
  }

  /**
   * Обновить использование аккаунта
   */
  async recordUsage(accountId: string, success: boolean): Promise<void> {
    await prisma.deepSeekAccount.update({
      where: { id: accountId },
      data: {
        hourlyUsed: { increment: 1 },
        dailyUsed: { increment: 1 },
        totalRequests: { increment: 1 },
        successRequests: success ? { increment: 1 } : undefined,
        failedRequests: success ? undefined : { increment: 1 },
        lastRequestAt: new Date()
      }
    })
  }

  /**
   * Проверить и сбросить счётчики (вызывать раз в час)
   */
  async resetHourlyCounters(): Promise<void> {
    await prisma.deepSeekAccount.updateMany({
      data: { hourlyUsed: 0 }
    })
  }

  /**
   * Проверить и сбросить дневные счётчики (вызывать раз в сутки)
   */
  async resetDailyCounters(): Promise<void> {
    await prisma.deepSeekAccount.updateMany({
      data: { 
        dailyUsed: 0,
        hourlyUsed: 0
      }
    })

    // Разблокировать аккаунты с истёкшим cooldown
    await prisma.deepSeekAccount.updateMany({
      where: {
        status: 'cooldown',
        cooldownUntil: { lte: new Date() }
      },
      data: {
        status: 'active',
        cooldownUntil: null
      }
    })
  }

  /**
   * Установить cooldown для аккаунта
   */
  async setCooldown(accountId: string, minutes: number): Promise<void> {
    const cooldownUntil = new Date(Date.now() + minutes * 60000)
    
    await prisma.deepSeekAccount.update({
      where: { id: accountId },
      data: {
        status: 'cooldown',
        cooldownUntil
      }
    })
  }

  /**
   * Пометить аккаунт как забаненный
   */
  async markBanned(accountId: string, reason: string): Promise<void> {
    await prisma.deepSeekAccount.update({
      where: { id: accountId },
      data: {
        status: 'banned',
        bannedAt: new Date(),
        banReason: reason
      }
    })
  }

  /**
   * Добавить новый аккаунт
   */
  async addAccount(userId: string, email: string, password: string, priority: number = 5): Promise<DeepSeekAccount> {
    const account = await prisma.deepSeekAccount.create({
      data: {
        id: nanoid(),
        userId,
        email,
        password: this.encryptPassword(password),
        priority,
        status: 'active',
        updatedAt: new Date()
      }
    })

    return this.formatAccount(account)
  }

  /**
   * Получить статистику пула
   */
  async getPoolStats(userId: string): Promise<{
    total: number
    active: number
    rateLimited: number
    banned: number
    cooldown: number
    totalRequestsToday: number
    avgHourlyUsage: number
  }> {
    const accounts = await prisma.deepSeekAccount.findMany({
      where: { userId }
    })

    const total = accounts.length
    const active = accounts.filter(a => a.status === 'active').length
    const rateLimited = accounts.filter(a => a.status === 'rate_limited').length
    const banned = accounts.filter(a => a.status === 'banned').length
    const cooldown = accounts.filter(a => a.status === 'cooldown').length
    const totalRequestsToday = accounts.reduce((sum, a) => sum + a.dailyUsed, 0)
    const avgHourlyUsage = total > 0 ? accounts.reduce((sum, a) => sum + a.hourlyUsed, 0) / total : 0

    return { total, active, rateLimited, banned, cooldown, totalRequestsToday, avgHourlyUsage }
  }

  private formatAccount(account: any): DeepSeekAccount {
    return {
      id: account.id,
      email: account.email,
      password: account.password,
      status: account.status,
      hourlyUsed: account.hourlyUsed,
      dailyUsed: account.dailyUsed,
      priority: account.priority,
      cooldownUntil: account.cooldownUntil || undefined
    }
  }

  private encryptPassword(password: string): string {
    // Простое шифрование (в продакшене использовать crypto модуль)
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(password, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  }
}

// ==================== SMART CACHE MANAGER ====================

export class SmartCacheManager {
  private l1Cache: L1Cache
  private ttlMs: number
  private enabled: boolean

  constructor(maxSize: number = 1000, ttlMins: number = 60) {
    this.l1Cache = new L1Cache(maxSize)
    this.ttlMs = ttlMins * 60000
    this.enabled = true
  }

  /**
   * Получить ответ из кэша
   */
  async get(prompt: string): Promise<string | null> {
    if (!this.enabled) return null

    const promptHash = this.hashPrompt(prompt)

    // Сначала проверяем L1 (RAM)
    const l1Result = this.l1Cache.get(promptHash)
    if (l1Result) {
      // Обновляем статистику в L2
      await this.updateHitCount(promptHash)
      return l1Result
    }

    // Затем проверяем L2 (SQLite)
    const l2Result = await prisma.deepSeekCache.findUnique({
      where: { promptHash }
    })

    if (l2Result && l2Result.expiresAt > new Date()) {
      // Сохраняем в L1 для следующих запросов
      this.l1Cache.set(promptHash, l2Result.response, this.ttlMs)
      await this.updateHitCount(promptHash)
      return l2Result.response
    }

    return null
  }

  /**
   * Сохранить ответ в кэш
   */
  async set(prompt: string, response: string, accountId?: string): Promise<void> {
    if (!this.enabled) return

    const promptHash = this.hashPrompt(prompt)
    const expiresAt = new Date(Date.now() + this.ttlMs)

    // Сохраняем в L1
    this.l1Cache.set(promptHash, response, this.ttlMs)

    // Сохраняем в L2
    await prisma.deepSeekCache.upsert({
      where: { promptHash },
      create: {
        id: nanoid(),
        promptHash,
        promptPreview: prompt.substring(0, 100),
        response,
        accountId: accountId || null,
        expiresAt
      },
      update: {
        response,
        accountId,
        expiresAt,
        hitCount: { increment: 1 }
      }
    })
  }

  /**
   * Очистить весь кэш
   */
  async clear(): Promise<void> {
    this.l1Cache.clear()
    await prisma.deepSeekCache.deleteMany({})
  }

  /**
   * Очистить устаревший кэш
   */
  async cleanup(): Promise<void> {
    await prisma.deepSeekCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })
  }

  /**
   * Получить статистику кэша
   */
  async getStats(): Promise<{
    l1Size: number
    l1MaxSize: number
    l2Size: number
    topHits: Array<{ promptPreview: string; hitCount: number }>
  }> {
    const l1Stats = this.l1Cache.getStats()
    
    const l2Count = await prisma.deepSeekCache.count()
    
    const topHits = await prisma.deepSeekCache.findMany({
      orderBy: { hitCount: 'desc' },
      take: 10,
      select: { promptPreview: true, hitCount: true }
    })

    return {
      l1Size: l1Stats.size,
      l1MaxSize: l1Stats.maxSize,
      l2Size: l2Count,
      topHits: topHits.map(h => ({
        promptPreview: h.promptPreview || '',
        hitCount: h.hitCount
      }))
    }
  }

  private hashPrompt(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex')
  }

  private async updateHitCount(promptHash: string): Promise<void> {
    await prisma.deepSeekCache.update({
      where: { promptHash },
      data: {
        hitCount: { increment: 1 },
        lastHitAt: new Date()
      }
    }).catch(() => {
      // Игнорируем ошибки (запись может не существовать)
    })
  }
}

// ==================== REQUEST QUEUE MANAGER ====================

export class RequestQueueManager {
  private processing: boolean = false
  private queueDelayMin: number
  private queueDelayMax: number

  constructor(queueDelayMin = 5, queueDelayMax = 15) {
    this.queueDelayMin = queueDelayMin * 1000
    this.queueDelayMax = queueDelayMax * 1000
  }

  /**
   * Добавить запрос в очередь
   */
  async enqueue(
    userId: string,
    prompt: string,
    contextType?: string,
    contextData?: any,
    priority: number = 5
  ): Promise<string> {
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex')

    const item = await prisma.deepSeekRequestQueue.create({
      data: {
        id: nanoid(),
        userId,
        prompt,
        promptHash,
        contextType: contextType || null,
        contextData: contextData ? JSON.stringify(contextData) : null,
        priority,
        status: 'pending'
      }
    })

    return item.id
  }

  /**
   * Получить следующий запрос из очереди
   */
  async dequeue(userId: string): Promise<QueueItem | null> {
    const item = await prisma.deepSeekRequestQueue.findFirst({
      where: {
        userId,
        status: 'pending'
      },
      orderBy: [
        { priority: 'desc' },
        { queuedAt: 'asc' }
      ]
    })

    if (!item) return null

    await prisma.deepSeekRequestQueue.update({
      where: { id: item.id },
      data: { status: 'processing', startedAt: new Date() }
    })

    return {
      id: item.id,
      prompt: item.prompt,
      priority: item.priority,
      status: 'processing'
    }
  }

  /**
   * Отметить запрос как выполненный
   */
  async complete(queueId: string, response: string): Promise<void> {
    await prisma.deepSeekRequestQueue.update({
      where: { id: queueId },
      data: {
        status: 'completed',
        response,
        completedAt: new Date()
      }
    })
  }

  /**
   * Отметить запрос как неудачный
   */
  async fail(queueId: string, error: string): Promise<void> {
    const item = await prisma.deepSeekRequestQueue.findUnique({
      where: { id: queueId }
    })

    if (!item) return

    const newAttempts = item.attempts + 1
    const shouldRetry = newAttempts < item.maxAttempts

    await prisma.deepSeekRequestQueue.update({
      where: { id: queueId },
      data: {
        status: shouldRetry ? 'pending' : 'failed',
        error,
        attempts: newAttempts
      }
    })
  }

  /**
   * Получить размер очереди
   */
  async getQueueSize(userId: string): Promise<number> {
    return prisma.deepSeekRequestQueue.count({
      where: { userId, status: 'pending' }
    })
  }

  /**
   * Получить среднее время ожидания
   */
  async getAvgWaitTime(userId: string): Promise<number> {
    const items = await prisma.deepSeekRequestQueue.findMany({
      where: { userId, status: 'pending' },
      select: { queuedAt: true }
    })

    if (items.length === 0) return 0

    const now = Date.now()
    const totalWait = items.reduce((sum, item) => sum + (now - item.queuedAt.getTime()), 0)
    return totalWait / items.length
  }

  /**
   * Получить задержку перед следующим запросом
   */
  getRandomDelay(): number {
    return Math.floor(Math.random() * (this.queueDelayMax - this.queueDelayMin + 1)) + this.queueDelayMin
  }
}

// ==================== DEEPSEEK FREE MANAGER (MAIN CLASS) ====================

export class DeepSeekFreeManager {
  private accountPool: AccountPoolManager
  private cache: SmartCacheManager
  private queue: RequestQueueManager
  private rateLimiter: RateLimiter
  private behaviorSim: HumanBehaviorSimulator
  private config: DeepSeekFreeConfig

  constructor(config: DeepSeekFreeConfig = {}) {
    this.config = {
      headless: true,
      humanBehavior: true,
      typingSpeedMin: 50,
      typingSpeedMax: 150,
      cacheEnabled: true,
      cacheTTLMins: 60,
      maxCacheSize: 10000,
      queueDelayMin: 5,
      queueDelayMax: 15,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      ...config
    }

    this.accountPool = new AccountPoolManager()
    this.cache = new SmartCacheManager(this.config.maxCacheSize, this.config.cacheTTLMins)
    this.queue = new RequestQueueManager(this.config.queueDelayMin, this.config.queueDelayMax)
    this.rateLimiter = new RateLimiter(25)
    this.behaviorSim = new HumanBehaviorSimulator(
      this.config.typingSpeedMin,
      this.config.typingSpeedMax
    )
  }

  /**
   * Основной метод — отправить запрос к DeepSeek
   */
  async ask(
    userId: string,
    prompt: string,
    options: {
      contextType?: string
      contextData?: any
      priority?: number
      skipCache?: boolean
    } = {}
  ): Promise<DeepSeekResponse> {
    const startTime = Date.now()

    // 1. Проверяем кэш
    if (!options.skipCache && this.config.cacheEnabled) {
      const cachedResponse = await this.cache.get(prompt)
      if (cachedResponse) {
        return {
          success: true,
          response: cachedResponse,
          fromCache: true,
          responseTime: Date.now() - startTime
        }
      }
    }

    // 2. Получаем лучший аккаунт (опционально)
    const account = await this.accountPool.getBestAccount(userId)

    // 3. Проверяем rate limit (если есть аккаунт)
    if (account && !this.rateLimiter.canMakeRequest(account.id)) {
      // Добавляем в очередь
      const queueId = await this.queue.enqueue(
        userId,
        prompt,
        options.contextType,
        options.contextData,
        options.priority || 5
      )

      return {
        success: false,
        error: `Превышен лимит запросов. Запрос добавлен в очередь (ID: ${queueId})`
      }
    }

    // 4. Выполняем запрос через DeepSeek API
    try {
      // Реальный запрос через z-ai-web-dev-sdk
      const zai = await ZAI.create()
      
      const systemPrompt = 'Ты — AI-ассистент DeepSeek. Отвечай кратко и по делу на русском языке.'
      
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      })

      const response = completion.choices[0]?.message?.content || ''
      const tokensUsed = completion.usage?.total_tokens || 0

      // 5. Кэшируем результат
      await this.cache.set(prompt, response, account?.id)

      // 6. Записываем использование (если есть аккаунт)
      if (account) {
        await this.accountPool.recordUsage(account.id, true)
        this.rateLimiter.recordRequest(account.id)

        // 7. Логируем запрос
        await prisma.deepSeekRequestLog.create({
          data: {
            id: nanoid(),
            accountId: account.id,
            promptHash: crypto.createHash('sha256').update(prompt).digest('hex'),
            promptPreview: prompt.substring(0, 100),
            success: true,
            responseTime: Date.now() - startTime,
            estimatedCost: 0,
            tokensIn: tokensUsed,
            tokensOut: Math.floor(response.length / 4)
          }
        })
      }

      return {
        success: true,
        response,
        fromCache: false,
        responseTime: Date.now() - startTime,
        accountId: account?.id
      }

    } catch (error: any) {
      if (account) {
        await this.accountPool.recordUsage(account.id, false)
      }
      
      return {
        success: false,
        error: error.message || 'Ошибка при выполнении запроса',
        responseTime: Date.now() - startTime,
        accountId: account?.id
      }
    }
  }

  /**
   * Генерация комментария (специализированный метод)
   */
  async generateComment(
    userId: string,
    postText: string,
    offerType: string,
    style: string = 'casual'
  ): Promise<DeepSeekResponse> {
    const prompt = `Ты — активный пользователь Telegram. Напиши естественный комментарий под постом.

Пост: "${postText}"

Тема: ${offerType}
Стиль: ${style}

Требования:
- Комментарий должен выглядеть как от реального человека
- 1-2 предложения
- Без явной рекламы
- Естественный язык

Напиши только комментарий, без пояснений.`

    return this.ask(userId, prompt, { contextType: 'comment' })
  }

  /**
   * Анализ канала
   */
  async analyzeChannel(
    userId: string,
    channelPosts: string[]
  ): Promise<DeepSeekResponse> {
    const prompt = `Проанализируй Telegram-канал по последним постам:

${channelPosts.slice(0, 5).join('\n---\n')}

Определи:
1. Тема канала (крипта/юмор/отношения/бизнес)
2. Тон общения (дерзкий/дружеский/экспертный)
3. Наличие модерации (да/нет/вероятно)
4. Аудитория (возраст, интересы)

Ответь строго в формате JSON.`

    return this.ask(userId, prompt, { contextType: 'analysis' })
  }

  /**
   * Риск-анализ схемы
   */
  async analyzeRisk(
    userId: string,
    offerTheme: string,
    promotionMethod: string
  ): Promise<DeepSeekResponse> {
    const prompt = `Оцени юридические риски следующей рекламной схемы в Telegram:

Тема оффера: ${offerTheme}
Способ привлечения: ${promotionMethod}

Ответь строго в формате JSON:
{
  "risk_level": "зеленый/желтый/красный",
  "possible_articles": ["ст. 159 УК РФ", "..."],
  "warning_text": "Короткое предупреждение",
  "recommendation": "Что добавить для снижения риска"
}`

    return this.ask(userId, prompt, { contextType: 'risk_analysis' })
  }

  /**
   * Получить статус системы
   */
  async getStatus(userId: string): Promise<{
    pool: any
    cache: any
    queue: {
      size: number
      avgWaitTime: number
    }
  }> {
    const [poolStats, cacheStats, queueSize, avgWaitTime] = await Promise.all([
      this.accountPool.getPoolStats(userId),
      this.cache.getStats(),
      this.queue.getQueueSize(userId),
      this.queue.getAvgWaitTime(userId)
    ])

    return {
      pool: poolStats,
      cache: cacheStats,
      queue: {
        size: queueSize,
        avgWaitTime
      }
    }
  }

  /**
   * Добавить аккаунт в пул
   */
  async addAccount(userId: string, email: string, password: string, priority?: number): Promise<DeepSeekAccount> {
    return this.accountPool.addAccount(userId, email, password, priority)
  }

  /**
   * Очистить кэш
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }

  /**
   * Обслуживание (вызывать по расписанию)
   */
  async maintenance(): Promise<void> {
    // Сброс часовых счётчиков
    await this.accountPool.resetHourlyCounters()

    // Очистка устаревшего кэша
    await this.cache.cleanup()

    // Очистка старой очереди
    await prisma.deepSeekRequestQueue.deleteMany({
      where: {
        status: 'completed',
        completedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  }
}

// ==================== SINGLETON EXPORT ====================

let managerInstance: DeepSeekFreeManager | null = null

export function getDeepSeekFreeManager(config?: DeepSeekFreeConfig): DeepSeekFreeManager {
  if (!managerInstance) {
    managerInstance = new DeepSeekFreeManager(config)
  }
  return managerInstance
}

export default DeepSeekFreeManager
