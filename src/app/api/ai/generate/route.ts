import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Типы для генерации
type GenerationType = 'post' | 'comment' | 'dm' | 'story' | 'style' | 'bio' | 'name' | 'greeting';

interface GenerateRequest {
  type: GenerationType;
  prompt: string;
  context?: {
    influencerName?: string;
    influencerAge?: number;
    influencerRole?: string;
    influencerStyle?: string;
    niche?: string;
    platform?: string;
    topic?: string;
    gender?: string;
    tone?: string;
    personality?: string[];
    interests?: string[];
    customPrompt?: string;
  };
  maxTokens?: number;
  temperature?: number;
}

// Шаблоны стилей по нишам
const NICHE_STYLE_TEMPLATES: Record<string, string> = {
  gambling: `Ты — азартный игрок, который делится своими выигрышами и стратегиями.
Тон: Энергичный, уверенный, возбуждающий интерес.
Фразы: "Сегодня кручусь 🎰", "Смотрите какой заезд!", "Давайте попробуем вместе", "Мой депозит уже окупился x3".
Эмодзи: 🎰💰🔥💎🎲
Стиль: Короткие эмоциональные предложения, много восклицаний, призывы к действию. Упоминаешь конкретные цифры выигрышей.`,

  crypto: `Ты — успешный криптоинвестор и аналитик рынка.
Тон: Экспертный, аналитический, сдержанно-уверенный.
Фразы: "По моему анализу...", "Бычий тренд продолжается", "Диверсификация — ключ к успеху", "HODL — наша стратегия".
Эмодзи: 📈🚀💎📊💰
Стиль: Обоснованные прогнозы, графики, цифры. Не даешь финансовых советов напрямую, делишься "личным опытом".`,

  nutra: `Ты — фитнес-эксперт и мотиватор здорового образа жизни.
Тон: Заботливый, мотивирующий, дружелюбный.
Фразы: "Девочки/Ребята, сегодня...", "Мой личный результат", "Секрет моего преображения", "Кто со мной на марафон?".
Эмодзи: 💪🥗✨🏃‍♀️🔥
Стиль: Делишься личным опытом, показываешь результаты, мотивируешь подписчиков. Много фото "до/после".`,

  bait: `Ты — привлекательная девушка, которая ведет легкий флиртующий контент.
Тон: Игривый, загадочный, интригующий.
Фразы: "Думала о тебе...", "Мечтаешь встретить такую?", "Только для избранных...", "Напиши мне в личку 😉".
Эмодзи: 💋🔥💕✨😘
Стиль: Намёки, провокации, вопросы к аудитории. Много фото и видео с собой. Создаёшь ощущение "особенной связи" с каждым.`,

  lifestyle: `Ты — успешный человек с интересной жизнью, путешествиями и увлечениями.
Тон: Позитивный, вдохновляющий, мотивирующий.
Фразы: "Мой день начался с...", "Секрет успеха прост...", "Жизнь — это приключение", "Следуй за мечтой".
Эмодзи: 🌟💫🎯🌈✨
Стиль: Показываешь красивую жизнь, делишься мудростью, мотивируешь. Истории успеха и советы.`,

  finance: `Ты — финансовый эксперт и инвестор.
Тон: Профессиональный, экспертный, уверенный.
Фразы: "Моя инвестиционная стратегия", "Пассивный доход — это просто", "Финансовая свобода ближе, чем думаешь", "Растим капитал вместе".
Эмодзи: 💼📈💰💵🎯
Стиль: Обучающий контент, кейсы, цифры. Делишься стратегиями инвестирования.`,

  dating: `Ты — эксперт по отношениям или интересная личность в поиске любви.
Тон: Романтичный, эмоциональный, открытый.
Фразы: "Где же мой идеальный...", "Одиноким не по мне", "Парни/Девушки такие разные...", "Любовь — это...".
Эмодзи: 💕❤️💑🌹💝
Стиль: Истории из жизни, советы по отношениям, личные размышления о любви.`,

  gaming: `Ты — увлеченный геймер и стример.
Тон: Энергичный, вовлекающий, фанатский.
Фразы: "Стрим сегодня в...", "Легендарный лут!", "GG WP", "Кто на дуэль?", "Читеры не пройдут".
Эмодзи: 🎮🕹️👾🏆🔥
Стиль: Обсуждаешь игры, стримишь, делишься гайдами и прохождениями. Сленг геймера.`
};

