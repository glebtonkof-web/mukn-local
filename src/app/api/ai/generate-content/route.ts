// AI Content Generation API
// Автогенерация контента: посты, комментарии, DM, сторис
// Стилизация под инфлюенсера, шаблоны для разных ниш

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAIProviderManager, TaskType } from '@/lib/ai-provider-manager';
import ZAI from 'z-ai-web-dev-sdk';

// Типы контента
export type ContentType = 'post' | 'comment' | 'dm' | 'story';

// Стили контента
export type ContentStyle = 
  | 'casual'      // Дружелюбный, разговорный
  | 'expert'      // Экспертный, профессиональный
  | 'playful'     // Игривый, флиртующий
  | 'mysterious'  // Загадочный, интригующий
  | 'provocative' // Провокационный
  | 'friendly'    // Дружелюбный
  | 'storytelling'// Сторителлинг
  | 'humor';      // Юмористический

// Ниши
export type NicheType = 'gambling' | 'crypto' | 'nutra' | 'dating' | 'bait' | 'lifestyle' | 'finance' | 'fitness';

interface ContentRequest {
  userId: string;
  contentType: ContentType;
  style?: ContentStyle;
  niche?: NicheType;
  influencerId?: string;
  campaignId?: string;
  
  // Параметры для генерации
  prompt?: string;
  targetChannel?: string;
  targetPostContent?: string;
  language?: string;
  
  // Опции
  generateVariants?: number; // Количество вариантов (1-5)
  maxLength?: number;
  includeHashtags?: boolean;
  includeEmoji?: boolean;
  includeCTA?: boolean;
  
  // Для сторис
  generateImage?: boolean;
  storyTheme?: string;
}

interface GeneratedContent {
  id: string;
  type: ContentType;
  content: string;
  style: ContentStyle;
  variants?: string[];
  metadata: {
    niche: NicheType;
    language: string;
    hashtags?: string[];
    cta?: string;
    bestPostingTime?: string;
    engagementScore?: number;
  };
  ai: {
    provider: string;
    model: string;
    tokensUsed: number;
    cached: boolean;
  };
  image?: {
    base64: string;
    prompt: string;
  };
}

