/**
 * Warming Manager - Core functions for automatic account warming
 * Manages warming lifecycle, status tracking, and action coordination
 */

import { db } from '@/lib/db';
import {
  getWarmingStrategy,
  getCurrentPhase,
  calculateProgress,
  isTrafficReady,
  generateDailyActionPlan,
  type PlatformWarmingStrategy,
  type WarmingPhase,
} from './warming-strategies';
import {
  executeWarmingAction,
  executeActionBatch,
  checkSuspiciousActivity,
  type WarmingAction,
  type ActionResult,
  type ActionContext,
} from './action-executor';
import {
  randomDelay,
  generateRandomSchedule,
  isActiveTime,
  getNextActiveTime,
  generateSessionGap,
} from './behavior-simulator';

// Types
export interface WarmingStatus {
  accountId: string;
  platform: string;
  status: 'idle' | 'warming' | 'paused' | 'completed' | 'error' | 'banned';
  currentDay: number;
  progress: number;
  phase: WarmingPhase | null;
  isTrafficReady: boolean;
  riskScore: number;
  actionsToday: number;
  lastActionAt: Date | null;
  nextActionAt: Date | null;
  error?: string;
}

export interface WarmingConfig {
  accountId: string;
  platform: string;
  autoStart: boolean;
  pauseOnError: boolean;
  pauseOnSuspicious: boolean;
  maxRiskScore: number;
  customActions?: WarmingAction[];
  schedule?: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
}

// In-memory state for active warming sessions
const activeWarmingSessions = new Map<
  string,
  {
    config: WarmingConfig;
    status: WarmingStatus;
    intervalId: NodeJS.Timeout | null;
    startedAt: Date;
  }
>();

/**
 * Start warming process for an account
 */
export async function startWarming(
  accountId: string,
  config?: Partial<WarmingConfig>
): Promise<WarmingStatus> {
  // Check if already warming
  if (activeWarmingSessions.has(accountId)) {
    throw new Error(`Account ${accountId} is already warming`);
  }

  // Get account from database
  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Get platform strategy
  const strategy = getWarmingStrategy(account.platform);
  if (!strategy) {
    throw new Error(`No warming strategy for platform ${account.platform}`);
  }

  // Build config
  const warmingConfig: WarmingConfig = {
    accountId,
    platform: account.platform,
    autoStart: true,
    pauseOnError: true,
    pauseOnSuspicious: true,
    maxRiskScore: strategy.riskThresholds.criticalRisk,
    ...config,
  };

  // Calculate initial status
  const currentDay = calculateWarmingDay(account.warmingStartedAt);
  const progress = calculateProgress(account.platform, currentDay);
  const phase = getCurrentPhase(account.platform, currentDay);
  const trafficReady = isTrafficReady(account.platform, currentDay);

  const status: WarmingStatus = {
    accountId,
    platform: account.platform,
    status: 'warming',
    currentDay,
    progress,
    phase,
    isTrafficReady: trafficReady,
    riskScore: account.banRisk || 0,
    actionsToday: 0,
    lastActionAt: null,
    nextActionAt: new Date(),
  };

  // Update database
  await db.account.update({
    where: { id: accountId },
    data: {
      status: 'active',
      warmingStartedAt: account.warmingStartedAt || new Date(),
      warmingProgress: progress,
    },
  });

  // Start warming loop
  const session = {
    config: warmingConfig,
    status,
    intervalId: null,
    startedAt: new Date(),
  };

  activeWarmingSessions.set(accountId, session);

  // Start the warming loop asynchronously
  runWarmingLoop(accountId).catch((error) => {
    console.error(`Warming loop error for ${accountId}:`, error);
    const currentSession = activeWarmingSessions.get(accountId);
    if (currentSession) {
      currentSession.status.status = 'error';
      currentSession.status.error = error.message;
    }
  });

  return status;
}

/**
 * Stop warming process for an account
 */
export async function stopWarming(accountId: string): Promise<WarmingStatus> {
  const session = activeWarmingSessions.get(accountId);

  if (!session) {
    // Account not actively warming, just return current status
    return getWarmingStatus(accountId);
  }

  // Clear interval if exists
  if (session.intervalId) {
    clearInterval(session.intervalId);
  }

  // Update status
  session.status.status = 'paused';

  // Update database
  await db.account.update({
    where: { id: accountId },
    data: {
      status: 'paused',
    },
  });

  // Remove from active sessions
  activeWarmingSessions.delete(accountId);

  return session.status;
}

/**
 * Get current warming status for an account
 */
