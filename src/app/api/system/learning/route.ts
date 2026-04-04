import { NextRequest, NextResponse } from 'next/server';
import { selfLearningEngine } from '@/lib/self-learning-engine';
import { hypothesisTester } from '@/lib/hypothesis-tester';

// GET /api/system/learning - Получение статуса обучения
export async function GET(request: NextRequest) {
  try {
    const learningStats = selfLearningEngine.getStats();
    const activeHypotheses = hypothesisTester.getActiveHypotheses();
    const completedHypotheses = hypothesisTester.getCompletedHypotheses();

    return NextResponse.json({
      success: true,
      data: {
        learning: {
          stats: learningStats,
        },
        hypotheses: {
          active: activeHypotheses.map(h => ({
            id: h.id,
            name: h.name,
            category: h.category,
            status: h.status,
            trafficPercent: h.trafficPercent,
            metrics: h.metrics,
            results: h.results,
          })),
          completed: completedHypotheses.slice(-20).map(h => ({
            id: h.id,
            name: h.name,
            status: h.status,
            results: h.results,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error getting learning status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get learning status' },
      { status: 500 }
    );
  }
}

// POST /api/system/learning - Операции обучения
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      // Self-Learning
      case 'add_example':
        selfLearningEngine.addExample(params.content);
        return NextResponse.json({ success: true, message: 'Example added' });

      case 'train_model':
        const trainResult = await selfLearningEngine.train();
        return NextResponse.json({ success: trainResult.success, data: trainResult });

      case 'predict_best':
        const bestVariant = await selfLearningEngine.predictBest(params.variants);
        return NextResponse.json({ success: true, data: bestVariant });

      case 'extract_features':
        const features = selfLearningEngine.extractFeatures(params.content);
        return NextResponse.json({ success: true, data: features });

      // Hypothesis Testing
      case 'create_hypothesis':
        const hypothesis = hypothesisTester.createHypothesis(
          params.name,
          params.description,
          params.category,
          params.variants,
          params.trafficPercent
        );
        return NextResponse.json({ success: true, data: hypothesis });

      case 'start_hypothesis':
        hypothesisTester.startHypothesis(params.hypothesis);
        return NextResponse.json({ success: true, message: 'Hypothesis started' });

      case 'pause_hypothesis':
        hypothesisTester.pauseHypothesis(params.hypothesisId);
        return NextResponse.json({ success: true, message: 'Hypothesis paused' });

      case 'resume_hypothesis':
        hypothesisTester.resumeHypothesis(params.hypothesisId);
        return NextResponse.json({ success: true, message: 'Hypothesis resumed' });

      case 'record_hypothesis_event':
        hypothesisTester.recordEvent(
          params.hypothesisId,
          params.variantId,
          params.eventType
        );
        return NextResponse.json({ success: true, message: 'Event recorded' });

      case 'get_variant_for_user':
        const variant = hypothesisTester.getVariantForUser(
          params.hypothesisId,
          params.userId
        );
        return NextResponse.json({ success: true, data: variant });

      case 'generate_hypotheses':
        const generatedHypotheses = await hypothesisTester.generateHypotheses(params.historicalData);
        return NextResponse.json({ success: true, data: generatedHypotheses });

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in learning action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
