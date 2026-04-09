// AI Comments Engine
// Главный движок для AI-комментирования

import { getZAI } from '@/lib/z-ai';
import { v4 as uuidv4 } from 'uuid';
import {
  CommentGenerationConfig,
  CommentContext,
  CommentGenerationResult,
  GeneratedComment,
  RiskAnalysisRequest,
  RiskAnalysisResult,
  BudgetCalculationRequest,
  BudgetCalculationResult,
  ChannelAnalysisRequest,
  ChannelAnalysisResult,
  RegenerationRequest,
  RegenerationResult,
  DialogueContext,
  DialogueResponse,
  SYSTEM_PROMPTS,
  DEFAULT_CONFIG,
  OfferTheme,
  CommentStyle,
} from './types';

// ==================== ГЛАВНЫЙ КЛАСС ====================

export class AICommentsEngine {
  private config: CommentGenerationConfig;
  private zai: Awaited<ReturnType<typeof getZAI>> | null = null;
  private userId: string;

  constructor(config: Partial<CommentGenerationConfig> = {}, userId: string = 'default-user') {
    this.config = { ...DEFAULT_CONFIG, ...config } as CommentGenerationConfig;
    this.userId = userId;
  }

  // Инициализация SDK
  private async initSDK() {
    if (!this.zai) {
      this.zai = await getZAI();
    }
    return this.zai;
  }

  // ==================== ГЕНЕРАЦИЯ КОММЕНТАРИЕВ ====================

  /**
   * Генерирует уникальные комментарии для поста
   */
  async generateComments(
    context: CommentContext,
    count: number = 3,
    config?: Partial<CommentGenerationConfig>
  ): Promise<CommentGenerationResult> {
    try {
      const finalConfig = { ...this.config, ...config };
      const zai = await this.initSDK();

      const systemPrompt = this.buildPrompt('commentGeneration', {
        minLength: finalConfig.minLength,
        maxLength: finalConfig.maxLength,
        style: this.getStyleDescription(finalConfig.style),
        offerTheme: this.getOfferDescription(finalConfig.offerTheme),
      });

      const userPrompt = this.buildCommentUserPrompt(context, finalConfig);

      const comments: GeneratedComment[] = [];

      for (let i = 0; i < count; i++) {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: finalConfig.temperature,
          max_tokens: finalConfig.maxTokens,
        });

        const text = completion.choices[0]?.message?.content?.trim() || '';
        
        if (text) {
          comments.push({
            id: uuidv4(),
            text: this.cleanComment(text, finalConfig),
            style: finalConfig.style,
            tokens: completion.usage?.total_tokens || 0,
            generatedAt: new Date(),
            provider: 'deepseek',
            model: finalConfig.model,
            temperature: finalConfig.temperature,
          });
        }
      }