// Шаблоны промптов для разных типов контента и ниш
const CONTENT_TEMPLATES: Record<ContentType, Record<NicheType, string>> = {
  post: {
    gambling: `Создай пост для Telegram-канала о ставках/казино.
Тон: {style}
Требования:
- Заинтересовать аудиторию
- Не использовать явные слова "казино", "ставки" (используй эвфемизмы)
- Добавить призыв к действию
- Длина: 100-300 символов`,
    crypto: `Создай пост о криптовалюте/инвестициях.
Тон: {style}
Требования:
- Актуальная тема
- Экспертный вид
- Призыв к действию
- Длина: 100-300 символов`,
    nutra: `Создай пост о здоровье/красоте/похудении.
Тон: {style}
Требования:
- Личный опыт/история
- Результаты
- Призыв к действию
- Длина: 100-300 символов`,
    dating: `Создай пост для дейтинг-тематики.
Тон: {style}
Требования:
- Интригующий
- Личный
- Призыв к действию
- Длина: 100-200 символов`,
    bait: `Создай байт-пост (приманка).
Тон: {style}
Требования:
- Зацепить внимание
- Создать интригу
- Не явная реклама
- Длина: 100-200 символов`,
    lifestyle: `Создай лайфстайл-пост.
Тон: {style}
Требования:
- Показать успешную жизнь
- Вдохновить
- Длина: 100-300 символов`,
    finance: `Создай пост о финансах/заработке.
Тон: {style}
Требования:
- Практическая польза
- Экспертность
- Призыв к действию
- Длина: 100-300 символов`,
    fitness: `Создай фитнес-пост.
Тон: {style}
Требования:
- Мотивация
- Личный опыт
- Практические советы
- Длина: 100-300 символов`,
  },
  comment: {
    gambling: `Создай комментарий к посту.
Контекст поста: {context}
Тон: {style}
Требования:
- Естественный, не спамный
- Заинтересовать к профилю
- Длина: 20-50 символов`,
    crypto: `Создай комментарий о крипте.
Контекст поста: {context}
Тон: {style}
Требования:
- Экспертное мнение
- Естественный
- Длина: 30-60 символов`,
    nutra: `Создай комментарий о здоровье.
Контекст поста: {context}
Тон: {style}
Требования:
- Личный опыт
- Не реклама
- Длина: 20-50 символов`,
    dating: `Создай флирт-комментарий.
Контекст поста: {context}
Тон: {style}
Требования:
- Игривый
- Не навязчивый
- Длина: 15-40 символов`,
    bait: `Создай байт-комментарий.
Контекст поста: {context}
Тон: {style}
Требования:
- Заинтриговать
- Вызвать интерес к профилю
- Длина: 20-40 символов`,
    lifestyle: `Создай лайфстайл-комментарий.
Контекст поста: {context}
Тон: {style}
Требования:
- Позитивный
- Естественный
- Длина: 20-50 символов`,
    finance: `Создай финансовый комментарий.
Контекст поста: {context}
Тон: {style}
Требования:
- Полезный
- Не спам
- Длина: 30-60 символов`,
    fitness: `Создай фитнес-комментарий.
Контекст поста: {context}
Тон: {style}
Требования:
- Мотивирующий
- Поддерживающий
- Длина: 20-50 символов`,
  },
  dm: {
    gambling: `Создай личное сообщение.
Тон: {style}
Требования:
- Не спамный
- Заинтересовать
- Плавный переход к офферу
- Длина: 50-150 символов`,
    crypto: `Создай DM о крипте.
Тон: {style}
Требования:
- Экспертный подход
- Предложить помощь
- Длина: 50-150 символов`,
    nutra: `Создай DM о здоровье.
Тон: {style}
Требования:
- Личный подход
- Поделиться опытом
- Длина: 50-150 символов`,
    dating: `Создай флирт-DM.
Тон: {style}
Требования:
- Игривый
- Не навязчивый
- Вызвать интерес
- Длина: 30-100 символов`,
    bait: `Создай байт-DM.
Тон: {style}
Требования:
- Интрига
- Заинтересовать
- Длина: 40-100 символов`,
    lifestyle: `Создай лайфстайл-DM.
Тон: {style}
Требования:
- Дружелюбный
- Естественный
- Длина: 50-150 символов`,
    finance: `Создай финансовый DM.
Тон: {style}
Требования:
- Экспертный
- Предложить помощь
- Длина: 50-150 символов`,
    fitness: `Создай фитнес-DM.
Тон: {style}
Требования:
- Мотивирующий
- Поддерживающий
- Длина: 50-150 символов`,
  },
  story: {
    gambling: `Создай идею для сторис.
Тон: {style}
Требования:
- Визуальная идея
- Заинтриговать
- Призыв к действию
- Текст: 20-40 символов`,
    crypto: `Создай идею для сторис о крипте.
Тон: {style}
Требования:
- Актуальность
- Инфографика
- Текст: 20-40 символов`,
    nutra: `Создай идею для сторис о здоровье.
Тон: {style}
Требования:
- До/После
- Результаты
- Текст: 20-40 символов`,
    dating: `Создай идею для сторис дейтинг.
Тон: {style}
Требования:
- Игривая
- Интригующая
- Текст: 15-30 символов`,
    bait: `Создай идею для байт-сторис.
Тон: {style}
Требования:
- Зацепить внимание
- Интрига
- Текст: 20-40 символов`,
    lifestyle: `Создай идею для лайфстайл-сторис.
Тон: {style}
Требования:
- Красивый образ жизни
- Вдохновение
- Текст: 20-40 символов`,
    finance: `Создай идею для сторис о финансах.
Тон: {style}
Требования:
- Полезный контент
- Цифры/факты
- Текст: 20-40 символов`,
    fitness: `Создай идею для фитнес-сторис.
Тон: {style}
Требования:
- Тренировка/результат
- Мотивация
- Текст: 20-40 символов`,
  },
};

