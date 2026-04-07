/**
 * МУКН SIM Auto-Registration - Profit Executor
 * Core functions for profit tracking and scheme management
 */

import { db } from '@/lib/db';

// Types
export interface Scheme {
  id: string;
  name: string;
  platform: string;
  category: string;
  expectedRevenue: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'active' | 'paused' | 'completed';
  accounts: string[];
  score: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  totalRevenue: number;
  conversionRate: number;
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueEntry {
  id: string;
  schemeId: string;
  platform: string;
  amount: number;
  currency: string;
  source: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface DailyRevenue {
  date: string;
  total: number;
  byScheme: Record<string, number>;
  byPlatform: Record<string, number>;
}

export interface WeeklyRevenue {
  weekStart: string;
  weekEnd: string;
  total: number;
  daily: DailyRevenue[];
  topSchemes: { schemeId: string; revenue: number }[];
  topPlatforms: { platform: string; revenue: number }[];
}

export interface PerformanceMetrics {
  totalAccounts: number;
  activeSchemes: number;
  dailyRevenue: number;
  weeklyRevenue: number;
  averageConversionRate: number;
  riskDistribution: { low: number; medium: number; high: number };
  topPerformingSchemes: Scheme[];
  underperformingSchemes: Scheme[];
}

// In-memory storage for runtime data
const schemeStore = new Map<string, Scheme>();
const revenueStore = new Map<string, RevenueEntry>();
let profitExecutionActive = false;
let executionInterval: NodeJS.Timeout | null = null;

/**
 * Start all selected schemes for profit execution
 */
export async function startProfitExecution(): Promise<{
  success: boolean;
  activeSchemes: number;
  message: string;
}> {
  try {
    // Get all active schemes
    const activeSchemes = Array.from(schemeStore.values()).filter(
      s => s.status === 'active'
    );

    if (activeSchemes.length === 0) {
      return {
        success: false,
        activeSchemes: 0,
        message: 'Нет активных схем для запуска',
      };
    }

    profitExecutionActive = true;

    // Start monitoring interval (every minute)
    if (executionInterval) {
      clearInterval(executionInterval);
    }

    executionInterval = setInterval(async () => {
      await monitorPerformance();
    }, 60000);

    return {
      success: true,
      activeSchemes: activeSchemes.length,
      message: `Запущено ${activeSchemes.length} схем`,
    };
  } catch (error) {
    console.error('Error starting profit execution:', error);
    return {
      success: false,
      activeSchemes: 0,
      message: 'Ошибка запуска схем',
    };
  }
}

/**
 * Stop all profit execution
 */
export async function stopProfitExecution(): Promise<void> {
  profitExecutionActive = false;
  if (executionInterval) {
    clearInterval(executionInterval);
    executionInterval = null;
  }
}

/**
 * Track revenue for a specific scheme
 */
export async function trackRevenue(
  schemeId: string,
  amount: number,
  source?: string,
  platform?: string
): Promise<RevenueEntry> {
  const scheme = schemeStore.get(schemeId);
  if (!scheme) {
    throw new Error(`Scheme ${schemeId} not found`);
  }

  const entry: RevenueEntry = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    schemeId,
    platform: platform || scheme.platform,
    amount,
    currency: 'RUB',
    source: source || 'auto',
    timestamp: new Date(),
  };

  revenueStore.set(entry.id, entry);

  // Update scheme revenue
  scheme.totalRevenue += amount;
  scheme.dailyRevenue += amount;
  scheme.weeklyRevenue += amount;
  scheme.updatedAt = new Date();
  schemeStore.set(schemeId, scheme);

  return entry;
}

/**
 * Get today's revenue
 */
export async function getDailyRevenue(): Promise<DailyRevenue> {
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = Array.from(revenueStore.values()).filter(
    entry => entry.timestamp.toISOString().split('T')[0] === today
  );

  const total = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const byScheme: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const entry of todayEntries) {
    byScheme[entry.schemeId] = (byScheme[entry.schemeId] || 0) + entry.amount;
    byPlatform[entry.platform] = (byPlatform[entry.platform] || 0) + entry.amount;
  }

  return {
    date: today,
    total,
    byScheme,
    byPlatform,
  };
}

/**
 * Get weekly revenue
 */
