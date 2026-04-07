/**
 * МУКН | Трафик - Сервис парсинга
 * Парсинг участников групп, комментариев, глобальный поиск
 * Реальная интеграция с Telegram API
 */

import { db } from './db'
import { logger } from './logger'

export interface ParsedMember {
  id: string
  username?: string
  firstName?: string
  lastName?: string
  phone?: string
  isBot: boolean
  isPremium: boolean
  lastSeen?: Date
  status: 'online' | 'offline' | 'recently' | 'within_week' | 'within_month' | 'long_ago'
}

export interface ParsedComment {
  id: string
  postId: string
  authorId: string
  authorName?: string
  content: string
  timestamp: Date
  likes: number
  replies: number
  isReply: boolean
  parentCommentId?: string
}

export interface GlobalSearchResult {
  type: 'channel' | 'group' | 'user' | 'message'
  id: string
  title?: string
  username?: string
  description?: string
  membersCount?: number
  relevanceScore: number
}

export interface ParseTask {
  id: string
  type: 'group_members' | 'comments' | 'global_search'
  status: 'pending' | 'running' | 'completed' | 'failed'
  target: string
  progress: number
  totalItems: number
  parsedItems: number
  results: any[]
  error?: string
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
}

export interface ParseOptions {
  maxResults?: number
  includeBots?: boolean
  includePremium?: boolean
  filterByStatus?: string[]
  filterByLastSeen?: string
  delayBetweenRequests?: number
  useProxy?: boolean
  proxyId?: string
  accountId?: string // Telegram account to use for parsing
}

interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  error_code?: number
  description?: string
}

interface TelegramChatMember {
  user: {
    id: number
    is_bot: boolean
    first_name: string
    last_name?: string
    username?: string
    status?: string
  }
  status: string
  is_premium?: boolean
  last_online_date?: number
}

interface TelegramMessage {
  message_id: number
  from?: {
    id: number
    is_bot: boolean
    first_name: string
    last_name?: string
    username?: string
  }
  text?: string
  date: number
  reply_to_message?: TelegramMessage
}

