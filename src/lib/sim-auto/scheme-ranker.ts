// Scheme Ranker - Ranking algorithm for monetization schemes
// Based on platform compatibility, earnings, risk, automation level, and more

import { 
  MONETIZATION_SCHEMES, 
  type MonetizationSchemeDefinition, 
  type SchemeCategory, 
  type RiskLevel, 
  type Platform 
} from './schemes-library';

export interface SimCardAccountInfo {
  id: string;
  platform: string;
  status: string;
  warmingProgress: number;
  warmingPhase: number;
  warmingStartedAt: Date | null;
  warmingEndsAt: Date | null;
  lastActivityAt: Date | null;
}

export interface RankerConfig {
  weights?: {
    platformCompatibility?: number;
    estimatedEarnings?: number;
    timeToProfit?: number;
    riskLevel?: number;
    automationLevel?: number;
    freeMethod?: number;
  };
  filters?: {
    categories?: SchemeCategory[];
    platforms?: Platform[];
    riskLevels?: RiskLevel[];
    maxTimeToProfit?: number;
    minAutomationLevel?: number;
    freeOnly?: boolean;
  };
}

export interface RankedScheme {
  scheme: MonetizationSchemeDefinition;
  score: number;
  breakdown: {
    platformCompatibility: number;
    estimatedEarnings: number;
    timeToProfit: number;
    riskLevel: number;
    automationLevel: number;
    freeMethod: number;
  };
  matchedAccounts: number;
  estimatedRevenue: {
    min: number;
    max: number;
  };
}

