import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/z-ai';
import { hunyuanService } from '@/lib/hunyuan-service';
import { db } from '@/lib/db';

// POST /api/hunyuan/generate - Генерация контента
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, prompt, platform, style, settings, action, ...params } = body;

    // Новый формат запроса от Hunyuan Studio Pro
    if (mode && !action) {
      switch (mode) {
        case 'text':
          return await generateText(prompt, platform, style, settings);
        
        case 'image':
          return await generateImage(prompt, style);
        
        case 'video':
          return await generateVideo(prompt, params);
        
        default:
          return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
      }
    }

    // Старый формат с action
    switch (action) {
      case 'generateImage':
        const imageResult = await hunyuanService.generateImage(params.prompt, {
          negativePrompt: params.negativePrompt,
          style: params.style,
          size: params.size,
        });
        return NextResponse.json(imageResult);

      case 'generateVideo':
        const videoResult = await hunyuanService.generateVideo({
          text: params.text,
          avatar: params.avatar,
          voice: params.voice,
          language: params.language,
          subtitles: params.subtitles,
          backgroundColor: params.backgroundColor,
        });
        return NextResponse.json(videoResult);

      case 'editImage':
        const editResult = await hunyuanService.editImage(params.imagePath, params.command);
        return NextResponse.json(editResult);

      case 'generateAvatar':
        const avatarResult = await hunyuanService.generateAvatar({
          gender: params.gender,
          age: params.age,
          style: params.style,
          description: params.description,
        });
        return NextResponse.json(avatarResult);

      case 'generateContent':
        const contentResult = await hunyuanService.generateContentForPlatform({
          type: params.type,
          platform: params.platform,
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          templateId: params.templateId,
          influencerId: params.influencerId,
          accountId: params.accountId,
          styleParams: params.styleParams,
        });
        return NextResponse.json(contentResult);

      case 'generateBatch':
        const batchResult = await hunyuanService.generateBatch(params.items);
        return NextResponse.json({ results: batchResult });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API Hunyuan Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Генерация текста
async function generateText(prompt: string, platform: string, style: string, settings: any) {
  const startTime = Date.now();
  
  try {
    const zai = await getZAI();
    
    // Системный промпт в зависимости от платформы и стиля
    const platformPrompts: Record<string, string> = {
      telegram: 'Ты создаёшь контент для Telegram-канала. Используй эмодзи, хештеги, читабельное форматирование.',
      instagram: 'Ты создаёшь контент для Instagram. Используй визуальные эмодзи, хештеги в конце, призыв к действию.',
      tiktok: 'Ты создаёшь контент для TikTok. Короткие, цепляющие фразы, трендовые хештеги.',
      youtube: 'Ты создаёшь описание для YouTube. SEO-оптимизация, теги, таймкоды.',
      vk: 'Ты создаёшь контент для VK. Русскоязычная аудитория, умеренное использование эмодзи.',
      twitter: 'Ты создаёшь твит. Максимум 280 символов, цепляющее начало.',
    };

    const stylePrompts: Record<string, string> = {
      professional: 'Профессиональный тон, экспертная позиция, факты.',
      casual: 'Дружелюбный, неформальный, разговорный стиль.',
      provocative: 'Провокационный, вызывающий дискуссию, смелые утверждения.',
      storytelling: 'Повествовательный стиль, история, эмоциональный крючок.',
      humor: 'Юмористический, ироничный, с шутками.',
      educational: 'Обучающий, полезный, структурированный.',
      promotional: 'Продающий, с призывом к действию, выгоды.',
      viral: 'Вирусный, максимально цепляющий, для широкой аудитории.',
    };

    const systemPrompt = `${platformPrompts[platform] || platformPrompts.telegram}

Стиль: ${stylePrompts[style] || stylePrompts.casual}

Всегда отвечай на русском языке. Создавай уникальный, оригинальный контент.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: settings?.temperature ?? 0.7,
    });

    const result = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      content: result,
      result,
      platform,
      style,
      generationTime: Date.now() - startTime,
      usage: {
        tokens: completion.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error('Text generation error:', error);
    
    // Fallback
    return NextResponse.json({
      success: true,
      content: generateFallbackContent(prompt, platform, style),
      result: generateFallbackContent(prompt, platform, style),
      platform,
      style,
      fallback: true,
      generationTime: Date.now() - startTime,
    });
  }
}

// Генерация изображения
async function generateImage(prompt: string, imageStyle: string) {
  const startTime = Date.now();
  
  try {
    const zai = await getZAI();

    const styleEnhancements: Record<string, string> = {
      realistic: 'photorealistic, high detail, natural lighting, professional photography',
      anime: 'anime style, vibrant colors, detailed illustration, manga aesthetic',
      '3d': '3D render, octane render, high quality, cinematic lighting',
      'digital-art': 'digital art, trending on artstation, highly detailed, masterpiece',
      photography: 'professional photography, DSLR, sharp focus, natural lighting',
      cinematic: 'cinematic, movie still, dramatic lighting, 8k, ultra HD',
      minimalist: 'minimalist, clean design, simple shapes, modern aesthetic',
      fantasy: 'fantasy art, magical, ethereal, detailed, epic scene',
    };

    const enhancedPrompt = `${prompt}, ${styleEnhancements[imageStyle] || styleEnhancements.realistic}`;

    const response = await zai.images.generations.create({
      prompt: enhancedPrompt,
      size: '1024x1024',
    });

    const imageBase64 = response.data[0]?.base64;

    return NextResponse.json({
      success: true,
      image: imageBase64 ? `data:image/png;base64,${imageBase64}` : null,
      prompt: enhancedPrompt,
      style: imageStyle,
      generationTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    
    return NextResponse.json({
      success: true,
      url: `/api/placeholder?width=1024&height=1024&text=${encodeURIComponent(prompt.slice(0, 30))}`,
      image: null,
      prompt,
      style: imageStyle,
      fallback: true,
      generationTime: Date.now() - startTime,
    });
  }
}

// Генерация видео через z-ai-web-dev-sdk
async function generateVideo(prompt: string, params: any) {
  const startTime = Date.now();
  
  try {
    const zai = await getZAI();
    
    const style = params.style || 'cinematic';
    const duration = params.duration || 5;
    const resolution = params.resolution || '720p';
    
    // Стили для видео
    const styleEnhancements: Record<string, string> = {
      cinematic: 'cinematic style, dramatic lighting, film quality, 4k, professional camera movement',
      anime: 'anime style, vibrant colors, Japanese animation, detailed frames',
      realistic: 'photorealistic, high detail, natural lighting, documentary quality',
      '3d': '3D render, octane render, CGI quality, cinematic lighting, detailed modeling',
      fantasy: 'fantasy style, magical atmosphere, ethereal, epic scene, detailed',
      scifi: 'sci-fi futuristic style, cyberpunk elements, neon lights, high tech',
      nature: 'nature documentary style, beautiful landscapes, wildlife, aerial shots',
      abstract: 'abstract artistic style, creative visuals, motion graphics, artistic',
    };
    
    const enhancedPrompt = `${prompt}, ${styleEnhancements[style] || styleEnhancements.cinematic}`;
    
    // Маппинг разрешения
    const sizeMap: Record<string, string> = {
      '720p': '1280x720',
      '1080p': '1920x1080',
      '4k': '3840x2160',
    };
    
    // Создаём задачу на генерацию видео
    const task = await zai.video.generations.create({
      prompt: enhancedPrompt,
      quality: 'quality',
      size: sizeMap[resolution] || '1280x720',
      fps: 30,
      duration: duration === 10 ? 10 : 5,
      with_audio: false,
    });
    
    console.log('[Hunyuan] Video task created:', task.id);
    
    // Poll for results (с таймаутом)
    let result = await zai.async.result.query(task.id);
    let pollCount = 0;
    const maxPolls = 120; // 10 минут максимум
    const pollInterval = 5000; // 5 секунд
    
    while (result.task_status === 'PROCESSING' && pollCount < maxPolls) {
      pollCount++;
      console.log(`[Hunyuan] Polling ${pollCount}/${maxPolls}: Status is ${result.task_status}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      result = await zai.async.result.query(task.id);
    }
    
    if (result.task_status === 'SUCCESS') {
      const videoUrl = (result as any).video_result?.[0]?.url ||
                      (result as any).video_url ||
                      (result as any).url ||
                      (result as any).video;
      
      // Сохраняем в БД
      const fs = await import('fs');
      const path = await import('path');
      const { nanoid } = await import('nanoid');
      
      const downloadDir = path.join(process.cwd(), 'download', 'hunyuan', 'videos');
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      const content = await db.generatedContent.create({
        data: {
          id: nanoid(),
          type: 'video',
          platform: 'telegram',
          source: 'z-ai-sdk-hunyuan',
          prompt: enhancedPrompt,
          mediaUrl: videoUrl || null,
          status: 'completed',
          generationTime: Date.now() - startTime,
          metadata: JSON.stringify({
            taskId: task.id,
            style,
            duration,
            resolution,
          }),
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        success: true,
        url: videoUrl,
        videoUrl,
        contentId: content.id,
        taskId: task.id,
        prompt: enhancedPrompt,
        style,
        duration,
        resolution,
        generationTime: Date.now() - startTime,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Video generation timed out or failed',
        taskId: task.id,
        status: result.task_status,
        generationTime: Date.now() - startTime,
      });
    }
    
  } catch (error) {
    console.error('[Hunyuan] Video generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      generationTime: Date.now() - startTime,
    });
  }
}

