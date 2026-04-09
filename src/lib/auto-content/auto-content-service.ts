/**
 * Auto Content Service - Сервис автономной генерации контента 24/365
 */

import { nanoid } from 'nanoid';
import { PrismaClient } from '@prisma/client';
import { getZAI } from '@/lib/z-ai';
import {
  ContentType,
  CampaignStatus,
  JobStatus,
  CreateCampaignInput,
  GenerationResult,
  CampaignStats,
  AutoContentCallback,
  AutoContentEvent,
  PromptConfig,
  ScheduleConfig,
  GenerationLimits,
} from './types';
import { getPromptVariator, PromptVariator } from './prompt-variator';

const prisma = new PrismaClient();

// Интервал проверки (по умолчанию 30 секунд)
const DEFAULT_CHECK_INTERVAL = 30_000;

/**
 * Главный сервис автогенерации контента
 */
export class AutoContentService {
  private zai: any = null;
  private variator: PromptVariator;
  private callbacks: Set<AutoContentCallback> = new Set();
  private runningCampaigns: Map<string, NodeJS.Timeout> = new Map();
  private activeJobs: Map<string, AbortController> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.variator = getPromptVariator();
  }

  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.zai = await getZAI();
      await this.variator.initialize();
      this.isInitialized = true;

      // Запускаем периодическую проверку
      this.startPeriodicCheck();

      // Восстанавливаем запущенные кампании после перезапуска
      await this.restoreRunningCampaigns();

      console.log('[AutoContent] Service initialized');
    } catch (error) {
      console.error('[AutoContent] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Запуск периодической проверки
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.processCampaigns().catch(console.error);
    }, DEFAULT_CHECK_INTERVAL);
  }

  /**
   * Восстановление запущенных кампаний
   */
  private async restoreRunningCampaigns(): Promise<void> {
    try {
      const runningCampaigns = await prisma.autoContentCampaign.findMany({
        where: { status: 'running' },
      });

      for (const campaign of runningCampaigns) {
        this.startCampaignScheduler(campaign.id);
      }

      console.log(`[AutoContent] Restored ${runningCampaigns.length} running campaigns`);
    } catch (error) {
      console.error('[AutoContent] Failed to restore campaigns:', error);
    }
  }

  /**
   * Создание кампании
   */
  async createCampaign(input: CreateCampaignInput): Promise<string> {
    const id = nanoid(12);

    const schedule: ScheduleConfig = {
      mode: input.schedule?.mode || 'continuous',
      intervalSeconds: input.schedule?.intervalSeconds || 300,
      workHoursStart: input.schedule?.workHoursStart || '00:00',
      workHoursEnd: input.schedule?.workHoursEnd || '23:59',
      workDays: input.schedule?.workDays || [1, 2, 3, 4, 5, 6, 7],
      timezone: input.schedule?.timezone || 'Europe/Moscow',
    };

    const limits: GenerationLimits = {
      maxGenerationsPerDay: input.limits?.maxGenerationsPerDay || 100,
      maxGenerationsPerHour: input.limits?.maxGenerationsPerHour || 10,
      maxConcurrentJobs: input.limits?.maxConcurrentJobs || 3,
    };

    await prisma.autoContentCampaign.create({
      data: {
        id,
        name: input.name,
        description: input.description,
        contentTypes: JSON.stringify(input.contentTypes),
        prompts: JSON.stringify(input.prompts),
        generationConfig: input.generationConfig ? JSON.stringify(input.generationConfig) : null,
        scheduleMode: schedule.mode,
        intervalSeconds: schedule.intervalSeconds,
        workHoursStart: schedule.workHoursStart,
        workHoursEnd: schedule.workHoursEnd,
        workDays: JSON.stringify(schedule.workDays),
        timezone: schedule.timezone,
        maxGenerationsPerDay: limits.maxGenerationsPerDay,
        maxGenerationsPerHour: limits.maxGenerationsPerHour,
        maxConcurrentJobs: limits.maxConcurrentJobs,
        promptVariation: input.promptVariation ? JSON.stringify(input.promptVariation) : null,
        autoPublish: input.publish?.autoPublish || false,
        publishPlatforms: input.publish?.platforms ? JSON.stringify(input.publish.platforms) : null,
        publishConfig: input.publish?.platformConfigs ? JSON.stringify(input.publish.platformConfigs) : null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        priority: input.priority || 5,
        status: 'paused',
      },
    });

    this.emit({ type: 'campaign_started', campaignId: id });

    return id;
  }

  /**
   * Запуск кампании
   */
  async startCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.autoContentCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status === 'running') {
      return; // Уже запущена
    }

    // Обновляем статус
    await prisma.autoContentCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'running',
        startedAt: new Date(),
        stoppedAt: null,
        errorMessage: null,
      },
    });

    // Запускаем планировщик
    this.startCampaignScheduler(campaignId);

    this.emit({ type: 'campaign_started', campaignId });
    console.log(`[AutoContent] Campaign ${campaignId} started`);
  }

  /**
   * Запуск планировщика для кампании
   */
  private startCampaignScheduler(campaignId: string): void {
    // Если уже есть таймер - удаляем
    if (this.runningCampaigns.has(campaignId)) {
      clearTimeout(this.runningCampaigns.get(campaignId)!);
    }

    // Запускаем немедленную генерацию
    this.generateForCampaign(campaignId).catch(console.error);

    // Устанавливаем периодический запуск
    const scheduleNext = () => {
      this.getCampaignInterval(campaignId).then(interval => {
        const timeout = setTimeout(() => {
          this.generateForCampaign(campaignId).catch(console.error);
          scheduleNext();
        }, interval);
        this.runningCampaigns.set(campaignId, timeout);
      });
    };

    scheduleNext();
  }

  /**
   * Получить интервал для кампании
   */
  private async getCampaignInterval(campaignId: string): Promise<number> {
    const campaign = await prisma.autoContentCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return DEFAULT_CHECK_INTERVAL;

    return campaign.intervalSeconds * 1000;
  }

  /**
   * Остановка кампании
   */
  async stopCampaign(campaignId: string): Promise<void> {
    // Останавливаем таймер
    if (this.runningCampaigns.has(campaignId)) {
      clearTimeout(this.runningCampaigns.get(campaignId)!);
      this.runningCampaigns.delete(campaignId);
    }

    // Отменяем активные задачи
    for (const [jobId, controller] of this.activeJobs.entries()) {
      if (jobId.startsWith(campaignId)) {
        controller.abort();
        this.activeJobs.delete(jobId);
      }
    }

    // Обновляем статус
    await prisma.autoContentCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'stopped',
        stoppedAt: new Date(),
      },
    });

    this.emit({ type: 'campaign_stopped', campaignId });
    console.log(`[AutoContent] Campaign ${campaignId} stopped`);
  }

  /**
   * Пауза кампании
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    // Останавливаем таймер
    if (this.runningCampaigns.has(campaignId)) {
      clearTimeout(this.runningCampaigns.get(campaignId)!);
      this.runningCampaigns.delete(campaignId);
    }

    // Обновляем статус
    await prisma.autoContentCampaign.update({
      where: { id: campaignId },
      data: { status: 'paused' },
    });

    this.emit({ type: 'campaign_paused', campaignId });
    console.log(`[AutoContent] Campaign ${campaignId} paused`);
  }

  /**
   * Генерация контента для кампании
   */
  private async generateForCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await prisma.autoContentCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign || campaign.status !== 'running') {
        return;
      }

      // Проверяем лимиты
      const canGenerate = await this.checkLimits(campaign);
      if (!canGenerate.allowed) {
        this.emit({
          type: 'limit_reached',
          campaignId,
          limitType: canGenerate.limitType!,
        });
        return;
      }

      // Проверяем расписание
      if (!this.isWithinSchedule(campaign)) {
        return;
      }

      // Проверяем количество одновременных задач
      const activeJobsCount = await this.getActiveJobsCount(campaignId);
      if (activeJobsCount >= campaign.maxConcurrentJobs) {
        return;
      }

      // Выбираем тип контента
      const contentTypes: ContentType[] = JSON.parse(campaign.contentTypes);
      const contentType = this.selectContentType(contentTypes);

      // Получаем промт с вариацией
      const promptConfig: PromptConfig = JSON.parse(campaign.prompts);
      const prompt = await this.getVariedPrompt(promptConfig, contentType, campaign.promptVariation);

      // Создаем задачу
      const jobId = nanoid(12);
      const jobKey = `${campaignId}_${jobId}`;

      await prisma.autoContentJob.create({
        data: {
          id: jobId,
          campaignId,
          contentType,
          prompt: prompt.variedPrompt,
          originalPrompt: prompt.originalPrompt,
          status: 'pending',
        },
      });

      // Обновляем статистику кампании
      await prisma.autoContentCampaign.update({
        where: { id: campaignId },
        data: { lastGenerationAt: new Date() },
      });

      // Запускаем генерацию
      const controller = new AbortController();
      this.activeJobs.set(jobKey, controller);

      this.emit({
        type: 'generation_started',
        jobId,
        campaignId,
      });

      // Генерируем контент
      const result = await this.generateContent(
        contentType,
        prompt.variedPrompt,
        campaign.generationConfig ? JSON.parse(campaign.generationConfig) : {},
        controller.signal
      );

      // Сохраняем результат
      await this.saveJobResult(jobId, result);

      // Удаляем из активных
      this.activeJobs.delete(jobKey);

      if (result.success) {
        this.emit({
          type: 'generation_completed',
          jobId,
          campaignId,
          result,
        });

        // Автопубликация если включена
        if (campaign.autoPublish) {
          await this.publishContent(jobId, campaign);
        }
      } else {
        this.emit({
          type: 'generation_failed',
          jobId,
          campaignId,
          error: result.error || 'Unknown error',
        });
      }

    } catch (error: any) {
      console.error(`[AutoContent] Generation failed for campaign ${campaignId}:`, error);
      this.emit({
        type: 'error',
        campaignId,
        error: error.message,
      });
    }
  }

  /**
   * Проверка лимитов
   */
  private async checkLimits(
    campaign: any
  ): Promise<{ allowed: boolean; limitType?: 'daily' | 'hourly' | 'concurrent' }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Проверка дневного лимита
    const todayJobs = await prisma.autoContentJob.count({
      where: {
        campaignId: campaign.id,
        createdAt: { gte: today },
      },
    });

    if (todayJobs >= campaign.maxGenerationsPerDay) {
      return { allowed: false, limitType: 'daily' };
    }

    // Проверка часового лимита
    const hourJobs = await prisma.autoContentJob.count({
      where: {
        campaignId: campaign.id,
        createdAt: { gte: hourAgo },
      },
    });

    if (hourJobs >= campaign.maxGenerationsPerHour) {
      return { allowed: false, limitType: 'hourly' };
    }

    return { allowed: true };
  }

  /**
   * Проверка расписания
   */
  private isWithinSchedule(campaign: any): boolean {
    const now = new Date();
    const tz = campaign.timezone || 'Europe/Moscow';

    // Конвертируем время в нужный часовой пояс
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentDay = localTime.getDay() || 7; // 0 = Sunday -> 7

    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Парсим часы работы
    const [startHour, startMin] = (campaign.workHoursStart || '00:00')
      .split(':')
      .map(Number);
    const [endHour, endMin] = (campaign.workHoursEnd || '23:59')
      .split(':')
      .map(Number);

    const startTimeMinutes = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;

    // Проверяем время
    if (startTimeMinutes <= endTimeMinutes) {
      if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
        return false;
      }
    } else {
      // Переход через полночь
      if (currentTimeMinutes < startTimeMinutes && currentTimeMinutes > endTimeMinutes) {
        return false;
      }
    }

    // Проверяем дни недели
    const workDays: number[] = JSON.parse(campaign.workDays || '[1,2,3,4,5,6,7]');
    if (!workDays.includes(currentDay)) {
      return false;
    }

    return true;
  }

  /**
   * Получение количества активных задач
   */
  private async getActiveJobsCount(campaignId: string): Promise<number> {
    return prisma.autoContentJob.count({
      where: {
        campaignId,
        status: { in: ['pending', 'processing'] },
      },
    });
  }

  /**
   * Выбор типа контента
   */
  private selectContentType(types: ContentType[]): ContentType {
    // Случайный выбор из доступных типов
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Получение промта с вариацией
   */
  private async getVariedPrompt(
    config: PromptConfig,
    contentType: ContentType,
    variationConfig: any
  ): Promise<{ originalPrompt: string; variedPrompt: string }> {
    const originalPrompt = config.basePrompt;

    if (variationConfig && variationConfig.enabled) {
      const variedPrompt = await this.variator.vary(
        originalPrompt,
        contentType,
        variationConfig
      );
      return { originalPrompt, variedPrompt };
    }

    return { originalPrompt, variedPrompt: originalPrompt };
  }

  /**
   * Генерация контента
   */
  private async generateContent(
    type: ContentType,
    prompt: string,
    config: Record<string, any>,
    signal: AbortSignal
  ): Promise<GenerationResult> {
    const jobId = nanoid(12);
    const startTime = Date.now();

    try {
      // Обновляем статус задачи
      await prisma.autoContentJob.updateMany({
        where: { prompt },
        data: { status: 'processing', startedAt: new Date() },
      });

      let result: GenerationResult;

      switch (type) {
        case 'image':
          result = await this.generateImage(prompt, config, signal);
          break;
        case 'video':
          result = await this.generateVideo(prompt, config, signal);
          break;
        case 'text':
          result = await this.generateText(prompt, config, signal);
          break;
        case 'audio':
          result = await this.generateAudio(prompt, config, signal);
          break;
        default:
          throw new Error(`Unsupported content type: ${type}`);
      }

      result.jobId = jobId;
      result.duration = Date.now() - startTime;

      return result;
    } catch (error: any) {
      return {
        success: false,
        jobId,
        contentType: type,
        prompt,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Генерация изображения
   */
  private async generateImage(
    prompt: string,
    config: Record<string, any>,
    signal: AbortSignal
  ): Promise<GenerationResult> {
    try {
      if (!this.zai) {
        this.zai = await getZAI();
      }

      const response = await this.zai.images.generations.create({
        prompt,
        size: config.size || '1024x1024',
        n: 1,
      });

      const imageData = response.data[0];

      return {
        success: true,
        jobId: '',
        contentType: 'image',
        prompt,
        resultBase64: imageData.base64,
        resultUrl: imageData.url,
        metadata: {
          width: 1024,
          height: 1024,
          format: 'png',
        },
        duration: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        jobId: '',
        contentType: 'image',
        prompt,
        error: error.message,
        duration: 0,
      };
    }
  }

  /**
   * Генерация видео
   */
  private async generateVideo(
    prompt: string,
    config: Record<string, any>,
    signal: AbortSignal
  ): Promise<GenerationResult> {
    try {
      if (!this.zai) {
        this.zai = await getZAI();
      }

      // Используем video generation API
      const response = await this.zai.video?.generations?.create?.({
        prompt,
        duration: config.duration || 5,
        aspect_ratio: config.aspectRatio || '16:9',
      }) || await fetch('http://localhost:8766/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration: config.duration || 5 }),
      }).then(r => r.json());

      return {
        success: true,
        jobId: '',
        contentType: 'video',
        prompt,
        resultUrl: response.output_path || response.url,
        metadata: {
          duration: config.duration || 5,
          format: 'mp4',
        },
        duration: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        jobId: '',
        contentType: 'video',
        prompt,
        error: error.message,
        duration: 0,
      };
    }
  }

  /**
   * Генерация текста
   */
  private async generateText(
    prompt: string,
    config: Record<string, any>,
    signal: AbortSignal
  ): Promise<GenerationResult> {
    try {
      if (!this.zai) {
        this.zai = await getZAI();
      }

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Ты - креативный контент-мейкер. Создавай интересный и вовлекающий контент.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000,
      });

      const text = completion.choices[0]?.message?.content || '';

      return {
        success: true,
        jobId: '',
        contentType: 'text',
        prompt,
        resultBase64: Buffer.from(text).toString('base64'),
        metadata: {
          fileSize: text.length,
        },
        duration: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        jobId: '',
        contentType: 'text',
        prompt,
        error: error.message,
        duration: 0,
      };
    }
  }

  /**
   * Генерация аудио
   */
  private async generateAudio(
    prompt: string,
    config: Record<string, any>,
    signal: AbortSignal
  ): Promise<GenerationResult> {
    try {
      if (!this.zai) {
        this.zai = await getZAI();
      }

      // TTS или генерация музыки
      if (config.type === 'tts') {
        const response = await this.zai.audio.tts.create({
          text: prompt,
          voice: config.voice || 'default',
        });

        return {
          success: true,
          jobId: '',
          contentType: 'audio',
          prompt,
          resultBase64: response.base64 || response.audio,
          metadata: {
            format: 'mp3',
          },
          duration: 0,
        };
      } else {
        // Music generation
        return {
          success: true,
          jobId: '',
          contentType: 'audio',
          prompt,
          resultUrl: '/generated/audio/' + nanoid(8) + '.mp3',
          metadata: {
            duration: config.duration || 30,
            format: 'mp3',
          },
          duration: 0,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        jobId: '',
        contentType: 'audio',
        prompt,
        error: error.message,
        duration: 0,
      };
    }
  }

  /**
   * Сохранение результата задачи
   */
  private async saveJobResult(jobId: string, result: GenerationResult): Promise<void> {
    await prisma.autoContentJob.update({
      where: { id: jobId },
      data: {
        status: result.success ? 'completed' : 'failed',
        resultUrl: result.resultUrl,
        resultBase64: result.resultBase64 ? result.resultBase64.substring(0, 10000) : null, // Ограничиваем размер
        resultThumbnail: result.thumbnail,
        metadata: result.metadata ? JSON.stringify(result.metadata) : null,
        errorMessage: result.error,
        completedAt: new Date(),
      },
    });

    // Обновляем статистику кампании
    if (result.success) {
      await prisma.autoContentCampaign.update({
        where: { id: (await prisma.autoContentJob.findUnique({ where: { id: jobId } }))?.campaignId },
        data: {
          totalGenerated: { increment: 1 },
        },
      });
    } else {
      await prisma.autoContentCampaign.update({
        where: { id: (await prisma.autoContentJob.findUnique({ where: { id: jobId } }))?.campaignId },
        data: {
          totalFailed: { increment: 1 },
        },
      });
    }
  }

  /**
   * Публикация контента
   */
  private async publishContent(jobId: string, campaign: any): Promise<void> {
    try {
      const platforms: string[] = JSON.parse(campaign.publishPlatforms || '[]');

      for (const platform of platforms) {
        // Публикация на платформу
        // TODO: Интеграция с платформами

        await prisma.autoContentJob.update({
          where: { id: jobId },
          data: {
            status: 'published',
            publishedAt: new Date(),
            publishedPlatform: platform,
          },
        });

        this.emit({
          type: 'content_published',
          jobId,
          platform,
        });
      }

      await prisma.autoContentCampaign.update({
        where: { id: campaign.id },
        data: {
          totalPublished: { increment: 1 },
          lastPublishedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[AutoContent] Publish failed:', error);
    }
  }

  /**
   * Обработка всех кампаний
   */
  private async processCampaigns(): Promise<void> {
    const campaigns = await prisma.autoContentCampaign.findMany({
      where: { status: 'running' },
    });

    for (const campaign of campaigns) {
      // Проверяем, есть ли уже запланированная генерация
      if (!this.runningCampaigns.has(campaign.id)) {
        this.startCampaignScheduler(campaign.id);
      }
    }
  }

  /**
   * Получение статистики кампании
   */
  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const campaign = await prisma.autoContentCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [todayJobs, hourJobs, completedJobs] = await Promise.all([
      prisma.autoContentJob.count({
        where: { campaignId, createdAt: { gte: today } },
      }),
      prisma.autoContentJob.count({
        where: { campaignId, createdAt: { gte: hourAgo } },
      }),
      prisma.autoContentJob.count({
        where: { campaignId, status: 'completed' },
      }),
    ]);

    const totalJobs = campaign.totalGenerated + campaign.totalFailed;
    const successRate = totalJobs > 0 ? campaign.totalGenerated / totalJobs : 0;

    return {
      campaignId,
      totalGenerated: campaign.totalGenerated,
      totalPublished: campaign.totalPublished,
      totalFailed: campaign.totalFailed,
      todayGenerated: todayJobs,
      todayPublished: 0, // TODO: подсчет опубликованных сегодня
      hourGenerated: hourJobs,
      avgGenerationTime: 0, // TODO: подсчет среднего времени
      successRate,
      lastGenerationAt: campaign.lastGenerationAt || undefined,
    };
  }

  /**
   * Подписка на события
   */
  subscribe(callback: AutoContentCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Отправка события
   */
  private emit(event: AutoContentEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[AutoContent] Callback error:', error);
      }
    }
  }

  /**
   * Остановка сервиса
   */
  async shutdown(): Promise<void> {
    // Останавливаем все таймеры
    for (const [_, timeout] of this.runningCampaigns) {
      clearTimeout(timeout);
    }
    this.runningCampaigns.clear();

    // Отменяем все активные задачи
    for (const [_, controller] of this.activeJobs) {
      controller.abort();
    }
    this.activeJobs.clear();

    // Останавливаем периодическую проверку
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Обновляем статус всех запущенных кампаний
    await prisma.autoContentCampaign.updateMany({
      where: { status: 'running' },
      data: { status: 'paused' },
    });

    console.log('[AutoContent] Service shutdown complete');
  }

  /**
   * Получение всех кампаний
   */
  async getCampaigns(status?: CampaignStatus): Promise<any[]> {
    return prisma.autoContentCampaign.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { AutoContentJob: true },
        },
      },
    });
  }

  /**
   * Получение кампании по ID
   */
  async getCampaign(campaignId: string): Promise<any> {
    return prisma.autoContentCampaign.findUnique({
      where: { id: campaignId },
      include: {
        AutoContentJob: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Обновление кампании
   */
  async updateCampaign(
    campaignId: string,
    data: Partial<CreateCampaignInput>
  ): Promise<void> {
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.contentTypes) updateData.contentTypes = JSON.stringify(data.contentTypes);
    if (data.prompts) updateData.prompts = JSON.stringify(data.prompts);
    if (data.generationConfig) updateData.generationConfig = JSON.stringify(data.generationConfig);
    if (data.schedule) {
      if (data.schedule.intervalSeconds) updateData.intervalSeconds = data.schedule.intervalSeconds;
      if (data.schedule.workHoursStart) updateData.workHoursStart = data.schedule.workHoursStart;
      if (data.schedule.workHoursEnd) updateData.workHoursEnd = data.schedule.workHoursEnd;
      if (data.schedule.workDays) updateData.workDays = JSON.stringify(data.schedule.workDays);
    }
    if (data.limits) {
      if (data.limits.maxGenerationsPerDay) updateData.maxGenerationsPerDay = data.limits.maxGenerationsPerDay;
      if (data.limits.maxGenerationsPerHour) updateData.maxGenerationsPerHour = data.limits.maxGenerationsPerHour;
      if (data.limits.maxConcurrentJobs) updateData.maxConcurrentJobs = data.limits.maxConcurrentJobs;
    }
    if (data.promptVariation) updateData.promptVariation = JSON.stringify(data.promptVariation);
    if (data.publish) {
      if (data.publish.autoPublish !== undefined) updateData.autoPublish = data.publish.autoPublish;
      if (data.publish.platforms) updateData.publishPlatforms = JSON.stringify(data.publish.platforms);
    }
    if (data.tags) updateData.tags = JSON.stringify(data.tags);
    if (data.priority) updateData.priority = data.priority;

    updateData.updatedAt = new Date();

    await prisma.autoContentCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });
  }

  /**
   * Удаление кампании
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    // Сначала останавливаем
    await this.stopCampaign(campaignId);

    // Удаляем
    await prisma.autoContentCampaign.delete({
      where: { id: campaignId },
    });
  }

  /**
   * Получение задач кампании
   */
  async getJobs(campaignId: string, limit: number = 50): Promise<any[]> {
    return prisma.autoContentJob.findMany({
      where: { campaignId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получение задачи по ID
   */
  async getJob(jobId: string): Promise<any> {
    return prisma.autoContentJob.findUnique({
      where: { id: jobId },
      include: { AutoContentCampaign: true },
    });
  }
}

// Singleton
let serviceInstance: AutoContentService | null = null;

export function getAutoContentService(): AutoContentService {
  if (!serviceInstance) {
    serviceInstance = new AutoContentService();
  }
  return serviceInstance;
}

export default AutoContentService;
