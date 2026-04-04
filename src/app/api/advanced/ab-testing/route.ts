// API: A/B Testing for Comments (УРОВЕНЬ 1, функция 4 - A/B тестирование комментариев)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// Comment styles available for testing
const AVAILABLE_STYLES = ['casual', 'expert', 'friendly', 'provocative', 'storytelling', 'humor'] as const;
type CommentStyle = typeof AVAILABLE_STYLES[number];

interface ABTestCreateBody {
  name: string;
  description?: string;
  styles: CommentStyle[];
  variants?: Array<{
    style: CommentStyle;
    comments?: number;
    views?: number;
    clicks?: number;
    conversions?: number;
  }>;
}

interface ABTestUpdateBody {
  testId: string;
  status: 'draft' | 'running' | 'completed';
  winnerStyle?: string;
  winnerReason?: string;
}

// GET: List A/B tests with results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    const status = searchParams.get('status');
    
    if (testId) {
      // Get single test with variants
      const test = await db.commentABTest.findUnique({
        where: { id: testId },
        include: {
          CommentABTestVariant: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
      
      if (!test) {
        return NextResponse.json(
          { error: 'Test not found' },
          { status: 404 }
        );
      }
      
      // Calculate results for each variant
      const variantsWithResults = test.CommentABTestVariant.map(variant => ({
        ...variant,
        conversionRate: variant.views > 0 
          ? (variant.conversions / variant.views) * 100 
          : 0,
        clickRate: variant.views > 0 
          ? (variant.clicks / variant.views) * 100 
          : 0
      }));
      
      // Calculate winner if test is completed or running
      let winner: { style: string; conversionRate: number; reason: string } | null = null;
      if (test.status !== 'draft' && test.CommentABTestVariant.length > 0) {
        winner = calculateWinner(variantsWithResults);
      }
      
      return NextResponse.json({
        success: true,
        test: {
          ...test,
          CommentABTestVariant: variantsWithResults,
          winner,
          overallStats: {
            totalComments: test.totalComments,
            totalViews: test.totalViews,
            totalClicks: test.totalClicks,
            totalConversions: test.totalConversions,
            avgConversionRate: test.totalViews > 0 
              ? (test.totalConversions / test.totalViews) * 100 
              : 0
          }
        }
      });
    }
    
    // List all tests with filters
    const where: any = {};
    if (status) {
      where.status = status;
    }
    
    const tests = await db.commentABTest.findMany({
      where,
      include: {
        CommentABTestVariant: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Add summary for each test
    const testsWithSummary = tests.map(test => ({
      id: test.id,
      name: test.name,
      description: test.description,
      status: test.status,
      styles: JSON.parse(test.styles),
      variantsCount: test.CommentABTestVariant.length,
      totalComments: test.totalComments,
      totalViews: test.totalViews,
      totalClicks: test.totalClicks,
      totalConversions: test.totalConversions,
      winnerStyle: test.winnerStyle,
      startDate: test.startDate,
      endDate: test.endDate,
      createdAt: test.createdAt,
      conversionRate: test.totalViews > 0 
        ? (test.totalConversions / test.totalViews) * 100 
        : 0
    }));
    
    return NextResponse.json({
      success: true,
      tests: testsWithSummary,
      total: tests.length
    });
  } catch (error) {
    console.error('[AB Testing API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get A/B tests' },
      { status: 500 }
    );
  }
}

// POST: Create new A/B test with multiple style variants
export async function POST(request: NextRequest) {
  try {
    const body: ABTestCreateBody = await request.json();
    const { name, description, styles, variants } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }
    
    if (!styles || styles.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 styles are required for A/B testing' },
        { status: 400 }
      );
    }
    
    // Validate styles
    const invalidStyles = styles.filter(s => !AVAILABLE_STYLES.includes(s));
    if (invalidStyles.length > 0) {
      return NextResponse.json(
        { error: `Invalid styles: ${invalidStyles.join(', ')}. Available: ${AVAILABLE_STYLES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Create test with variants
    const test = await db.commentABTest.create({
      data: {
        id: nanoid(),
        name,
        description,
        styles: JSON.stringify(styles),
        status: 'draft',
        updatedAt: new Date(),
        CommentABTestVariant: {
          create: styles.map(style => {
            const variantData = variants?.find(v => v.style === style);
            return {
              id: nanoid(),
              style,
              comments: variantData?.comments ?? 0,
              views: variantData?.views ?? 0,
              clicks: variantData?.clicks ?? 0,
              conversions: variantData?.conversions ?? 0,
              conversionRate: 0
            };
          })
        }
      },
      include: {
        CommentABTestVariant: true
      }
    });
    
    return NextResponse.json({
      success: true,
      test,
      message: `A/B test "${name}" created with ${styles.length} variants`
    });
  } catch (error) {
    console.error('[AB Testing API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create A/B test' },
      { status: 500 }
    );
  }
}

// PUT: Update test status (start/stop) or update metrics
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { testId, status, winnerStyle, winnerReason, variantMetrics } = body;
    
    if (!testId) {
      return NextResponse.json(
        { error: 'Missing required field: testId' },
        { status: 400 }
      );
    }
    
    // Check if test exists
    const existingTest = await db.commentABTest.findUnique({
      where: { id: testId },
      include: { CommentABTestVariant: true }
    });
    
    if (!existingTest) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }
    
    // Update variant metrics if provided
    if (variantMetrics && Array.isArray(variantMetrics)) {
      for (const metric of variantMetrics) {
        if (metric.variantId) {
          const variant = await db.commentABTestVariant.findUnique({
            where: { id: metric.variantId }
          });
          
          if (variant) {
            const newViews = (variant.views || 0) + (metric.viewsIncrement || 0);
            const newConversions = (variant.conversions || 0) + (metric.conversionsIncrement || 0);
            
            await db.commentABTestVariant.update({
              where: { id: metric.variantId },
              data: {
                comments: { increment: metric.commentsIncrement || 0 },
                views: { increment: metric.viewsIncrement || 0 },
                clicks: { increment: metric.clicksIncrement || 0 },
                conversions: { increment: metric.conversionsIncrement || 0 },
                conversionRate: newViews > 0 ? (newConversions / newViews) * 100 : 0
              }
            });
          }
        }
      }
      
      // Update total metrics on test
      const allVariants = await db.commentABTestVariant.findMany({
        where: { abTestId: testId }
      });
      
      const totalComments = allVariants.reduce((sum, v) => sum + v.comments, 0);
      const totalViews = allVariants.reduce((sum, v) => sum + v.views, 0);
      const totalClicks = allVariants.reduce((sum, v) => sum + v.clicks, 0);
      const totalConversions = allVariants.reduce((sum, v) => sum + v.conversions, 0);
      
      await db.commentABTest.update({
        where: { id: testId },
        data: {
          totalComments,
          totalViews,
          totalClicks,
          totalConversions
        }
      });
    }
    
    // Handle status change
    const updateData: any = {};
    
    if (status) {
      if (!['draft', 'running', 'completed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be: draft, running, or completed' },
          { status: 400 }
        );
      }
      
      updateData.status = status;
      
      // Set dates based on status
      if (status === 'running' && !existingTest.startDate) {
        updateData.startDate = new Date();
      }
      
      if (status === 'completed') {
        updateData.endDate = new Date();
        updateData.completedAt = new Date();
        
        // Auto-calculate winner if not provided
        if (!winnerStyle) {
          const variantsWithResults = existingTest.CommentABTestVariant.map(v => ({
            ...v,
            conversionRate: v.views > 0 ? (v.conversions / v.views) * 100 : 0
          }));
          const calculatedWinner = calculateWinner(variantsWithResults);
          if (calculatedWinner) {
            updateData.winnerStyle = calculatedWinner.style;
            updateData.winnerReason = calculatedWinner.reason;
          }
        }
      }
    }
    
    if (winnerStyle) {
      updateData.winnerStyle = winnerStyle;
    }
    
    if (winnerReason) {
      updateData.winnerReason = winnerReason;
    }
    
    // Update the test
    const updatedTest = await db.commentABTest.update({
      where: { id: testId },
      data: updateData,
      include: {
        CommentABTestVariant: true
      }
    });
    
    // Calculate final winner info
    const variantsWithResults = updatedTest.CommentABTestVariant.map(v => ({
      ...v,
      conversionRate: v.views > 0 ? (v.conversions / v.views) * 100 : 0
    }));
    
    return NextResponse.json({
      success: true,
      test: updatedTest,
      winner: updatedTest.status !== 'draft' ? calculateWinner(variantsWithResults) : null,
      message: status ? `Test status updated to "${status}"` : 'Test updated'
    });
  } catch (error) {
    console.error('[AB Testing API] PUT Error:', error);
    return NextResponse.json(
      { error: 'Failed to update A/B test' },
      { status: 500 }
    );
  }
}

// DELETE: Remove A/B test
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    
    if (!testId) {
      return NextResponse.json(
        { error: 'Missing required parameter: testId' },
        { status: 400 }
      );
    }
    
    // Delete test (variants will be cascade deleted)
    await db.commentABTest.delete({
      where: { id: testId }
    });
    
    return NextResponse.json({
      success: true,
      message: 'A/B test deleted successfully'
    });
  } catch (error) {
    console.error('[AB Testing API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete A/B test' },
      { status: 500 }
    );
  }
}

// Helper: Calculate winner based on conversion rates
function calculateWinner(variants: Array<{
  style: string;
  comments: number;
  views: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}>): { style: string; conversionRate: number; reason: string } | null {
  if (variants.length === 0) return null;
  
  // Filter variants with minimum data
  const validVariants = variants.filter(v => v.views >= 10); // Need at least 10 views
  
  if (validVariants.length === 0) {
    // Not enough data, return the one with most comments
    const mostActive = variants.reduce((prev, curr) => 
      prev.comments > curr.comments ? prev : curr
    );
    return {
      style: mostActive.style,
      conversionRate: mostActive.conversionRate,
      reason: 'Most active variant (insufficient data for conversion analysis)'
    };
  }
  
  // Find variant with highest conversion rate
  const winner = validVariants.reduce((prev, curr) => 
    curr.conversionRate > prev.conversionRate ? curr : prev
  );
  
  // Calculate confidence
  const avgConversion = validVariants.reduce((sum, v) => sum + v.conversionRate, 0) / validVariants.length;
  const improvementOverAvg = avgConversion > 0 
    ? ((winner.conversionRate - avgConversion) / avgConversion * 100).toFixed(1)
    : 0;
  
  return {
    style: winner.style,
    conversionRate: winner.conversionRate,
    reason: `Highest conversion rate (${winner.conversionRate.toFixed(2)}%), ${improvementOverAvg}% above average. Based on ${winner.views} views and ${winner.conversions} conversions.`
  };
}
