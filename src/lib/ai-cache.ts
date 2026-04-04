// AI Context Cache - Контекстное кэширование AI-ответов
// Использует semantic similarity для поиска похожих запросов
// TTL: 24 часа, хранение: localStorage + memory cache

export interface CacheEntry {
  id: string;
  query: string;
  queryEmbedding: number[];
  response: string;
  context: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  similarity?: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 24 hours)
  maxEntries?: number; // Max entries in cache (default: 1000)
  similarityThreshold?: number; // Min similarity to consider as match (default: 0.85)
  storageKey?: string; // localStorage key (default: 'ai_context_cache')
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalTokensSaved: number;
  totalCostSaved: number;
  avgSimilarity: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

// Простая функция хеширования для создания embedding-like векторов
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// Создание псевдо-embedding для текста (для semantic similarity)
function createPseudoEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Создаем вектор на основе n-gram
  const vector: number[] = new Array(128).fill(0);
  
  // Хеш-функция для распределения слов по вектору
  for (const word of words) {
    const hash = simpleHash(word);
    const index = Math.abs(hash) % 128;
    vector[index] += 1;
    
    // Добавляем биграммы
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.slice(i, i + 2);
      const bigramHash = simpleHash(bigram);
      const bigramIndex = Math.abs(bigramHash) % 128;
      vector[bigramIndex] += 0.5;
    }
  }
  
  // Нормализация вектора
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  
  return vector;
}

// Cosine similarity между двумя векторами
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * AI Context Cache Class
 * Кэширует AI-ответы с semantic similarity поиском
 */
export class AIContextCache {
  private entries: Map<string, CacheEntry> = new Map();
  private options: Required<CacheOptions>;
  private stats = {
    hits: 0,
    misses: 0,
    tokensSaved: 0,
    costSaved: 0,
    totalSimilarities: 0,
    similarityCount: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: options.maxEntries ?? 1000,
      similarityThreshold: options.similarityThreshold ?? 0.85,
      storageKey: options.storageKey ?? 'ai_context_cache',
    };
    
    // Загружаем из localStorage при инициализации
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  /**
   * Генерация уникального ID для записи
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Загрузка кэша из localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as CacheEntry[];
        const now = Date.now();
        
        for (const entry of data) {
          // Пропускаем устаревшие записи
          if (entry.expiresAt > now) {
            this.entries.set(entry.id, entry);
          }
        }
        
        console.log(`[AIContextCache] Loaded ${this.entries.size} entries from storage`);
      }
    } catch (error) {
      console.error('[AIContextCache] Failed to load from storage:', error);
    }
  }

  /**
   * Сохранение кэша в localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = Array.from(this.entries.values());
      localStorage.setItem(this.options.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[AIContextCache] Failed to save to storage:', error);
    }
  }

  /**
   * Очистка устаревших записей
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(id);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[AIContextCache] Cleaned up ${removed} expired entries`);
      this.saveToStorage();
    }
  }

  /**
   * Удаление старых записей при превышении лимита
   */
  private evictOldest(): void {
    if (this.entries.size <= this.options.maxEntries) return;
    
    // Сортируем по hit count и дате создания
    const entries = Array.from(this.entries.values());
    entries.sort((a, b) => {
      // Сначала по hit count (меньше - кандидаты на удаление)
      if (a.hitCount !== b.hitCount) return a.hitCount - b.hitCount;
      // Потом по дате (старее - кандидаты на удаление)
      return a.createdAt - b.createdAt;
    });
    
    // Удаляем лишние
    const toRemove = entries.slice(0, this.entries.size - this.options.maxEntries);
    for (const entry of toRemove) {
      this.entries.delete(entry.id);
    }
    
    console.log(`[AIContextCache] Evicted ${toRemove.length} entries`);
    this.saveToStorage();
  }

