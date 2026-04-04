/**
 * МУКН | Трафик - Генератор гемблинг-креативов
 * Генерация видео-креативов под бренды казино на основе stream.win
 */

// Конфигурация казино встроена в код
const CASINOS_DATA: Record<string, any> = {
  catcasino: {
    name: "Cat Casino",
    logo_path: "/logos/catcasino.png",
    primary_color: "#FF8C00",
    secondary_color: "#1A1A2E",
    cta_text_default: "ЗАБРАТЬ БОНУС",
    cta_by_geo: {
      RU: "ЗАБРАТЬ 500%",
      KZ: "БОНУС 100 000 KZT",
      BR: "GIRAR BÔNUS",
      DE: "BONUS HOLEN",
      UA: "ЗАБРАТИ 500%",
      BY: "ЗАБРАЦЬ 500%"
    },
    bonus_text: {
      RU: "Бездепозитный бонус 500FS",
      KZ: "Тегін бонус 500FS",
      BR: "Bônus sem depósito 500FS",
      DE: "Keine Einzahlung 500FS",
      UA: "Бездепозитний бонус 500FS",
      BY: "Бясплатны бонус 500FS"
    },
    offer_link: "https://catcasino.com/promo/stream",
    allowed_games: ["gates-of-olympus-1000", "sugar-rush-1000", "plinko", "sweet-bonanza", "book-of-dead", "starburst", "big-bass-bonanza"],
    allowed_geo: ["RU", "KZ", "BR", "DE", "UA", "BY"],
    prohibited_elements: ["депозит", "кредит", "займ", "гарантия"],
    required_elements: ["🐱", "кошачий стиль"],
    style: { theme: "bright_orange", emoji: "🐱", font: "bold", animation: "pulse" }
  },
  frank: {
    name: "Frank Casino",
    logo_path: "/logos/frank.png",
    primary_color: "#000000",
    secondary_color: "#FFD700",
    cta_text_default: "ИГРАТЬ БЕСПЛАТНО",
    cta_by_geo: { PL: "GRAJ ZA DARMO", CZ: "HRÁT ZDARMA", RU: "ИГРАТЬ БЕСПЛАТНО", DE: "KOSTENLOS SPIELEN" },
    bonus_text: { PL: "20€ bez depozytu", CZ: "20€ bez vkladu", RU: "20€ без депозита", DE: "20€ ohne Einzahlung" },
    offer_link: "https://frank.com/free-spins",
    allowed_games: ["aviamasters-2", "chicken-road-2", "mine-slot-2", "razor-shark", "fire-joker"],
    allowed_geo: ["PL", "CZ", "RU", "DE"],
    prohibited_elements: ["бомж", "халява", "лох", "кредит"],
    required_elements: ["латиница для PL/CZ"],
    style: { theme: "black_gold", emoji: null, font: "elegant", animation: "fade" }
  },
  volna: {
    name: "Volna Casino",
    logo_path: "/logos/volna.png",
    primary_color: "#0077BE",
    secondary_color: "#00CED1",
    cta_text_default: "ПОПРОБОВАТЬ",
    cta_by_geo: { RU: "ПОПРОБОВАТЬ", UA: "СПРОБУВАТИ", KZ: "СЫНАП КӨР", BY: "ПАСПРАБАВАЦЬ" },
    bonus_text: { RU: "Волна удачи 300FS", UA: "Хвиля удачі 300FS", KZ: "Сәт толқыны 300FS", BY: "Хваля поспеху 300FS" },
    offer_link: "https://volna.com/wave-bonus",
    allowed_games: ["gates-of-olympus", "poseidon-fortunes", "atlantis-megaways", "ocean-treasure", "mermaid-millions"],
    allowed_geo: ["RU", "UA", "KZ", "BY"],
    prohibited_elements: ["нарик", "алко", "развод", "наркотик"],
    required_elements: ["морская тематика", "волны"],
    style: { theme: "ocean_blue", emoji: "🌊", font: "modern", animation: "wave" }
  },
  dragon: {
    name: "Dragon Money",
    logo_path: "/logos/dragon.png",
    primary_color: "#8B0000",
    secondary_color: "#FFD700",
    cta_text_default: "ЗАЖЕЧЬ ДРАКОНА",
    cta_by_geo: { RU: "ЗАЖЕЧЬ ДРАКОНА", KZ: "АЖДАРҒА ҰРЫС", UA: "ЗАПАЛИТИ ДРАКОНА", BR: "ACENDA O DRAGÃO" },
    bonus_text: { RU: "Огненный бонус 777FS", KZ: "Отты бонус 777FS", UA: "Вогняний бонус 777FS", BR: "Bônus de fogo 777FS" },
    offer_link: "https://dragon.money/fire",
    allowed_games: ["dragon-kingdom", "dragon-empire", "fire-dragon", "golden-dragon", "dragon-hatch"],
    allowed_geo: ["RU", "KZ", "UA", "BR"],
    prohibited_elements: ["наркотик", "алко", "нарик"],
    required_elements: ["🐉", "дракон", "огонь"],
    style: { theme: "fire_red", emoji: "🐉", font: "bold", animation: "fire" }
  },
  fastpay: {
    name: "Fastpay Casino",
    logo_path: "/logos/fastpay.png",
    primary_color: "#00FF00",
    secondary_color: "#1C1C1C",
    cta_text_default: "БЫСТРЫЙ СТАРТ",
    cta_by_geo: { RU: "БЫСТРЫЙ СТАРТ", UA: "ШВИДКИЙ СТАРТ", KZ: "ЖЫЛДАМ БАСТАУ", DE: "SCHNELLER START" },
    bonus_text: { RU: "Моментальный вывод", UA: "Миттєвий вивід", KZ: "Лезде шығару", DE: "Sofortige Auszahlung" },
    offer_link: "https://fastpay.com/quick",
    allowed_games: ["cash-choppers", "money-train", "quick-spin", "turbo-games", "speedy-gonzales"],
    allowed_geo: ["RU", "UA", "KZ", "DE"],
    prohibited_elements: ["медленно", "ожидание", "очередь"],
    required_elements: ["⚡", "скорость"],
    style: { theme: "neon_green", emoji: "⚡", font: "modern", animation: "flash" }
  },
  rox: {
    name: "ROX Casino",
    logo_path: "/logos/rox.png",
    primary_color: "#9400D3",
    secondary_color: "#FF1493",
    cta_text_default: "В РОКС",
    cta_by_geo: { RU: "В РОКС", UA: "В РОКС", KZ: "РОКСҚА", BY: "У РОКС" },
    bonus_text: { RU: "ROX бонус 100%", UA: "ROX бонус 100%", KZ: "ROX бонус 100%", BY: "ROX бонус 100%" },
    offer_link: "https://rox.com/welcome",
    allowed_games: ["rock-n-roll", "vip-blackjack", "elite-roulette", "premium-slots", "luxury-life"],
    allowed_geo: ["RU", "UA", "KZ", "BY"],
    prohibited_elements: ["дёшево", "бесплатно", "халява"],
    required_elements: ["💎", "премиум"],
    style: { theme: "purple_gold", emoji: "💎", font: "elegant", animation: "glow" }
  }
}

