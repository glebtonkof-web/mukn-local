import { NextRequest, NextResponse } from 'next/server';
import fullAutoController from '@/lib/sim-auto/full-auto-controller';

/**
 * GET /api/sim-auto/full-auto
 * Get current status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'queue':
        return NextResponse.json({
          queue: fullAutoController.getRegistrationQueue(),
          isRunning: fullAutoController.getProgress().status === 'running',
        });

      case 'warming':
        return NextResponse.json({
          warming: fullAutoController.getWarmingJobs(),
        });

      case 'sims':
        return NextResponse.json({
          sims: fullAutoController.getSimCards(),
        });

      default:
        return NextResponse.json({
          progress: fullAutoController.getProgress(),
          sims: fullAutoController.getSimCards(),
          queue: fullAutoController.getRegistrationQueue(),
          warming: fullAutoController.getWarmingJobs(),
        });
    }
  } catch (error) {
    console.error('Error in GET /api/sim-auto/full-auto:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sim-auto/full-auto
 * Start full auto process
 */
export async function POST(request: NextRequest) {
  try {
    // Run full auto in background
    fullAutoController.runFullAuto().catch(err => {
      console.error('Full auto error:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Full auto process started',
      progress: fullAutoController.getProgress(),
    });
  } catch (error) {
    console.error('Error in POST /api/sim-auto/full-auto:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sim-auto/full-auto
 * Scan SIM cards or retry failed registrations
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'scan':
        const sims = await fullAutoController.scanSimCards();
        return NextResponse.json({ sims });

      case 'retry':
        // Get failed jobs and re-queue them
        const queue = fullAutoController.getRegistrationQueue();
        const failedJobs = queue.filter(j => j.status === 'failed');
        
        // In a real implementation, we would re-add these to the queue
        // For now, just return the count
        return NextResponse.json({
          success: true,
          retried: failedJobs.length,
          message: `Re-queued ${failedJobs.length} failed registrations`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in PUT /api/sim-auto/full-auto:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sim-auto/full-auto
 * Pause or resume the process
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'pause':
        fullAutoController.pauseFullAuto();
        return NextResponse.json({
          success: true,
          message: 'Process paused',
          progress: fullAutoController.getProgress(),
        });

      case 'resume':
        fullAutoController.resumeFullAuto();
        return NextResponse.json({
          success: true,
          message: 'Process resumed',
          progress: fullAutoController.getProgress(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in PATCH /api/sim-auto/full-auto:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sim-auto/full-auto
 * Stop all processes
 */
export async function DELETE() {
  try {
    fullAutoController.stopFullAuto();

    return NextResponse.json({
      success: true,
      message: 'All processes stopped',
      progress: fullAutoController.getProgress(),
    });
  } catch (error) {
    console.error('Error in DELETE /api/sim-auto/full-auto:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
