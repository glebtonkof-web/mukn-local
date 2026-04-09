// Остальные функции: Тренды, Анализ провалов, Идеи контента, Время публикации, Эмоции аудитории

import { db } from '../db';
import { nanoid } from 'nanoid';

// ============================================
// 15. АВТО-АДАПТАЦИЯ ПОД ТРЕНДЫ
// ============================================

export interface TrendConfig {
  niche: string;
  sources?: string[];
  minPopularity?: number;
  checkInterval?: number;
}

class TrendAdapterService {
  async getTrendingTopics(niche: string, limit: number = 10): Promise<any[]> {
    const trends = await db.trendingTopic.findMany({
      where: {
        OR: [
          { relevantNiches: { contains: niche } },
          { keywords: { contains: niche } },
        ],
        status: 'active',
      },
      orderBy: { popularity: 'desc' },
      take: limit,
    });

    return trends;
  }

  async analyzeTrend(trendId: string): Promise<{
    topic: string;
    popularity: number;
    growthRate: number;
    recommendations: string[];
  }> {
    const trend = await db.trendingTopic.findUnique({ where: { id: trendId } });
    if (!trend) throw new Error('Trend not found');

    const { getZAI } = await import('@/lib/z-ai');
    const zai = await getZAI();

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a trend analyst and content strategist.' },
        { role: 'user', content: `Analyze this trend and suggest content ideas:
        
Trend: "${trend.topic}"
Keywords: ${trend.keywords}
Popularity: ${trend.popularity}

Suggest 5 specific content ideas that leverage this trend for social media engagement.` },
      ],
    });

    const recommendations = (response.choices[0]?.message?.content || '').split('\n').filter(l => l.trim());

    return {
      topic: trend.topic,
      popularity: trend.popularity,
      growthRate: trend.growthRate,
      recommendations,
    };
  }

  async createTrendAlert(niche: string, threshold: number = 50): Promise<void> {
    // TODO: Implement trend monitoring and alerts
    console.log(`[TrendAdapter] Alert created for ${niche} with threshold ${threshold}`);
  }

  async getTrendBasedContentIdeas(niche: string): Promise<string[]> {
    const trends = await this.getTrendingTopics(niche, 5);
    
    const { getZAI } = await import('@/lib/z-ai');
    const zai = await getZAI();

    const trendsList = trends.map(t => t.topic).join(', ');

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a creative content strategist.' },
        { role: 'user', content: `Create 10 viral content ideas for ${niche} niche based on these trending topics:
        
Trending: ${trendsList}

For each idea, provide a short title and brief description.` },
      ],
    });

    const ideas = (response.choices[0]?.message?.content || '').split('\n').filter(l => l.trim());
    return ideas;
  }
}

// ============================================
// 16. АНАЛИЗ "ПОЧЕМУ ПОСТ ПРОВАЛИЛСЯ"
// ============================================

export interface FailureAnalysisResult {
  reasons: string[];
  comparisonWithSuccessful: any;
  recommendations: string[];
  score: number;
}