export interface CasinoConfig {
  name: string
  logo_path: string
  primary_color: string
  secondary_color: string
  cta_text_default: string
  cta_by_geo: Record<string, string>
  bonus_text: Record<string, string>
  offer_link: string
  allowed_games: string[]
  allowed_geo: string[]
  prohibited_elements: string[]
  required_elements: string[]
  style: {
    theme: string
    emoji: string | null
    font: string
    animation: string
  }
}

export interface CreativeRequest {
  casino_id: string
  geo?: string
  game_slug?: string
  duration?: number
  output_format?: 'mp4' | 'gif' | 'both'
}

export interface CreativeResult {
  id: string
  casino_id: string
  casino_name: string
  game_slug: string
  geo: string
  duration: number
  mp4_path?: string
  gif_path?: string
  thumbnail_path?: string
  cta_text: string
  bonus_text: string
  offer_link: string
  created_at: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

export interface GameInfo {
  slug: string
  name: string
  provider: string
  category: string
  thumbnail?: string
  stream_win_url: string
}

export interface GenerationProgress {
  step: string
  progress: number
  message: string
  timestamp: Date
}

class CreativeGeneratorService {
  private casinos: Map<string, CasinoConfig> = new Map()
  private generatedCreatives: Map<string, CreativeResult> = new Map()
  private games: Map<string, GameInfo> = new Map()
  private progressCallbacks: Map<string, (progress: GenerationProgress) => void> = new Map()

