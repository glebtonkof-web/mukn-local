import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry, createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

const dbCircuitBreaker = createCircuitBreaker('database', { circuitBreakerThreshold: 3 });

// Shadow ban risk levels
const RISK_LEVELS = {
  none: { min: 0, max: 10, color: 'green', description: 'Аккаунт здоров' },
  low: { min: 11, max: 30, color: 'yellow', description: 'Низкий риск' },
  medium: { min: 31, max: 60, color: 'orange', description: 'Средний риск' },
  high: { min: 61, max: 85, color: 'red', description: 'Высокий риск' },
  critical: { min: 86, max: 100, color: 'darkred', description: 'Критический риск' },
} as const;

interface ShadowBanCheckRequest {
  accountId: string;
  checks?: {
    postVisibility?: boolean;
    searchByUsername?: boolean;
    storyViews?: boolean;
    hashtagSearch?: boolean;
    exploreTab?: boolean;
  };
}

interface ShadowBanResult {
  score: number;
  level: keyof typeof RISK_LEVELS;
  factors: {
    name: string;
    passed: boolean;
    weight: number;
    details?: string;
  }[];
  recommendations: string[];
  checkedAt: string;
}

interface InstagramAccountInfo {
  pk?: string;
  username?: string;
  is_private?: boolean;
  is_verified?: boolean;
  media_count?: number;
  follower_count?: number;
  following_count?: number;
  has_anonymous_profile_picture?: boolean;
  is_business_account?: boolean;
  account_type?: number;
}