// Fallback генератор контента
function generateFallbackContent(prompt: string, platform: string, style: string): string {
  const templates: Record<string, string[]> = {
    gambling: [
      '🎰 Друзья, сегодня невероятный день! Поднял х10 за утро!\n\nКто ещё не с нами - присоединяйтесь:\n✅ Проверенная платформа\n✅ Моментальные выплаты\n✅ Бонусы новичкам\n\n🔗 Ссылка в профиле',
      '💰 Наконец-то сорвал куш! Сколько я ждал этого момента...\n\nДелюсь стратегией в личке 🔥',
    ],
    crypto: [
      '📈 $BTC на новых максимумах!\n\nМой портфель за неделю: +127%\n\nСигналы которые работают:\n• Точный вход\n• Стоп-лосс\n• Профит\n\n🚀 Подписывайся!',
      '💎 HODL или продавать?\n\nМой анализ показывает бычий тренд. Аллигатор спит, MACD растёт.\n\n📊 Полный разбор в закрепе',
    ],
    default: [
      `🔥 ${prompt}\n\nЭто пример сгенерированного контента.\n\n#контент #маркетинг`,
    ],
  };

  const category = prompt.toLowerCase().includes('казино') ? 'gambling' :
                   prompt.toLowerCase().includes('крипт') ? 'crypto' : 'default';

  const categoryTemplates = templates[category] || templates.default;
  return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
}

// GET /api/hunyuan/generate - Статус
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');

  if (contentId) {
    const status = await hunyuanService.getStatus(contentId);
    return NextResponse.json(status);
  }

  return NextResponse.json({
    status: 'available',
    modes: ['text', 'image', 'video'],
    platforms: ['telegram', 'instagram', 'tiktok', 'youtube', 'vk', 'twitter'],
    styles: ['professional', 'casual', 'provocative', 'storytelling', 'humor', 'educational', 'promotional', 'viral'],
  });
}
