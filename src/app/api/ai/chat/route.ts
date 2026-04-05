import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    campaignsCount?: number;
    accountsCount?: number;
    activeView?: string;
  };
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  model?: string;
  stream?: boolean;
}

// Системный промпт для AI-ассистента - безлимитный чат на любые темы
const DEFAULT_SYSTEM_PROMPT = `Ты — дружелюбный AI-ассистент DeepSeek.

Ты можешь обсуждать абсолютно любые темы:
- Программирование и технологии
- Наука, математика, физика
- История, философия, литература
- Бизнес, финансы, маркетинг
- Творчество, искусство, музыка
- Повседневные вопросы
- И абсолютно любые другие темы

Правила общения:
- Отвечай развернуто и полезно
- Будь дружелюбным и позитивным
- Используй эмодзи умеренно
- Форматируй списки через • или цифры
- Если что-то не знаешь — честно признай
- Давай примеры и пояснения

Отвечай на том языке, на котором задан вопрос.`;

// Кэш для хранения ответов (простая оптимизация)
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// POST /api/ai/chat
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: messages' },
        { status: 400 }
      );
    }

    // Добавляем контекст к последнему сообщению пользователя
    let contextMessage = '';
    if (body.context) {
      const { campaignsCount, accountsCount, activeView } = body.context;
      contextMessage = `\n\n[Контекст: Кампаний: ${campaignsCount || 0}, Аккаунтов: ${accountsCount || 0}, Раздел: ${activeView || 'главная'}]`;
    }

    const systemPrompt = body.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...body.messages.map((msg, i) => {
        if (i === body.messages.length - 1 && msg.role === 'user' && contextMessage) {
          return { ...msg, content: msg.content + contextMessage };
        }
        return msg;
      })
    ];

    // Проверяем кэш для коротких запросов
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const cacheKey = lastUserMessage?.content?.slice(0, 100) || '';
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[AI Chat] Using cached response');
      return NextResponse.json({
        success: true,
        result: cached.response,
        usage: { tokens: 0, provider: 'cache' },
      });
    }

    let result: string;
    let tokensUsed = 0;
    let provider = 'sdk';
    let responseTime = 0;

    // Сначала пробуем SDK напрямую (более надежно)
    try {
      const startTime = Date.now();
      const zai = await ZAI.create();

      const completion = await zai.chat.completions.create({
        messages,
        temperature: body.temperature ?? 0.7,
      });

      responseTime = Date.now() - startTime;
      result = completion.choices[0]?.message?.content || '';
      tokensUsed = completion.usage?.total_tokens || 0;
      provider = 'deepseek-sdk';

      console.log(`[AI Chat] SDK success, tokens: ${tokensUsed}, time: ${responseTime}ms`);

      // Кэшируем успешный ответ
      if (cacheKey && result) {
        responseCache.set(cacheKey, { response: result, timestamp: Date.now() });
      }

    } catch (sdkError) {
      console.error('[AI Chat] SDK failed:', sdkError);

      // Пробуем AI Manager как fallback
      try {
        const { getAIManager } = await import('@/lib/ai-providers');
        const DEMO_USER_ID = 'demo-user';
        const manager = await getAIManager(DEMO_USER_ID);

        const prompt = lastUserMessage?.content || '';
        const chatHistory = messages.filter(m => m.role !== 'system');

        const startTime = Date.now();
        const generationResult = await manager.generate(prompt, {
          temperature: body.temperature ?? 0.7,
          maxTokens: body.maxTokens ?? 1500,
          systemPrompt: body.systemPrompt || 'Ты — полезный AI-ассистент. Отвечай на русском языке.',
          messages: chatHistory,
        }, DEMO_USER_ID);

        result = generationResult.content;
        tokensUsed = generationResult.tokensIn + generationResult.tokensOut;
        provider = generationResult.provider;
        responseTime = generationResult.responseTime;

        console.log(`[AI Chat] Manager success, provider: ${provider}, tokens: ${tokensUsed}`);

      } catch (managerError) {
        console.error('[AI Chat] Manager also failed:', managerError);

        // Возвращаем заглушку вместо ошибки
        result = generateFallbackResponse(lastUserMessage?.content || '', body.context);
        tokensUsed = 0;
        provider = 'fallback';
      }
    }

    return NextResponse.json({
      success: true,
      result,
      usage: {
        tokens: tokensUsed,
        provider,
        responseTime,
      },
    });

  } catch (error) {
    console.error('AI chat error:', error);

    // Возвращаем более информативную ошибку
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat',
        details: error instanceof Error ? error.message : String(error),
        result: generateFallbackResponse('', {}),
        usage: { tokens: 0, provider: 'error-fallback' }
      },
      { status: 200 } // Возвращаем 200 чтобы фронтенд мог показать fallback
    );
  }
}

// Fallback генератор ответов
function generateFallbackResponse(input: string, context?: ChatRequest['context']): string {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('комментар') && (lowerInput.includes('казино') || lowerInput.includes('crypto'))) {
    const style = lowerInput.includes('казино') ? 'казино' : 'крипто';
    return `Вот 3 варианта комментариев для ${style}:

1. "Класс! Я тоже вчера поднял неплохо, результаты поражают 🚀"

2. "Давно искал нормальный канал с сигналами. Подписался, посмотрю 👀"

3. "Спасибо за инфу! Уже получил хороший результат, продолжаю следить"

💡 Совет: Публикуйте в первые 5 минут после поста.`;
  }

  if (lowerInput.includes('доход') || lowerInput.includes('заработок') || lowerInput.includes('увеличить')) {
    return `📊 Анализ вашего дохода:

Текущие показатели:
• Кампаний: ${context?.campaignsCount || 0}
• Аккаунтов: ${context?.accountsCount || 0}

Рекомендации для увеличения дохода в 2 раза:

1. **Добавьте аккаунты** — сейчас ${context?.accountsCount || 0}, оптимально 20-30

2. **Оптимизируйте время постинга** — лучший период 20:00-23:00

3. **A/B тестирование** — тестируйте разные стили

4. **Расширьте каналы** — добавьте 5-10 новых`;
  }

  if (lowerInput.includes('анализ') || lowerInput.includes('канал')) {
    return `🔍 Анализ канала:

Для точного анализа отправьте ссылку на канал.

Общие рекомендации:
• Проверьте активность канала
• Оцените модерацию
• Изучите аудиторию

⚠️ Важно: Не спамьте в каналах с агрессивной модерацией.`;
  }

  if (lowerInput.includes('бюджет') || lowerInput.includes('расчёт')) {
    return `💰 Калькулятор бюджета:

Пример расчёта для 1000₽/день:
• Понадобится ~15 аккаунтов
• 500 комментариев в день
• Расходы на прокси: ~150₽/день
• Ожидаемый ROI: 1:4`;
  }

  // Default response
  return `Я понимаю ваш запрос. Вот что я могу сделать:

• **Генерация комментариев** — для любых офферов
• **Анализ каналов** — проверка перед спамом
• **Расчёт бюджета** — оптимизация расходов
• **Настройка кампаний** — автоматическое создание

Выберите один из быстрых шаблонов выше.

💡 Совет: Чем точнее вопрос, тем полезнее ответ!`;
}
