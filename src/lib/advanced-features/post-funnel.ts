// Авто-цепочки постов (воронка)
// AI сам пишет сценарий воронки и создаёт все посты

import { db } from '../db';
import { nanoid } from 'nanoid';

export interface FunnelStage {
  order: number;
  type: 'awareness' | 'interest' | 'desire' | 'action';
  content: string;
  delay: number; // часы до следующего этапа
  goal: string;
  cta?: string;
}

export interface FunnelConfig {
  name: string;
  goal: 'lead' | 'sale' | 'subscription' | 'engagement';
  goalUrl?: string;
  platform: string;
  niche?: string;
  stagesCount?: number;
  influencerId?: string;
  campaignId?: string;
}

class PostFunnelService {
  // Создать воронку
  async create(config: FunnelConfig): Promise<{
    id: string;
    stages: FunnelStage[];
  }> {
    const stagesCount = config.stagesCount || 3;

    // Создаём запись воронки
    const funnel = await db.postFunnel.create({
      data: {
        id: nanoid(),
        name: config.name,
        description: `Funnel for ${config.goal}`,
        stages: '[]',
        totalStages: stagesCount,
        goal: config.goal,
        goalUrl: config.goalUrl,
        platform: config.platform,
        campaignId: config.campaignId,
        influencerId: config.influencerId,
        status: 'draft',
        updatedAt: new Date(),
      },
    });

    // Генерируем сценарий воронки
    const stages = await this.generateFunnelScript(config, stagesCount);

    // Обновляем воронку
    await db.postFunnel.update({
      where: { id: funnel.id },
      data: {
        stages: JSON.stringify(stages),
      },
    });

    return {
      id: funnel.id,
      stages,
    };
  }

