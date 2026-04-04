// AI Campaign Analytics API
// Предиктивная аналитика кампаний в реальном времени
// Предсказание бана, оптимальное время постинга, рекомендации

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAIProviderManager, TaskType } from '@/lib/ai-provider-manager';

// Интерфейсы
interface CampaignMetrics {
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  spent: number;
}

interface InfluencerMetrics {
  influencerId: string;
  name: string;
  commentsPosted: number;
  commentsDeleted: number;
  dmSent: number;
  dmResponses: number;
  followersGained: number;
  banRisk: number;
  status: string;
}

interface PredictionResult {
  type: 'ban_risk' | 'optimal_time' | 'recommendations' | 'full_analysis';
  banProbability?: number;
  banReasons?: string[];
  optimalPostingTimes?: Array<{
    day: string;
    hours: number[];
    score: number;
  }>;
  recommendations?: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action?: string;
  }>;
  predictedROI?: number;
  predictedConversions?: number;
  confidenceScore?: number;
  aiModel?: string;
  provider?: string;
}

interface AnalysisRequest {
  campaignId: string;
  userId: string;
  analysisType: 'ban_risk' | 'optimal_time' | 'recommendations' | 'full_analysis';
  includeRealTime?: boolean;
}

/**
 * GET - Получение аналитики кампании
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const userId = searchParams.get('userId');
    const analysisType = searchParams.get('analysisType') as AnalysisRequest['analysisType'] || 'full_analysis';

    if (!campaignId || !userId) {
      return NextResponse.json(
        { error: 'campaignId and userId are required' },
        { status: 400 }
      );
    }

    // Получаем данные кампании
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        influencers: {
          include: {
            influencer: true,
          },
        },
        offers: {
          include: {
            offer: true,
          },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30, // Последние 30 дней
        },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Проверяем владельца
    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Собираем метрики
    const metrics = await collectMetrics(campaignId, campaign);
    
    // Выполняем анализ
    const analysis = await performAnalysis(
      campaign,
      metrics,
      analysisType,
      userId
    );

    return NextResponse.json({
      success: true,
      campaignId,
      analysisType,
      metrics,
      prediction: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AnalyzeCampaign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Запуск предиктивного анализа
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { campaignId, userId, analysisType, includeRealTime } = body;

    if (!campaignId || !userId) {
      return NextResponse.json(
        { error: 'campaignId and userId are required' },
        { status: 400 }
      );
    }

    // Получаем данные кампании
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        influencers: {
          include: {
            influencer: {
              include: {
                comments: {
                  orderBy: { createdAt: 'desc' },
                  take: 100,
                },
                directMessages: {
                  orderBy: { createdAt: 'desc' },
                  take: 50,
                },
              },
            },
          },
        },
        offers: {
          include: {
            offer: true,
          },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Проверяем владельца
    if (campaign.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Собираем метрики
    const metrics = await collectMetrics(campaignId, campaign);
    
    // Выполняем анализ с AI
    const analysis = await performAnalysis(
      campaign,
      metrics,
      analysisType,
      userId
    );

    // Сохраняем результат анализа в БД для истории
    await db.actionLog.create({
      data: {
        action: `ai_analysis_${analysisType}`,
        entityType: 'campaign',
        entityId: campaignId,
        details: JSON.stringify({
          metrics,
          prediction: analysis,
          timestamp: new Date().toISOString(),
        }),
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      campaignId,
      analysisType,
      metrics,
      prediction: analysis,
      realTimeEnabled: includeRealTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AnalyzeCampaign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Сбор метрик кампании
 */
