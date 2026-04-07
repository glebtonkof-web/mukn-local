/**
 * Action Executor for Account Warming
 * Executes warming actions with human-like behavior simulation
 */

import { db } from '@/lib/db';
import {
  randomDelay,
  simulateTyping,
  simulateReading,
  simulateNetworkLatency,
  generateActionGap,
} from './behavior-simulator';
import { isActionAllowed, getActionLimits } from './warming-strategies';

// Types
export interface WarmingAction {
  type: string;
  target?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  action: WarmingAction;
  accountId: string;
  executedAt: Date;
  duration: number;
  result?: Record<string, unknown>;
  error?: string;
  riskDelta: number;
}

export interface ActionContext {
  accountId: string;
  platform: string;
  currentDay: number;
  sessionData?: Record<string, unknown>;
  proxyConfig?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    type: string;
  };
}

// Risk scoring for actions
const ACTION_RISK_SCORES: Record<string, number> = {
  login: 5,
  view_feed: 1,
  view: 1,
  view_channels: 1,
  view_chats: 1,
  view_stories: 1,
  view_reels: 1,
  view_fyp: 1,
  like: 2,
  reactions: 2,
  scroll: 1,
  search: 2,
  subscribe: 3,
  follow: 3,
  save: 2,
  share: 3,
  join_groups: 4,
  comment: 5,
  reply: 4,
  story: 4,
  post: 6,
  dm: 7,
  invite: 8,
  create_channel: 7,
  duet: 5,
  stitch: 5,
  live: 8,
};

/**
 * Execute a warming action for an account
 */
export async function executeWarmingAction(
  context: ActionContext,
  action: WarmingAction
): Promise<ActionResult> {
  const startTime = Date.now();

  // Check if action is allowed for current phase
  if (!isActionAllowed(context.platform, context.currentDay, action.type)) {
    return {
      success: false,
      action,
      accountId: context.accountId,
      executedAt: new Date(),
      duration: 0,
      error: `Action ${action.type} is not allowed on day ${context.currentDay}`,
      riskDelta: 0,
    };
  }

  // Check daily limits
  const limits = getActionLimits(context.platform, context.currentDay);
  if (limits) {
    const todayCount = await getTodayActionCount(context.accountId, action.type);
    const limit = limits[action.type];
    if (limit && todayCount >= limit.max) {
      return {
        success: false,
        action,
        accountId: context.accountId,
        executedAt: new Date(),
        duration: 0,
        error: `Daily limit reached for action ${action.type}`,
        riskDelta: 0,
      };
    }
  }

  try {
    // Add human-like delay before action
    const preDelay = generateActionGap(action.type);
    await sleep(preDelay);

    // Execute the specific action
    let result: Record<string, unknown> | undefined;
    switch (action.type) {
      case 'login':
        result = await executeLogin(context, action);
        break;
      case 'view':
      case 'view_feed':
      case 'view_channels':
      case 'view_chats':
      case 'view_stories':
      case 'view_reels':
      case 'view_fyp':
        result = await executeView(context, action);
        break;
      case 'like':
      case 'reactions':
        result = await executeLike(context, action);
        break;
      case 'subscribe':
      case 'follow':
        result = await executeSubscribe(context, action);
        break;
      case 'comment':
        result = await executeComment(context, action);
        break;
      case 'reply':
        result = await executeReply(context, action);
        break;
      case 'post':
      case 'story':
        result = await executePost(context, action);
        break;
      case 'dm':
        result = await executeDM(context, action);
        break;
      case 'invite':
        result = await executeInvite(context, action);
        break;
      case 'share':
      case 'save':
      case 'search':
      case 'scroll':
        result = await executeGenericAction(context, action);
        break;
      default:
        result = await executeGenericAction(context, action);
    }

    const duration = Date.now() - startTime;
    const riskDelta = ACTION_RISK_SCORES[action.type] || 1;

    // Log the action to database
    await logAction(context.accountId, action, true, duration, result);

    return {
      success: true,
      action,
      accountId: context.accountId,
      executedAt: new Date(),
      duration,
      result,
      riskDelta,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log the failed action
    await logAction(context.accountId, action, false, duration, undefined, errorMessage);

    return {
      success: false,
      action,
      accountId: context.accountId,
      executedAt: new Date(),
      duration,
      error: errorMessage,
      riskDelta: 2, // Failed actions still add some risk
    };
  }
}

/**
 * Execute login action
 */
async function executeLogin(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  // Simulate typing password
  if (action.metadata?.password) {
    const typingTime = simulateTyping(String(action.metadata.password));
    await sleep(typingTime);
  }

  // Update account last used timestamp
  await db.account.update({
    where: { id: context.accountId },
    data: { lastUsedAt: new Date() },
  });

  return {
    loginTime: new Date(),
    sessionEstablished: true,
    proxy: context.proxyConfig?.host,
  };
}

/**
 * Execute view action
 */
async function executeView(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  // Simulate viewing time based on content length
  const contentLength = action.content?.length || 100;
  const viewTime = simulateReading(action.content || 'Sample content');
  await sleep(viewTime);

  return {
    target: action.target,
    viewDuration: viewTime,
    contentLength,
  };
}

/**
 * Execute like/reaction action
 */
async function executeLike(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  // Simulate viewing before liking (human behavior)
  const preViewTime = randomDelay(1000, 5000);
  await sleep(preViewTime);

  // Simulate network latency for like request
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    target: action.target,
    reactionType: action.metadata?.reactionType || 'like',
    timestamp: new Date(),
  };
}