  /**
   * Поиск похожего запроса в кэше
   */
  findSimilar(query: string, context?: string): CacheEntry | null {
    this.cleanup();
    
    const queryEmbedding = createPseudoEmbedding(query);
    const normalizedQuery = query.toLowerCase().trim();
    
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;
    
    for (const entry of this.entries.values()) {
      // Проверяем точное совпадение
      if (entry.query.toLowerCase().trim() === normalizedQuery) {
        // Точное совпадение - обновляем hit count
        entry.hitCount++;
        this.stats.hits++;
        this.stats.tokensSaved += entry.tokensIn + entry.tokensOut;
        this.stats.costSaved += entry.cost;
        this.saveToStorage();
        return { ...entry, similarity: 1.0 };
      }
      
      // Проверяем контекст если указан
      if (context && entry.context !== context) continue;
      
      // Вычисляем semantic similarity
      const similarity = cosineSimilarity(queryEmbedding, entry.queryEmbedding);
      
      if (similarity > bestSimilarity && similarity >= this.options.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }
    
    if (bestMatch) {
      bestMatch.hitCount++;
      this.stats.hits++;
      this.stats.tokensSaved += bestMatch.tokensIn + bestMatch.tokensOut;
      this.stats.costSaved += bestMatch.cost;
      this.stats.totalSimilarities += bestSimilarity;
      this.stats.similarityCount++;
      this.saveToStorage();
      return { ...bestMatch, similarity: bestSimilarity };
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Добавление записи в кэш
   */
  set(
    query: string,
    response: string,
    metadata: {
      provider: string;
      model: string;
      tokensIn: number;
      tokensOut: number;
      cost: number;
      context?: string;
    }
  ): CacheEntry {
    this.cleanup();
    this.evictOldest();
    
    const now = Date.now();
    const entry: CacheEntry = {
      id: this.generateId(),
      query,
      queryEmbedding: createPseudoEmbedding(query),
      response,
      context: metadata.context || '',
      provider: metadata.provider,
      model: metadata.model,
      tokensIn: metadata.tokensIn,
      tokensOut: metadata.tokensOut,
      cost: metadata.cost,
      createdAt: now,
      expiresAt: now + this.options.ttl,
      hitCount: 0,
    };
    
    this.entries.set(entry.id, entry);
    this.saveToStorage();
    
    return entry;
  }

  /**
   * Получение записи по точному совпадению
   */
  get(query: string): CacheEntry | null {
    this.cleanup();
    
    const normalizedQuery = query.toLowerCase().trim();
    
    for (const entry of this.entries.values()) {
      if (entry.query.toLowerCase().trim() === normalizedQuery) {
        entry.hitCount++;
        this.stats.hits++;
        this.stats.tokensSaved += entry.tokensIn + entry.tokensOut;
        this.stats.costSaved += entry.cost;
        this.saveToStorage();
        return entry;
      }
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Удаление записи
   */
  delete(id: string): boolean {
    const result = this.entries.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  /**
   * Очистка всего кэша
   */
  clear(): void {
    this.entries.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      tokensSaved: 0,
      costSaved: 0,
      totalSimilarities: 0,
      similarityCount: 0,
    };
    this.saveToStorage();
  }

  /**
   * Получение статистики кэша
   */
  getStats(): CacheStats {
    const entries = Array.from(this.entries.values());
    const now = Date.now();
    
    return {
      totalEntries: entries.length,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
      totalTokensSaved: this.stats.tokensSaved,
      totalCostSaved: this.stats.costSaved,
      avgSimilarity: this.stats.similarityCount > 0
        ? this.stats.totalSimilarities / this.stats.similarityCount
        : 0,
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(e => e.createdAt))
        : null,
      newestEntry: entries.length > 0
        ? Math.max(...entries.map(e => e.createdAt))
        : null,
    };
  }

  /**
   * Получение всех записей
   */
  getAll(): CacheEntry[] {
    this.cleanup();
    return Array.from(this.entries.values());
  }

  /**
   * Получение записей по контексту
   */
  getByContext(context: string): CacheEntry[] {
    this.cleanup();
    return Array.from(this.entries.values()).filter(e => e.context === context);
  }

  /**
   * Установка TTL для существующей записи
   */
  setTTL(id: string, ttl: number): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    
    entry.expiresAt = Date.now() + ttl;
    this.saveToStorage();
    return true;
  }

  /**
   * Экспорт кэша
   */
  export(): string {
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      entries: Array.from(this.entries.values()),
      stats: this.stats,
    });
  }

  /**
   * Импорт кэша
   */
  import(data: string): number {
    try {
      const parsed = JSON.parse(data);
      let imported = 0;
      
      if (parsed.entries && Array.isArray(parsed.entries)) {
        for (const entry of parsed.entries as CacheEntry[]) {
          if (entry.expiresAt > Date.now()) {
            this.entries.set(entry.id, entry);
            imported++;
          }
        }
      }
      
      this.saveToStorage();
      return imported;
    } catch (error) {
      console.error('[AIContextCache] Import failed:', error);
      return 0;
    }
  }
}

// Singleton instance
let cacheInstance: AIContextCache | null = null;

/**
 * Получение singleton экземпляра кэша
 */
export function getAICache(options?: CacheOptions): AIContextCache {
  if (!cacheInstance) {
    cacheInstance = new AIContextCache(options);
  }
  return cacheInstance;
}

/**
 * Очистка singleton
 */
export function clearAICacheInstance(): void {
  if (cacheInstance) {
    cacheInstance.clear();
    cacheInstance = null;
  }
}

export default AIContextCache;
