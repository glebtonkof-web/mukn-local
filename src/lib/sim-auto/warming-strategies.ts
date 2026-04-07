/**
 * Platform-specific warming strategies for automatic account warming
 * Each platform has unique phases, actions, and limits to mimic human behavior
 */

// Types for warming strategies
export interface WarmingActionLimit {
  min: number;
  max: number;
}

export interface WarmingPhase {
  days: [number, number]; // [startDay, endDay]
  actions: string[];
  limits: Record<string, WarmingActionLimit>;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PlatformWarmingStrategy {
  platform: string;
  totalDays: number;
  phases: WarmingPhase[];
  dailyTimeRange: {
    startHour: number;
    endHour: number;
  };
  sessionConfig: {
    minSessions: number;
    maxSessions: number;
    minSessionDuration: number; // minutes
    maxSessionDuration: number;
  };
  proxyRequirements: {
    types: ('mobile' | 'residential' | 'datacenter')[];
    recommended: 'mobile' | 'residential';
    warning: string;
  };
  riskThresholds: {
    warningRisk: number;
    criticalRisk: number;
    pauseThreshold: number;
  };
  banIndicators: string[];
  recoveryActions: string[];
}

// Telegram Warming Strategy - 14 days
export const TELEGRAM_WARMING: PlatformWarmingStrategy = {
  platform: 'telegram',
  totalDays: 14,
  phases: [
    {
      days: [1, 2],
      actions: ['login', 'view_channels', 'view_chats'],
      limits: {
        views: { min: 10, max: 20 },
        channelsJoined: { min: 2, max: 3 },
      },
      description: 'Phase 1: Ghost - Create viewing history without engagement',
      riskLevel: 'low',
    },
    {
      days: [3, 5],
      actions: ['subscribe', 'reactions', 'view_stories'],
      limits: {
        subscribes: { min: 3, max: 5 },
        reactions: { min: 3, max: 5 },
        storyViews: { min: 5, max: 10 },
      },
      description: 'Phase 2: Light Contact - Start meaningful interactions',
      riskLevel: 'low',
    },
    {
      days: [6, 10],
      actions: ['comment', 'reply', 'join_groups'],
      limits: {
        comments: { min: 1, max: 2 },
        replies: { min: 2, max: 3 },
        groupsJoined: { min: 1, max: 2 },
      },
      description: 'Phase 3: Activation - Prove you are a real user',
      riskLevel: 'medium',
    },
    {
      days: [11, 14],
      actions: ['create_channel', 'post', 'dm', 'invite'],
      limits: {
        posts: { min: 1, max: 2 },
        dms: { min: 2, max: 5 },
        invites: { min: 2, max: 5 },
      },
      description: 'Phase 4: Stable - Ready for traffic operations',
      riskLevel: 'medium',
    },
  ],
  dailyTimeRange: {
    startHour: 9,
    endHour: 22,
  },
  sessionConfig: {
    minSessions: 2,
    maxSessions: 4,
    minSessionDuration: 10,
    maxSessionDuration: 30,
  },
  proxyRequirements: {
    types: ['mobile', 'residential'],
    recommended: 'residential',
    warning: 'Telegram tracks account age. Use residential proxies matching GEO.',
  },
  riskThresholds: {
    warningRisk: 30,
    criticalRisk: 60,
    pauseThreshold: 80,
  },
  banIndicators: [
    'Messages not delivered',
    'Account not visible in search',
    'Spam-bot restrictions',
    'Cannot invite to groups',
  ],
  recoveryActions: [
    'Contact @SpamBot',
    'Stop all activity for 24-48h',
    'Reduce activity to 30%',
  ],
};

// Instagram Warming Strategy - 10 days
export const INSTAGRAM_WARMING: PlatformWarmingStrategy = {
  platform: 'instagram',
  totalDays: 10,
  phases: [
    {
      days: [1, 3],
      actions: ['view_feed', 'like', 'view_stories', 'view_reels'],
      limits: {
        likes: { min: 10, max: 20 },
        storyViews: { min: 10, max: 15 },
        reelsViewed: { min: 5, max: 10 },
        feedScrolls: { min: 20, max: 30 },
      },
      description: 'Phase 1: Ghost - Build viewing history and interest profile',
      riskLevel: 'low',
    },
    {
      days: [4, 6],
      actions: ['follow', 'save', 'share', 'comment'],
      limits: {
        follows: { min: 5, max: 10 },
        saves: { min: 3, max: 5 },
        shares: { min: 1, max: 3 },
        comments: { min: 1, max: 2 },
      },
      description: 'Phase 2: Light Contact - Show algorithm your niche',
      riskLevel: 'medium',
    },
    {
      days: [7, 10],
      actions: ['comment', 'story', 'post', 'dm'],
      limits: {
        comments: { min: 2, max: 5 },
        stories: { min: 1, max: 3 },
        posts: { min: 0, max: 1 },
        dms: { min: 0, max: 2 },
      },
      description: 'Phase 3: Activation - Prove you are a real user creating value',
      riskLevel: 'medium',
    },
  ],
  dailyTimeRange: {
    startHour: 8,
    endHour: 23,
  },
  sessionConfig: {
    minSessions: 3,
    maxSessions: 6,
    minSessionDuration: 15,
    maxSessionDuration: 45,
  },
  proxyRequirements: {
    types: ['mobile', 'residential'],
    recommended: 'mobile',
    warning: 'Datacenter proxies are noisy and lead to bans. Use mobile or residential only.',
  },
  riskThresholds: {
    warningRisk: 25,
    criticalRisk: 50,
    pauseThreshold: 70,
  },
  banIndicators: [
    'Posts not appearing in hashtag search',
    'Sudden drop in reach',
    'Comments hidden from non-followers',
    'Explore page not showing your content',
  ],
  recoveryActions: [
    'Check Account Status in settings',
    'Stop all activity for 48-72 hours',
    'Remove banned hashtags',
    'Revoke suspicious app access',
  ],
};

// TikTok Warming Strategy - 7 days
export const TIKTOK_WARMING: PlatformWarmingStrategy = {
  platform: 'tiktok',
  totalDays: 7,
  phases: [
    {
      days: [1, 2],
      actions: ['view', 'like', 'view_fyp', 'search'],
      limits: {
        views: { min: 20, max: 30 },
        likes: { min: 10, max: 15 },
        fypViews: { min: 30, max: 50 },
        searches: { min: 2, max: 5 },
      },
      description: 'Phase 1: Cold Warm - Build watch history (watch time is critical)',
      riskLevel: 'low',
    },
    {
      days: [3, 4],
      actions: ['follow', 'share', 'comment', 'duet'],
      limits: {
        follows: { min: 5, max: 10 },
        shares: { min: 1, max: 3 },
        comments: { min: 1, max: 2 },
        duets: { min: 0, max: 1 },
      },
      description: 'Phase 2: Soft Activity - Start light engagement with neutral content',
      riskLevel: 'medium',
    },
    {
      days: [5, 7],
      actions: ['comment', 'duet', 'stitch', 'post', 'live'],
      limits: {
        comments: { min: 3, max: 5 },
        duets: { min: 0, max: 1 },
        stitches: { min: 0, max: 1 },
        posts: { min: 0, max: 1 },
      },
      description: 'Phase 3: Growth - Reach engagement for algorithm trust',
      riskLevel: 'medium',
    },
  ],
  dailyTimeRange: {
    startHour: 10,
    endHour: 24,
  },
  sessionConfig: {
    minSessions: 2,
    maxSessions: 5,
    minSessionDuration: 20,
    maxSessionDuration: 60,
  },
  proxyRequirements: {
    types: ['mobile', 'residential'],
    recommended: 'mobile',
    warning: 'TikTok is extremely sensitive. Use iPhone 11+ or ARM cloud phones with antidetect.',
  },
  riskThresholds: {
    warningRisk: 20,
    criticalRisk: 40,
    pauseThreshold: 60,
  },
  banIndicators: [
    '0 views in first hours',
    'Videos not showing in For You',
    'FYP not personalized',
    'Shadowban is usually permanent',
  ],
  recoveryActions: [
    'Delete TikTok app',
    'Reset geolocation and network',
    'Re-download app',
    'Use fresh proxies',
    'Start warming from scratch',
  ],
};

// All platform strategies registry
export const PLATFORM_STRATEGIES: Record<string, PlatformWarmingStrategy> = {
  telegram: TELEGRAM_WARMING,
  instagram: INSTAGRAM_WARMING,
  tiktok: TIKTOK_WARMING,
};

/**
 * Get warming strategy for a specific platform
 */
export function getWarmingStrategy(platform: string): PlatformWarmingStrategy | null {
  return PLATFORM_STRATEGIES[platform.toLowerCase()] || null;
}

/**
 * Get current phase for account based on warming day
 */
export function getCurrentPhase(
  platform: string,
  currentDay: number
): WarmingPhase | null {
  const strategy = getWarmingStrategy(platform);
  if (!strategy) return null;

  for (const phase of strategy.phases) {
    if (currentDay >= phase.days[0] && currentDay <= phase.days[1]) {
      return phase;
    }
  }

  // Return last phase if beyond total days
  return strategy.phases[strategy.phases.length - 1];
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(platform: string, currentDay: number): number {
  const strategy = getWarmingStrategy(platform);
  if (!strategy) return 0;

  return Math.min(100, Math.round((currentDay / strategy.totalDays) * 100));
}

/**
 * Check if account is traffic ready
 */
export function isTrafficReady(platform: string, currentDay: number): boolean {
  const strategy = getWarmingStrategy(platform);
  if (!strategy) return false;

  return currentDay >= strategy.totalDays;
}

/**
 * Get allowed actions for current day
 */
export function getAllowedActions(platform: string, currentDay: number): string[] {
  const phase = getCurrentPhase(platform, currentDay);
  return phase?.actions || [];
}

/**
 * Get action limits for current day
 */
export function getActionLimits(
  platform: string,
  currentDay: number
): Record<string, WarmingActionLimit> | null {
  const phase = getCurrentPhase(platform, currentDay);
  return phase?.limits || null;
}

/**
 * Calculate random action count within limits
 */
export function getRandomActionCount(
  platform: string,
  currentDay: number,
  actionType: string
): number {
  const limits = getActionLimits(platform, currentDay);
  if (!limits || !limits[actionType]) return 0;

  const { min, max } = limits[actionType];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if action is allowed for current phase
 */
export function isActionAllowed(
  platform: string,
  currentDay: number,
  action: string
): boolean {
  const allowedActions = getAllowedActions(platform, currentDay);
  return allowedActions.includes(action);
}

/**
 * Get risk level for current phase
 */
export function getPhaseRiskLevel(
  platform: string,
  currentDay: number
): 'low' | 'medium' | 'high' {
  const phase = getCurrentPhase(platform, currentDay);
  return phase?.riskLevel || 'high';
}

/**
 * Generate daily action plan based on phase
 */
export function generateDailyActionPlan(
  platform: string,
  currentDay: number
): {
  action: string;
  count: number;
  priority: number;
}[] {
  const phase = getCurrentPhase(platform, currentDay);
  if (!phase) return [];

  const actions: { action: string; count: number; priority: number }[] = [];

  // Sort actions by risk level (low risk first)
  const sortedActions = [...phase.actions].sort((a, b) => {
    const riskOrder: Record<string, number> = {
      login: 1,
      view_feed: 2,
      view: 2,
      view_channels: 2,
      view_stories: 3,
      like: 3,
      reactions: 3,
      subscribe: 4,
      follow: 4,
      save: 4,
      share: 5,
      comment: 6,
      reply: 6,
      join_groups: 5,
      dm: 7,
      post: 8,
      story: 8,
      create_channel: 9,
      invite: 10,
    };
    return (riskOrder[a] || 10) - (riskOrder[b] || 10);
  });

  sortedActions.forEach((action, index) => {
    const count = getRandomActionCount(platform, currentDay, action);
    if (count > 0) {
      actions.push({
        action,
        count,
        priority: index + 1,
      });
    }
  });

  return actions;
}

/**
 * Export types
 */
export type {
  WarmingActionLimit,
  WarmingPhase,
  PlatformWarmingStrategy,
};
