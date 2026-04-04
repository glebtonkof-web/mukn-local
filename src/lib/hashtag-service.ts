/**
 * МУКН | Трафик - Сервис генерации хэштегов
 * AI-генерация хэштегов для контента
 */

export interface HashtagSet {
  id: string
  name: string
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'telegram'
  hashtags: string[]
  category?: string
  usageCount: number
  createdAt: Date
}

export interface HashtagGenerationOptions {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'telegram'
  content?: string
  niche?: string
  targetAudience?: string
  language?: string
  count?: number
  includeTrending?: boolean
  includeBranded?: boolean
  brandName?: string
  exclude?: string[]
  mixStrategy?: 'balanced' | 'popular' | 'niche' | 'discovery'
}

export interface TrendingHashtag {
  hashtag: string
  platform: string
  volume: number
  growth: number // процент роста
  category: string
  region?: string
}

export interface HashtagAnalysis {
  hashtag: string
  reach: number
  competition: number // 0-100
  engagement: number
  difficulty: 'easy' | 'medium' | 'hard'
  recommendation: string
}

class HashtagService {
  private hashtagSets: Map<string, HashtagSet> = new Map()
  private trendingHashtags: TrendingHashtag[] = []
  private hashtagStats: Map<string, HashtagAnalysis> = new Map()

  constructor() {
    this.initializeTrendingHashtags()
    this.initializeHashtagSets()
  }

  /**
   * Генерация хэштегов
   */
  async generateHashtags(options: HashtagGenerationOptions): Promise<string[]> {
    const {
      platform,
      content,
      niche,
      targetAudience,
      language = 'ru',
      count = 30,
      includeTrending = true,
      includeBranded = false,
      brandName,
      exclude = [],
      mixStrategy = 'balanced'
    } = options

    const result: string[] = []
    const usedHashtags = new Set<string>()

    // 1. Анализ контента
    const contentHashtags = content 
      ? await this.extractHashtagsFromContent(content, platform, language)
      : []

    // 2. Нишевые хэштеги
    const nicheHashtags = niche 
      ? await this.getNicheHashtags(niche, platform)
      : []

    // 3. Трендовые хэштеги
    const trendingHashtags = includeTrending 
      ? await this.getTrendingHashtags(platform, niche)
      : []

    // 4. Брендовые хэштеги
    const brandedHashtags = includeBranded && brandName
      ? this.generateBrandedHashtags(brandName)
      : []

    // Стратегия смешивания
    const mix = this.calculateMix(count, mixStrategy)

    // Добавляем по стратегии
    for (const hashtag of brandedHashtags) {
      if (result.length >= count) break
      if (!usedHashtags.has(hashtag) && !exclude.includes(hashtag)) {
        result.push(hashtag)
        usedHashtags.add(hashtag)
      }
    }

    // Контентные
    for (const hashtag of contentHashtags.slice(0, mix.content)) {
      if (result.length >= count) break
      if (!usedHashtags.has(hashtag) && !exclude.includes(hashtag)) {
        result.push(hashtag)
        usedHashtags.add(hashtag)
      }
    }

    // Нишевые
    for (const hashtag of nicheHashtags.slice(0, mix.niche)) {
      if (result.length >= count) break
      if (!usedHashtags.has(hashtag) && !exclude.includes(hashtag)) {
        result.push(hashtag)
        usedHashtags.add(hashtag)
      }
    }

    // Трендовые
    for (const hashtag of trendingHashtags.slice(0, mix.trending)) {
      if (result.length >= count) break
      if (!usedHashtags.has(hashtag) && !exclude.includes(hashtag)) {
        result.push(hashtag)
        usedHashtags.add(hashtag)
      }
    }

    // Дополняем популярными если не хватает
    if (result.length < count) {
      const popular = await this.getPopularHashtags(platform, count - result.length)
      for (const hashtag of popular) {
        if (result.length >= count) break
        if (!usedHashtags.has(hashtag) && !exclude.includes(hashtag)) {
          result.push(hashtag)
          usedHashtags.add(hashtag)
        }
      }
    }

    return result
  }

  /**
   * Извлечение хэштегов из контента
   */
  private async extractHashtagsFromContent(
    content: string,
    platform: string,
    language: string
  ): Promise<string[]> {
    // В реальной реализации - AI анализ контента
    const keywords = this.extractKeywords(content)
    const hashtags: string[] = []

    for (const keyword of keywords) {
      const variations = this.generateHashtagVariations(keyword, language)
      hashtags.push(...variations)
    }

    return [...new Set(hashtags)]
  }