      return {
        success: true,
        comments,
      };
    } catch (error) {
      console.error('Comment generation error:', error);
      return {
        success: false,
        comments: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildCommentUserPrompt(context: CommentContext, config: CommentGenerationConfig): string {
    let prompt = `ТЕКСТ ПОСТА:\n${context.postText}\n\n`;
    
    if (context.channelTopic) {
      prompt += `ТЕМА КАНАЛА: ${context.channelTopic}\n`;
    }
    
    if (context.recentPosts?.length) {
      prompt += `\nПОСЛЕДНИЕ ПОСТЫ КАНАЛА:\n${context.recentPosts.slice(0, 3).join('\n---\n')}\n`;
    }
    
    prompt += `\nЦЕЛЕВОЙ ОФФЕР: ${context.targetOffer}`;
    
    if (config.forbiddenWords.length > 0) {
      prompt += `\n\nЗАПРЕЩЁННЫЕ СЛОВА (НЕ использовать): ${config.forbiddenWords.join(', ')}`;
    }
    
    prompt += `\n\nНапиши ${config.language === 'ru' ? 'на русском' : 'на английском'} языке.`;
    
    return prompt;
  }

  private cleanComment(text: string, config: CommentGenerationConfig): string {
    // Удаляем кавычки в начале и конце
    let cleaned = text.replace(/^["']|["']$/g, '').trim();
    
    // Проверяем на запрещённые слова
    const lowerText = cleaned.toLowerCase();
    for (const word of config.forbiddenWords) {
      if (lowerText.includes(word.toLowerCase())) {
        // Заменяем на более нейтральный вариант
        cleaned = cleaned.replace(new RegExp(word, 'gi'), '...');
      }
    }
    
    // Обрезаем если слишком длинный
    if (cleaned.length > config.maxLength) {
      cleaned = cleaned.substring(0, config.maxLength - 3) + '...';
    }
    
    return cleaned;
  }

  // ==================== ЮРИДИЧЕСКИЙ РИСК-АНАЛИЗ ====================

  /**
   * Анализирует юридические риски рекламной схемы
   */
  async analyzeRisk(request: RiskAnalysisRequest): Promise<RiskAnalysisResult> {
    try {
      const zai = await this.initSDK();

      const systemPrompt = SYSTEM_PROMPTS.riskAnalysis;
      const userPrompt = this.buildPrompt('riskAnalysis', {
        offerTheme: this.getOfferDescription(request.offerTheme),
        promotionMethod: this.getPromotionMethodDescription(request.promotionMethod),
        sampleText: request.sampleText || 'Не указан',
      });

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Низкая температура для более точного анализа
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Парсим JSON из ответа
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        riskLevel: parsed.risk_level || 'yellow',
        possibleArticles: parsed.possible_articles || [],
        warningText: parsed.warning_text || 'Не удалось определить риски',
        recommendation: parsed.recommendation || '',
        riskScore: parsed.risk_score || 50,
      };
    } catch (error) {
      console.error('Risk analysis error:', error);
      return {
        success: false,
        riskLevel: 'yellow',
        possibleArticles: [],
        warningText: 'Не удалось провести анализ. Проверьте подключение к AI.',
        recommendation: '',
        riskScore: 50,
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== РАСЧЁТ БЮДЖЕТА ====================

  /**
   * Рассчитывает бюджет кампании с помощью AI
   */
  async calculateBudget(request: BudgetCalculationRequest): Promise<BudgetCalculationResult> {
    try {
      const zai = await this.initSDK();

      // Сначала базовый расчёт
      const commentsNeeded = Math.ceil(request.dailyGoal / (request.conversionRate / 100));
      const accountsNeeded = Math.ceil(commentsNeeded / request.commentsPerAccount);
      const proxiesNeeded = request.includeProxies ? accountsNeeded : 0;
      
      const accountTotal = accountsNeeded * request.accountCost;
      const proxyTotal = proxiesNeeded * request.proxyCost;
      const dailyBudget = accountTotal + proxyTotal;

      // Получаем AI-рекомендации
      const systemPrompt = SYSTEM_PROMPTS.budgetCalculation;
      const userPrompt = this.buildPrompt('budgetCalculation', {
        dailyGoal: request.dailyGoal,
        conversionRate: request.conversionRate,
        accountCost: request.accountCost,
        proxyCost: request.proxyCost,
        commentsPerAccount: request.commentsPerAccount,
      });

      let recommendations: string[] = [];

      try {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 300,
        });

        const responseText = completion.choices[0]?.message?.content || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          recommendations = parsed.recommendations || [];
        }
      } catch {
        // Fallback рекомендации
        recommendations = [
          'Рекомендуется иметь запас 20% аккаунтов на случай банов',
          'Используйте уникальные прокси для каждого аккаунта',
          'Не превышайте лимит комментариев для естественности',
        ];
      }

      return {
        success: true,
        commentsNeeded,
        accountsNeeded,
        proxiesNeeded,
        dailyBudget,
        monthlyBudget: dailyBudget * 30,
        breakdown: {
          accounts: accountTotal,
          proxies: proxyTotal,
          total: dailyBudget,
        },
        recommendations,
      };
    } catch (error) {
      console.error('Budget calculation error:', error);
      return {
        success: false,
        commentsNeeded: 0,
        accountsNeeded: 0,
        proxiesNeeded: 0,
        dailyBudget: 0,
        monthlyBudget: 0,
        breakdown: { accounts: 0, proxies: 0, total: 0 },
        recommendations: [],
      };
    }
  }

  // ==================== АНАЛИЗ КАНАЛА ====================

  /**
   * Анализирует канал перед спамом
   */
  async analyzeChannel(request: ChannelAnalysisRequest): Promise<ChannelAnalysisResult> {
    try {
      const zai = await this.initSDK();

      const systemPrompt = SYSTEM_PROMPTS.channelAnalysis;
      const userPrompt = `Посты канала:\n${request.posts.join('\n---\n')}`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Invalid JSON response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        topic: parsed.topic || 'Не определено',
        tone: parsed.tone || 'neutral',
        hasModeration: parsed.has_moderation ?? false,
        engagement: parsed.engagement || 'medium',
        suitableForOffers: parsed.suitable_for_offers || {},
        recommendation: parsed.recommendation || '',
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      console.error('Channel analysis error:', error);
      return {
        success: false,
        topic: 'Не определено',
        tone: 'neutral',
        hasModeration: false,
        engagement: 'medium',
        suitableForOffers: {} as Record<OfferTheme, number>,
        recommendation: 'Не удалось проанализировать канал',
        warnings: ['Ошибка анализа'],
      };
    }
  }

  // ==================== ПЕРЕГЕНЕРАЦИЯ ПОСЛЕ УДАЛЕНИЯ ====================

  /**
   * Генерирует новый комментарий после удаления модерацией
   */
  async regenerateAfterDeletion(request: RegenerationRequest): Promise<RegenerationResult> {
    try {
      const zai = await this.initSDK();

      const systemPrompt = this.buildPrompt('regeneration', {
        postText: request.postText,
        originalComment: request.originalComment,
        offerTheme: this.getOfferDescription(request.offerTheme),
        deletionReason: request.deletionReason || 'Не указана',
        minLength: this.config.minLength,
        maxLength: this.config.maxLength,
      });

      const previousAttemptsText = request.previousAttempts?.length
        ? `\n\nПРЕДЫДУЩИЕ ПОПЫТКИ (НЕ повторяй их):\n${request.previousAttempts.join('\n')}`
        : '';

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.regeneration },
          { role: 'user', content: systemPrompt + previousAttemptsText },
        ],
        temperature: Math.min(this.config.temperature + 0.2, 1.2), // Чуть выше для разнообразия
        max_tokens: this.config.maxTokens,
      });

      const newComment = completion.choices[0]?.message?.content?.trim() || '';

      // Анализируем изменения
      const changesMade = this.analyzeChanges(request.originalComment, newComment);

      return {
        success: true,
        newComment: this.cleanComment(newComment, this.config),
        changesMade,
        saferVersion: true,
      };
    } catch (error) {
      console.error('Regeneration error:', error);
      return {
        success: false,
        newComment: '',
        changesMade: [],
        saferVersion: false,
      };
    }
  }

  private analyzeChanges(original: string, newText: string): string[] {
    const changes: string[] = [];
    
    if (newText.length < original.length * 0.8) {
      changes.push('Комментарий короче');
    } else if (newText.length > original.length * 1.2) {
      changes.push('Комментарий длиннее');
    }
    
    const originalEmojis = (original.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    const newEmojis = (newText.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    
    if (newEmojis !== originalEmojis) {
      changes.push('Изменено количество эмодзи');
    }
    
    // Проверяем общие слова
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const newWords = new Set(newText.toLowerCase().split(/\s+/));
    const commonWords = [...originalWords].filter(w => newWords.has(w));
    
    if (commonWords.length < originalWords.size * 0.3) {
      changes.push('Полностью изменён словарный состав');
    }
    
    return changes;
  }

  // ==================== ОТВЕТЫ В ДИАЛОГЕ ====================

  /**
   * Генерирует ответ на возражение пользователя
   */
  async generateDialogueReply(context: DialogueContext): Promise<DialogueResponse> {
    try {
      const zai = await this.initSDK();

      const userPrompt = this.buildPrompt('dialogueReply', {
        ourComment: context.ourComment,
        userReply: context.userReply,
        offerTheme: this.getOfferDescription(context.offerTheme),
      });

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.dialogueReply },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 100,
      });

      const reply = completion.choices[0]?.message?.content?.trim() || '';

      // Оцениваем риск ответа
      const riskLevel = this.assessReplyRisk(reply, context);

      return {
        success: true,
        reply,
        shouldContinue: riskLevel !== 'danger',
        riskLevel,
      };
    } catch (error) {
      console.error('Dialogue reply error:', error);
      return {
        success: false,
        reply: '',
        shouldContinue: false,
        riskLevel: 'danger',
      };
    }
  }

  private assessReplyRisk(reply: string, context: DialogueContext): 'safe' | 'caution' | 'danger' {
    const lowerReply = reply.toLowerCase();
    
    // Опасные паттерны
    const dangerPatterns = [
      /ссылк/i, /подпис/i, /переход/i, /жми/i, /клик/i,
      /казино/i, /заработ/i, /деньг/i, /выигр/i,
    ];
    
    for (const pattern of dangerPatterns) {
      if (pattern.test(lowerReply)) {
        return 'danger';
      }
    }
    
    // Осторожные паттерны
    const cautionPatterns = [
      /могу/i, /есть/i, /знаю/i, /попробуй/i,
    ];
    
    for (const pattern of cautionPatterns) {
      if (pattern.test(lowerReply)) {
        return 'caution';
      }
    }
    
    return 'safe';
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  private buildPrompt(template: keyof typeof SYSTEM_PROMPTS, params: Record<string, unknown>): string {
    let prompt = SYSTEM_PROMPTS[template];
    
    for (const [key, value] of Object.entries(params)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    
    return prompt;
  }

  private getStyleDescription(style: CommentStyle): string {
    const descriptions: Record<CommentStyle, string> = {
      casual: 'небрежный, разговорный, как будто пишешь другу',
      expert: 'экспертный, уверенный, со знанием дела',
      friendly: 'дружелюбный, тёплый, поддерживающий',
      provocative: 'провокационный, цепляющий, вызывающий эмоции',
      storytelling: 'рассказ истории, личный опыт',
      humor: 'с юмором, лёгкий, с шуткой',
    };
    return descriptions[style];
  }

  private getOfferDescription(theme: OfferTheme): string {
    const descriptions: Record<OfferTheme, string> = {
      gambling: 'казино, игры на деньги, ставки',
      crypto: 'криптовалюта, инвестиции, токены',
      bait: 'кликбейт, интрига, любопытство',
      nutra: 'здоровье, красота, фитнес',
      dating: 'знакомства, отношения',
      finance: 'финансы, заработок, инвестиции',
      lifestyle: 'образ жизни, успех, мотивация',
    };
    return descriptions[theme];
  }

  private getPromotionMethodDescription(method: string): string {
    const descriptions: Record<string, string> = {
      bait: 'байт/кликбейт - заманивание интригой',
      direct_ad: 'прямая реклама с указанием продукта',
      fake_review: 'фейковый отзыв от "реального пользователя"',
      native_ad: 'нативная реклама, встроенная в контент',
      influencer: 'реклама через инфлюенсера',
    };
    return descriptions[method] || method;
  }
}

// Экспорт singleton
let engineInstance: AICommentsEngine | null = null;

export function getAICommentsEngine(config?: Partial<CommentGenerationConfig>, userId?: string): AICommentsEngine {
  if (!engineInstance) {
    engineInstance = new AICommentsEngine(config, userId);
  }
  return engineInstance;
}
