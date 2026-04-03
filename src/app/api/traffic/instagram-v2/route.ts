import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ==================== 17 INSTAGRAM METHODS ====================

export const INSTAGRAM_V2_METHODS = [
  // Базовые методы (11-17)
  { id: 11, name: 'reels_comment', title: 'Нейрокомментинг в Reels', category: 'basic', description: 'AI-генерация комментариев под Reels для привлечения внимания' },
  { id: 12, name: 'mass_follow', title: 'Mass following + Unfollow', category: 'basic', description: 'Массовые подписки с последующей отпиской для набора аудитории' },
  { id: 13, name: 'stories_interactive', title: 'Stories с интерактивом', category: 'basic', description: 'Интерактивные Stories с опросами, тестами и призывами к действию' },
  { id: 14, name: 'direct_dm', title: 'Direct-рассылка', category: 'basic', description: 'Персонализированные сообщения в Direct для конверсии' },
  { id: 15, name: 'emoji_comment', title: 'Комментинг с эмодзи', category: 'basic', description: 'Комментарии с эмодзи-последовательностями для привлечения внимания' },
  { id: 16, name: 'story_repost', title: 'Репост своих Stories', category: 'basic', description: 'Репост Stories в других аккаунтах для расширения охвата' },
  { id: 17, name: 'collaboration', title: 'Коллаборации', category: 'basic', description: 'Совместные посты и Reels с другими аккаунтами' },
  
  // Продвинутые методы (46-55)
  { id: 46, name: 'geo_location', title: 'Гео-теги местоположений', category: 'advanced', description: 'Использование гео-тегов для привлечения локального трафика' },
  { id: 47, name: 'fake_review_product', title: 'Фейковые отзывы под товарами', category: 'advanced', description: 'Отзывы под товарами для создания социального доказательства' },
  { id: 48, name: 'fraud_warning', title: 'Предупреждение о мошенниках', category: 'advanced', description: 'Создание доверия через предупреждения о мошенниках' },
  { id: 49, name: 'meme_comment', title: 'Комментарии-мемы', category: 'advanced', description: 'Вирусные комментарии-мемы для вовлечения аудитории' },
  { id: 50, name: 'emoji_wave', title: 'Волна эмодзи', category: 'advanced', description: 'Массовые эмодзи-реакции для привлечения внимания' },
  { id: 51, name: 'story_poll', title: 'Опросы в Stories', category: 'advanced', description: 'Опросы в Stories для вовлечения и сбора данных' },
  { id: 52, name: 'reels_duet', title: 'Duet в Reels', category: 'advanced', description: 'Создание дуэтов с популярными Reels' },
  { id: 53, name: 'hashtag_spam', title: 'Спам через хэштеги', category: 'advanced', description: 'Комментарии с популярными хэштегами' },
  { id: 54, name: 'comment_like', title: 'Лайки комментариев', category: 'advanced', description: 'Лайки комментариев для привлечения внимания к профилю' },
  { id: 55, name: 'profile_visit', title: 'Посещение профилей', category: 'advanced', description: 'Массовые посещения профилей для привлечения внимания' },
  
  // Топ методы (96-105)
  { id: 96, name: 'reels_viral', title: 'Вирусные Reels комментарии', category: 'top', description: 'Комментарии под вирусными Reels для максимального охвата' },
  { id: 97, name: 'story_question', title: 'Вопросы в Stories', category: 'top', description: 'Вопросы в Stories для вовлечения аудитории' },
  { id: 98, name: 'igtv_comment', title: 'IGTV комментинг', category: 'top', description: 'Комментарии под IGTV видео' },
  { id: 99, name: 'live_comment', title: 'Комменты во время Live', category: 'top', description: 'Комментарии во время прямых эфиров' },
  { id: 100, name: 'guide_comment', title: 'Комментарии в гайдах', category: 'top', description: 'Комментарии в гайдах Instagram' },
  { id: 101, name: 'shop_comment', title: 'Комменты в магазинах', category: 'top', description: 'Комментарии в Instagram Shop' },
  { id: 102, name: 'hashtag_follow', title: 'Подписка на хэштеги', category: 'top', description: 'Подписка на хэштеги для автоматического контента' },
  { id: 103, name: 'close_friends', title: 'Близкие друзья', category: 'top', description: 'Stories для списка близких друзей' },
  { id: 104, name: 'mention_spam', title: 'Упоминания в Stories', category: 'top', description: 'Массовые упоминания в Stories' },
  { id: 105, name: 'alt_account', title: 'Альтернативные аккаунты', category: 'top', description: 'Управление альтернативными аккаунтами' },
] as const;

