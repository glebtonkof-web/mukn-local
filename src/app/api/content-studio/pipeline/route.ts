import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Content Pipeline API
 * Execute multi-step content creation workflows
 */

// Pipeline templates
const PIPELINE_TEMPLATES: Record<string, {
  name: string;
  description: string;
  steps: Array<{
    type: 'image' | 'video' | 'tts' | 'translate' | 'stitch';
    name: string;
    config: Record<string, any>;
  }>;
  estimated_time_minutes: number;
}> = {
  social_media_post: {
    name: 'Соцсеть пост',
    description: 'Генерация изображения + подписи для соцсетей',
    steps: [
      { type: 'image', name: 'Генерация изображения', config: {} },
      { type: 'tts', name: 'Создание озвучки', config: {} },
    ],
    estimated_time_minutes: 2,
  },
  video_short: {
    name: 'Короткое видео',
    description: 'Генерация видео для TikTok/Reels',
    steps: [
      { type: 'image', name: 'Создание кадра', config: { aspect_ratio: '9:16' } },
      { type: 'video', name: 'Анимация кадра', config: { duration: 10 } },
    ],
    estimated_time_minutes: 5,
  },
  content_package: {
    name: 'Пакет контента',
    description: 'Генерация нескольких вариантов изображений',
    steps: [
      { type: 'image', name: 'Вариант 1', config: { style: 'cinematic' } },
      { type: 'image', name: 'Вариант 2', config: { style: 'realistic' } },
      { type: 'image', name: 'Вариант 3', config: { style: 'artistic' } },
    ],
    estimated_time_minutes: 3,
  },
  multilingual_content: {
    name: 'Мультиязычный контент',
    description: 'Контент с переводом на несколько языков',
    steps: [
      { type: 'image', name: 'Генерация изображения', config: {} },
      { type: 'translate', name: 'Перевод EN', config: { target_language: 'en' } },
      { type: 'translate', name: 'Перевод ZH', config: { target_language: 'zh' } },
    ],
    estimated_time_minutes: 2,
  },
  voiceover_video: {
    name: 'Видео с озвучкой',
    description: 'Видео с текстом и голосовым сопровождением',
    steps: [
      { type: 'video', name: 'Генерация видео', config: { duration: 10 } },
      { type: 'tts', name: 'Создание озвучки', config: {} },
    ],
    estimated_time_minutes: 6,
  },
};

// Global ZAI instance for reuse
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Global pipeline executions store
declare global {
  var pipelineExecutions: Map<string, any>;
}

if (!global.pipelineExecutions) {
  global.pipelineExecutions = new Map();
}

