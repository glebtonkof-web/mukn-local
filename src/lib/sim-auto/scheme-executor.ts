// Scheme Executor - Execute and manage monetization schemes
// Handles scheme lifecycle: start, stop, performance tracking, account rotation

import { db } from '@/lib/db';
import { MONETIZATION_SCHEMES, type MonetizationSchemeDefinition, type Platform } from './schemes-library';
import { calculateRequirements, getSchemeDetails, type RankedScheme, type SimCardAccountInfo } from './scheme-ranker';

export type SchemeStatus = 'idle' | 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';

export interface SchemeExecution {
  id: string;
  schemeId: string;
  status: SchemeStatus;
  accountIds: string[];
  startedAt: Date | null;
  stoppedAt: Date | null;
  lastActivityAt: Date | null;
  metrics: SchemeMetrics;
  config: ExecutionConfig;
  errors: SchemeError[];
  logs: SchemeLog[];
}

export interface SchemeMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  revenue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  avgRevenuePerAction: number;
  successRate: number;
  estimatedDailyRevenue: number;
  lastCalculatedAt: Date;
}

export interface ExecutionConfig {
  maxActionsPerHour: number;
  maxActionsPerDay: number;
  actionDelayMin: number; // seconds
  actionDelayMax: number; // seconds
  workHoursStart: number; // 0-23
  workHoursEnd: number; // 0-23
  pauseOnHighRisk: boolean;
  autoRotateAccounts: boolean;
  rotationIntervalHours: number;
  targetRevenue: number;
  stopOnTarget: boolean;
}

export interface SchemeError {
  timestamp: Date;
  accountId: string;
  error: string;
  action: string;
  retryable: boolean;
}

export interface SchemeLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, unknown>;
}

export interface SchemePerformance {
  schemeId: string;
  executionId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: SchemeMetrics;
  trends: {
    revenue: number; // percentage change
    conversions: number;
    successRate: number;
  };
}

// Default execution configuration
const DEFAULT_CONFIG: ExecutionConfig = {
  maxActionsPerHour: 30,
  maxActionsPerDay: 200,
  actionDelayMin: 60,
  actionDelayMax: 300,
  workHoursStart: 9,
  workHoursEnd: 21,
  pauseOnHighRisk: true,
  autoRotateAccounts: true,
  rotationIntervalHours: 24,
  targetRevenue: 0,
  stopOnTarget: false
};

// In-memory storage for active executions
const activeExecutions = new Map<string, SchemeExecution>();

/**
 * Initialize a new scheme execution
 */
export async function initSchemeExecution(
  schemeId: string,
  accountIds: string[],
  customConfig?: Partial<ExecutionConfig>
): Promise<SchemeExecution> {
  const scheme = MONETIZATION_SCHEMES.find(s => s.id === schemeId);
  if (!scheme) {
    throw new Error(`Scheme ${schemeId} not found`);
  }

  // Validate accounts
  const accounts = await db.simCardAccount.findMany({
    where: { id: { in: accountIds } }
  });

  if (accounts.length < scheme.minAccounts) {
    throw new Error(`Scheme requires at least ${scheme.minAccounts} accounts, got ${accounts.length}`);
  }

  // Check if accounts are properly warmed
  const insufficientlyWarmed = accounts.filter(a => 
    a.warmingProgress < scheme.minWarmingDays * 5
  );
  
  if (insufficientlyWarmed.length > 0) {
    console.warn(`Warning: ${insufficientlyWarmed.length} accounts may not be sufficiently warmed`);
  }

  const config = { ...DEFAULT_CONFIG, ...customConfig };
  
  const execution: SchemeExecution = {
    id: `exec-${schemeId}-${Date.now()}`,
    schemeId,
    status: 'idle',
    accountIds,
    startedAt: null,
    stoppedAt: null,
    lastActivityAt: null,
    metrics: {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      revenue: 0,
      conversions: 0,
      clicks: 0,
      impressions: 0,
      avgRevenuePerAction: 0,
      successRate: 0,
      estimatedDailyRevenue: 0,
      lastCalculatedAt: new Date()
    },
    config,
    errors: [],
    logs: []
  };

  // Log initialization
  execution.logs.push({
    timestamp: new Date(),
    level: 'info',
    message: `Scheme ${scheme.name} initialized with ${accountIds.length} accounts`,
    details: { schemeId, accountCount: accountIds.length }
  });

  return execution;
}

/**
 * Start a scheme execution
 */
export async function startScheme(
  schemeId: string,
  accountIds: string[],
  config?: Partial<ExecutionConfig>
): Promise<SchemeExecution> {
  // Check if already running
  const existing = activeExecutions.get(schemeId);
  if (existing && existing.status === 'running') {
    throw new Error(`Scheme ${schemeId} is already running`);
  }

  const execution = await initSchemeExecution(schemeId, accountIds, config);
  execution.status = 'starting';
  execution.startedAt = new Date();

  // Save to database
  await db.monetizationScheme.update({
    where: { id: schemeId },
    data: {
      usageCount: { increment: 1 },
      updatedAt: new Date()
    }
  });

  execution.status = 'running';
  execution.logs.push({
    timestamp: new Date(),
    level: 'success',
    message: `Scheme execution started`
  });

  // Store in memory
  activeExecutions.set(schemeId, execution);

  return execution;
}

