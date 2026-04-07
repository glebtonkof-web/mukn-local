/**
 * Scheme Executor - Executes monetization schemes for SIM-registered accounts
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Types
export type SchemeStatus = 'pending' | 'active' | 'paused' | 'completed' | 'failed';
export type SchemeCategory = 'cpa' | 'affiliate' | 'farming' | 'direct' | 'arbitrage';

export interface SchemeExecution {
  id: string;
  schemeId: string;
  accountId: string;
  status: SchemeStatus;
  progress: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  config: ExecutionConfig;
  metrics: SchemeMetrics;
  errors: SchemeError[];
  logs: SchemeLog[];
}

export interface ExecutionConfig {
  workHoursStart: number;
  workHoursEnd: number;
  maxActionsPerHour: number;
  pauseOnError: boolean;
  pauseOnRisk: boolean;
  maxRiskScore: number;
}

export interface SchemeMetrics {
  actionsCompleted: number;
  actionsFailed: number;
  revenue: number;
  conversionRate: number;
  avgResponseTime: number;
}

export interface SchemeError {
  timestamp: Date;
  message: string;
  code: string;
  recoverable: boolean;
}

export interface SchemeLog {
  timestamp: Date;
  action: string;
  result: string;
  details?: string;
}

export interface SchemePerformance {
  schemeId: string;
  totalExecutions: number;
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  totalRevenue: number;
  avgRevenue: number;
  avgConversionRate: number;
  avgDuration: number;
}

// In-memory store for active executions
const activeExecutions = new Map<string, SchemeExecution>();
const executionIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Start scheme execution for an account
 */
export async function startScheme(
  schemeId: string,
  accountId: string,
  config?: Partial<ExecutionConfig>
): Promise<SchemeExecution> {
  const id = `exec_${schemeId}_${accountId}_${Date.now()}`;
  
  const execution: SchemeExecution = {
    id,
    schemeId,
    accountId,
    status: 'active',
    progress: 0,
    startedAt: new Date(),
    updatedAt: new Date(),
    config: {
      workHoursStart: 9,
      workHoursEnd: 21,
      maxActionsPerHour: 10,
      pauseOnError: true,
      pauseOnRisk: true,
      maxRiskScore: 70,
      ...config
    },
    metrics: {
      actionsCompleted: 0,
      actionsFailed: 0,
      revenue: 0,
      conversionRate: 0,
      avgResponseTime: 0
    },
    errors: [],
    logs: []
  };
  
  activeExecutions.set(id, execution);
  
  // Start execution loop
  const interval = setInterval(async () => {
    await runExecutionTick(id);
  }, 60000); // Every minute
  
  executionIntervals.set(id, interval);
  
  logger.info('Scheme execution started', { schemeId, accountId, executionId: id });
  
  return execution;
}

/**
 * Stop scheme execution
 */
export async function stopScheme(executionId: string): Promise<void> {
  const interval = executionIntervals.get(executionId);
  if (interval) {
    clearInterval(interval);
    executionIntervals.delete(executionId);
  }
  
  const execution = activeExecutions.get(executionId);
  if (execution) {
    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.updatedAt = new Date();
  }
  
  logger.info('Scheme execution stopped', { executionId });
}

/**
 * Pause scheme execution
 */
export async function pauseScheme(executionId: string): Promise<void> {
  const execution = activeExecutions.get(executionId);
  if (execution) {
    execution.status = 'paused';
    execution.updatedAt = new Date();
  }
}

/**
 * Resume scheme execution
 */
export async function resumeScheme(executionId: string): Promise<void> {
  const execution = activeExecutions.get(executionId);
  if (execution && execution.status === 'paused') {
    execution.status = 'active';
    execution.updatedAt = new Date();
  }
}

/**
 * Rotate accounts between schemes
 */
export async function rotateAccounts(schemeId: string): Promise<number> {
  // Get all executions for this scheme
  const executions = Array.from(activeExecutions.values())
    .filter(e => e.schemeId === schemeId && e.status === 'active');
  
  // Rotate logic - move low-performing accounts to other schemes
  let rotated = 0;
  
  for (const execution of executions) {
    if (execution.metrics.conversionRate < 0.01 && execution.metrics.actionsCompleted > 50) {
      await pauseScheme(execution.id);
      rotated++;
    }
  }
  
  return rotated;
}

/**
 * Get scheme performance metrics
 */