export async function getWarmingStatus(accountId: string): Promise<WarmingStatus> {
  // Check active sessions first
  const session = activeWarmingSessions.get(accountId);
  if (session) {
    return session.status;
  }

  // Get from database
  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const currentDay = calculateWarmingDay(account.warmingStartedAt);
  const progress = calculateProgress(account.platform, currentDay);
  const phase = getCurrentPhase(account.platform, currentDay);
  const trafficReady = isTrafficReady(account.platform, currentDay);

  // Get today's action count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const actionsToday = await db.accountAction.count({
    where: {
      accountId,
      createdAt: { gte: today },
    },
  });

  // Get last action
  const lastAction = await db.accountAction.findFirst({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    accountId,
    platform: account.platform,
    status: mapAccountStatus(account.status),
    currentDay,
    progress,
    phase,
    isTrafficReady: trafficReady,
    riskScore: account.banRisk || 0,
    actionsToday,
    lastActionAt: lastAction?.createdAt || null,
    nextActionAt: null,
  };
}

/**
 * Calculate current phase for an account
 */
export function calculatePhase(accountId: string): WarmingPhase | null {
  const session = activeWarmingSessions.get(accountId);
  if (session) {
    return session.status.phase;
  }
  return null;
}

/**
 * Execute a specific warming action
 */
export async function executeWarmingActionWithCheck(
  accountId: string,
  action: WarmingAction
): Promise<ActionResult> {
  const session = activeWarmingSessions.get(accountId);
  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const context: ActionContext = {
    accountId,
    platform: account.platform,
    currentDay: session?.status.currentDay || calculateWarmingDay(account.warmingStartedAt),
    sessionData: account.sessionData ? JSON.parse(account.sessionData) : undefined,
    proxyConfig: account.proxyHost
      ? {
          host: account.proxyHost,
          port: account.proxyPort || 0,
          username: account.proxyUsername || undefined,
          password: account.proxyPassword || undefined,
          type: account.proxyType || 'socks5',
        }
      : undefined,
  };

  const result = await executeWarmingAction(context, action);

  // Update session risk score
  if (session && result.success) {
    session.status.riskScore = Math.min(100, session.status.riskScore + result.riskDelta);
    session.status.actionsToday++;
    session.status.lastActionAt = new Date();

    // Check if we need to pause due to high risk
    if (
      session.config.pauseOnSuspicious &&
      session.status.riskScore >= session.config.maxRiskScore
    ) {
      session.status.status = 'paused';
      await stopWarming(accountId);
    }
  }

  return result;
}

/**
 * Run the main warming loop for an account
 */
async function runWarmingLoop(accountId: string): Promise<void> {
  const session = activeWarmingSessions.get(accountId);
  if (!session) return;

  const strategy = getWarmingStrategy(session.config.platform);
  if (!strategy) return;

  while (activeWarmingSessions.has(accountId)) {
    try {
      // Check if within active hours
      if (
        !isActiveTime(
          strategy.dailyTimeRange.startHour,
          strategy.dailyTimeRange.endHour
        )
      ) {
        // Wait until next active time
        const nextActive = getNextActiveTime(
          strategy.dailyTimeRange.startHour,
          strategy.dailyTimeRange.endHour
        );
        const waitTime = nextActive.getTime() - Date.now();
        await sleep(Math.min(waitTime, 60000)); // Check every minute max

        // Recheck session status
        if (!activeWarmingSessions.has(accountId)) break;
        continue;
      }

      // Check for suspicious activity
      const suspiciousCheck = await checkSuspiciousActivity(accountId);
      if (suspiciousCheck.isSuspicious && session.config.pauseOnSuspicious) {
        console.log(
          `Suspicious activity detected for ${accountId}:`,
          suspiciousCheck.indicators
        );
        session.status.status = 'paused';
        await stopWarming(accountId);
        break;
      }

      // Generate action plan for current phase
      const actionPlan = generateDailyActionPlan(
        session.config.platform,
        session.status.currentDay
      );

      if (actionPlan.length === 0) {
        // No actions for this phase, wait and check again
        await sleep(randomDelay(60000, 300000)); // 1-5 minutes
        continue;
      }

      // Execute actions with delays
      for (const actionItem of actionPlan) {
        if (!activeWarmingSessions.has(accountId)) break;

        // Check daily limits
        if (session.status.actionsToday >= getTotalDailyLimit(strategy, session.status.currentDay)) {
          // Daily limit reached, wait until tomorrow
          await sleep(randomDelay(3600000, 7200000)); // 1-2 hours
          break;
        }

        // Execute action
        const action: WarmingAction = {
          type: actionItem.action,
          target: await selectTarget(accountId, actionItem.action),
        };

        const result = await executeWarmingActionWithCheck(accountId, action);

        if (!result.success && session.config.pauseOnError) {
          console.error(`Action failed for ${accountId}:`, result.error);
          // Continue with next action after a delay
          await sleep(randomDelay(30000, 60000));
        }

        // Update status
        session.status.lastActionAt = new Date();

        // Session gap between actions
        const gap = generateSessionGap();
        await sleep(Math.min(gap, 60000)); // Max 1 minute gap between checks
      }

      // Increment day if needed
      const newDay = calculateWarmingDay(
        await getWarmingStartDate(accountId)
      );
      if (newDay > session.status.currentDay) {
        session.status.currentDay = newDay;
        session.status.progress = calculateProgress(
          session.config.platform,
          newDay
        );
        session.status.phase = getCurrentPhase(session.config.platform, newDay);
        session.status.isTrafficReady = isTrafficReady(
          session.config.platform,
          newDay
        );
        session.status.actionsToday = 0;

        // Check if completed
        if (session.status.isTrafficReady) {
          session.status.status = 'completed';
          await db.account.update({
            where: { id: accountId },
            data: { status: 'active', warmingProgress: 100 },
          });
          activeWarmingSessions.delete(accountId);
          break;
        }
      }

      // Wait before next action batch
      await sleep(randomDelay(60000, 300000)); // 1-5 minutes
    } catch (error) {
      console.error(`Warming loop error for ${accountId}:`, error);
      if (session.config.pauseOnError) {
        session.status.status = 'error';
        session.status.error =
          error instanceof Error ? error.message : 'Unknown error';
        await stopWarming(accountId);
        break;
      }
      // Continue after error
      await sleep(randomDelay(60000, 300000));
    }
  }
}

