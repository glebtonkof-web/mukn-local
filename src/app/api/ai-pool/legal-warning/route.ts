import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// Системный промпт для юридического анализа
const LEGAL_SYSTEM_PROMPT = `Ты — юридический эксперт по российскому праву. Оцени риски следующей рекламной схемы в Telegram с точки зрения УК РФ.

ВАЖНО: Анализируй только на основе статей УК РФ, не давай юридических советов.

Ответь СТРОГО в формате JSON (без markdown):
{
  "risk_level": "зелёный|жёлтый|красный",
  "risk_score": 0-100,
  "possible_articles": ["ст. 159 УК РФ", "ст. 171.2 УК РФ", ...],
  "warning_text": "Краткое предупреждение (2-3 предложения)",
  "recommendation": "Что можно изменить для снижения риска",
  "key_factors": ["фактор 1", "фактор 2", ...]
}

Статьи для анализа:
- ст. 159 УК РФ (мошенничество)
- ст. 171.2 УК РФ (незаконные организация и проведение азартных игр)
- ст. 272 УК РФ (неправомерный доступ к компьютерной информации)
- ст. 174 УК РФ (легализация денежных средств)
- ст. 273 УК РФ (создание вредоносных программ)`;

// GET - Получить историю предупреждений
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    
    const history = await db.legalWarningAck.findMany({
      where: { userId },
      orderBy: { acknowledgedAt: 'desc' },
      take: 50,
    });
    
    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Legal warning history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get history' },
      { status: 500 }
    );
  }
}

// POST - Провести анализ рисков
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const body = await request.json();
    
    const { offerTheme, promotionMethod, sampleText, campaignId } = body;
    
    if (!offerTheme || !promotionMethod) {
      return NextResponse.json(
        { success: false, error: 'offerTheme and promotionMethod required' },
        { status: 400 }
      );
    }
    
    // Формируем промпт
    const userPrompt = `Оцени риски следующей схемы:

ТЕМА ОФФЕРА: ${getOfferDescription(offerTheme)}
СПОСОБ ПРОДВИЖЕНИЯ: ${getMethodDescription(promotionMethod)}
${sampleText ? `ПРИМЕР ТЕКСТА: "${sampleText}"` : ''}`;
    
    // Вызываем DeepSeek R1 (обязательно для юридических задач)
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: LEGAL_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    
    // Парсим JSON из ответа
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Сохраняем предупреждение в БД (но не подтверждённое)
    const warning = await db.legalWarningAck.create({
      data: {
        userId,
        offerTheme,
        promotionMethod,
        riskLevel: analysis.risk_level || 'жёлтый',
        riskScore: analysis.risk_score || 50,
        possibleArticles: JSON.stringify(analysis.possible_articles || []),
        warningText: analysis.warning_text || 'Не удалось проанализировать риски',
        campaignId,
      },
    });
    
    return NextResponse.json({
      success: true,
      analysis: {
        riskLevel: analysis.risk_level,
        riskScore: analysis.risk_score,
        possibleArticles: analysis.possible_articles || [],
        warningText: analysis.warning_text,
        recommendation: analysis.recommendation,
        keyFactors: analysis.key_factors || [],
      },
      warningId: warning.id,
      mustAcknowledge: analysis.risk_level !== 'зелёный' && analysis.risk_score > 30,
    });
  } catch (error) {
    console.error('Legal analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze risks' },
      { status: 500 }
    );
  }
}

// PUT - Подтвердить предупреждение (обязательно для запуска кампании)
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const body = await request.json();
    
    const { warningId, campaignId, ipAddress, userAgent } = body;
    
    if (!warningId) {
      return NextResponse.json(
        { success: false, error: 'warningId required' },
        { status: 400 }
      );
    }
    
    // Обновляем запись с подтверждением
    const warning = await db.legalWarningAck.update({
      where: { id: warningId },
      data: {
        acknowledgedAt: new Date(),
        campaignId: campaignId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
    
    // Логируем действие
    await db.actionLog.create({
      data: {
        action: 'legal_warning_acknowledged',
        entityType: 'legal_warning',
        entityId: warningId,
        details: JSON.stringify({
          riskLevel: warning.riskLevel,
          riskScore: warning.riskScore,
          offerTheme: warning.offerTheme,
          promotionMethod: warning.promotionMethod,
        }),
        userId,
      },
    });
    
    return NextResponse.json({
      success: true,
      acknowledged: true,
      warning: {
        id: warning.id,
        riskLevel: warning.riskLevel,
        acknowledgedAt: warning.acknowledgedAt,
      },
    });
  } catch (error) {
    console.error('Warning acknowledgment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to acknowledge warning' },
      { status: 500 }
    );
  }
}

// Вспомогательные функции
function getOfferDescription(theme: string): string {
  const descriptions: Record<string, string> = {
    gambling: 'Казино, ставки, игры на деньги',
    crypto: 'Криптовалюта, токены, инвестиции',
    bait: 'Кликбейт, интрига, заманивание',
    nutra: 'Здоровье, красота, БАДы',
    dating: 'Знакомства, отношения',
    finance: 'Финансы, заработок, инвестиции',
    lifestyle: 'Образ жизни, успех, мотивация',
  };
  return descriptions[theme] || theme;
}

function getMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    bait: 'Байт/кликбейт — заманивание интригой',
    direct_ad: 'Прямая реклама с указанием продукта',
    fake_review: 'Фейковый отзыв от "реального пользователя"',
    native_ad: 'Нативная реклама, встроенная в контент',
    influencer: 'Реклама через инфлюенсера',
  };
  return descriptions[method] || method;
}
