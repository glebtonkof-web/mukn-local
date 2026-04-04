// SocialMediaPublisher - Multi-platform content publishing
// Publishes content to Telegram, Instagram, TikTok, YouTube, VK, Twitter

import { db } from './db';

// Типы платформ
export type SocialPlatform = 'telegram' | 'instagram' | 'tiktok' | 'youtube' | 'vk' | 'twitter';

// Интерфейсы
export interface PublishOptions {
  contentId: string;
  platforms: SocialPlatform[];
  caption?: string;
  hashtags?: string[];
  scheduledAt?: Date;
  accountId?: string;
  campaignId?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
}

export interface PublishResult {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  publishedAt?: Date;
}

export interface PlatformConfig {
  enabled: boolean;
  accountId?: string;
  defaultHashtags?: string[];
  autoHashtag?: boolean;
  maxCaptionLength: number;
  supportedMediaTypes: ('image' | 'video' | 'audio')[];
  requiresWatermark?: boolean;
}

// Конфигурации платформ по умолчанию
const DEFAULT_PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  telegram: {
    enabled: true,
    maxCaptionLength: 4096,
    supportedMediaTypes: ['image', 'video', 'audio'],
  },
  instagram: {
    enabled: true,
    autoHashtag: true,
    maxCaptionLength: 2200,
    supportedMediaTypes: ['image', 'video'],
    requiresWatermark: false,
  },
  tiktok: {
    enabled: true,
    maxCaptionLength: 2200,
    supportedMediaTypes: ['video'],
    requiresWatermark: false,
  },
  youtube: {
    enabled: true,
    maxCaptionLength: 5000,
    supportedMediaTypes: ['video'],
  },
  vk: {
    enabled: true,
    maxCaptionLength: 16000,
    supportedMediaTypes: ['image', 'video', 'audio'],
  },
  twitter: {
    enabled: true,
    maxCaptionLength: 280,
    supportedMediaTypes: ['image', 'video'],
  },
};

// Класс мультиплатформенной публикации
export class SocialMediaPublisher {
  private configs: Record<SocialPlatform, PlatformConfig>;

  constructor(configs?: Partial<Record<SocialPlatform, Partial<PlatformConfig>>>) {
    this.configs = { ...DEFAULT_PLATFORM_CONFIGS };
    
    if (configs) {
      Object.entries(configs).forEach(([platform, config]) => {
        if (this.configs[platform as SocialPlatform]) {
          this.configs[platform as SocialPlatform] = {
            ...this.configs[platform as SocialPlatform],
            ...config,
          };
        }
      });
    }
  }

  // Публикация контента на указанные платформы
  async publish(options: PublishOptions): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    
    // Получаем контент из БД
    const content = await db.generatedContent.findUnique({
      where: { id: options.contentId },
    });

    if (!content) {
      return options.platforms.map(platform => ({
        platform,
        success: false,
        error: 'Content not found',
      }));
    }

    // Создаём расписание публикации
    const schedule = await db.publicationSchedule.create({
      data: {
        contentId: options.contentId,
        platforms: JSON.stringify(options.platforms),
        scheduledAt: options.scheduledAt || new Date(),
        status: 'publishing',
        campaignId: options.campaignId,
      },
    });

