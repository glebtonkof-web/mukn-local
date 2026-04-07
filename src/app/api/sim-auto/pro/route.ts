import { NextRequest, NextResponse } from 'next/server';

// Python backend URL
const PYTHON_BACKEND_URL = process.env.SIM_AUTO_BACKEND_URL || 'http://localhost:8000';

/**
 * Proxy requests to Python SIM Auto-Registration PRO backend
 */

/**
 * GET /api/sim-auto/pro/start
 * Start the 24/365 scheduler
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';

    const response = await fetch(`${PYTHON_BACKEND_URL}/${action === 'status' ? 'status' : action}`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error connecting to Python backend:', error);
    
    // Return fallback status if backend is not running
    return NextResponse.json({
      is_running: false,
      current_task: '',
      total_registrations: 0,
      successful_registrations: 0,
      failed_registrations: 0,
      queue_size: 0,
      message: 'Python backend not running. Start with: python main.py'
    });
  }
}

/**
 * POST /api/sim-auto/pro/register
 * Register account on specific service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, sim_slot, action } = body;

    // Handle different actions
    if (action === 'start') {
      // Start scheduler
      const response = await fetch(`${PYTHON_BACKEND_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (action === 'stop') {
      // Stop scheduler
      const response = await fetch(`${PYTHON_BACKEND_URL}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    // Register account
    const response = await fetch(`${PYTHON_BACKEND_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service,
        sim_slot: sim_slot || 0
      })
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in POST /api/sim-auto/pro:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to Python backend',
        message: 'Start the backend with: cd sim-auto-pro && python main.py'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sim-auto/pro
 * Get accounts, services, or SIMs info
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, service, limit, offset } = body;

    let endpoint = '';
    switch (type) {
      case 'accounts':
        endpoint = `accounts?limit=${limit || 100}&offset=${offset || 0}`;
        if (service) endpoint += `&service=${service}`;
        break;
      case 'services':
        endpoint = 'services';
        break;
      case 'sims':
        endpoint = 'sims';
        break;
      case 'health':
        endpoint = 'health';
        break;
      default:
        endpoint = 'status';
    }

    const response = await fetch(`${PYTHON_BACKEND_URL}/${endpoint}`);
    const data = await response.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in PUT /api/sim-auto/pro:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Python backend' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sim-auto/pro
 * Delete account
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${PYTHON_BACKEND_URL}/accounts/${username}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in DELETE /api/sim-auto/pro:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Python backend' },
      { status: 500 }
    );
  }
}