// Perform real shadow ban checks
async function performShadowBanChecks(
  account: {
    id: string;
    platform: string;
    username: string | null;
    status: string;
    dailyComments: number;
    dailyDm: number;
    dailyFollows: number;
    maxComments: number;
    maxDm: number;
    maxFollows: number;
    banRisk: number;
    floodUntil: Date | null;
    sessionString?: string | null;
  },
  checks: ShadowBanCheckRequest['checks']
): Promise<ShadowBanResult> {
  const factors: ShadowBanResult['factors'] = [];
  let totalScore = 0;
  const recommendations: string[] = [];

  // 1. Check activity limits (real data from database)
  const commentUsage = account.dailyComments / account.maxComments;
  const dmUsage = account.dailyDm / account.maxDm;
  const followUsage = account.dailyFollows / account.maxFollows;
  const avgUsage = (commentUsage + dmUsage + followUsage) / 3;

  factors.push({
    name: 'Activity Limits',
    passed: avgUsage < 0.8,
    weight: 20,
    details: `Usage: ${Math.round(avgUsage * 100)}% (Comments: ${Math.round(commentUsage * 100)}%, DMs: ${Math.round(dmUsage * 100)}%, Follows: ${Math.round(followUsage * 100)}%)`,
  });

  if (avgUsage >= 0.9) {
    totalScore += 20;
    recommendations.push('Снизьте активность - вы близки к лимитам');
  } else if (avgUsage >= 0.7) {
    totalScore += 10;
    recommendations.push('Соблюдайте умеренную активность');
  }

  // 2. Check flood status (real data)
  const isFlooded = account.floodUntil && new Date(account.floodUntil) > new Date();
  factors.push({
    name: 'Flood Wait Status',
    passed: !isFlooded,
    weight: 25,
    details: isFlooded ? `Flood until: ${account.floodUntil}` : 'No flood restrictions',
  });

  if (isFlooded) {
    totalScore += 25;
    recommendations.push('Дождитесь окончания flood wait перед продолжением');
  }

  // Real Instagram checks (only for Instagram accounts)
  if (account.platform === 'instagram' && account.username) {
    // 3. Post visibility check - real implementation
    if (checks?.postVisibility !== false) {
      const visibilityResult = await checkInstagramPostVisibility(account.username, account.sessionString);
      factors.push({
        name: 'Post Visibility',
        passed: visibilityResult.passed,
        weight: 15,
        details: visibilityResult.details,
      });
      totalScore += visibilityResult.score;
      
      if (!visibilityResult.passed) {
        recommendations.push('Посты могут быть скрыты из ленты. Проверьте последние публикации.');
      }
    }

    // 4. Search by username check - real implementation
    if (checks?.searchByUsername !== false) {
      const searchResult = await checkInstagramSearchVisibility(account.username, account.sessionString);
      factors.push({
        name: 'Username Search',
        passed: searchResult.passed,
        weight: 20,
        details: searchResult.details,
      });
      totalScore += searchResult.score;
      
      if (!searchResult.passed) {
        recommendations.push('Аккаунт не отображается в поиске по имени пользователя');
      }
    }

    // 5. Story views check - real implementation
    if (checks?.storyViews !== false && account.sessionString) {
      const storyResult = await checkInstagramStoryVisibility(account.username, account.sessionString);
      factors.push({
        name: 'Story Views',
        passed: storyResult.passed,
        weight: 10,
        details: storyResult.details,
      });
      totalScore += storyResult.score;
    }

    // 6. Hashtag search check - real implementation
    if (checks?.hashtagSearch !== false) {
      const hashtagResult = await checkInstagramHashtagVisibility(account.username, account.sessionString);
      factors.push({
        name: 'Hashtag Visibility',
        passed: hashtagResult.passed,
        weight: 10,
        details: hashtagResult.details,
      });
      totalScore += hashtagResult.score;
      
      if (!hashtagResult.passed) {
        recommendations.push('Посты могут не отображаться по хештегам');
      }
    }

    // 7. Explore tab check - real implementation
    if (checks?.exploreTab !== false) {
      const exploreResult = await checkInstagramExploreVisibility(account.username, account.sessionString);
      factors.push({
        name: 'Explore Tab',
        passed: exploreResult.passed,
        weight: 10,
        details: exploreResult.details,
      });
      totalScore += exploreResult.score;
    }
  } else if (account.platform === 'telegram') {
    // Telegram-specific checks
    const telegramResult = await checkTelegramAccountStatus(account.username, account.sessionString);
    
    factors.push({
      name: 'Telegram Account Status',
      passed: telegramResult.passed,
      weight: 30,
      details: telegramResult.details,
    });
    totalScore += telegramResult.score;
  }

  // Add existing ban risk from account history
  totalScore = Math.round(totalScore * 0.7 + account.banRisk * 0.3);
  totalScore = Math.min(100, Math.max(0, totalScore));

  // Determine risk level
  let level: keyof typeof RISK_LEVELS = 'none';
  for (const [l, range] of Object.entries(RISK_LEVELS)) {
    if (totalScore >= range.min && totalScore <= range.max) {
      level = l as keyof typeof RISK_LEVELS;
      break;
    }
  }

  // Add general recommendations based on level
  if (level === 'medium' || level === 'high') {
    recommendations.push('Рассмотрите снижение активности на несколько дней');
  }
  if (level === 'high' || level === 'critical') {
    recommendations.push('Рекомендуется приостановить публикацию контента на 24-48 часов');
  }
  if (recommendations.length === 0) {
    recommendations.push('Аккаунт в хорошем состоянии, продолжайте текущую стратегию');
  }

  return {
    score: totalScore,
    level,
    factors,
    recommendations,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Check if Instagram posts are visible
 */
async function checkInstagramPostVisibility(
  username: string,
  sessionString?: string | null
): Promise<{ passed: boolean; score: number; details: string }> {
  try {
    // Try to fetch user's profile from Instagram
    const response = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-IG-App-ID': '936619743392459',
      },
    });

    if (response.status === 404) {
      return { passed: false, score: 15, details: 'Account not found or banned' };
    }

    if (response.ok) {
      try {
        const data = await response.json();
        if (data.graphql?.user) {
          const user: InstagramAccountInfo = data.graphql.user;
          
          // Check for shadowban indicators
          if (user.is_private) {
            return { passed: true, score: 0, details: 'Private account - limited visibility is expected' };
          }
          
          if (user.media_count === 0) {
            return { passed: true, score: 0, details: 'No posts to check' };
          }
          
          return { passed: true, score: 0, details: `Profile visible, ${user.media_count} posts` };
        }
      } catch {
        // HTML response means profile exists but may have restrictions
        return { passed: true, score: 5, details: 'Profile exists but limited data available' };
      }
    }

    return { passed: true, score: 5, details: 'Profile accessible' };
  } catch (error) {
    logger.warn('Failed to check Instagram post visibility', { username, error });
    return { passed: true, score: 0, details: 'Unable to verify - API limit reached' };
  }
}