export async function getWeeklyRevenue(): Promise<WeeklyRevenue> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekEntries = Array.from(revenueStore.values()).filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });

  const total = weekEntries.reduce((sum, entry) => sum + entry.amount, 0);

  // Group by day
  const daily: DailyRevenue[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStr = day.toISOString().split('T')[0];
    const dayEntries = weekEntries.filter(
      e => e.timestamp.toISOString().split('T')[0] === dayStr
    );

    const dayTotal = dayEntries.reduce((sum, e) => sum + e.amount, 0);
    const byScheme: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};

    for (const entry of dayEntries) {
      byScheme[entry.schemeId] = (byScheme[entry.schemeId] || 0) + entry.amount;
      byPlatform[entry.platform] = (byPlatform[entry.platform] || 0) + entry.amount;
    }

    daily.push({
      date: dayStr,
      total: dayTotal,
      byScheme,
      byPlatform,
    });
  }

  // Top schemes
  const schemeRevenue: Record<string, number> = {};
  for (const entry of weekEntries) {
    schemeRevenue[entry.schemeId] = (schemeRevenue[entry.schemeId] || 0) + entry.amount;
  }
  const topSchemes = Object.entries(schemeRevenue)
    .map(([schemeId, revenue]) => ({ schemeId, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Top platforms
  const platformRevenue: Record<string, number> = {};
  for (const entry of weekEntries) {
    platformRevenue[entry.platform] = (platformRevenue[entry.platform] || 0) + entry.amount;
  }
  const topPlatforms = Object.entries(platformRevenue)
    .map(([platform, revenue]) => ({ platform, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    total,
    daily,
    topSchemes,
    topPlatforms,
  };
}

/**
 * Rotate accounts between schemes for optimal performance
 */
export async function rotateAccounts(): Promise<{
  success: boolean;
  rotatedAccounts: number;
  message: string;
}> {
  try {
    const schemes = Array.from(schemeStore.values()).filter(s => s.status === 'active');
    
    if (schemes.length < 2) {
      return {
        success: false,
        rotatedAccounts: 0,
        message: 'Недостаточно активных схем для ротации',
      };
    }

    // Sort schemes by performance (revenue per account)
    const sortedSchemes = schemes.sort((a, b) => {
      const aPerf = a.totalRevenue / Math.max(a.accounts.length, 1);
      const bPerf = b.totalRevenue / Math.max(b.accounts.length, 1);
      return bPerf - aPerf;
    });

    let rotatedAccounts = 0;

    // Move accounts from underperforming to top performing schemes
    const topSchemes = sortedSchemes.slice(0, Math.ceil(sortedSchemes.length * 0.3));
    const bottomSchemes = sortedSchemes.slice(-Math.ceil(sortedSchemes.length * 0.3));

    for (const bottomScheme of bottomSchemes) {
      if (bottomScheme.accounts.length > 1) {
        const accountToMove = bottomScheme.accounts.pop()!;
        const targetScheme = topSchemes[Math.floor(Math.random() * topSchemes.length)];
        targetScheme.accounts.push(accountToMove);
        rotatedAccounts++;
      }
    }

    // Update store
    for (const scheme of [...topSchemes, ...bottomSchemes]) {
      scheme.updatedAt = new Date();
      schemeStore.set(scheme.id, scheme);
    }

    return {
      success: true,
      rotatedAccounts,
      message: `Ротировано ${rotatedAccounts} аккаунтов`,
    };
  } catch (error) {
    console.error('Error rotating accounts:', error);
    return {
      success: false,
      rotatedAccounts: 0,
      message: 'Ошибка ротации аккаунтов',
    };
  }
}

/**
 * Monitor performance and optimize
 */
export async function monitorPerformance(): Promise<PerformanceMetrics> {
  const schemes = Array.from(schemeStore.values());
  const activeSchemes = schemes.filter(s => s.status === 'active');

  // Calculate metrics
  const totalAccounts = schemes.reduce((sum, s) => sum + s.accounts.length, 0);
  const dailyRevenue = (await getDailyRevenue()).total;
  const weeklyRevenue = (await getWeeklyRevenue()).total;
  
  const avgConversion = activeSchemes.reduce((sum, s) => sum + s.conversionRate, 0) /
    Math.max(activeSchemes.length, 1);

  // Risk distribution
  const riskDistribution = {
    low: schemes.filter(s => s.riskLevel === 'low').length,
    medium: schemes.filter(s => s.riskLevel === 'medium').length,
    high: schemes.filter(s => s.riskLevel === 'high').length,
  };

  // Top/underperforming schemes
  const sortedByRevenue = [...schemes].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const topPerforming = sortedByRevenue.slice(0, 5);
  const underperforming = sortedByRevenue.filter(
    s => s.status === 'active' && s.totalRevenue < avgConversion * 0.5
  );

  // Auto-optimize: pause underperforming schemes
  for (const scheme of underperforming) {
    if (scheme.totalRevenue === 0 && scheme.appliedAt) {
      const daysSinceApplied = Math.floor(
        (Date.now() - scheme.appliedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceApplied >= 3) {
        scheme.status = 'paused';
        scheme.updatedAt = new Date();
        schemeStore.set(scheme.id, scheme);
      }
    }
  }

  return {
    totalAccounts,
    activeSchemes: activeSchemes.length,
    dailyRevenue,
    weeklyRevenue,
    averageConversionRate: avgConversion,
    riskDistribution,
    topPerformingSchemes: topPerforming,
    underperformingSchemes: underperforming,
  };
}

/**
 * Get all schemes
 */
export async function getSchemes(): Promise<Scheme[]> {
  return Array.from(schemeStore.values());
}

/**
 * Get scheme by ID
 */
export async function getSchemeById(id: string): Promise<Scheme | undefined> {
  return schemeStore.get(id);
}

/**
 * Apply a scheme (activate it)
 */
export async function applyScheme(schemeId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const scheme = schemeStore.get(schemeId);
  if (!scheme) {
    return { success: false, message: 'Схема не найдена' };
  }

  scheme.status = 'active';
  scheme.appliedAt = new Date();
  scheme.updatedAt = new Date();
  schemeStore.set(schemeId, scheme);

  return { success: true, message: 'Схема активирована' };
}

/**
 * Pause a scheme
 */
export async function pauseScheme(schemeId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const scheme = schemeStore.get(schemeId);
  if (!scheme) {
    return { success: false, message: 'Схема не найдена' };
  }

  scheme.status = 'paused';
  scheme.updatedAt = new Date();
  schemeStore.set(schemeId, scheme);

  return { success: true, message: 'Схема приостановлена' };
}

/**
 * Add a new scheme
 */
export async function addScheme(scheme: Omit<Scheme, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scheme> {
  const newScheme: Scheme = {
    ...scheme,
    id: `scheme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  schemeStore.set(newScheme.id, newScheme);
  return newScheme;
}

/**
 * Initialize mock data for testing
 */
export function initializeMockData(): void {
  const mockSchemes: Omit<Scheme, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Instagram Crypto Comments',
      platform: 'Instagram',
      category: 'crypto',
      expectedRevenue: 5000,
      riskLevel: 'medium',
      status: 'pending',
      accounts: ['acc-1', 'acc-2', 'acc-3'],
      score: 85,
      dailyRevenue: 0,
      weeklyRevenue: 0,
      totalRevenue: 0,
      conversionRate: 3.2,
    },
    {
      name: 'TikTok Casino Traffic',
      platform: 'TikTok',
      category: 'casino',
      expectedRevenue: 8000,
      riskLevel: 'high',
      status: 'pending',
      accounts: ['acc-4', 'acc-5'],
      score: 92,
      dailyRevenue: 0,
      weeklyRevenue: 0,
      totalRevenue: 0,
      conversionRate: 4.5,
    },
    {
      name: 'Telegram Channel Growth',
      platform: 'Telegram',
      category: 'content',
      expectedRevenue: 3000,
      riskLevel: 'low',
      status: 'pending',
      accounts: ['acc-6'],
      score: 78,
      dailyRevenue: 0,
      weeklyRevenue: 0,
      totalRevenue: 0,
      conversionRate: 2.8,
    },
    {
      name: 'YouTube Shorts Nutra',
      platform: 'YouTube',
      category: 'nutra',
      expectedRevenue: 6500,
      riskLevel: 'medium',
      status: 'pending',
      accounts: ['acc-7', 'acc-8', 'acc-9', 'acc-10'],
      score: 88,
      dailyRevenue: 0,
      weeklyRevenue: 0,
      totalRevenue: 0,
      conversionRate: 3.8,
    },
    {
      name: 'X (Twitter) Crypto Signals',
      platform: 'X',
      category: 'crypto',
      expectedRevenue: 4500,
      riskLevel: 'medium',
      status: 'pending',
      accounts: ['acc-11', 'acc-12'],
      score: 82,
      dailyRevenue: 0,
      weeklyRevenue: 0,
      totalRevenue: 0,
      conversionRate: 3.1,
    },
  ];

  for (const scheme of mockSchemes) {
    addScheme(scheme);
  }
}

// Initialize mock data on module load
initializeMockData();

export const profitExecutor = {
  startProfitExecution,
  stopProfitExecution,
  trackRevenue,
  getDailyRevenue,
  getWeeklyRevenue,
  rotateAccounts,
  monitorPerformance,
  getSchemes,
  getSchemeById,
  applyScheme,
  pauseScheme,
  addScheme,
};

export default profitExecutor;