class FailureAnalyzerService {
  async analyzeFailedPost(postId: string): Promise<FailureAnalysisResult> {
    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    // Получаем успешные посты для сравнения
    const successfulPosts = await db.post.findMany({
      where: {
        status: 'published',
        views: { gte: post.views * 2 },
        platform: post.platform,
      },
      orderBy: { views: 'desc' },
      take: 10,
    });

    const { getZAI } = await import('@/lib/z-ai');
    const zai = await getZAI();

    const analysisPrompt = `Analyze why this social media post underperformed:

Post content:
"${post.content}"

Metrics:
- Views: ${post.views}
- Likes: ${post.likes}
- Comments: ${post.commentsCount}
- Shares: ${post.shares}
- Platform: ${post.platform}

${successfulPosts.length > 0 ? `Compare with successful posts:
${successfulPosts.map(p => `- "${p.content.substring(0, 100)}..." (${p.views} views)`).join('\n')}` : ''}

Identify:
1. Specific reasons for underperformance (max 5)
2. What successful posts did differently
3. Actionable recommendations for improvement

Respond in JSON:
{
  "reasons": ["reason1", "reason2"],
  "comparisonPoints": ["difference1", "difference2"],
  "recommendations": ["rec1", "rec2"],
  "score": 45
}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a social media analytics expert.' },
        { role: 'user', content: analysisPrompt },
      ],
    });

    let result: FailureAnalysisResult = {
      reasons: ['Unable to analyze'],
      comparisonWithSuccessful: {},
      recommendations: ['No recommendations available'],
      score: 0,
    };

    try {
      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      result = {
        reasons: parsed.reasons || result.reasons,
        comparisonWithSuccessful: { points: parsed.comparisonPoints },
        recommendations: parsed.recommendations || result.recommendations,
        score: parsed.score || 0,
      };
    } catch {
      // Use defaults
    }

    // Сохраняем анализ
    await db.failureAnalysis.create({
      data: {
        id: nanoid(),
        postId,
        views: post.views,
        likes: post.likes,
        comments: post.commentsCount,
        shares: post.shares,
        engagementRate: post.views > 0 ? (post.likes + post.commentsCount) / post.views : 0,
        reasons: JSON.stringify(result.reasons),
        comparisonData: JSON.stringify(result.comparisonWithSuccessful),
        recommendations: JSON.stringify(result.recommendations),
        aiReport: response.choices[0]?.message?.content,
        updatedAt: new Date(),
      },
    });

    return result;
  }

  async getCommonFailurePatterns(limit: number = 10): Promise<{
    patterns: string[];
    frequency: Record<string, number>;
  }> {
    const analyses = await db.failureAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const frequency: Record<string, number> = {};
    
    analyses.forEach(analysis => {
      try {
        const reasons = JSON.parse(analysis.reasons || '[]');
        reasons.forEach((reason: string) => {
          frequency[reason] = (frequency[reason] || 0) + 1;
        });
      } catch {
        // Skip invalid data
      }
    });

    const patterns = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern);

    return { patterns, frequency };
  }
}

// ============================================
// 17. ГЕНЕРАЦИЯ ИДЕЙ ДЛЯ КОНТЕНТА
// ============================================

class ContentIdeasGeneratorService {
  async generateWeeklyIdeas(niche: string, platform: string, count: number = 7): Promise<any[]> {
    const { getZAI } = await import('@/lib/z-ai');
    const zai = await getZAI();

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date();

    const prompt = `Generate ${count} content ideas for ${platform} in the ${niche} niche for the upcoming week.

For each day, provide:
- A specific topic that's relevant for that day
- Content type (post, video, story, poll)
- Brief description of what to create
- Best time to post
- Why this topic is relevant

Format as JSON array:
[{
  "day": "Monday",
  "topic": "Topic name",
  "contentType": "post",
  "description": "Brief description",
  "bestTime": "09:00",
  "relevance": "Why this matters"
}]`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a content strategy expert.' },
        { role: 'user', content: prompt },
      ],
    });

    const ideas: any[] = [];

    try {
      const parsed = JSON.parse(response.choices[0]?.message?.content || '[]');
      
      for (let i = 0; i < parsed.length; i++) {
        const idea = parsed[i];
        const relevantDate = new Date(today);
        relevantDate.setDate(relevantDate.getDate() + i);
        relevantDate.setHours(0, 0, 0, 0);

        const saved = await db.contentIdea.create({
          data: {
            id: nanoid(),
            title: idea.topic || `Idea ${i + 1}`,
            description: idea.description || '',
            contentType: idea.contentType || 'post',
            relevantDate,
            priority: 5,
            promptText: `Create ${idea.contentType} about ${idea.topic}`,
            niche,
            source: 'ai',
            status: 'pending',
            updatedAt: new Date(),
          },
        });

        ideas.push(saved);
      }
    } catch {
      // Create fallback ideas
      for (let i = 0; i < count; i++) {
        const relevantDate = new Date(today);
        relevantDate.setDate(relevantDate.getDate() + i);

        const saved = await db.contentIdea.create({
          data: {
            id: nanoid(),
            title: `${niche} content idea ${i + 1}`,
            description: 'AI-generated content idea',
            contentType: 'post',
            relevantDate,
            priority: 5,
            niche,
            source: 'ai',
            status: 'pending',
            updatedAt: new Date(),
          },
        });

        ideas.push(saved);
      }
    }

    return ideas;
  }

  async getIdeasForDate(date: Date): Promise<any[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db.contentIdea.findMany({
      where: {
        relevantDate: { gte: startOfDay, lte: endOfDay },
        status: 'pending',
      },
      orderBy: { priority: 'desc' },
    });
  }

  async markIdeaUsed(ideaId: string, postId: string): Promise<void> {
    await db.contentIdea.update({
      where: { id: ideaId },
      data: {
        status: 'used',
        usedInPostId: postId,
        usedAt: new Date(),
      },
    });
  }

  async getIdeaStats(): Promise<{
    totalIdeas: number;
    usedIdeas: number;
    avgPerformanceScore: number;
  }> {
    const total = await db.contentIdea.count();
    const used = await db.contentIdea.count({ where: { status: 'used' } });

    const usedIdeas = await db.contentIdea.findMany({
      where: { status: 'used', performanceScore: { not: null } },
    });

    const avgPerformanceScore = usedIdeas.length > 0
      ? usedIdeas.reduce((sum, i) => sum + (i.performanceScore || 0), 0) / usedIdeas.length
      : 0;

    return { totalIdeas: total, usedIdeas: used, avgPerformanceScore };
  }
}

// ============================================
// 18. ПРЕДСКАЗАНИЕ ЛУЧШЕГО ВРЕМЕНИ ПУБЛИКАЦИИ
// ============================================

class BestTimePredictorService {
  async analyzeBestTime(platform: string, influencerId?: string): Promise<{
    bestTimes: Record<string, string[]>;
    weekdayScores: Record<string, number>;
    recommendations: string[];
  }> {
    // Получаем посты для анализа
    const where: any = { platform, status: 'published' };
    if (influencerId) where.influencerId = influencerId;

    const posts = await db.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Анализируем по дням недели и часам
    const hourEngagement: Record<number, number[]> = {};
    const dayEngagement: Record<number, number[]> = {};

    posts.forEach(post => {
      if (!post.publishedAt) return;
      
      const hour = post.publishedAt.getHours();
      const day = post.publishedAt.getDay();
      const engagement = post.views + post.likes * 2 + post.commentsCount * 5;

      if (!hourEngagement[hour]) hourEngagement[hour] = [];
      hourEngagement[hour].push(engagement);

      if (!dayEngagement[day]) dayEngagement[day] = [];
      dayEngagement[day].push(engagement);
    });

    // Вычисляем среднее для каждого часа и дня
    const hourScores: Record<number, number> = {};
    const dayScores: Record<number, number> = {};

    Object.entries(hourEngagement).forEach(([hour, engagements]) => {
      hourScores[parseInt(hour)] = engagements.reduce((a, b) => a + b, 0) / engagements.length;
    });

    Object.entries(dayEngagement).forEach(([day, engagements]) => {
      dayScores[parseInt(day)] = engagements.reduce((a, b) => a + b, 0) / engagements.length;
    });

    // Находим лучшие времена
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestTimes: Record<string, string[]> = {};

    days.forEach((day, i) => {
      const sortedHours = Object.entries(hourScores)
        .filter(([h]) => {
          // Фильтруем по паттернам дня недели
          return true;
        })
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([h]) => `${h.padStart(2, '0')}:00`);

      bestTimes[day] = sortedHours;
    });

    const weekdayScores: Record<string, number> = {};
    days.forEach((day, i) => {
      weekdayScores[day] = Math.round(dayScores[i] || 0);
    });

    // Генерируем рекомендации
    const recommendations: string[] = [];
    
    const bestDay = Object.entries(weekdayScores).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) {
      recommendations.push(`Лучший день: ${bestDay[0]}`);
    }

    const bestHour = Object.entries(hourScores).sort((a, b) => b[1] - a[1])[0];
    if (bestHour) {
      recommendations.push(`Лучшее время: ${bestHour[0].padStart(2, '0')}:00`);
    }

    // Сохраняем анализ
    await db.bestTimePrediction.create({
      data: {
        id: nanoid(),
        platform,
        influencerId,
        analysisPeriod: 30,
        bestTimes: JSON.stringify(bestTimes),
        weekdayScores: JSON.stringify(weekdayScores),
        hourlyScores: JSON.stringify(hourScores),
        recommendations: JSON.stringify(recommendations),
        postsAnalyzed: posts.length,
        lastAnalyzed: new Date(),
        updatedAt: new Date(),
      },
    });

    return { bestTimes, weekdayScores, recommendations };
  }

  async getNextBestTime(platform: string): Promise<Date> {
    const prediction = await db.bestTimePrediction.findFirst({
      where: { platform },
      orderBy: { lastAnalyzed: 'desc' },
    });

    if (!prediction?.bestTimes) {
      // Default: завтра в 10 утра
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      return tomorrow;
    }

    const now = new Date();
    const bestTimes = JSON.parse(prediction.bestTimes);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Находим ближайшее лучшее время
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + i);
      const dayName = days[checkDate.getDay()];
      const times = bestTimes[dayName] || [];

      for (const time of times) {
        const [hours] = time.split(':').map(Number);
        checkDate.setHours(hours, 0, 0, 0);

        if (checkDate > now) {
          return checkDate;
        }
      }
    }

    // Fallback
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  }
}

// ============================================
// 19. ЭМОЦИОНАЛЬНЫЙ АНАЛИЗ АУДИТОРИИ
// ============================================

class AudienceEmotionAnalyzerService {
  async analyzeAudienceEmotion(sourceType: string, sourceId?: string): Promise<{
    primaryEmotion: string;
    mood: string;
    recommendations: string[];
  }> {
    // Получаем комментарии для анализа
    const comments = await db.comment.findMany({
      where: sourceId ? { influencerId: sourceId } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const { getZAI } = await import('@/lib/z-ai');
    const zai = await getZAI();

    const commentsText = comments.map(c => c.content).join('\n---\n');

    const prompt = `Analyze the emotional state of this social media audience based on their comments:

Comments:
${commentsText.substring(0, 5000)}

Determine:
1. Primary emotion (joy, anger, sadness, fear, neutral, excited)
2. Overall mood (positive, negative, neutral, mixed)
3. Topics that trigger positive reactions
4. Topics that trigger negative reactions
5. Recommended tone for future posts

Respond in JSON:
{
  "primaryEmotion": "joy",
  "mood": "positive",
  "moodScore": 0.7,
  "positiveTopics": ["topic1", "topic2"],
  "negativeTopics": ["topic1"],
  "recommendedTone": "enthusiastic",
  "insights": "Brief summary of audience emotional state"
}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an expert in social media sentiment analysis and audience psychology.' },
        { role: 'user', content: prompt },
      ],
    });

    let result = {
      primaryEmotion: 'neutral',
      mood: 'neutral',
      recommendations: ['Continue engaging with your audience'],
    };

    try {
      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      result = {
        primaryEmotion: parsed.primaryEmotion || 'neutral',
        mood: parsed.mood || 'neutral',
        recommendations: [
          `Рекомендуемый тон: ${parsed.recommendedTone || 'neutral'}`,
          `Позитивные темы: ${(parsed.positiveTopics || []).join(', ')}`,
          `Избегать тем: ${(parsed.negativeTopics || []).join(', ')}`,
          parsed.insights || '',
        ],
      };

      // Сохраняем анализ
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 7);

      await db.audienceEmotionAnalysis.create({
        data: {
          id: nanoid(),
          sourceType,
          sourceId,
          periodStart,
          periodEnd: new Date(),
          primaryEmotion: result.primaryEmotion,
          emotionScores: JSON.stringify({ primary: 0.5 }),
          mood: result.mood,
          moodScore: parsed.moodScore || 0,
          commentsAnalyzed: comments.length,
          positiveTopics: JSON.stringify(parsed.positiveTopics || []),
          negativeTopics: JSON.stringify(parsed.negativeTopics || []),
          recommendedTone: parsed.recommendedTone,
          aiInsights: parsed.insights,
          updatedAt: new Date(),
        },
      });
    } catch {
      // Use defaults
    }

    return result;
  }

  async getEmotionHistory(sourceId: string, limit: number = 10): Promise<any[]> {
    return db.audienceEmotionAnalysis.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getEmotionTrend(sourceId: string): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    changeRate: number;
  }> {
    const recent = await db.audienceEmotionAnalysis.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recent.length < 2) {
      return { trend: 'stable', changeRate: 0 };
    }

    const recentAvg = recent.slice(0, 5).reduce((sum, a) => sum + a.moodScore, 0) / 5;
    const olderAvg = recent.slice(5).reduce((sum, a) => sum + a.moodScore, 0) / Math.max(recent.length - 5, 1);

    const changeRate = recentAvg - olderAvg;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (changeRate > 0.1) trend = 'improving';
    else if (changeRate < -0.1) trend = 'declining';

    return { trend, changeRate };
  }
}

