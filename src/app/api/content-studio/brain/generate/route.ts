import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Brain endpoint using Kimi K2.5
 * Generates storyboards, scripts, and prompts for video production
 */

const CONTENT_TYPES = {
  storyboard: 'Generate a detailed storyboard with scene descriptions',
  script: 'Write a complete video script with dialogue',
  prompts: 'Generate AI image/video prompts for each scene',
  scenes: 'Break down content into individual scenes',
};

const TONE_PRESETS = {
  cinematic: 'Use cinematic language, dramatic pacing, and visual storytelling',
  documentary: 'Use factual, informative tone with clear narration',
  commercial: 'Use persuasive, engaging marketing language',
  artistic: 'Use creative, metaphorical, and poetic language',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, type = 'storyboard', tone = 'cinematic', language = 'ru', count } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt/topic is required' },
        { status: 400 }
      );
    }

    // Build system prompt based on type and tone
    const typeInstruction = CONTENT_TYPES[type as keyof typeof CONTENT_TYPES] || CONTENT_TYPES.storyboard;
    const toneInstruction = TONE_PRESETS[tone as keyof typeof TONE_PRESETS] || TONE_PRESETS.cinematic;

    const systemPrompt = `You are Kimi K2.5, an expert AI assistant for video content creation.
Your task: ${typeInstruction}
Style: ${toneInstruction}
Language: ${language === 'ru' ? 'Russian' : 'English'}

${type === 'prompts' ? `
Generate ${count || 10} unique, detailed prompts for AI video/image generation.
Each prompt should be on a separate line.
Include camera movements, lighting, atmosphere, and style details.` : ''}

${type === 'storyboard' ? `
Create a detailed storyboard with:
- Scene number
- Duration (in seconds)
- Visual description
- Camera movement
- Audio/narration notes` : ''}

Be creative, detailed, and consistent. Output only the requested content.`;

    // Try to use Z-AI for generation
    try {
      const zai = await ZAI.create();
      
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      });

      const content = completion.choices?.[0]?.message?.content;

      if (content) {
        return NextResponse.json({
          success: true,
          text: {
            content,
            type,
            tone,
            language,
          },
          provider: 'kimi',
          tokens_used: completion.usage?.total_tokens || 0,
        });
      }
    } catch (zaiError) {
      console.log('Brain generation fallback to demo mode');
    }

    // Fallback: Generate template content
    let fallbackContent = '';
    
    if (type === 'prompts') {
      const prompts = [];
      for (let i = 0; i < (count || 10); i++) {
        prompts.push(`Scene ${i + 1}: ${prompt} - cinematic lighting, 4k quality, professional camera work, variation ${i + 1}`);
      }
      fallbackContent = prompts.join('\n');
    } else if (type === 'storyboard') {
      fallbackContent = `РАСКАДРОВКА: ${prompt}

Сцена 1 [5 сек]
Визуал: Открывающий кадр, панорама
Камера: Медленный наезд
Аудио: Эпичная музыка на фоне

Сцена 2 [10 сек]
Визуал: Главный объект в фокусе
Камера: Статичный кадр
Аудио: Закадровый голос

[Продолжение следует...]

Сгенерировано в демо-режиме. Подключите Kimi K2.5 для полной функциональности.`;
    } else {
      fallbackContent = `[Сгенерированный ${type} на тему: ${prompt}]

Стиль: ${tone}
Язык: ${language}

Это пример сгенерированного контента в демо-режиме.
Подключите Kimi K2.5 API для полной функциональности.`;
    }

    return NextResponse.json({
      success: true,
      text: {
        content: fallbackContent,
        type,
        tone,
        language,
      },
      provider: 'demo',
      message: 'Demo mode - configure Kimi K2.5 API for real generation',
    });
  } catch (error) {
    console.error('Brain generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    provider: 'kimi',
    name: 'Kimi K2.5',
    description: 'Advanced AI brain for content planning and prompt generation',
    capabilities: [
      'storyboard_generation',
      'script_writing',
      'prompt_enhancement',
      'scene_breakdown',
    ],
    content_types: Object.entries(CONTENT_TYPES).map(([key, value]) => ({
      id: key,
      description: value,
    })),
    tones: Object.entries(TONE_PRESETS).map(([key, value]) => ({
      id: key,
      instruction: value,
    })),
    languages: ['ru', 'en'],
  });
}
