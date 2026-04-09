// Пошаговый генератор контента
// Позволяет видеть генерацию слово за словом и вмешиваться на любом этапе

import { EventEmitter } from 'events';
import { db } from '../db';
import { nanoid } from 'nanoid';

export type ContentType = 'post' | 'image' | 'video' | 'story';
export type GenerationStep = 
  | 'analyzing' 
  | 'planning' 
  | 'drafting' 
  | 'refining' 
  | 'finalizing';

export interface StepConfig {
  contentType: ContentType;
  prompt: string;
  platform?: string;
  influencerId?: string;
  style?: string;
  tone?: string;
  language?: string;
}

export interface StepResult {
  step: GenerationStep;
  content: string;
  progress: number; // 0-100
  canEdit: boolean;
  metadata?: Record<string, any>;
}

export class StepByStepGenerator extends EventEmitter {
  private currentGeneration: string | null = null;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private currentContent: string = '';
  private steps: GenerationStep[] = ['analyzing', 'planning', 'drafting', 'refining', 'finalizing'];
  
  constructor() {
    super();
  }

  async startGeneration(config: StepConfig): Promise<string> {
    const generation = await db.stepByStepGeneration.create({
      data: {
        id: nanoid(),
        contentType: config.contentType,
        prompt: config.prompt,
        platform: config.platform,
        influencerId: config.influencerId,
        status: 'generating',
        totalSteps: this.steps.length,
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.currentGeneration = generation.id;
    this.isPaused = false;
    this.isCancelled = false;
    this.currentContent = '';

    this.runSteps(config, generation.id);
    return generation.id;
  }

  private async runSteps(config: StepConfig, generationId: string): Promise<void> {
    try {
      for (let i = 0; i < this.steps.length; i++) {
        if (this.isCancelled) {
          await this.markCancelled(generationId);
          return;
        }

        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (this.isCancelled) {
            await this.markCancelled(generationId);
            return;
          }
        }

        const step = this.steps[i];
        const result = await this.executeStep(step, config, i);

        await db.stepByStepGeneration.update({
          where: { id: generationId },
          data: {
            currentStep: i + 1,
            generatedContent: JSON.stringify({
              steps: (await this.getGeneratedContent(generationId))?.steps?.concat([result]) || [result],
            }),
          },
        });

        this.emit('step', {
          generationId,
          step,
          content: result.content,
          progress: ((i + 1) / this.steps.length) * 100,
          canEdit: step === 'drafting' || step === 'refining',
        });
      }

      await db.stepByStepGeneration.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      this.emit('complete', { generationId, content: this.currentContent });
    } catch (error) {
      await db.stepByStepGeneration.update({
        where: { id: generationId },
        data: { status: 'cancelled' },
      });
      this.emit('error', { generationId, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async executeStep(
    step: GenerationStep, 
    config: StepConfig,
    stepIndex: number
  ): Promise<StepResult> {
    const { getZAI } = await import('@/lib/z-ai');
    const zai = await getZAI();

    let content = '';
    let metadata: Record<string, any> = {};

    switch (step) {
      case 'analyzing':
        const analysisPrompt = `Analyze this content request and identify key themes, tone, and target audience:
Request: "${config.prompt}"
Platform: ${config.platform || 'general'}
Style: ${config.style || 'natural'}
Respond in JSON format with: { themes: [], tone: "", audience: "", keywords: [] }`;

        const analysis = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a content analysis expert. Respond only in JSON.' },
            { role: 'user', content: analysisPrompt },
          ],
        });

        content = analysis.choices[0]?.message?.content || '';
        metadata = { analysis: 'completed' };
        break;

      case 'planning':
        const planningPrompt = `Create a detailed content plan for:
Request: "${config.prompt}"
Format: ${config.contentType}
Provide a structured outline with main points and key messages.`;

        const plan = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a content planning expert. Create concise, actionable plans.' },
            { role: 'user', content: planningPrompt },
          ],
        });

        content = plan.choices[0]?.message?.content || '';
        metadata = { plan: 'completed' };
        break;

      case 'drafting':
        const draftPrompt = `Write a ${config.contentType} based on this request:
"${config.prompt}"
Platform: ${config.platform || 'general'}
Tone: ${config.tone || 'engaging'}
Style: ${config.style || 'natural'}
Write compelling content that engages the audience.`;

        this.currentContent = '';
        const draftResponse = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are an expert content creator.' },
            { role: 'user', content: draftPrompt },
          ],
        });

        content = draftResponse.choices[0]?.message?.content || '';
        this.currentContent = content;
        metadata = { draft: 'completed', wordCount: content.split(' ').length };
        break;

      case 'refining':
        const refinePrompt = `Improve and polish this content:
"${this.currentContent}"
Make it more engaging, fix any issues, and optimize for ${config.platform || 'general'} platform.`;

        const refined = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a content refinement expert. Polish and improve.' },
            { role: 'user', content: refinePrompt },
          ],
        });

        content = refined.choices[0]?.message?.content || this.currentContent;
        this.currentContent = content;
        metadata = { refined: 'completed' };
        break;

      case 'finalizing':
        content = this.currentContent;
        metadata = { 
          finalized: true,
          characterCount: content.length,
          wordCount: content.split(' ').length,
        };
        break;
    }

    return {
      step,
      content,
      progress: ((stepIndex + 1) / this.steps.length) * 100,
      canEdit: step === 'drafting' || step === 'refining',
      metadata,
    };
  }

  async pause(generationId: string): Promise<void> {
    this.isPaused = true;
    this.emit('paused', { generationId });
  }

  async resume(generationId: string): Promise<void> {
    this.isPaused = false;
    this.emit('resumed', { generationId });
  }

  async cancel(generationId: string): Promise<void> {
    this.isCancelled = true;
    await this.markCancelled(generationId);
    this.emit('cancelled', { generationId });
  }

  async applyEdit(generationId: string, edit: string, step: GenerationStep): Promise<void> {
    const generation = await db.stepByStepGeneration.findUnique({
      where: { id: generationId },
    });

    if (!generation) return;

    const edits = generation.userEdits ? JSON.parse(generation.userEdits) : [];
    edits.push({ step, edit, timestamp: new Date() });

    await db.stepByStepGeneration.update({
      where: { id: generationId },
      data: { userEdits: JSON.stringify(edits) },
    });

    this.currentContent = edit;
    this.emit('edited', { generationId, step, content: edit });
  }

  async getStatus(generationId: string): Promise<{
    status: string;
    currentStep: number;
    totalSteps: number;
    progress: number;
    content?: string;
  }> {
    const generation = await db.stepByStepGeneration.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return { status: 'not_found', currentStep: 0, totalSteps: 5, progress: 0 };
    }

    let content: string | undefined;
    if (generation.generatedContent) {
      const parsed = JSON.parse(generation.generatedContent);
      const lastStep = parsed.steps?.[parsed.steps.length - 1];
      content = lastStep?.content;
    }

    return {
      status: generation.status,
      currentStep: generation.currentStep,
      totalSteps: generation.totalSteps,
      progress: (generation.currentStep / generation.totalSteps) * 100,
      content,
    };
  }

  private async markCancelled(generationId: string): Promise<void> {
    await db.stepByStepGeneration.update({
      where: { id: generationId },
      data: { status: 'cancelled' },
    });
  }

  private async getGeneratedContent(generationId: string): Promise<any> {
    const generation = await db.stepByStepGeneration.findUnique({
      where: { id: generationId },
    });

    if (!generation?.generatedContent) return null;
    return JSON.parse(generation.generatedContent);
  }
}

let stepByStepGeneratorInstance: StepByStepGenerator | null = null;

export function getStepByStepGenerator(): StepByStepGenerator {
  if (!stepByStepGeneratorInstance) {
    stepByStepGeneratorInstance = new StepByStepGenerator();
  }
  return stepByStepGeneratorInstance;
}

export const stepByStep = {
  start: (config: StepConfig) => getStepByStepGenerator().startGeneration(config),
  pause: (id: string) => getStepByStepGenerator().pause(id),
  resume: (id: string) => getStepByStepGenerator().resume(id),
  cancel: (id: string) => getStepByStepGenerator().cancel(id),
  edit: (id: string, edit: string, step: GenerationStep) => 
    getStepByStepGenerator().applyEdit(id, edit, step),
  getStatus: (id: string) => getStepByStepGenerator().getStatus(id),
};
