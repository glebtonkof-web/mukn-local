/**
 * Content Studio - Main Orchestrator
 * Unified interface for all content creation
 */

import { nanoid } from 'nanoid';
import {
  ContentType,
  ContentStatus,
  ContentMetadata,
  ContentStudioResponse,
  ImageGenerationOptions,
  GeneratedImage,
  VideoGenerationOptions,
  GeneratedVideo,
  AudioGenerationOptions,
  GeneratedAudio,
  TextGenerationOptions,
  GeneratedText,
  TranslationOptions,
  TranslatedContent,
  WatermarkRemovalOptions,
  WatermarkRemovalResult,
  Pipeline,
} from './types';
import { ImageGenerator, getImageGenerator } from './image-generator';
import { AudioGenerator, getAudioGenerator } from './audio-generator';
import { TextGenerator, getTextGenerator } from './text-generator';
import { Translator, getTranslator } from './translator';
import { WatermarkRemover, getWatermarkRemover } from './watermark-remover';
import { ContentPipeline, getContentPipeline } from './pipeline';

// Content history entry
interface ContentHistoryEntry {
  id: string;
  type: ContentType;
  input: Record<string, any>;
  output: any;
  createdAt: Date;
}

/**
 * Content Studio
 * Main class for unified content creation
 */
export class ContentStudio {
  private imageGenerator: ImageGenerator;
  private audioGenerator: AudioGenerator;
  private textGenerator: TextGenerator;
  private translator: Translator;
  private watermarkRemover: WatermarkRemover;
  private pipeline: ContentPipeline;
  private history: ContentHistoryEntry[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.imageGenerator = getImageGenerator();
    this.audioGenerator = getAudioGenerator();
    this.textGenerator = getTextGenerator();
    this.translator = getTranslator();
    this.watermarkRemover = getWatermarkRemover();
    this.pipeline = getContentPipeline();
  }

  // ============== Image Generation ==============

  async generateImage(
    options: ImageGenerationOptions
  ): Promise<ContentStudioResponse<GeneratedImage[]>> {
    const result = await this.imageGenerator.generate(options);
    
    if (result.success && result.data) {
      this.addToHistory('image', options, result.data);
    }
    
    return result;
  }

  async generateImageVariations(
    prompt: string,
    count: number = 4,
    style?: any
  ): Promise<ContentStudioResponse<GeneratedImage[]>> {
    return this.imageGenerator.generateVariations(prompt, count, style);
  }

  // ============== Video Generation ==============

