/**
 * МУКН | Трафик - Сервис Telegram AI-агентов
 * Управление AI-агентами из Telegram, переключение моделей, групповые чаты
 */

import { aiCharactersService, type AICharacter } from './ai-characters-service'

export interface TelegramAIAgent {
  id: string
  name: string
  botToken?: string
  botUsername?: string
  
  // Связь с персонажем
  characterId: string
  
  // Модель AI
  modelConfig: AIModelConfig
  
  // Настройки Telegram
  telegramConfig: TelegramConfig
  
  // Групповые чаты
  assignedChats: AgentChat[]
  
  // Статистика
  stats: AgentStats
  
  // Статус
  status: 'active' | 'paused' | 'error'
  lastError?: string
  
  // Временные метки
  createdAt: Date
  updatedAt: Date
}

export interface AIModelConfig {
  primaryModel: string
  fallbackModels: string[]
  currentModel: string
  autoSwitch: boolean
  switchThreshold: {
    errorRate: number
    latencyMs: number
    costLimit: number
  }
  temperature: number
  maxTokens: number
  systemPrompt?: string
}

export interface TelegramConfig {
  // Команды
  commands: BotCommand[]
  
  // Приветствие
  welcomeMessage?: string
  
  // Кнопки меню
  menuButton?: string
  
  // Разрешения
  allowedChatTypes: ('private' | 'group' | 'supergroup' | 'channel')[]
  allowedUserIds?: number[]
  blockedUserIds?: number[]
  
  // Лимиты
  rateLimit: {
    messagesPerMinute: number
    messagesPerHour: number
    messagesPerDay: number
  }
  
  // Уведомления
  notifyOnMention: boolean
  notifyOnReply: boolean
  
  // Вебхук
  webhookUrl?: string
}

export interface BotCommand {
  command: string
  description: string
  handler: 'ai' | 'script' | 'webhook'
  handlerConfig?: Record<string, any>
}

export interface AgentChat {
  chatId: string
  chatTitle?: string
  chatType: 'private' | 'group' | 'supergroup' | 'channel'
  role: 'assistant' | 'moderator' | 'member'
  isActive: boolean
  joinedAt: Date
  settings: ChatSettings
}

export interface ChatSettings {
  respondToMentions: boolean
  respondToReplies: boolean
  respondToKeywords: string[]
  silentMode: boolean
  cooldownSeconds: number
  maxResponsesPerHour: number
}

export interface AgentStats {
  totalMessages: number
  totalResponses: number
  totalTokens: number
  avgResponseTime: number
  errorCount: number
  lastActiveAt?: Date
  topChats: Array<{ chatId: string; messages: number }>
  dailyUsage: Array<{ date: string; messages: number; tokens: number }>
}

export interface ModelSwitchEvent {
  id: string
  agentId: string
  fromModel: string
  toModel: string
  reason: 'error_rate' | 'latency' | 'cost' | 'manual' | 'scheduled'
  timestamp: Date
}

export interface AgentMessage {
  id: string
  agentId: string
  chatId: string
  userId: number
  direction: 'incoming' | 'outgoing'
  content: string
  model: string
  tokens: number
  responseTime: number
  timestamp: Date
}

class TelegramAIAgentsService {
  private agents: Map<string, TelegramAIAgent> = new Map()
  private modelSwitches: ModelSwitchEvent[] = []
  private messages: AgentMessage[] = []
  private userRates: Map<string, Map<number, number[]>> = new Map() // agentId -> userId -> timestamps

  constructor() {
    this.initializeDefaultAgent()
  }

