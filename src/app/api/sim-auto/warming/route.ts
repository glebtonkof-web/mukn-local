/**
 * API Routes for Account Warming Management
 * Handles start/stop warming, status checks, and warming logs
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startWarming,
  stopWarming,
  getWarmingStatus,
  getActiveWarmingSessions,
  getWarmingLogs,
  executeWarmingActionWithCheck,
  type WarmingConfig,
  type WarmingStatus,
} from '@/lib/sim-auto/warming-manager';
import { type WarmingAction, type ActionResult } from '@/lib/sim-auto/action-executor';
import {
  getWarmingStrategy,
  getCurrentPhase,
  calculateProgress,
  isTrafficReady,
  generateDailyActionPlan,
  PLATFORM_STRATEGIES,
} from '@/lib/sim-auto/warming-strategies';
import {
  randomDelay,
  generateRandomSchedule,
  simulateTyping,
  simulateReading,
} from '@/lib/sim-auto/behavior-simulator';
import { db } from '@/lib/db';

/**
 * GET /api/sim-auto/warming
 * Get warming status, logs, or available platforms
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'status';
  const accountId = searchParams.get('accountId');
  const platform = searchParams.get('platform');

  try {
    switch (action) {
      case 'status':
        // Get status for specific account or all active sessions
        if (accountId) {
          const status = await getWarmingStatus(accountId);
          return NextResponse.json({
            success: true,
            data: status,
          });
        } else {
          // Return all active warming sessions
          const sessions = getActiveWarmingSessions();
          return NextResponse.json({
            success: true,
            data: {
              activeSessions: sessions,
              totalActive: sessions.length,
            },
          });
        }

      case 'logs':
        // Get warming logs for an account
        if (!accountId) {
          return NextResponse.json(
            { success: false, error: 'accountId is required for logs' },
            { status: 400 }
          );
        }
        const limit = parseInt(searchParams.get('limit') || '100');
        const logs = await getWarmingLogs(accountId, limit);
        return NextResponse.json({
          success: true,
          data: logs,
        });

      case 'platforms':
        // Get available platforms and their strategies
        const platforms = Object.keys(PLATFORM_STRATEGIES).map((p) => {
          const strategy = getWarmingStrategy(p);
          return {
            platform: p,
            totalDays: strategy?.totalDays || 0,
            phases: strategy?.phases.length || 0,
            proxyTypes: strategy?.proxyRequirements.types || [],
          };
        });
        return NextResponse.json({
          success: true,
          data: platforms,
        });

      case 'strategy':
        // Get detailed strategy for a platform
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'platform is required for strategy' },
            { status: 400 }
          );
        }
        const strategy = getWarmingStrategy(platform);
        if (!strategy) {
          return NextResponse.json(
            { success: false, error: `No strategy found for platform ${platform}` },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          data: strategy,
        });

      case 'plan':
        // Get action plan for a specific day
        if (!platform) {
          return NextResponse.json(
            { success: false, error: 'platform is required for plan' },
            { status: 400 }
          );
        }
        const day = parseInt(searchParams.get('day') || '1');
        const plan = generateDailyActionPlan(platform, day);
        const phase = getCurrentPhase(platform, day);
        const progress = calculateProgress(platform, day);
        return NextResponse.json({
          success: true,
          data: {
            day,
            phase,
            progress,
            actionPlan: plan,
            isTrafficReady: isTrafficReady(platform, day),
          },
        });

      case 'simulate':
        // Simulate timing for testing
        const text = searchParams.get('text') || 'Sample text for simulation';
        const typeTime = simulateTyping(text);
        const readTime = simulateReading(text);
        return NextResponse.json({
          success: true,
          data: {
            text,
            typingTime: typeTime,
            readingTime: readTime,
            randomDelay: randomDelay(1000, 5000),
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Warming API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sim-auto/warming
 * Start, stop, or execute actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, accountId, config, warmingAction } = body;

    switch (action) {
      case 'start':
        // Start warming for an account
        if (!accountId) {
          return NextResponse.json(
            { success: false, error: 'accountId is required' },
            { status: 400 }
          );
        }
        const startResult = await startWarming(accountId, config as Partial<WarmingConfig>);
        return NextResponse.json({
          success: true,
          data: startResult,
          message: `Warming started for account ${accountId}`,
        });

      case 'stop':
        // Stop warming for an account
        if (!accountId) {
          return NextResponse.json(
            { success: false, error: 'accountId is required' },
            { status: 400 }
          );
        }
        const stopResult = await stopWarming(accountId);
        return NextResponse.json({
          success: true,
          data: stopResult,
          message: `Warming stopped for account ${accountId}`,
        });

      case 'pause':
        // Pause warming (alias for stop)
        if (!accountId) {
          return NextResponse.json(
            { success: false, error: 'accountId is required' },
            { status: 400 }
          );
        }
        const pauseResult = await stopWarming(accountId);
        return NextResponse.json({
          success: true,
          data: pauseResult,
          message: `Warming paused for account ${accountId}`,
        });

      case 'resume':
        // Resume warming for paused account
        if (!accountId) {
          return NextResponse.json(
            { success: false, error: 'accountId is required' },
            { status: 400 }
          );
        }
        // Resume is same as start for paused accounts
        const resumeResult = await startWarming(accountId, config as Partial<WarmingConfig>);
        return NextResponse.json({
          success: true,
          data: resumeResult,
          message: `Warming resumed for account ${accountId}`,
        });

      case 'execute':
        // Execute a specific warming action
        if (!accountId || !warmingAction) {
          return NextResponse.json(
            { success: false, error: 'accountId and warmingAction are required' },
            { status: 400 }
          );
        }
        const actionResult = await executeWarmingActionWithCheck(accountId, warmingAction);
        return NextResponse.json({
          success: true,
          data: actionResult,
          message: actionResult.success
            ? `Action ${warmingAction.type} executed successfully`
            : `Action ${warmingAction.type} failed: ${actionResult.error}`,
        });

      case 'batch':
        // Execute multiple actions
        if (!accountId || !body.actions || !Array.isArray(body.actions)) {
          return NextResponse.json(
            { success: false, error: 'accountId and actions array are required' },
            { status: 400 }
          );
        }
        const results: ActionResult[] = [];
        for (const act of body.actions) {
          const result = await executeWarmingActionWithCheck(accountId, act as WarmingAction);
          results.push(result);
          if (!result.success && config?.pauseOnError) {
            break;
          }
          // Delay between batch actions
          await new Promise((resolve) =>
            setTimeout(resolve, randomDelay(2000, 5000))
          );
        }
        return NextResponse.json({
          success: true,
          data: {
            total: body.actions.length,
            executed: results.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            results,
          },
        });

      case 'create-account':
        // Create a new warming account
        const { platform: newPlatform, username, phone, email, password, proxyConfig } = body;
        if (!newPlatform) {
          return NextResponse.json(
            { success: false, error: 'platform is required' },
            { status: 400 }
          );
        }
        const newAccount = await db.account.create({
          data: {
            id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            platform: newPlatform,
            username: username || null,
            phone: phone || null,
            email: email || null,
            password: password || null,
            proxyType: proxyConfig?.type || null,
            proxyHost: proxyConfig?.host || null,
            proxyPort: proxyConfig?.port || null,
            proxyUsername: proxyConfig?.username || null,
            proxyPassword: proxyConfig?.password || null,
            status: 'pending',
            banRisk: 0,
            warmingProgress: 0,
            userId: 'system', // System account
            updatedAt: new Date(),
          },
        });
        return NextResponse.json({
          success: true,
          data: newAccount,
          message: `Account created with ID ${newAccount.id}`,
        });

      case 'update-account':
        // Update account settings
        if (!accountId) {
          return NextResponse.json(
            { success: false, error: 'accountId is required' },
            { status: 400 }
          );
        }
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (body.proxyConfig) {
          updateData.proxyType = body.proxyConfig.type;
          updateData.proxyHost = body.proxyConfig.host;
          updateData.proxyPort = body.proxyConfig.port;
          updateData.proxyUsername = body.proxyConfig.username;
          updateData.proxyPassword = body.proxyConfig.password;
        }
        if (body.sessionData) {
          updateData.sessionData = JSON.stringify(body.sessionData);
        }
        const updatedAccount = await db.account.update({
          where: { id: accountId },
          data: updateData,
        });
        return NextResponse.json({
          success: true,
          data: updatedAccount,
          message: `Account ${accountId} updated`,
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Warming API POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sim-auto/warming
 * Delete a warming account or clear logs
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId');
  const clearLogs = searchParams.get('clearLogs') === 'true';

  if (!accountId) {
    return NextResponse.json(
      { success: false, error: 'accountId is required' },
      { status: 400 }
    );
  }

  try {
    // Stop warming if active
    try {
      await stopWarming(accountId);
    } catch {
      // Ignore if not warming
    }

    if (clearLogs) {
      // Clear action logs
      await db.accountAction.deleteMany({
        where: { accountId },
      });
      return NextResponse.json({
        success: true,
        message: `Logs cleared for account ${accountId}`,
      });
    }

    // Delete account
    await db.accountAction.deleteMany({
      where: { accountId },
    });
    await db.account.delete({
      where: { id: accountId },
    });

    return NextResponse.json({
      success: true,
      message: `Account ${accountId} deleted`,
    });
  } catch (error) {
    console.error('Warming API DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