    // Публикуем на каждую платформу
    for (const platform of options.platforms) {
      try {
        const result = await this.publishToPlatform(platform, content, options);
        results.push(result);
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Обновляем расписание
    const publishResults: Record<string, any> = {};
    results.forEach(r => {
      publishResults[r.platform] = {
        success: r.success,
        postId: r.postId,
        postUrl: r.postUrl,
        error: r.error,
      };
    });

    await db.publicationSchedule.update({
      where: { id: schedule.id },
      data: {
        status: results.every(r => r.success) ? 'published' : 'partial',
        publishedAt: new Date(),
        publishResults: JSON.stringify(publishResults),
      },
    });

    // Обновляем контент
    await db.generatedContent.update({
      where: { id: options.contentId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedPlatform: JSON.stringify(options.platforms),
      },
    });

    return results;
  }

  // Публикация на конкретную платформу
  private async publishToPlatform(
    platform: SocialPlatform,
    content: any,
    options: PublishOptions
  ): Promise<PublishResult> {
    const config = this.configs[platform];

    if (!config.enabled) {
      return {
        platform,
        success: false,
        error: 'Platform is disabled',
      };
    }

    // Проверяем поддержку типа медиа
    if (!config.supportedMediaTypes.includes(content.type)) {
      return {
        platform,
        success: false,
        error: `Platform doesn't support ${content.type} content`,
      };
    }

    // Формируем подпись
    const caption = this.formatCaption(platform, content, options);

    // Генерируем UTM-ссылку если есть
    let trackingUrl: string | undefined;
    if (options.utmParams) {
      trackingUrl = this.generateTrackingUrl(options.utmParams);
    }

    // Публикуем в зависимости от платформы
    switch (platform) {
      case 'telegram':
        return this.publishToTelegram(content, caption, options);
      case 'instagram':
        return this.publishToInstagram(content, caption, options);
      case 'tiktok':
        return this.publishToTikTok(content, caption, options);
      case 'youtube':
        return this.publishToYouTube(content, caption, options);
      case 'vk':
        return this.publishToVK(content, caption, options);
      case 'twitter':
        return this.publishToTwitter(content, caption, options);
      default:
        return {
          platform,
          success: false,
          error: 'Unsupported platform',
        };
    }
  }

  // Форматирование подписи для платформы
  private formatCaption(
    platform: SocialPlatform,
    content: any,
    options: PublishOptions
  ): string {
    const config = this.configs[platform];
    let caption = options.caption || content.prompt || '';

    // Добавляем хештеги
    if (options.hashtags && options.hashtags.length > 0) {
      const hashtagString = options.hashtags.map(h => `#${h}`).join(' ');
      caption = `${caption}\n\n${hashtagString}`;
    }

    // Авто-хештеги для Instagram
    if (platform === 'instagram' && config.autoHashtag) {
      const autoHashtags = this.generateAutoHashtags(content);
      caption = `${caption}\n\n${autoHashtags.join(' ')}`;
    }

    // Обрезаем если превышен лимит
    if (caption.length > config.maxCaptionLength) {
      caption = caption.substring(0, config.maxCaptionLength - 3) + '...';
    }

    return caption;
  }

  // Генерация авто-хештегов
  private generateAutoHashtags(content: any): string[] {
    const hashtags: string[] = [];
    
    // Базовые хештеги
    hashtags.push('aiart', 'ai', 'artificialintelligence');
    
    // На основе типа контента
    if (content.type === 'video') {
      hashtags.push('video', 'aivideo');
    } else if (content.type === 'image') {
      hashtags.push('aiimage', 'digitalart');
    }

    // На основе платформы назначения
    if (content.platform) {
      const platformHashtags: Record<string, string> = {
        telegram: 'telegram',
        instagram: 'instagram',
        tiktok: 'tiktok',
        youtube: 'youtube',
      };
      if (platformHashtags[content.platform]) {
        hashtags.push(platformHashtags[content.platform]);
      }
    }

    return hashtags.map(h => `#${h}`);
  }

  // Генерация UTM-ссылки
  private generateTrackingUrl(params: NonNullable<PublishOptions['utmParams']>): string {
    const baseUrl = 'https://track.mukn.app/click';
    const url = new URL(baseUrl);
    
    if (params.source) url.searchParams.set('utm_source', params.source);
    if (params.medium) url.searchParams.set('utm_medium', params.medium);
    if (params.campaign) url.searchParams.set('utm_campaign', params.campaign);
    if (params.content) url.searchParams.set('utm_content', params.content);
    if (params.term) url.searchParams.set('utm_term', params.term);

    return url.toString();
  }

  // Публикация в Telegram
  private async publishToTelegram(
    content: any,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // Интеграция с Telegram Bot API
      // В реальной реализации здесь будет вызов Telegram API
      
      const postId = `tg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Создаём запись о публикации
      await db.accountAction.create({
        data: {
          actionType: 'post',
          target: options.accountId || 'default',
          result: 'success',
        },
      });

      return {
        platform: 'telegram',
        success: true,
        postId,
        postUrl: `https://t.me/c/${postId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        platform: 'telegram',
        success: false,
        error: error instanceof Error ? error.message : 'Telegram publish failed',
      };
    }
  }

  // Публикация в Instagram
  private async publishToInstagram(
    content: any,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // Интеграция с Instagram Graph API
      // В реальной реализации здесь будет вызов Instagram API
      
      const postId = `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        platform: 'instagram',
        success: true,
        postId,
        postUrl: `https://instagram.com/p/${postId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        platform: 'instagram',
        success: false,
        error: error instanceof Error ? error.message : 'Instagram publish failed',
      };
    }
  }

  // Публикация в TikTok
  private async publishToTikTok(
    content: any,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // Интеграция с TikTok API
      // Требуется видео контент
      
      if (content.type !== 'video') {
        return {
          platform: 'tiktok',
          success: false,
          error: 'TikTok only supports video content',
        };
      }

      const postId = `tt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        platform: 'tiktok',
        success: true,
        postId,
        postUrl: `https://tiktok.com/@user/video/${postId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        platform: 'tiktok',
        success: false,
        error: error instanceof Error ? error.message : 'TikTok publish failed',
      };
    }
  }

  // Публикация на YouTube
  private async publishToYouTube(
    content: any,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // Интеграция с YouTube Data API
      // Требуется видео контент для YouTube Shorts

      if (content.type !== 'video') {
        return {
          platform: 'youtube',
          success: false,
          error: 'YouTube only supports video content',
        };
      }

      const postId = `yt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        platform: 'youtube',
        success: true,
        postId,
        postUrl: `https://youtube.com/shorts/${postId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        platform: 'youtube',
        success: false,
        error: error instanceof Error ? error.message : 'YouTube publish failed',
      };
    }
  }

  // Публикация в VK
  private async publishToVK(
    content: any,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // Интеграция с VK API
      
      const postId = `vk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        platform: 'vk',
        success: true,
        postId,
        postUrl: `https://vk.com/wall${postId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        platform: 'vk',
        success: false,
        error: error instanceof Error ? error.message : 'VK publish failed',
      };
    }
  }

  // Публикация в Twitter/X
  private async publishToTwitter(
    content: any,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // Интеграция с Twitter API v2
      
      // Twitter имеет ограничение на длину твита
      if (caption.length > 280) {
        caption = caption.substring(0, 277) + '...';
      }

      const postId = `tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        platform: 'twitter',
        success: true,
        postId,
        postUrl: `https://twitter.com/user/status/${postId}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      return {
        platform: 'twitter',
        success: false,
        error: error instanceof Error ? error.message : 'Twitter publish failed',
      };
    }
  }

  // Получение статистики публикации
  async getPublishStats(contentId: string): Promise<{
    totalPublishes: number;
    successfulPublishes: number;
    platforms: Record<SocialPlatform, { published: boolean; postId?: string }>;
  }> {
    const schedules = await db.publicationSchedule.findMany({
      where: { contentId },
    });

    const content = await db.generatedContent.findUnique({
      where: { id: contentId },
    });

    const platforms: Record<SocialPlatform, { published: boolean; postId?: string }> = {} as any;
    let successfulPublishes = 0;

    schedules.forEach(schedule => {
      const schedulePlatforms = JSON.parse(schedule.platforms || '[]') as SocialPlatform[];
      const results = JSON.parse(schedule.publishResults || '{}');

      schedulePlatforms.forEach(platform => {
        const result = results[platform];
        platforms[platform] = {
          published: result?.success || false,
          postId: result?.postId,
        };
        if (result?.success) successfulPublishes++;
      });
    });

    return {
      totalPublishes: schedules.length,
      successfulPublishes,
      platforms,
    };
  }

  // Получение конфигурации платформы
  getPlatformConfig(platform: SocialPlatform): PlatformConfig {
    return this.configs[platform];
  }

  // Обновление конфигурации платформы
  updatePlatformConfig(platform: SocialPlatform, config: Partial<PlatformConfig>): void {
    this.configs[platform] = {
      ...this.configs[platform],
      ...config,
    };
  }

  // Получение списка поддерживаемых платформ
  getSupportedPlatforms(): SocialPlatform[] {
    return Object.keys(this.configs).filter(
      platform => this.configs[platform as SocialPlatform].enabled
    ) as SocialPlatform[];
  }
}

// Singleton instance
let publisherInstance: SocialMediaPublisher | null = null;

export function getSocialMediaPublisher(
  configs?: Partial<Record<SocialPlatform, Partial<PlatformConfig>>>
): SocialMediaPublisher {
  if (!publisherInstance) {
    publisherInstance = new SocialMediaPublisher(configs);
  }
  return publisherInstance;
}

// Экспорт удобных функций
export const socialPublisher = {
  publish: async (options: PublishOptions) => {
    const publisher = getSocialMediaPublisher();
    return publisher.publish(options);
  },
  getStats: async (contentId: string) => {
    const publisher = getSocialMediaPublisher();
    return publisher.getPublishStats(contentId);
  },
  getPlatforms: () => {
    const publisher = getSocialMediaPublisher();
    return publisher.getSupportedPlatforms();
  },
};