  /**
   * Создать AI-агента
   */
  createAgent(data: Partial<TelegramAIAgent>): TelegramAIAgent {
    const agent: TelegramAIAgent = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: data.name || 'AI Agent',
      botToken: data.botToken,
      botUsername: data.botUsername,
      characterId: data.characterId || '',
      
      modelConfig: data.modelConfig || {
        primaryModel: 'deepseek-chat',
        fallbackModels: ['gpt-4o-mini', 'claude-3-haiku'],
        currentModel: 'deepseek-chat',
        autoSwitch: true,
        switchThreshold: {
          errorRate: 0.1,
          latencyMs: 10000,
          costLimit: 10
        },
        temperature: 0.7,
        maxTokens: 2000
      },
      
      telegramConfig: data.telegramConfig || {
        commands: [
          { command: 'start', description: 'Начать работу', handler: 'ai' },
          { command: 'help', description: 'Помощь', handler: 'ai' },
          { command: 'model', description: 'Сменить модель', handler: 'script' }
        ],
        allowedChatTypes: ['private', 'group', 'supergroup'],
        rateLimit: {
          messagesPerMinute: 5,
          messagesPerHour: 100,
          messagesPerDay: 500
        },
        notifyOnMention: true,
        notifyOnReply: true
      },
      
      assignedChats: data.assignedChats || [],
      
      stats: data.stats || {
        totalMessages: 0,
        totalResponses: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        errorCount: 0,
        topChats: [],
        dailyUsage: []
      },
      
      status: data.status || 'active',
      
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.agents.set(agent.id, agent)
    return agent
  }

  /**
   * Обновить агента
   */
  updateAgent(agentId: string, data: Partial<TelegramAIAgent>): TelegramAIAgent | null {
    const agent = this.agents.get(agentId)
    if (!agent) return null

    Object.assign(agent, data, { updatedAt: new Date() })
    return agent
  }

  /**
   * Удалить агента
   */
  deleteAgent(agentId: string): boolean {
    return this.agents.delete(agentId)
  }

  /**
   * Добавить чат к агенту
   */
  assignChatToAgent(
    agentId: string,
    chatId: string,
    chatType: AgentChat['chatType'],
    settings?: Partial<ChatSettings>
  ): AgentChat | null {
    const agent = this.agents.get(agentId)
    if (!agent) return null

    const chat: AgentChat = {
      chatId,
      chatType,
      role: 'assistant',
      isActive: true,
      joinedAt: new Date(),
      settings: {
        respondToMentions: true,
        respondToReplies: true,
        respondToKeywords: [],
        silentMode: false,
        cooldownSeconds: 30,
        maxResponsesPerHour: 20,
        ...settings
      }
    }

    agent.assignedChats.push(chat)
    agent.updatedAt = new Date()

    return chat
  }

  /**
   * Удалить чат из агента
   */
  removeChatFromAgent(agentId: string, chatId: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false

    const index = agent.assignedChats.findIndex(c => c.chatId === chatId)
    if (index === -1) return false

    agent.assignedChats.splice(index, 1)
    agent.updatedAt = new Date()
    return true
  }

  /**
   * Переключить AI-модель
   */
  switchModel(
    agentId: string,
    newModel: string,
    reason: ModelSwitchEvent['reason'] = 'manual'
  ): ModelSwitchEvent | null {
    const agent = this.agents.get(agentId)
    if (!agent) return null

    const oldModel = agent.modelConfig.currentModel
    agent.modelConfig.currentModel = newModel
    agent.updatedAt = new Date()

    const event: ModelSwitchEvent = {
      id: `switch_${Date.now()}`,
      agentId,
      fromModel: oldModel,
      toModel: newModel,
      reason,
      timestamp: new Date()
    }

    this.modelSwitches.push(event)
    return event
  }

