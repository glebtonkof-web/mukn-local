// ContentLearningEngine - Learning from user edits
// AI learns from user corrections and improves future generations

import { db } from './db';

// Типы
export type EditType = 'background' | 'text' | 'color' | 'voice' | 'duration' | 'style' | 'composition' | 'lighting';
export type LearningCategory = 'style_preference' | 'color_preference' | 'composition_preference' | 'text_style' | 'voice_preference';

export interface UserEdit {
  contentId: string;
  editType: EditType;
  userCommand: string;
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  understood: boolean;
  satisfied: boolean;
}

export interface LearnedPreference {
  category: LearningCategory;
  pattern: string;
  frequency: number;
  successRate: number;
  lastApplied?: Date;
  examples: string[];
}

export interface StyleProfile {
  userId: string;
  preferences: LearnedPreference[];
  totalEdits: number;
  learningScore: number;
  topStyles: string[];
  avoidPatterns: string[];
}

// Класс системы обучения
export class ContentLearningEngine {
  private cache: Map<string, StyleProfile> = new Map();

  // Запись правки пользователя
  async recordEdit(edit: UserEdit): Promise<void> {
    // Сохраняем в БД
    await db.userEditHistory.create({
      data: {
        contentId: edit.contentId,
        editType: edit.editType,
        userCommand: edit.userCommand,
        beforeState: JSON.stringify(edit.beforeState),
        afterState: JSON.stringify(edit.afterState),
        understood: edit.understood,
        satisfied: edit.satisfied,
      },
    });

    // Анализируем паттерн
    await this.analyzePattern(edit);

    // Обновляем кэш
    this.cache.clear();
  }

  // Анализ паттерна правки
  private async analyzePattern(edit: UserEdit): Promise<void> {
    // Извлекаем ключевые слова из команды
    const keywords = this.extractKeywords(edit.userCommand);
    
    // Определяем категорию
    const category = this.categorizeEdit(edit.editType, keywords);
    
    // Создаём или обновляем паттерн
    const patternKey = `${category}_${keywords.join('_')}`;
    
    // Проверяем, есть ли уже такой паттерн
    const existingPattern = await this.findSimilarPattern(category, keywords);
    
    if (existingPattern) {
      // Обновляем существующий паттерн
      await this.updatePattern(existingPattern, edit);
    } else {
      // Создаём новый паттерн
      await this.createPattern(category, keywords, edit);
    }
  }

  // Извлечение ключевых слов
  private extractKeywords(command: string): string[] {
    // Стоп-слова
    const stopWords = ['сделай', 'сделать', 'поменяй', 'измени', 'добавь', 'убери', 'поставь', 'сделайте', 'хочу', 'нужно', 'надо', 'и', 'в', 'на', 'с', 'по', 'для', 'от', 'к', 'за', 'из'];
    
    // Нормализация
    const normalized = command.toLowerCase()
      .replace(/[^\wа-яё\s]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(normalized)];
  }

  // Категоризация правки
  private categorizeEdit(editType: EditType, keywords: string[]): LearningCategory {
    const keywordStr = keywords.join(' ');
    
    // Маппинг категорий
    const categoryMap: Record<string, LearningCategory[]> = {
      'background': ['style_preference', 'color_preference'],
      'text': ['text_style'],
      'color': ['color_preference'],
      'voice': ['voice_preference'],
      'duration': ['style_preference'],
      'style': ['style_preference'],
      'composition': ['composition_preference'],
      'lighting': ['style_preference'],
    };

    // Определяем по ключевым словам
    if (keywordStr.includes('темн') || keywordStr.includes('светл') || keywordStr.includes('цвет')) {
      return 'color_preference';
    }
    if (keywordStr.includes('стиль') || keywordStr.includes('стиле')) {
      return 'style_preference';
    }
    if (keywordStr.includes('текст') || keywordStr.includes('шрифт') || keywordStr.includes('надпис')) {
      return 'text_style';
    }
    if (keywordStr.includes('голос') || keywordStr.includes('озвучк') || keywordStr.includes('говор')) {
      return 'voice_preference';
    }
    if (keywordStr.includes('композиций') || keywordStr.includes('расположен') || keywordStr.includes('центр')) {
      return 'composition_preference';
    }

    // По типу правки
    return categoryMap[editType]?.[0] || 'style_preference';
  }