async function collectMetrics(campaignId: string, campaign: Record<string, unknown>) {
  // Агрегируем метрики из аналитики
  const analyticsData = campaign.analytics as Array<{
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
    revenue: number;
    spent: number;
  }> || [];

  const totalMetrics: CampaignMetrics = analyticsData.reduce(
    (acc, day) => ({
      impressions: acc.impressions + (day.impressions || 0),
      clicks: acc.clicks + (day.clicks || 0),
      leads: acc.leads + (day.leads || 0),
      conversions: acc.conversions + (day.conversions || 0),
      revenue: acc.revenue + (day.revenue || 0),
      spent: acc.spent + (day.spent || 0),
    }),
    { impressions: 0, clicks: 0, leads: 0, conversions: 0, revenue: 0, spent: 0 }
  );

  // Метрики инфлюенсеров
  const influencerRelations = campaign.influencers as Array<{
    influencer: {
      id: string;
      name: string;
      comments?: Array<{ status: string }>;
      directMessages?: Array<{ status: string }>;
      banRisk: number;
      status: string;
    };
  }> || [];

  const influencerMetrics: InfluencerMetrics[] = influencerRelations.map((rel) => {
    const inf = rel.influencer;
    const comments = inf.comments || [];
    const dms = inf.directMessages || [];

    return {
      influencerId: inf.id,
      name: inf.name,
      commentsPosted: comments.length,
      commentsDeleted: comments.filter(c => c.status === 'deleted').length,
      dmSent: dms.length,
      dmResponses: dms.filter(d => d.status === 'read' || d.status === 'delivered').length,
      followersGained: 0, // Нужно получить из InfluencerAnalytics
      banRisk: inf.banRisk || 0,
      status: inf.status,
    };
  });

  return {
    campaign: totalMetrics,
    influencers: influencerMetrics,
    duration: campaign.startDate && campaign.endDate
      ? Math.ceil((new Date(campaign.endDate as string).getTime() - new Date(campaign.startDate as string).getTime()) / (1000 * 60 * 60 * 24))
      : null,
    niche: campaign.niche as string | null,
    geo: campaign.geo as string | null,
  };
}

/**
 * Выполнение AI анализа
 */
async function performAnalysis(
  campaign: Record<string, unknown>,
  metrics: {
    campaign: CampaignMetrics;
    influencers: InfluencerMetrics[];
    duration: number | null;
    niche: string | null;
    geo: string | null;
  },
  analysisType: AnalysisRequest['analysisType'],
  userId: string
): Promise<PredictionResult> {
  const manager = await getAIProviderManager(userId);

  // Формируем промпт для AI
  const systemPrompt = getAnalysisSystemPrompt(analysisType);
  const userPrompt = formatAnalysisPrompt(campaign, metrics, analysisType);

  const result = await manager.generate(userPrompt, {
    systemPrompt,
    taskType: 'campaign_analysis' as TaskType,
    maxTokens: 2000,
    temperature: 0.7,
    useCache: true,
    cacheContext: `campaign_${analysisType}`,
  }, userId);

  // Парсим результат
  return parseAnalysisResult(result.content, analysisType, result.provider, result.model);
}

/**
 * Системный промпт для анализа
 */
function getAnalysisSystemPrompt(type: AnalysisRequest['analysisType']): string {
  const basePrompt = `Ты - эксперт по арбитражу трафика и анализу кампаний в нишах gambling, crypto, nutra, dating.
Анализируй данные кампании и давай конкретные рекомендации на основе статистики.
Отвечай в формате JSON с указанными полями.`;

  const prompts: Record<string, string> = {
    ban_risk: `${basePrompt}

Задача: Оценить риск бана для кампании.
Верни JSON:
{
  "banProbability": 0-100,
  "banReasons": ["причина1", "причина2"],
  "confidenceScore": 0-100,
  "recommendations": [
    {"category": "content", "priority": "high|medium|low", "title": "...", "description": "...", "action": "..."}
  ]
}`,
    optimal_time: `${basePrompt}

Задача: Определить оптимальное время для постинга.
Верни JSON:
{
  "optimalPostingTimes": [
    {"day": "понедельник", "hours": [9, 12, 18], "score": 85}
  ],
  "confidenceScore": 0-100,
  "recommendations": [
    {"category": "timing", "priority": "high|medium|low", "title": "...", "description": "..."}
  ]
}`,
    recommendations: `${basePrompt}

Задача: Дать рекомендации по улучшению кампании.
Верни JSON:
{
  "predictedROI": число,
  "predictedConversions": число,
  "confidenceScore": 0-100,
  "recommendations": [
    {"category": "content|targeting|budget|accounts|timing", "priority": "high|medium|low", "title": "...", "description": "...", "action": "..."}
  ]
}`,
    full_analysis: `${basePrompt}

Задача: Полный анализ кампании с прогнозами.
Верни JSON:
{
  "banProbability": 0-100,
  "banReasons": ["причина1"],
  "optimalPostingTimes": [{"day": "понедельник", "hours": [9, 12], "score": 85}],
  "predictedROI": число,
  "predictedConversions": число,
  "confidenceScore": 0-100,
  "recommendations": [
    {"category": "...", "priority": "high|medium|low", "title": "...", "description": "...", "action": "..."}
  ]
}`,
  };

  return prompts[type] || prompts.full_analysis;
}