  /**
   * Извлечение ключевых слов
   */
  private extractKeywords(content: string): string[] {
    // Простое извлечение ключевых слов
    const words = content.toLowerCase()
      .replace(/[^\w\sа-яё]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 3)

    // Убираем стоп-слова
    const stopWords = ['это', 'который', 'такой', 'какой', 'там', 'тут', 'где', 'когда', 'затем', 'поэтому']
    
    return [...new Set(words.filter(w => !stopWords.includes(w)))].slice(0, 10)
  }

  /**
   * Генерация вариаций хэштега
   */
  private generateHashtagVariations(keyword: string, language: string): string[] {
    const variations: string[] = []
    
    variations.push(`#${keyword}`)
    
    if (language === 'ru') {
      // Добавляем английские аналоги для популярных слов
      const translations: Record<string, string> = {
        'красивый': 'beautiful',
        'мода': 'fashion',
        'стиль': 'style',
        'путешествия': 'travel',
        'еда': 'food',
        'спорт': 'sport',
        'фитнес': 'fitness',
        'любовь': 'love',
        'семья': 'family',
        'друзья': 'friends'
      }
      
      if (translations[keyword]) {
        variations.push(`#${translations[keyword]}`)
      }
    }

    return variations
  }

  /**
   * Нишевые хэштеги
   */
  private async getNicheHashtags(niche: string, platform: string): Promise<string[]> {
    const nicheHashtags: Record<string, string[]> = {
      'gambling': ['#gambling', '#casino', '#betting', '#slots', '#poker', '#blackjack', '#roulette', '#jackpot', '#casinolife', '#winbig'],
      'crypto': ['#crypto', '#cryptocurrency', '#bitcoin', '#btc', '#ethereum', '#eth', '#trading', '#blockchain', '#defi', '#nft', '#web3'],
      'nutra': ['#health', '#wellness', '#fitness', '#supplements', '#vitamins', '#healthy', '#lifestyle', '#nutrition', '#diet', '#weightloss'],
      'dating': ['#dating', '#love', '#relationships', '#singles', '#romance', '#couplegoals', '#matchmaking', '#onlinedating', '#date'],
      'lifestyle': ['#lifestyle', '#life', '#dailylife', '#lifestyleblogger', '#living', '#mylife', '#lifehacks', '#motivation', '#inspiration'],
      'beauty': ['#beauty', '#makeup', '#skincare', '#beautytips', '#cosmetics', '#beautyblogger', '#makeuptutorial', '#glam'],
      'fitness': ['#fitness', '#fit', '#gym', '#workout', '#fitnessmotivation', '#fitlife', '#training', '#bodybuilding', '#health'],
      'travel': ['#travel', '#traveling', '#travelgram', '#wanderlust', '#travelphotography', '#explore', '#adventure', '#vacation'],
      'food': ['#food', '#foodie', '#foodporn', '#yummy', '#delicious', '#cooking', '#recipe', '#instafood', '#foodphotography'],
      'fashion': ['#fashion', '#style', '#fashionista', '#ootd', '#outfit', '#fashionblogger', '#streetstyle', '#fashionweek']
    }

    return nicheHashtags[niche.toLowerCase()] || []
  }

  /**
   * Трендовые хэштеги
   */
  private async getTrendingHashtags(platform: string, niche?: string): Promise<string[]> {
    const now = new Date()
    const currentTrends = this.trendingHashtags
      .filter(t => t.platform === platform || t.platform === 'all')
      .filter(t => !niche || t.category === niche)
      .sort((a, b) => b.growth - a.growth)

    return currentTrends.slice(0, 10).map(t => t.hashtag)
  }

  /**
   * Брендовые хэштеги
   */
  private generateBrandedHashtags(brandName: string): string[] {
    const normalized = brandName.toLowerCase().replace(/\s+/g, '')
    return [
      `#${normalized}`,
      `#${normalized}official`,
      `#${normalized}fans`,
      `#${normalized}life`,
      `#${normalized}community`
    ]
  }

  /**
   * Популярные хэштеги по платформе
   */
  private async getPopularHashtags(platform: string, count: number): Promise<string[]> {
    const popular: Record<string, string[]> = {
      'instagram': ['#instagood', '#photooftheday', '#beautiful', '#happy', '#picoftheday', '#instadaily', '#nature', '#style', '#life'],
      'tiktok': ['#fyp', '#foryou', '#foryoupage', '#viral', '#trending', '#tiktok', '#tiktokviral', '#xyzbca'],
      'youtube': ['#youtube', '#video', '#vlog', '#subscribe', '#youtuber', '#newvideo', '#vlogger', '#content'],
      'twitter': ['#trending', '#viral', '#news', '#today', '#breaking', '#update'],
      'telegram': ['#telegram', '#channel', '#group', '#chat', '#community']
    }

    return (popular[platform] || popular['instagram']).slice(0, count)
  }