const pipelineExecutions = global.pipelineExecutions;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      template_id,
      prompt,
      custom_steps,
      config = {},
    } = body;

    // Validation
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt обязателен' },
        { status: 400 }
      );
    }

    // Get template or use custom steps
    let steps: Array<{ type: string; name: string; config: Record<string, any> }>;
    let templateName = 'Кастомный пайплайн';
    let estimatedTime = 5;

    if (template_id && PIPELINE_TEMPLATES[template_id]) {
      const template = PIPELINE_TEMPLATES[template_id];
      steps = template.steps.map(s => ({
        ...s,
        config: { ...s.config, ...config },
      }));
      templateName = template.name;
      estimatedTime = template.estimated_time_minutes;
    } else if (custom_steps && Array.isArray(custom_steps)) {
      steps = custom_steps;
    } else {
      return NextResponse.json(
        { success: false, error: 'Выберите шаблон или укажите шаги' },
        { status: 400 }
      );
    }

    // Generate execution ID
    const executionId = `pipeline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create execution record
    const execution = {
      execution_id: executionId,
      template_id,
      template_name: templateName,
      prompt,
      status: 'pending',
      steps: steps.map((s, i) => ({
        ...s,
        index: i,
        status: 'pending',
        result: null,
        error: null,
      })),
      current_step: 0,
      results: {},
      created_at: new Date().toISOString(),
      estimated_time_minutes: estimatedTime,
    };

    pipelineExecutions.set(executionId, execution);

    // Start async execution (in production, this would be a background job)
    executePipeline(executionId, prompt, steps).catch(err => {
      console.error('Pipeline execution error:', err);
    });

    return NextResponse.json({
      success: true,
      execution: {
        execution_id: executionId,
        template_name: templateName,
        step_count: steps.length,
        estimated_time_minutes: estimatedTime,
        status: 'processing',
      },
      message: 'Пайплайн запущен',
      elapsed_ms: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Pipeline error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка выполнения пайплайна',
        elapsed_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get('execution_id');

  // Check specific execution status
  if (executionId) {
    const execution = pipelineExecutions.get(executionId);
    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Пайплайн не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution,
    });
  }

  // Return all templates
  return NextResponse.json({
    success: true,
    templates: Object.entries(PIPELINE_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      step_count: template.steps.length,
      estimated_time_minutes: template.estimated_time_minutes,
      steps: template.steps.map(s => ({ type: s.type, name: s.name })),
    })),
    step_types: [
      { id: 'image', name: 'Генерация изображения' },
      { id: 'video', name: 'Генерация видео' },
      { id: 'tts', name: 'Озвучка текста' },
      { id: 'translate', name: 'Перевод' },
      { id: 'stitch', name: 'Склейка' },
    ],
  });
}

// Async pipeline execution
async function executePipeline(
  executionId: string,
  prompt: string,
  steps: Array<{ type: string; name: string; config: Record<string, any> }>
) {
  const execution = pipelineExecutions.get(executionId);
  if (!execution) return;

  const zai = await getZAI();
  const results: Record<string, any> = {};

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    execution.current_step = i;
    execution.steps[i].status = 'processing';
    pipelineExecutions.set(executionId, { ...execution });

    try {
      let result: any = null;

      switch (step.type) {
        case 'image':
          // Generate image
          const imageResponse = await zai.images.generations.create({
            prompt: `${prompt}, ${step.config.style || 'cinematic'} style`,
            size: step.config.aspect_ratio === '9:16' ? '768x1344' :
                  step.config.aspect_ratio === '16:9' ? '1344x768' : '1024x1024',
          });
          result = {
            url: imageResponse.data?.[0]?.base64 
              ? `data:image/png;base64,${imageResponse.data[0].base64}`
              : null,
          };
          break;

        case 'video':
          // Generate video (async, would need polling in production)
          result = {
            task_id: `video_task_${Date.now()}`,
            status: 'processing',
          };
          break;

        case 'tts':
          // Generate TTS
          const ttsResponse = await zai.audio.tts.create({
            input: prompt.substring(0, 1000),
            voice: step.config.voice || 'tongtong',
          });
          result = {
            audio_url: '/api/content-studio/tts',
            duration: Math.ceil(prompt.split(' ').length / 150 * 60),
          };
          break;

        case 'translate':
          // Translate text
          const translateResponse = await zai.chat.completions.create({
            messages: [
              { role: 'system', content: `Translate to ${step.config.target_language || 'en'}` },
              { role: 'user', content: prompt },
            ],
          });
          result = {
            translated_text: translateResponse.choices?.[0]?.message?.content,
            target_language: step.config.target_language || 'en',
          };
          break;

        case 'stitch':
          // Plan video stitching
          result = {
            status: 'planned',
            video_count: step.config.video_urls?.length || 0,
          };
          break;
      }

      execution.steps[i].status = 'completed';
      execution.steps[i].result = result;
      results[step.name] = result;
      execution.results = results;

    } catch (err: any) {
      execution.steps[i].status = 'failed';
      execution.steps[i].error = err.message;
    }

    pipelineExecutions.set(executionId, { ...execution });
  }

  // Mark execution complete
  const failedSteps = execution.steps.filter((s: any) => s.status === 'failed');
  execution.status = failedSteps.length > 0 ? 'partial' : 'completed';
  execution.completed_at = new Date().toISOString();
  pipelineExecutions.set(executionId, { ...execution });
}