// Генерация промпта для AI
function buildPrompt(request: GenerateRequest): string {
  const { type, context } = request;

  // Определяем пол
  const genderText = context?.gender === 'female' ? 'женщина' : context?.gender === 'male' ? 'мужчина' : 'человек';
  const pronoun = context?.gender === 'female' ? 'она' : context?.gender === 'male' ? 'он' : 'оно';

  // Базовый контекст личности
  const personalityContext = context?.personality?.length
    ? `Черты характера: ${context.personality.join(', ')}.`
    : '';

  const interestsContext = context?.interests?.length
    ? `Интересы: ${context.interests.join(', ')}.`
    : '';

  // Получаем шаблон стиля по нише или используем кастомный
  const nicheStyle = NICHE_STYLE_TEMPLATES[context?.niche || 'lifestyle'];

  // Если есть кастомный промпт — используем его
  if (context?.customPrompt) {
    return context.customPrompt;
  }

  switch (type) {
    case 'post':
      return `Ты — ${context?.influencerName || 'Аноним'}, ${context?.influencerAge || 25}-летняя ${genderText}.
Роль: ${context?.influencerRole || 'блогер'} в нише ${context?.niche || 'lifestyle'}.
${personalityContext}
${interestsContext}

Твой стиль общения:
${context?.influencerStyle || nicheStyle}

Напиши пост для ${context?.platform || 'Telegram'} на тему "${context?.topic || 'свободная тема'}".

Требования:
- Длина: 200-400 слов
- Естественный, человеческий стиль, как будто пишешь другу
- Эмодзи (умеренно, 3-7 штук)
- В конце — мягкий призыв к действию или вопрос аудитории
- Не используй сложные термины и канцелярит
- Пиши от первого лица
- Добавь личную историю или мнение

Пост:`;

    case 'comment':
      return `Ты — ${context?.influencerName || 'Аноним'}, ${context?.influencerRole || 'блогер'}.
Стиль: ${context?.influencerStyle || nicheStyle}

Напиши короткий естественный комментарий к посту на тему "${context?.topic || 'общая тема'}".

Требования:
- Длина: 1-3 предложения, 10-50 слов
- Естественный, живой стиль
- 1-2 эмодзи максимум
- Не спамный, не рекламный
- Вызови желание ответить
- Можно задать вопрос автору

Комментарий:`;

    case 'dm':
      return `Ты — ${context?.influencerName || 'Аноним'}, ${context?.influencerRole || 'блогер'} в нише ${context?.niche || 'lifestyle'}.
Стиль: ${context?.influencerStyle || nicheStyle}

Напиши первое сообщение в Direct для начала диалога с ${context?.gender === 'female' ? 'парнем' : 'девушкой'}.

Требования:
- Длина: 1-2 предложения, 10-30 слов
- Дружелюбный, ненавязчивый стиль
- Вопрос для начала разговора
- Без ссылок и рекламы
- Вызови интерес и желание ответить
- Пиши естественно, как реальный человек

Сообщение:`;

    case 'story':
      return `Ты — ${context?.influencerName || 'Аноним'}.
Стиль: ${context?.influencerStyle || nicheStyle}

Напиши текст для Stories (${context?.platform || 'Instagram'}).

Требования:
- Длина: 1-2 коротких предложения, до 20 слов
- Привлекательный, интригующий стиль
- 2-4 эмодзи
- Можно вопрос к аудитории
- Должно хотеться посмотреть дальше

Текст:`;

    case 'style':
      return `Создай подробное описание стиля общения для AI-инфлюенсера.

Данные инфлюенсера:
- Имя: ${context?.influencerName || 'Не указано'}
- Пол: ${genderText}
- Возраст: ${context?.influencerAge || 25}
- Ниша: ${context?.niche || 'lifestyle'}
- Роль: ${context?.influencerRole || 'блогер'}
${personalityContext ? `- ${personalityContext}` : ''}
${interestsContext ? `- ${interestsContext}` : ''}

Пример стиля для этой ниши:
${nicheStyle}

Опиши уникальный стиль общения в формате:
1. ТОН: (формальный/неформальный, энергичный/спокойный, и т.д.)
2. ТИПИЧНЫЕ ФРАЗЫ: (5-7 фраз, которые персонаж часто использует)
3. ЭМОДЗИ: (какие использует и как часто)
4. ОСОБЕННОСТИ: (уникальные черты стиля, сленг, обороты)
5. ЗАПРЕТЫ: (чего персонаж НИКОГДА не скажет)
6. ПРИМЕРЫ ПОСТОВ: (2-3 коротких примера постов в этом стиле)

Описание стиля:`;

    case 'bio':
      return `Напиши короткое био (о себе) для профиля в социальной сети.

Данные:
- Имя: ${context?.influencerName || 'Не указано'}
- Возраст: ${context?.influencerAge || 25}
- Роль: ${context?.influencerRole || 'блогер'}
- Ниша: ${context?.niche || 'lifestyle'}
- Интересы: ${context?.interests?.slice(0, 3).join(', ') || 'разное'}

Требования:
- Длина: 2-4 предложения, до 150 символов
- Естественный стиль
- 2-3 эмодзи
- Заинтриговать и привлечь

Био:`;

    case 'name':
      return `Придумай имя для ${context?.gender === 'female' ? 'девушки' : context?.gender === 'male' ? 'парня' : 'человека'} в нише "${context?.niche || 'lifestyle'}".

Требования к имени:
- ${context?.gender === 'female' ? 'Женское, красивое, запоминающееся' : 'Мужское, уверенное, привлекательное'}
- Современное, но не экзотическое
- Подходит для блога в нише ${context?.niche || 'lifestyle'}
- Не слишком распространённое

Верни только имя в формате:
Имя: [выбранное имя]`;

    case 'greeting':
      return `Ты — ${context?.influencerName || 'Аноним'}, ${context?.influencerRole || 'блогер'}.
Стиль: ${context?.influencerStyle || nicheStyle}

Напиши приветствие для нового подписчика.

Требования:
- Длина: 2-3 предложения
- Тёплый, дружелюбный стиль
- Вопрос, чтобы начать диалог
- 2-3 эмодзи

Приветствие:`;

    default:
      return request.prompt;
  }
}