  async generateVideo(
    options: VideoGenerationOptions
  ): Promise<ContentStudioResponse<GeneratedVideo>> {
    // Video generation is handled by free-video-gen service
    // This is a proxy method
    try {
      const response = await fetch('http://localhost:8766/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('Video generation service unavailable');
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          id: data.task_id,
          url: data.output_path || '',
          width: 1080,
          height: 1920,
          duration: options.duration,
          fps: 30,
          format: 'mp4',
          provider: options.provider || 'auto',
        },
        metadata: {
          id: data.task_id,
          type: 'video',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          prompt: options.prompt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Video generation failed: ${error.message}`,
      };
    }
  }

  // ============== Audio Generation ==============

  async generateAudio(
    options: AudioGenerationOptions
  ): Promise<ContentStudioResponse<GeneratedAudio>> {
    const result = await this.audioGenerator.generate(options);
    
    if (result.success && result.data) {
      this.addToHistory('audio', options, result.data);
    }
    
    return result;
  }

  async generateTTS(
    text: string,
    voice?: string,
    language?: string
  ): Promise<ContentStudioResponse<GeneratedAudio>> {
    return this.generateAudio({ type: 'tts', text, voice, language });
  }

  async generateMusic(
    style: any,
    duration?: number
  ): Promise<ContentStudioResponse<GeneratedAudio>> {
    return this.generateAudio({ type: 'music', style, duration });
  }

  // ============== Text Generation ==============

  async generateText(
    options: TextGenerationOptions
  ): Promise<ContentStudioResponse<GeneratedText>> {
    const result = await this.textGenerator.generate(options);
    
    if (result.success && result.data) {
      this.addToHistory('text', options, result.data);
    }
    
    return result;
  }

  async generateCaption(
    topic: string,
    platform: string = 'instagram'
  ): Promise<ContentStudioResponse<GeneratedText>> {
    return this.generateText({
      prompt: `Create engaging caption for ${platform} about: ${topic}`,
      type: 'caption',
      length: 'short',
    });
  }

  async generateHashtags(
    content: string,
    platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube' = 'instagram',
    count: number = 10
  ): Promise<ContentStudioResponse<string[]>> {
    return this.textGenerator.generateHashtags(content, platform, count);
  }

  // ============== Translation ==============

  async translate(
    options: TranslationOptions
  ): Promise<ContentStudioResponse<TranslatedContent>> {
    const result = await this.translator.translate(options);
    
    if (result.success && result.data) {
      this.addToHistory('text', options, result.data);
    }
    
    return result;
  }

  async localize(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context?: string
  ): Promise<ContentStudioResponse<TranslatedContent>> {
    return this.translator.localize(text, sourceLanguage, targetLanguage, context);
  }

  async detectLanguage(text: string): Promise<ContentStudioResponse<string>> {
    return this.translator.detectLanguage(text);
  }

  // ============== Watermark Removal ==============

  async removeWatermarkFromImage(
    imagePath: string,
    options: WatermarkRemovalOptions
  ): Promise<ContentStudioResponse<WatermarkRemovalResult>> {
    return this.watermarkRemover.removeFromImage(imagePath, options);
  }

  async removeWatermarkFromVideo(
    videoPath: string,
    options: WatermarkRemovalOptions
  ): Promise<ContentStudioResponse<WatermarkRemovalResult>> {
    return this.watermarkRemover.removeFromVideo(videoPath, options);
  }

  async autoCleanContent(
    contentPath: string,
    type: 'image' | 'video'
  ): Promise<ContentStudioResponse<WatermarkRemovalResult>> {
    const options: WatermarkRemovalOptions = { type: 'auto' };
    
    if (type === 'image') {
      return this.removeWatermarkFromImage(contentPath, options);
    } else {
      return this.removeWatermarkFromVideo(contentPath, options);
    }
  }

  // ============== Pipelines ==============

  createPipeline(templateId: string, options?: Record<string, any>): Pipeline {
    return this.pipeline.createFromTemplate(templateId, options);
  }

  async executePipeline(
    pipelineId: string,
    inputs?: Record<string, any>
  ): Promise<ContentStudioResponse<Pipeline>> {
    return this.pipeline.execute(pipelineId, inputs);
  }

  getPipelineTemplates() {
    return this.pipeline.getTemplates();
  }

  // ============== Batch Operations ==============

  async batchGenerate(
    items: Array<{ type: ContentType; options: Record<string, any> }>
  ): Promise<ContentStudioResponse<any[]>> {
    const results: any[] = [];
    const errors: string[] = [];

    for (const item of items) {
      try {
        let result: any;

        switch (item.type) {
          case 'image':
            result = await this.generateImage(item.options as ImageGenerationOptions);
            break;
          case 'audio':
            result = await this.generateAudio(item.options as AudioGenerationOptions);
            break;
          case 'text':
            result = await this.generateText(item.options as TextGenerationOptions);
            break;
          default:
            throw new Error(`Unsupported type: ${item.type}`);
        }

        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push(`${item.type}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`${item.type}: ${error.message}`);
      }
    }

