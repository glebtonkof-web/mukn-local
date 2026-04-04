// Режим "Спи и зарабатывай" (Full Auto)
// Софт сам: генерирует → публикует → анализирует → корректирует

import { db } from '../db';
import { EventEmitter } from 'events';

export interface FullAutoConfig {
  id?: string;
  name: string;
  postsPerDay: number;
  storiesPerDay: number;
  videosPerWeek: number;
  workHoursStart: string;
  workHoursEnd: string;
  timezone: string;
  platforms: string[];
  influencerIds?: string[];
  campaignIds?: string[];
  userId: string;
}

export interface AutoAction {
  type: 'generate' | 'publish' | 'analyze' | 'adjust';
  content: string;
  scheduledAt: Date;
  executedAt?: Date;
  result?: any;
}

class FullAutoModeService extends EventEmitter {
  private activeModes: Map<string, NodeJS.Timeout> = new Map();
  private checkInterval: number = 60000; // 1 минута

  // Активировать полностью автоматический режим
  async activate(config: FullAutoConfig): Promise<string> {
    let modeId = config.id;

    if (!modeId) {
      const mode = await db.fullAutoMode.create({
        data: {
          name: config.name,
          postsPerDay: config.postsPerDay || 5,
          storiesPerDay: config.storiesPerDay || 3,
          videosPerWeek: config.videosPerWeek || 2,
          workHoursStart: config.workHoursStart || '09:00',
          workHoursEnd: config.workHoursEnd || '22:00',
          timezone: config.timezone || 'Europe/Moscow',
          platforms: JSON.stringify(config.platforms),
          influencerIds: config.influencerIds ? JSON.stringify(config.influencerIds) : null,
          campaignIds: config.campaignIds ? JSON.stringify(config.campaignIds) : null,
          userId: config.userId,
          status: 'active',
        },
      });
      modeId = mode.id;
    } else {
      await db.fullAutoMode.update({
        where: { id: modeId },
        data: { status: 'active' },
      });
    }

    // Запускаем цикл проверки
    this.startAutoLoop(modeId);

    this.emit('activated', { modeId });
    return modeId;
  }

  // Приостановить режим
  async pause(modeId: string): Promise<void> {
    await db.fullAutoMode.update({
      where: { id: modeId },
      data: { status: 'paused' },
    });

    // Останавливаем таймер
    const timer = this.activeModes.get(modeId);
    if (timer) {
      clearInterval(timer);
      this.activeModes.delete(modeId);
    }

    this.emit('paused', { modeId });
  }

  // Основной цикл автоматизации
  private startAutoLoop(modeId: string): void {
    const timer = setInterval(async () => {
      try {
        await this.runAutoCycle(modeId);
      } catch (error) {
        console.error('[FullAuto] Cycle error:', error);
        this.emit('error', { modeId, error });
      }
    }, this.checkInterval);

    this.activeModes.set(modeId, timer);
  }