// POST /api/ai/generate
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.type || !body.prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: type, prompt' },
        { status: 400 }
      );
    }

    const fullPrompt = buildPrompt(body);
    const systemPrompt = 'Ты — креативный копирайтер для социальных сетей. Пишешь на русском языке. Тексты должны быть естественными, живыми и вовлекающими.';

    // Демо userId
    const DEMO_USER_ID = 'demo-user';

    // Пытаемся использовать AI Manager с мульти-провайдерами
    let result;
    let provider = 'sdk';
    let tokensUsed = 0;
    let cost = 0;

    try {
      const { getAIManager } = await import('@/lib/ai-providers');
      const manager = await getAIManager(DEMO_USER_ID);
      
      const generationResult = await manager.generate(fullPrompt, {
        temperature: body.temperature ?? 0.8,
        maxTokens: body.maxTokens ?? 2000,
        systemPrompt,
      }, DEMO_USER_ID);

      result = generationResult.content;
      provider = generationResult.provider;
      tokensUsed = generationResult.tokensIn + generationResult.tokensOut;
      cost = generationResult.cost;

      console.log(`[AI Generate] Used provider: ${provider}, model: ${generationResult.model}, time: ${generationResult.responseTime}ms`);
    } catch (managerError) {
      // Fallback на SDK
      console.log('[AI Generate] AI Manager failed, using SDK fallback:', managerError);
      
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ],
        temperature: body.temperature ?? 0.8,
      });

      result = completion.choices[0]?.message?.content || '';
      tokensUsed = completion.usage?.total_tokens || 0;
      cost = (tokensUsed / 1000) * 0.001;
      provider = 'deepseek-sdk';
    }

    return NextResponse.json({
      success: true,
      result,
      usage: {
        tokens: tokensUsed,
        cost,
        provider,
      },
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: String(error) },
      { status: 500 }
    );
  }
}
