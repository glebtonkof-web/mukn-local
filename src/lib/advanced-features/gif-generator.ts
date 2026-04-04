// Генерация GIF-анимации
// Hunyuan создаёт короткие зацикленные GIF (3-5 секунд)

import { db } from '../db';

export interface GIFConfig {
  prompt: string;
  duration?: number; // секунды (3-5)
  fps?: number;
  width?: number;
  height?: number;
  type?: 'animation' | 'sticker' | 'meme';
}

export interface GIFResult {
  id: string;
  gifUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  duration: number;
  frames: number;
}

class GIFGeneratorService {
  // Генерация GIF
  async generate(config: GIFConfig): Promise<GIFResult> {
    const duration = Math.min(Math.max(config.duration || 3, 1), 5); // 1-5 секунд
    const fps = config.fps || 15;
    const width = config.width || 512;
    const height = config.height || 512;

    // Создаём запись
    const gifRecord = await db.generatedGIF.create({
      data: {
        name: config.prompt.substring(0, 100),
        prompt: config.prompt,
        width,
        height,
        duration,
        fps,
        frames: duration * fps,
        type: config.type || 'animation',
        status: 'generating',
      },
    });

    try {
      // Генерируем изображения для кадров
      const frames = await this.generateFrames(config.prompt, Math.min(duration * fps, 30));

      // Создаём GIF
      const gifUrl = await this.createGIF(frames, { width, height, fps, duration });

      // Генерируем превью
      const thumbnailUrl = frames[0] || '';

      // Обновляем запись
      await db.generatedGIF.update({
        where: { id: gifRecord.id },
        data: {
          gifUrl,
          thumbnailUrl,
          status: 'completed',
          frames: frames.length,
        },
      });

      return {
        id: gifRecord.id,
        gifUrl,
        thumbnailUrl,
        width,
        height,
        duration,
        frames: frames.length,
      };
    } catch (error) {
      await db.generatedGIF.update({
        where: { id: gifRecord.id },
        data: {
          status: 'failed',
        },
      });

      throw error;
    }
  }

  // Генерация кадров
  private async generateFrames(prompt: string, frameCount: number): Promise<string[]> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const frames: string[] = [];
    const batchSize = 5;

    for (let i = 0; i < Math.min(frameCount, 15); i += batchSize) {
      const batch: Promise<{ data: { base64?: string }[] }>[] = [];
      for (let j = 0; j < batchSize && i + j < frameCount; j++) {
        const framePrompt = `${prompt}, animation frame ${i + j + 1}, consistent style, smooth transition`;
        batch.push(
          zai.images.generations.create({
            prompt: framePrompt,
            size: '1024x1024',
          })
        );
      }

      const results = await Promise.all(batch);
      results.forEach(result => {
        if (result.data[0]?.base64) {
          frames.push(`data:image/png;base64,${result.data[0].base64}`);
        }
      });

      // Небольшая задержка
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return frames;
  }

  // Создание GIF из кадров
  private async createGIF(
    frames: string[],
    options: { width: number; height: number; fps: number; duration: number }
  ): Promise<string> {
    // В реальной реализации здесь был бы код для создания GIF
    // Для простоты возвращаем первый кадр как "GIF"
    // В продакшене используйте библиотеку如 gif-encoder-2 или sharp

    if (frames.length === 0) {
      throw new Error('No frames to create GIF');
    }

    // Возвращаем первый кадр как placeholder
    // TODO: Implement actual GIF creation
    return frames[0];
  }

  // Получить GIF
  async getGIF(id: string): Promise<any | null> {
    return db.generatedGIF.findUnique({ where: { id } });
  }

  // Получить список GIF
  async getGIFs(limit: number = 20): Promise<any[]> {
    return db.generatedGIF.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Создать стикерпак для Telegram
  async createStickerPack(name: string, gifIds: string[]): Promise<{ packUrl: string }> {
    // TODO: Implement Telegram sticker pack creation via Bot API
    const packUrl = `https://t.me/addstickers/${name}`;
    
    // Обновляем записи
    await db.generatedGIF.updateMany({
      where: { id: { in: gifIds } },
      data: { stickerPack: name },
    });

    return { packUrl };
  }

  // Увеличить счётчик использования
  async incrementUsage(id: string): Promise<void> {
    await db.generatedGIF.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}

let gifGeneratorInstance: GIFGeneratorService | null = null;

export function getGIFGenerator(): GIFGeneratorService {
  if (!gifGeneratorInstance) {
    gifGeneratorInstance = new GIFGeneratorService();
  }
  return gifGeneratorInstance;
}

export const gifGenerator = {
  generate: (config: GIFConfig) => getGIFGenerator().generate(config),
  get: (id: string) => getGIFGenerator().getGIF(id),
  list: (limit?: number) => getGIFGenerator().getGIFs(limit),
  createStickerPack: (name: string, gifIds: string[]) => 
    getGIFGenerator().createStickerPack(name, gifIds),
  incrementUsage: (id: string) => getGIFGenerator().incrementUsage(id),
};