  // Поиск похожего паттерна
  private async findSimilarPattern(category: LearningCategory, keywords: string[]): Promise<any> {
    // Ищем в контент-шаблонах
    const templates = await db.contentTemplate.findMany({
      where: {
        styleParams: { contains: category },
      },
      take: 10,
    });

    for (const template of templates) {
      const params = JSON.parse(template.styleParams || '{}');
      if (keywords.some(kw => params.keywords?.includes(kw))) {
        return template;
      }
    }

    return null;
  }

  // Обновление паттерна
  private async updatePattern(pattern: any, edit: UserEdit): Promise<void> {
    const params = JSON.parse(pattern.styleParams || '{}');
    
    params.frequency = (params.frequency || 0) + 1;
    params.successRate = edit.satisfied 
      ? ((params.successRate || 0) * (params.frequency - 1) + 1) / params.frequency
      : (params.successRate || 0) * (params.frequency - 1) / params.frequency;
    
    params.examples = params.examples || [];
    if (!params.examples.includes(edit.userCommand)) {
      params.examples.push(edit.userCommand);
      if (params.examples.length > 10) params.examples.shift();
    }

    await db.contentTemplate.update({
      where: { id: pattern.id },
      data: {
        styleParams: JSON.stringify(params),
        usageCount: { increment: 1 },
      },
    });
  }

  // Создание нового паттерна
  private async createPattern(category: LearningCategory, keywords: string[], edit: UserEdit): Promise<void> {
    await db.contentTemplate.create({
      data: {
        name: `Learned: ${category}`,
        contentType: 'learned_pattern',
        styleParams: JSON.stringify({
          category,
          keywords,
          frequency: 1,
          successRate: edit.satisfied ? 1 : 0,
          examples: [edit.userCommand],
          editType: edit.editType,
          beforeState: edit.beforeState,
          afterState: edit.afterState,
        }),
      },
    });
  }

  // Получение профиля стиля пользователя
  async getStyleProfile(userId?: string): Promise<StyleProfile> {
    const cacheKey = userId || 'global';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Получаем все паттерны обучения
    const patterns = await db.contentTemplate.findMany({
      where: {
        contentType: 'learned_pattern',
      },
    });

    const preferences: LearnedPreference[] = patterns.map(p => {
      const params = JSON.parse(p.styleParams || '{}');
      return {
        category: params.category as LearningCategory,
        pattern: params.keywords?.join(' ') || '',
        frequency: params.frequency || 0,
        successRate: params.successRate || 0,
        examples: params.examples || [],
      };
    });

    // Получаем историю правок
    const editHistory = await db.userEditHistory.findMany({
      take: 100,
    });

    // Анализируем топ стили
    const styleCounts: Record<string, number> = {};
    const avoidPatterns: string[] = [];

    editHistory.forEach(edit => {
      if (!edit.satisfied && edit.userCommand) {
        // Запоминаем что НЕ нравится
        const keywords = this.extractKeywords(edit.userCommand);
        avoidPatterns.push(...keywords);
      }
      
      if (edit.satisfied && edit.beforeState && edit.afterState) {
        // Запоминаем что нравится
        const before = JSON.parse(edit.beforeState);
        const after = JSON.parse(edit.afterState);
        
        Object.keys(after).forEach(key => {
          if (after[key] !== before[key]) {
            const style = `${key}:${after[key]}`;
            styleCounts[style] = (styleCounts[style] || 0) + 1;
          }
        });
      }
    });

    const topStyles = Object.entries(styleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([style]) => style);

    const profile: StyleProfile = {
      userId: cacheKey,
      preferences,
      totalEdits: editHistory.length,
      learningScore: Math.min(preferences.length * 10, 100),
      topStyles,
      avoidPatterns: [...new Set(avoidPatterns)].slice(0, 20),
    };

    this.cache.set(cacheKey, profile);
    return profile;
  }