/**
 * Формирование промпта с данными
 */
function formatAnalysisPrompt(
  campaign: Record<string, unknown>,
  metrics: {
    campaign: CampaignMetrics;
    influencers: InfluencerMetrics[];
    duration: number | null;
    niche: string | null;
    geo: string | null;
  },
  type: AnalysisRequest['analysisType']
): string {
  const campaignInfo = `
КАМПАНИЯ: ${campaign.name}
Ниша: ${metrics.niche || 'не указана'}
Гео: ${metrics.geo || 'не указано'}
Статус: ${campaign.status}
Длительность: ${metrics.duration ? metrics.duration + ' дней' : 'не указана'}

МЕТРИКИ:
- Показы: ${metrics.campaign.impressions}
- Клики: ${metrics.campaign.clicks}
- Лиды: ${metrics.campaign.leads}
- Конверсии: ${metrics.campaign.conversions}
- Выручка: $${metrics.campaign.revenue.toFixed(2)}
- Расход: $${metrics.campaign.spent.toFixed(2)}
- ROI: ${metrics.campaign.spent > 0 ? ((metrics.campaign.revenue - metrics.campaign.spent) / metrics.campaign.spent * 100).toFixed(1) : 0}%
- CR: ${metrics.campaign.clicks > 0 ? (metrics.campaign.conversions / metrics.campaign.clicks * 100).toFixed(2) : 0}%

ИНФЛЮЕНСЕРЫ: ${metrics.influencers.length}
${metrics.influencers.map((inf, i) => `${i + 1}. ${inf.name}: риск бана ${inf.banRisk}%, статус ${inf.status}, комментариев ${inf.commentsPosted}`).join('\n')}
`;

  const taskPrompts: Record<string, string> = {
    ban_risk: `${campaignInfo}\nПроанализируй риск бана для этой кампании. Учитывай: поведение инфлюенсеров, частоту активности, контент, нишу.`,
    optimal_time: `${campaignInfo}\nОпредели оптимальное время для постинга контента в этой кампании. Учитывай: нишу, гео, поведение аудитории.`,
    recommendations: `${campaignInfo}\nДай рекомендации по улучшению эффективности кампании. Фокусируйся на конкретных действиях.`,
    full_analysis: `${campaignInfo}\nПроведи полный анализ кампании: риск бана, оптимальное время, рекомендации по улучшению, прогноз ROI.`,
  };

  return taskPrompts[type] || taskPrompts.full_analysis;
}

/**
 * Парсинг результата анализа
 */
function parseAnalysisResult(
  content: string,
  type: AnalysisRequest['analysisType'],
  provider: string,
  model: string
): PredictionResult {
  try {
    // Пытаемся найти JSON в ответе
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type,
        ...parsed,
        provider,
        aiModel: model,
      };
    }
  } catch (error) {
    console.error('[AnalyzeCampaign] Failed to parse AI response:', error);
  }

  // Fallback - возвращаем базовую структуру
  return {
    type,
    confidenceScore: 50,
    recommendations: [
      {
        category: 'general',
        priority: 'medium',
        title: 'Требуется ручной анализ',
        description: content.slice(0, 500),
      },
    ],
    provider,
    aiModel: model,
  };
}
