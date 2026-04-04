import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET: Получить достижения пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    // Получить все достижения с прогрессом пользователя
    if (userId) {
      // В реальном приложении - запрос из БД
      // Пока возвращаем моковые данные
      const achievements = [
        {
          id: 'first_comment',
          name: 'Первый комментарий',
          description: 'Опубликуйте свой первый комментарий',
          category: 'engagement',
          points: 10,
          requirement: 1,
          progress: 1,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
          tier: 'bronze',
        },
        {
          id: 'comments_100',
          name: 'Комментатор',
          description: 'Опубликуйте 100 комментариев',
          category: 'engagement',
          points: 50,
          requirement: 100,
          progress: 45,
          unlocked: false,
          tier: 'silver',
        },
        {
          id: 'first_lead',
          name: 'Первый лид',
          description: 'Получите первого лида',
          category: 'revenue',
          points: 20,
          requirement: 1,
          progress: 1,
          unlocked: true,
          unlockedAt: new Date().toISOString(),
          tier: 'bronze',
        },
        {
          id: 'revenue_1000',
          name: 'Тысячник',
          description: 'Заработайте 1000₽',
          category: 'revenue',
          points: 100,
          requirement: 1000,
          progress: 540,
          unlocked: false,
          tier: 'silver',
        },
      ];

      // Получить уровень пользователя
      const totalPoints = achievements
        .filter((a: any) => a.unlocked)
        .reduce((sum: number, a: any) => sum + a.points, 0);

      const levels = [
        { level: 1, title: 'Новичок', minPoints: 0, maxPoints: 99 },
        { level: 2, title: 'Участник', minPoints: 100, maxPoints: 249 },
        { level: 3, title: 'Активист', minPoints: 250, maxPoints: 499 },
        { level: 4, title: 'Эксперт', minPoints: 500, maxPoints: 999 },
        { level: 5, title: 'Мастер', minPoints: 1000, maxPoints: 1999 },
        { level: 6, title: 'Легенда', minPoints: 2000, maxPoints: Infinity },
      ];

      const userLevel = levels.find(l => totalPoints >= l.minPoints && totalPoints <= l.maxPoints) || levels[0];
      const nextLevel = levels.find(l => l.level === userLevel.level + 1);

      return NextResponse.json({
        achievements,
        stats: {
          totalPoints,
          unlockedCount: achievements.filter((a: any) => a.unlocked).length,
          totalCount: achievements.length,
        },
        level: {
          ...userLevel,
          nextLevel: nextLevel || null,
          pointsToNext: nextLevel ? nextLevel.minPoints - totalPoints : 0,
        },
      });
    }

    // Получить таблицу лидеров
    if (action === 'leaderboard') {
      const category = searchParams.get('category') || 'points';
      const limit = parseInt(searchParams.get('limit') || '10');

      // Моковые данные лидерборда
      const leaderboard = [
        { rank: 1, userId: '1', userName: 'CryptoMaster', points: 5420, level: 6, levelTitle: 'Легенда', achievements: 18, revenue: 125000 },
        { rank: 2, userId: '2', userName: 'TrafficKing', points: 4850, level: 5, levelTitle: 'Мастер', achievements: 16, revenue: 98000 },
        { rank: 3, userId: '3', userName: 'AI_Guru', points: 4200, level: 5, levelTitle: 'Мастер', achievements: 14, revenue: 87500 },
      ];

      return NextResponse.json({ leaderboard, category, limit });
    }

    // Получить статистику достижений
    if (action === 'stats') {
      const stats = {
        totalUsers: 1234,
        totalAchievementsUnlocked: 15678,
        mostPopularAchievement: 'first_comment',
        averageUserLevel: 2.5,
        topCategories: [
          { category: 'engagement', count: 5234 },
          { category: 'revenue', count: 3456 },
          { category: 'growth', count: 2345 },
        ],
      };

      return NextResponse.json(stats);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Achievements GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Обновить прогресс достижения
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, achievementId, progress } = body;

    if (!userId || !achievementId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Определения достижений
    const achievementDefinitions: Record<string, any> = {
      first_comment: { requirement: 1, points: 10 },
      comments_100: { requirement: 100, points: 50 },
      comments_1000: { requirement: 1000, points: 200 },
      first_lead: { requirement: 1, points: 20 },
      revenue_1000: { requirement: 1000, points: 100 },
      revenue_10000: { requirement: 10000, points: 500 },
      first_campaign: { requirement: 1, points: 15 },
      influencers_10: { requirement: 10, points: 100 },
      accounts_50: { requirement: 50, points: 200 },
      no_ban_7days: { requirement: 7, points: 50 },
      no_ban_30days: { requirement: 30, points: 200 },
      first_ai_content: { requirement: 1, points: 15 },
      ai_content_100: { requirement: 100, points: 100 },
      ai_content_1000: { requirement: 1000, points: 500 },
    };

    const achievement = achievementDefinitions[achievementId];
    if (!achievement) {
      return NextResponse.json({ error: 'Unknown achievement' }, { status: 400 });
    }

    const unlocked = progress >= achievement.requirement;

    // В реальном приложении - сохранение в БД
    // await db.userAchievement.upsert({...})

    const response = {
      achievementId,
      progress,
      unlocked,
      points: unlocked ? achievement.points : 0,
      unlockedAt: unlocked ? new Date().toISOString() : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Achievements POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Разблокировать скрытое достижение
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, achievementId, secretCode } = body;

    if (!userId || !achievementId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Проверка секретных кодов для скрытых достижений
    const secretAchievements: Record<string, { code: string; points: number }> = {
      early_adopter: { code: 'EARLY2024', points: 500 },
      easter_egg: { code: 'KONAMI', points: 100 },
    };

    const secret = secretAchievements[achievementId];
    if (secret && secretCode !== secret.code) {
      return NextResponse.json({ error: 'Invalid secret code' }, { status: 403 });
    }

    return NextResponse.json({
      achievementId,
      unlocked: true,
      points: secret?.points || 0,
      unlockedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Achievements PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
