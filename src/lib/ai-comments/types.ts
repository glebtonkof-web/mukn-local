// AI Comments System Types
// Типы для системы AI-комментирования

// ==================== ГЕНЕРАЦИЯ КОММЕНТАРИЕВ ====================

export interface CommentGenerationConfig {
  // Настройки DeepSeek
  apiKey?: string;
  model: string;
  temperature: number; // 0.7 - 1.2
  maxTokens: number; // например 200
  
  // Контекст генерации
  offerTheme: OfferTheme;
  style: CommentStyle;
  language: 'ru' | 'en';
  
  // Ограничения
  maxLength: number;
  minLength: number;
  forbiddenWords: string[];
  requiredElements: string[];
}

export type OfferTheme = 'gambling' | 'crypto' | 'bait' | 'nutra' | 'dating' | 'finance' | 'lifestyle';
export type CommentStyle = 'casual' | 'expert' | 'friendly' | 'provocative' | 'storytelling' | 'humor';

export interface CommentContext {
  postText: string;
  channelTopic?: string;
  recentPosts?: string[];
  targetOffer: string;
  targetLink?: string;
}

export interface GeneratedComment {
  id: string;
  text: string;
  style: CommentStyle;
  tokens: number;
  generatedAt: Date;
  provider: string;
  model: string;
  temperature: number;
}

export interface CommentGenerationResult {
  success: boolean;
  comments: GeneratedComment[];
  error?: string;
}

// ==================== ЮРИДИЧЕСКИЙ РИСК-АНАЛИЗ ====================

export interface RiskAnalysisRequest {
  offerTheme: OfferTheme;
  sampleText?: string;
  promotionMethod: PromotionMethod;
  targetRegion?: string;
}

export type PromotionMethod = 'bait' | 'direct_ad' | 'fake_review' | 'native_ad' | 'influencer';

export interface RiskAnalysisResult {
  success: boolean;
  riskLevel: 'green' | 'yellow' | 'red';
  possibleArticles: string[]; // Статьи УК РФ
  warningText: string;
  recommendation: string;
  riskScore: number; // 0-100
  details?: string;
}

// ==================== РАСЧЁТ БЮДЖЕТА ====================

export interface BudgetCalculationRequest {
  dailyGoal: number; // Цель переходов в день
  conversionRate: number; // Конверсия из комментария в переход (%)
  accountCost: number; // Стоимость аккаунта (руб)
  proxyCost: number; // Стоимость прокси (руб)
  commentsPerAccount: number; // Комментарий на аккаунт в день
  includeProxies: boolean;
}

export interface BudgetCalculationResult {
  success: boolean;
  commentsNeeded: number;
  accountsNeeded: number;
  proxiesNeeded: number;
  dailyBudget: number;
  monthlyBudget: number;
  breakdown: {
    accounts: number;
    proxies: number;
    total: number;
  };
  recommendations: string[];
}

// ==================== АНАЛИЗ КАНАЛА ====================

export interface ChannelAnalysisRequest {
  posts: string[];
  channelName?: string;
  subscriberCount?: number;
}

export interface ChannelAnalysisResult {
  success: boolean;
  topic: string;
  tone: 'positive' | 'negative' | 'neutral' | 'mixed';
  hasModeration: boolean;
  engagement: 'low' | 'medium' | 'high';
  suitableForOffers: Record<OfferTheme, number>; // 0-1
  recommendation: string;
  warnings: string[];
}

// ==================== A/B ТЕСТИРОВАНИЕ ====================

export interface ABTestConfig {
  id: string;
  name: string;
  offerTheme: OfferTheme;
  styles: CommentStyle[];
  variantsPerStyle: number;
  testDuration: number; // часы
  channels: string[];
}

export interface ABTestVariant {
  id: string;
  testId: string;
  style: CommentStyle;
  comment: string;
  channels: string[];
  sent: number;
  clicks: number;
  conversions: number;
  deleted: number;
}

export interface ABTestResult {
  testId: string;
  winner: CommentStyle;
  winnerConversion: number;
  variants: ABTestVariant[];
  completedAt: Date;
  recommendation: string;
}

// ==================== АДАПТАЦИЯ ПОД МОДЕРАЦИЮ ====================

export interface RegenerationRequest {
  originalComment: string;
  postText: string;
  offerTheme: OfferTheme;
  deletionReason?: string;
  previousAttempts?: string[];
}

export interface RegenerationResult {
  success: boolean;
  newComment: string;
  changesMade: string[];
  saferVersion: boolean;
}

// ==================== ДИАЛОГ И ОТВЕТЫ ====================

