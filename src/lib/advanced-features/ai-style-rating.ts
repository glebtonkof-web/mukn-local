// Рейтинг понимания стиля пользователя AI
// Оценка от 0 до 100: насколько хорошо AI понял ваш стиль

import { db } from '../db';
import { nanoid } from 'nanoid';

export interface StyleRatingComponents {
  toneMatch: number;
  styleMatch: number;
  audienceMatch: number;
  timingMatch: number;
}

export interface StyleFeedback {
  contentId: string;
  originalContent: string;
  userEdit?: string;
  accepted: boolean;
  rating?: number;
  comment?: string;
}

export interface StylePattern {
  pattern: string;
  frequency: number;
  success: number;
  category: 'tone' | 'style' | 'structure' | 'vocabulary';
}

class AIStyleRatingSystem {
  async getRating(userId: string): Promise<{
    overallRating: number;
    components: StyleRatingComponents;
    message: string;
    lastUpdated: Date;
  }> {
    let rating = await db.aIStyleRating.findUnique({ where: { userId } });

    if (!rating) {
      rating = await db.aIStyleRating.create({ data: { id: nanoid(), userId, updatedAt: new Date() } });
    }

    const components: StyleRatingComponents = {
      toneMatch: rating.toneMatch,
      styleMatch: rating.styleMatch,
      audienceMatch: rating.audienceMatch,
      timingMatch: rating.timingMatch,
    };

    const overallRating = rating.overallRating;
    const message = this.generateRatingMessage(overallRating, components);

    return {
      overallRating,
      components,
      message,
      lastUpdated: rating.lastCalculated,
    };
  }

  async recordFeedback(userId: string, feedback: StyleFeedback): Promise<void> {
    let rating = await db.aIStyleRating.findUnique({ where: { userId } });

    if (!rating) {
      rating = await db.aIStyleRating.create({ data: { id: nanoid(), userId, updatedAt: new Date() } });
    }

    const totalEdits = rating.totalEdits + 1;
    const positiveEdits = feedback.accepted ? rating.positiveEdits + 1 : rating.positiveEdits;

    const patterns = await this.analyzePattern(feedback.originalContent, feedback.userEdit, feedback.accepted);
    const learnedPatterns = await this.updateLearnedPatterns(rating.learnedPatterns, patterns);
    const components = await this.recalculateComponents(userId, feedback, rating);

    const overallRating = Math.round(
      components.toneMatch * 0.3 + components.styleMatch * 0.3 + 
      components.audienceMatch * 0.25 + components.timingMatch * 0.15
    );

    await db.aIStyleRating.update({
      where: { userId },
      data: {
        overallRating,
        toneMatch: components.toneMatch,
        styleMatch: components.styleMatch,
        audienceMatch: components.audienceMatch,
        timingMatch: components.timingMatch,
        totalEdits,
        positiveEdits,
        learnedPatterns: JSON.stringify(learnedPatterns),
        lastCalculated: new Date(),
      },
    });
  }

  async getLearnedPatterns(userId: string): Promise<StylePattern[]> {
    const rating = await db.aIStyleRating.findUnique({ where: { userId } });
    if (!rating?.learnedPatterns) return [];
    return JSON.parse(rating.learnedPatterns);
  }

