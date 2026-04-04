// Advanced AI Engine - Реализация 20 интеллектуальных функций
// УРОВЕНЬ 1-4: От "сильно улучшат" до "сделают софт уникальным"

import { db } from './db';
import { AIDispatcher, getAIDispatcher, TaskType } from './ai-dispatcher';

// ==================== ТИПЫ ====================

export interface ChannelPrediction {
  channelId: string;
  spamDeleteMinutes: number | null;
  banProbability: number;
  bestCommentStyle: string;
  bestTimeToPost: string;
  moderationStrictness: number;
  confidence: number;
}

export interface ViralChainScenario {
  steps: ViralChainStep[];
  totalDuration: number;
  expectedEngagement: number;
}

export interface ViralChainStep {
  content: string;
  style: 'neutral' | 'question' | 'endorsement' | 'testimonial';
  delayMinutes: number;
  accountId?: string;
}

export interface EmotionalProfile {
  primaryEmotion: 'anger' | 'joy' | 'sadness' | 'fear' | 'surprise' | 'neutral';
  emotionScores: Record<string, number>;
  recommendedStyle: string;
  recommendedTone: string;
  avoidTopics: string[];
}

export interface NeuralSearchResult {
  channelId: string;
  channelName: string;
  subscribers: number;
  relevanceScore: number;
  audienceMatch: number;
  reason: string;
}

export interface LTVPrediction {
  channelId: string;
  predictedLTV: number;
  confidence: number;
  factors: {
    audienceQuality: number;
    purchasingPower: number;
    competitionLevel: number;
  };
  recommendedBudget: number;
}

export interface BotDetectionResult {
  channelId: string;
  botPercentage: number;
  realUsersPercentage: number;
  recommendation: 'safe' | 'caution' | 'avoid';
  indicators: {
    suspiciousAvatars: number;
    genericNames: number;
    lowActivityUsers: number;
  };
}

export interface VoiceCommandResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  executable: boolean;
}

// ==================== УРОВЕНЬ 1: ИНТЕЛЛЕКТУАЛЬНЫЕ ФУНКЦИИ ====================

/**
 * 1. Предиктивный анализ канала перед запуском
 * DeepSeek анализирует канал и предсказывает:
 * - Через сколько минут удалят спам
 * - Вероятность бана аккаунта
 * - Какой стиль комментария сработает лучше всего
 */
export async function predictChannelBehavior(
  channelId: string,
  channelData: {
    name?: string;
    description?: string;
    subscribersCount?: number;
    recentPosts?: Array<{ views: number; comments: number; reactions: number }>;
  },
  userId: string
): Promise<ChannelPrediction> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  // Формируем промпт для анализа
  const prompt = `Проанализируй Telegram канал и предскажи поведение модерации и аудитории.

ДАННЫЕ КАНАЛА:
- ID: ${channelId}
- Название: ${channelData.name || 'Неизвестно'}
- Подписчики: ${channelData.subscribersCount || 'Неизвестно'}
- Описание: ${channelData.description || 'Нет описания'}
${channelData.recentPosts ? `- Последние посты: ${JSON.stringify(channelData.recentPosts.slice(0, 5))}` : ''}

ТРЕБУЕТСЯ ОЦЕНИТЬ (ответ в JSON формате):
{
  "spamDeleteMinutes": число (через сколько минут удалят спам, null если не удаляют),
  "banProbability": число 0-100 (вероятность бана аккаунта за спам),
  "bestCommentStyle": "casual" | "expert" | "friendly" | "provocative" | "storytelling",
  "bestTimeToPost": "HH:MM" (лучшее время для постинга),
  "moderationStrictness": число 0-100 (строгость модерации),
  "confidence": число 0-1 (уверенность в прогнозе)
}

Анализируй:
1. Тип контента и реакция аудитории
2. Активность модерации (если есть данные)
3. Тематика канала
4. Размер и вовлечённость аудитории`;

  try {
    const result = await dispatcher.generate(prompt, 'channel_analysis', {
      temperature: 0.3,
      maxTokens: 500,
    });
    
    // Парсим JSON из ответа
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const prediction = JSON.parse(jsonMatch[0]) as ChannelPrediction;
      prediction.channelId = channelId;
      
      // Сохраняем в базу
      await db.channelAnalysis.upsert({
        where: { channelId },
        create: {
          channelId,
          channelName: channelData.name,
          subscribersCount: channelData.subscribersCount || 0,
          spamDeleteMinutes: prediction.spamDeleteMinutes,
          banProbability: prediction.banProbability,
          bestCommentStyle: prediction.bestCommentStyle,
          bestTimeToPost: prediction.bestTimeToPost,
          moderationStrictness: prediction.moderationStrictness,
          lastAnalyzedAt: new Date(),
        },
        update: {
          spamDeleteMinutes: prediction.spamDeleteMinutes,
          banProbability: prediction.banProbability,
          bestCommentStyle: prediction.bestCommentStyle,
          bestTimeToPost: prediction.bestTimeToPost,
          moderationStrictness: prediction.moderationStrictness,
          lastAnalyzedAt: new Date(),
        },
      });
      
      return prediction;
    }
    
    throw new Error('Failed to parse prediction response');
  } catch (error) {
    console.error('[PredictChannel] Error:', error);
    
    // Возвращаем консервативные значения при ошибке
    return {
      channelId,
      spamDeleteMinutes: 5,
      banProbability: 50,
      bestCommentStyle: 'casual',
      bestTimeToPost: '12:00',
      moderationStrictness: 50,
      confidence: 0.3,
    };
  }
}

