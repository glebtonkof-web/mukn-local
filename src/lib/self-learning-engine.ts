// Self-Learning Engine - Обучение на основе CTR и эффективности
// Нейросеть предсказывает лучший вариант контента

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface ContentVariant {
  id: string;
  content: string;
  type: 'post' | 'comment' | 'story' | 'video';
  niche: string;
  platform: string;
  features: Record<string, number>; // признаки контента
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    ctr: number;
    engagement: number;
  };
  createdAt: number;
}

export interface LearningExample {
  input: Record<string, number>; // признаки
  output: number; // CTR или engagement score
  weight: number; // вес примера
}

export interface ModelWeights {
  biases: number[][];  // biases per layer
  weights: number[][][];  // weights per layer
  features: string[]; // имена признаков
}

export interface SelfLearningConfig {
  minExamplesForTraining: number;
  learningRate: number;
  hiddenLayers: number[];
  featuresUsed: string[];
  decayFactor: number; // затухание старых примеров
  maxTrainingExamples: number;
}

export interface LearningStats {
  totalExamples: number;
  trainingIterations: number;
  averagePredictionError: number;
  bestPerformingFeatures: Array<{ feature: string; weight: number }>;
  lastTrainingAt: Date | null;
  modelAccuracy: number;
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: SelfLearningConfig = {
  minExamplesForTraining: 50,
  learningRate: 0.01,
  hiddenLayers: [32, 16],
  featuresUsed: [
    'content_length',
    'emoji_count',
    'question_count',
    'exclamation_count',
    'hashtag_count',
    'mention_count',
    'url_count',
    'sentiment_positive',
    'sentiment_negative',
    'readability_score',
    'unique_word_ratio',
    'avg_word_length',
    'hour_of_day',
    'day_of_week',
    'niche_gambling',
    'niche_crypto',
    'niche_nutra',
    'niche_bait',
    'niche_lifestyle',
  ],
  decayFactor: 0.95,
  maxTrainingExamples: 10000,
};

// ==================== SELF-LEARNING ENGINE ====================

class SelfLearningEngineService extends EventEmitter {
  private config: SelfLearningConfig;
  private trainingExamples: LearningExample[] = [];
  private model: ModelWeights | null = null;
  private stats: LearningStats;
  private featureStats: Map<string, { min: number; max: number; mean: number }> = new Map();

  constructor(config: Partial<SelfLearningConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalExamples: 0,
      trainingIterations: 0,
      averagePredictionError: 0,
      bestPerformingFeatures: [],
      lastTrainingAt: null,
      modelAccuracy: 0,
    };
  }

