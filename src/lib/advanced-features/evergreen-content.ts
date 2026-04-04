// Авто-обновление "вечнозелёного" контента
// Старые успешные посты (6+ месяцев) AI переписывает под современность

import { db } from '../db';
import { nanoid } from 'nanoid';

export interface EvergreenConfig {
  minAgeDays?: number; // Минимальный возраст поста (по умолчанию 180 дней)
  minViews?: number; // Минимальные просмотры для попадания в вечнозелёный
  updateIntervalDays?: number; // Интервал обновления
}

export interface EvergreenUpdate {
  postId: string;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
  }>;
}

class EvergreenContentService {
  // Найти кандидатов для обновления
  async findCandidates(config: EvergreenConfig = {}): Promise<any[]> {
    const minAgeDays = config.minAgeDays || 180;
    const minViews = config.minViews || 100;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minAgeDays);

    // Находим старые успешные посты
    const posts = await db.post.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        views: { gte: minViews },
        status: 'published',
      },
      orderBy: { views: 'desc' },
      take: 50,
    });

    // Проверяем, не обновлялись ли они недавно
    const existingEvergreen = await db.evergreenContent.findMany({
      where: {
        originalPostId: { in: posts.map(p => p.id) },
        lastUpdated: {
          gte: new Date(Date.now() - (config.updateIntervalDays || 180) * 24 * 60 * 60 * 1000),
        },
      },
    });

    const recentlyUpdated = new Set(existingEvergreen.map(e => e.originalPostId));

    return posts.filter(p => !recentlyUpdated.has(p.id));
  }

  // Обновить пост
  async updatePost(postId: string): Promise<EvergreenUpdate> {
    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new Error('Post not found');
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // Анализируем пост и предлагаем обновления
    const analysisPrompt = `Analyze this social media post and suggest updates to make it relevant for today:

Original post (from ${post.createdAt.toISOString().split('T')[0]}):
"${post.content}"

Platform: ${post.platform}
Original views: ${post.views}

Suggest updates for:
1. Current date references (replace old dates with current ones)
2. Outdated statistics or numbers (update with recent data)
3. Old links (suggest new relevant links)
4. Trending topics to reference
5. Modern slang or terminology

Respond in JSON format:
{
  "updates": [
    {
      "field": "content",
      "oldValue": "text to replace",
      "newValue": "updated text",
      "reason": "why this change"
    }
  ],
  "modernizedContent": "Full updated post text",
  "keyChanges": ["summary of main changes"]
}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a social media content expert specializing in content modernization.' },
        { role: 'user', content: analysisPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';

    let changes: EvergreenUpdate['changes'] = [];
    let modernizedContent = post.content;

    try {
      const parsed = JSON.parse(content);
      changes = parsed.updates || [];
      modernizedContent = parsed.modernizedContent || post.content;
    } catch {
      // Если не удалось распарсить, оставляем как есть
    }

    // Создаём запись об обновлении
    const evergreen = await db.evergreenContent.create({
      data: {
        id: nanoid(),
        originalPostId: postId,
        originalContent: post.content,
        originalMetrics: JSON.stringify({ views: post.views, likes: post.likes }),
        updatedContent: modernizedContent,
        changes: JSON.stringify(changes),
        status: 'updated',
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // через 6 месяцев
        updatedAt: new Date(),
      },
    });

    return {
      postId,
      changes,
    };
  }

  // Опубликовать обновлённую версию
  async publishUpdate(evergreenId: string): Promise<{ newPostId: string }> {
    const evergreen = await db.evergreenContent.findUnique({
      where: { id: evergreenId },
    });

    if (!evergreen || !evergreen.updatedContent) {
      throw new Error('Evergreen content not found or not updated');
    }

    const originalPost = await db.post.findUnique({
      where: { id: evergreen.originalPostId },
    });

    if (!originalPost) {
      throw new Error('Original post not found');
    }

    // Создаём новый пост с обновлённым контентом
    const newPost = await db.post.create({
      data: {
        id: nanoid(),
        platform: originalPost.platform,
        content: evergreen.updatedContent,
        aiGenerated: true,
        aiPrompt: `Evergreen update of post ${evergreen.originalPostId}`,
        status: 'draft',
        influencerId: originalPost.influencerId,
        campaignId: originalPost.campaignId,
        updatedAt: new Date(),
      },
    });

    // Обновляем статус
    await db.evergreenContent.update({
      where: { id: evergreenId },
      data: { status: 'published' },
    });

    return { newPostId: newPost.id };
  }

  // Автоматическое обновление всех кандидатов
  async autoUpdateAll(config: EvergreenConfig = {}): Promise<{
    processed: number;
    updated: number;
    errors: string[];
  }> {
    const candidates = await this.findCandidates(config);
    const errors: string[] = [];
    let updated = 0;

    for (const post of candidates) {
      try {
        await this.updatePost(post.id);
        updated++;
      } catch (error) {
        errors.push(`Post ${post.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      processed: candidates.length,
      updated,
      errors,
    };
  }

  // Получить статистику вечнозелёного контента
  async getStats(): Promise<{
    totalEvergreen: number;
    avgPerformanceImprovement: number;
    topPerformers: any[];
  }> {
    const evergreen = await db.evergreenContent.findMany({
      where: { status: 'published' },
    });

    const totalEvergreen = evergreen.length;
    
    // Рассчитываем среднее улучшение производительности
    let totalImprovement = 0;
    const performers: any[] = [];

    for (const e of evergreen) {
      if (e.performanceDiff) {
        totalImprovement += e.performanceDiff;
      }
      
      if (e.originalMetrics) {
        const original = JSON.parse(e.originalMetrics);
        performers.push({
          id: e.id,
          originalViews: original.views || 0,
          improvement: e.performanceDiff || 0,
        });
      }
    }

    const avgPerformanceImprovement = totalEvergreen > 0 ? totalImprovement / totalEvergreen : 0;
    const topPerformers = performers
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 10);

    return {
      totalEvergreen,
      avgPerformanceImprovement,
      topPerformers,
    };
  }

  // Получить список обновлённого контента
  async getUpdatedContent(limit: number = 20): Promise<any[]> {
    return db.evergreenContent.findMany({
      orderBy: { lastUpdated: 'desc' },
      take: limit,
    });
  }
}

let evergreenInstance: EvergreenContentService | null = null;

export function getEvergreenService(): EvergreenContentService {
  if (!evergreenInstance) {
    evergreenInstance = new EvergreenContentService();
  }
  return evergreenInstance;
}

export const evergreenContent = {
  findCandidates: (config?: EvergreenConfig) => getEvergreenService().findCandidates(config),
  updatePost: (postId: string) => getEvergreenService().updatePost(postId),
  publishUpdate: (evergreenId: string) => getEvergreenService().publishUpdate(evergreenId),
  autoUpdateAll: (config?: EvergreenConfig) => getEvergreenService().autoUpdateAll(config),
  getStats: () => getEvergreenService().getStats(),
  list: (limit?: number) => getEvergreenService().getUpdatedContent(limit),
};