// Parse revenue string like "$50-100/mo" to min/max values
function parseRevenue(revenueStr: string): { min: number; max: number } {
  const match = revenueStr.match(/\$(\d+)-(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  return { min: 0, max: 0 };
}

// Normalize a value to 0-1 range
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Risk score mapping (lower risk = higher score)
const RISK_SCORES: Record<RiskLevel, number> = {
  low: 1.0,
  medium: 0.7,
  high: 0.4,
  extreme: 0.2
};

// Default weights for ranking factors
const DEFAULT_WEIGHTS = {
  platformCompatibility: 0.30,
  estimatedEarnings: 0.25,
  timeToProfit: 0.15,
  riskLevel: 0.10,
  automationLevel: 0.10,
  freeMethod: 0.10
};

/**
 * Check platform compatibility between scheme and available accounts
 */
function checkPlatformCompatibility(
  scheme: MonetizationSchemeDefinition,
  availableAccounts: SimCardAccountInfo[],
  warmedAccounts: SimCardAccountInfo[]
): { score: number; matchedAccounts: number } {
  if (scheme.platforms.includes('all')) {
    return { score: 1.0, matchedAccounts: availableAccounts.length };
  }

  const schemePlatforms = scheme.platforms;
  
  // Count accounts for each platform
  const platformAccounts = new Map<string, number>();
  
  for (const platform of schemePlatforms) {
    const count = warmedAccounts.filter(a => 
      a.platform.toLowerCase() === platform.toLowerCase() && 
      a.status === 'active' &&
      a.warmingProgress >= scheme.minWarmingDays * 5 // Rough progress conversion
    ).length;
    platformAccounts.set(platform, count);
  }

  const totalMatched = Array.from(platformAccounts.values()).reduce((a, b) => a + b, 0);
  
  // Score based on having enough accounts for minimum requirement
  if (totalMatched >= scheme.minAccounts) {
    return { score: 1.0, matchedAccounts: totalMatched };
  } else if (totalMatched > 0) {
    // Partial score if some accounts available
    return { 
      score: 0.3 + (totalMatched / scheme.minAccounts) * 0.5, 
      matchedAccounts: totalMatched 
    };
  }

  // Check if we have accounts that could be warmed for this platform
  const potentialAccounts = availableAccounts.filter(a => 
    schemePlatforms.some(p => a.platform.toLowerCase() === p.toLowerCase())
  ).length;

  if (potentialAccounts > 0) {
    return { score: 0.2, matchedAccounts: potentialAccounts };
  }

  return { score: 0, matchedAccounts: 0 };
}

/**
 * Predict earnings based on scheme and account quality
 */
function predictEarnings(
  scheme: MonetizationSchemeDefinition,
  warmedAccounts: SimCardAccountInfo[],
  matchedAccounts: number
): { score: number; estimatedRevenue: { min: number; max: number } } {
  const baseRevenue = parseRevenue(scheme.expectedRevenue);
  
  // Adjust based on number of accounts
  const accountMultiplier = Math.min(matchedAccounts / scheme.minAccounts, 3);
  
  // Adjust based on warming quality
  const avgWarmingProgress = warmedAccounts.length > 0
    ? warmedAccounts.reduce((sum, a) => sum + a.warmingProgress, 0) / warmedAccounts.length
    : 0;
  const warmingMultiplier = 0.5 + (avgWarmingProgress / 100) * 0.5;
  
  const estimatedMin = baseRevenue.min * accountMultiplier * warmingMultiplier;
  const estimatedMax = baseRevenue.max * accountMultiplier * warmingMultiplier;

  // Normalize to 0-1 score (max expected revenue around $500)
  const score = normalize(estimatedMax, 0, 500);

  return {
    score,
    estimatedRevenue: { min: Math.round(estimatedMin), max: Math.round(estimatedMax) }
  };
}

/**
 * Calculate time to profit score (shorter = better)
 */
function calculateTimeToProfitScore(scheme: MonetizationSchemeDefinition): number {
  // Normalize: 0 days = 1.0, 60 days = 0.0
  return Math.max(0, 1 - scheme.timeToProfit / 60);
}

/**
 * Main ranking function
 */
export function rankSchemes(
  availableAccounts: SimCardAccountInfo[],
  warmedAccounts: SimCardAccountInfo[],
  config: RankerConfig = {}
): RankedScheme[] {
  const weights = { ...DEFAULT_WEIGHTS, ...config.weights };
  const filters = config.filters || {};

  let schemes = [...MONETIZATION_SCHEMES];

  // Apply category filter
  if (filters.categories && filters.categories.length > 0) {
    schemes = schemes.filter(s => filters.categories!.includes(s.category));
  }

  // Apply platform filter
  if (filters.platforms && filters.platforms.length > 0) {
    schemes = schemes.filter(s => 
      s.platforms.some(p => filters.platforms!.includes(p)) || s.platforms.includes('all')
    );
  }

  // Apply risk level filter
  if (filters.riskLevels && filters.riskLevels.length > 0) {
    schemes = schemes.filter(s => filters.riskLevels!.includes(s.riskLevel));
  }

  // Apply max time to profit filter
  if (filters.maxTimeToProfit) {
    schemes = schemes.filter(s => s.timeToProfit <= filters.maxTimeToProfit!);
  }

  // Apply min automation level filter
  if (filters.minAutomationLevel) {
    schemes = schemes.filter(s => s.automationLevel >= filters.minAutomationLevel!);
  }

  // Apply free only filter
  if (filters.freeOnly) {
    schemes = schemes.filter(s => s.isFree);
  }

  // Calculate scores for each scheme
  const rankedSchemes: RankedScheme[] = schemes.map(scheme => {
    // 1. Platform compatibility
    const { score: compatibilityScore, matchedAccounts } = checkPlatformCompatibility(
      scheme, 
      availableAccounts, 
      warmedAccounts
    );

    // 2. Estimated earnings
    const { score: earningsScore, estimatedRevenue } = predictEarnings(
      scheme, 
      warmedAccounts,
      matchedAccounts
    );

    // 3. Time to profit
    const timeToProfitScore = calculateTimeToProfitScore(scheme);

    // 4. Risk level
    const riskScore = RISK_SCORES[scheme.riskLevel];

    // 5. Automation level
    const automationScore = scheme.automationLevel / 100;

    // 6. Free method bonus
    const freeScore = scheme.isFree ? 1 : 0.5;

    // Calculate weighted total score
    const totalScore = 
      compatibilityScore * weights.platformCompatibility +
      earningsScore * weights.estimatedEarnings +
      timeToProfitScore * weights.timeToProfit +
      riskScore * weights.riskLevel +
      automationScore * weights.automationLevel +
      freeScore * weights.freeMethod;

    return {
      scheme,
      score: totalScore,
      breakdown: {
        platformCompatibility: compatibilityScore,
        estimatedEarnings: earningsScore,
        timeToProfit: timeToProfitScore,
        riskLevel: riskScore,
        automationLevel: automationScore,
        freeMethod: freeScore
      },
      matchedAccounts,
      estimatedRevenue
    };
  });

  // Sort by score descending
  rankedSchemes.sort((a, b) => b.score - a.score);

  // Return top 50
  return rankedSchemes.slice(0, 50);
}

/**
 * Get quick recommendations based on simple criteria
 */
export function getQuickRecommendations(
  accounts: SimCardAccountInfo[],
  goal: 'fast' | 'stable' | 'high_yield' | 'low_risk' = 'stable'
): RankedScheme[] {
  const warmedAccounts = accounts.filter(a => 
    a.status === 'active' && a.warmingProgress >= 50
  );

  let config: RankerConfig = {};

  switch (goal) {
    case 'fast':
      // Quick profit with high automation
      config = {
        weights: {
          timeToProfit: 0.35,
          automationLevel: 0.25,
          platformCompatibility: 0.20,
          estimatedEarnings: 0.10,
          riskLevel: 0.05,
          freeMethod: 0.05
        },
        filters: {
          maxTimeToProfit: 14,
          minAutomationLevel: 70
        }
      };
      break;

    case 'stable':
      // Balanced approach
      config = {
        weights: DEFAULT_WEIGHTS,
        filters: {
          riskLevels: ['low', 'medium']
        }
      };
      break;

    case 'high_yield':
      // Maximum revenue potential
      config = {
        weights: {
          estimatedEarnings: 0.40,
          platformCompatibility: 0.25,
          riskLevel: 0.15,
          automationLevel: 0.10,
          timeToProfit: 0.05,
          freeMethod: 0.05
        }
      };
      break;

    case 'low_risk':
      // Minimum risk
      config = {
        weights: {
          riskLevel: 0.35,
          platformCompatibility: 0.25,
          freeMethod: 0.20,
          estimatedEarnings: 0.10,
          automationLevel: 0.05,
          timeToProfit: 0.05
        },
        filters: {
          riskLevels: ['low'],
          freeOnly: true
        }
      };
      break;
  }

  return rankSchemes(accounts, warmedAccounts, config);
}

/**
 * Get scheme details with performance prediction
 */
export function getSchemeDetails(
  schemeId: string,
  accounts: SimCardAccountInfo[]
): RankedScheme | null {
  const scheme = MONETIZATION_SCHEMES.find(s => s.id === schemeId);
  if (!scheme) return null;

  const warmedAccounts = accounts.filter(a => 
    a.status === 'active' && a.warmingProgress >= 50
  );

  const { score: compatibilityScore, matchedAccounts } = checkPlatformCompatibility(
    scheme, 
    accounts, 
    warmedAccounts
  );

  const { score: earningsScore, estimatedRevenue } = predictEarnings(
    scheme, 
    warmedAccounts,
    matchedAccounts
  );

  const timeToProfitScore = calculateTimeToProfitScore(scheme);
  const riskScore = RISK_SCORES[scheme.riskLevel];
  const automationScore = scheme.automationLevel / 100;
  const freeScore = scheme.isFree ? 1 : 0.5;

  const totalScore = 
    compatibilityScore * DEFAULT_WEIGHTS.platformCompatibility +
    earningsScore * DEFAULT_WEIGHTS.estimatedEarnings +
    timeToProfitScore * DEFAULT_WEIGHTS.timeToProfit +
    riskScore * DEFAULT_WEIGHTS.riskLevel +
    automationScore * DEFAULT_WEIGHTS.automationLevel +
    freeScore * DEFAULT_WEIGHTS.freeMethod;

  return {
    scheme,
    score: totalScore,
    breakdown: {
      platformCompatibility: compatibilityScore,
      estimatedEarnings: earningsScore,
      timeToProfit: timeToProfitScore,
      riskLevel: riskScore,
      automationLevel: automationScore,
      freeMethod: freeScore
    },
    matchedAccounts,
    estimatedRevenue
  };
}

/**
 * Batch analyze multiple schemes
 */
export function analyzeSchemeBatch(
  schemeIds: string[],
  accounts: SimCardAccountInfo[]
): RankedScheme[] {
  return schemeIds
    .map(id => getSchemeDetails(id, accounts))
    .filter((s): s is RankedScheme => s !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate account requirements for a scheme
 */
export function calculateRequirements(
  scheme: MonetizationSchemeDefinition,
  currentAccounts: SimCardAccountInfo[]
): {
  hasEnough: boolean;
  current: number;
  required: number;
  needsWarming: number;
  warmingDays: number;
} {
  const relevantAccounts = currentAccounts.filter(a => 
    scheme.platforms.includes(a.platform as Platform) || scheme.platforms.includes('all')
  );

  const warmedAccounts = relevantAccounts.filter(a => 
    a.status === 'active' && a.warmingProgress >= 50
  );

  return {
    hasEnough: warmedAccounts.length >= scheme.minAccounts,
    current: warmedAccounts.length,
    required: scheme.minAccounts,
    needsWarming: Math.max(0, scheme.minAccounts - warmedAccounts.length),
    warmingDays: scheme.minWarmingDays
  };
}

const schemeRanker = {
  rankSchemes,
  getQuickRecommendations,
  getSchemeDetails,
  analyzeSchemeBatch,
  calculateRequirements
};

export default schemeRanker;