  constructor() {
    this.loadCasinos()
    this.loadGames()
  }

  /**
   * Загрузка конфигурации казино
   */
  private loadCasinos(): void {
    for (const [id, config] of Object.entries(CASINOS_DATA)) {
      this.casinos.set(id, config as CasinoConfig)
    }
  }

  /**
   * Загрузка списка игр с stream.win
   */
  private loadGames(): void {
    // Популярные игры для демо-режима
    const popularGames: GameInfo[] = [
      { slug: 'gates-of-olympus-1000', name: 'Gates of Olympus 1000', provider: 'Pragmatic Play', category: 'slots', stream_win_url: 'https://stream.win/game/gates-of-olympus-1000' },
      { slug: 'sugar-rush-1000', name: 'Sugar Rush 1000', provider: 'Pragmatic Play', category: 'slots', stream_win_url: 'https://stream.win/game/sugar-rush-1000' },
      { slug: 'sweet-bonanza', name: 'Sweet Bonanza', provider: 'Pragmatic Play', category: 'slots', stream_win_url: 'https://stream.win/game/sweet-bonanza' },
      { slug: 'book-of-dead', name: 'Book of Dead', provider: "Play'n GO", category: 'slots', stream_win_url: 'https://stream.win/game/book-of-dead' },
      { slug: 'starburst', name: 'Starburst', provider: 'NetEnt', category: 'slots', stream_win_url: 'https://stream.win/game/starburst' },
      { slug: 'big-bass-bonanza', name: 'Big Bass Bonanza', provider: 'Pragmatic Play', category: 'slots', stream_win_url: 'https://stream.win/game/big-bass-bonanza' },
      { slug: 'plinko', name: 'Plinko', provider: 'Spribe', category: 'arcade', stream_win_url: 'https://stream.win/game/plinko' },
      { slug: 'aviamasters-2', name: 'Aviamasters 2', provider: 'Aviatrix', category: 'crash', stream_win_url: 'https://stream.win/game/aviamasters-2' },
      { slug: 'chicken-road-2', name: 'Chicken Road 2', provider: 'Inout Games', category: 'arcade', stream_win_url: 'https://stream.win/game/chicken-road-2' },
      { slug: 'dragon-kingdom', name: 'Dragon Kingdom', provider: 'Pragmatic Play', category: 'slots', stream_win_url: 'https://stream.win/game/dragon-kingdom' },
      { slug: 'razor-shark', name: 'Razor Shark', provider: 'Push Gaming', category: 'slots', stream_win_url: 'https://stream.win/game/razor-shark' },
      { slug: 'fire-joker', name: 'Fire Joker', provider: "Play'n GO", category: 'slots', stream_win_url: 'https://stream.win/game/fire-joker' },
      { slug: 'poseidon-fortunes', name: 'Poseidon Fortunes', provider: 'Mancala', category: 'slots', stream_win_url: 'https://stream.win/game/poseidon-fortunes' },
      { slug: 'atlantis-megaways', name: 'Atlantis Megaways', provider: 'Red Tiger', category: 'slots', stream_win_url: 'https://stream.win/game/atlantis-megaways' },
      { slug: 'money-train', name: 'Money Train', provider: 'Relax Gaming', category: 'slots', stream_win_url: 'https://stream.win/game/money-train' }
    ]

    for (const game of popularGames) {
      this.games.set(game.slug, game)
    }
  }

  /**
   * Получить список казино
   */
  getCasinos(): Array<{ id: string; name: string; geo: string[] }> {
    return Array.from(this.casinos.entries()).map(([id, config]) => ({
      id,
      name: config.name,
      geo: config.allowed_geo
    }))
  }

  /**
   * Получить конфигурацию казино
   */
  getCasino(casinoId: string): CasinoConfig | undefined {
    return this.casinos.get(casinoId)
  }

