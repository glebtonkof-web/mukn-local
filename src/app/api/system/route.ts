/**
 * API для управления системой
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeSystem, getSystemStatus, shutdownSystem } from '@/lib/bootstrap';

/**
 * GET - Получить статус системы
 */
export async function GET(request: NextRequest) {
  try {
    const status = await getSystemStatus();
    
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Управление системой
 * 
 * Body:
 * - action: 'start' | 'stop' | 'restart'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        await initializeSystem();
        return NextResponse.json({
          success: true,
          message: 'Система запущена'
        });

      case 'stop':
        await shutdownSystem();
        return NextResponse.json({
          success: true,
          message: 'Система остановлена'
        });

      case 'restart':
        await shutdownSystem();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await initializeSystem();
        return NextResponse.json({
          success: true,
          message: 'Система перезапущена'
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Use: start, stop, restart`
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