/**
 * Execute subscribe/follow action
 */
async function executeSubscribe(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  // Simulate viewing profile before following
  const profileViewTime = randomDelay(2000, 8000);
  await sleep(profileViewTime);

  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    target: action.target,
    subscribedAt: new Date(),
  };
}

/**
 * Execute comment action
 */
async function executeComment(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  if (!action.content) {
    throw new Error('Comment content is required');
  }

  // Simulate reading the post first
  const readingTime = simulateReading(action.target || '');
  await sleep(readingTime);

  // Simulate thinking time
  const thinkingTime = randomDelay(2000, 8000);
  await sleep(thinkingTime);

  // Simulate typing the comment
  const typingTime = simulateTyping(action.content);
  await sleep(typingTime);

  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    target: action.target,
    content: action.content,
    postedAt: new Date(),
  };
}

/**
 * Execute reply action
 */
async function executeReply(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  if (!action.content) {
    throw new Error('Reply content is required');
  }

  // Simulate reading the original message
  const readingTime = simulateReading(action.target || '');
  await sleep(readingTime);

  // Simulate typing the reply
  const typingTime = simulateTyping(action.content);
  await sleep(typingTime);

  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    target: action.target,
    content: action.content,
    repliedAt: new Date(),
  };
}

/**
 * Execute post/story action
 */
async function executePost(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  // Simulate content creation time
  const creationTime = randomDelay(30000, 120000);
  await sleep(creationTime);

  // Simulate caption/description typing
  if (action.content) {
    const typingTime = simulateTyping(action.content);
    await sleep(typingTime);
  }

  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    postId: `post_${Date.now()}`,
    content: action.content,
    postedAt: new Date(),
    type: action.type,
  };
}

/**
 * Execute DM (direct message) action
 */
async function executeDM(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  if (!action.content) {
    throw new Error('DM content is required');
  }

  // Simulate viewing recipient profile
  const profileViewTime = randomDelay(3000, 10000);
  await sleep(profileViewTime);

  // Simulate typing the message
  const typingTime = simulateTyping(action.content);
  await sleep(typingTime);

  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    target: action.target,
    content: action.content,
    sentAt: new Date(),
  };
}

/**
 * Execute invite action (Telegram specific)
 */
async function executeInvite(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  // Simulate viewing target profile
  const profileViewTime = randomDelay(2000, 6000);
  await sleep(profileViewTime);

  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    target: action.target,
    invitedTo: action.metadata?.groupId,
    invitedAt: new Date(),
  };
}

/**
 * Execute generic action
 */
async function executeGenericAction(
  context: ActionContext,
  action: WarmingAction
): Promise<Record<string, unknown>> {
  // Simulate generic action time
  const actionTime = randomDelay(1000, 5000);
  await sleep(actionTime);

  // Simulate network latency
  const networkLatency = simulateNetworkLatency();
  await sleep(networkLatency);

  return {
    action: action.type,
    target: action.target,
    executedAt: new Date(),
  };
}

/**
 * Get today's action count for an account
 */
async function getTodayActionCount(
  accountId: string,
  actionType: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await db.accountAction.count({
    where: {
      accountId,
      actionType,
      createdAt: {
        gte: today,
      },
    },
  });

  return count;
}

/**
 * Log action to database
 */
async function logAction(
  accountId: string,
  action: WarmingAction,
  success: boolean,
  duration: number,
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  await db.accountAction.create({
    data: {
      id: `${accountId}_${action.type}_${Date.now()}`,
      accountId,
      actionType: action.type,
      target: action.target,
      result: result ? JSON.stringify(result) : undefined,
      error,
    },
  });
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute batch of actions with proper delays
 */
export async function executeActionBatch(
  context: ActionContext,
  actions: WarmingAction[],
  onProgress?: (completed: number, total: number, result: ActionResult) => void
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (let i = 0; i < actions.length; i++) {
    const result = await executeWarmingAction(context, actions[i]);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, actions.length, result);
    }

    // Add delay between actions
    if (i < actions.length - 1) {
      const gap = generateActionGap(actions[i].type);
      await sleep(gap);
    }
  }

  return results;
}

/**
 * Check for suspicious activity indicators
 */
export async function checkSuspiciousActivity(
  accountId: string
): Promise<{
  isSuspicious: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  indicators: string[];
}> {
  const indicators: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Check for rapid successive actions
  const recentActions = await db.accountAction.findMany({
    where: {
      accountId,
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (recentActions.length > 20) {
    indicators.push('High action frequency in last 5 minutes');
    riskLevel = 'high';
  } else if (recentActions.length > 10) {
    indicators.push('Elevated action frequency');
    riskLevel = 'medium';
  }

  // Check for repeated identical actions
  const actionTypes = recentActions.map((a) => a.actionType);
  const uniqueActions = new Set(actionTypes);
  if (actionTypes.length > 5 && uniqueActions.size < 3) {
    indicators.push('Low action diversity');
    if (riskLevel !== 'high') riskLevel = 'medium';
  }

  // Check for failed actions
  const failedActions = recentActions.filter((a) => a.error);
  if (failedActions.length > 3) {
    indicators.push('Multiple failed actions');
    riskLevel = 'high';
  }

  return {
    isSuspicious: indicators.length > 0,
    riskLevel,
    indicators,
  };
}

/**
 * Export types
 */
// Types are already exported above with their definitions
