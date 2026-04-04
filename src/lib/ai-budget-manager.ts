// AI Budget Manager - Диспетчер бюджета DeepSeek
// Управляет распределением бюджета и рассчитывает лимиты

import { db } from './db';
import { nanoid } from 'nanoid';

// Цены DeepSeek (март 2026)
const DEEPSEEK_PRICES = {
  'deepseek-chat': { input: 0.14, output: 0.28 },      // V4 per 1M tokens
  'deepseek-reasoner': { input: 0.55, output: 2.19 }, // R1 per 1M tokens
};

// Средние значения токенов
const AVG_TOKENS = {
  input: 150,  // Средний ввод (контекст + промпт)
  output: 80,  // Средний вывод (комментарий)
};

export interface BudgetCalculation {
  totalBudget: number;          // Общий бюджет в USD
  spentBudget: number;          // Потрачено в USD
  remainingBudget: number;      // Остаток в USD
  totalRequests: number;        // Сколько запросов можно сделать
  requestsPerHour: number;      // Запросов в час
  requestsPerDay: number;       // Запросов в день
  delayBetweenRequests: number; // Задержка между запросами (сек)
  hoursRemaining: number;       // Часов до исчерпания
  daysRemaining: number;        // Дней до исчерпания
  isBudgetExhausted: boolean;   // Бюджет исчерпан
  recommendedModel: string;     // Рекомендуемая модель
}

export interface BudgetSettings {
  budgetUSD: number;
  durationHours: number;
  model: 'deepseek-chat' | 'deepseek-reasoner';
  avgInputTokens?: number;
  avgOutputTokens?: number;
}

/**
 * Рассчитывает бюджет и лимиты запросов
 */
export function calculateBudget(settings: BudgetSettings): BudgetCalculation {
  const { budgetUSD, durationHours, model, avgInputTokens, avgOutputTokens } = settings;
  
  const prices = DEEPSEEK_PRICES[model];
  const inputTokens = avgInputTokens || AVG_TOKENS.input;
  const outputTokens = avgOutputTokens || AVG_TOKENS.output;
  
  // Стоимость одного запроса
  const costPerRequest = 
    (inputTokens * prices.input / 1_000_000) + 
    (outputTokens * prices.output / 1_000_000);
  
  // Общее количество запросов
  const totalRequests = Math.floor(budgetUSD / costPerRequest);
  
  // Запросов в час и день
  const requestsPerHour = Math.max(1, Math.floor(totalRequests / durationHours));
  const requestsPerDay = requestsPerHour * 24;
  
  // Задержка между запросами (в секундах)
  const delayBetweenRequests = Math.max(1, Math.floor(3600 / requestsPerHour));
  
  // Время до исчерпания
  const hoursRemaining = durationHours;
  const daysRemaining = durationHours / 24;
  
  return {
    totalBudget: budgetUSD,
    spentBudget: 0,
    remainingBudget: budgetUSD,
    totalRequests,
    requestsPerHour,
    requestsPerDay,
    delayBetweenRequests,
    hoursRemaining,
    daysRemaining,
    isBudgetExhausted: budgetUSD <= 0,
    recommendedModel: model,
  };
}

/**
 * Форматирует бюджет для отображения
 */
export function formatBudgetCalculation(calc: BudgetCalculation): {
  totalBudget: string;
  remainingBudget: string;
  totalRequests: string;
  requestsPerHour: string;
  requestsPerDay: string;
  delayBetweenRequests: string;
} {
  return {
    totalBudget: `$${calc.totalBudget.toFixed(2)}`,
    remainingBudget: `$${calc.remainingBudget.toFixed(2)}`,
    totalRequests: calc.totalRequests.toLocaleString(),
    requestsPerHour: calc.requestsPerHour.toLocaleString(),
    requestsPerDay: calc.requestsPerDay.toLocaleString(),
    delayBetweenRequests: `${calc.delayBetweenRequests} сек`,
  };
}

/**
 * Класс для управления бюджетом в рантайме
 */
export class AIBudgetManager {
  private userId: string;
  private budgetSettings: BudgetSettings | null = null;
  private currentSpent: number = 0;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  /**
   * Инициализация - загрузка настроек из БД
   */
  async initialize(): Promise<void> {
    const settings = await db.budgetSettings.findFirst({
      where: { userId: this.userId },
    });
    
    if (settings) {
      this.budgetSettings = {
        budgetUSD: settings.deepseekBudget,
        durationHours: 24 * 30, // По умолчанию месяц
        model: 'deepseek-chat',
      };
      this.currentSpent = settings.deepseekSpent;
    }
  }
  
  /**
   * Проверка - можно ли сделать запрос
   */
  async canMakeRequest(estimatedCost: number = 0.0001): Promise<{
    allowed: boolean;
    reason?: string;
    remainingBudget: number;
    remainingRequests: number;
  }> {
    await this.initialize();
    
    if (!this.budgetSettings) {
      return {
        allowed: true, // Если настройки нет, разрешаем
        remainingBudget: 0,
        remainingRequests: 0,
      };
    }
    
    const remaining = this.budgetSettings.budgetUSD - this.currentSpent;
    
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: 'Бюджет DeepSeek исчерпан. Переключение на бесплатные API.',
        remainingBudget: 0,
        remainingRequests: 0,
      };
    }
    
    const calc = calculateBudget({
      ...this.budgetSettings,
      budgetUSD: remaining,
    });
    
    return {
      allowed: true,
      remainingBudget: remaining,
      remainingRequests: calc.totalRequests,
    };
  }
  
  /**
   * Записать расход
   */
  async recordExpense(cost: number, tokensIn: number, tokensOut: number): Promise<void> {
    this.currentSpent += cost;
    
    await db.budgetSettings.updateMany({
      where: { userId: this.userId },
      data: {
        deepseekSpent: { increment: cost },
        updatedAt: new Date(),
      },
    });
    
    // Логируем использование
    await db.aIQuotaLog.create({
      data: {
        id: nanoid(),
        provider: 'deepseek',
        requestsCount: 1,
        tokensIn,
        tokensOut,
        estimatedCost: cost,
      },
    });
  }
  
  /**
   * Получить текущий статус бюджета
   */
  async getBudgetStatus(): Promise<{
    total: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    isExhausted: boolean;
  }> {
    await this.initialize();
    
    if (!this.budgetSettings) {
      return {
        total: 0,
        spent: 0,
        remaining: 0,
        percentUsed: 0,
        isExhausted: false,
      };
    }
    
    const remaining = this.budgetSettings.budgetUSD - this.currentSpent;
    const percentUsed = (this.currentSpent / this.budgetSettings.budgetUSD) * 100;
    
    return {
      total: this.budgetSettings.budgetUSD,
      spent: this.currentSpent,
      remaining,
      percentUsed,
      isExhausted: remaining <= 0,
    };
  }
  
  /**
   * Обновить настройки бюджета
   */
  async updateBudget(budgetUSD: number, durationHours: number): Promise<void> {
    await db.budgetSettings.upsert({
      where: { userId: this.userId },
      create: {
        id: nanoid(),
        userId: this.userId,
        deepseekBudget: budgetUSD,
        deepseekSpent: 0,
        updatedAt: new Date(),
      },
      update: {
        deepseekBudget: budgetUSD,
        updatedAt: new Date(),
      },
    });
    
    this.budgetSettings = {
      budgetUSD,
      durationHours,
      model: 'deepseek-chat',
    };
    this.currentSpent = 0;
  }
}

// Экспорт singleton factory
export function getAIBudgetManager(userId: string): AIBudgetManager {
  return new AIBudgetManager(userId);
}