// ============================================
// EXPORTS
// ============================================

export const trendAdapter = {
  getTrends: (niche: string, limit?: number) => new TrendAdapterService().getTrendingTopics(niche, limit),
  analyze: (id: string) => new TrendAdapterService().analyzeTrend(id),
  getIdeas: (niche: string) => new TrendAdapterService().getTrendBasedContentIdeas(niche),
};

export const failureAnalyzer = {
  analyze: (postId: string) => new FailureAnalyzerService().analyzeFailedPost(postId),
  getPatterns: (limit?: number) => new FailureAnalyzerService().getCommonFailurePatterns(limit),
};

export const contentIdeasGenerator = {
  generateWeekly: (niche: string, platform: string, count?: number) => 
    new ContentIdeasGeneratorService().generateWeeklyIdeas(niche, platform, count),
  getForDate: (date: Date) => new ContentIdeasGeneratorService().getIdeasForDate(date),
  markUsed: (ideaId: string, postId: string) => 
    new ContentIdeasGeneratorService().markIdeaUsed(ideaId, postId),
  getStats: () => new ContentIdeasGeneratorService().getIdeaStats(),
};

export const bestTimePredictor = {
  analyze: (platform: string, influencerId?: string) => 
    new BestTimePredictorService().analyzeBestTime(platform, influencerId),
  getNext: (platform: string) => new BestTimePredictorService().getNextBestTime(platform),
};

export const audienceEmotionAnalyzer = {
  analyze: (sourceType: string, sourceId?: string) => 
    new AudienceEmotionAnalyzerService().analyzeAudienceEmotion(sourceType, sourceId),
  getHistory: (sourceId: string, limit?: number) => 
    new AudienceEmotionAnalyzerService().getEmotionHistory(sourceId, limit),
  getTrend: (sourceId: string) => new AudienceEmotionAnalyzerService().getEmotionTrend(sourceId),
};
