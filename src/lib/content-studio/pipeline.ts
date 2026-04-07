/**
 * Content Pipeline Module
 * Orchestrate multi-step content creation workflows
 */

import { nanoid } from 'nanoid';
import {
  Pipeline,
  PipelineStep,
  PipelineTemplate,
  ContentType,
  ContentStatus,
  ContentStudioResponse,
} from './types';
import { imageGen } from './image-generator';
import { audioGen } from './audio-generator';
import { textGen } from './text-generator';
import { translate } from './translator';
import { watermarkRemove } from './watermark-remover';

// Pre-defined pipeline templates
const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'social-post-complete',
    name: 'Social Media Post (Complete)',
    description: 'Generate image, caption, and hashtags for social media',
    category: 'social-media',
    steps: [
      { type: 'image', options: { style: { type: 'cinematic' } } },
      { type: 'text', options: { type: 'caption', length: 'short' } },
      { type: 'text', options: { type: 'post' }, dependencies: ['step_1'] },
    ],
  },
  {
    id: 'video-with-voiceover',
    name: 'Video with Voiceover',
    description: 'Generate script, video, and voiceover',
    category: 'video-production',
    steps: [
      { type: 'text', options: { type: 'script' } },
      { type: 'audio', options: { type: 'tts' }, dependencies: ['step_0'] },
      { type: 'video', options: { duration: 10 } },
    ],
  },
  {
    id: 'localized-content',
    name: 'Localized Content',
    description: 'Create content and translate to multiple languages',
    category: 'content-creation',
    steps: [
      { type: 'image', options: {} },
      { type: 'text', options: { type: 'caption' } },
      { type: 'translate', options: { targetLanguage: 'en' }, dependencies: ['step_1'] },
      { type: 'translate', options: { targetLanguage: 'es' }, dependencies: ['step_1'] },
      { type: 'translate', options: { targetLanguage: 'de' }, dependencies: ['step_1'] },
    ],
  },
  {
    id: 'ad-creative',
    name: 'Ad Creative',
    description: 'Generate ad image, copy, and variations',
    category: 'advertising',
    steps: [
      { type: 'image', options: { style: { type: 'realistic' } } },
      { type: 'text', options: { type: 'ad-copy', tone: 'professional' } },
      { type: 'image', options: {} }, // Variation
      { type: 'image', options: {} }, // Variation
    ],
  },
  {
    id: 'clean-video',
    name: 'Clean Video',
    description: 'Generate video and remove watermark',
    category: 'video-production',
    steps: [
      { type: 'video', options: { duration: 10 } },
      { type: 'watermark-remove', options: { type: 'crop' }, dependencies: ['step_0'] },
    ],
  },
  {
    id: 'meme-pack',
    name: 'Meme Pack',
    description: 'Generate multiple memes on a topic',
    category: 'content-creation',
    steps: [
      { type: 'text', options: { type: 'meme' } },
      { type: 'text', options: { type: 'meme' } },
      { type: 'text', options: { type: 'meme' } },
      { type: 'image', options: { style: { type: 'cartoon' } } },
      { type: 'image', options: { style: { type: 'cartoon' } } },
      { type: 'image', options: { style: { type: 'cartoon' } } },
    ],
  },
];

export class ContentPipeline {
  private pipelines: Map<string, Pipeline> = new Map();
  private results: Map<string, Map<string, any>> = new Map();

  /**
   * Create new pipeline from template
   */
  createFromTemplate(templateId: string, customOptions?: Record<string, any>): Pipeline {
    const template = PIPELINE_TEMPLATES.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const steps: PipelineStep[] = template.steps.map((step, index) => ({
      ...step,
      id: `step_${index}`,
      options: { ...step.options, ...customOptions },
    }));

    const pipeline: Pipeline = {
      id: `pipeline_${nanoid(8)}`,
      name: template.name,
      steps,
      status: 'pending',
      createdAt: new Date(),
      results: {},
    };

    this.pipelines.set(pipeline.id, pipeline);
    this.results.set(pipeline.id, new Map());

    return pipeline;
  }

  /**
   * Create custom pipeline
   */
  createCustom(name: string, steps: Omit<PipelineStep, 'id'>[]): Pipeline {
    const pipelineSteps: PipelineStep[] = steps.map((step, index) => ({
      ...step,
      id: `step_${index}`,
    }));

    const pipeline: Pipeline = {
      id: `pipeline_${nanoid(8)}`,
      name,
      steps: pipelineSteps,
      status: 'pending',
      createdAt: new Date(),
      results: {},
    };

    this.pipelines.set(pipeline.id, pipeline);
    this.results.set(pipeline.id, new Map());

    return pipeline;
  }