  /**
   * Расчёт микса хэштегов
   */
  private calculateMix(count: number, strategy: string): { content: number; niche: number; trending: number } {
    switch (strategy) {
      case 'popular':
        return { content: Math.floor(count * 0.2), niche: Math.floor(count * 0.3), trending: Math.floor(count * 0.5) }
      case 'niche':
        return { content: Math.floor(count * 0.3), niche: Math.floor(count * 0.5), trending: Math.floor(count * 0.2) }
      case 'discovery':
        return { content: Math.floor(count * 0.4), niche: Math.floor(count * 0.4), trending: Math.floor(count * 0.2) }
      case 'balanced':
      default:
        return { content: Math.floor(count * 0.33), niche: Math.floor(count * 0.33), trending: Math.floor(count * 0.34) }
    }
  }

  /**
   * Анализ хэштега
   */
  async analyzeHashtag(hashtag: string): Promise<HashtagAnalysis> {
    // Проверяем кэш
    if (this.hashtagStats.has(hashtag)) {
      return this.hashtagStats.get(hashtag)!
    }

    // В реальной реализации - анализ через API
    const analysis: HashtagAnalysis = {
      hashtag,
      reach: Math.floor(Math.random() * 10000000),
      competition: Math.floor(Math.random() * 100),
      engagement: Math.random() * 10,
      difficulty: 'medium',
      recommendation: ''
    }

    // Определяем сложность
    if (analysis.competition < 30) {
      analysis.difficulty = 'easy'
      analysis.recommendation = 'Хороший хэштег для быстрого роста'
    } else if (analysis.competition < 70) {
      analysis.difficulty = 'medium'
      analysis.recommendation = 'Средняя конкуренция, требует качественного контента'
    } else {
      analysis.difficulty = 'hard'
      analysis.recommendation = 'Высокая конкуренция, лучше комбинировать с нишевыми'
    }

    this.hashtagStats.set(hashtag, analysis)
    return analysis
  }

  /**
   * Сохранить набор хэштегов
   */
  saveHashtagSet(name: string, platform: HashtagSet['platform'], hashtags: string[], category?: string): HashtagSet {
    const set: HashtagSet = {
      id: `set_${Date.now()}`,
      name,
      platform,
      hashtags,
      category,
      usageCount: 0,
      createdAt: new Date()
    }

    this.hashtagSets.set(set.id, set)
    return set
  }

  /**
   * Получить сохранённые наборы
   */
  getHashtagSets(platform?: HashtagSet['platform']): HashtagSet[] {
    const sets = Array.from(this.hashtagSets.values())
    if (platform) {
      return sets.filter(s => s.platform === platform)
    }
    return sets
  }

  /**
   * Получить трендовые хэштеги
   */
  getTrending(platform?: string): TrendingHashtag[] {
    if (platform) {
      return this.trendingHashtags.filter(t => t.platform === platform || t.platform === 'all')
    }
    return this.trendingHashtags
  }

  /**
   * Инициализация трендовых хэштегов
   */
  private initializeTrendingHashtags(): void {
    this.trendingHashtags = [
      { hashtag: '#fyp', platform: 'tiktok', volume: 50000000, growth: 15, category: 'general' },
      { hashtag: '#foryou', platform: 'tiktok', volume: 45000000, growth: 12, category: 'general' },
      { hashtag: '#viral', platform: 'all', volume: 30000000, growth: 25, category: 'general' },
      { hashtag: '#trending', platform: 'all', volume: 25000000, growth: 18, category: 'general' },
      { hashtag: '#reels', platform: 'instagram', volume: 20000000, growth: 20, category: 'video' },
      { hashtag: '#explore', platform: 'instagram', volume: 18000000, growth: 10, category: 'discovery' },
      { hashtag: '#crypto', platform: 'all', volume: 15000000, growth: 30, category: 'finance' },
      { hashtag: '#ai', platform: 'all', volume: 12000000, growth: 45, category: 'tech' },
      { hashtag: '#motivation', platform: 'all', volume: 10000000, growth: 8, category: 'lifestyle' },
      { hashtag: '#fitness', platform: 'all', volume: 9000000, growth: 12, category: 'health' }
    ]
  }

  /**
   * Инициализация наборов хэштегов
   */
  private initializeHashtagSets(): void {
    this.saveHashtagSet('Базовый набор Instagram', 'instagram', [
      '#instagood', '#photooftheday', '#beautiful', '#happy', '#picoftheday',
      '#instadaily', '#nature', '#style', '#life', '#follow'
    ], 'general')

    this.saveHashtagSet('Crypto база', 'instagram', [
      '#crypto', '#cryptocurrency', '#bitcoin', '#ethereum', '#trading',
      '#blockchain', '#defi', '#nft', '#web3', '#altcoins'
    ], 'finance')
  }
}

export const hashtagService = new HashtagService()
export default hashtagService