  // Один цикл автоматизации
  private async runAutoCycle(modeId: string): Promise<void> {
    const mode = await db.fullAutoMode.findUnique({ where: { id: modeId } });
    if (!mode || mode.status !== 'active') return;

    // Проверяем, в рабочее ли время
    if (!this.isWorkingHours(mode.workHoursStart, mode.workHoursEnd, mode.timezone)) {
      return;
    }

    // Получаем статистику за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Проверяем, что нужно сделать
    const actions = await this.planActions(mode, today);

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, mode);
        this.emit('action', { modeId, action: action.type, result });
      } catch (error) {
        console.error(`[FullAuto] Action ${action.type} failed:`, error);
      }
    }
  }

  // Проверка рабочего времени
  private isWorkingHours(start: string, end: string, timezone: string): boolean {
    const now = new Date();
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // Планирование действий
  private async planActions(mode: any, today: Date): Promise<AutoAction[]> {
    const actions: AutoAction[] = [];
    const platforms = JSON.parse(mode.platforms || '[]');

    // Проверяем количество постов за сегодня
    const todayPosts = await db.post.count({
      where: {
        createdAt: { gte: today },
        status: { in: ['published', 'scheduled'] },
      },
    });

    if (todayPosts < mode.postsPerDay) {
      actions.push({
        type: 'generate',
        content: 'post',
        scheduledAt: new Date(),
      });
    }

    // Проверяем stories
    const todayStories = await db.storiesSlides.count({
      where: {
        createdAt: { gte: today },
        status: { in: ['completed', 'published'] },
      },
    });

    if (todayStories < mode.storiesPerDay) {
      actions.push({
        type: 'generate',
        content: 'stories',
        scheduledAt: new Date(),
      });
    }

    // Анализируем эффективность каждые 4 часа
    const lastAnalysis = new Date();
    lastAnalysis.setHours(lastAnalysis.getHours() - 4);

    const recentAnalyses = await db.aIActionLog.count({
      where: {
        action: 'analyze',
        createdAt: { gte: lastAnalysis },
      },
    });

    if (recentAnalyses === 0) {
      actions.push({
        type: 'analyze',
        content: 'performance',
        scheduledAt: new Date(),
      });
    }

    return actions;
  }

  // Выполнение действия
  private async executeAction(action: AutoAction, mode: any): Promise<any> {
    switch (action.type) {
      case 'generate':
        return this.generateContent(action.content, mode);

      case 'publish':
        return this.publishContent(action.content, mode);

      case 'analyze':
        return this.analyzePerformance(mode);

      case 'adjust':
        return this.adjustStrategy(mode);

      default:
        return null;
    }
  }

  // Генерация контента
  private async generateContent(type: string, mode: any): Promise<any> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const platforms = JSON.parse(mode.platforms || '[]');
    const platform = platforms[0] || 'telegram';

    if (type === 'post') {
      // Генерируем идею и контент
      const ideaResponse = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a social media content expert.' },
          { role: 'user', content: 'Generate a viral post idea for today. Topic should be trending and engaging.' },
        ],
      });

      const idea = ideaResponse.choices[0]?.message?.content || 'Daily update';

      const contentResponse = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a professional copywriter.' },
          { role: 'user', content: `Write a ${platform} post based on this idea: "${idea}". Make it engaging and shareable.` },
        ],
      });

      const content = contentResponse.choices[0]?.message?.content || '';

      // Создаём пост
      const post = await db.post.create({
        data: {
          platform,
          content,
          aiGenerated: true,
          aiPrompt: idea,
          status: 'draft',
          influencerId: JSON.parse(mode.influencerIds || '[]')[0],
        },
      });

      // Обновляем статистику
      await db.fullAutoMode.update({
        where: { id: mode.id },
        data: { totalPosts: { increment: 1 } },
      });

      return { postId: post.id, content };
    }

    if (type === 'stories') {
      // Импортируем генератор stories
      const { storiesSlides } = await import('./stories-generator');
      
      const result = await storiesSlides.generate({
        platform: platform as 'instagram' | 'telegram',
        topic: 'Daily update',
        slidesCount: 5,
        includeCta: true,
        ctaText: 'Follow for more!',
      });

      return result;
    }

    return null;
  }

  // Публикация контента
  private async publishContent(contentId: string, mode: any): Promise<any> {
    // TODO: Implement actual publishing via platform APIs
    await db.post.update({
      where: { id: contentId },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    return { published: true, contentId };
  }

  // Анализ эффективности
  private async analyzePerformance(mode: any): Promise<any> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Получаем статистику за вчера
    const posts = await db.post.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
        status: 'published',
      },
    });

    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalEngagement = posts.reduce((sum, p) => sum + p.likes + p.commentsCount, 0);
    const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;

    // Логируем анализ
    await db.aIActionLog.create({
      data: {
        action: 'analyze',
        entityType: 'campaign',
        input: JSON.stringify({ modeId: mode.id }),
        output: JSON.stringify({ totalViews, avgEngagement, postsCount: posts.length }),
        status: 'success',
      },
    });

    return { totalViews, avgEngagement, postsCount: posts.length };
  }

  // Корректировка стратегии
  private async adjustStrategy(mode: any): Promise<any> {
    // Анализируем последние результаты и корректируем подход
    const recentStats = await this.analyzePerformance(mode);

    // TODO: Implement ML-based strategy adjustment

    return { adjusted: true, basedOn: recentStats };
  }

  // Отправить утренний отчёт
  async sendMorningReport(modeId: string): Promise<void> {
    const mode = await db.fullAutoMode.findUnique({ where: { id: modeId } });
    if (!mode) return;

    const { reportSender } = await import('./report-sender');
    
    await reportSender.send(mode.userId);

    await db.fullAutoMode.update({
      where: { id: modeId },
      data: { lastReportAt: new Date() },
    });
  }

  // Получить статус режима
  async getStatus(modeId: string): Promise<{
    status: string;
    totalPosts: number;
    totalRevenue: number;
    totalLeads: number;
    lastActionAt: Date | null;
  }> {
    const mode = await db.fullAutoMode.findUnique({ where: { id: modeId } });
    
    if (!mode) {
      return {
        status: 'not_found',
        totalPosts: 0,
        totalRevenue: 0,
        totalLeads: 0,
        lastActionAt: null,
      };
    }

    return {
      status: mode.status,
      totalPosts: mode.totalPosts,
      totalRevenue: mode.totalRevenue,
      totalLeads: mode.totalLeads,
      lastActionAt: mode.updatedAt,
    };
  }

  // Получить все режимы пользователя
  async getUserModes(userId: string): Promise<any[]> {
    return db.fullAutoMode.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

let fullAutoInstance: FullAutoModeService | null = null;

export function getFullAutoMode(): FullAutoModeService {
  if (!fullAutoInstance) {
    fullAutoInstance = new FullAutoModeService();
  }
  return fullAutoInstance;
}

export const fullAutoMode = {
  activate: (config: FullAutoConfig) => getFullAutoMode().activate(config),
  pause: (id: string) => getFullAutoMode().pause(id),
  getStatus: (id: string) => getFullAutoMode().getStatus(id),
  getUserModes: (userId: string) => getFullAutoMode().getUserModes(userId),
  sendReport: (id: string) => getFullAutoMode().sendMorningReport(id),
};