  /**
   * Execute pipeline
   */
  async execute(
    pipelineId: string,
    inputs: Record<string, any> = {}
  ): Promise<ContentStudioResponse<Pipeline>> {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return { success: false, error: 'Pipeline not found' };
    }

    pipeline.status = 'processing';
    const results = this.results.get(pipelineId)!;

    try {
      // Execute steps in order (respecting dependencies)
      for (const step of pipeline.steps) {
        // Check dependencies
        if (step.dependencies) {
          const depsMet = step.dependencies.every(depId => results.has(depId));
          if (!depsMet) {
            throw new Error(`Dependencies not met for step ${step.id}`);
          }
        }

        // Merge step options with inputs and previous results
        const stepOptions = this.mergeOptions(step, inputs, results);

        // Execute step
        const result = await this.executeStep(step.type, stepOptions);
        
        if (result.success) {
          results.set(step.id, result.data);
          pipeline.results[step.id] = result.data;
        } else {
          console.error(`Step ${step.id} failed:`, result.error);
          // Continue with other steps even if one fails
          results.set(step.id, { error: result.error });
        }
      }

      pipeline.status = 'completed';
      pipeline.completedAt = new Date();

      return {
        success: true,
        data: pipeline,
      };
    } catch (error: any) {
      pipeline.status = 'failed';
      return {
        success: false,
        error: error.message,
        data: pipeline,
      };
    }
  }

  /**
   * Execute single step
   */
  private async executeStep(
    type: string,
    options: Record<string, any>
  ): Promise<ContentStudioResponse<any>> {
    // Импортируем типы для приведения
    const { ImageGenerationOptions, AudioGenerationOptions, TextGenerationOptions, TranslationOptions, WatermarkRemovalOptions } = require('./types');
    
    switch (type) {
      case 'image':
        return imageGen.generate(options as any);
      
      case 'audio':
        return audioGen.generate(options as any);
      
      case 'text':
        return textGen.generate(options as any);
      
      case 'translate':
        return translate.translate(options as any);
      
      case 'watermark-remove':
        if (options.videoPath) {
          return watermarkRemove.fromVideo(options.videoPath, options as any);
        }
        return watermarkRemove.fromImage(options.imagePath || '', options as any);
      
      case 'video':
        // Video generation would go through free-video-gen service
        return {
          success: false,
          error: 'Video generation requires free-video-gen service',
        };
      
      default:
        return {
          success: false,
          error: `Unknown step type: ${type}`,
        };
    }
  }

  /**
   * Merge options from inputs and previous results
   */
  private mergeOptions(
    step: PipelineStep,
    inputs: Record<string, any>,
    results: Map<string, any>
  ): Record<string, any> {
    const merged = { ...step.options };

    // Add global inputs
    Object.assign(merged, inputs);

    // Add dependency results
    if (step.dependencies) {
      for (const depId of step.dependencies) {
        const depResult = results.get(depId);
        if (depResult) {
          // Map common result fields
          if (depResult.content) merged.text = depResult.content;
          if (depResult.url) merged.imagePath = depResult.url;
          if (depResult.localPath) merged.videoPath = depResult.localPath;
          if (depResult.base64) merged.imageBase64 = depResult.base64;
        }
      }
    }

    return merged;
  }

  /**
   * Get pipeline status
   */
  getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * Get all pipelines
   */
  getAllPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Get available templates
   */
  getTemplates(): PipelineTemplate[] {
    return PIPELINE_TEMPLATES;
  }

  /**
   * Delete pipeline
   */
  deletePipeline(pipelineId: string): boolean {
    this.results.delete(pipelineId);
    return this.pipelines.delete(pipelineId);
  }
}

// Singleton
let pipelineInstance: ContentPipeline | null = null;

export function getContentPipeline(): ContentPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new ContentPipeline();
  }
  return pipelineInstance;
}

// Convenience exports
export const pipeline = {
  fromTemplate: (templateId: string, options?: Record<string, any>) =>
    getContentPipeline().createFromTemplate(templateId, options),
  custom: (name: string, steps: Omit<PipelineStep, 'id'>[]) =>
    getContentPipeline().createCustom(name, steps),
  execute: (pipelineId: string, inputs?: Record<string, any>) =>
    getContentPipeline().execute(pipelineId, inputs),
  get: (pipelineId: string) => getContentPipeline().getPipeline(pipelineId),
  getAll: () => getContentPipeline().getAllPipelines(),
  getTemplates: () => getContentPipeline().getTemplates(),
};
