// Отправка отчётов в Telegram / Slack / Discord
// Ежедневные отчёты о статистике, топ-постах, рекомендациях

import { db } from '../db';

export type ReportChannel = 'telegram' | 'slack' | 'discord' | 'email';

export interface ReportConfig {
  channels: {
    telegram?: string;  // Chat ID
    slack?: string;     // Webhook URL
    discord?: string;   // Webhook URL
    email?: string;
  };
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM
    timezone: string;
  };
  content: {
    stats: boolean;
    topPosts: boolean;
    recommendations: boolean;
    errors: boolean;
    revenue: boolean;
  };
}

export interface ReportData {
  date: string;
  stats: {
    postsCreated: number;
    postsPublished: number;
    totalViews: number;
    totalEngagement: number;
    newFollowers: number;
    revenue: number;
  };
  topPosts: Array<{
    id: string;
    platform: string;
    views: number;
    engagement: number;
    preview: string;
  }>;
  recommendations: string[];
  errors: Array<{
    type: string;
    count: number;
    message: string;
  }>;
}

class ReportSenderService {
  // Отправить отчёт
  async sendReport(userId: string, config?: Partial<ReportConfig>): Promise<boolean> {
    const settings = await db.reportSettings.findFirst({
      where: { userId, isActive: true },
    });

    if (!settings && !config) return false;

    // Собираем данные для отчёта
    const reportData = await this.collectReportData(userId);

    // Формируем сообщение
    const message = this.formatReport(reportData);

    // Отправляем в активные каналы
    const results = await Promise.allSettled([
      settings?.telegramChatId ? this.sendToTelegram(settings.telegramChatId, message) : null,
      settings?.slackWebhook ? this.sendToSlack(settings.slackWebhook, message, reportData) : null,
      settings?.discordWebhook ? this.sendToDiscord(settings.discordWebhook, message, reportData) : null,
      settings?.email ? this.sendToEmail(settings.email, message, reportData) : null,
    ]);

    // Обновляем время последней отправки
    if (settings) {
      await db.reportSettings.update({
        where: { id: settings.id },
        data: { lastSentAt: new Date() },
      });
    }

    return results.some(r => r.status === 'fulfilled');
  }

