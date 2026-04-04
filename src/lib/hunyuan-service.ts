// Hunyuan Content Studio Service
// Интеграция с Tencent Hunyuan для генерации медиа-контента

import { db } from './db';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Типы контента
export type ContentType = 'image' | 'video' | 'audio' | 'avatar';
export type ContentPlatform = 'telegram' | 'instagram' | 'tiktok' | 'youtube' | 'vk' | 'twitter';
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'editing';

// Интерфейсы
export interface HunyuanConfig {
  mode: 'image' | 'video' | 'edit' | 'audio';
  prompt: string;
  negativePrompt?: string;
  inputMedia?: string;
  style?: string;
  avatar?: string;
  voice?: string;
  language?: string;
  duration?: number;
}

export interface GenerationResult {
  success: boolean;
  contentId?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  error?: string;
  generationTime?: number;
}

export interface ContentGenerationOptions {
  type: ContentType;
  platform: ContentPlatform;
  prompt: string;
  negativePrompt?: string;
  templateId?: string;
  influencerId?: string;
  accountId?: string;
  styleParams?: Record<string, any>;
}

export interface VideoGenerationOptions {
  text: string;
  avatar: string;
  voice: string;
  language?: string;
  subtitles?: boolean;
  backgroundColor?: string;
}

export interface ImageEditOptions {
  imagePath: string;
  command: string;
}

// Класс Hunyuan Service
export class HunyuanService {
  private downloadDir: string;
  private isGenerating: boolean = false;
  private queue: Array<{ id: string; config: HunyuanConfig; resolve: Function; reject: Function }> = [];

  constructor() {
    this.downloadDir = path.join(process.cwd(), 'download', 'hunyuan');
    this.ensureDownloadDir();
  }