export interface DialogueContext {
  ourComment: string;
  userReply: string;
  offerTheme: OfferTheme;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface DialogueResponse {
  success: boolean;
  reply: string;
  shouldContinue: boolean;
  riskLevel: 'safe' | 'caution' | 'danger';
}

// ==================== СИСТЕМНЫЕ ПРОМПТЫ ====================

export const SYSTEM_PROMPTS = {
  // Промпт для генерации комментариев
  commentGeneration: `Ты — арбитражник трафика. Твоя задача: написать естественный комментарий под пост в Telegram, чтобы заинтересовать пользователей и побудить их перейти в другой канал.

ПРАВИЛА:
- Не спамить явно
- Не писать "подпишись", "переходи по ссылке"
- Не хвастаться ссылками прямо
- Комментарий должен выглядеть как мнение живого человека
- Использовать эмодзи умеренно (1-3 штуки)
- Длина: {minLength}-{maxLength} символов
- Стиль: {style}

ТЕМА ОФФЕРА: {offerTheme}

ВАЖНО: Комментарий должен быть уникальным каждый раз. Избегай шаблонных фраз.`,

  // Промпт для риск-анализа
  riskAnalysis: `Ты — юридический консультант по российскому праву. Оцени риски рекламной схемы в Telegram.

ТЕМА ОФФЕРА: {offerTheme}
СПОСОБ ПРОДВИЖЕНИЯ: {promotionMethod}
ПРИМЕР ТЕКСТА: {sampleText}

Ответь СТРОГО в формате JSON:
{
  "risk_level": "green/yellow/red",
  "possible_articles": ["ст. XXX УК РФ"],
  "warning_text": "Краткое предупреждение",
  "recommendation": "Как снизить риск",
  "risk_score": 0-100
}`,

  // Промпт для анализа канала
  channelAnalysis: `Проанализируй Telegram-канал по следующим постам:

{posts}

Ответь СТРОГО в формате JSON:
{
  "topic": "тема канала",
  "tone": "positive/negative/neutral/mixed",
  "has_moderation": true/false,
  "engagement": "low/medium/high",
  "suitable_for_offers": {
    "gambling": 0.0-1.0,
    "crypto": 0.0-1.0,
    "bait": 0.0-1.0,
    "nutra": 0.0-1.0,
    "dating": 0.0-1.0,
    "finance": 0.0-1.0,
    "lifestyle": 0.0-1.0
  },
  "recommendation": "рекомендация по работе с каналом",
  "warnings": ["предупреждения"]
}`,

  // Промпт для перегенерации после удаления
  regeneration: `Предыдущий комментарий был удалён модерацией.

ИСХОДНЫЙ ПОСТ: {postText}
УДАЛЁННЫЙ КОММЕНТАРИЙ: {originalComment}
ТЕМА ОФФЕРА: {offerTheme}
ПРИЧИНА УДАЛЕНИЯ: {deletionReason}

Напиши НОВЫЙ комментарий:
- Полностью другая форма, та же суть
- Измени стиль, длину, эмодзи
- НЕ используй слова из удалённого комментария
- Будь менее подозрительным
- Длина: {minLength}-{maxLength} символов`,

  // Промпт для ответов в диалоге
  dialogueReply: `Это диалог в Telegram-канале:

НАШ КОММЕНТАРИЙ: {ourComment}
ОТВЕТ ПОЛЬЗОВАТЕЛЯ: {userReply}
ТЕМА ОФФЕРА: {offerTheme}

Напиши мой ответ:
- 1-2 предложения
- Естественный стиль
- Не извиняйся за спам
- Не ссылайся прямо на оффер
- Мягко продолжай тему
- Выгляди как обычный пользователь`,

  // Промпт для расчёта бюджета
  budgetCalculation: `Рассчитай параметры для спам-кампании в Telegram:

ЦЕЛЬ: {dailyGoal} переходов в день
КОНВЕРСИЯ: {conversionRate}%
СТОИМОСТЬ АККАУНТА: {accountCost} руб
СТОИМОСТЬ ПРОКСИ: {proxyCost} руб
КОММЕНТАРИЕВ НА АККАУНТ: {commentsPerAccount}/день

Ответь СТРОГО в формате JSON:
{
  "comments_needed": число,
  "accounts_needed": число,
  "proxies_needed": число,
  "daily_budget": число,
  "monthly_budget": число,
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}`
};

// ==================== КОНСТАНТЫ ====================

export const OFFER_THEME_LABELS: Record<OfferTheme, string> = {
  gambling: 'Казино/Гемблинг',
  crypto: 'Криптовалюта',
  bait: 'Байт/Кликбейт',
  nutra: 'Нутра/Здоровье',
  dating: 'Дейтинг',
  finance: 'Финансы',
  lifestyle: 'Лайфстайл',
};

export const COMMENT_STYLE_LABELS: Record<CommentStyle, string> = {
  casual: 'Небрежный',
  expert: 'Экспертный',
  friendly: 'Дружелюбный',
  provocative: 'Провокационный',
  storytelling: 'История',
  humor: 'С юмором',
};

export const PROMOTION_METHOD_LABELS: Record<PromotionMethod, string> = {
  bait: 'Байт/Кликбейт',
  direct_ad: 'Прямая реклама',
  fake_review: 'Фейковый отзыв',
  native_ad: 'Нативная реклама',
  influencer: 'Через инфлюенсера',
};

export const RISK_LEVEL_COLORS = {
  green: '#00D26A',
  yellow: '#FFB800',
  red: '#FF4D4D',
};

export const DEFAULT_CONFIG: Partial<CommentGenerationConfig> = {
  model: 'deepseek-chat',
  temperature: 0.9,
  maxTokens: 200,
  language: 'ru',
  maxLength: 300,
  minLength: 50,
  forbiddenWords: ['подпишись', 'переходи', 'ссылка', 'жми'],
};