/**
 * GET - Получение шаблонов контента
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType') as ContentType | null;
    const niche = searchParams.get('niche') as NicheType | null;

    if (contentType && niche) {
      const template = CONTENT_TEMPLATES[contentType]?.[niche];
      return NextResponse.json({
        success: true,
        contentType,
        niche,
        template,
      });
    }

    if (contentType) {
      const templates = CONTENT_TEMPLATES[contentType];
      return NextResponse.json({
        success: true,
        contentType,
        niches: Object.keys(templates),
        templates,
      });
    }

    return NextResponse.json({
      success: true,
      contentTypes: Object.keys(CONTENT_TEMPLATES),
      templates: CONTENT_TEMPLATES,
    });
  } catch (error) {
    console.error('[GenerateContent] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Генерация контента
 */
export async function POST(request: NextRequest) {
  try {
    const body: ContentRequest = await request.json();
    const {
      userId,
      contentType,
      style = 'casual',
      niche = 'lifestyle',
      influencerId,
      campaignId,
      prompt,
      targetPostContent,
      language = 'ru',
      generateVariants = 1,
      maxLength,
      includeHashtags = true,
      includeEmoji = true,
      includeCTA = true,
      generateImage = false,
      storyTheme,
    } = body;

    if (!userId || !contentType) {
      return NextResponse.json(
        { error: 'userId and contentType are required' },
        { status: 400 }
      );
    }

    // Получаем данные инфлюенсера если указан
    let influencerData: {
      name?: string;
      role?: string;
      style?: string;
      tone?: string;
      phrases?: string;
      personality?: string;
      interests?: string;
      bio?: string;
    } | null = null;
    if (influencerId) {
      const influencer = await db.influencer.findUnique({
        where: { id: influencerId },
        include: {
          account: true,
        },
      });
      if (influencer) {
        influencerData = {
          name: influencer.name,
          role: influencer.role,
          style: influencer.style ?? undefined,
          tone: influencer.tone ?? undefined,
          phrases: influencer.phrases ?? undefined,
          personality: influencer.personality ?? undefined,
          interests: influencer.interests ?? undefined,
          bio: influencer.bio ?? undefined,
        };
      }
    }

    // Формируем промпт
    const systemPrompt = buildSystemPrompt(
      contentType,
      style,
      niche,
      language,
      influencerData,
      includeHashtags,
      includeEmoji,
      includeCTA
    );

    const userPrompt = buildUserPrompt(
      contentType,
      niche,
      style,
      prompt,
      targetPostContent,
      storyTheme,
      maxLength
    );

    // Инициализируем AI Manager
    const manager = await getAIProviderManager(userId);

    // Генерируем контент
    const aiResult = await manager.generate(userPrompt, {
      systemPrompt,
      taskType: 'content_generation' as TaskType,
      maxTokens: maxLength ? Math.min(maxLength * 2, 1000) : 500,
      temperature: 0.8,
      useCache: true,
      cacheContext: `content_${contentType}_${niche}_${style}`,
    }, userId);

    // Парсим результат
    const generatedContent = parseGeneratedContent(
      aiResult.content,
      contentType,
      style,
      niche,
      language,
      generateVariants,
      aiResult.provider,
      aiResult.model,
      aiResult.tokensIn + aiResult.tokensOut,
      aiResult.cached
    );

    // Генерируем изображение если нужно (для сторис)
    if (generateImage && contentType === 'story') {
      try {
        const imagePrompt = buildImagePrompt(generatedContent.content, niche, storyTheme);
        const imageBase64 = await generateImageFromPrompt(imagePrompt);
        generatedContent.image = {
          base64: imageBase64,
          prompt: imagePrompt,
        };
      } catch (imageError) {
        console.error('[GenerateContent] Image generation failed:', imageError);
        // Продолжаем без изображения
      }
    }

    // Сохраняем в БД
    if (influencerId) {
      await db.aIGeneratedContent.create({
        data: {
          influencerId,
          contentType,
          generatedText: generatedContent.content,
          style,
          niche,
          aiModel: aiResult.model,
          aiProvider: aiResult.provider,
        },
      });
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
    });
  } catch (error) {
    console.error('[GenerateContent] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Построение системного промпта
 */
function buildSystemPrompt(
  contentType: ContentType,
  style: ContentStyle,
  niche: NicheType,
  language: string,
  influencer: {
    name?: string;
    role?: string;
    style?: string;
    tone?: string;
    phrases?: string;
    personality?: string;
    interests?: string;
    bio?: string;
  } | null,
  includeHashtags: boolean,
  includeEmoji: boolean,
  includeCTA: boolean
): string {
  const styleDescriptions: Record<ContentStyle, string> = {
    casual: 'дружелюбный, разговорный, как с другом',
    expert: 'профессиональный, экспертный, уверенный',
    playful: 'игривый, флиртующий, кокетливый',
    mysterious: 'загадочный, интригующий, недосказанный',
    provocative: 'провокационный, смелый, цепляющий',
    friendly: 'теплый, поддерживающий, доброжелательный',
    storytelling: 'повествовательный, история, эмоциональный',
    humor: 'юмористический, легкий, веселый',
  };

  let prompt = `Ты - ${influencer?.role || 'контент-мейкер'} в нише ${niche}.
Стиль общения: ${styleDescriptions[style]}.
Язык: ${language === 'ru' ? 'русский' : language}.

Тип контента: ${contentType === 'post' ? 'пост для канала' : contentType === 'comment' ? 'комментарий' : contentType === 'dm' ? 'личное сообщение' : 'идея для сторис'}.

`;

  if (influencer) {
    prompt += `Персона: ${influencer.name || 'аноним'}
${influencer.bio ? `О себе: ${influencer.bio}` : ''}
${influencer.personality ? `Черты характера: ${influencer.personality}` : ''}
${influencer.interests ? `Интересы: ${influencer.interests}` : ''}
${influencer.tone ? `Тон: ${influencer.tone}` : ''}
${influencer.phrases ? `Типичные фразы: ${influencer.phrases}` : ''}

`;
  }

  prompt += `Требования:
- ${includeHashtags ? 'Добавь 2-3 хештега в конце' : 'Без хештегов'}
- ${includeEmoji ? 'Используй эмодзи уместно' : 'Без эмодзи'}
- ${includeCTA ? 'Добавь призыв к действию' : 'Без явного CTA'}
- Текст должен быть естественным, не похожим на AI

Верни результат в формате JSON:
{
  "content": "основной текст",
  "variants": ["вариант1", "вариант2"],
  "metadata": {
    "hashtags": ["тег1", "тег2"],
    "cta": "призыв к действию",
    "bestPostingTime": "чч:мм",
    "engagementScore": 0-100
  }
}`;

  return prompt;
}

/**
 * Построение пользовательского промпта
 */
function buildUserPrompt(
  contentType: ContentType,
  niche: NicheType,
  style: ContentStyle,
  customPrompt?: string,
  targetPostContent?: string,
  storyTheme?: string,
  maxLength?: number
): string {
  // Базовый шаблон
  let template = CONTENT_TEMPLATES[contentType]?.[niche] || '';
  template = template.replace('{style}', style);

  let prompt = template;

  if (customPrompt) {
    prompt += `\n\nДополнительные требования: ${customPrompt}`;
  }

  if (targetPostContent && contentType === 'comment') {
    prompt += `\n\nПост, к которому пишем комментарий:\n"${targetPostContent.slice(0, 500)}"`;
  }

  if (storyTheme && contentType === 'story') {
    prompt += `\n\nТема сторис: ${storyTheme}`;
  }

  if (maxLength) {
    prompt += `\n\nМаксимальная длина: ${maxLength} символов.`;
  }

  return prompt;
}

/**
 * Парсинг сгенерированного контента
 */
function parseGeneratedContent(
  aiResponse: string,
  contentType: ContentType,
  style: ContentStyle,
  niche: NicheType,
  language: string,
  generateVariants: number,
  provider: string,
  model: string,
  tokensUsed: number,
  cached: boolean
): GeneratedContent {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: contentType,
        content: parsed.content || aiResponse,
        style,
        variants: parsed.variants?.slice(0, generateVariants),
        metadata: {
          niche,
          language,
          hashtags: parsed.metadata?.hashtags,
          cta: parsed.metadata?.cta,
          bestPostingTime: parsed.metadata?.bestPostingTime,
          engagementScore: parsed.metadata?.engagementScore,
        },
        ai: {
          provider,
          model,
          tokensUsed,
          cached,
        },
      };
    }
  } catch (error) {
    console.error('[GenerateContent] Parse error:', error);
  }

  // Fallback
  return {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: contentType,
    content: aiResponse,
    style,
    metadata: {
      niche,
      language,
    },
    ai: {
      provider,
      model,
      tokensUsed,
      cached,
    },
  };
}