/**
 * 2. Авто-генерация «вирусных» цепочек комментариев
 * Сценарий из 3-5 сообщений, который разворачивается в течение часа
 */
export async function generateViralChain(
  postContent: string,
  offerInfo: {
    name: string;
    niche: string;
    callToAction?: string;
  },
  userId: string
): Promise<ViralChainScenario> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const prompt = `Создай вирусную цепочку из 3-5 комментариев для продвижения оффера.

ПОСТ: ${postContent}

ОФФЕР: ${offerInfo.name}
НИША: ${offerInfo.niche}
${offerInfo.callToAction ? `CTA: ${offerInfo.callToAction}` : ''}

ТРЕБОВАНИЯ:
- Цепочка должна создавать иллюзию живого обсуждения
- Комментарии идут с задержками (5-20 минут)
- Плавное развитие темы
- Естественный переход к офферу
- НЕ спам!

Ответ в JSON формате:
{
  "steps": [
    {
      "content": "текст комментария",
      "style": "neutral|question|endorsement|testimonial",
      "delayMinutes": число
    }
  ],
  "totalDuration": число (минут),
  "expectedEngagement": число (ожидаемый % вовлечённости)
}

ВАЖНО: Комментарии должны звучать как от разных людей!`;

  try {
    const result = await dispatcher.generate(prompt, 'critical_comment', {
      temperature: 1.0,
      maxTokens: 1000,
    });
    
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ViralChainScenario;
    }
    
    throw new Error('Failed to parse viral chain response');
  } catch (error) {
    console.error('[ViralChain] Error:', error);
    
    // Возвращаем базовую цепочку при ошибке
    return {
      steps: [
        { content: 'Интересный пост!', style: 'neutral', delayMinutes: 0 },
        { content: 'Кто-нибудь уже пробовал подобное?', style: 'question', delayMinutes: 10 },
        { content: 'Я пробовал, работает нормально', style: 'endorsement', delayMinutes: 25 },
      ],
      totalDuration: 30,
      expectedEngagement: 5,
    };
  }
}

/**
 * 3. Эмоциональный интеллект (адаптация под настроение поста)
 * DeepSeek определяет эмоциональный фон и подбирает комментарий
 */
export async function analyzeEmotionalContext(
  postContent: string,
  userId: string
): Promise<EmotionalProfile> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const prompt = `Проанализируй эмоциональный тон поста и дай рекомендации по комментарию.

ПОСТ: ${postContent}

Определи:
1. Главная эмоция (anger, joy, sadness, fear, surprise, neutral)
2. Оценки каждой эмоции (сумма = 1)
3. Рекомендуемый стиль комментария
4. Рекомендуемый тон
5. Темы, которых СЛЕДУЕТ ИЗБЕГАТЬ

Ответ в JSON:
{
  "primaryEmotion": "emotion",
  "emotionScores": {"anger": 0.1, "joy": 0.3, "sadness": 0.1, "fear": 0.1, "surprise": 0.2, "neutral": 0.2},
  "recommendedStyle": "supportive|celebratory|empathetic|curious|neutral",
  "recommendedTone": "casual|formal|enthusiastic|calm|friendly",
  "avoidTopics": ["тема1", "тема2"]
}

Правила:
- Гневный пост → комментарий-поддержка
- Радостный пост → разделение радости
- Грустный пост → сочувствие
- Страх → успокоение/информация`;

  try {
    const result = await dispatcher.generate(prompt, 'channel_analysis', {
      temperature: 0.3,
      maxTokens: 500,
    });
    
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const profile = JSON.parse(jsonMatch[0]) as EmotionalProfile;
      
      // Сохраняем анализ
      await db.emotionalAnalysis.create({
        data: {
          postContent: postContent.substring(0, 500),
          primaryEmotion: profile.primaryEmotion,
          emotionScores: JSON.stringify(profile.emotionScores),
          recommendedStyle: profile.recommendedStyle,
          recommendedTone: profile.recommendedTone,
          avoidTopics: JSON.stringify(profile.avoidTopics),
        },
      });
      
      return profile;
    }
    
    throw new Error('Failed to parse emotional analysis');
  } catch (error) {
    console.error('[EmotionalAnalysis] Error:', error);
    return {
      primaryEmotion: 'neutral',
      emotionScores: { neutral: 1.0 },
      recommendedStyle: 'neutral',
      recommendedTone: 'casual',
      avoidTopics: [],
    };
  }
}