  // Применение обучения к промпту
  async enhancePrompt(originalPrompt: string, userId?: string): Promise<string> {
    const profile = await this.getStyleProfile(userId);
    
    let enhancedPrompt = originalPrompt;
    const additions: string[] = [];

    // Применяем изученные предпочтения
    for (const pref of profile.preferences) {
      if (pref.successRate > 0.7 && pref.frequency >= 3) {
        switch (pref.category) {
          case 'color_preference':
            additions.push(pref.pattern);
            break;
          case 'style_preference':
            additions.push(pref.pattern);
            break;
          case 'composition_preference':
            additions.push(pref.pattern);
            break;
        }
      }
    }

    // Добавляем топ стили
    if (profile.topStyles.length > 0) {
      const topStyleParams = profile.topStyles
        .filter(s => s.includes(':'))
        .map(s => s.split(':')[1])
        .slice(0, 3);
      
      if (topStyleParams.length > 0) {
        additions.push(...topStyleParams);
      }
    }

    // Избегаем негативных паттернов
    const avoidList = profile.avoidPatterns.slice(0, 5);
    if (avoidList.length > 0) {
      enhancedPrompt += `, avoid: ${avoidList.join(', ')}`;
    }

    // Добавляем позитивные улучшения
    if (additions.length > 0) {
      enhancedPrompt += `, ${additions.slice(0, 5).join(', ')}`;
    }

    return enhancedPrompt;
  }

  // Получение рекомендаций
  async getRecommendations(context: {
    type?: string;
    platform?: string;
    niche?: string;
  }): Promise<string[]> {
    const profile = await this.getStyleProfile();
    const recommendations: string[] = [];

    // На основе успешных паттернов
    for (const pref of profile.preferences) {
      if (pref.successRate > 0.8) {
        recommendations.push(`Использовать: ${pref.pattern} (${Math.round(pref.successRate * 100)}% успех)`);
      }
    }

    // На основе топ стилей
    for (const style of profile.topStyles.slice(0, 5)) {
      recommendations.push(`Популярный стиль: ${style}`);
    }

    // Предупреждения
    if (profile.avoidPatterns.length > 0) {
      recommendations.push(`Избегать: ${profile.avoidPatterns.slice(0, 3).join(', ')}`);
    }

    return recommendations;
  }

  // Сброс обучения
  async resetLearning(userId?: string): Promise<void> {
    // Удаляем все паттерны
    await db.contentTemplate.deleteMany({
      where: {
        contentType: 'learned_pattern',
      },
    });

    // Очищаем кэш
    this.cache.clear();
  }

  // Экспорт профиля
  async exportProfile(userId?: string): Promise<string> {
    const profile = await this.getStyleProfile(userId);
    return JSON.stringify(profile, null, 2);
  }

  // Импорт профиля
  async importProfile(profileData: string): Promise<void> {
    const profile = JSON.parse(profileData) as StyleProfile;
    
    for (const pref of profile.preferences) {
      await db.contentTemplate.create({
        data: {
          name: `Imported: ${pref.category}`,
          contentType: 'learned_pattern',
          styleParams: JSON.stringify({
            category: pref.category,
            keywords: pref.pattern.split(' '),
            frequency: pref.frequency,
            successRate: pref.successRate,
            examples: pref.examples,
          }),
        },
      });
    }

    this.cache.clear();
  }
}

// Singleton
let learningEngineInstance: ContentLearningEngine | null = null;

export function getLearningEngine(): ContentLearningEngine {
  if (!learningEngineInstance) {
    learningEngineInstance = new ContentLearningEngine();
  }
  return learningEngineInstance;
}

// Экспорт удобных функций
export const learningEngine = {
  recordEdit: async (edit: UserEdit) => {
    const engine = getLearningEngine();
    return engine.recordEdit(edit);
  },
  getProfile: async (userId?: string) => {
    const engine = getLearningEngine();
    return engine.getStyleProfile(userId);
  },
  enhancePrompt: async (prompt: string, userId?: string) => {
    const engine = getLearningEngine();
    return engine.enhancePrompt(prompt, userId);
  },
  getRecommendations: async (context: any) => {
    const engine = getLearningEngine();
    return engine.getRecommendations(context);
  },
};