export async function getSchemePerformance(schemeId: string): Promise<SchemePerformance> {
  const executions = Array.from(activeExecutions.values())
    .filter(e => e.schemeId === schemeId);
  
  const completed = executions.filter(e => e.status === 'completed');
  const failed = executions.filter(e => e.status === 'failed');
  const active = executions.filter(e => e.status === 'active');
  
  const totalRevenue = executions.reduce((sum, e) => sum + e.metrics.revenue, 0);
  
  return {
    schemeId,
    totalExecutions: executions.length,
    activeExecutions: active.length,
    completedExecutions: completed.length,
    failedExecutions: failed.length,
    totalRevenue,
    avgRevenue: executions.length > 0 ? totalRevenue / executions.length : 0,
    avgConversionRate: executions.length > 0 
      ? executions.reduce((sum, e) => sum + e.metrics.conversionRate, 0) / executions.length 
      : 0,
    avgDuration: 0
  };
}

/**
 * Record action result
 */
export async function recordAction(
  executionId: string,
  action: string,
  result: 'success' | 'failure',
  revenue?: number
): Promise<void> {
  const execution = activeExecutions.get(executionId);
  if (!execution) return;
  
  execution.logs.push({
    timestamp: new Date(),
    action,
    result,
    details: revenue ? `Revenue: ${revenue}` : undefined
  });
  
  if (result === 'success') {
    execution.metrics.actionsCompleted++;
    if (revenue) {
      execution.metrics.revenue += revenue;
    }
  } else {
    execution.metrics.actionsFailed++;
  }
  
  execution.metrics.conversionRate = 
    execution.metrics.actionsCompleted / 
    (execution.metrics.actionsCompleted + execution.metrics.actionsFailed);
  
  execution.updatedAt = new Date();
}

/**
 * Get active executions
 */
export function getActiveExecutions(): SchemeExecution[] {
  return Array.from(activeExecutions.values()).filter(e => e.status === 'active');
}

/**
 * Get execution by ID
 */
export function getExecution(executionId: string): SchemeExecution | undefined {
  return activeExecutions.get(executionId);
}

/**
 * Estimate revenue for a scheme
 */
export async function estimateRevenue(schemeId: string): Promise<number> {
  const performance = await getSchemePerformance(schemeId);
  const activeCount = performance.activeExecutions;
  
  // Estimate based on average performance
  return activeCount * performance.avgRevenue * 30; // Monthly estimate
}

/**
 * Get execution summary
 */
export function getExecutionSummary(executionId: string): string {
  const execution = activeExecutions.get(executionId);
  if (!execution) return 'Execution not found';
  
  return `
Scheme: ${execution.schemeId}
Account: ${execution.accountId}
Status: ${execution.status}
Progress: ${execution.progress}%
Actions: ${execution.metrics.actionsCompleted} completed, ${execution.metrics.actionsFailed} failed
Revenue: $${execution.metrics.revenue.toFixed(2)}
Conversion: ${(execution.metrics.conversionRate * 100).toFixed(1)}%
Errors: ${execution.errors.length}
  `.trim();
}

/**
 * Check if within work hours
 */
export function isWithinWorkHours(config: ExecutionConfig): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= config.workHoursStart && hour < config.workHoursEnd;
}

/**
 * Get delay for next action
 */
export function getActionDelay(config: ExecutionConfig): number {
  const baseDelay = 3600000 / config.maxActionsPerHour; // ms per action
  const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
  return baseDelay + jitter;
}

// Internal execution tick
async function runExecutionTick(executionId: string): Promise<void> {
  const execution = activeExecutions.get(executionId);
  if (!execution || execution.status !== 'active') return;
  
  if (!isWithinWorkHours(execution.config)) {
    return; // Skip if outside work hours
  }
  
  // Execute scheme action
  try {
    // This would integrate with the actual scheme execution logic
    execution.progress = Math.min(100, execution.progress + 1);
    execution.updatedAt = new Date();
  } catch (error) {
    execution.errors.push({
      timestamp: new Date(),
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXECUTION_ERROR',
      recoverable: true
    });
    
    if (execution.config.pauseOnError) {
      execution.status = 'paused';
    }
  }
}

export default {
  startScheme,
  stopScheme,
  pauseScheme,
  resumeScheme,
  rotateAccounts,
  getSchemePerformance,
  recordAction,
  getActiveExecutions,
  getExecution,
  estimateRevenue,
  getExecutionSummary,
  isWithinWorkHours,
  getActionDelay
};