  /**
   * Автоматическое переключение модели при проблемах
   */
  autoSwitchIfNeeded(agentId: string): string | null {
    const agent = this.agents.get(agentId)
    if (!agent || !agent.modelConfig.autoSwitch) return null

    const { modelConfig, stats } = agent

    // Проверка ошибок
    const errorRate = stats.totalMessages > 0 ? stats.errorCount / stats.totalMessages : 0
    if (errorRate > modelConfig.switchThreshold.errorRate) {
      const nextModel = modelConfig.fallbackModels[0]
      if (nextModel) {
        this.switchModel(agentId, nextModel, 'error_rate')
        return nextModel
      }
    }

    // Проверка задержки
    if (stats.avgResponseTime > modelConfig.switchThreshold.latencyMs) {
      const nextModel = modelConfig.fallbackModels[0]
      if (nextModel) {
        this.switchModel(agentId, nextModel, 'latency')
        return nextModel
      }
    }

    return null
  }

  /**
   * Обработать входящее сообщение
   */
  async processMessage(
    agentId: string,
    message: {
      chatId: string
      userId: number
      content: string
      isMention: boolean
      isReply: boolean
      replyToBot: boolean
    }
  ): Promise<{ response?: string; error?: string }> {
    const agent = this.agents.get(agentId)
    if (!agent || agent.status !== 'active') {
      return { error: 'Agent not available' }
    }

    // Проверка рейт-лимитов
    if (!this.checkRateLimit(agent, message.userId)) {
      return { error: 'Rate limit exceeded' }
    }

    // Получаем чат
    const chat = agent.assignedChats.find(c => c.chatId === message.chatId)
    if (!chat || !chat.isActive) {
      return { error: 'Chat not assigned or inactive' }
    }

    // Проверяем, нужно ли отвечать
    if (!this.shouldRespond(agent, chat, message)) {
      return {}
    }

    // Получаем персонажа
    const character = aiCharactersService.getCharacter(agent.characterId)
    
    // Генерируем системный промпт
    const systemPrompt = character 
      ? aiCharactersService.generateSystemPrompt(agent.characterId)
      : agent.modelConfig.systemPrompt || 'Ты полезный AI-ассистент.'

    // Формируем контекст памяти
    const memoryContext = character 
      ? aiCharactersService.getMemoryContext(agent.characterId, message.content)
      : ''

    // В реальной реализации - вызов AI API
    const startTime = Date.now()
    
    // Симуляция ответа
    const response = await this.generateResponse(
      systemPrompt + (memoryContext ? '\n\n' + memoryContext : ''),
      message.content,
      agent.modelConfig
    )

    const responseTime = Date.now() - startTime

    // Записываем статистику
    this.recordMessage(agent, {
      chatId: message.chatId,
      userId: message.userId,
      content: message.content,
      direction: 'incoming',
      model: agent.modelConfig.currentModel,
      tokens: 0,
      responseTime: 0
    })

    if (response) {
      this.recordMessage(agent, {
        chatId: message.chatId,
        userId: message.userId,
        content: response,
        direction: 'outgoing',
        model: agent.modelConfig.currentModel,
        tokens: Math.ceil(response.length / 4),
        responseTime
      })
    }

    return { response }
  }

  /**
   * Проверка, нужно ли отвечать
   */
  private shouldRespond(
    agent: TelegramAIAgent,
    chat: AgentChat,
    message: { isMention: boolean; isReply: boolean; replyToBot: boolean }
  ): boolean {
    // В личке всегда отвечаем
    if (chat.chatType === 'private') return true

    // В группах проверяем условия
    if (message.isMention && chat.settings.respondToMentions) return true
    if (message.replyToBot && chat.settings.respondToReplies) return true

    // Проверяем ключевые слова
    if (chat.settings.respondToKeywords.length > 0) {
      // В реальной реализации - проверка содержания сообщения
    }

    return false
  }

