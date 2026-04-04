import { NextRequest, NextResponse } from 'next/server';
import { suspicionHandler } from '@/lib/suspicion-handler';
import { accountRotation } from '@/lib/account-rotation';
import { timezoneDistribution } from '@/lib/timezone-distribution';

// GET /api/system/antiban - Получение статуса анти-бан системы
export async function GET(request: NextRequest) {
  try {
    const suspicionStatus = suspicionHandler.getStatus();
    const rotationStats = accountRotation.getStats();
    const rotationStates = accountRotation.getAllAccountStates();
    const timezoneStats = timezoneDistribution.getStats();

    return NextResponse.json({
      success: true,
      data: {
        suspicion: {
          level: suspicionStatus.level,
          score: suspicionStatus.score,
          signals: suspicionStatus.signals,
          behavior: suspicionStatus.behavior,
        },
        rotation: {
          stats: rotationStats,
          accounts: rotationStates.map(a => ({
            id: a.id,
            status: a.status,
            actionsToday: a.actionsToday,
            exhaustionLevel: a.exhaustionLevel,
          })),
          shifts: accountRotation.getShifts(),
        },
        timezone: {
          stats: timezoneStats,
        },
      },
    });
  } catch (error) {
    console.error('Error getting antiban status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get antiban status' },
      { status: 500 }
    );
  }
}

// POST /api/system/antiban - Операции анти-бан системы
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'report_signal':
        suspicionHandler.reportSignal(params.signalType, params.count);
        return NextResponse.json({ success: true, message: 'Signal reported' });

      case 'force_reduce_suspicion':
        suspicionHandler.forceReduce(params.factor);
        return NextResponse.json({ success: true, message: 'Suspicion reduced' });

      case 'reset_suspicion':
        suspicionHandler.reset();
        return NextResponse.json({ success: true, message: 'Suspicion reset' });

      case 'register_account':
        accountRotation.registerAccount(
          params.accountId,
          params.shifts
        );
        return NextResponse.json({ success: true, message: 'Account registered' });

      case 'unregister_account':
        accountRotation.unregisterAccount(params.accountId);
        return NextResponse.json({ success: true, message: 'Account unregistered' });

      case 'set_account_rest':
        accountRotation.setAccountRest(params.accountId, params.duration);
        return NextResponse.json({ success: true, message: 'Account set to rest' });

      case 'mark_account_banned':
        accountRotation.markAccountBanned(params.accountId);
        return NextResponse.json({ success: true, message: 'Account marked as banned' });

      case 'recover_account':
        accountRotation.recoverAccount(params.accountId);
        return NextResponse.json({ success: true, message: 'Account recovered' });

      case 'register_timezone_account':
        timezoneDistribution.registerAccount(
          params.accountId,
          params.timezone,
          params.schedule
        );
        return NextResponse.json({ success: true, message: 'Timezone account registered' });

      case 'get_active_accounts':
        const activeAccounts = timezoneDistribution.getActiveAccounts();
        return NextResponse.json({ success: true, data: activeAccounts });

      case 'get_accounts_for_action':
        const accountsForAction = timezoneDistribution.getAccountsForAction(params.count || 1);
        return NextResponse.json({ success: true, data: accountsForAction });

      case 'get_best_publish_time':
        const bestTime = timezoneDistribution.getBestPublishTime(params.accountId);
        return NextResponse.json({ success: true, data: bestTime });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in antiban action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