/**
 * Stop a scheme execution
 */
export async function stopScheme(schemeId: string): Promise<SchemeExecution | null> {
  const execution = activeExecutions.get(schemeId);
  if (!execution) {
    return null;
  }

  execution.status = 'stopping';
  execution.logs.push({
    timestamp: new Date(),
    level: 'info',
    message: `Stopping scheme execution`
  });

  // Finalize metrics
  execution.stoppedAt = new Date();
  execution.status = 'stopped';

  execution.logs.push({
    timestamp: new Date(),
    level: 'success',
    message: `Scheme execution stopped. Total actions: ${execution.metrics.totalActions}, Revenue: $${execution.metrics.revenue.toFixed(2)}`
  });

  // Remove from active executions
  activeExecutions.delete(schemeId);

  return execution;
}

/**
 * Pause a scheme execution
 */
export async function pauseScheme(schemeId: string): Promise<SchemeExecution | null> {
  const execution = activeExecutions.get(schemeId);
  if (!execution || execution.status !== 'running') {
    return null;
  }

  execution.status = 'paused';
  execution.logs.push({
    timestamp: new Date(),
    level: 'info',
    message: `Scheme execution paused`
  });

  return execution;
}

/**
 * Resume a paused scheme
 */
export async function resumeScheme(schemeId: string): Promise<SchemeExecution | null> {
  const execution = activeExecutions.get(schemeId);
  if (!execution || execution.status !== 'paused') {
    return null;
  }

  execution.status = 'running';
  execution.logs.push({
    timestamp: new Date(),
    level: 'info',
    message: `Scheme execution resumed`
  });

  return execution;
}

/**
 * Get scheme performance metrics
 */