  /**
   * Получить список игр для казино
   */
  getGamesForCasino(casinoId: string): GameInfo[] {
    const casino = this.casinos.get(casinoId)
    if (!casino) return []

    if (casino.allowed_games.length > 0) {
      return casino.allowed_games
        .map(slug => this.games.get(slug))
        .filter((g): g is GameInfo => g !== undefined)
    }

    // Если нет ограничений - возвращаем все игры
    return Array.from(this.games.values())
  }

  /**
   * Получить все игры
   */
  getAllGames(): GameInfo[] {
    return Array.from(this.games.values())
  }

  /**
   * Генерация одного креатива
   */
  async generateCreative(
    request: CreativeRequest,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<CreativeResult> {
    const { casino_id, geo, game_slug, duration = 15, output_format = 'mp4' } = request

    // Создаём запись о креативе
    const creativeId = `creative_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const creative: CreativeResult = {
      id: creativeId,
      casino_id,
      casino_name: '',
      game_slug: '',
      geo: '',
      duration,
      cta_text: '',
      bonus_text: '',
      offer_link: '',
      created_at: new Date(),
      status: 'pending'
    }

    this.generatedCreatives.set(creativeId, creative)

    if (onProgress) {
      this.progressCallbacks.set(creativeId, onProgress)
    }

    try {
      // Шаг 1: Проверка и загрузка конфигурации казино
      this.reportProgress(creativeId, 'validation', 5, 'Проверка параметров казино')
      const casino = this.casinos.get(casino_id)
      if (!casino) {
        throw new Error(`Casino "${casino_id}" not found in configuration`)
      }
      creative.casino_name = casino.name

      // Шаг 2: Определение гео
      this.reportProgress(creativeId, 'geo_selection', 10, 'Определение гео')
      const selectedGeo = geo || this.selectRandomGeo(casino)
      if (!casino.allowed_geo.includes(selectedGeo)) {
        throw new Error(`Geo "${selectedGeo}" is not allowed for casino "${casino_id}"`)
      }
      creative.geo = selectedGeo

      // Шаг 3: Выбор игры
      this.reportProgress(creativeId, 'game_selection', 15, 'Выбор игры')
      const selectedGame = game_slug || this.selectRandomGame(casino)
      const gameInfo = this.games.get(selectedGame)
      if (!gameInfo && casino.allowed_games.length > 0) {
        throw new Error(`Game "${selectedGame}" is not in allowed games for casino "${casino_id}"`)
      }
      creative.game_slug = selectedGame

      // Шаг 4: Формирование текстов
      this.reportProgress(creativeId, 'text_generation', 20, 'Формирование текстов')
      creative.cta_text = this.getCtaText(casino, selectedGeo)
      creative.bonus_text = this.getBonusText(casino, selectedGeo)
      creative.offer_link = casino.offer_link

      // Шаг 5: Проверка запрещённых элементов
      this.reportProgress(creativeId, 'content_validation', 25, 'Проверка контента')
      this.validateContent(creative, casino)

      // Шаг 6: Запись демо-геймплея (симуляция)
      this.reportProgress(creativeId, 'gameplay_recording', 30, 'Запись демо-геймплея')
      const gameplayVideo = await this.recordGameplay(creativeId, selectedGame, duration)

      // Шаг 7: Наложение брендинга
      this.reportProgress(creativeId, 'branding', 50, 'Наложение брендинга')
      const brandedVideo = await this.applyBranding(creativeId, gameplayVideo, casino, creative)

      // Шаг 8: Добавление аудио
      this.reportProgress(creativeId, 'audio', 70, 'Добавление аудио')
      const finalVideo = await this.addAudio(creativeId, brandedVideo)

      // Шаг 9: Экспорт
      this.reportProgress(creativeId, 'export', 85, 'Экспорт видео')
      const exportResult = await this.exportVideo(creativeId, finalVideo, output_format)

      // Финализация
      this.reportProgress(creativeId, 'finalization', 100, 'Креатив готов')
      creative.mp4_path = exportResult.mp4_path
      creative.gif_path = exportResult.gif_path
      creative.thumbnail_path = exportResult.thumbnail_path
      creative.status = 'completed'

    } catch (error: any) {
      creative.status = 'failed'
      creative.error = error.message
      this.reportProgress(creativeId, 'error', 0, `Ошибка: ${error.message}`)
    }

    return creative
  }

  /**
   * Генерация пачки креативов
   */
  async generateBatch(
    request: CreativeRequest & { count: number },
    onProgress?: (creativeIndex: number, total: number, creative: CreativeResult) => void
  ): Promise<CreativeResult[]> {
    const { count, ...singleRequest } = request
    const results: CreativeResult[] = []

    for (let i = 0; i < count; i++) {
      const creative = await this.generateCreative(singleRequest)
      results.push(creative)
      
      if (onProgress) {
        onProgress(i + 1, count, creative)
      }
    }

    return results
  }

  /**
   * Выбор случайного гео
   */
  private selectRandomGeo(casino: CasinoConfig): string {
    const geoList = casino.allowed_geo
    return geoList[Math.floor(Math.random() * geoList.length)]
  }

  /**
   * Выбор случайной игры
   */
  private selectRandomGame(casino: CasinoConfig): string {
    const games = casino.allowed_games.length > 0 
      ? casino.allowed_games 
      : Array.from(this.games.keys())
    
    return games[Math.floor(Math.random() * games.length)]
  }

  /**
   * Получение CTA текста для гео
   */
  private getCtaText(casino: CasinoConfig, geo: string): string {
    return casino.cta_by_geo[geo] || casino.cta_text_default
  }

  /**
   * Получение бонус текста для гео
   */
  private getBonusText(casino: CasinoConfig, geo: string): string {
    return casino.bonus_text[geo] || casino.bonus_text['RU'] || ''
  }

  /**
   * Валидация контента на запрещённые элементы
   */
  private validateContent(creative: CreativeResult, casino: CasinoConfig): void {
    const allText = `${creative.cta_text} ${creative.bonus_text}`.toLowerCase()
    
    for (const prohibited of casino.prohibited_elements) {
      if (allText.includes(prohibited.toLowerCase())) {
        throw new Error(`Content contains prohibited element: "${prohibited}"`)
      }
    }
  }

  /**
   * Запись геймплея (симуляция - в реальной реализации Playwright)
   */
  private async recordGameplay(
    creativeId: string,
    gameSlug: string,
    duration: number
  ): Promise<{ path: string; hasWin: boolean }> {
    this.reportProgress(creativeId, 'gameplay_init', 32, `Инициализация игры ${gameSlug}`)

    // В реальной реализации здесь будет:
    // 1. Playwright launch browser
    // 2. Navigate to https://stream.win/game/{gameSlug}
    // 3. Wait for game to load
    // 4. Click Spin button
    // 5. Record video for duration seconds
    // 6. Detect wins and cut to best moments

    const gameInfo = this.games.get(gameSlug)
    
    // Симуляция задержки записи
    await this.delay(1000)
    this.reportProgress(creativeId, 'gameplay_load', 35, `Загрузка демо-режима`)
    
    await this.delay(1000)
    this.reportProgress(creativeId, 'gameplay_spin', 38, `Выполнение спинов`)

    await this.delay(1500)
    this.reportProgress(creativeId, 'gameplay_record', 42, `Запись видео ${duration} сек`)

    // Симуляция - 85% шанс выигрыша для хорошего креатива
    const hasWin = Math.random() > 0.15

    return {
      path: `/tmp/gameplay_${creativeId}.mp4`,
      hasWin
    }
  }

  /**
   * Наложение брендинга (симуляция - в реальной реализации FFmpeg)
   */
  private async applyBranding(
    creativeId: string,
    gameplayVideo: { path: string; hasWin: boolean },
    casino: CasinoConfig,
    creative: CreativeResult
  ): Promise<{ path: string }> {
    this.reportProgress(creativeId, 'branding_logo', 52, `Добавление логотипа ${casino.name}`)

    // В реальной реализации здесь будет FFmpeg:
    // 1. Overlay logo in top-left corner (150x50, 80% opacity)
    // 2. Add bonus text in bottom third
    // 3. Add CTA button in last 3 seconds with pulse animation
    // 4. Apply casino color scheme

    await this.delay(1000)
    this.reportProgress(creativeId, 'branding_bonus', 56, `Добавление текста бонуса`)

    await this.delay(1000)
    this.reportProgress(creativeId, 'branding_cta', 60, `Создание CTA кнопки`)

    await this.delay(1000)
    this.reportProgress(creativeId, 'branding_colors', 64, `Применение цветовой схемы ${casino.primary_color}`)

    // Добавляем эмодзи если есть
    if (casino.style.emoji) {
      this.reportProgress(creativeId, 'branding_emoji', 66, `Добавление ${casino.style.emoji}`)
    }

    return {
      path: `/tmp/branded_${creativeId}.mp4`
    }
  }

  /**
   * Добавление аудио (симуляция)
   */
  private async addAudio(
    creativeId: string,
    video: { path: string }
  ): Promise<{ path: string }> {
    this.reportProgress(creativeId, 'audio_bg', 72, `Добавление фоновой музыки`)

    // В реальной реализации:
    // 1. Add background music loop (EDM/lo-fi, 20% volume)
    // 2. Keep game sound effects
    // 3. Add click sound at CTA button appearance

    await this.delay(1000)
    this.reportProgress(creativeId, 'audio_sfx', 76, `Добавление звуковых эффектов`)

    await this.delay(500)
    this.reportProgress(creativeId, 'audio_mix', 80, `Микширование аудио`)

    return {
      path: `/tmp/final_${creativeId}.mp4`
    }
  }

  /**
   * Экспорт видео (симуляция)
   */
  private async exportVideo(
    creativeId: string,
    video: { path: string },
    format: 'mp4' | 'gif' | 'both'
  ): Promise<{ mp4_path?: string; gif_path?: string; thumbnail_path?: string }> {
    const result: { mp4_path?: string; gif_path?: string; thumbnail_path?: string } = {}

    const creative = this.generatedCreatives.get(creativeId)!
    const baseName = `${creative.casino_id}_${creative.game_slug}_${creative.geo}_${Date.now()}`

    if (format === 'mp4' || format === 'both') {
      this.reportProgress(creativeId, 'export_mp4', 88, `Экспорт MP4 (1080x1920, H.264)`)
      await this.delay(1000)
      result.mp4_path = `/output/${baseName}.mp4`
    }

    if (format === 'gif' || format === 'both') {
      this.reportProgress(creativeId, 'export_gif', 92, `Экспорт GIF (640x640, 15fps)`)
      await this.delay(800)
      result.gif_path = `/output/${baseName}.gif`
    }

    this.reportProgress(creativeId, 'export_thumb', 96, `Создание превью`)
    await this.delay(300)
    result.thumbnail_path = `/output/${baseName}_thumb.jpg`

    return result
  }

  /**
   * Отчёт о прогрессе
   */
  private reportProgress(
    creativeId: string,
    step: string,
    progress: number,
    message: string
  ): void {
    const callback = this.progressCallbacks.get(creativeId)
    if (callback) {
      callback({
        step,
        progress,
        message,
        timestamp: new Date()
      })
    }
  }

  /**
   * Получить статус креатива
   */
  getCreative(creativeId: string): CreativeResult | undefined {
    return this.generatedCreatives.get(creativeId)
  }

  /**
   * Получить все креативы
   */
  getAllCreatives(): CreativeResult[] {
    return Array.from(this.generatedCreatives.values())
  }

  /**
   * Удалить креатив
   */
  deleteCreative(creativeId: string): boolean {
    return this.generatedCreatives.delete(creativeId)
  }

  /**
   * Получить статистику генерации
   */
  getStats(): {
    totalGenerated: number
    byCasino: Record<string, number>
    byGeo: Record<string, number>
    successRate: number
  } {
    const creatives = Array.from(this.generatedCreatives.values())
    const completed = creatives.filter(c => c.status === 'completed').length
    
    const byCasino: Record<string, number> = {}
    const byGeo: Record<string, number> = {}

    for (const creative of creatives) {
      byCasino[creative.casino_id] = (byCasino[creative.casino_id] || 0) + 1
      byGeo[creative.geo] = (byGeo[creative.geo] || 0) + 1
    }

    return {
      totalGenerated: creatives.length,
      byCasino,
      byGeo,
      successRate: creatives.length > 0 ? (completed / creatives.length) * 100 : 0
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const creativeGeneratorService = new CreativeGeneratorService()
export default creativeGeneratorService