type InstagramMethodId = typeof INSTAGRAM_V2_METHODS[number]['id'];
type InstagramMethodName = typeof INSTAGRAM_V2_METHODS[number]['name'];

// ==================== DEEPSEEK PROMPTS ====================

const DEEPSEEK_PROMPTS: Record<string, string> = {
  reels_comment: `Ты — эксперт по Instagram маркетингу. Создай комментарий под Reels.
Ниша: {niche}. Стиль: {style}. Гео: {geo}.
Комментарий должен быть коротким (1-2 предложения), цепляющим.
Включи призыв к действию (неявный).`,

  mass_follow: `Создай стратегию масс-фолловинга для привлечения трафика.
Ниша: {niche}. Гео: {geo}.
Определи: типы аккаунтов для фолловинга, лимиты подписок, задержку перед отпиской.`,

  stories_interactive: `Создай интерактивную Story для вовлечения аудитории.
Ниша: {niche}. Тип: {storyType}. Гео: {geo}.
Включи опрос/тест и призыв к действию.`,

  direct_dm: `Создай персонализированное сообщение для Instagram Direct.
Ниша: {niche}. Стиль: {style}. Гео: {geo}.
Сообщение должно быть нативным и вести к офферу: {offerLink}.`,

  emoji_comment: `Создай комментарий с эмодзи-последовательностью.
Ниша: {niche}. Гео: {geo}.
Комментарий должен привлекать внимание, но не выглядеть спамом.`,

  story_repost: `Создай контент для репоста Story.
Ниша: {niche}. Гео: {geo}.
Включи подпись, стикеры и призыв к действию.`,

  collaboration: `Создай предложение для коллаборации в Instagram.
Ниша: {niche}. Гео: {geo}.
Опиши выгоду для обеих сторон и идеи для контента.`,

  geo_location: `Создай стратегию гео-тегирования для привлечения трафика.
Ниша: {niche}. Город: {geo}.
Сгенерируй 5 локаций и тексты для Stories.`,

  fake_review_product: `Напиши фейковый отзыв под товаром.
Товар: {product}. Рейтинг: 5 звёзд.
Отзыв должен выглядеть реалистично и вести к офферу.`,

  fraud_warning: `Создай предупреждение о мошенниках.
Ниша: {niche}. Предупреждение должно создавать доверие.
Включи рекомендацию твоего канала/оффера.`,

  meme_comment: `Создай вирусный комментарий-мем.
Ниша: {niche}. Гео: {geo}.
Комментарий должен быть смешным и relatable.`,

  emoji_wave: `Создай стратегию волны эмодзи.
Ниша: {niche}. Количество эмодзи: 5-10.
Опиши типы эмодзи и когда их использовать.`,

  story_poll: `Создай опрос для Stories.
Ниша: {niche}. Гео: {geo}.
Вопрос должен вовлекать и собирать данные о аудитории.`,

  reels_duet: `Создай стратегию для дуэтов в Reels.
Ниша: {niche}. Гео: {geo}.
Опиши типы контента для дуэтов и как их найти.`,

  hashtag_spam: `Создай список хэштегов для спама.
Ниша: {niche}. Гео: {geo}.
20 хэштегов с высокой популярностью.`,

  comment_like: `Создай стратегию лайков комментариев.
Ниша: {niche}. Гео: {geo}.
Опиши какие комментарии лайкать и когда.`,

  profile_visit: `Создай стратегию посещения профилей.
Ниша: {niche}. Гео: {geo}.
Опиши типы профилей и частоту посещений.`,

  reels_viral: `Создай комментарий под вирусным Reels.
Ниша: {niche}. Просмотры: 1M+.
Комментарий должен быть в топе и привлекать внимание.`,

  story_question: `Создай вопрос для Stories.
Ниша: {niche}. Гео: {geo}.
Вопрос должен провоцировать ответы.`,

  igtv_comment: `Создай комментарий под IGTV видео.
Ниша: {niche}. Гео: {geo}.
Комментарий должен быть развернутым и экспертным.`,

  live_comment: `Создай комментарий для прямого эфира.
Ниша: {niche}. Гео: {geo}.
Комментарий должен привлекать внимание ведущего.`,

  guide_comment: `Создай комментарий в гайде Instagram.
Ниша: {niche}. Гео: {geo}.
Комментарий должен дополнять гайд.`,

  shop_comment: `Создай комментарий в Instagram Shop.
Товар: {product}. Гео: {geo}.
Комментарий должен выглядеть как реальный покупатель.`,

  hashtag_follow: `Создай стратегию подписки на хэштеги.
Ниша: {niche}. Гео: {geo}.
10 хэштегов для мониторинга.`,

  close_friends: `Создай контент для близких друзей.
Ниша: {niche}. Гео: {geo}.
Контент должен быть эксклюзивным.`,

  mention_spam: `Создай стратегию упоминаний в Stories.
Ниша: {niche}. Гео: {geo}.
Опиши как упоминать пользователей.`,

  alt_account: `Создай стратегию альтернативных аккаунтов.
Ниша: {niche}. Гео: {geo}.
Опиши схему взаимодействия между аккаунтами.`,
};

