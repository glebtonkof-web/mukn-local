/**
 * МУКН | Трафик - Сервис триггеров по ключевым словам
 * Автоматические реакции на ключевые слова в сообщениях
 */

export interface KeywordTrigger {
  id: string
  name: string
  description?: string
  
  // Условия
  keywords: string[]
  matchType: 'exact' | 'contains' | 'regex' | 'fuzzy'
  caseSensitive: boolean
  wholeWord: boolean
  
  // Контекст
  platforms: ('telegram' | 'instagram' | 'tiktok' | 'youtube')[]
  chatTypes: ('private' | 'group' | 'channel')[]
  
  // Условия срабатывания
  conditions: TriggerCondition[]
  
  // Действия
  actions: TriggerAction[]
  
  // Настройки
  priority: number // Приоритет при нескольких триггерах
  cooldown: number // Секунды между срабатываниями
  maxTriggers: number // Максимум срабатываний (0 = без лимита)
  
  // Статус
  isActive: boolean
  triggersCount: number
  lastTriggeredAt?: Date
  
  // Временные метки
  createdAt: Date
  updatedAt: Date
}

export interface TriggerCondition {
  type: 'time' | 'user' | 'chat' | 'message' | 'random'
  field: string
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'regex'
  value: any
}

export interface TriggerAction {
  type: 'reply' | 'dm' | 'react' | 'forward' | 'save' | 'webhook' | 'ai_response' | 'escalate' | 'ban' | 'mute'
  config: Record<string, any>
  delay?: number // Секунды задержки
  order: number
}

export interface TriggerEvent {
  id: string
  triggerId: string
  platform: string
  chatId: string
  messageId: string
  userId: string
  matchedKeyword: string
  matchedContent: string
  actionsExecuted: string[]
  timestamp: Date
}

export interface TriggerStats {
  triggerId: string
  totalTriggers: number
  uniqueUsers: number
  uniqueChats: number
  topKeywords: Array<{ keyword: string; count: number }>
  actionsBreakdown: Record<string, number>
  hourlyDistribution: number[]
}

class KeywordTriggersService {
  private triggers: Map<string, KeywordTrigger> = new Map()
  private events: TriggerEvent[] = []
  private cooldowns: Map<string, Date> = new Map()
  private triggerCounts: Map<string, number> = new Map()

  constructor() {
    this.initializeDefaultTriggers()
  }

  /**
   * Создать триггер
   */
  createTrigger(data: Partial<KeywordTrigger>): KeywordTrigger {
    const trigger: KeywordTrigger = {
      id: `trigger_${Date.now()}`,
      name: data.name || 'Новый триггер',
      description: data.description,
      keywords: data.keywords || [],
      matchType: data.matchType || 'contains',
      caseSensitive: data.caseSensitive ?? false,
      wholeWord: data.wholeWord ?? false,
      platforms: data.platforms || ['telegram'],
      chatTypes: data.chatTypes || ['private', 'group'],
      conditions: data.conditions || [],
      actions: data.actions || [],
      priority: data.priority || 5,
      cooldown: data.cooldown || 0,
      maxTriggers: data.maxTriggers || 0,
      isActive: data.isActive ?? true,
      triggersCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.triggers.set(trigger.id, trigger)
    return trigger
  }

  /**
   * Обновить триггер
   */
  updateTrigger(triggerId: string, data: Partial<KeywordTrigger>): KeywordTrigger | null {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) return null

    Object.assign(trigger, data, { updatedAt: new Date() })
    return trigger
  }

  /**
   * Удалить триггер
   */
  deleteTrigger(triggerId: string): boolean {
    return this.triggers.delete(triggerId)
  }

  /**
   * Проверить сообщение на триггеры
   */
  processMessage(
    message: {
      content: string
      platform: string
      chatId: string
      chatType: string
      userId: string
      messageId: string
    }
  ): { triggered: boolean; events: TriggerEvent[]; actions: TriggerAction[] } {
    const events: TriggerEvent[] = []
    const actions: TriggerAction[] = []

    // Сортируем триггеры по приоритету
    const sortedTriggers = Array.from(this.triggers.values())
      .filter(t => t.isActive)
      .sort((a, b) => b.priority - a.priority)

    for (const trigger of sortedTriggers) {
      // Проверка платформы
      if (!trigger.platforms.includes(message.platform as any)) continue

      // Проверка типа чата
      if (!trigger.chatTypes.includes(message.chatType as any)) continue

      // Проверка кулдауна
      const cooldownKey = `${trigger.id}_${message.chatId}`
      const lastTriggered = this.cooldowns.get(cooldownKey)
      if (lastTriggered && trigger.cooldown > 0) {
        const secondsSince = (Date.now() - lastTriggered.getTime()) / 1000
        if (secondsSince < trigger.cooldown) continue
      }

      // Проверка лимита срабатываний
      if (trigger.maxTriggers > 0 && trigger.triggersCount >= trigger.maxTriggers) continue

      // Проверка ключевых слов
      const matchResult = this.matchKeywords(message.content, trigger)
      if (!matchResult.matched) continue

      // Проверка дополнительных условий
      if (!this.checkConditions(trigger.conditions, message)) continue

      // Триггер сработал!
      const event: TriggerEvent = {
        id: `event_${Date.now()}`,
        triggerId: trigger.id,
        platform: message.platform,
        chatId: message.chatId,
        messageId: message.messageId,
        userId: message.userId,
        matchedKeyword: matchResult.keyword,
        matchedContent: matchResult.content,
        actionsExecuted: [],
        timestamp: new Date()
      }

      // Добавляем действия
      actions.push(...trigger.actions)

      // Обновляем статистику
      trigger.triggersCount++
      trigger.lastTriggeredAt = new Date()
      this.cooldowns.set(cooldownKey, new Date())
      this.triggerCounts.set(trigger.id, (this.triggerCounts.get(trigger.id) || 0) + 1)

      events.push(event)
      this.events.push(event)
    }

    return {
      triggered: events.length > 0,
      events,
      actions
    }
  }

