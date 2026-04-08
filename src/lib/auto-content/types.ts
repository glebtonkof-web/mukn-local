/**
 * Типы для системы автономной генерации контента 24/365
 */

// Типы контента
export type ContentType = 'video' | 'image' | 'text' | 'audio';

// Статусы кампании
export type CampaignStatus = 'paused' | 'running' | 'stopped' | 'error';

// Статусы задачи
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'published';

// Режим расписания
export type ScheduleMode = 'continuous' | 'interval' | 'scheduled';

// Конфигурация промтов
export interface PromptConfig {
  basePrompt: string;
  variations?: string[];
  style?: string;
  tone?: string;
  language?: string;
  contextWords?: string[];
  negativePrompt?: string;
}

// Конфигурация генерации
export interface GenerationConfig {
  providers?: string[];
  models?: Record<ContentType, string>;
  styles?: Record<ContentType, string[]>;
  aspectRatios?: Record<ContentType, string[]>;
  durations?: {
    video: { min: number; max: number };
    audio: { min: number; max: number };
  };
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

// Параметры вариации промтов
export interface PromptVariationConfig {
  enabled: boolean;
  style: 'ai' | 'template' | 'random' | 'mixed';
  useAI: boolean;
  variationIntensity: number; // 0-1, насколько сильно менять
  preserveKeywords: string[];
  contextWords: string[];
  temperature?: number;
}

// Расписание работы
export interface ScheduleConfig {
  mode: ScheduleMode;
  intervalSeconds: number;
  workHoursStart: string;
  workHoursEnd: string;
  workDays: number[];
  timezone: string;
}

// Лимиты генерации
export interface GenerationLimits {
  maxGenerationsPerDay: number;
  maxGenerationsPerHour: number;
  maxConcurrentJobs: number;
}

// Конфигурация публикации
export interface PublishConfig {
  autoPublish: boolean;
  platforms: string[];
  platformConfigs: Record<string, PlatformPublishConfig>;
}

// Конфигурация публикации для платформы
export interface PlatformPublishConfig {
  enabled: boolean;
  channelId?: string;
  accountId?: string;
  caption?: string;
  hashtags?: string[];
  schedule?: {
    delay: number;
    bestTimes?: string[];
  };
}

// Создание кампании
export interface CreateCampaignInput {
  name: string;
  description?: string;
  contentTypes: ContentType[];
  prompts: PromptConfig;
  generationConfig?: GenerationConfig;
  schedule?: Partial<ScheduleConfig>;
  limits?: Partial<GenerationLimits>;
  promptVariation?: Partial<PromptVariationConfig>;
  publish?: Partial<PublishConfig>;
  tags?: string[];
  priority?: number;
}

// Результат генерации
export interface GenerationResult {
  success: boolean;
  jobId: string;
  contentType: ContentType;
  prompt: string;
  resultUrl?: string;
  resultBase64?: string;
  thumbnail?: string;
  metadata?: ContentMetadata;
  error?: string;
  duration: number; // время генерации в мс
}

// Метаданные контента
export interface ContentMetadata {
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  format?: string;
  fps?: number;
  provider?: string;
  model?: string;
}

// Статистика кампании
export interface CampaignStats {
  campaignId: string;
  totalGenerated: number;
  totalPublished: number;
  totalFailed: number;
  todayGenerated: number;
  todayPublished: number;
  hourGenerated: number;
  avgGenerationTime: number;
  successRate: number;
  lastGenerationAt?: Date;
}

// События системы
export type AutoContentEvent =
  | { type: 'campaign_started'; campaignId: string }
  | { type: 'campaign_stopped'; campaignId: string }
  | { type: 'campaign_paused'; campaignId: string }
  | { type: 'generation_started'; jobId: string; campaignId: string }
  | { type: 'generation_completed'; jobId: string; campaignId: string; result: GenerationResult }
  | { type: 'generation_failed'; jobId: string; campaignId: string; error: string }
  | { type: 'content_published'; jobId: string; platform: string }
  | { type: 'limit_reached'; campaignId: string; limitType: 'daily' | 'hourly' | 'concurrent' }
  | { type: 'error'; campaignId?: string; error: string };

// Callback для событий
export type AutoContentCallback = (event: AutoContentEvent) => void;

// Параметры воркера
export interface WorkerConfig {
  id: string;
  name: string;
  supportedTypes: ContentType[];
  supportedProviders: string[];
  maxConcurrentJobs: number;
  heartbeatInterval: number;
}

// Интерфейс генератора контента
export interface ContentGenerator {
  type: ContentType;
  generate(prompt: string, params: Record<string, any>): Promise<GenerationResult>;
  isAvailable(): Promise<boolean>;
  getEstimatedTime(params: Record<string, any>): number;
}

// Параметры очереди
export interface QueueItem {
  id: string;
  campaignId: string;
  contentType: ContentType;
  prompt: string;
  params: Record<string, any>;
  priority: number;
  scheduledAt: Date;
  retryCount: number;
}
