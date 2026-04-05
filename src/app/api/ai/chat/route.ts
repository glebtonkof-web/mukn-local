import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

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
  loadContext?: boolean; // Загружать ли реальный контекст данных
}

// Ключевые слова, при которых нужно загружать контекст
const CONTEXT_KEYWORDS = [
  'аналитик', 'статистик', 'кампани', 'доход', 'расход', 'прибыль', 'убыток',
  'roi', 'конверси', 'лид', 'бюджет', 'аккаунт', 'прогрев', 'трафик',
  'заработок', 'монетизац', 'показател', 'метрик', 'отчёт', 'отчет',
  'эффективност', 'оптимизаци', 'масштабир', 'анализ', 'данные',
  'сколько', 'какой', 'какая', 'какие', 'количество', 'всего',
  'топ', 'лучши', 'худш', 'сравн', 'динамик', 'тренд',
  'выручк', 'инфлюенсер', 'оффер', 'offer', 'influencer'
];

// Функция для определения нужен ли контекст
function needsContext(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return CONTEXT_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

// Функция загрузки контекста аналитики
async function loadAnalyticsContext(): Promise<string> {
  try {
    // Получаем кампании
    const campaigns = await db.campaign.findMany({
      include: {
        CampaignInfluencer: { include: { Influencer: true } },
        CampaignOffer: { include: { Offer: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Получаем аккаунты
    const accounts = await db.account.findMany({
      select: {
        id: true,
        username: true,
        platform: true,
        status: true,
        niche: true,
        warmingDay: true,
        warmingPhase: true,
      },
    });

    // Получаем инфлюенсеров
    const influencers = await db.influencer.findMany({
      select: {
        id: true,
        name: true,
        platform: true,
        subscribers: true,
        leadsCount: true,
        revenue: true,
      },
    });

    // Получаем офферы
    const offers = await db.offer.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        payout: true,
        conversions: true,
      },
    });

    // Вычисляем статистику
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leadsCount || 0), 0);
    const overallROI = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent * 100).toFixed(2) : '0';

    const accountsByPlatform = accounts.reduce((acc, a) => {
      acc[a.platform] = (acc[a.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const warmingAccounts = accounts.filter(a => a.status === 'warming');
    const activeAccounts = accounts.filter(a => a.status === 'active');

    // Топ кампании
    const topCampaigns = campaigns
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        type: c.type,
        niche: c.niche,
        status: c.status,
        revenue: c.revenue,
        spent: c.spent,
        roi: c.spent > 0 ? ((c.revenue - c.spent) / c.spent * 100).toFixed(2) : '0',
        leads: c.leadsCount,
      }));

    // Формируем контекст
    const contextData = `
## 📊 АКТУАЛЬНЫЕ ДАННЫЕ СИСТЕМЫ (реальные данные)

### 📈 Общая статистика:
- **Всего кампаний**: ${totalCampaigns}
- **Активных кампаний**: ${activeCampaigns}
- **Общий бюджет**: ${totalBudget.toLocaleString()} ₽
- **Потрачено**: ${totalSpent.toLocaleString()} ₽
- **Выручка**: ${totalRevenue.toLocaleString()} ₽
- **Прибыль**: ${(totalRevenue - totalSpent).toLocaleString()} ₽
- **Общий ROI**: ${overallROI}%
- **Всего лидов**: ${totalLeads}

### 👤 Аккаунты:
- **Всего аккаунтов**: ${accounts.length}
- **На прогреве**: ${warmingAccounts.length}
- **Активных**: ${activeAccounts.length}
- **По платформам**: ${Object.entries(accountsByPlatform).map(([p, c]) => `${p}: ${c}`).join(', ')}

### 🏆 Топ-5 кампаний по выручке:
${topCampaigns.map((c, i) => `${i + 1}. **${c.name}** (${c.type}, ${c.niche || 'без ниши'})
   - Статус: ${c.status}
   - Выручка: ${c.revenue?.toLocaleString()} ₽
   - Расходы: ${c.spent?.toLocaleString()} ₽
   - ROI: ${c.roi}%
   - Лиды: ${c.leads}`).join('\n')}

### 📋 Список всех кампаний:
${campaigns.map(c => `- **${c.name}** [${c.status}] | ${c.type} | ${c.niche || 'без ниши'} | Бюджет: ${c.budget?.toLocaleString() || 0}₽ | Потрачено: ${c.spent?.toLocaleString() || 0}₽ | Выручка: ${c.revenue?.toLocaleString() || 0}₽`).join('\n')}

### 📱 Инфлюенсеры (${influencers.length}):
${influencers.slice(0, 10).map(i => `- ${i.name} (${i.platform}) | ${i.subscribers?.toLocaleString() || 0} подписчиков | ${i.leadsCount || 0} лидов | ${i.revenue?.toLocaleString() || 0}₽`).join('\n')}

### 🎯 Офферы (${offers.length}):
${offers.slice(0, 10).map(o => `- ${o.name} (${o.type}) | Выплата: ${o.payout}₽ | Конверсий: ${o.conversions || 0}`).join('\n')}

### ⚠️ Рекомендации системы:
${totalCampaigns === 0 ? '- ❌ Нет созданных кампаний! Создайте первую кампанию' : ''}
${activeCampaigns === 0 && totalCampaigns > 0 ? '- ⚠️ Нет активных кампаний! Запустите кампании' : ''}
${accounts.length < 5 ? `- 📈 Мало аккаунтов (${accounts.length}). Рекомендуется минимум 10-20 для масштабирования` : ''}
${warmingAccounts.length > 0 ? `- 🔥 ${warmingAccounts.length} аккаунтов на прогреве. Проверьте их статус` : ''}
${parseFloat(overallROI) < 0 ? '- ❌ Отрицательный ROI! Необходима оптимизация кампаний' : ''}
${parseFloat(overallROI) > 50 ? `- ✅ Отличный ROI (${overallROI}%)! Можно масштабировать` : ''}

---

**ВАЖНО**: Это реальные данные из вашей системы МУКН. Используйте их для ответов на вопросы пользователя!
`;

    return contextData;
  } catch (error) {
    console.error('[AI Chat] Failed to load context:', error);
    return `
## ⚠️ Ошибка загрузки данных
Не удалось загрузить актуальные данные из базы. Возможно, база данных пуста или недоступна.
Попросите пользователя создать кампании или проверить подключение к базе данных.
`;
  }
}

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

    // Получаем последнее сообщение пользователя
    const lastUserMessage = [...body.messages].reverse().find(m => m.role === 'user');
    const userContent = lastUserMessage?.content || '';

    // Определяем нужен ли контекст
    const shouldLoadContext = body.loadContext || needsContext(userContent);

    // Загружаем контекст аналитики если нужно
    let analyticsContext = '';
    if (shouldLoadContext) {
      console.log('[AI Chat] Loading analytics context for:', userContent.slice(0, 50));
      analyticsContext = await loadAnalyticsContext();
    }

    // Базовый контекст из параметров
    let basicContext = '';
    if (body.context) {
      const { campaignsCount, accountsCount, activeView } = body.context;
      basicContext = `\n[Базовый контекст: Кампаний: ${campaignsCount || 0}, Аккаунтов: ${accountsCount || 0}, Раздел: ${activeView || 'главная'}]`;
    }

    // Формируем системный промпт
    const systemPrompt = body.systemPrompt || getDefaultSystemPrompt();

    // Добавляем контекст аналитики к системному промпту
    const enhancedSystemPrompt = analyticsContext
      ? `${systemPrompt}\n\n${analyticsContext}`
      : systemPrompt;

    const messages: ChatMessage[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...body.messages.map((msg, i) => {
        if (i === body.messages.length - 1 && msg.role === 'user' && basicContext) {
          return { ...msg, content: msg.content + basicContext };
        }
        return msg;
      })
    ];

    // Проверяем кэш для коротких запросов
    const cacheKey = userContent.slice(0, 100);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !shouldLoadContext) {
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

      console.log(`[AI Chat] SDK success, tokens: ${tokensUsed}, time: ${responseTime}ms, context: ${shouldLoadContext}`);

      // Кэшируем успешный ответ (только без контекста)
      if (cacheKey && result && !shouldLoadContext) {
        responseCache.set(cacheKey, { response: result, timestamp: Date.now() });
      }

    } catch (sdkError) {
      console.error('[AI Chat] SDK failed:', sdkError);

      // Пробуем AI Manager как fallback
      try {
        const { getAIManager } = await import('@/lib/ai-providers');
        const DEMO_USER_ID = 'demo-user';
        const manager = await getAIManager(DEMO_USER_ID);

        const prompt = userContent;
        const chatHistory = messages.filter(m => m.role !== 'system');

        const startTime = Date.now();
        const generationResult = await manager.generate(prompt, {
          temperature: body.temperature ?? 0.7,
          maxTokens: body.maxTokens ?? 1500,
          systemPrompt: enhancedSystemPrompt,
          messages: chatHistory,
        }, DEMO_USER_ID);

        result = generationResult.content;
        tokensUsed = generationResult.tokensIn + generationResult.tokensOut;
        provider = generationResult.provider;
        responseTime = generationResult.responseTime;

        console.log(`[AI Chat] Manager success, provider: ${provider}, tokens: ${tokensUsed}`);

      } catch (managerError) {
        console.error('[AI Chat] Manager also failed:', managerError);

        // Возвращаем заглушку с контекстом
        result = generateFallbackResponse(userContent, body.context, analyticsContext);
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
        contextLoaded: shouldLoadContext,
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

// Дефолтный системный промпт
function getDefaultSystemPrompt(): string {
  return `Ты — **МУКН Assistant**, AI-эксперт по платформе "МУКН | Трафик Enterprise".

## 🎯 Твоя роль:
Ты помогаешь пользователю с любыми вопросами о работе системы, анализируешь данные кампаний, даёшь рекомендации по монетизации и трафику.

## 📊 Работа с данными:
Когда пользователь спрашивает об аналитике, статистике, доходах, кампаниях или аккаунтах - ТЫ ИМЕЕШЬ ДОСТУП К РЕАЛЬНЫМ ДАННЫМ из системы!

Используй эти данные для:
- Анализа эффективности кампаний
- Расчёта ROI и других метрик
- Рекомендаций по оптимизации
- Сравнения показателей

## 💡 Правила ответов:
1. **Используй реальные данные** - они предоставлены в контексте
2. **Форматируй числа** - используй разделители тысяч (1 000 000)
3. **Давай конкретику** - точные цифры, проценты, суммы
4. **Предлагай действия** - что именно сделать для улучшения
5. **Объясняй причины** - почему такие рекомендации

## 📝 Формат ответов:
- Используй заголовки (##, ###) для структуры
- Форматируй списки через • или цифры
- Выделяй важное **жирным**
- Добавляй эмодзи для наглядности
- Для таблиц используй markdown

Отвечай на русском языке. Ты видишь РЕАЛЬНЫЕ данные системы!`;
}

// Fallback генератор ответов с учётом контекста
function generateFallbackResponse(input: string, context?: ChatRequest['context'], analyticsContext?: string): string {
  const lowerInput = input.toLowerCase();

  // Если есть контекст аналитики
  if (analyticsContext) {
    if (lowerInput.includes('аналитик') || lowerInput.includes('статистик') || lowerInput.includes('показател')) {
      return `📊 **Общая аналитика по вашим кампаниям:**

${analyticsContext}

💡 **Что можно сделать дальше:**
- Запросить детальный анализ конкретной кампании
- Получить рекомендации по оптимизации
- Сравнить показатели с прошлым периодом`;
    }

    if (lowerInput.includes('доход') || lowerInput.includes('прибыль') || lowerInput.includes('выручк')) {
      return `💰 **Анализ доходности:**

${analyticsContext}

📈 **Рекомендации по увеличению дохода:**
1. Масштабируйте успешные кампании с высоким ROI
2. Остановите кампании с отрицательным ROI
3. Добавьте новые аккаунты для увеличения охвата`;
    }
  }

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