/**
 * Построение промпта для генерации изображения
 */
function buildImagePrompt(content: string, niche: NicheType, theme?: string): string {
  const nicheStyles: Record<NicheType, string> = {
    gambling: 'luxury lifestyle, casino atmosphere, golden lights, elegant setting',
    crypto: 'futuristic, digital, blockchain, neon lights, tech aesthetic',
    nutra: 'healthy lifestyle, fitness, wellness, natural lighting, clean aesthetic',
    dating: 'romantic, intimate, soft lighting, couple silhouette, dreamy',
    bait: 'intriguing, mysterious, eye-catching, bold colors, attention-grabbing',
    lifestyle: 'aesthetic, lifestyle, travel, luxury, aspirational, instagram style',
    finance: 'professional, business, money, charts, modern office, success',
    fitness: 'athletic, gym, workout, strong, motivational, dynamic',
  };

  const style = nicheStyles[niche] || nicheStyles.lifestyle;
  const themePart = theme ? `, ${theme}` : '';
  
  return `Instagram story background, ${style}${themePart}, vertical 9:16 aspect ratio, high quality, no text, no people faces`;
}

/**
 * Генерация изображения через z-ai-web-dev-sdk
 */
async function generateImageFromPrompt(prompt: string): Promise<string> {
  const zai = await ZAI.create();
  
  const response = await zai.images.generations.create({
    prompt,
    size: '1024x1024',
  });

  return response.data[0]?.base64 || '';
}