/**
 * Генерация комментария с учётом эмоционального контекста
 */
export async function generateEmotionallyAwareComment(
  postContent: string,
  offerInfo: { name: string; link?: string },
  emotionalProfile: EmotionalProfile,
  userId: string
): Promise<string> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const emotionGuides: Record<string, string> = {
    anger: 'Поддержи автора, раздели возмущение, будь на его стороне',
    joy: 'Раздели радость, поздравь, добавь позитива',
    sadness: 'Прояви сочувствие, поддержи, не будь навязчивым',
    fear: 'Успокой, предложи решение, дай надежду',
    surprise: 'Поделись удивлением, задай уточняющий вопрос',
    neutral: 'Будь дружелюбным и естественным',
  };
  
  const prompt = `Напиши комментарий к посту с учётом эмоционального контекста.

ПОСТ: ${postContent}

ЭМОЦИОНАЛЬНЫЙ КОНТЕКСТ:
- Главная эмоция: ${emotionalProfile.primaryEmotion}
- Руководство: ${emotionGuides[emotionalProfile.primaryEmotion]}
- Рекомендуемый стиль: ${emotionalProfile.recommendedStyle}
- Рекомендуемый тон: ${emotionalProfile.recommendedTone}
- Избегать тем: ${emotionalProfile.avoidTopics.join(', ')}

ОФФЕР (интегрировать естественно): ${offerInfo.name}

ТРЕБОВАНИЯ:
1. Комментарий должен резонировать с эмоциями автора
2. НЕ спам, НЕ продажный тон
3. Естественная интеграция оффера ИЛИ намёк
4. Длина 50-200 символов
5. Звучит как живой человек

Напиши только текст комментария, без объяснений.`;

  const result = await dispatcher.generate(prompt, 'critical_comment', {
    temperature: 0.9,
    maxTokens: 200,
  });
  
  return result.content.trim();
}

/**
 * 4. Имитация «человеческой забывчивости»
 */
export async function generateForgetfulComment(
  originalTopic: string,
  daysSincePost: number,
  userId: string
): Promise<string> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const forgetfulPhrases = [
    'Я тут вчера хотел спросить...',
    'Забыл ответить тогда, но...',
    'Вспомнил про этот пост...',
    'Только сейчас увидел, но...',
    'Давно хотел написать...',
  ];
  
  const prompt = `Напиши комментарий-воспоминание к посту.

ТЕМА ПОСТА: ${originalTopic}
ДНЕЙ ПРОШЛО: ${daysSincePost}

Начни с одной из фраз: ${forgetfulPhrases.join(', ')}

Требования:
1. Звучит как человек, который "забыл" и "вспомнил"
2. Естественный интерес к теме
3. Длина 30-100 символов
4. Небрежный, живой стиль

Напиши только текст комментария.`;

  const result = await dispatcher.generate(prompt, 'mass_generation', {
    temperature: 1.2,
    maxTokens: 150,
  });
  
  return result.content.trim();
}

/**
 * 5. Кросспостинг с обогащением
 * Адаптация лучших комментариев из других каналов
 */
export async function enrichCrossPost(
  originalComment: string,
  targetPostContent: string,
  userId: string
): Promise<string> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const prompt = `Адаптируй успешный комментарий под новый пост.

ОРИГИНАЛЬНЫЙ КОММЕНТАРИЙ (уже сработал): ${originalComment}

НОВЫЙ ПОСТ: ${targetPostContent}

Требования:
1. Сохрани суть успешного комментария
2. Адаптируй под контекст нового поста
3. Сохрани стиль и тон
4. Сделай уникальным (не копия)
5. Длина 30-150 символов

Напиши адаптированный комментарий.`;

  const result = await dispatcher.generate(prompt, 'mass_generation', {
    temperature: 0.8,
    maxTokens: 200,
  });
  
  return result.content.trim();
}