    return {
      success: results.length > 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  // ============== History ==============

  private addToHistory(type: ContentType, input: any, output: any) {
    this.history.unshift({
      id: nanoid(8),
      type,
      input,
      output,
      createdAt: new Date(),
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }
  }

  getHistory(limit: number = 20): ContentHistoryEntry[] {
    return this.history.slice(0, limit);
  }

  clearHistory(): void {
    this.history = [];
  }

  // ============== Utilities ==============

  getCapabilities(): Record<ContentType, string[]> {
    return {
      image: [
        'generate',
        'variations',
        'edit',
        'upscale',
        'style-transfer',
      ],
      video: [
        'generate-short',
        'generate-long',
        'concatenate',
        'add-transitions',
        'add-audio',
      ],
      audio: [
        'tts',
        'music-generation',
        'sfx',
        'mix',
        'normalize',
      ],
      text: [
        'generate',
        'improve',
        'hashtags',
        'captions',
        'translate',
      ],
      gif: [
        'generate',
        'optimize',
        'resize',
      ],
      meme: [
        'generate',
        'template',
        'custom-text',
      ],
      story: [
        'generate-slides',
        'add-cta',
        'schedule',
      ],
      music: [
        'generate',
        'loop',
        'fade',
      ],
    };
  }

  getStatus(): {
    ready: boolean;
    modules: Record<string, boolean>;
    historySize: number;
  } {
    return {
      ready: true,
      modules: {
        image: true,
        audio: true,
        text: true,
        translate: true,
        watermark: true,
        pipeline: true,
      },
      historySize: this.history.length,
    };
  }
}

// Singleton
let contentStudioInstance: ContentStudio | null = null;

export function getContentStudio(): ContentStudio {
  if (!contentStudioInstance) {
    contentStudioInstance = new ContentStudio();
  }
  return contentStudioInstance;
}

// Export main instance
export const contentStudio = {
  // Image
  image: (options: ImageGenerationOptions) => getContentStudio().generateImage(options),
  imageVariations: (prompt: string, count?: number, style?: any) =>
    getContentStudio().generateImageVariations(prompt, count, style),
  
  // Video
  video: (options: VideoGenerationOptions) => getContentStudio().generateVideo(options),
  
  // Audio
  audio: (options: AudioGenerationOptions) => getContentStudio().generateAudio(options),
  tts: (text: string, voice?: string, language?: string) =>
    getContentStudio().generateTTS(text, voice, language),
  music: (style: any, duration?: number) => getContentStudio().generateMusic(style, duration),
  
  // Text
  text: (options: TextGenerationOptions) => getContentStudio().generateText(options),
  caption: (topic: string, platform?: string) => getContentStudio().generateCaption(topic, platform),
  hashtags: (content: string, platform?: 'instagram' | 'tiktok' | 'twitter' | 'youtube', count?: number) =>
    getContentStudio().generateHashtags(content, platform, count),
  
  // Translation
  translate: (options: TranslationOptions) => getContentStudio().translate(options),
  localize: (text: string, source: string, target: string, context?: string) =>
    getContentStudio().localize(text, source, target, context),
  detectLanguage: (text: string) => getContentStudio().detectLanguage(text),
  
  // Watermark
  removeWatermark: {
    fromImage: (path: string, options: WatermarkRemovalOptions) =>
      getContentStudio().removeWatermarkFromImage(path, options),
    fromVideo: (path: string, options: WatermarkRemovalOptions) =>
      getContentStudio().removeWatermarkFromVideo(path, options),
    auto: (path: string, type: 'image' | 'video') =>
      getContentStudio().autoCleanContent(path, type),
  },
  
  // Pipeline
  pipeline: {
    create: (templateId: string, options?: Record<string, any>) =>
      getContentStudio().createPipeline(templateId, options),
    execute: (pipelineId: string, inputs?: Record<string, any>) =>
      getContentStudio().executePipeline(pipelineId, inputs),
    templates: () => getContentStudio().getPipelineTemplates(),
  },
  
  // Batch
  batch: (items: Array<{ type: ContentType; options: Record<string, any> }>) =>
    getContentStudio().batchGenerate(items),
  
  // Utilities
  history: (limit?: number) => getContentStudio().getHistory(limit),
  capabilities: () => getContentStudio().getCapabilities(),
  status: () => getContentStudio().getStatus(),
};

export default contentStudio;