/**
 * PUT - Массовая генерация контента
 */
export async function PUT(request: NextRequest) {
  try {
    const body = {
      userId: '',
      items: [] as ContentRequest[],
    };
    
    const requestData = await request.json();
    body.userId = requestData.userId;
    body.items = requestData.items || [];

    if (!body.userId || body.items.length === 0) {
      return NextResponse.json(
        { error: 'userId and items array are required' },
        { status: 400 }
      );
    }

    // Ограничиваем количество
    const items = body.items.slice(0, 10);

    const manager = await getAIProviderManager(body.userId);
    const results: GeneratedContent[] = [];

    for (const item of items) {
      try {
        const systemPrompt = buildSystemPrompt(
          item.contentType,
          item.style || 'casual',
          item.niche || 'lifestyle',
          item.language || 'ru',
          null,
          item.includeHashtags ?? true,
          item.includeEmoji ?? true,
          item.includeCTA ?? true
        );

        const userPrompt = buildUserPrompt(
          item.contentType,
          item.niche || 'lifestyle',
          item.style || 'casual',
          item.prompt,
          item.targetPostContent,
          item.storyTheme,
          item.maxLength
        );

        const aiResult = await manager.generate(userPrompt, {
          systemPrompt,
          taskType: 'content_generation' as TaskType,
          maxTokens: item.maxLength ? Math.min(item.maxLength * 2, 1000) : 500,
          temperature: 0.8,
          useCache: true,
          cacheContext: `bulk_${item.contentType}_${item.niche}_${item.style}`,
        }, body.userId);

        const content = parseGeneratedContent(
          aiResult.content,
          item.contentType,
          item.style || 'casual',
          item.niche || 'lifestyle',
          item.language || 'ru',
          item.generateVariants || 1,
          aiResult.provider,
          aiResult.model,
          aiResult.tokensIn + aiResult.tokensOut,
          aiResult.cached
        );

        results.push(content);
      } catch (itemError) {
        console.error('[GenerateContent] Item error:', itemError);
        results.push({
          id: `error_${Date.now()}`,
          type: item.contentType,
          content: '',
          style: item.style || 'casual',
          metadata: {
            niche: item.niche || 'lifestyle',
            language: item.language || 'ru',
          },
          ai: {
            provider: 'error',
            model: 'error',
            tokensUsed: 0,
            cached: false,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('[GenerateContent] Bulk error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