  /**
   * Проверка рейт-лимитов
   */
  private checkRateLimit(agent: TelegramAIAgent, userId: number): boolean {
    const { rateLimit } = agent.telegramConfig
    const now = Date.now()

    if (!this.userRates.has(agent.id)) {
      this.userRates.set(agent.id, new Map())
    }

    const agentRates = this.userRates.get(agent.id)!
    if (!agentRates.has(userId)) {
      agentRates.set(userId, [])
    }

    const userTimestamps = agentRates.get(userId)!
    
    // Фильтруем старые timestamp'ы
    const minuteAgo = now - 60000
    const hourAgo = now - 3600000
    const dayAgo = now - 86400000

    const lastMinute = userTimestamps.filter(t => t > minuteAgo).length
    const lastHour = userTimestamps.filter(t => t > hourAgo).length
    const lastDay = userTimestamps.filter(t => t > dayAgo).length

    if (lastMinute >= rateLimit.messagesPerMinute) return false
    if (lastHour >= rateLimit.messagesPerHour) return false
    if (lastDay >= rateLimit.messagesPerDay) return false

    userTimestamps.push(now)
    return true
  }

  /**
   * Генерация ответа
   */
  private async generateResponse(
    systemPrompt: string,
    userMessage: string,
    config: AIModelConfig
  ): Promise<string> {
    // В реальной реализации - вызов AI API
    await this.delay(500 + Math.random() * 1000)
    
    const responses = [
      'Интересный вопрос! Дай подумать...',
      'Спасибо за сообщение! Чем могу помочь?',
      'Отличный вопрос! Вот что я думаю по этому поводу...',
      'Понял вас. Позвольте ответить.',
      'Хорошо, рассмотрим это подробнее.'
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * Запись сообщения
   */
  private recordMessage(
    agent: TelegramAIAgent,
    data: {
      chatId: string
      userId: number
      content: string
      direction: 'incoming' | 'outgoing'
      model: string
      tokens: number
      responseTime: number
    }
  ): void {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      agentId: agent.id,
      ...data,
      timestamp: new Date()
    }

    this.messages.push(message)

    // Обновляем статистику агента
    if (data.direction === 'incoming') {
      agent.stats.totalMessages++
    } else {
      agent.stats.totalResponses++
      agent.stats.totalTokens += data.tokens
      agent.stats.avgResponseTime = 
        (agent.stats.avgResponseTime * (agent.stats.totalResponses - 1) + data.responseTime) 
        / agent.stats.totalResponses
    }
    agent.stats.lastActiveAt = new Date()
  }

  /**
   * Получить историю сообщений
   */
  getMessageHistory(agentId: string, chatId?: string, limit: number = 50): AgentMessage[] {
    let filtered = this.messages.filter(m => m.agentId === agentId)
    
    if (chatId) {
      filtered = filtered.filter(m => m.chatId === chatId)
    }
    
    return filtered.slice(-limit)
  }

  /**
   * Получить статистику агента
   */
  getAgentStats(agentId: string): AgentStats | null {
    const agent = this.agents.get(agentId)
    return agent?.stats || null
  }

  /**
   * Получить историю переключений моделей
   */
  getModelSwitchHistory(agentId?: string): ModelSwitchEvent[] {
    if (agentId) {
      return this.modelSwitches.filter(e => e.agentId === agentId)
    }
    return this.modelSwitches
  }

  /**
   * Получить всех агентов
   */
  getAllAgents(): TelegramAIAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Получить агента
   */
  getAgent(id: string): TelegramAIAgent | undefined {
    return this.agents.get(id)
  }

  /**
   * Приостановить агента
   */
  pauseAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false
    agent.status = 'paused'
    agent.updatedAt = new Date()
    return true
  }

  /**
   * Возобновить агента
   */
  resumeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false
    agent.status = 'active'
    agent.updatedAt = new Date()
    return true
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Инициализация дефолтного агента
   */
  private initializeDefaultAgent(): void {
    // Создаем персонажа если нет
    const characters = aiCharactersService.getAllCharacters()
    const character = characters[0]

    this.createAgent({
      name: 'Основной AI-агент',
      characterId: character?.id || '',
      status: 'active'
    })
  }
}

export const telegramAIAgentsService = new TelegramAIAgentsService()
export default telegramAIAgentsService