export async function getSchemePerformance(schemeId: string): Promise<SchemePerformance | null> {
  const execution = activeExecutions.get(schemeId);
  if (!execution) {
    // Try to get from database history
    const scheme = await db.monetizationScheme.findUnique({
      where: { id: schemeId }
    });

    if (!scheme) return null;

    // Calculate from profit logs
    const profitLogs = await db.simCardProfitLog.findMany({
      where: { schemeId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const revenue = profitLogs.reduce((sum, log) => sum + log.amount, 0);
    const conversions = profitLogs.length;

    return {
      schemeId,
      executionId: 'historical',
      period: 'month',
      metrics: {
        totalActions: conversions,
        successfulActions: conversions,
        failedActions: 0,
        revenue,
        conversions,
        clicks: conversions * 10, // Estimate
        impressions: conversions * 100, // Estimate
        avgRevenuePerAction: conversions > 0 ? revenue / conversions : 0,
        successRate: 1,
        estimatedDailyRevenue: revenue / 30,
        lastCalculatedAt: new Date()
      },
      trends: {
        revenue: 0,
        conversions: 0,
        successRate: 0
      }
    };
  }

  // Calculate trends (simplified)
  const trends = {
    revenue: 0,
    conversions: 0,
    successRate: 0
  };

  return {
    schemeId,
    executionId: execution.id,
    period: 'day',
    metrics: execution.metrics,
    trends
  };
}

/**
 * Rotate accounts for a scheme
 */
export async function rotateAccounts(
  schemeId: string,
  newAccountIds?: string[]
): Promise<SchemeExecution | null> {
  const execution = activeExecutions.get(schemeId);
  if (!execution) {
    return null;
  }

  const scheme = MONETIZATION_SCHEMES.find(s => s.id === schemeId);
  if (!scheme) return null;

  let accountsToUse: string[];

  if (newAccountIds && newAccountIds.length >= scheme.minAccounts) {
    accountsToUse = newAccountIds;
  } else {
    // Auto-select new accounts
    const availableAccounts = await db.simCardAccount.findMany({
      where: {
        platform: { in: scheme.platforms.map(p => p.toLowerCase()) },
        status: 'active',
        warmingProgress: { gte: scheme.minWarmingDays * 5 },
        id: { notIn: execution.accountIds }
      },
      take: scheme.minAccounts
    });

    if (availableAccounts.length < scheme.minAccounts) {
      execution.logs.push({
        timestamp: new Date(),
        level: 'warn',
        message: `Not enough accounts available for rotation. Need ${scheme.minAccounts}, found ${availableAccounts.length}`
      });
      return execution;
    }

    accountsToUse = availableAccounts.map(a => a.id);
  }

  const oldAccountIds = [...execution.accountIds];
  execution.accountIds = accountsToUse;

  execution.logs.push({
    timestamp: new Date(),
    level: 'info',
    message: `Rotated accounts. Old: ${oldAccountIds.length}, New: ${accountsToUse.length}`,
    details: { oldAccountIds, newAccountIds: accountsToUse }
  });

  return execution;
}

/**
 * Record an action result
 */
export async function recordAction(
  schemeId: string,
  accountId: string,
  action: string,
  success: boolean,
  revenue: number = 0,
  details?: Record<string, unknown>
): Promise<void> {
  const execution = activeExecutions.get(schemeId);
  if (!execution) return;

  execution.metrics.totalActions++;
  execution.lastActivityAt = new Date();

  if (success) {
    execution.metrics.successfulActions++;
    execution.metrics.revenue += revenue;
    
    if (revenue > 0) {
      execution.metrics.conversions++;
    }

    execution.logs.push({
      timestamp: new Date(),
      level: revenue > 0 ? 'success' : 'info',
      message: `Action completed: ${action}`,
      details: { accountId, revenue, ...details }
    });
  } else {
    execution.metrics.failedActions++;
    
    execution.errors.push({
      timestamp: new Date(),
      accountId,
      error: 'Action failed',
      action,
      retryable: true
    });

    execution.logs.push({
      timestamp: new Date(),
      level: 'error',
      message: `Action failed: ${action}`,
      details: { accountId, ...details }
    });
  }

  // Update calculated metrics
  execution.metrics.successRate = 
    execution.metrics.totalActions > 0 
      ? execution.metrics.successfulActions / execution.metrics.totalActions 
      : 0;

  execution.metrics.avgRevenuePerAction = 
    execution.metrics.totalActions > 0 
      ? execution.metrics.revenue / execution.metrics.totalActions 
      : 0;

  // Save profit log if revenue
  if (revenue > 0) {
    await db.simCardProfitLog.create({
      data: {
        id: `profit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        accountId,
        schemeId,
        revenueType: schemeId.includes('cpa') ? 'cpa' : 'referral',
        amount: revenue,
        currency: 'USD',
        description: action,
        metadata: JSON.stringify(details || {})
      }
    });
  }
}

/**
 * Check if within working hours
 */
export function isWithinWorkHours(config: ExecutionConfig): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= config.workHoursStart && hour < config.workHoursEnd;
}

/**
 * Get random delay for actions
 */
export function getActionDelay(config: ExecutionConfig): number {
  const { actionDelayMin, actionDelayMax } = config;
  return Math.floor(Math.random() * (actionDelayMax - actionDelayMin + 1)) + actionDelayMin;
}

/**
 * Get all active executions
 */
export function getActiveExecutions(): SchemeExecution[] {
  return Array.from(activeExecutions.values());
}

/**
 * Get execution by scheme ID
 */
export function getExecution(schemeId: string): SchemeExecution | undefined {
  return activeExecutions.get(schemeId);
}

/**
 * Calculate estimated revenue for time period
 */
export function estimateRevenue(
  scheme: MonetizationSchemeDefinition,
  accountsCount: number,
  days: number = 30
): { min: number; max: number } {
  const match = scheme.expectedRevenue.match(/\$(\d+)-(\d+)/);
  if (!match) return { min: 0, max: 0 };

  const monthlyMin = parseInt(match[1]);
  const monthlyMax = parseInt(match[2]);

  // Adjust for number of accounts
  const accountMultiplier = Math.min(accountsCount / scheme.minAccounts, 3);
  
  // Adjust for time period
  const dayMultiplier = days / 30;

  return {
    min: Math.round(monthlyMin * accountMultiplier * dayMultiplier),
    max: Math.round(monthlyMax * accountMultiplier * dayMultiplier)
  };
}

/**
 * Get scheme execution summary
 */
export async function getExecutionSummary(): Promise<{
  activeSchemes: number;
  totalRevenue: number;
  totalActions: number;
  avgSuccessRate: number;
  schemesByCategory: Record<string, number>;
}> {
  const executions = getActiveExecutions();
  
  let totalRevenue = 0;
  let totalActions = 0;
  let successSum = 0;
  const schemesByCategory: Record<string, number> = {};

  for (const exec of executions) {
    totalRevenue += exec.metrics.revenue;
    totalActions += exec.metrics.totalActions;
    successSum += exec.metrics.successRate;

    const scheme = MONETIZATION_SCHEMES.find(s => s.id === exec.schemeId);
    if (scheme) {
      schemesByCategory[scheme.category] = (schemesByCategory[scheme.category] || 0) + 1;
    }
  }

  return {
    activeSchemes: executions.length,
    totalRevenue,
    totalActions,
    avgSuccessRate: executions.length > 0 ? successSum / executions.length : 0,
    schemesByCategory
  };
}

const schemeExecutor = {
  startScheme,
  stopScheme,
  pauseScheme,
  resumeScheme,
  getSchemePerformance,
  rotateAccounts,
  recordAction,
  getActiveExecutions,
  getExecution,
  estimateRevenue,
  getExecutionSummary,
  isWithinWorkHours,
  getActionDelay
};

export default schemeExecutor;
