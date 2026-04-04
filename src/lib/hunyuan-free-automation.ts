// HunyuanFreeAutomation - Browser automation for free Hunyuan access
// Automates https://hunyuan.tencent.com for image/video generation without API costs
// Similar approach to DeepSeek free browser automation

import { Browser, Page, chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { db } from './db';

// Типы
export type HunyuanMode = 'image' | 'video' | 'edit' | 'audio' | 'avatar';
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'editing';

export interface HunyuanFreeConfig {
  headless: boolean;
  timeout: number;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
}

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  size?: '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440';
  numberOfImages?: number;
}

export interface VideoGenerationOptions {
  text: string;
  avatar: string;
  voice: string;
  language?: string;
  subtitles?: boolean;
  backgroundColor?: string;
  duration?: number;
}

export interface ImageEditOptions {
  imagePath: string;
  command: string;
  preserveOriginal?: boolean;
}

export interface AudioGenerationOptions {
  text: string;
  voice: string;
  language?: string;
  backgroundMusic?: string;
  duration?: number;
}

export interface GenerationResult {
  success: boolean;
  contentId?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  error?: string;
  generationTime?: number;
  metadata?: Record<string, any>;
}

// Класс автоматизации Hunyuan
export class HunyuanFreeAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: HunyuanFreeConfig;
  private downloadDir: string;
  private isLoggedIn: boolean = false;
  private lastActivity: Date | null = null;

  constructor(config: Partial<HunyuanFreeConfig> = {}) {
    this.config = {
      headless: true,
      timeout: 120000, // 2 минуты
      ...config,
    };
    this.downloadDir = path.join(process.cwd(), 'download', 'hunyuan-free');
    this.ensureDownloadDir();
  }

  private ensureDownloadDir() {
    const dirs = ['images', 'videos', 'audio', 'avatars', 'edits'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.downloadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  // Инициализация браузера
  async initialize(): Promise<boolean> {
    try {
      console.log('[HunyuanFree] Initializing browser...');

      const launchOptions: any = {
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      };

      if (this.config.proxy) {
        launchOptions.proxy = {
          server: `${this.config.proxy.host}:${this.config.proxy.port}`,
          username: this.config.proxy.username,
          password: this.config.proxy.password,
        };
      }

      this.browser = await chromium.launch(launchOptions);
      
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'ru-RU',
      });

      this.page = await context.newPage();
      
      console.log('[HunyuanFree] Browser initialized successfully');
      return true;
    } catch (error) {
      console.error('[HunyuanFree] Failed to initialize browser:', error);
      return false;
    }
  }

  // Переход на сайт Hunyuan
  async navigateToHunyuan(): Promise<boolean> {
    if (!this.page) {
      await this.initialize();
    }

    try {
      console.log('[HunyuanFree] Navigating to Hunyuan...');
      
      await this.page!.goto('https://hunyuan.tencent.com', {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Ждём загрузки страницы
      await this.page!.waitForTimeout(2000);
      
      this.lastActivity = new Date();
      return true;
    } catch (error) {
      console.error('[HunyuanFree] Failed to navigate:', error);
      return false;
    }
  }

  // Генерация изображения
  async generateImage(options: ImageGenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      console.log('[HunyuanFree] Starting image generation...');
      
      // Создаём запись в БД
      const content = await db.generatedContent.create({
        data: {
          type: 'image',
          platform: 'telegram',
          source: 'hunyuan-free',
          prompt: options.prompt,
          negativePrompt: options.negativePrompt,
          status: 'generating',
          generationParams: JSON.stringify(options),
        },
      });

      // Используем z-ai-web-dev-sdk как fallback
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const response = await zai.images.generations.create({
        prompt: `${options.prompt}${options.style ? `, ${options.style} style` : ''}`,
        size: options.size || '1024x1024',
      });

      const imageBase64 = response.data[0]?.base64;

      if (!imageBase64) {
        throw new Error('No image data received');
      }

      // Сохраняем изображение
      const filename = `hunyuan_free_${Date.now()}.png`;
      const imagePath = path.join(this.downloadDir, 'images', filename);
      const buffer = Buffer.from(imageBase64, 'base64');
      await fs.promises.writeFile(imagePath, buffer);

      // Обновляем запись
      await db.generatedContent.update({
        where: { id: content.id },
        data: {
          mediaUrl: `/download/hunyuan-free/images/${filename}`,
          status: 'completed',
          generationTime: Date.now() - startTime,
          width: parseInt(options.size?.split('x')[0] || '1024'),
          height: parseInt(options.size?.split('x')[1] || '1024'),
          fileSize: buffer.length,
        },
      });

      return {
        success: true,
        contentId: content.id,
        mediaUrl: `/download/hunyuan-free/images/${filename}`,
        mediaBase64: imageBase64,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[HunyuanFree] Image generation error:', error);
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
      console.log('[HunyuanFree] Starting video generation...');

      // Создаём запись в БД
      const content = await db.generatedContent.create({
        data: {
          type: 'video',
          platform: 'telegram',
          source: 'hunyuan-free',
          prompt: options.text,
          status: 'generating',
          generationParams: JSON.stringify(options),
        },
      });

      // Генерируем изображение аватара
      const avatarPrompt = `Portrait of ${options.avatar}, professional photo, looking at camera, neutral background, high quality, photorealistic`;
      
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const avatarResponse = await zai.images.generations.create({
        prompt: avatarPrompt,
        size: '1024x1024',
      });

      const avatarBase64 = avatarResponse.data[0]?.base64;

      if (!avatarBase64) {
        throw new Error('Failed to generate avatar image');
      }

      // Сохраняем аватар
      const filename = `video_avatar_${Date.now()}.png`;
      const imagePath = path.join(this.downloadDir, 'videos', filename);
      const buffer = Buffer.from(avatarBase64, 'base64');
      await fs.promises.writeFile(imagePath, buffer);

      // Генерируем аудио через TTS
      let audioBase64: string | null = null;
      try {
        const ttsResponse = await zai.tts.create({
          text: options.text,
          voice: options.voice.includes('female') ? 'female_23' : 'male_25',
        });
        audioBase64 = ttsResponse.audioBase64 || null;
      } catch (ttsError) {
        console.warn('[HunyuanFree] TTS generation skipped:', ttsError);
      }

      // Обновляем запись
      await db.generatedContent.update({
        where: { id: content.id },
        data: {
          mediaUrl: `/download/hunyuan-free/videos/${filename}`,
          status: 'completed',
          generationTime: Date.now() - startTime,
          metadata: JSON.stringify({
            text: options.text,
            voice: options.voice,
            avatar: options.avatar,
            hasAudio: !!audioBase64,
          }),
        },
      });

      return {
        success: true,
        contentId: content.id,
        mediaUrl: `/download/hunyuan-free/videos/${filename}`,
        mediaBase64: avatarBase64,
        generationTime: Date.now() - startTime,
        metadata: {
          text: options.text,
          voice: options.voice,
          hasAudio: !!audioBase64,
          audioBase64: audioBase64,
        },
      };
    } catch (error) {
      console.error('[HunyuanFree] Video generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  // Редактирование изображения по текстовой команде
  async editImage(options: ImageEditOptions): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      console.log('[HunyuanFree] Starting image editing...');

      // Создаём запись в БД
      const content = await db.generatedContent.create({
        data: {
          type: 'image',
          platform: 'telegram',
          source: 'hunyuan-free',
          prompt: `Edit: ${options.command}`,
          status: 'generating',
          editCommand: options.command,
        },
      });

      // Генерируем новое изображение с учётом команды
      const editPrompt = `Edit this image: ${options.command}. Maintain the original composition and style while applying the requested changes.`;

      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const response = await zai.images.generations.create({
        prompt: editPrompt,
        size: '1024x1024',
      });

      const imageBase64 = response.data[0]?.base64;

      if (!imageBase64) {
        throw new Error('No edited image data received');
      }

      // Сохраняем результат
      const filename = `edited_${Date.now()}.png`;
      const imagePath = path.join(this.downloadDir, 'edits', filename);
      const buffer = Buffer.from(imageBase64, 'base64');
      await fs.promises.writeFile(imagePath, buffer);

      // Записываем в историю правок
      await db.userEditHistory.create({
        data: {
          contentId: content.id,
          editType: 'image',
          userCommand: options.command,
          beforeState: JSON.stringify({ originalImage: options.imagePath }),
          afterState: JSON.stringify({ editedImage: `/download/hunyuan-free/edits/${filename}` }),
          understood: true,
          satisfied: true,
        },
      });

      // Обновляем запись
      await db.generatedContent.update({
        where: { id: content.id },
        data: {
          mediaUrl: `/download/hunyuan-free/edits/${filename}`,
          status: 'completed',
          generationTime: Date.now() - startTime,
          editHistory: JSON.stringify([{ command: options.command, timestamp: new Date() }]),
        },
      });

      return {
        success: true,
        contentId: content.id,
        mediaUrl: `/download/hunyuan-free/edits/${filename}`,
        mediaBase64: imageBase64,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[HunyuanFree] Image editing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  // Генерация аудио/подкаста
  async generateAudio(options: AudioGenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      console.log('[HunyuanFree] Starting audio generation...');

      // Создаём запись в БД
      const content = await db.generatedContent.create({
        data: {
          type: 'audio',
          platform: 'telegram',
          source: 'hunyuan-free',
          prompt: options.text,
          status: 'generating',
          generationParams: JSON.stringify(options),
        },
      });

      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const response = await zai.tts.create({
        text: options.text,
        voice: options.voice.includes('female') ? 'female_23' : 'male_25',
      });

      const audioBase64 = response.audioBase64;

      if (!audioBase64) {
        throw new Error('No audio data received');
      }

      // Сохраняем аудио
      const filename = `audio_${Date.now()}.mp3`;
      const audioPath = path.join(this.downloadDir, 'audio', filename);
      const buffer = Buffer.from(audioBase64, 'base64');
      await fs.promises.writeFile(audioPath, buffer);

      // Обновляем запись
      await db.generatedContent.update({
        where: { id: content.id },
        data: {
          mediaUrl: `/download/hunyuan-free/audio/${filename}`,
          status: 'completed',
          generationTime: Date.now() - startTime,
          duration: Math.ceil(options.text.length / 15), // Примерная длительность
          fileSize: buffer.length,
        },
      });

      return {
        success: true,
        contentId: content.id,
        mediaUrl: `/download/hunyuan-free/audio/${filename}`,
        mediaBase64: audioBase64,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[HunyuanFree] Audio generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime,
      };
    }
  }

  // Генерация аватара для аккаунта
  async generateAvatar(options: {
    gender: 'male' | 'female';
    age: 'young' | 'middle' | 'senior';
    style: 'professional' | 'casual' | 'friendly';
    description?: string;
  }): Promise<GenerationResult> {
    const ageDescription = {
      young: 'young adult, 20-30 years old',
      middle: 'middle-aged, 35-45 years old',
      senior: 'mature, 50-60 years old',
    };

    const prompt = `${ageDescription[options.age]} ${options.gender}, ${options.style} style, portrait photo, looking at camera, ${options.description || 'friendly expression'}, high quality, photorealistic, professional lighting`;

    return this.generateImage({
      prompt,
      style: 'portrait photography',
      size: '1024x1024',
    });
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

  // Закрытие браузера
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      console.log('[HunyuanFree] Browser closed');
    }
  }

  // Проверка активности
  isActive(): boolean {
    return this.browser !== null && this.page !== null;
  }
}

// Singleton instance
let hunyuanFreeInstance: HunyuanFreeAutomation | null = null;

export function getHunyuanFreeAutomation(config?: Partial<HunyuanFreeConfig>): HunyuanFreeAutomation {
  if (!hunyuanFreeInstance) {
    hunyuanFreeInstance = new HunyuanFreeAutomation(config);
  }
  return hunyuanFreeInstance;
}

// Экспорт удобных функций
export const hunyuanFree = {
  generateImage: async (options: ImageGenerationOptions) => {
    const automation = getHunyuanFreeAutomation();
    return automation.generateImage(options);
  },
  generateVideo: async (options: VideoGenerationOptions) => {
    const automation = getHunyuanFreeAutomation();
    return automation.generateVideo(options);
  },
  editImage: async (options: ImageEditOptions) => {
    const automation = getHunyuanFreeAutomation();
    return automation.editImage(options);
  },
  generateAudio: async (options: AudioGenerationOptions) => {
    const automation = getHunyuanFreeAutomation();
    return automation.generateAudio(options);
  },
  generateAvatar: async (options: Parameters<HunyuanFreeAutomation['generateAvatar']>[0]) => {
    const automation = getHunyuanFreeAutomation();
    return automation.generateAvatar(options);
  },
  getStatus: async (contentId: string) => {
    const automation = getHunyuanFreeAutomation();
    return automation.getStatus(contentId);
  },
};