// ==================== УРОВЕНЬ 2: АРБИТРАЖНЫЕ ФУНКЦИИ ====================

/**
 * 6. Нейросетевой поиск каналов по смыслу
 */
export async function neuralChannelSearch(
  query: string,
  filters: {
    niche?: string;
    minSubscribers?: number;
    maxSubscribers?: number;
    minEngagement?: number;
  },
  userId: string
): Promise<NeuralSearchResult[]> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  // Сохраняем запрос поиска
  const searchRecord = await db.neuralChannelSearch.create({
    data: {
      searchQuery: query,
      offerNiche: filters.niche,
      minSubscribers: filters.minSubscribers,
      maxSubscribers: filters.maxSubscribers,
      minEngagement: filters.minEngagement,
      status: 'searching',
    },
  });
  
  const prompt = `Ты - AI-помощник для поиска Telegram каналов.

Запрос: "${query}"
${filters.niche ? `Ниша: ${filters.niche}` : ''}
${filters.minSubscribers ? `Мин. подписчиков: ${filters.minSubscribers}` : ''}
${filters.maxSubscribers ? `Макс. подписчиков: ${filters.maxSubscribers}` : ''}

Твоя задача - описать идеальный тип канала и его аудиторию.
Сгенерируй описание каналов, которые подходят под запрос.

Ответ в JSON:
{
  "channelTypes": [
    {
      "description": "описание типа канала",
      "audienceProfile": "профиль аудитории",
      "keywords": ["ключевые слова для поиска"],
      "estimatedRelevance": число 0-100
    }
  ],
  "searchStrategy": "рекомендации по поиску"
}`;

  try {
    const result = await dispatcher.generate(prompt, 'channel_analysis', {
      temperature: 0.5,
      maxTokens: 800,
    });
    
    // Обновляем статус
    await db.neuralChannelSearch.update({
      where: { id: searchRecord.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    
    // Парсим и возвращаем результаты
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      // В реальной системе здесь был бы поиск по API Telegram
      return data.channelTypes.map((type: any, index: number) => ({
        channelId: `search_result_${index}`,
        channelName: type.description.substring(0, 50),
        subscribers: 0,
        relevanceScore: type.estimatedRelevance,
        audienceMatch: type.estimatedRelevance,
        reason: type.audienceProfile,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[NeuralSearch] Error:', error);
    await db.neuralChannelSearch.update({
      where: { id: searchRecord.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    return [];
  }
}

/**
 * 7. Динамическая замена оффера на лету
 */
export async function checkAndReplaceOffer(
  campaignId: string,
  currentMetrics: {
    comments: number;
    clicks: number;
    conversions: number;
    minutesElapsed: number;
  },
  userId: string
): Promise<{ shouldReplace: boolean; reason: string; newOfferId?: string }> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  // Получаем настройки замены
  const replacement = await db.dynamicOfferReplacement.findFirst({
    where: { campaignId },
  });
  
  if (!replacement) {
    return { shouldReplace: false, reason: 'No replacement configured' };
  }
  
  // Проверяем условия
  const threshold = replacement.minReactionThreshold;
  const checkAfter = replacement.checkAfterMinutes;
  
  if (currentMetrics.minutesElapsed < checkAfter) {
    return { shouldReplace: false, reason: 'Not enough time elapsed' };
  }
  
  // Низкая конверсия?
  const conversionRate = currentMetrics.clicks > 0 
    ? currentMetrics.conversions / currentMetrics.clicks 
    : 0;
  
  if (currentMetrics.clicks < threshold / 10 || conversionRate < 0.01) {
    // Анализируем первые комментарии для определения причины
    const prompt = `Проанализируй метрики кампании и реши, нужен ли другой оффер.

ТЕКУЩИЕ МЕТРИКИ:
- Комментариев: ${currentMetrics.comments}
- Кликов: ${currentMetrics.clicks}
- Конверсий: ${currentMetrics.conversions}
- Конверсия: ${(conversionRate * 100).toFixed(2)}%
- Время: ${currentMetrics.minutesElapsed} минут

Оффер не показывает хороших результатов.
Нужна ли замена оффера? Если да, какой тип оффера лучше?

Ответ в JSON:
{
  "shouldReplace": true/false,
  "reason": "причина",
  "suggestedOfferType": "тип оффера",
  "confidence": 0-1
}`;

    const result = await dispatcher.generate(prompt, 'channel_analysis', {
      temperature: 0.3,
      maxTokens: 300,
    });
    
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      
      if (analysis.shouldReplace && replacement.backupOfferId) {
        // Активируем резервный оффер
        await db.dynamicOfferReplacement.update({
          where: { id: replacement.id },
          data: {
            currentOfferId: replacement.backupOfferId,
            backupActivatedAt: new Date(),
            replacedCount: { increment: 1 },
          },
        });
        
        return {
          shouldReplace: true,
          reason: analysis.reason,
          newOfferId: replacement.backupOfferId,
        };
      }
    }
  }
  
  return { shouldReplace: false, reason: 'Metrics acceptable' };
}

/**
 * 8. Теневые аккаунты-поддержки
 */
export async function generateDefenseResponse(
  negativeComment: string,
  offerName: string,
  userId: string
): Promise<string> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const prompt = `Напиши защитный ответ на негативный комментарий о продукте.

НЕГАТИВНЫЙ КОММЕНТАРИЙ: ${negativeComment}
ПРОДУКТ: ${offerName}

Требования:
1. Защити продукт естественно, без агрессии
2. Приведи личный опыт (выдуманный, но правдоподобный)
3. Будь дружелюбным, не спорь
4. Не звучит как представитель компании
5. Длина 50-200 символов

Примеры стиля:
- "Я лично вывел 500$ вчера. Можешь не верить, мне же лучше"
- "Странно, у меня всё работает уже 3 месяца"
- "Проблема скорее в том, как ты используешь..."

Напиши только текст ответа.`;

  const result = await dispatcher.generate(prompt, 'dialogue_reply', {
    temperature: 0.9,
    maxTokens: 200,
  });
  
  return result.content.trim();
}

/**
 * 9. Прогноз LTV по каналу
 */
export async function predictChannelLTV(
  channelId: string,
  channelData: {
    name?: string;
    subscribers?: number;
    avgViews?: number;
    engagementRate?: number;
    niche?: string;
  },
  offerNiche: string,
  userId: string
): Promise<LTVPrediction> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const prompt = `Оцени потенциальный LTV (Lifetime Value) подписчика канала для оффера.

ДАННЫЕ КАНАЛА:
- ID: ${channelId}
- Название: ${channelData.name || 'Неизвестно'}
- Подписчики: ${channelData.subscribers || 'Неизвестно'}
- Средние просмотры: ${channelData.avgViews || 'Неизвестно'}
- Вовлечённость: ${channelData.engagementRate || 'Неизвестно'}%
- Ниша: ${channelData.niche || 'Неизвестно'}

ОФФЕР НИША: ${offerNiche}

Оцени:
1. Качество аудитории (0-100)
2. Платёжеспособность (0-100)
3. Уровень конкуренции (0-100)
4. Предсказанный LTV в USD

Ответ в JSON:
{
  "predictedLTV": число (USD),
  "confidence": 0-1,
  "factors": {
    "audienceQuality": 0-100,
    "purchasingPower": 0-100,
    "competitionLevel": 0-100
  },
  "recommendedBudget": число (USD),
  "reasoning": "обоснование"
}`;

  try {
    const result = await dispatcher.generate(prompt, 'channel_analysis', {
      temperature: 0.3,
      maxTokens: 500,
    });
    
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const prediction = JSON.parse(jsonMatch[0]) as LTVPrediction;
      prediction.channelId = channelId;
      
      // Сохраняем прогноз
      await db.channelLTVPrediction.upsert({
        where: { channelId },
        create: {
          channelId,
          channelName: channelData.name,
          predictedLTV: prediction.predictedLTV,
          ltvConfidence: prediction.confidence,
          audienceQuality: prediction.factors.audienceQuality,
          purchasingPower: prediction.factors.purchasingPower,
          competitionLevel: prediction.factors.competitionLevel,
          recommendedBudget: prediction.recommendedBudget,
        },
        update: {
          predictedLTV: prediction.predictedLTV,
          ltvConfidence: prediction.confidence,
          audienceQuality: prediction.factors.audienceQuality,
          purchasingPower: prediction.factors.purchasingPower,
          competitionLevel: prediction.factors.competitionLevel,
          recommendedBudget: prediction.recommendedBudget,
        },
      });
      
      return prediction;
    }
    
    throw new Error('Failed to parse LTV prediction');
  } catch (error) {
    console.error('[LTVPrediction] Error:', error);
    return {
      channelId,
      predictedLTV: 0.5,
      confidence: 0.3,
      factors: { audienceQuality: 50, purchasingPower: 50, competitionLevel: 50 },
      recommendedBudget: 10,
    };
  }
}

/**
 * 10. Анти-фрод: детект ботов в канале
 */
export async function detectBots(
  channelId: string,
  subscriberSample: Array<{
    id: string;
    name?: string;
    avatar?: string;
    lastActive?: Date;
  }>,
  userId: string
): Promise<BotDetectionResult> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  // Быстрый анализ на основе паттернов
  const suspiciousAvatars = subscriberSample.filter(u => !u.avatar).length;
  const genericNames = subscriberSample.filter(u => {
    if (!u.name) return true;
    // Паттерны типичных имён ботов
    const patterns = [
      /^[A-Z][a-z]+\s[A-Z][a-z]+$/,
      /^\d+$/,
      /^user\d+$/i
    ];
    return patterns.some(p => p.test(u.name!));
  }).length;
  const lowActivity = subscriberSample.filter(u => {
    if (!u.lastActive) return true;
    const daysSinceActive = (Date.now() - u.lastActive.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActive > 30;
  }).length;
  
  // AI-анализ для детальной оценки
  const prompt = `Проанализируй выборку подписчиков канала на наличие ботов.

ВЫБОРКА (${subscriberSample.length} пользователей):
${JSON.stringify(subscriberSample.slice(0, 20).map(u => ({
  name: u.name,
  hasAvatar: !!u.avatar,
  lastActive: u.lastActive?.toISOString?.() || 'unknown',
})))}

ИНДИКАТОРЫ:
- Без аватаров: ${suspiciousAvatars}
- Типичные имена ботов: ${genericNames}
- Низкая активность: ${lowActivity}

Определи процент ботов.

Ответ в JSON:
{
  "botPercentage": 0-100,
  "realUsersPercentage": 0-100,
  "recommendation": "safe|caution|avoid",
  "reasoning": "обоснование"
}`;

  try {
    const result = await dispatcher.generate(prompt, 'channel_analysis', {
      temperature: 0.2,
      maxTokens: 300,
    });
    
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const detection = JSON.parse(jsonMatch[0]) as BotDetectionResult;
      detection.channelId = channelId;
      detection.indicators = {
        suspiciousAvatars,
        genericNames,
        lowActivityUsers: lowActivity,
      };
      
      // Сохраняем результат
      await db.botDetection.create({
        data: {
          channelId,
          botPercentage: detection.botPercentage,
          realUsersPercentage: detection.realUsersPercentage,
          suspiciousAvatars,
          genericNames,
          lowActivityUsers: lowActivity,
          analyzedUsersCount: subscriberSample.length,
          recommendation: detection.recommendation,
        },
      });
      
      return detection;
    }
    
    throw new Error('Failed to parse bot detection');
  } catch (error) {
    console.error('[BotDetection] Error:', error);
    return {
      channelId,
      botPercentage: 30,
      realUsersPercentage: 70,
      recommendation: 'caution',
      indicators: { suspiciousAvatars, genericNames, lowActivityUsers: lowActivity },
    };
  }
}

// ==================== УРОВЕНЬ 3: ПЛАТФОРМЕННЫЕ ФУНКЦИИ ====================

/**
 * 13. Режим «турбо-профит» для опытных
 */
export async function getTurboProfitSettings(userId: string): Promise<{
  enabled: boolean;
  aggressionLevel: number;
  settings: {
    shortDelays: boolean;
    riskyStyles: boolean;
    complexOffers: boolean;
    maxBanRisk: number;
  };
}> {
  const settings = await db.turboProfitSettings.findUnique({
    where: { userId },
  });
  
  if (!settings) {
    return {
      enabled: false,
      aggressionLevel: 50,
      settings: {
        shortDelays: false,
        riskyStyles: false,
        complexOffers: false,
        maxBanRisk: 50,
      },
    };
  }
  
  return {
    enabled: settings.enabled,
    aggressionLevel: settings.aggressionLevel,
    settings: {
      shortDelays: settings.shortDelays,
      riskyStyles: settings.riskyStyles,
      complexOffers: settings.complexOffers,
      maxBanRisk: settings.maxBanRisk,
    },
  };
}

/**
 * 15. Авто-генерация кейсов для продажи обучения
 */
export async function generateCaseStudy(
  campaignData: {
    name: string;
    revenue: number;
    spent: number;
    leads: number;
    conversions: number;
    duration: number;
  },
  userId: string
): Promise<{ title: string; summary: string; screenshots: string[] }> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const roi = campaignData.spent > 0 
    ? ((campaignData.revenue - campaignData.spent) / campaignData.spent * 100).toFixed(0)
    : 0;
  
  const prompt = `Создай продающий кейс на основе реальных данных кампании.

ДАННЫЕ КАМПАНИИ:
- Название: ${campaignData.name}
- Выручка: $${campaignData.revenue}
- Расходы: $${campaignData.spent}
- ROI: ${roi}%
- Лиды: ${campaignData.leads}
- Конверсии: ${campaignData.conversions}
- Длительность: ${campaignData.duration} дней

Создай кейс для продажи обучения арбитражу.

Ответ в JSON:
{
  "title": "заголовок кейса (привлекательный)",
  "summary": "описание кейса 200-300 символов",
  "screenshots": ["описание скриншота 1", "описание скриншота 2", "описание скриншота 3"]
}

Требования к кейсу:
1. Заголовок цепляет внимание
2. Цифры звучат впечатляюще
3. Описание интригует
4. Звучит достижимо для новичка`;

  const result = await dispatcher.generate(prompt, 'mass_generation', {
    temperature: 0.8,
    maxTokens: 500,
  });
  
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return {
    title: `Кейс: $${campaignData.revenue} за ${campaignData.duration} дней`,
    summary: `Заработал $${campaignData.revenue} с ROI ${roi}%`,
    screenshots: ['Скриншот статистики', 'Скриншот выплат', 'Скриншот кампании'],
  };
}

// ==================== УРОВЕНЬ 4: УНИКАЛЬНЫЕ ФУНКЦИИ ====================

/**
 * 17. Авто-создание «легенд» под каждый канал
 */
export async function generateAccountLegend(
  channelTheme: string,
  influencerData?: {
    name?: string;
    age?: number;
    gender?: string;
  },
  userId?: string
): Promise<{
  age: number;
  city: string;
  occupation: string;
  hobbies: string[];
  bio: string;
}> {
  const dispatcher = userId ? getAIDispatcher(userId) : null;
  if (dispatcher) await dispatcher.initialize();
  
  const prompt = `Создай легенду (биографию) для аккаунта, который будет комментировать в канале.

ТЕМА КАНАЛА: ${channelTheme}
${influencerData?.name ? `Имя: ${influencerData.name}` : ''}
${influencerData?.age ? `Возраст: ${influencerData.age}` : ''}
${influencerData?.gender ? `Пол: ${influencerData.gender}` : ''}

Легенда должна:
1. Соответствовать тематике канала
2. Выглядеть правдоподобно
3. Вызывать доверие аудитории
4. Быть запоминающейся

Ответ в JSON:
{
  "age": число (18-45),
  "city": "город",
  "occupation": "профессия/род деятельности",
  "hobbies": ["хобби1", "хобби2", "хобби3"],
  "bio": "краткая биография 50-100 символов"
}`;

  const result = await dispatcher?.generate(prompt, 'mass_generation', {
    temperature: 1.0,
    maxTokens: 300,
  });
  
  if (result) {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  
  // Fallback - генерируем случайную легенду
  const cities = ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'Екатеринбург'];
  const occupations: Record<string, string[]> = {
    crypto: ['Трейдер', 'Инвестор', 'Аналитик', 'Разработчик'],
    gambling: ['Студент', 'Менеджер', 'Предприниматель', 'Фрилансер'],
    nutra: ['Фитнес-тренер', 'Врач', 'Модель', 'Блогер'],
    default: ['Менеджер', 'Предприниматель', 'Фрилансер', 'Студент'],
  };
  
  const theme = channelTheme.toLowerCase();
  const category = Object.keys(occupations).find(k => theme.includes(k)) || 'default';
  
  return {
    age: Math.floor(Math.random() * 20) + 22,
    city: cities[Math.floor(Math.random() * cities.length)],
    occupation: occupations[category][Math.floor(Math.random() * occupations[category].length)],
    hobbies: ['Путешествия', 'Спорт', 'Книги'].slice(0, Math.floor(Math.random() * 3) + 1),
    bio: 'Обычный человек с необычными интересами',
  };
}

/**
 * 20. Голосовое управление кампанией
 */
export async function processVoiceCommand(
  transcript: string,
  userId: string
): Promise<VoiceCommandResult> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  const prompt = `Проанализируй голосовую команду для управления кампанией арбитража.

ТЕКСТ КОМАНДЫ: "${transcript}"

Определи:
1. Intent (намерение): start_campaign, pause_campaign, set_budget, check_stats, create_offer, etc.
2. Entities (сущности): budget, duration, niche, style, etc.
3. Executable (можно ли выполнить)

Ответ в JSON:
{
  "intent": "название_intent",
  "entities": {
    "budget": число (если указано),
    "duration": число дней (если указано),
    "niche": "ниша" (если указано),
    "style": "стиль" (если указано),
    "offer": "оффер" (если указано)
  },
  "confidence": 0-1,
  "executable": true/false,
  "clarification": "вопрос если нужна уточнение" (опционально)
}

Примеры:
- "Запусти кампанию на казино бюджет 50 баксов на 3 дня" → start_campaign с entities
- "Пауза" → pause_campaign
- "Сколько заработали?" → check_stats`;

  try {
    const result = await dispatcher.generate(prompt, 'critical_comment', {
      temperature: 0.2,
      maxTokens: 400,
    });
    
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const commandResult = JSON.parse(jsonMatch[0]) as VoiceCommandResult;
      
      // Сохраняем команду
      await db.voiceCommand.create({
        data: {
          transcript,
          intent: commandResult.intent,
          entities: JSON.stringify(commandResult.entities),
          executed: false,
        },
      });
      
      return commandResult;
    }
    
    throw new Error('Failed to parse voice command');
  } catch (error) {
    console.error('[VoiceCommand] Error:', error);
    return {
      intent: 'unknown',
      entities: {},
      confidence: 0,
      executable: false,
    };
  }
}

