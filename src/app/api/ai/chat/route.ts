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
}

// Системный промпт для AI-ассистента
const SYSTEM_PROMPT = `Ты — AI-ассистент DeepSeek в платформе "МУКН | Трафик".
Твоя задача — помогать пользователям с настройкой рекламных кампаний, генерацией комментариев, анализом каналов и оптимизацией дохода.

Твои возможности:
- Генерация комментариев для казино, крипты, дейтинга, нутры
- Анализ каналов и рекомендации по постингу
- Расчёт бюджета и ROI
- Помощь с настройками кампаний
- Рекомендации по снижению риска бана

Стиль общения:
- Дружелюбный и профессиональный
- Краткий, но информативный
- Используй эмодзи умеренно (1-3 на ответ)
- Давай конкретные рекомендации
- Форматируй списки через • или цифры

Всегда отвечай на русском языке.`;

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

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...body.messages.map((msg, i) => {
        if (i === body.messages.length - 1 && msg.role === 'user' && contextMessage) {
          return { ...msg, content: msg.content + contextMessage };
        }
        return msg;
      })
    ];

    let result: string;
    let tokensUsed = 0;
    let provider = 'sdk';

    // Пробуем AI Manager сначала
    try {
      const { getAIManager } = await import('@/lib/ai-providers');
      const DEMO_USER_ID = 'demo-user';
      const manager = await getAIManager(DEMO_USER_ID);

      // Берем последнее сообщение пользователя как prompt
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      const prompt = lastUserMessage?.content || '';

      // Формируем историю для контекста
      const chatHistory = messages.filter(m => m.role !== 'system');

      const generationResult = await manager.generate(prompt, {
        temperature: body.temperature ?? 0.7,
        maxTokens: body.maxTokens ?? 1500,
        systemPrompt: SYSTEM_PROMPT,
        messages: chatHistory,
      }, DEMO_USER_ID);

      result = generationResult.content;
      tokensUsed = generationResult.tokensIn + generationResult.tokensOut;
      provider = generationResult.provider;

      console.log(`[AI Chat] Provider: ${provider}, tokens: ${tokensUsed}, time: ${generationResult.responseTime}ms`);
    } catch (managerError) {
      // Fallback на SDK
      console.log('[AI Chat] Manager failed, using SDK:', managerError);

      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages,
        temperature: body.temperature ?? 0.7,
      });

      result = completion.choices[0]?.message?.content || '';
      tokensUsed = completion.usage?.total_tokens || 0;
      provider = 'deepseek-sdk';
    }

    return NextResponse.json({
      success: true,
      result,
      usage: {
        tokens: tokensUsed,
        provider,
      },
    });

  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat', details: String(error) },
      { status: 500 }
    );
  }
}