  async getRecommendations(userId: string): Promise<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }> {
    const { overallRating, components } = await this.getRating(userId);
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    if (components.toneMatch >= 80) {
      strengths.push('AI отлично понимает ваш тон общения');
    } else if (components.toneMatch < 50) {
      weaknesses.push('AI пока плохо понимает ваш тон');
      suggestions.push('Попробуйте чаще исправлять тон в генерируемом контенте');
    }

    if (components.styleMatch >= 80) {
      strengths.push('Стиль контента соответствует вашим ожиданиям');
    } else if (components.styleMatch < 50) {
      weaknesses.push('Стиль генерации требует доработки');
      suggestions.push('Укажите больше примеров вашего стиля в настройках');
    }

    if (components.audienceMatch >= 80) {
      strengths.push('AI хорошо понимает вашу аудиторию');
    } else if (components.audienceMatch < 50) {
      weaknesses.push('Понимание аудитории требует улучшения');
      suggestions.push('Добавьте больше информации о вашей целевой аудитории');
    }

    if (components.timingMatch >= 80) {
      strengths.push('Время публикаций оптимизировано');
    } else if (components.timingMatch < 50) {
      weaknesses.push('Тайминг публикаций можно улучшить');
      suggestions.push('Публикуйте в разное время и отмечайте успешные посты');
    }

    return { strengths, weaknesses, suggestions };
  }

  async resetRating(userId: string): Promise<void> {
    await db.aIStyleRating.update({
      where: { userId },
      data: {
        overallRating: 0, toneMatch: 0, styleMatch: 0, audienceMatch: 0, timingMatch: 0,
        totalEdits: 0, positiveEdits: 0, learnedPatterns: null, lastCalculated: new Date(),
      },
    });
  }

  async getDailyReport(userId: string): Promise<{
    rating: number;
    message: string;
    improvement: number;
    editsToday: number;
  }> {
    const rating = await this.getRating(userId);
    const improvement = rating.overallRating > 50 ? Math.min(10, Math.round((rating.overallRating - 50) / 5)) : 0;

    const ratingRecord = await db.aIStyleRating.findUnique({ where: { userId } });

    return {
      rating: rating.overallRating,
      message: rating.message,
      improvement,
      editsToday: ratingRecord?.totalEdits || 0,
    };
  }

  private generateRatingMessage(rating: number, components: StyleRatingComponents): string {
    if (rating >= 90) return `Отлично! AI понимает вас на ${rating}%. Вы отлично работаете вместе!`;
    if (rating >= 75) return `Хорошо! AI понимает вас на ${rating}%. Продолжайте давать обратную связь.`;
    if (rating >= 50) return `Неплохо! AI понимает вас на ${rating}%. Есть куда расти.`;
    if (rating >= 25) return `AI пока плохо понимает ваш стиль (${rating}%). Больше обратной связи поможет.`;
    return `AI только начинает учиться вашему стилю (${rating}%). Это нормально!`;
  }

  private async analyzePattern(original: string, edited: string | undefined, accepted: boolean): Promise<StylePattern | null> {
    if (!edited || accepted) return null;

    const originalWords = original.toLowerCase().split(/\s+/);
    const editedWords = edited.toLowerCase().split(/\s+/);
    const added = editedWords.filter(w => !originalWords.includes(w));

    if (added.length > 0) {
      return {
        pattern: `Добавляет: ${added.slice(0, 5).join(', ')}`,
        frequency: 1,
        success: accepted ? 1 : 0,
        category: 'vocabulary',
      };
    }

    return null;
  }

  private async updateLearnedPatterns(existingPatterns: string | null, newPattern: StylePattern | null): Promise<StylePattern[]> {
    if (!newPattern) return existingPatterns ? JSON.parse(existingPatterns) : [];

    const patterns: StylePattern[] = existingPatterns ? JSON.parse(existingPatterns) : [];
    const existingIndex = patterns.findIndex(p => p.pattern === newPattern.pattern && p.category === newPattern.category);

    if (existingIndex >= 0) {
      patterns[existingIndex].frequency += 1;
      patterns[existingIndex].success += newPattern.success;
    } else {
      patterns.push(newPattern);
    }

    return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 50);
  }

  private async recalculateComponents(userId: string, feedback: StyleFeedback, currentRating: any): Promise<StyleRatingComponents> {
    const weight = 0.1;
    const rating = feedback.rating || (feedback.accepted ? 4 : 2);
    const normalizedRating = (rating / 5) * 100;

    return {
      toneMatch: Math.round(currentRating.toneMatch * (1 - weight) + normalizedRating * weight),
      styleMatch: Math.round(currentRating.styleMatch * (1 - weight) + normalizedRating * weight),
      audienceMatch: Math.round(currentRating.audienceMatch * (1 - weight) + normalizedRating * weight),
      timingMatch: currentRating.timingMatch,
    };
  }
}

let styleRatingInstance: AIStyleRatingSystem | null = null;

export function getAIStyleRating(): AIStyleRatingSystem {
  if (!styleRatingInstance) {
    styleRatingInstance = new AIStyleRatingSystem();
  }
  return styleRatingInstance;
}

export const aiStyleRating = {
  getRating: (userId: string) => getAIStyleRating().getRating(userId),
  recordFeedback: (userId: string, feedback: StyleFeedback) => getAIStyleRating().recordFeedback(userId, feedback),
  getPatterns: (userId: string) => getAIStyleRating().getLearnedPatterns(userId),
  getRecommendations: (userId: string) => getAIStyleRating().getRecommendations(userId),
  reset: (userId: string) => getAIStyleRating().resetRating(userId),
  getDailyReport: (userId: string) => getAIStyleRating().getDailyReport(userId),
};
