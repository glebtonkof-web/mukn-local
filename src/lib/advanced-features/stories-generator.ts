// Авто-создание Stories-слайдов (5-10 слайдов с текстом и картинками)
// Для Instagram и Telegram

import { db } from '../db';
import { stockIntegration } from './stock-integration';

export interface StorySlide {
  order: number;
  imageUrl: string;
  text?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  duration?: number; // секунды
  backgroundColor?: string;
  textColor?: string;
}

export interface StoriesConfig {
  platform: 'instagram' | 'telegram';
  topic: string;
  style?: string;
  slidesCount?: number;
  includeText?: boolean;
  includeCta?: boolean;
  ctaText?: string;
}

class StoriesSlidesGenerator {
  // Создать серию Stories-слайдов
  async generate(config: StoriesConfig): Promise<{
    id: string;
    slides: StorySlide[];
    status: string;
  }> {
    const slidesCount = config.slidesCount || 5;
    const slides: StorySlide[] = [];

    // Создаём запись в БД
    const storiesRecord = await db.storiesSlides.create({
      data: {
        name: config.topic,
        platform: config.platform,
        slidesCount,
        slides: '[]',
        status: 'generating',
      },
    });

    try {
      // Генерируем контент для слайдов
      const slideContents = await this.generateSlideContents(config, slidesCount);

      // Для каждого слайда генерируем изображение
      for (let i = 0; i < slidesCount; i++) {
        const content = slideContents[i];
        
        // Получаем изображение из стоков или генерируем
        let imageUrl = '';
        try {
          const ZAI = (await import('z-ai-web-dev-sdk')).default;
          const zai = await ZAI.create();
          
          const imageResponse = await zai.images.generations.create({
            prompt: `${content.imagePrompt}, ${config.style || 'modern'} style, vertical format, suitable for stories`,
            size: '720x1440',
          });
          
          imageUrl = `data:image/png;base64,${imageResponse.data[0]?.base64}`;
        } catch {
          // Fallback на стоки
          const stockImage = await stockIntegration.getImageForKeywords(
            content.keywords,
            { orientation: 'portrait' }
          );
          imageUrl = stockImage?.thumbnailUrl || '';
        }

        slides.push({
          order: i + 1,
          imageUrl,
          text: content.text,
          textPosition: i === 0 ? 'top' : i === slidesCount - 1 ? 'bottom' : 'center',
          duration: 5,
          backgroundColor: '#000000',
          textColor: '#FFFFFF',
        });
      }

      // Добавляем CTA слайд если нужно
      if (config.includeCta && config.ctaText) {
        slides.push({
          order: slidesCount + 1,
          imageUrl: slides[slides.length - 1]?.imageUrl || '',
          text: config.ctaText,
          textPosition: 'center',
          duration: 8,
        });
      }

      // Обновляем запись
      await db.storiesSlides.update({
        where: { id: storiesRecord.id },
        data: {
          slides: JSON.stringify(slides),
          status: 'completed',
          slidesCount: slides.length,
        },
      });

      return {
        id: storiesRecord.id,
        slides,
        status: 'completed',
      };
    } catch (error) {
      await db.storiesSlides.update({
        where: { id: storiesRecord.id },
        data: { status: 'failed' },
      });

      throw error;
    }
  }

  // Генерация контента для слайдов
  private async generateSlideContents(config: StoriesConfig, count: number): Promise<Array<{
    imagePrompt: string;
    keywords: string[];
    text: string;
  }>> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const prompt = `Create content for ${count} story slides about "${config.topic}" for ${config.platform}.
    
Each slide should have:
- An image prompt for AI image generation (visual description)
- 3-5 keywords for stock image search as fallback
- Short text/caption (max 100 characters)

Format as JSON array:
[{
  "imagePrompt": "description of visual",
  "keywords": ["keyword1", "keyword2"],
  "text": "Short text for this slide"
}]

Make it engaging and suitable for ${config.platform} stories. Create a narrative flow from start to end.`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a social media content expert specializing in engaging stories.' },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '[]';

    try {
      // Извлекаем JSON из ответа
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Если не удалось распарсить, создаём простой контент
    }

    // Fallback контент
    return Array(count).fill(null).map((_, i) => ({
      imagePrompt: `${config.topic} related visual, slide ${i + 1}`,
      keywords: [config.topic, 'business', 'success'],
      text: `Slide ${i + 1}: ${config.topic}`,
    }));
  }

  // Получить созданные Stories
  async getStories(limit: number = 20): Promise<any[]> {
    return db.storiesSlides.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Получить конкретные Stories
  async getStoriesById(id: string): Promise<any | null> {
    const record = await db.storiesSlides.findUnique({ where: { id } });
    if (!record) return null;

    return {
      ...record,
      slides: JSON.parse(record.slides || '[]'),
    };
  }

  // Запланировать публикацию
  async schedulePublish(id: string, scheduledAt: Date): Promise<void> {
    await db.storiesSlides.update({
      where: { id },
      data: {
        scheduledAt,
        status: 'draft',
      },
    });
  }

  // Отметить как опубликованное
  async markPublished(id: string, metrics?: { views: number; exits: number; replies: number }): Promise<void> {
    await db.storiesSlides.update({
      where: { id },
      data: {
        publishedAt: new Date(),
        status: 'published',
        ...(metrics && {
          views: metrics.views,
          exits: metrics.exits,
          replies: metrics.replies,
        }),
      },
    });
  }
}

let storiesGeneratorInstance: StoriesSlidesGenerator | null = null;

export function getStoriesGenerator(): StoriesSlidesGenerator {
  if (!storiesGeneratorInstance) {
    storiesGeneratorInstance = new StoriesSlidesGenerator();
  }
  return storiesGeneratorInstance;
}

export const storiesSlides = {
  generate: (config: StoriesConfig) => getStoriesGenerator().generate(config),
  getStories: (limit?: number) => getStoriesGenerator().getStories(limit),
  getById: (id: string) => getStoriesGenerator().getStoriesById(id),
  schedule: (id: string, scheduledAt: Date) => getStoriesGenerator().schedulePublish(id, scheduledAt),
  markPublished: (id: string, metrics?: { views: number; exits: number; replies: number }) => 
    getStoriesGenerator().markPublished(id, metrics),
};