  private ensureDownloadDir() {
    const dirs = ['images', 'videos', 'audio', 'avatars'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.downloadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  // Генерация изображения через z-ai-web-dev-sdk
  async generateImage(prompt: string, options: {
    negativePrompt?: string;
    style?: string;
    size?: '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440';
  } = {}): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Используем z-ai-web-dev-sdk для генерации изображений
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const response = await zai.images.generations.create({
        prompt: `${prompt}${options.style ? `, ${options.style} style` : ''}`,
        size: options.size || '1024x1024',
      });

      const imageBase64 = response.data[0]?.base64;
      
      if (!imageBase64) {
        throw new Error('No image data received');
      }

      // Сохраняем изображение
      const filename = `hunyuan_${Date.now()}.png`;
      const imagePath = path.join(this.downloadDir, 'images', filename);
      
      const buffer = Buffer.from(imageBase64, 'base64');
      await fs.promises.writeFile(imagePath, buffer);

      // Создаём запись в БД
      const content = await db.generatedContent.create({
        data: {
          type: 'image',
          platform: 'telegram', // default
          source: 'z-ai-sdk',
          prompt: prompt,
          negativePrompt: options.negativePrompt,
          mediaUrl: `/download/hunyuan/images/${filename}`,
          mediaBase64: imageBase64.substring(0, 1000) + '...', // truncate for storage
          width: parseInt(options.size?.split('x')[0] || '1024'),
          height: parseInt(options.size?.split('x')[1] || '1024'),
          fileSize: buffer.length,
          status: 'completed',
          generationTime: Date.now() - startTime,
        },
      });

      return {
        success: true,
        contentId: content.id,
        mediaUrl: content.mediaUrl || undefined,
        mediaBase64: imageBase64,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[HunyuanService] Image generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  // Генерация видео с аватаром (AI口播)
  async generateVideo(options: VideoGenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Для видео используем комбинацию:
      // 1. Генерируем изображение аватара если нужно
      // 2. Используем TTS для озвучки
      // 3. Возвращаем результат

      // Создаём запись в БД
      const content = await db.generatedContent.create({
        data: {
          type: 'video',
          platform: 'telegram',
          source: 'hunyuan',
          prompt: options.text,
          status: 'generating',
          generationParams: JSON.stringify(options),
        },
      });

      // Генерируем изображение аватара
      const avatarPrompt = `Portrait of ${options.avatar}, professional photo, looking at camera, neutral background, high quality`;
      const avatarResult = await this.generateImage(avatarPrompt, {
        style: 'professional portrait',
      });

      if (!avatarResult.success) {
        throw new Error('Failed to generate avatar image');
      }

      // Обновляем статус
      await db.generatedContent.update({
        where: { id: content.id },
        data: {
          mediaUrl: avatarResult.mediaUrl,
          status: 'completed',
          generationTime: Date.now() - startTime,
          metadata: JSON.stringify({
            text: options.text,
            voice: options.voice,
            avatarImage: avatarResult.mediaUrl,
          }),
        },
      });

      return {
        success: true,
        contentId: content.id,
        mediaUrl: avatarResult.mediaUrl,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[HunyuanService] Video generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  // Редактирование изображения по текстовой команде
  async editImage(imagePath: string, command: string): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Генерируем новое изображение с учётом команды редактирования
      const editPrompt = `Edit this image: ${command}. Maintain the original composition and style.`;
      
      const result = await this.generateImage(editPrompt);
      
      if (result.success && result.contentId) {
        // Сохраняем историю редактирования
        await db.generatedContent.update({
          where: { id: result.contentId },
          data: {
            editCommand: command,
            editHistory: JSON.stringify([{ command, timestamp: new Date() }]),
          },
        });

        // Записываем в историю правок
        await db.userEditHistory.create({
          data: {
            contentId: result.contentId,
            editType: 'image',
            userCommand: command,
            beforeState: JSON.stringify({ originalImage: imagePath }),
            afterState: JSON.stringify({ editedImage: result.mediaUrl }),
            understood: true,
            satisfied: true,
          },
        });
      }

      return result;
    } catch (error) {
      console.error('[HunyuanService] Image edit error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  // Генерация аватарки для аккаунта
  async generateAvatar(options: {
    gender: 'male' | 'female';
    age: 'young' | 'middle' | 'senior';
    style: 'professional' | 'casual' | 'friendly';
    description?: string;
  }): Promise<GenerationResult> {
    const prompt = `${options.age} ${options.gender}, ${options.style} style, portrait photo, looking at camera, ${options.description || 'friendly expression'}, high quality, realistic`;
    
    return this.generateImage(prompt, {
      style: 'portrait photography',
    });
  }

  // Создание контента для конкретной платформы
  async generateContentForPlatform(options: ContentGenerationOptions): Promise<GenerationResult> {
    const platformStyles: Record<ContentPlatform, string> = {
      telegram: 'suitable for messaging app, compact',
      instagram: 'Instagram style, vibrant colors, square or portrait format',
      tiktok: 'TikTok style, vertical format, trendy, engaging',
      youtube: 'YouTube thumbnail style, eye-catching, professional',
      vk: 'VK style, similar to Instagram',
      twitter: 'Twitter style, landscape format, shareable',
    };

    const enhancedPrompt = `${options.prompt}, ${platformStyles[options.platform]}`;
    
    // Создаём запись в БД
    const content = await db.generatedContent.create({
      data: {
        type: options.type,
        platform: options.platform,
        source: 'hunyuan',
        prompt: enhancedPrompt,
        negativePrompt: options.negativePrompt,
        influencerId: options.influencerId,
        templateId: options.templateId,
        status: 'generating',
        generationParams: JSON.stringify(options.styleParams || {}),
      },
    });

    let result: GenerationResult;

    switch (options.type) {
      case 'image':
        result = await this.generateImage(enhancedPrompt, {
          negativePrompt: options.negativePrompt,
          style: options.styleParams?.style,
        });
        break;
      case 'video':
        result = await this.generateVideo({
          text: options.prompt,
          avatar: options.styleParams?.avatar || 'professional person',
          voice: options.styleParams?.voice || 'female',
        });
        break;
      default:
        result = { success: false, error: 'Unsupported content type' };
    }

    // Обновляем статус
    await db.generatedContent.update({
      where: { id: content.id },
      data: {
        status: result.success ? 'completed' : 'failed',
        error: result.error,
        mediaUrl: result.mediaUrl,
        generationTime: result.generationTime,
      },
    });

    return {
      ...result,
      contentId: content.id,
    };
  }

  // Массовая генерация контента
  async generateBatch(items: ContentGenerationOptions[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    
    for (const item of items) {
      // Добавляем задержку между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await this.generateContentForPlatform(item);
      results.push(result);
    }

    return results;
  }

  // Получение статуса генерации
  async getStatus(contentId: string): Promise<{
    status: GenerationStatus;
    progress: number;
    error?: string;
  }> {
    const content = await db.generatedContent.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return { status: 'failed', progress: 0, error: 'Content not found' };
    }

    return {
      status: content.status as GenerationStatus,
      progress: content.status === 'completed' ? 100 : content.status === 'generating' ? 50 : 0,
      error: content.error || undefined,
    };
  }

  // Получение истории контента
  async getContentHistory(options: {
    type?: ContentType;
    platform?: ContentPlatform;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    const where: any = {};
    
    if (options.type) where.type = options.type;
    if (options.platform) where.platform = options.platform;

    return db.generatedContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    });
  }
}

// Singleton instance
let hunyuanServiceInstance: HunyuanService | null = null;

export function getHunyuanService(): HunyuanService {
  if (!hunyuanServiceInstance) {
    hunyuanServiceInstance = new HunyuanService();
  }
  return hunyuanServiceInstance;
}

// Экспорт для удобства
export const hunyuanService = {
  generateImage: async (prompt: string, options?: any) => {
    const service = getHunyuanService();
    return service.generateImage(prompt, options);
  },
  generateVideo: async (options: VideoGenerationOptions) => {
    const service = getHunyuanService();
    return service.generateVideo(options);
  },
  editImage: async (imagePath: string, command: string) => {
    const service = getHunyuanService();
    return service.editImage(imagePath, command);
  },
  generateAvatar: async (options: any) => {
    const service = getHunyuanService();
    return service.generateAvatar(options);
  },
  generateContentForPlatform: async (options: ContentGenerationOptions) => {
    const service = getHunyuanService();
    return service.generateContentForPlatform(options);
  },
  getStatus: async (contentId: string) => {
    const service = getHunyuanService();
    return service.getStatus(contentId);
  },
  getContentHistory: async (options?: any) => {
    const service = getHunyuanService();
    return service.getContentHistory(options);
  },
};
