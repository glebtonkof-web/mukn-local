import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get learning patterns with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patternType = searchParams.get('patternType');
    const niche = searchParams.get('niche');
    const geo = searchParams.get('geo');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (patternType) where.patternType = patternType;
    if (niche) where.niche = niche;
    if (geo) where.geo = geo;
    if (activeOnly) where.isActive = true;

    const [patterns, total] = await Promise.all([
      db.learningPattern.findMany({
        where,
        orderBy: [
          { successRate: 'desc' },
          { successCount: 'desc' }
        ],
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { samples: true }
          }
        }
      }),
      db.learningPattern.count({ where })
    ]);

    // Get global stats
    let globalStats = await db.globalLearningStats.findFirst();
    if (!globalStats) {
      globalStats = await db.globalLearningStats.create({
        data: {}
      });
    }

    // Get patterns by type for statistics
    const patternsByType = await db.learningPattern.groupBy({
      by: ['patternType'],
      _count: { id: true },
      _avg: { successRate: true, avgROI: true },
      where: { isActive: true }
    });

    return NextResponse.json({
      success: true,
      patterns: patterns.map(p => ({
        ...p,
        samplesCount: p._count.samples
      })),
      globalStats,
      patternsByType: patternsByType.map(pt => ({
        type: pt.patternType,
        count: pt._count.id,
        avgSuccessRate: pt._avg.successRate || 0,
        avgROI: pt._avg.avgROI || 0
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching learning patterns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch learning patterns' },
      { status: 500 }
    );
  }
}

// POST: Record new sample (success/failure)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patternType,
      patternData,
      inputContext,
      action,
      outcome,
      wasSuccessful,
      revenue = 0,
      conversionRate = 0,
      campaignId,
      influencerId,
      channelId,
      niche,
      geo,
      offerType
    } = body;

    if (!patternType || !patternData) {
      return NextResponse.json(
        { success: false, error: 'patternType and patternData are required' },
        { status: 400 }
      );
    }

    // Find or create pattern
    let pattern = await db.learningPattern.findFirst({
      where: {
        patternType,
        patternData,
        niche: niche || null,
        geo: geo || null,
        offerType: offerType || null
      }
    });

    if (!pattern) {
      pattern = await db.learningPattern.create({
        data: {
          patternType,
          patternData,
          niche,
          geo,
          offerType,
          successCount: wasSuccessful ? 1 : 0,
          failureCount: wasSuccessful ? 0 : 1,
          successRate: wasSuccessful ? 1 : 0,
          avgROI: wasSuccessful ? revenue : 0,
          avgConversion: conversionRate,
          totalRevenue: revenue,
          lastUsedAt: new Date()
        }
      });
    } else {
      // Update existing pattern
      const newSuccessCount = pattern.successCount + (wasSuccessful ? 1 : 0);
      const newFailureCount = pattern.failureCount + (wasSuccessful ? 0 : 1);
      const total = newSuccessCount + newFailureCount;
      const newSuccessRate = total > 0 ? newSuccessCount / total : 0;

      // Calculate running averages
      const totalSamples = pattern.successCount + pattern.failureCount;
      const newAvgROI = wasSuccessful
        ? (pattern.avgROI * pattern.successCount + revenue) / newSuccessCount
        : pattern.avgROI;
      const newAvgConversion = totalSamples > 0
        ? (pattern.avgConversion * totalSamples + conversionRate) / (totalSamples + 1)
        : conversionRate;

      pattern = await db.learningPattern.update({
        where: { id: pattern.id },
        data: {
          successCount: newSuccessCount,
          failureCount: newFailureCount,
          successRate: newSuccessRate,
          avgROI: newAvgROI,
          avgConversion: newAvgConversion,
          totalRevenue: pattern.totalRevenue + revenue,
          lastUsedAt: new Date()
        }
      });
    }

    // Create sample record
    const sample = await db.learningSample.create({
      data: {
        patternId: pattern.id,
        campaignId,
        influencerId,
        channelId,
        inputContext: JSON.stringify(inputContext || {}),
        action: JSON.stringify(action || {}),
        outcome: JSON.stringify(outcome || {}),
        wasSuccessful,
        revenue,
        conversionRate
      }
    });

    // Update global stats
    await db.globalLearningStats.updateMany({
      data: {
        totalSamples: { increment: 1 },
        successfulPatterns: wasSuccessful ? { increment: 1 } : undefined,
        lastLearningAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      pattern,
      sample,
      message: wasSuccessful 
        ? 'Успешный результат записан и добавлен к обучению' 
        : 'Неудачный результат записан для анализа'
    });

  } catch (error) {
    console.error('Error recording learning sample:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record learning sample' },
      { status: 500 }
    );
  }
}