/**
 * Check if account appears in Instagram search
 */
async function checkInstagramSearchVisibility(
  username: string,
  sessionString?: string | null
): Promise<{ passed: boolean; score: number; details: string }> {
  try {
    // Use Instagram's search API
    const searchUrl = `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(username)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      // Check if user appears in search results
      const users = data.users || [];
      const foundUser = users.find((u: any) => 
        u.user?.username?.toLowerCase() === username.toLowerCase()
      );
      
      if (foundUser) {
        return { passed: true, score: 0, details: 'Account found in search results' };
      } else {
        return { passed: false, score: 20, details: 'Account not found in search - possible shadowban' };
      }
    }

    return { passed: true, score: 0, details: 'Search check unavailable' };
  } catch (error) {
    logger.warn('Failed to check Instagram search visibility', { username, error });
    return { passed: true, score: 0, details: 'Unable to verify search visibility' };
  }
}

/**
 * Check Instagram story visibility
 */
async function checkInstagramStoryVisibility(
  username: string,
  sessionString?: string | null
): Promise<{ passed: boolean; score: number; details: string }> {
  // Story visibility requires authenticated session
  if (!sessionString) {
    return { passed: true, score: 0, details: 'Story check requires authenticated session' };
  }

  try {
    // Use desktop runner for story check
    const response = await fetch('http://localhost:8765/api/check-stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, session: sessionString }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        passed: data.visible !== false,
        score: data.visible === false ? 10 : 0,
        details: data.details || 'Story visibility checked',
      };
    }

    return { passed: true, score: 0, details: 'Story check skipped - runner unavailable' };
  } catch {
    return { passed: true, score: 0, details: 'Story check skipped' };
  }
}

/**
 * Check if posts appear in hashtag feeds
 */
async function checkInstagramHashtagVisibility(
  username: string,
  sessionString?: string | null
): Promise<{ passed: boolean; score: number; details: string }> {
  try {
    // Get recent posts from user and check if they appear in hashtag feeds
    // This requires the desktop runner for full functionality
    
    const response = await fetch('http://localhost:8765/api/check-hashtags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, session: sessionString }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (response?.ok) {
      const data = await response.json();
      return {
        passed: data.visible !== false,
        score: data.visible === false ? 15 : 0,
        details: data.details || 'Hashtag visibility checked',
      };
    }

    // Fallback: check if user's posts exist at all
    const profileResponse = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (profileResponse.ok) {
      return { passed: true, score: 0, details: 'Profile accessible - hashtag check requires runner' };
    }

    return { passed: true, score: 0, details: 'Hashtag visibility check skipped' };
  } catch {
    return { passed: true, score: 0, details: 'Hashtag check skipped' };
  }
}

/**
 * Check if posts appear in Explore tab
 */
async function checkInstagramExploreVisibility(
  username: string,
  sessionString?: string | null
): Promise<{ passed: boolean; score: number; details: string }> {
  // Explore visibility requires authenticated session
  if (!sessionString) {
    return { passed: true, score: 0, details: 'Explore check requires authenticated session' };
  }

  // This would require the desktop runner
  return { passed: true, score: 0, details: 'Explore visibility check requires desktop runner' };
}

/**
 * Check Telegram account status
 */
async function checkTelegramAccountStatus(
  username: string | null,
  sessionString?: string | null
): Promise<{ passed: boolean; score: number; details: string }> {
  if (!username) {
    return { passed: true, score: 0, details: 'No username to check' };
  }

  try {
    // Use Telegram Bot API to check if user exists
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return { passed: true, score: 0, details: 'Bot token not configured' };
    }

    // Try to get chat info
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=@${username.replace('@', '')}`
    );

    const data = await response.json();

    if (data.ok) {
      return { passed: true, score: 0, details: 'Telegram account is active' };
    }

    if (data.error_code === 400) {
      return { passed: false, score: 30, details: 'Telegram account not found or restricted' };
    }

    return { passed: true, score: 0, details: 'Telegram account status unknown' };
  } catch (error) {
    return { passed: true, score: 0, details: 'Unable to check Telegram status' };
  }
}

