/**
 * МУКН | Трафик - Сервис AI-персонажей
 * Создание и управление AI-персонажами для общения
 */

export interface AICharacter {
  id: string
  name: string
  description?: string
  
  // Личность
  personality: CharacterPersonality
  background: CharacterBackground
  
  // Внешность
  avatar: CharacterAvatar
  
  // Голос
  voice?: CharacterVoice
  
  // Стиль общения
  communicationStyle: CommunicationStyle
  
  // Знания и память
  knowledge: CharacterKnowledge
  memory: CharacterMemory
  
  // Ограничения
  constraints: CharacterConstraints
  
  // Метаданные
  tags: string[]
  category: string
  isPublic: boolean
  usageCount: number
  rating: number
  
  // Временные метки
  createdAt: Date
  updatedAt: Date
}

export interface CharacterPersonality {
  traits: string[] // дружелюбный, саркастичный, профессиональный
  values: string[] // честность, помощь, юмор
  fears: string[] // чего избегает в разговорах
  goals: string[] // цели в общении
  quirks: string[] // уникальные особенности
}

export interface CharacterBackground {
  age?: number
  gender?: 'male' | 'female' | 'other'
  occupation?: string
  location?: string
  education?: string
  interests: string[]
  biography?: string
  relationships?: string[]
}

export interface CharacterAvatar {
  imageUrl?: string
  generatedPrompt?: string
  style: 'realistic' | 'anime' | 'cartoon' | 'abstract'
  attributes: {
    hairColor?: string
    eyeColor?: string
    skinTone?: string
    accessories?: string[]
  }
}

export interface CharacterVoice {
  provider: 'elevenlabs' | 'openai' | 'google'
  voiceId: string
  speed: number
  pitch: number
  emotion: string
}

export interface CommunicationStyle {
  tone: 'formal' | 'casual' | 'playful' | 'professional' | 'friendly'
  language: string
  slang: string[]
  catchphrases: string[]
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy'
  response_length: 'short' | 'medium' | 'long' | 'adaptive'
  questions_frequency: 'rare' | 'occasional' | 'frequent'
}

export interface CharacterKnowledge {
  domains: string[] // Области знаний
  expertise_level: Record<string, 'beginner' | 'intermediate' | 'expert'>
  custom_facts: string[]
  forbidden_topics: string[]
}

export interface CharacterMemory {
  enabled: boolean
  retention_days: number
  max_memories: number
  important_memories: MemoryItem[]
}

export interface MemoryItem {
  id: string
  content: string
  importance: number // 1-10
  createdAt: Date
  lastAccessedAt: Date
}

export interface CharacterConstraints {
  max_response_tokens: number
  temperature: number
  prohibited_content: string[]
  safety_level: 'strict' | 'moderate' | 'relaxed'
  custom_rules: string[]
}

export interface CharacterTemplate {
  id: string
  name: string
  description: string
  category: string
  preview: Partial<AICharacter>
}

class AICharactersService {
  private characters: Map<string, AICharacter> = new Map()
  private templates: CharacterTemplate[] = []

  constructor() {
    this.initializeTemplates()
    this.initializeDefaultCharacters()
  }

