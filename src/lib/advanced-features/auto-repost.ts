// Авто-репост из чужих каналов
// Софт находит вирусный пост, переписывает + меняет картинку

import { db } from '../db';
import { nanoid } from 'nanoid';

export interface RepostSource {
  type: 'channel' | 'keyword' | 'competitor';
  id?: string;
  url?: string;
}

export interface RepostConfig {
  source: RepostSource;
  keywords?: string[];
  minViews?: number;
  minEngagement?: number;
  rewriteContent?: boolean;
  generateNewImage?: boolean;
  targetPlatform: string;
  targetChannelId?: string;
}

export interface ViralPost {
  id: string;
  sourceUrl: string;
  sourceChannel: string;
  originalContent: string;
  originalViews: number;
  originalEngagement: number;
  publishedAt: Date;
}

class AutoRepostService {
  // Найти вирусные посты
  async findViralPosts(config: RepostConfig): Promise<ViralPost[]> {
    // В реальной реализации здесь был бы парсинг каналов
    // Для демонстрации возвращаем мок-данные
    const minViews = config.minViews || 10000;
    const minEngagement = config.minEngagement || 0.05;

    // TODO: Implement actual channel parsing via Telegram API
    const viralPosts: ViralPost[] = [];

    return viralPosts.filter(post => 
      post.originalViews >= minViews && 
      (post.originalEngagement / post.originalViews) >= minEngagement
    );
  }

  // Переписать и адаптировать контент
  async adaptContent(originalContent: string, options: {
    preserveStyle?: boolean;
    newKeywords?: string[];
    platform?: string;
  } = {}): Promise<string> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const prompt = `Rewrite this viral social media post to make it unique while preserving its engaging qualities:

Original post:
"${originalContent}"

Requirements:
- Keep the core message and value
- Change wording and structure
- Make it feel fresh and original
- ${options.newKeywords ? `Incorporate these keywords: ${options.newKeywords.join(', ')}` : ''}
- Optimize for ${options.platform || 'general'} platform
- Keep it engaging and shareable

Return only the rewritten post text.`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a content rewriting expert specializing in creating unique viral content.' },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0]?.message?.content || originalContent;
  }

  // Сгенерировать новое изображение
  async generateNewImage(originalPrompt: string): Promise<string> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: `${originalPrompt}, modern style, high quality, social media optimized`,
      size: '1024x1024',
    });

    const base64 = response.data[0]?.base64;
    if (!base64) {
      throw new Error('Failed to generate image');
    }

    return `data:image/png;base64,${base64}`;
  }

  // Выполнить авто-репост
  async repost(config: RepostConfig): Promise<{
    id: string;
    adaptedContent: string;
    newImageUrl?: string;
    status: string;
  }> {
    // Находим вирусный пост
    const viralPosts = await this.findViralPosts(config);
    if (viralPosts.length === 0) {
      throw new Error('No viral posts found matching criteria');
    }

    // Выбираем лучший пост
    const selectedPost = viralPosts[0];

    // Создаём запись
    const autoRepost = await db.autoRepost.create({
      data: {
        id: nanoid(),
        sourceType: config.source.type,
        sourceId: config.source.id,
        sourceUrl: selectedPost.sourceUrl,
        keywords: config.keywords ? JSON.stringify(config.keywords) : null,
        minViews: config.minViews,
        minEngagement: config.minEngagement,
        rewriteContent: config.rewriteContent ?? true,
        generateNewImage: config.generateNewImage ?? true,
        targetChannelId: config.targetChannelId,
        targetPlatform: config.targetPlatform,
        status: 'active',
        repostsCount: 0,
        updatedAt: new Date(),
      },
    });

    let adaptedContent = selectedPost.originalContent;
    let newImageUrl: string | undefined;

    // Переписываем контент если нужно
    if (config.rewriteContent) {
      adaptedContent = await this.adaptContent(selectedPost.originalContent, {
        platform: config.targetPlatform,
      });
    }

    // Генерируем новое изображение если нужно
    if (config.generateNewImage) {
      try {
        newImageUrl = await this.generateNewImage(adaptedContent.substring(0, 200));
      } catch (error) {
        console.warn('[AutoRepost] Image generation failed:', error);
      }
    }

    // Обновляем статистику
    await db.autoRepost.update({
      where: { id: autoRepost.id },
      data: { repostsCount: { increment: 1 } },
    });

    return {
      id: autoRepost.id,
      adaptedContent,
      newImageUrl,
      status: 'completed',
    };
  }

  // Настроить мониторинг источников
  async setupMonitoring(config: RepostConfig): Promise<string> {
    const autoRepost = await db.autoRepost.create({
      data: {
        id: nanoid(),
        sourceType: config.source.type,
        sourceId: config.source.id,
        sourceUrl: config.source.url,
        keywords: config.keywords ? JSON.stringify(config.keywords) : null,
        minViews: config.minViews || 10000,
        minEngagement: config.minEngagement || 0.05,
        rewriteContent: config.rewriteContent ?? true,
        generateNewImage: config.generateNewImage ?? true,
        targetChannelId: config.targetChannelId,
        targetPlatform: config.targetPlatform,
        status: 'active',
        repostsCount: 0,
        updatedAt: new Date(),
      },
    });

    return autoRepost.id;
  }

  // Получить список настроенных репостов
  async getMonitoredSources(limit: number = 20): Promise<any[]> {
    return db.autoRepost.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Приостановить мониторинг
  async pauseMonitoring(id: string): Promise<void> {
    await db.autoRepost.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  // Возобновить мониторинг
  async resumeMonitoring(id: string): Promise<void> {
    await db.autoRepost.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  // Получить статистику
  async getStats(id: string): Promise<{
    repostsCount: number;
    avgPerformance: number;
    lastRepostAt: Date | null;
  }> {
    const repost = await db.autoRepost.findUnique({ where: { id } });
    
    return {
      repostsCount: repost?.repostsCount || 0,
      avgPerformance: repost?.avgPerformance || 0,
      lastRepostAt: repost?.updatedAt || null,
    };
  }
}

let autoRepostInstance: AutoRepostService | null = null;

export function getAutoRepost(): AutoRepostService {
  if (!autoRepostInstance) {
    autoRepostInstance = new AutoRepostService();
  }
  return autoRepostInstance;
}

export const autoRepost = {
  findViral: (config: RepostConfig) => getAutoRepost().findViralPosts(config),
  adapt: (content: string, options?: any) => getAutoRepost().adaptContent(content, options),
  repost: (config: RepostConfig) => getAutoRepost().repost(config),
  setupMonitoring: (config: RepostConfig) => getAutoRepost().setupMonitoring(config),
  getSources: (limit?: number) => getAutoRepost().getMonitoredSources(limit),
  pause: (id: string) => getAutoRepost().pauseMonitoring(id),
  resume: (id: string) => getAutoRepost().resumeMonitoring(id),
  getStats: (id: string) => getAutoRepost().getStats(id),
};