  // Генерация сценария воронки
  private async generateFunnelScript(config: FunnelConfig, stagesCount: number): Promise<FunnelStage[]> {
    const { getZAI } = await import('@/lib/z-ai');
    const zai = await getZAI();

    const stageTypes: FunnelStage['type'][] = ['awareness', 'interest', 'desire', 'action'];
    const defaultDelays = { awareness: 24, interest: 48, desire: 24, action: 4 };

    const prompt = `Create a ${stagesCount}-stage content funnel for ${config.platform}.

Goal: ${config.goal}
${config.goalUrl ? `Target URL: ${config.goalUrl}` : ''}
${config.niche ? `Niche: ${config.niche}` : ''}

Each stage should progressively move the audience toward the goal.
Use the AIDA framework:
1. Awareness - Grab attention, introduce the topic
2. Interest - Build curiosity, share value
3. Desire - Show benefits, create want
4. Action - Clear call to action

For each stage provide:
- Engaging content (150-300 characters for Telegram, longer for other platforms)
- Delay in hours until next stage
- Goal for this stage
- Call to action

Respond in JSON:
{
  "stages": [
    {
      "type": "awareness",
      "content": "Post content here...",
      "delay": 24,
      "goal": "Get attention",
      "cta": "Stay tuned for more"
    }
  ]
}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a marketing funnel expert and copywriter.' },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';

    let stages: FunnelStage[] = [];

    try {
      const parsed = JSON.parse(content);
      stages = (parsed.stages || []).map((s: any, i: number) => ({
        order: i + 1,
        type: s.type || stageTypes[i] || 'awareness',
        content: s.content || '',
        delay: s.delay || defaultDelays[s.type as keyof typeof defaultDelays] || 24,
        goal: s.goal || '',
        cta: s.cta,
      }));
    } catch {
      // Fallback stages
      for (let i = 0; i < stagesCount; i++) {
        stages.push({
          order: i + 1,
          type: stageTypes[i] || 'awareness',
          content: `Stage ${i + 1} content for ${config.goal} funnel`,
          delay: 24,
          goal: `Move to stage ${i + 2}`,
        });
      }
    }

    return stages;
  }

  // Активировать воронку
  async activate(funnelId: string): Promise<void> {
    await db.postFunnel.update({
      where: { id: funnelId },
      data: {
        status: 'active',
        startedAt: new Date(),
      },
    });
  }

  // Приостановить воронку
  async pause(funnelId: string): Promise<void> {
    await db.postFunnel.update({
      where: { id: funnelId },
      data: { status: 'paused' },
    });
  }

  // Записать прогресс
  async recordProgress(funnelId: string, stage: number, metrics: {
    started?: number;
    completed?: number;
    revenue?: number;
  }): Promise<void> {
    const funnel = await db.postFunnel.findUnique({ where: { id: funnelId } });
    if (!funnel) return;

    const updateData: any = {
      currentStage: stage,
    };

    if (metrics.started) updateData.startedCount = { increment: metrics.started };
    if (metrics.completed) updateData.completedCount = { increment: metrics.completed };
    if (metrics.revenue) updateData.revenue = { increment: metrics.revenue };

    // Пересчитываем конверсию
    if (funnel.startedCount > 0) {
      const totalCompleted = funnel.completedCount + (metrics.completed || 0);
      updateData.conversionRate = (totalCompleted / (funnel.startedCount + (metrics.started || 0))) * 100;
    }

    await db.postFunnel.update({
      where: { id: funnelId },
      data: updateData,
    });
  }

  // Завершить воронку
  async complete(funnelId: string): Promise<void> {
    await db.postFunnel.update({
      where: { id: funnelId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  // Получить воронку
  async getFunnel(funnelId: string): Promise<any | null> {
    const funnel = await db.postFunnel.findUnique({ where: { id: funnelId } });
    if (!funnel) return null;

    return {
      ...funnel,
      stages: JSON.parse(funnel.stages || '[]'),
    };
  }

  // Получить активные воронки
  async getActiveFunnels(): Promise<any[]> {
    const funnels = await db.postFunnel.findMany({
      where: { status: 'active' },
    });

    return funnels.map(f => ({
      ...f,
      stages: JSON.parse(f.stages || '[]'),
    }));
  }

  // Получить статистику воронки
  async getStats(funnelId: string): Promise<{
    startedCount: number;
    completedCount: number;
    conversionRate: number;
    revenue: number;
    avgTimeToComplete: number;
  }> {
    const funnel = await db.postFunnel.findUnique({ where: { id: funnelId } });
    if (!funnel) {
      return {
        startedCount: 0,
        completedCount: 0,
        conversionRate: 0,
        revenue: 0,
        avgTimeToComplete: 0,
      };
    }

    const avgTimeToComplete = funnel.startedAt && funnel.completedAt
      ? (funnel.completedAt.getTime() - funnel.startedAt.getTime()) / (1000 * 60 * 60)
      : 0;

    return {
      startedCount: funnel.startedCount,
      completedCount: funnel.completedCount,
      conversionRate: funnel.conversionRate,
      revenue: funnel.revenue,
      avgTimeToComplete,
    };
  }

  // Оптимизировать воронку на основе данных
  async optimize(funnelId: string): Promise<{
    suggestions: string[];
    recommendedChanges: Array<{ stage: number; change: string }>;
  }> {
    const funnel = await this.getFunnel(funnelId);
    if (!funnel) {
      return { suggestions: [], recommendedChanges: [] };
    }

    const suggestions: string[] = [];
    const recommendedChanges: Array<{ stage: number; change: string }> = [];

    // Анализируем конверсию
    if (funnel.conversionRate < 5) {
      suggestions.push('Низкая конверсия. Рассмотрите упрощение воронки.');
    }

    // Анализируем этапы
    const stages = funnel.stages as FunnelStage[];
    stages.forEach((stage, i) => {
      if (stage.content.length < 50) {
        suggestions.push(`Этап ${i + 1} слишком короткий. Добавьте больше ценности.`);
        recommendedChanges.push({
          stage: i + 1,
          change: 'Расширить контент для лучшего вовлечения',
        });
      }

      if (!stage.cta && i < stages.length - 1) {
        suggestions.push(`Этап ${i + 1} не имеет призыва к действию.`);
        recommendedChanges.push({
          stage: i + 1,
          change: 'Добавить CTA для перехода к следующему этапу',
        });
      }
    });

    return { suggestions, recommendedChanges };
  }

  // Получить все воронки
  async list(limit: number = 20): Promise<any[]> {
    const funnels = await db.postFunnel.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return funnels.map(f => ({
      ...f,
      stages: JSON.parse(f.stages || '[]'),
    }));
  }
}

let funnelInstance: PostFunnelService | null = null;

export function getPostFunnel(): PostFunnelService {
  if (!funnelInstance) {
    funnelInstance = new PostFunnelService();
  }
  return funnelInstance;
}

export const postFunnel = {
  create: (config: FunnelConfig) => getPostFunnel().create(config),
  activate: (id: string) => getPostFunnel().activate(id),
  pause: (id: string) => getPostFunnel().pause(id),
  recordProgress: (id: string, stage: number, metrics: any) => 
    getPostFunnel().recordProgress(id, stage, metrics),
  complete: (id: string) => getPostFunnel().complete(id),
  get: (id: string) => getPostFunnel().getFunnel(id),
  getActive: () => getPostFunnel().getActiveFunnels(),
  getStats: (id: string) => getPostFunnel().getStats(id),
  optimize: (id: string) => getPostFunnel().optimize(id),
  list: (limit?: number) => getPostFunnel().list(limit),
};