class ParsingService {
  private tasks: Map<string, ParseTask> = new Map()
  private isRunning: boolean = false
  private botToken: string
  private apiBaseUrl: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ''
    this.apiBaseUrl = `https://api.telegram.org/bot${this.botToken}`
  }

  /**
   * Выполнить запрос к Telegram API
   */
  private async callTelegramApi<T>(
    method: string,
    params: Record<string, any> = {}
  ): Promise<TelegramApiResponse<T>> {
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN не настроен')
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      const data = await response.json()
      return data as TelegramApiResponse<T>
    } catch (error) {
      logger.error('Telegram API call failed', error as Error, { method, params })
      throw error
    }
  }

  /**
   * Парсинг участников группы
   */
  async parseGroupMembers(
    groupId: string,
    options: ParseOptions = {}
  ): Promise<ParseTask> {
    const taskId = `parse_members_${Date.now()}`
    
    const task: ParseTask = {
      id: taskId,
      type: 'group_members',
      status: 'pending',
      target: groupId,
      progress: 0,
      totalItems: 0,
      parsedItems: 0,
      results: [],
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)

    // Запускаем асинхронно
    this.executeGroupMembersParse(taskId, groupId, options).catch(console.error)

    return task
  }

  private async executeGroupMembersParse(
    taskId: string,
    groupId: string,
    options: ParseOptions
  ): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      task.status = 'running'
      task.startedAt = new Date()

      // Получаем информацию о чате для подсчета участников
      const chatInfo = await this.callTelegramApi<{ member_count?: number }>('getChat', {
        chat_id: groupId
      })

      const estimatedCount = chatInfo.result?.member_count || options.maxResults || 1000
      task.totalItems = estimatedCount

      const members: ParsedMember[] = []
      let offset = 0
      const limit = 200 // Максимум за один запрос

      // Получаем список администраторов (для проверки доступа)
      const admins = await this.callTelegramApi<TelegramChatMember[]>('getChatAdministrators', {
        chat_id: groupId
      })

      if (!admins.ok) {
        // Если не можем получить админов, бот может не быть в чате
        logger.warn('Cannot get chat admins, bot may not be in chat', { groupId })
      }

      // Перебираем участников через getChatMember (если знаем их ID)
      // Или используем альтернативные методы
      
      // Сохраняем задачу в базу данных для отслеживания
      const savedTask = await db.parsingTask.create({
        data: {
          id: taskId,
          type: 'group_members',
          status: 'running',
          target: groupId,
          progress: 0,
          totalItems: estimatedCount,
          parsedItems: 0,
          options: JSON.stringify(options),
          createdAt: new Date()
        }
      }).catch(() => null)

      // Получаем недавние сообщения для извлечения активных участников
      const messages = await this.callTelegramApi<TelegramMessage[]>('getChatHistory', {
        chat_id: groupId,
        limit: 100
      }).catch(() => null)

      // Альтернативный метод: получение через участников (только для супергрупп где бот админ)
      // Используем экспорт участников если доступно
      
      // Для реального парсинга используем клиентский метод
      // Через MTProto API (требует userbot)
      
      // Если есть интеграция с userbot клиентом
      if (options.accountId) {
        const account = await db.account.findUnique({
          where: { id: options.accountId }
        })

        if (account && account.sessionData) {
          // Используем сессию Telegram клиента для парсинга
          const parsedMembers = await this.parseWithUserbot(groupId, account.sessionData, options)
          members.push(...parsedMembers)
        }
      }

      // Если direct API не сработал, используем сохраненные данные из событий
      const knownMembers = await db.telegramBotEvent.findMany({
        where: {
          chatId: groupId,
          eventType: 'new_chat_member'
        },
        take: options.maxResults || 1000
      })

      for (const event of knownMembers) {
        try {
          const rawData = JSON.parse(event.rawData || '{}')
          const newMembers = rawData.message?.new_chat_members || []
          
          for (const member of newMembers) {
            const parsed: ParsedMember = {
              id: member.id?.toString() || `user_${Date.now()}`,
              username: member.username,
              firstName: member.first_name,
              lastName: member.last_name,
              isBot: member.is_bot || false,
              isPremium: false,
              status: 'recently'
            }

            if (!options.includeBots && parsed.isBot) continue
            
            members.push(parsed)
            task.parsedItems = members.length
            task.progress = Math.round((members.length / estimatedCount) * 100)
          }
        } catch (e) {
          // Skip malformed events
        }
      }

      task.results = members
      task.totalItems = members.length
      task.progress = 100
      task.status = 'completed'
      task.completedAt = new Date()

      // Обновляем в базе
      await db.parsingTask.updateMany({
        where: { id: taskId },
        data: {
          status: 'completed',
          progress: 100,
          parsedItems: members.length,
          results: JSON.stringify(members),
          completedAt: new Date()
        }
      }).catch(() => {})

      logger.info('Group members parsing completed', {
        taskId,
        groupId,
        membersCount: members.length
      })

    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message
      
      logger.error('Group members parsing failed', error, { taskId, groupId })

      await db.parsingTask.updateMany({
        where: { id: taskId },
        data: {
          status: 'failed',
          error: error.message
        }
      }).catch(() => {})
    }
  }

  /**
   * Парсинг через userbot (MTProto)
   */
  private async parseWithUserbot(
    groupId: string,
    sessionString: string,
    options: ParseOptions
  ): Promise<ParsedMember[]> {
    // Этот метод требует интеграции с MTProto клиентом
    // Например, через Telegram Desktop runner или GramJS
    
    const members: ParsedMember[] = []
    
    // Отправляем задачу desktop runner
    try {
      const response = await fetch('http://localhost:8765/api/parse-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          session: sessionString,
          maxResults: options.maxResults || 1000,
          includeBots: options.includeBots,
          delayBetweenRequests: options.delayBetweenRequests || 1000
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.members || []
      }
    } catch (error) {
      logger.warn('Desktop runner not available for parsing', { error })
    }

    return members
  }

  /**
   * Парсинг комментариев из канала/группы
   */
  async parseComments(
    channelId: string,
    options: ParseOptions = {}
  ): Promise<ParseTask> {
    const taskId = `parse_comments_${Date.now()}`
    
    const task: ParseTask = {
      id: taskId,
      type: 'comments',
      status: 'pending',
      target: channelId,
      progress: 0,
      totalItems: 0,
      parsedItems: 0,
      results: [],
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)
    this.executeCommentsParse(taskId, channelId, options).catch(console.error)

    return task
  }

  private async executeCommentsParse(
    taskId: string,
    channelId: string,
    options: ParseOptions
  ): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      task.status = 'running'
      task.startedAt = new Date()

      const comments: ParsedComment[] = []
      const maxResults = options.maxResults || 500

      // Сохраняем задачу
      await db.parsingTask.create({
        data: {
          id: taskId,
          type: 'comments',
          status: 'running',
          target: channelId,
          progress: 0,
          totalItems: maxResults,
          parsedItems: 0,
          options: JSON.stringify(options),
          createdAt: new Date()
        }
      }).catch(() => null)

      // Получаем сообщения из канала
      const messages = await this.callTelegramApi<TelegramMessage[]>('getChatHistory', {
        chat_id: channelId,
        limit: Math.min(maxResults, 100)
      })

      if (messages.ok && messages.result) {
        for (const message of messages.result) {
          // Для каждого сообщения получаем комментарии (если есть discussion group)
          const discussionGroup = await this.getDiscussionGroup(channelId, message.message_id)
          
          if (discussionGroup) {
            const threadComments = await this.getThreadComments(
              discussionGroup,
              message.message_id,
              options
            )
            comments.push(...threadComments)
          }

          // Также проверяем replies к сообщению
          const replies = await this.callTelegramApi<TelegramMessage[]>('getMessageReplies', {
            chat_id: channelId,
            message_id: message.message_id,
            limit: 50
          }).catch(() => null)

          if (replies?.ok && replies.result) {
            for (const reply of replies.result) {
              const comment: ParsedComment = {
                id: `comment_${reply.message_id}`,
                postId: message.message_id.toString(),
                authorId: reply.from?.id?.toString() || 'unknown',
                authorName: reply.from ? `${reply.from.first_name} ${reply.from.last_name || ''}`.trim() : undefined,
                content: reply.text || '',
                timestamp: new Date(reply.date * 1000),
                likes: 0,
                replies: 0,
                isReply: !!reply.reply_to_message,
                parentCommentId: reply.reply_to_message?.message_id?.toString()
              }
              comments.push(comment)
            }
          }

          task.parsedItems = comments.length
          task.progress = Math.round((comments.length / maxResults) * 100)

          if (options.delayBetweenRequests) {
            await this.delay(options.delayBetweenRequests)
          }
        }
      }

      task.results = comments
      task.totalItems = comments.length
      task.status = 'completed'
      task.completedAt = new Date()

      await db.parsingTask.updateMany({
        where: { id: taskId },
        data: {
          status: 'completed',
          progress: 100,
          parsedItems: comments.length,
          results: JSON.stringify(comments),
          completedAt: new Date()
        }
      }).catch(() => {})

      logger.info('Comments parsing completed', {
        taskId,
        channelId,
        commentsCount: comments.length
      })

    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message
      
      logger.error('Comments parsing failed', error, { taskId, channelId })
    }
  }

  /**
   * Получить группу обсуждения для поста
   */
  private async getDiscussionGroup(channelId: string, messageId: number): Promise<string | null> {
    try {
      const info = await this.callTelegramApi<{ linked_chat_id?: number }>('getChat', {
        chat_id: channelId
      })
      
      if (info.ok && info.result?.linked_chat_id) {
        return info.result.linked_chat_id.toString()
      }
    } catch (error) {
      // Нет группы обсуждения
    }
    return null
  }

  /**
   * Получить комментарии из треда
   */
  private async getThreadComments(
    discussionGroupId: string,
    threadId: number,
    options: ParseOptions
  ): Promise<ParsedComment[]> {
    const comments: ParsedComment[] = []

    try {
      const messages = await this.callTelegramApi<TelegramMessage[]>('getChatHistory', {
        chat_id: discussionGroupId,
        limit: 100
      })

      if (messages.ok && messages.result) {
        for (const message of messages.result) {
          const comment: ParsedComment = {
            id: `comment_${message.message_id}`,
            postId: threadId.toString(),
            authorId: message.from?.id?.toString() || 'unknown',
            authorName: message.from ? `${message.from.first_name} ${message.from.last_name || ''}`.trim() : undefined,
            content: message.text || '',
            timestamp: new Date(message.date * 1000),
            likes: 0,
            replies: 0,
            isReply: !!message.reply_to_message,
            parentCommentId: message.reply_to_message?.message_id?.toString()
          }
          comments.push(comment)
        }
      }
    } catch (error) {
      logger.warn('Failed to get thread comments', { discussionGroupId, threadId })
    }

    return comments
  }

  /**
   * Глобальный поиск по Telegram
   */
  async globalSearch(
    query: string,
    options: ParseOptions = {}
  ): Promise<ParseTask> {
    const taskId = `search_${Date.now()}`
    
    const task: ParseTask = {
      id: taskId,
      type: 'global_search',
      status: 'pending',
      target: query,
      progress: 0,
      totalItems: 0,
      parsedItems: 0,
      results: [],
      createdAt: new Date()
    }

    this.tasks.set(taskId, task)
    this.executeGlobalSearch(taskId, query, options).catch(console.error)

    return task
  }

  private async executeGlobalSearch(
    taskId: string,
    query: string,
    options: ParseOptions
  ): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      task.status = 'running'
      task.startedAt = new Date()

      const results: GlobalSearchResult[] = []

      // Сохраняем задачу
      await db.parsingTask.create({
        data: {
          id: taskId,
          type: 'global_search',
          status: 'running',
          target: query,
          progress: 0,
          totalItems: 0,
          parsedItems: 0,
          options: JSON.stringify(options),
          createdAt: new Date()
        }
      }).catch(() => null)

      // Ищем через публичные каталоги
      // Используем tgstat.ru API или аналоги
      const searchResults = await this.searchPublicCatalogs(query)

      // Также ищем через Bot API (если есть сохраненные чаты)
      const savedChats = await db.telegramBotEvent.findMany({
        where: {
          OR: [
            { chatTitle: { contains: query } },
            { username: { contains: query } }
          ]
        },
        take: 50
      })

      for (const chat of savedChats) {
        const result: GlobalSearchResult = {
          type: 'channel',
          id: chat.chatId || '',
          title: chat.chatTitle || '',
          username: chat.username || undefined,
          relevanceScore: 100
        }
        results.push(result)
      }

      // Добавляем результаты из публичных каталогов
      results.push(...searchResults)

      // Сортировка по релевантности
      results.sort((a, b) => b.relevanceScore - a.relevanceScore)

      task.results = results
      task.totalItems = results.length
      task.parsedItems = results.length
      task.progress = 100
      task.status = 'completed'
      task.completedAt = new Date()

      await db.parsingTask.updateMany({
        where: { id: taskId },
        data: {
          status: 'completed',
          progress: 100,
          parsedItems: results.length,
          results: JSON.stringify(results),
          completedAt: new Date()
        }
      }).catch(() => {})

    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message
      
      logger.error('Global search failed', error, { taskId, query })
    }
  }

  /**
   * Поиск в публичных каталогах каналов
   */
  private async searchPublicCatalogs(query: string): Promise<GlobalSearchResult[]> {
    const results: GlobalSearchResult[] = []

    // Используем tgstat API (требует API ключ)
    try {
      const tgstatKey = process.env.TGSTAT_API_KEY
      if (tgstatKey) {
        const response = await fetch(
          `https://api.tgstat.ru/channels/search?token=${tgstatKey}&q=${encodeURIComponent(query)}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.response?.channels) {
            for (const channel of data.response.channels) {
              results.push({
                type: 'channel',
                id: channel.id?.toString() || channel.username,
                title: channel.title,
                username: channel.username,
                description: channel.description,
                membersCount: channel.members_count,
                relevanceScore: channel.tgstat_rate || 50
              })
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to search in public catalogs', { error })
    }

    return results
  }

  /**
   * Получить статус задачи парсинга
   */
  getTaskStatus(taskId: string): ParseTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Получить все задачи
   */
  getAllTasks(): ParseTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * Отменить задачу
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (task && task.status === 'running') {
      task.status = 'failed'
      task.error = 'Cancelled by user'

      await db.parsingTask.updateMany({
        where: { id: taskId },
        data: { status: 'failed', error: 'Cancelled by user' }
      }).catch(() => {})

      return true
    }
    return false
  }

  /**
   * Экспорт результатов
   */
  exportResults(taskId: string, format: 'json' | 'csv' | 'xlsx'): string {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error('Task not found')

    switch (format) {
      case 'json':
        return JSON.stringify(task.results, null, 2)
      case 'csv':
        return this.convertToCSV(task.results)
      case 'xlsx':
        // В реальной реализации - генерация Excel
        return JSON.stringify(task.results)
      default:
        return JSON.stringify(task.results)
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const rows = data.map(item => 
      headers.map(h => 
        typeof item[h] === 'object' ? JSON.stringify(item[h]) : item[h]
      ).join(',')
    )
    
    return [headers.join(','), ...rows].join('\n')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const parsingService = new ParsingService()
export default parsingService
