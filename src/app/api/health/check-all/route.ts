import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