/**
 * Адаптивная перегенерация удалённого комментария
 */
export async function regenerateDeletedComment(
  originalContent: string,
  deletionReason: string,
  channelId: string,
  userId: string
): Promise<string> {
  const dispatcher = getAIDispatcher(userId);
  await dispatcher.initialize();
  
  // Получаем анализ канала
  const channelAnalysis = await db.channelAnalysis.findUnique({
    where: { channelId },
  });
  
  const prompt = `Перегенерируй комментарий, который был удалён модерацией.

ОРИГИНАЛЬНЫЙ КОММЕНТАРИЙ (удалён): ${originalContent}

ПРИЧИНА УДАЛЕНИЯ: ${deletionReason}

${channelAnalysis ? `
АНАЛИЗ КАНАЛА:
- Строгость модерации: ${channelAnalysis.moderationStrictness}/100
- Лучший стиль: ${channelAnalysis.bestCommentStyle}
- Риск бана: ${channelAnalysis.banProbability}%
` : ''}

Требования к новому комментарию:
1. Сохрани цель (привлечь внимание к офферу)
2. Избегай паттернов, которые привели к удалению
3. Будь более естественным и менее "рекламным"
4. Используй ${channelAnalysis?.bestCommentStyle || 'casual'} стиль
5. Длина 30-150 символов

Напиши только новый комментарий.`;

  const result = await dispatcher.generate(prompt, 'adaptive_regen', {
    temperature: 1.0,
    maxTokens: 200,
  });
  
  return result.content.trim();
}

