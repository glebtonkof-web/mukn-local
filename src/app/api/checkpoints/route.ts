/**
 * Checkpoints API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCheckpointService } from '@/lib/checkpoint-service';

const checkpointService = getCheckpointService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await checkpointService.getStats();
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'can-resume') {
      const entityType = searchParams.get('entityType');
      const entityId = searchParams.get('entityId');

      if (!entityType || !entityId) {
        return NextResponse.json({
          success: false,
          error: 'entityType and entityId required'
        }, { status: 400 });
      }

      const result = await checkpointService.canResume(entityType, entityId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'active-registrations') {
      const registrations = await checkpointService.getActiveRegistrations();
      return NextResponse.json({ success: true, registrations });
    }

    // Get checkpoints for entity
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (entityType && entityId) {
      const checkpoints = await checkpointService.getAll(entityType, entityId);
      return NextResponse.json({ success: true, checkpoints });
    }

    // Get latest checkpoint
    if (entityType && entityId) {
      const latest = await checkpointService.getLatest(entityType, entityId);
      return NextResponse.json({ success: true, checkpoint: latest });
    }

    return NextResponse.json({
      success: false,
      error: 'Specify action or entityType/entityId'
    }, { status: 400 });
  } catch (error: any) {
    console.error('Checkpoints GET error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'save') {
      const { entityType, entityId, stepName, stepNumber, totalSteps, data, expiresIn } = body;

      if (!entityType || !entityId || !stepName) {
        return NextResponse.json({
          success: false,
          error: 'entityType, entityId, stepName required'
        }, { status: 400 });
      }

      const checkpoint = await checkpointService.save(
        entityType,
        entityId,
        stepName,
        stepNumber || 0,
        totalSteps || 0,
        data,
        { expiresIn }
      );

      return NextResponse.json({ success: true, checkpoint });
    }

    if (action === 'complete') {
      const { entityType, entityId, stepName } = body;
      const result = await checkpointService.complete(entityType, entityId, stepName);
      return NextResponse.json({ success: result });
    }

    if (action === 'fail') {
      const { entityType, entityId, stepName, error, canResume } = body;
      const result = await checkpointService.fail(entityType, entityId, stepName, error, canResume);
      return NextResponse.json({ success: result });
    }

    if (action === 'clear') {
      const { entityType, entityId } = body;
      const deleted = await checkpointService.clear(entityType, entityId);
      return NextResponse.json({ success: true, deleted });
    }

    if (action === 'cleanup-expired') {
      const deleted = await checkpointService.cleanupExpired();
      return NextResponse.json({ success: true, deleted });
    }

    if (action === 'create-registration') {
      const { simCardId, platform, deviceId, steps } = body;
      const sessionId = await checkpointService.createRegistrationSession(
        simCardId,
        platform,
        deviceId,
        steps
      );
      return NextResponse.json({ success: true, sessionId });
    }

    if (action === 'update-registration') {
      const { sessionId, stepName, stepNumber, totalSteps, data } = body;
      await checkpointService.updateRegistrationProgress(
        sessionId,
        stepName,
        stepNumber,
        totalSteps,
        data
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error: any) {
    console.error('Checkpoints POST error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