  // Извлечение признаков из контента
  extractFeatures(content: ContentVariant): Record<string, number> {
    const text = content.content;
    const features: Record<string, number> = {};
    
    // Длина контента
    features.content_length = text.length;
    
    // Emoji
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    features.emoji_count = (text.match(emojiRegex) || []).length;
    
    // Вопросы и восклицания
    features.question_count = (text.match(/\?/g) || []).length;
    features.exclamation_count = (text.match(/!/g) || []).length;
    
    // Хештеги и упоминания
    features.hashtag_count = (text.match(/#\w+/g) || []).length;
    features.mention_count = (text.match(/@\w+/g) || []).length;
    
    // URL
    features.url_count = (text.match(/https?:\/\/\S+/g) || []).length;
    
    // Анализ тональности (простая версия)
    const positiveWords = ['отлично', 'супер', 'круто', 'люблю', 'класс', 'ура', '👍', '🔥', '❤️'];
    const negativeWords = ['плохо', 'ужас', 'грустно', 'печаль', '👎', '😢', '💔'];
    
    const positiveCount = positiveWords.reduce((sum, word) => 
      sum + (text.toLowerCase().match(new RegExp(word, 'g')) || []).length, 0);
    const negativeCount = negativeWords.reduce((sum, word) => 
      sum + (text.toLowerCase().match(new RegExp(word, 'g')) || []).length, 0);
    
    const totalSentiment = positiveCount + negativeCount || 1;
    features.sentiment_positive = positiveCount / totalSentiment;
    features.sentiment_negative = negativeCount / totalSentiment;
    
    // Читаемость (количество слов / количество предложений)
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    features.readability_score = sentences.length > 0 ? words.length / sentences.length : 0;
    
    // Уникальные слова
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    features.unique_word_ratio = words.length > 0 ? uniqueWords.size / words.length : 0;
    
    // Средняя длина слова
    const totalWordLength = words.reduce((sum, w) => sum + w.length, 0);
    features.avg_word_length = words.length > 0 ? totalWordLength / words.length : 0;
    
    // Время
    const date = new Date(content.createdAt);
    features.hour_of_day = date.getHours();
    features.day_of_week = date.getDay();
    
    // Ниша (one-hot encoding)
    features.niche_gambling = content.niche === 'gambling' ? 1 : 0;
    features.niche_crypto = content.niche === 'crypto' ? 1 : 0;
    features.niche_nutra = content.niche === 'nutra' ? 1 : 0;
    features.niche_bait = content.niche === 'bait' ? 1 : 0;
    features.niche_lifestyle = content.niche === 'lifestyle' ? 1 : 0;
    
    return features;
  }

  // Нормализация признаков
  private normalizeFeatures(features: Record<string, number>): number[] {
    const result: number[] = [];
    
    for (const featureName of this.config.featuresUsed) {
      let value = features[featureName] || 0;
      const stats = this.featureStats.get(featureName);
      
      if (stats) {
        // Min-max нормализация
        if (stats.max > stats.min) {
          value = (value - stats.min) / (stats.max - stats.min);
        }
      }
      
      result.push(value);
    }
    
    return result;
  }

  // Добавление примера для обучения
  addExample(content: ContentVariant): void {
    const features = this.extractFeatures(content);
    
    if (!content.metrics) return;
    
    // Целевая переменная - CTR или engagement score
    const target = content.metrics.ctr || 
                   (content.metrics.engagement || 0);
    
    // Обновляем статистику признаков
    for (const [name, value] of Object.entries(features)) {
      const stats = this.featureStats.get(name) || { min: Infinity, max: -Infinity, mean: 0 };
      stats.min = Math.min(stats.min, value);
      stats.max = Math.max(stats.max, value);
      stats.mean = (stats.mean * this.stats.totalExamples + value) / (this.stats.totalExamples + 1);
      this.featureStats.set(name, stats);
    }
    
    // Добавляем пример
    const example: LearningExample = {
      input: features,
      output: target,
      weight: 1.0,
    };
    
    this.trainingExamples.push(example);
    this.stats.totalExamples++;
    
    // Ограничиваем размер
    if (this.trainingExamples.length > this.config.maxTrainingExamples) {
      this.trainingExamples.shift();
    }
    
    this.emit('example:added', { total: this.stats.totalExamples });
  }

  // Обучение модели (простая нейросеть)
  async train(): Promise<{ success: boolean; error?: number }> {
    if (this.trainingExamples.length < this.config.minExamplesForTraining) {
      console.log(`[SelfLearning] Not enough examples: ${this.trainingExamples.length}/${this.config.minExamplesForTraining}`);
      return { success: false };
    }
    
    console.log('[SelfLearning] Starting training...');
    
    // Инициализация модели
    if (!this.model) {
      this.initializeModel();
    }
    
    const normalizedExamples = this.trainingExamples.map(ex => ({
      input: this.normalizeFeatures(ex.input),
      output: ex.output,
      weight: ex.weight,
    }));
    
    // Обучение через градиентный спуск
    let totalError = 0;
    const iterations = 100;
    
    for (let iter = 0; iter < iterations; iter++) {
      totalError = 0;
      
      for (const example of normalizedExamples) {
        // Forward pass
        const prediction = this.forward(example.input);
        const error = prediction - example.output;
        totalError += error * error;
        
        // Backprop (упрощённая версия)
        this.backward(example.input, error);
      }
      
      this.stats.trainingIterations++;
    }
    
    this.stats.averagePredictionError = totalError / normalizedExamples.length;
    this.stats.lastTrainingAt = new Date();
    this.stats.modelAccuracy = Math.max(0, 1 - this.stats.averagePredictionError);
    
    // Вычисляем важность признаков
    this.computeFeatureImportance();
    
    console.log(`[SelfLearning] Training completed. Error: ${this.stats.averagePredictionError.toFixed(4)}`);
    this.emit('training:completed', { error: this.stats.averagePredictionError });
    
    return { success: true, error: this.stats.averagePredictionError };
  }

  // Инициализация модели
  private initializeModel(): void {
    const inputSize = this.config.featuresUsed.length;
    const layers = [inputSize, ...this.config.hiddenLayers, 1];
    
    this.model = {
      biases: [],
      weights: [],
      features: this.config.featuresUsed,
    };
    
    for (let i = 1; i < layers.length; i++) {
      const prevSize = layers[i - 1];
      const currSize = layers[i];
      
      this.model.biases.push(new Array(currSize).fill(0).map(() => Math.random() * 0.1 - 0.05));
      this.model.weights.push(
        new Array(currSize).fill(0).map(() =>
          new Array(prevSize).fill(0).map(() => Math.random() * 0.1 - 0.05)
        )
      );
    }
  }

  // Forward pass
  private forward(input: number[]): number {
    if (!this.model) return 0;
    
    let current = input;
    
    for (let layer = 0; layer < this.model.weights.length; layer++) {
      const weights = this.model.weights[layer];
      const biases = this.model.biases[layer];
      const next: number[] = [];
      
      for (let neuron = 0; neuron < weights.length; neuron++) {
        let sum = biases[neuron];
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * weights[neuron][i];
        }
        // ReLU activation (кроме последнего слоя)
        next.push(layer === this.model.weights.length - 1 ? sum : Math.max(0, sum));
      }
      
      current = next;
    }
    
    return Math.max(0, current[0]); // CTR не может быть отрицательным
  }

  // Backward pass (упрощённый)
  private backward(input: number[], error: number): void {
    if (!this.model) return;
    
    const lr = this.config.learningRate;
    
    // Упрощённое обновление весов последнего слоя
    const lastLayer = this.model.weights.length - 1;
    
    for (let neuron = 0; neuron < this.model.weights[lastLayer].length; neuron++) {
      this.model.biases[lastLayer][neuron] -= lr * error;
      for (let i = 0; i < this.model.weights[lastLayer][neuron].length; i++) {
        this.model.weights[lastLayer][neuron][i] -= lr * error * 0.1;
      }
    }
  }

  // Предсказание лучшего варианта
  async predictBest(variants: ContentVariant[]): Promise<ContentVariant> {
    if (!this.model || variants.length === 0) {
      return variants[Math.floor(Math.random() * variants.length)];
    }
    
    let bestScore = -Infinity;
    let bestVariant = variants[0];
    
    for (const variant of variants) {
      const features = this.extractFeatures(variant);
      const normalized = this.normalizeFeatures(features);
      const score = this.forward(normalized);
      
      if (score > bestScore) {
        bestScore = score;
        bestVariant = variant;
      }
    }
    
    this.emit('prediction:made', { variantId: bestVariant.id, score: bestScore });
    
    return bestVariant;
  }

  // Генерация с предсказанием лучшего варианта
  async generateBetter(
    prompt: string,
    generator: (prompt: string, count: number) => Promise<string[]>,
    variantCount: number = 5
  ): Promise<{ content: string; variants: ContentVariant[] }> {
    // Генерируем несколько вариантов
    const generatedContents = await generator(prompt, variantCount);
    
    const variants: ContentVariant[] = generatedContents.map((content, index) => ({
      id: `var-${index}`,
      content,
      type: 'post' as const,
      niche: 'lifestyle',
      platform: 'telegram',
      features: {},
      createdAt: Date.now(),
    }));
    
    // Выбираем лучший
    const best = await this.predictBest(variants);
    
    return {
      content: best.content,
      variants,
    };
  }

  // Вычисление важности признаков
  private computeFeatureImportance(): void {
    if (!this.model) return;
    
    const importances: Array<{ feature: string; weight: number }> = [];
    
    // Используем веса первого слоя
    const firstLayerWeights = this.model.weights[0];
    
    for (let i = 0; i < this.config.featuresUsed.length; i++) {
      const featureName = this.config.featuresUsed[i];
      let totalWeight = 0;
      
      for (const neuronWeights of firstLayerWeights) {
        totalWeight += Math.abs(neuronWeights[i]);
      }
      
      importances.push({ feature: featureName, weight: totalWeight });
    }
    
    importances.sort((a, b) => b.weight - a.weight);
    this.stats.bestPerformingFeatures = importances.slice(0, 10);
  }

  // Получение статистики
  getStats(): LearningStats {
    return { ...this.stats };
  }

  // Получение модели (для сохранения)
  getModel(): ModelWeights | null {
    return this.model ? JSON.parse(JSON.stringify(this.model)) : null;
  }

  // Загрузка модели
  loadModel(model: ModelWeights): void {
    this.model = model;
    this.emit('model:loaded');
  }

  // Сброс
  reset(): void {
    this.trainingExamples = [];
    this.model = null;
    this.stats = {
      totalExamples: 0,
      trainingIterations: 0,
      averagePredictionError: 0,
      bestPerformingFeatures: [],
      lastTrainingAt: null,
      modelAccuracy: 0,
    };
    this.emit('reset');
  }
}

// ==================== SINGLETON ====================

let selfLearningInstance: SelfLearningEngineService | null = null;

export function getSelfLearningEngine(config?: Partial<SelfLearningConfig>): SelfLearningEngineService {
  if (!selfLearningInstance) {
    selfLearningInstance = new SelfLearningEngineService(config);
  }
  return selfLearningInstance;
}

export const selfLearningEngine = {
  addExample: (content: ContentVariant) => getSelfLearningEngine().addExample(content),
  train: () => getSelfLearningEngine().train(),
  predictBest: (variants: ContentVariant[]) => getSelfLearningEngine().predictBest(variants),
  generateBetter: (prompt: string, generator: (p: string, n: number) => Promise<string[]>, count?: number) =>
    getSelfLearningEngine().generateBetter(prompt, generator, count),
  getStats: () => getSelfLearningEngine().getStats(),
  extractFeatures: (content: ContentVariant) => getSelfLearningEngine().extractFeatures(content),
};
