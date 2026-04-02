import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getHealthStatus } from '@/lib/resilience';

// GET /api/health - Health check endpoint для мониторинга
export async function GET() {
  try {
    const health = await getHealthStatus(db);
    
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: String(error),
    }, { status: 503 });
  }
}

// HEAD /api/health - Быстрая проверка для load balancer
export async function HEAD() {
  try {
    await db.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