  /**
   * Проверка ключевых слов
   */
  private matchKeywords(
    content: string,
    trigger: KeywordTrigger
  ): { matched: boolean; keyword: string; content: string } {
    const text = trigger.caseSensitive ? content : content.toLowerCase()

    for (const keyword of trigger.keywords) {
      const kw = trigger.caseSensitive ? keyword : keyword.toLowerCase()

      switch (trigger.matchType) {
        case 'exact':
          if (trigger.wholeWord) {
            const words = text.split(/\s+/)
            if (words.includes(kw)) {
              return { matched: true, keyword, content: kw }
            }
          } else {
            if (text === kw) {
              return { matched: true, keyword, content: kw }
            }
          }
          break

        case 'contains':
          if (trigger.wholeWord) {
            const regex = new RegExp(`\\b${this.escapeRegex(kw)}\\b`, trigger.caseSensitive ? '' : 'i')
            if (regex.test(text)) {
              return { matched: true, keyword, content: kw }
            }
          } else {
            if (text.includes(kw)) {
              return { matched: true, keyword, content: kw }
            }
          }
          break

        case 'regex':
          try {
            const regex = new RegExp(kw, trigger.caseSensitive ? '' : 'i')
            const match = text.match(regex)
            if (match) {
              return { matched: true, keyword, content: match[0] }
            }
          } catch (e) {
            // Invalid regex
          }
          break

        case 'fuzzy':
          const similarity = this.calculateSimilarity(text, kw)
          if (similarity > 0.8) {
            return { matched: true, keyword, content: kw }
          }
          break
      }
    }

    return { matched: false, keyword: '', content: '' }
  }

  /**
   * Проверка дополнительных условий
   */
  private checkConditions(conditions: TriggerCondition[], message: any): boolean {
    for (const condition of conditions) {
      let value: any

      switch (condition.type) {
        case 'time':
          value = new Date()
          break
        case 'user':
          value = message.userId
          break
        case 'chat':
          value = message.chatId
          break
        case 'message':
          value = message.content
          break
        case 'random':
          value = Math.random()
          break
      }

      if (!this.evaluateCondition(value, condition.operator, condition.value)) {
        return false
      }
    }

    return true
  }