  // Собрать данные для отчёта
  private async collectReportData(userId: string): Promise<ReportData> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Получаем статистику постов
    const posts = await db.post.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
      },
    });

    const postsCreated = posts.length;
    const postsPublished = posts.filter(p => p.status === 'published').length;
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalEngagement = posts.reduce((sum, p) => sum + p.likes + p.commentsCount + p.shares, 0);

    // Топ посты
    const topPosts = posts
      .filter(p => p.status === 'published')
      .sort((a, b) => (b.views + b.likes * 2) - (a.views + a.likes * 2))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        platform: p.platform,
        views: p.views,
        engagement: p.likes + p.commentsCount + p.shares,
        preview: p.content.substring(0, 100),
      }));

    // Ошибки за период
    const errors = await db.aIActionLog.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
        status: 'error',
      },
    });

    const errorGroups: Record<string, { count: number; message: string }> = {};
    errors.forEach(e => {
      const key = e.action;
      if (!errorGroups[key]) {
        errorGroups[key] = { count: 0, message: e.errorMessage || 'Unknown error' };
      }
      errorGroups[key].count++;
    });

    // Рекомендации от AI
    const recommendations = await this.generateRecommendations(userId, {
      postsCreated,
      postsPublished,
      totalViews,
      totalEngagement,
    });

    return {
      date: yesterday.toISOString().split('T')[0],
      stats: {
        postsCreated,
        postsPublished,
        totalViews,
        totalEngagement,
        newFollowers: 0, // TODO: implement
        revenue: 0, // TODO: implement
      },
      topPosts,
      recommendations,
      errors: Object.entries(errorGroups).map(([type, data]) => ({
        type,
        count: data.count,
        message: data.message,
      })),
    };
  }

  // Сформировать текст отчёта
  private formatReport(data: ReportData): string {
    const lines: string[] = [];

    lines.push(`📊 **Отчёт за ${data.date}**\n`);

    lines.push('📈 **Статистика:**');
    lines.push(`• Создано постов: ${data.stats.postsCreated}`);
    lines.push(`• Опубликовано: ${data.stats.postsPublished}`);
    lines.push(`• Всего просмотров: ${data.stats.totalViews.toLocaleString()}`);
    lines.push(`• Общий охват: ${data.stats.totalEngagement.toLocaleString()}`);
    if (data.stats.revenue > 0) {
      lines.push(`• Доход: ${data.stats.revenue.toFixed(2)}₽`);
    }
    lines.push('');

    if (data.topPosts.length > 0) {
      lines.push('🔥 **Топ посты:**');
      data.topPosts.forEach((post, i) => {
        lines.push(`${i + 1}. [${post.platform}] ${post.views} просмотров, ${post.engagement} вовлечённость`);
        lines.push(`   _${post.preview}..._`);
      });
      lines.push('');
    }

    if (data.recommendations.length > 0) {
      lines.push('💡 **Рекомендации:**');
      data.recommendations.forEach(rec => {
        lines.push(`• ${rec}`);
      });
      lines.push('');
    }

    if (data.errors.length > 0) {
      lines.push('⚠️ **Ошибки:**');
      data.errors.forEach(err => {
        lines.push(`• ${err.type}: ${err.count} раз`);
      });
    }

    lines.push('\n_МУКН | Трафик_');

    return lines.join('\n');
  }

  // Отправка в Telegram
  private async sendToTelegram(chatId: string, message: string): Promise<boolean> {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.warn('[ReportSender] Telegram bot token not configured');
        return false;
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('[ReportSender] Telegram error:', error);
      return false;
    }
  }

  // Отправка в Slack
  private async sendToSlack(webhookUrl: string, message: string, data: ReportData): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '📊 Ежедневный отчёт',
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: `Отчёт за ${data.date}` },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Посты:*\n${data.stats.postsCreated} создано` },
                { type: 'mrkdwn', text: `*Просмотры:*\n${data.stats.totalViews.toLocaleString()}` },
                { type: 'mrkdwn', text: `*Охват:*\n${data.stats.totalEngagement.toLocaleString()}` },
                { type: 'mrkdwn', text: `*Опубликовано:*\n${data.stats.postsPublished}` },
              ],
            },
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[ReportSender] Slack error:', error);
      return false;
    }
  }

  // Отправка в Discord
  private async sendToDiscord(webhookUrl: string, message: string, data: ReportData): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '📊 Ежедневный отчёт',
          embeds: [
            {
              title: `Отчёт за ${data.date}`,
              color: 0x6C63FF,
              fields: [
                { name: 'Посты создано', value: String(data.stats.postsCreated), inline: true },
                { name: 'Опубликовано', value: String(data.stats.postsPublished), inline: true },
                { name: 'Просмотры', value: data.stats.totalViews.toLocaleString(), inline: true },
                { name: 'Охват', value: data.stats.totalEngagement.toLocaleString(), inline: true },
              ],
              footer: { text: 'МУКН | Трафик' },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[ReportSender] Discord error:', error);
      return false;
    }
  }

  // Отправка на email
  private async sendToEmail(email: string, message: string, data: ReportData): Promise<boolean> {
    // TODO: Implement email sending via SendGrid or similar
    console.log(`[ReportSender] Email to ${email}: ${message.substring(0, 100)}...`);
    return true;
  }

  // Генерация рекомендаций
  private async generateRecommendations(userId: string, stats: any): Promise<string[]> {
    const recommendations: string[] = [];

    if (stats.postsCreated > 0 && stats.postsPublished / stats.postsCreated < 0.8) {
      recommendations.push('Часть постов не опубликована. Проверьте очередь публикаций.');
    }

    if (stats.totalViews > 0 && stats.totalEngagement / stats.totalViews < 0.05) {
      recommendations.push('Низкая вовлечённость. Попробуйте добавить больше призывов к действию.');
    }

    if (stats.postsCreated < 3) {
      recommendations.push('Мало постов за день. Рассмотрите увеличение частоты публикаций.');
    }

    // Получаем рекомендации по стилю
    try {
      const styleRecs = await db.aIStyleRating.findUnique({
        where: { userId },
      });

      if (styleRecs && styleRecs.overallRating < 50) {
        recommendations.push('AI пока плохо понимает ваш стиль. Дайте больше обратной связи.');
      }
    } catch {
      // Ignore
    }

    if (recommendations.length === 0) {
      recommendations.push('Отличная работа! Продолжайте в том же духе 🎉');
    }

    return recommendations;
  }

  // Настроить отчёты
  async configureReports(userId: string, config: Partial<ReportConfig>): Promise<void> {
    const existing = await db.reportSettings.findFirst({
      where: { userId },
    });

    if (existing) {
      await db.reportSettings.update({
        where: { id: existing.id },
        data: {
          telegramChatId: config.channels?.telegram ?? existing.telegramChatId,
          slackWebhook: config.channels?.slack ?? existing.slackWebhook,
          discordWebhook: config.channels?.discord ?? existing.discordWebhook,
          email: config.channels?.email ?? existing.email,
          scheduleType: config.schedule?.type ?? existing.scheduleType,
          scheduleTime: config.schedule?.time ?? existing.scheduleTime,
          timezone: config.schedule?.timezone ?? existing.timezone,
          includeStats: config.content?.stats ?? existing.includeStats,
          includeTopPosts: config.content?.topPosts ?? existing.includeTopPosts,
          includeRecommendations: config.content?.recommendations ?? existing.includeRecommendations,
          includeErrors: config.content?.errors ?? existing.includeErrors,
          includeRevenue: config.content?.revenue ?? existing.includeRevenue,
        },
      });
    } else {
      await db.reportSettings.create({
        data: {
          userId,
          telegramChatId: config.channels?.telegram,
          slackWebhook: config.channels?.slack,
          discordWebhook: config.channels?.discord,
          email: config.channels?.email,
          scheduleType: config.schedule?.type || 'daily',
          scheduleTime: config.schedule?.time || '09:00',
          timezone: config.schedule?.timezone || 'Europe/Moscow',
          includeStats: config.content?.stats ?? true,
          includeTopPosts: config.content?.topPosts ?? true,
          includeRecommendations: config.content?.recommendations ?? true,
          includeErrors: config.content?.errors ?? true,
          includeRevenue: config.content?.revenue ?? true,
        },
      });
    }
  }

  // Тестовая отправка
  async sendTestReport(userId: string, channel: ReportChannel): Promise<boolean> {
    const testData: ReportData = {
      date: new Date().toISOString().split('T')[0],
      stats: {
        postsCreated: 5,
        postsPublished: 4,
        totalViews: 1250,
        totalEngagement: 85,
        newFollowers: 12,
        revenue: 150.50,
      },
      topPosts: [
        { id: '1', platform: 'telegram', views: 500, engagement: 35, preview: 'Тестовый пост для проверки...' },
      ],
      recommendations: ['Это тестовый отчёт для проверки настроек'],
      errors: [],
    };

    const message = this.formatReport(testData);

    switch (channel) {
      case 'telegram':
        const settings = await db.reportSettings.findFirst({ where: { userId } });
        return settings?.telegramChatId ? this.sendToTelegram(settings.telegramChatId, message) : false;
      case 'slack':
        const slackSettings = await db.reportSettings.findFirst({ where: { userId } });
        return slackSettings?.slackWebhook ? 
          this.sendToSlack(slackSettings.slackWebhook, message, testData) : false;
      case 'discord':
        const discordSettings = await db.reportSettings.findFirst({ where: { userId } });
        return discordSettings?.discordWebhook ? 
          this.sendToDiscord(discordSettings.discordWebhook, message, testData) : false;
      default:
        return false;
    }
  }
}

let reportSenderInstance: ReportSenderService | null = null;

export function getReportSender(): ReportSenderService {
  if (!reportSenderInstance) {
    reportSenderInstance = new ReportSenderService();
  }
  return reportSenderInstance;
}

export const reportSender = {
  send: (userId: string, config?: Partial<ReportConfig>) => getReportSender().sendReport(userId, config),
  configure: (userId: string, config: Partial<ReportConfig>) => getReportSender().configureReports(userId, config),
  test: (userId: string, channel: ReportChannel) => getReportSender().sendTestReport(userId, channel),
};
