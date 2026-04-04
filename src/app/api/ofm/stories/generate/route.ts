import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Story themes for OFM
const STORY_THEMES: Record<string, {
  name: string;
  description: string;
  textPrompt: string;
  imagePrompt: string;
}> = {
  lifestyle: {
    name: 'Лайфстайл',
    description: 'Повседневная жизнь, уют',
    textPrompt: 'Красивое утро, вкусный кофе, уютная атмосфера',
    imagePrompt: 'Beautiful young woman lifestyle photo, morning coffee, cozy apartment, soft natural lighting, Instagram style, aesthetic, 4k quality',
  },
  fitness: {
    name: 'Фитнес',
    description: 'Тренировки, спорт',
    textPrompt: 'Утренняя тренировка, энергия, мотивация',
    imagePrompt: 'Fit young woman at gym, workout, athletic wear, natural lighting, fitness lifestyle, motivational, high quality photo',
  },
  travel: {
    name: 'Путешествия',
    description: 'Поездки, новые места',
    textPrompt: 'Новый город, приключения, впечатления',
    imagePrompt: 'Beautiful young woman traveling, scenic destination, vacation vibes, golden hour lighting, Instagram aesthetic, wanderlust',
  },
  food: {
    name: 'Еда',
    description: 'Вкусная еда, рестораны',
    textPrompt: 'Вкусный ужин, любимое место',
    imagePrompt: 'Beautiful food photography, stylish restaurant setting, young woman enjoying meal, warm lighting, Instagram food blogger style',
  },
  beauty: {
    name: 'Красота',
    description: 'Уход, косметика',
    textPrompt: 'Утренний уход, свежесть',
    imagePrompt: 'Beautiful young woman skincare routine, natural beauty, soft lighting, clean aesthetic, beauty influencer style',
  },
  party: {
    name: 'Вечеринка',
    description: 'Клубы, вечеринки',
    textPrompt: 'Отличный вечер, хорошая компания',
    imagePrompt: 'Young woman at party, night out, stylish outfit, club lights, fun atmosphere, social media aesthetic',
  },
  business: {
    name: 'Бизнес',
    description: 'Работа, карьера',
    textPrompt: 'Продуктивный день, новые проекты',
    imagePrompt: 'Young professional woman working, laptop, coffee shop or modern office, productive atmosphere, entrepreneur vibes',
  },
  relaxation: {
    name: 'Отдых',
    description: 'Релакс, spa, массаж',
    textPrompt: 'День для себя, релакс',
    imagePrompt: 'Young woman relaxing, spa day, self care, peaceful atmosphere, soft lighting, wellness aesthetic',
  },
};

// POST /api/ofm/stories/generate - Generate story content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      theme = 'lifestyle',
      customTextPrompt,
      customImagePrompt,
      niche,
      includeLink = true,
      style = 'casual',
      voice,
    } = body;

    const themeData = STORY_THEMES[theme] || STORY_THEMES.lifestyle;

    const zai = await ZAI.create();

    // Step 1: Generate story text using DeepSeek
    const textSystemPrompt = `Ты — девушка 23-28 лет, ведущая Telegram-канал.
Твоя задача: написать короткий текст для сторис (Stories).

Стиль: ${style}
Тема: ${themeData.name} - ${themeData.description}

Правила:
- Максимум 2-3 предложения
- Будь естественной, пиши как живой человек
- Используй эмодзи (1-2 штуки)
- Можно добавить призыв к действию (без прямой рекламы)
- Текст должен вызывать желание узнать больше

${niche ? `Ниша канала: ${niche}` : ''}
${customTextPrompt ? `Дополнительный контекст: ${customTextPrompt}` : ''}

Базовая идея: ${themeData.textPrompt}`;

    const textCompletion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: textSystemPrompt },
        { role: 'user', content: 'Напиши текст для сторис.' }
      ],
      temperature: 0.85,
      max_tokens: 150,
    });

    const storyText = textCompletion.choices?.[0]?.message?.content?.trim() || themeData.textPrompt;

    // Step 2: Generate image using z-ai-web-dev-sdk
    const imagePrompt = customImagePrompt || themeData.imagePrompt;

    logger.info('Generating story image', { theme, imagePrompt });

    const imageResponse = await zai.images.generations.create({
      prompt: imagePrompt,
      size: '1024x1024',
    });

    const imageBase64 = imageResponse.data?.[0]?.base64 || imageResponse.data?.[0] || '';

    // Step 3: Generate suggested link text
    let suggestedLink = '';
    if (includeLink) {
      const linkPrompt = `На основе текста сторис предложи короткий текст для ссылки/кнопки.
Текст сторис: ${storyText}
Ниша: ${niche || themeData.name}

Правила:
- Максимум 3-4 слова
- Призыв к действию
- Без эмодзи
- Например: "Подписаться", "Узнать больше", "Смотреть канал"`;

      const linkCompletion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Ты — маркетолог. Предлагаешь короткие, цепляющие тексты для кнопок.' },
          { role: 'user', content: linkPrompt }
        ],
        temperature: 0.7,
        max_tokens: 20,
      });

      suggestedLink = linkCompletion.choices?.[0]?.message?.content?.trim() || 'Подписаться';
    }

    // Optional: Generate voice narration
    let voiceAudio = null;
    if (voice) {
      try {
        // @ts-expect-error - TTS may not be available in SDK type definitions
        const audioResponse = await zai.tts?.generate({
          text: storyText,
          voice: voice,
          speed: 0.9,
        });
        voiceAudio = audioResponse?.audio || audioResponse || null;
      } catch (ttsError) {
        logger.warn('Failed to generate voice for story', { error: String(ttsError) });
      }
    }

    // Create story record
    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the generation
    await db.actionLog.create({
      data: {
        action: 'story_generated',
        entityType: 'story',
        entityId: storyId,
        details: JSON.stringify({
          theme,
          textLength: storyText.length,
          hasImage: !!imageBase64,
          hasVoice: !!voiceAudio,
          niche,
        }),
        userId: 'system',
      },
    }).catch(err => logger.error('Failed to log story generation', err));

    logger.info('Story generated', {
      id: storyId,
      theme,
      textLength: storyText.length,
      hasImage: !!imageBase64,
      hasVoice: !!voiceAudio,
    });

    return NextResponse.json({
      success: true,
      story: {
        id: storyId,
        text: storyText,
        imageBase64: typeof imageBase64 === 'string' ? imageBase64 : 
          (imageBase64 && typeof imageBase64 === 'object' && 'base64' in imageBase64 ? imageBase64.base64 : ''),
        suggestedLink,
        theme,
        themeName: themeData.name,
        voiceAudio,
        createdAt: new Date().toISOString(),
      },
      metadata: {
        aiModel: textCompletion.model || 'deepseek',
        imageSize: '1024x1024',
        theme,
        niche,
      },
    });

  } catch (error) {
    logger.error('Story generation error', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate story', details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/ofm/stories/generate - Get available themes
export async function GET() {
  try {
    const themes = Object.entries(STORY_THEMES).map(([key, data]) => ({
      id: key,
      name: data.name,
      description: data.description,
    }));

    return NextResponse.json({
      success: true,
      themes,
      total: themes.length,
    });

  } catch (error) {
    logger.error('Failed to get story themes', error as Error);
    return NextResponse.json(
      { error: 'Failed to get themes' },
      { status: 500 }
    );
  }
}