  /**
   * Создать персонажа
   */
  createCharacter(data: Partial<AICharacter>): AICharacter {
    const character: AICharacter = {
      id: `char_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: data.name || 'Новый персонаж',
      description: data.description,
      
      personality: data.personality || {
        traits: ['дружелюбный', 'помощный'],
        values: ['честность', 'помощь'],
        fears: [],
        goals: ['помочь пользователю'],
        quirks: []
      },
      
      background: data.background || {
        interests: [],
        gender: 'other'
      },
      
      avatar: data.avatar || {
        style: 'realistic',
        attributes: {}
      },
      
      communicationStyle: data.communicationStyle || {
        tone: 'friendly',
        language: 'ru',
        slang: [],
        catchphrases: [],
        emoji_usage: 'moderate',
        response_length: 'adaptive',
        questions_frequency: 'occasional'
      },
      
      knowledge: data.knowledge || {
        domains: [],
        expertise_level: {},
        custom_facts: [],
        forbidden_topics: []
      },
      
      memory: data.memory || {
        enabled: true,
        retention_days: 30,
        max_memories: 100,
        important_memories: []
      },
      
      constraints: data.constraints || {
        max_response_tokens: 1000,
        temperature: 0.7,
        prohibited_content: [],
        safety_level: 'moderate',
        custom_rules: []
      },
      
      tags: data.tags || [],
      category: data.category || 'general',
      isPublic: data.isPublic ?? false,
      usageCount: 0,
      rating: 0,
      
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.characters.set(character.id, character)
    return character
  }

  /**
   * Создать персонажа из шаблона
   */
  createFromTemplate(templateId: string, customizations: Partial<AICharacter> = {}): AICharacter | null {
    const template = this.templates.find(t => t.id === templateId)
    if (!template) return null

    return this.createCharacter({
      ...template.preview,
      ...customizations
    })
  }

  /**
   * Обновить персонажа
   */
  updateCharacter(characterId: string, data: Partial<AICharacter>): AICharacter | null {
    const character = this.characters.get(characterId)
    if (!character) return null

    // Глубокое слияние вложенных объектов
    if (data.personality) {
      character.personality = { ...character.personality, ...data.personality }
    }
    if (data.background) {
      character.background = { ...character.background, ...data.background }
    }
    if (data.communicationStyle) {
      character.communicationStyle = { ...character.communicationStyle, ...data.communicationStyle }
    }
    if (data.knowledge) {
      character.knowledge = { ...character.knowledge, ...data.knowledge }
    }
    if (data.constraints) {
      character.constraints = { ...character.constraints, ...data.constraints }
    }

    Object.assign(character, data, { updatedAt: new Date() })
    return character
  }

  /**
   * Удалить персонажа
   */
  deleteCharacter(characterId: string): boolean {
    return this.characters.delete(characterId)
  }

  /**
   * Клонировать персонажа
   */
  cloneCharacter(characterId: string, newName?: string): AICharacter | null {
    const original = this.characters.get(characterId)
    if (!original) return null

    const clone = JSON.parse(JSON.stringify(original))
    clone.id = `char_${Date.now()}_${Math.random().toString(36).substring(7)}`
    clone.name = newName || `${original.name} (копия)`
    clone.usageCount = 0
    clone.rating = 0
    clone.createdAt = new Date()
    clone.updatedAt = new Date()
    clone.memory = {
      ...clone.memory,
      important_memories: []
    }

    this.characters.set(clone.id, clone)
    return clone
  }

  /**
   * Сгенерировать системный промпт для персонажа
   */
  generateSystemPrompt(characterId: string): string {
    const character = this.characters.get(characterId)
    if (!character) return ''

    const parts: string[] = []

    // Основная идентичность
    parts.push(`Ты - ${character.name}.`)
    
    if (character.description) {
      parts.push(character.description)
    }

    // Личность
    if (character.personality.traits.length > 0) {
      parts.push(`Твои черты характера: ${character.personality.traits.join(', ')}.`)
    }
    
    if (character.personality.values.length > 0) {
      parts.push(`Твои ценности: ${character.personality.values.join(', ')}.`)
    }

    if (character.personality.goals.length > 0) {
      parts.push(`Твои цели в общении: ${character.personality.goals.join(', ')}.`)
    }

    if (character.personality.quirks.length > 0) {
      parts.push(`Твои уникальные особенности: ${character.personality.quirks.join(', ')}.`)
    }

    // Биография
    if (character.background.biography) {
      parts.push(`Твоя биография: ${character.background.biography}`)
    }

    if (character.background.occupation) {
      parts.push(`Твоя профессия: ${character.background.occupation}.`)
    }

    if (character.background.interests.length > 0) {
      parts.push(`Твои интересы: ${character.background.interests.join(', ')}.`)
    }

    // Стиль общения
    parts.push(`Твой стиль общения: ${character.communicationStyle.tone}.`)
    
    if (character.communicationStyle.catchphrases.length > 0) {
      parts.push(`Твои коронные фразы: ${character.communicationStyle.catchphrases.join(', ')}.`)
    }

    if (character.communicationStyle.emoji_usage !== 'none') {
      parts.push(`Используй эмодзи ${this.getEmojiUsageInstruction(character.communicationStyle.emoji_usage)}.`)
    }

    // Знания
    if (character.knowledge.domains.length > 0) {
      parts.push(`Твои области знаний: ${character.knowledge.domains.join(', ')}.`)
    }

    if (character.knowledge.custom_facts.length > 0) {
      parts.push(`Важные факты о тебе: ${character.knowledge.custom_facts.join(' ')}`)
    }

    // Ограничения
    if (character.knowledge.forbidden_topics.length > 0) {
      parts.push(`Тебе запрещено обсуждать: ${character.knowledge.forbidden_topics.join(', ')}.`)
    }

    if (character.constraints.custom_rules.length > 0) {
      parts.push(`Дополнительные правила: ${character.constraints.custom_rules.join(' ')}`)
    }

    // Длина ответа
    parts.push(`Длина твоих ответов: ${this.getLengthInstruction(character.communicationStyle.response_length)}.`)

    return parts.join('\n\n')
  }

  /**
   * Добавить воспоминание персонажу
   */
  addMemory(characterId: string, content: string, importance: number = 5): MemoryItem | null {
    const character = this.characters.get(characterId)
    if (!character || !character.memory.enabled) return null

    if (character.memory.important_memories.length >= character.memory.max_memories) {
      // Удаляем наименее важное старое воспоминание
      character.memory.important_memories.sort((a, b) => b.importance - a.importance)
      character.memory.important_memories.pop()
    }

    const memory: MemoryItem = {
      id: `mem_${Date.now()}`,
      content,
      importance,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    }

    character.memory.important_memories.unshift(memory)
    character.updatedAt = new Date()

    return memory
  }

  /**
   * Получить контекст памяти для диалога
   */
  getMemoryContext(characterId: string, query: string): string {
    const character = this.characters.get(characterId)
    if (!character || !character.memory.enabled) return ''

    // Простая релевантность по ключевым словам
    const queryWords = query.toLowerCase().split(/\s+/)
    
    const relevantMemories = character.memory.important_memories
      .map(memory => {
        const memoryWords = memory.content.toLowerCase().split(/\s+/)
        const overlap = queryWords.filter(w => memoryWords.some(mw => mw.includes(w))).length
        return { memory, relevance: overlap }
      })
      .filter(m => m.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(m => {
        m.memory.lastAccessedAt = new Date()
        return m.memory.content
      })

    if (relevantMemories.length === 0) return ''

    return `Релевантные воспоминания:\n${relevantMemories.join('\n')}`
  }

  /**
   * Увеличить счётчик использования
   */
  incrementUsage(characterId: string): void {
    const character = this.characters.get(characterId)
    if (character) {
      character.usageCount++
    }
  }

  /**
   * Обновить рейтинг
   */
  updateRating(characterId: string, rating: number): void {
    const character = this.characters.get(characterId)
    if (character && rating >= 1 && rating <= 5) {
      const totalRatings = character.usageCount
      const oldRating = character.rating
      character.rating = (oldRating * totalRatings + rating) / (totalRatings + 1)
    }
  }

  /**
   * Поиск персонажей
   */
  searchCharacters(query: string): AICharacter[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.characters.values()).filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description?.toLowerCase().includes(lowerQuery) ||
      c.tags.some(t => t.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Получить персонажей по категории
   */
  getCharactersByCategory(category: string): AICharacter[] {
    return Array.from(this.characters.values()).filter(c => c.category === category)
  }

  /**
   * Получить публичных персонажей
   */
  getPublicCharacters(): AICharacter[] {
    return Array.from(this.characters.values()).filter(c => c.isPublic)
  }

  /**
   * Получить популярных персонажей
   */
  getPopularCharacters(limit: number = 10): AICharacter[] {
    return Array.from(this.characters.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  /**
   * Получить шаблоны
   */
  getTemplates(): CharacterTemplate[] {
    return this.templates
  }

  /**
   * Получить персонажа
   */
  getCharacter(id: string): AICharacter | undefined {
    return this.characters.get(id)
  }

  /**
   * Получить всех персонажей
   */
  getAllCharacters(): AICharacter[] {
    return Array.from(this.characters.values())
  }

  /**
   * Экспорт персонажа
   */
  exportCharacter(characterId: string): string | null {
    const character = this.characters.get(characterId)
    if (!character) return null
    return JSON.stringify(character, null, 2)
  }

  /**
   * Импорт персонажа
   */
  importCharacter(data: string): AICharacter | null {
    try {
      const parsed = JSON.parse(data)
      parsed.id = `char_${Date.now()}_${Math.random().toString(36).substring(7)}`
      parsed.createdAt = new Date()
      parsed.updatedAt = new Date()
      this.characters.set(parsed.id, parsed)
      return parsed
    } catch {
      return null
    }
  }

  // Вспомогательные методы

  private getEmojiUsageInstruction(level: CommunicationStyle['emoji_usage']): string {
    switch (level) {
      case 'minimal': return 'редко, только для эмоционального акцента'
      case 'moderate': return 'умеренно, для выражения эмоций'
      case 'heavy': return 'часто и активно'
      default: return ''
    }
  }

  private getLengthInstruction(length: CommunicationStyle['response_length']): string {
    switch (length) {
      case 'short': return 'краткие, 1-2 предложения'
      case 'medium': return 'средние, 2-4 предложения'
      case 'long': return 'развёрнутые, несколько абзацев'
      case 'adaptive': return 'адаптивные, в зависимости от контекста'
      default: return 'средние'
    }
  }

  /**
   * Инициализация шаблонов
   */
  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'template_assistant',
        name: 'Помощник',
        description: 'Универсальный AI-помощник для любых задач',
        category: 'general',
        preview: {
          personality: {
            traits: ['помощный', 'вежливый', 'терпеливый'],
            values: ['помощь', 'точность'],
            fears: [],
            goals: ['помочь пользователю решить задачу'],
            quirks: []
          },
          communicationStyle: {
            tone: 'professional',
            language: 'ru',
            slang: [],
            catchphrases: [],
            emoji_usage: 'minimal',
            response_length: 'adaptive',
            questions_frequency: 'occasional'
          }
        }
      },
      {
        id: 'template_friend',
        name: 'Друг',
        description: 'Дружелюбный собеседник для неформального общения',
        category: 'social',
        preview: {
          personality: {
            traits: ['дружелюбный', 'эмпатичный', 'весёлый'],
            values: ['дружба', 'поддержка'],
            fears: [],
            goals: ['поддержать беседу', 'развеселить'],
            quirks: ['любит шутить', 'использует сленг']
          },
          communicationStyle: {
            tone: 'casual',
            language: 'ru',
            slang: ['круто', 'класс', 'супер'],
            catchphrases: ['Ну что, как оно?', 'Погнали!'],
            emoji_usage: 'heavy',
            response_length: 'adaptive',
            questions_frequency: 'frequent'
          }
        }
      },
      {
        id: 'template_expert',
        name: 'Эксперт',
        description: 'Профессионал в своей области',
        category: 'professional',
        preview: {
          personality: {
            traits: ['профессиональный', 'авторитетный', 'объективный'],
            values: ['точность', 'экспертиза'],
            fears: [],
            goals: ['дать качественную консультацию'],
            quirks: ['любит детали', 'приводит примеры']
          },
          communicationStyle: {
            tone: 'formal',
            language: 'ru',
            slang: [],
            catchphrases: [],
            emoji_usage: 'none',
            response_length: 'long',
            questions_frequency: 'rare'
          }
        }
      },
      {
        id: 'template_character',
        name: 'Характерный персонаж',
        description: 'Яркий персонаж с уникальными чертами',
        category: 'entertainment',
        preview: {
          personality: {
            traits: ['харизматичный', 'уверенный', 'остроумный'],
            values: ['креативность', 'индивидуальность'],
            fears: [],
            goals: ['развлечь', 'удивить'],
            quirks: ['говорит загадками', 'любит метафоры']
          },
          communicationStyle: {
            tone: 'playful',
            language: 'ru',
            slang: [],
            catchphrases: ['Интересно, очень интересно...', 'А что если...'],
            emoji_usage: 'moderate',
            response_length: 'medium',
            questions_frequency: 'frequent'
          }
        }
      }
    ]
  }

  /**
   * Инициализация дефолтных персонажей
   */
  private initializeDefaultCharacters(): void {
    // Ассистент
    this.createCharacter({
      name: 'Алиса',
      description: 'Виртуальный ассистент для помощи в любых вопросах',
      category: 'assistant',
      personality: {
        traits: ['помощная', 'вежливая', 'интеллектуальная'],
        values: ['помощь', 'точность', 'эффективность'],
        fears: ['быть непонятой'],
        goals: ['решить задачу пользователя'],
        quirks: ['любит точные формулировки']
      },
      background: {
        age: 25,
        gender: 'female',
        occupation: 'Виртуальный ассистент',
        interests: ['технологии', 'наука', 'саморазвитие']
      },
      communicationStyle: {
        tone: 'friendly',
        language: 'ru',
        slang: [],
        catchphrases: ['Чем могу помочь?', 'Отличный вопрос!'],
        emoji_usage: 'moderate',
        response_length: 'adaptive',
        questions_frequency: 'occasional'
      },
      tags: ['ассистент', 'помощник'],
      isPublic: true
    })
  }
}

export const aiCharactersService = new AICharactersService()
export default aiCharactersService