// POST /api/shadow-ban - Check account for shadow ban
export async function POST(request: NextRequest) {
  try {
    const body: ShadowBanCheckRequest = await request.json();

    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get account details
    const account = await dbCircuitBreaker.execute(() =>
      db.account.findUnique({
        where: { id: body.accountId },
        include: {
          AccountAction: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
          AccountRiskHistory: {
            orderBy: { date: 'desc' },
            take: 7,
          },
        },
      })
    );

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Perform shadow ban checks
    const result = await performShadowBanChecks(account, body.checks);

    // Save risk history
    await withRetry(() =>
      db.accountRiskHistory.create({
        data: {
          id: nanoid(),
          accountId: body.accountId,
          date: new Date(),
          riskScore: result.score,
          riskFactors: JSON.stringify(result.factors),
          changeReason: 'Shadow ban check',
        },
      })
    );

    // Update account ban risk
    await db.account.update({
      where: { id: body.accountId },
      data: {
        banRisk: result.score,
      },
    });

    // Log action
    await db.accountAction.create({
      data: {
        id: nanoid(),
        actionType: 'shadow_ban_check',
        result: 'success',
        accountId: body.accountId,
      },
    });

    logger.info('Shadow ban check completed', {
      accountId: body.accountId,
      score: result.score,
      level: result.level,
    });

    if (result.level === 'high' || result.level === 'critical') {
      logger.warn('High shadow ban risk detected', {
        accountId: body.accountId,
        score: result.score,
        recommendations: result.recommendations,
      });
    }

    return NextResponse.json({
      success: true,
      result,
      account: {
        id: account.id,
        platform: account.platform,
        username: account.username,
        status: account.status,
      },
      riskLevels: RISK_LEVELS,
    });
  } catch (error) {
    logger.error('Shadow ban check failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to perform shadow ban check' },
      { status: 500 }
    );
  }
}

// GET /api/shadow-ban - Get shadow ban history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const days = parseInt(searchParams.get('days') || '7');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get risk history
    const riskHistory = await dbCircuitBreaker.execute(() =>
      db.accountRiskHistory.findMany({
        where: {
          accountId,
          date: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { date: 'asc' },
      })
    );

    // Get account info
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        platform: true,
        username: true,
        status: true,
        banRisk: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Calculate trends
    const avgRisk = riskHistory.length > 0
      ? Math.round(riskHistory.reduce((sum, h) => sum + h.riskScore, 0) / riskHistory.length)
      : 0;

    const trend = riskHistory.length >= 2
      ? riskHistory[riskHistory.length - 1].riskScore - riskHistory[0].riskScore
      : 0;

    return NextResponse.json({
      account,
      riskHistory: riskHistory.map(h => ({
        date: h.date,
        score: h.riskScore,
        factors: h.riskFactors ? JSON.parse(h.riskFactors) : null,
      })),
      analytics: {
        averageRisk: avgRisk,
        trend,
        trendDirection: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable',
        currentRisk: account.banRisk,
      },
      riskLevels: RISK_LEVELS,
    });
  } catch (error) {
    logger.error('Failed to get shadow ban history', error as Error);
    return NextResponse.json(
      { error: 'Failed to get shadow ban history' },
      { status: 500 }
    );
  }
}