/**
 * Get all active warming sessions
 */
export function getActiveWarmingSessions(): WarmingStatus[] {
  return Array.from(activeWarmingSessions.values()).map((s) => s.status);
}

/**
 * Pause warming for an account (alias for stop)
 */
export async function pauseWarming(accountId: string): Promise<WarmingStatus> {
  return stopWarming(accountId);
}

/**
 * Resume warming for a paused account
 */
export async function resumeWarming(accountId: string): Promise<WarmingStatus> {
  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  if (account.status !== 'paused') {
    throw new Error(`Account ${accountId} is not paused`);
  }

  return startWarming(accountId);
}

/**
 * Get warming logs for an account
 */
export async function getWarmingLogs(
  accountId: string,
  limit: number = 100
): Promise<{
  actions: Array<{
    id: string;
    actionType: string;
    target: string | null;
    result: string | null;
    error: string | null;
    createdAt: Date;
  }>;
  summary: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    lastActionAt: Date | null;
  };
}> {
  const actions = await db.accountAction.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const totalActions = await db.accountAction.count({
    where: { accountId },
  });

  const successfulActions = await db.accountAction.count({
    where: { accountId, error: null },
  });

  const lastAction = actions[0];

  return {
    actions: actions.map((a) => ({
      id: a.id,
      actionType: a.actionType,
      target: a.target,
      result: a.result,
      error: a.error,
      createdAt: a.createdAt,
    })),
    summary: {
      totalActions,
      successfulActions,
      failedActions: totalActions - successfulActions,
      lastActionAt: lastAction?.createdAt || null,
    },
  };
}

// Helper functions

function calculateWarmingDay(startedAt: Date | null): number {
  if (!startedAt) return 1;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startedAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function mapAccountStatus(
  status: string
): 'idle' | 'warming' | 'paused' | 'completed' | 'error' | 'banned' {
  const statusMap: Record<string, 'idle' | 'warming' | 'paused' | 'completed' | 'error' | 'banned'> = {
    pending: 'idle',
    active: 'warming',
    paused: 'paused',
    completed: 'completed',
    error: 'error',
    banned: 'banned',
  };
  return statusMap[status] || 'idle';
}

function getTotalDailyLimit(
  strategy: PlatformWarmingStrategy,
  currentDay: number
): number {
  const phase = getCurrentPhase(strategy.platform, currentDay);
  if (!phase) return 100;

  let total = 0;
  for (const limit of Object.values(phase.limits)) {
    total += limit.max;
  }
  return total;
}

async function selectTarget(accountId: string, actionType: string): Promise<string> {
  // In a real implementation, this would query for valid targets
  // For now, return a placeholder
  const targets = [
    'channel_1',
    'channel_2',
    'user_1',
    'user_2',
    'post_1',
    'post_2',
  ];
  return targets[Math.floor(Math.random() * targets.length)];
}

async function getWarmingStartDate(accountId: string): Promise<Date | null> {
  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { warmingStartedAt: true },
  });
  return account?.warmingStartedAt || null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Export types
 */
// Types are already exported above with their definitions