// ==================== INTERFACES ====================

interface MethodConfig {
  methodId: InstagramMethodId;
  targetAccounts?: string[];
  niche?: string;
  geo?: string;
  style?: string;
  offerLink?: string;
  hashtags?: string[];
  product?: string;
  storyType?: 'poll' | 'quiz' | 'question' | 'slider';
  settings?: Record<string, unknown>;
}

interface ExecutionResult {
  success: boolean;
  content?: string;
  strategy?: Record<string, unknown>;
  error?: string;
  aiModel?: string;
  provider?: string;
}

// ==================== HELPER FUNCTIONS ====================

function getMethodById(methodId: number) {
  return INSTAGRAM_V2_METHODS.find(m => m.id === methodId);
}

function getMethodByName(methodName: string) {
  return INSTAGRAM_V2_METHODS.find(m => m.name === methodName);
}

function isValidMethodId(methodId: number): methodId is InstagramMethodId {
  return INSTAGRAM_V2_METHODS.some(m => m.id === methodId);
}

// ==================== AI GENERATION ====================

async function generateWithDeepSeek(
  methodName: InstagramMethodName,
  config: MethodConfig
): Promise<{ content: string; strategy: Record<string, unknown> }> {
  const zai = await ZAI.create();
  
  let prompt = DEEPSEEK_PROMPTS[methodName] || DEEPSEEK_PROMPTS.reels_comment;
  
  // Replace placeholders
  prompt = prompt
    .replace('{niche}', config.niche || 'lifestyle')
    .replace('{geo}', config.geo || 'RU')
    .replace('{style}', config.style || 'casual')
    .replace('{offerLink}', config.offerLink || 'ссылка в профиле')
    .replace('{product}', config.product || 'товар')
    .replace('{storyType}', config.storyType || 'poll');

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'Ты — эксперт по Instagram маркетингу и арбитражу трафика. Создавай контент на русском языке. Отвечай структурированно.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || '';
  
  // Parse content into structured response
  const lines = content.split('\n').filter(l => l.trim());
  const strategy: Record<string, unknown> = {
    rawContent: content,
    lines: lines.slice(0, 5),
    timestamp: new Date().toISOString(),
  };

  return { content, strategy };
}

