import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/health/check-all - Get health check info
export async function GET() {
  try {
    const accountsCount = await db.account.count();
    const activeCount = await db.account.count({ where: { status: 'active' } });
    const bannedCount = await db.account.count({ where: { status: 'banned' } });
    const warmingCount = await db.account.count({ where: { status: 'warming' } });
    
    return NextResponse.json({
      success: true,
      message: 'Health check overview',
      accounts: {
        total: accountsCount,
        active: activeCount,
        banned: bannedCount,
        warming: warmingCount,
      },
      hint: 'Use POST method to run full health check on all accounts'
    });
  } catch (error) {
    console.error('Error getting health info:', error);
    return NextResponse.json(
      { error: 'Failed to get health info' },
      { status: 500 }
    );
  }
}

// POST /api/health/check-all - Check health of all accounts
export async function POST() {
  try {
    // Get all accounts
    const accounts = await db.account.findMany({
      select: {
        id: true,
        username: true,
        phone: true,
        status: true,
        proxyHost: true,
        proxyPort: true
      }
    });

    const results = {
      total: accounts.length,
      healthy: 0,
      warnings: 0,
      errors: 0,
      checks: [] as Array<{
        id: string;
        username: string | null;
        status: string;
        healthy: boolean;
        message: string;
      }>
    };

    for (const account of accounts) {
      let healthy = true;
      let message = 'OK';

      // Check if account is banned
      if (account.status === 'banned') {
        healthy = false;
        message = 'Аккаунт забанен';
        results.errors++;
      }
      // Check if account is limited
      else if (account.status === 'limited' || account.status === 'flood') {
        healthy = false;
        message = 'Аккаунт имеет ограничения';
        results.warnings++;
      }
      // Check if proxy is configured
      else if (!account.proxyHost || !account.proxyPort) {
        message = 'Прокси не настроен';
        results.warnings++;
      }
      else {
        results.healthy++;
      }

      results.checks.push({
        id: account.id,
        username: account.username,
        status: account.status,
        healthy,
        message
      });
    }

    // Log activity
    await db.activityLog.create({
      data: {
        id: nanoid(),
        type: 'info',
        message: `Проверка здоровья: ${results.healthy} OK, ${results.warnings} предупреждений, ${results.errors} ошибок`
      }
    });

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error checking health:', error);
    return NextResponse.json(
      { error: 'Failed to check health' },
      { status: 500 }
    );
  }
}