// PUT: Recalculate success rates for all patterns
export async function PUT(request: NextRequest) {
  try {
    const patterns = await db.learningPattern.findMany({
      include: {
        _count: {
          select: { samples: true }
        }
      }
    });

    const updates: Promise<any>[] = [];

    for (const pattern of patterns) {
      const samples = await db.learningSample.findMany({
        where: { patternId: pattern.id }
      });

      if (samples.length === 0) continue;

      const successCount = samples.filter(s => s.wasSuccessful).length;
      const failureCount = samples.length - successCount;
      const successRate = samples.length > 0 ? successCount / samples.length : 0;

      const successfulSamples = samples.filter(s => s.wasSuccessful);
      const avgROI = successfulSamples.length > 0
        ? successfulSamples.reduce((sum, s) => sum + s.revenue, 0) / successfulSamples.length
        : 0;
      
      const avgConversion = samples.reduce((sum, s) => sum + s.conversionRate, 0) / samples.length;
      const totalRevenue = samples.reduce((sum, s) => sum + s.revenue, 0);

      updates.push(
        db.learningPattern.update({
          where: { id: pattern.id },
          data: {
            successCount,
            failureCount,
            successRate,
            avgROI,
            avgConversion,
            totalRevenue
          }
        })
      );
    }

    await Promise.all(updates);

    // Update global stats with best practices
    const topPatterns = await db.learningPattern.findMany({
      where: { isActive: true },
      orderBy: { successRate: 'desc' },
      take: 10
    });

    const bestCommentStyles = topPatterns
      .filter(p => p.patternType === 'comment_style')
      .map(p => ({
        patternData: p.patternData,
        successRate: p.successRate,
        avgROI: p.avgROI
      }));

    const bestTiming = await db.learningPattern.groupBy({
      by: ['niche', 'patternData'],
      where: {
        patternType: 'timing',
        isActive: true
      },
      _avg: { successRate: true }
    });

    await db.globalLearningStats.updateMany({
      data: {
        bestCommentStyles: JSON.stringify(bestCommentStyles),
        bestTimingByNiche: JSON.stringify(bestTiming),
        lastLearningAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      updated: updates.length,
      message: `Пересчитаны метрики для ${updates.length} паттернов`
    });

  } catch (error) {
    console.error('Error recalculating patterns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate patterns' },
      { status: 500 }
    );
  }
}

// PATCH: Get recommendations based on context
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, geo, offerType, patternType, limit = 5 } = body;

    const where: any = {
      isActive: true,
      successRate: { gte: 0.3 } // Minimum 30% success rate
    };

    if (patternType) where.patternType = patternType;
    if (niche) where.niche = { in: [niche, null] };
    if (geo) where.geo = { in: [geo, null] };
    if (offerType) where.offerType = { in: [offerType, null] };

    const recommendations = await db.learningPattern.findMany({
      where,
      orderBy: [
        { successRate: 'desc' },
        { avgROI: 'desc' }
      ],
      take: limit,
      include: {
        samples: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          where: { wasSuccessful: true }
        }
      }
    });

    // Get global stats for context
    const globalStats = await db.globalLearningStats.findFirst();

    // Analyze pattern performance by type
    const analysis = {
      totalPatterns: recommendations.length,
      avgSuccessRate: recommendations.length > 0
        ? recommendations.reduce((sum, r) => sum + r.successRate, 0) / recommendations.length
        : 0,
      topPatternType: patternType || 'all',
      recommendations: recommendations.map(r => ({
        id: r.id,
        patternType: r.patternType,
        patternData: r.patternData,
        successRate: r.successRate,
        avgROI: r.avgROI,
        successCount: r.successCount,
        failureCount: r.failureCount,
        niche: r.niche,
        geo: r.geo,
        recentSuccessSamples: r.samples.map(s => ({
          inputContext: JSON.parse(s.inputContext),
          action: JSON.parse(s.action),
          revenue: s.revenue
        }))
      }))
    };

    return NextResponse.json({
      success: true,
      analysis,
      globalStats,
      context: { niche, geo, offerType, patternType }
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

// DELETE: Remove inactive patterns
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patternId = searchParams.get('patternId');
    const removeInactive = searchParams.get('removeInactive') === 'true';
    const threshold = parseFloat(searchParams.get('threshold') || '0.1');

    if (patternId) {
      // Delete specific pattern and its samples
      await db.learningSample.deleteMany({
        where: { patternId }
      });
      await db.learningPattern.delete({
        where: { id: patternId }
      });

      return NextResponse.json({
        success: true,
        message: 'Паттерн удален'
      });
    }

    if (removeInactive) {
      // Remove patterns with success rate below threshold
      const result = await db.learningPattern.deleteMany({
        where: {
          isActive: true,
          successRate: { lt: threshold },
          successCount: { gte: 5 } // Only remove if we have enough data
        }
      });

      return NextResponse.json({
        success: true,
        removed: result.count,
        message: `Удалено ${result.count} неэффективных паттернов`
      });
    }

    return NextResponse.json(
      { success: false, error: 'Specify patternId or removeInactive=true' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error deleting patterns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete patterns' },
      { status: 500 }
    );
  }
}