async function executeMethod(config: MethodConfig): Promise<ExecutionResult> {
  try {
    const method = getMethodById(config.methodId);
    if (!method) {
      return { success: false, error: `Unknown method ID: ${config.methodId}` };
    }

    const { content, strategy } = await generateWithDeepSeek(
      method.name as InstagramMethodName,
      config
    );

    return {
      success: true,
      content,
      strategy,
      aiModel: 'deepseek',
      provider: 'z-ai-web-dev-sdk',
    };
  } catch (error) {
    console.error('[instagram-v2] AI generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== DATABASE HELPERS ====================

async function getOrCreateMethod(methodId: number, methodName: string, methodTitle: string) {
  const existing = await db.trafficMethod.findFirst({
    where: { methodNumber: methodId },
  });

  if (existing) {
    return existing;
  }

  return db.trafficMethod.create({
    data: {
      methodNumber: methodId,
      name: methodName,
      description: methodTitle,
      platform: 'instagram',
      category: INSTAGRAM_V2_METHODS.find(m => m.id === methodId)?.category || 'basic',
      isActive: true,
      status: 'active',
    },
  });
}

async function createExecution(
  methodId: string,
  config: MethodConfig,
  result: ExecutionResult
) {
  return db.trafficMethodExecution.create({
    data: {
      methodId,
      targetPlatform: 'instagram',
      targetId: config.targetAccounts?.[0] || null,
      content: result.content || null,
      aiGenerated: true,
      aiModel: result.aiModel || 'deepseek',
      status: result.success ? 'success' : 'failed',
      result: JSON.stringify(result.strategy || {}),
      error: result.error || null,
    },
  });
}

// ==================== API HANDLERS ====================

// GET - Получить все методы или конкретный метод
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const methodId = searchParams.get('methodId');
    const all = searchParams.get('all');
    const stats = searchParams.get('stats');

    console.log('[instagram-v2] GET request:', { methodId, all, stats });

    // Get stats for all methods
    if (stats === 'true') {
      const methods = INSTAGRAM_V2_METHODS;
      const executions = await db.trafficMethodExecution.findMany({
        where: {
          method: { platform: 'instagram' },
        },
        select: {
          methodId: true,
          status: true,
          views: true,
          clicks: true,
          conversions: true,
        },
      });

      const methodStats = methods.map(method => {
        const methodExecutions = executions.filter(e => {
          // Match by methodNumber stored in TrafficMethod
          return true; // Simplified for now
        });
        
        return {
          ...method,
          executions: methodExecutions.length,
          successRate: methodExecutions.length > 0
            ? (methodExecutions.filter(e => e.status === 'success').length / methodExecutions.length) * 100
            : 0,
          totalViews: methodExecutions.reduce((sum, e) => sum + e.views, 0),
          totalClicks: methodExecutions.reduce((sum, e) => sum + e.clicks, 0),
          totalConversions: methodExecutions.reduce((sum, e) => sum + e.conversions, 0),
        };
      });

      return NextResponse.json({
        success: true,
        stats: methodStats,
        categories: {
          basic: methods.filter(m => m.category === 'basic'),
          advanced: methods.filter(m => m.category === 'advanced'),
          top: methods.filter(m => m.category === 'top'),
        },
      });
    }

    // Get specific method
    if (methodId) {
      const id = parseInt(methodId);
      const method = getMethodById(id);
      
      if (!method) {
        return NextResponse.json(
          { error: 'Method not found', validIds: INSTAGRAM_V2_METHODS.map(m => m.id) },
          { status: 404 }
        );
      }

      // Get method from database
      const dbMethod = await db.trafficMethod.findFirst({
        where: { methodNumber: id },
        include: {
          executions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          templates: true,
        },
      });

      // Get prompt template
      const promptTemplate = DEEPSEEK_PROMPTS[method.name];

      return NextResponse.json({
        success: true,
        method: {
          ...method,
          dbMethod,
          promptTemplate,
        },
      });
    }

    // Get all methods
    if (all === 'true') {
      return NextResponse.json({
        success: true,
        methods: INSTAGRAM_V2_METHODS,
        count: INSTAGRAM_V2_METHODS.length,
        categories: {
          basic: INSTAGRAM_V2_METHODS.filter(m => m.category === 'basic'),
          advanced: INSTAGRAM_V2_METHODS.filter(m => m.category === 'advanced'),
          top: INSTAGRAM_V2_METHODS.filter(m => m.category === 'top'),
        },
      });
    }

    // Default: return list of methods with basic info
    return NextResponse.json({
      success: true,
      methods: INSTAGRAM_V2_METHODS,
      count: INSTAGRAM_V2_METHODS.length,
      usage: {
        getMethod: '?methodId=11',
        getAllMethods: '?all=true',
        getStats: '?stats=true',
      },
    });
  } catch (error) {
    console.error('[instagram-v2] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process GET request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Выполнить метод (сгенерировать контент)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MethodConfig;
    const { methodId, targetAccounts, niche, geo, style, offerLink, hashtags, product, storyType, settings } = body;

    console.log('[instagram-v2] POST request:', { methodId, niche, geo });

    // Validate method ID
    if (!methodId || !isValidMethodId(methodId)) {
      return NextResponse.json(
        { 
          error: 'Valid Instagram method ID is required',
          validIds: INSTAGRAM_V2_METHODS.map(m => m.id),
          received: methodId,
        },
        { status: 400 }
      );
    }

    const method = getMethodById(methodId);
    if (!method) {
      return NextResponse.json(
        { error: 'Method not found' },
        { status: 404 }
      );
    }

    // Execute the method with AI
    const result = await executeMethod({
      methodId,
      targetAccounts,
      niche,
      geo,
      style,
      offerLink,
      hashtags,
      product,
      storyType,
      settings,
    });

    // Get or create method in database
    const dbMethod = await getOrCreateMethod(methodId, method.name, method.title);

    // Create execution record
    const execution = await createExecution(dbMethod.id, body, result);

    console.log('[instagram-v2] Execution created:', execution.id);

    return NextResponse.json({
      success: result.success,
      method: method,
      execution: {
        id: execution.id,
        status: execution.status,
        createdAt: execution.createdAt,
      },
      result: {
        content: result.content,
        strategy: result.strategy,
        aiModel: result.aiModel,
        provider: result.provider,
      },
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[instagram-v2] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute method', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Обновить конфигурацию метода
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, config, isActive, deepseekPrompt } = body;

    console.log('[instagram-v2] PUT request:', { methodId });

    if (!methodId) {
      return NextResponse.json(
        { error: 'methodId is required' },
        { status: 400 }
      );
    }

    const id = parseInt(methodId);
    if (!isValidMethodId(id)) {
      return NextResponse.json(
        { error: 'Invalid method ID', validIds: INSTAGRAM_V2_METHODS.map(m => m.id) },
        { status: 400 }
      );
    }

    const method = getMethodById(id);
    if (!method) {
      return NextResponse.json(
        { error: 'Method not found' },
        { status: 404 }
      );
    }

    // Find or create method in database
    const dbMethod = await getOrCreateMethod(id, method.name, method.title);

    // Update method configuration
    const updatedMethod = await db.trafficMethod.update({
      where: { id: dbMethod.id },
      data: {
        config: config ? JSON.stringify(config) : dbMethod.config,
        isActive: isActive !== undefined ? isActive : dbMethod.isActive,
        deepseekPrompt: deepseekPrompt || dbMethod.deepseekPrompt,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      method: updatedMethod,
    });
  } catch (error) {
    console.error('[instagram-v2] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update method configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Записать выполнение метода
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, status, metrics } = body;

    console.log('[instagram-v2] PATCH request:', { executionId, status });

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      );
    }

    // Update execution
    const execution = await db.trafficMethodExecution.update({
      where: { id: executionId },
      data: {
        status: status || undefined,
        views: metrics?.views ? { increment: metrics.views } : undefined,
        clicks: metrics?.clicks ? { increment: metrics.clicks } : undefined,
        conversions: metrics?.conversions ? { increment: metrics.conversions } : undefined,
        executedAt: status === 'success' ? new Date() : undefined,
      },
    });

    // Update method totals if metrics provided
    if (metrics && execution.methodId) {
      await db.trafficMethod.update({
        where: { id: execution.methodId },
        data: {
          totalActions: { increment: 1 },
          totalClicks: { increment: metrics.clicks || 0 },
          totalConversions: { increment: metrics.conversions || 0 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('[instagram-v2] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update execution', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить выполнение
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const executionId = searchParams.get('executionId');
    const methodId = searchParams.get('methodId');

    console.log('[instagram-v2] DELETE request:', { executionId, methodId });

    if (executionId) {
      // Delete specific execution
      await db.trafficMethodExecution.delete({
        where: { id: executionId },
      });

      return NextResponse.json({
        success: true,
        deleted: 'execution',
        id: executionId,
      });
    }

    if (methodId) {
      // Delete all executions for method
      const id = parseInt(methodId);
      const dbMethod = await db.trafficMethod.findFirst({
        where: { methodNumber: id },
      });

      if (dbMethod) {
        await db.trafficMethodExecution.deleteMany({
          where: { methodId: dbMethod.id },
        });

        return NextResponse.json({
          success: true,
          deleted: 'executions',
          methodId: id,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'No executions found for this method',
        methodId: id,
      });
    }

    return NextResponse.json(
      { error: 'executionId or methodId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[instagram-v2] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