  /**
   * Оценка условия
   */
  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expected
      case 'contains':
        return String(value).includes(expected)
      case 'gt':
        return value > expected
      case 'lt':
        return value < expected
      case 'gte':
        return value >= expected
      case 'lte':
        return value <= expected
      case 'in':
        return Array.isArray(expected) && expected.includes(value)
      case 'regex':
        return new RegExp(expected).test(String(value))
      default:
        return false
    }
  }

  /**
   * Выполнить действие триггера
   */
  async executeAction(
    action: TriggerAction,
    context: {
      message: any
      event: TriggerEvent
    }
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    // Задержка
    if (action.delay) {
      await this.delay(action.delay * 1000)
    }

    try {
      switch (action.type) {
        case 'reply':
          // Отправить ответ в чат
          return { success: true, result: { type: 'reply', message: action.config.message } }

        case 'dm':
          // Отправить личное сообщение
          return { success: true, result: { type: 'dm', message: action.config.message } }

        case 'react':
          // Поставить реакцию
          return { success: true, result: { type: 'react', emoji: action.config.emoji } }

        case 'forward':
          // Переслать сообщение
          return { success: true, result: { type: 'forward', to: action.config.targetChatId } }

        case 'save':
          // Сохранить в базу
          return { success: true, result: { type: 'save' } }

        case 'webhook':
          // Отправить на вебхук
          return { success: true, result: { type: 'webhook', url: action.config.url } }

        case 'ai_response':
          // Сгенерировать AI-ответ
          return { success: true, result: { type: 'ai_response', prompt: action.config.prompt } }

        case 'escalate':
          // Эскалировать оператору
          return { success: true, result: { type: 'escalate', assignTo: action.config.assignTo } }

        case 'ban':
          // Забанить пользователя
          return { success: true, result: { type: 'ban', duration: action.config.duration } }

        case 'mute':
          // Замьютить пользователя
          return { success: true, result: { type: 'mute', duration: action.config.duration } }

        default:
          return { success: false, error: 'Unknown action type' }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Получить статистику триггера
   */
  getTriggerStats(triggerId: string): TriggerStats | null {
    const trigger = this.triggers.get(triggerId)
    if (!trigger) return null

    const triggerEvents = this.events.filter(e => e.triggerId === triggerId)
    const uniqueUsers = new Set(triggerEvents.map(e => e.userId)).size
    const uniqueChats = new Set(triggerEvents.map(e => e.chatId)).size

    // Подсчет ключевых слов
    const keywordCounts: Record<string, number> = {}
    for (const event of triggerEvents) {
      keywordCounts[event.matchedKeyword] = (keywordCounts[event.matchedKeyword] || 0) + 1
    }

    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Распределение по часам
    const hourlyDistribution = new Array(24).fill(0)
    for (const event of triggerEvents) {
      const hour = event.timestamp.getHours()
      hourlyDistribution[hour]++
    }

    return {
      triggerId,
      totalTriggers: triggerEvents.length,
      uniqueUsers,
      uniqueChats,
      topKeywords,
      actionsBreakdown: {},
      hourlyDistribution
    }
  }

  /**
   * Получить все триггеры
   */
  getAllTriggers(): KeywordTrigger[] {
    return Array.from(this.triggers.values())
  }

  /**
   * Получить триггер
   */
  getTrigger(id: string): KeywordTrigger | undefined {
    return this.triggers.get(id)
  }

  /**
   * Получить события
   */
  getEvents(limit: number = 100): TriggerEvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Экспорт триггеров
   */
  exportTriggers(): string {
    return JSON.stringify(Array.from(this.triggers.values()), null, 2)
  }

  /**
   * Импорт триггеров
   */
  importTriggers(data: string): number {
    try {
      const triggers = JSON.parse(data)
      let imported = 0
      for (const trigger of triggers) {
        this.triggers.set(trigger.id, {
          ...trigger,
          createdAt: new Date(trigger.createdAt),
          updatedAt: new Date(),
          lastTriggeredAt: trigger.lastTriggeredAt ? new Date(trigger.lastTriggeredAt) : undefined
        })
        imported++
      }
      return imported
    } catch {
      return 0
    }
  }

  // Вспомогательные методы

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const costs: number[] = []
    for (let i = 0; i <= longer.length; i++) {
      let lastValue = i
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j
        } else if (j > 0) {
          let newValue = costs[j - 1]
          if (str1[i - 1] !== str2[j - 1]) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
          }
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
      if (i > 0) costs[shorter.length] = lastValue
    }
    
    return (longer.length - costs[shorter.length]) / longer.length
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Инициализация дефолтных триггеров
   */
  private initializeDefaultTriggers(): void {
    // Триггер на жалобы
    this.createTrigger({
      name: 'Обнаружение жалоб',
      description: 'Автоматическое обнаружение жалоб и негатива',
      keywords: ['жалоба', 'плохо', 'ужасно', 'развод', 'скам', 'обман', 'лохотрон'],
      matchType: 'contains',
      caseSensitive: false,
      platforms: ['telegram'],
      chatTypes: ['group'],
      actions: [
        { type: 'save', config: { tag: 'complaint' }, order: 1 },
        { type: 'escalate', config: { assignTo: 'support' }, order: 2 }
      ],
      priority: 10,
      isActive: true
    })

    // Триггер на интерес к продукту
    this.createTrigger({
      name: 'Интерес к продукту',
      description: 'Обнаружение потенциальных клиентов',
      keywords: ['сколько стоит', 'цена', 'купить', 'заказать', 'хочу', 'интересно'],
      matchType: 'contains',
      caseSensitive: false,
      platforms: ['telegram', 'instagram'],
      chatTypes: ['private', 'group'],
      actions: [
        { type: 'save', config: { tag: 'lead' }, order: 1 },
        { type: 'ai_response', config: { prompt: 'generate_sales_reply' }, delay: 5, order: 2 }
      ],
      priority: 8,
      isActive: true
    })

    // Триггер на приветствие
    this.createTrigger({
      name: 'Приветствие',
      description: 'Ответ на приветствия в личке',
      keywords: ['привет', 'здравствуй', 'добрый день', 'добрый вечер', 'хай', 'хэлло'],
      matchType: 'contains',
      caseSensitive: false,
      platforms: ['telegram'],
      chatTypes: ['private'],
      actions: [
        { type: 'reply', config: { message: 'Привет! 👋 Чем могу помочь?' }, order: 1 }
      ],
      priority: 5,
      cooldown: 60,
      isActive: true
    })
  }
}

export const keywordTriggersService = new KeywordTriggersService()
export default keywordTriggersService