// ==================== ЭКСПОРТ КЛАССА ====================

/**
 * Главный класс Advanced AI Engine
 */
export class AdvancedAIEngine {
  private userId: string;
  private dispatcher: AIDispatcher | null = null;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  async initialize(): Promise<void> {
    this.dispatcher = getAIDispatcher(this.userId);
    await this.dispatcher.initialize();
  }
  
  // УРОВЕНЬ 1
  predictChannel = predictChannelBehavior;
  generateViralChain = generateViralChain;
  analyzeEmotion = analyzeEmotionalContext;
  generateEmotionallyAwareComment = generateEmotionallyAwareComment;
  generateForgetfulComment = generateForgetfulComment;
  enrichCrossPost = enrichCrossPost;
  
  // УРОВЕНЬ 2
  neuralSearch = neuralChannelSearch;
  checkOfferReplacement = checkAndReplaceOffer;
  generateDefenseResponse = generateDefenseResponse;
  predictLTV = predictChannelLTV;
  detectBots = detectBots;
  
  // УРОВЕНЬ 3
  getTurboSettings = getTurboProfitSettings;
  generateCase = generateCaseStudy;
  
  // УРОВЕНЬ 4
  generateLegend = generateAccountLegend;
  processVoice = processVoiceCommand;
  regenerateDeleted = regenerateDeletedComment;
}

export function getAdvancedAIEngine(userId: string): AdvancedAIEngine {
  return new AdvancedAIEngine(userId);
}
