import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Типы для схем монетизации
interface MonetizationStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  automated: boolean;
}

interface MonetizationScheme {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  requiredAccounts: {
    platform: string;
    minCount: number;
    purpose: string;
    requiresWarming: boolean;
  }[];
  estimatedROI: {
    min: number;
    max: number;
    timeframe: string;
  };
  risk: 'low' | 'medium' | 'high';
  steps: MonetizationStep[];
  recommendedBudget: {
    min: number;
    max: number;
    currency: string;
  };
  features: string[];
  warnings: string[];
}

// Доступные схемы монетизации
const MONETIZATION_SCHEMES: MonetizationScheme[] = [
  {
    id: 'gambling-telegram',
    name: 'Gambling + Telegram',
    description: 'Автоматический трафик на гемблинг-офферы через Telegram-каналы и комментарии. Высокий ROI при правильном подходе.',
    platforms: ['Telegram', 'Instagram', 'TikTok'],
    requiredAccounts: [
      { platform: 'Telegram', minCount: 3, purpose: 'Основные каналы и комментарии', requiresWarming: true },
      { platform: 'Instagram', minCount: 2, purpose: 'Дополнительный трафик', requiresWarming: true },
    ],
    estimatedROI: {
      min: 150,
      max: 400,
      timeframe: '30 дней',
    },
    risk: 'high',
    steps: [
      { step: 1, title: 'Прогрев аккаунтов', description: 'Автоматический прогрев аккаунтов по уникальным алгоритмам', duration: '3-7 дней', automated: true },
      { step: 2, title: 'Поиск целевых каналов', description: 'AI-анализ и поиск подходящих каналов для трафика', duration: '1 день', automated: true },
      { step: 3, title: 'Генерация креативов', description: 'Создание уникальных комментариев и постов', duration: 'Постоянно', automated: true },
      { step: 4, title: 'Запуск кампаний', description: 'Автоматический постинг с умными задержками', duration: 'Постоянно', automated: true },
      { step: 5, title: 'Оптимизация', description: 'Анализ результатов и масштабирование', duration: 'Постоянно', automated: true },
    ],
    recommendedBudget: {
      min: 5000,
      max: 50000,
      currency: 'RUB',
    },
    features: [
      'Автоматический поиск целевых каналов',
      'AI-генерация уникальных комментариев',
      'Умные задержки между действиями',
      'Авто-замена забаненных аккаунтов',
      'Реальная аналитика и отчеты',
    ],
    warnings: [
      'Высокий риск бана при неправильной настройке',
      'Требует качественных прокси',
      'Не рекомендуется новичкам',
    ],
  },
  {
    id: 'dating-instagram',
    name: 'Dating + Instagram',
    description: 'Дейтинг-трафик через Instagram с использованием AI-ассистентов для общения. Средний риск, стабильный доход.',
    platforms: ['Instagram', 'TikTok'],
    requiredAccounts: [
      { platform: 'Instagram', minCount: 5, purpose: 'Основные аккаунты для трафика', requiresWarming: true },
      { platform: 'TikTok', minCount: 2, purpose: 'Дополнительный трафик через Reels', requiresWarming: false },
    ],
    estimatedROI: {
      min: 100,
      max: 250,
      timeframe: '30 дней',
    },
    risk: 'medium',
    steps: [
      { step: 1, title: 'Создание профилей', description: 'Настройка реалистичных профилей девушек', duration: '1 день', automated: true },
      { step: 2, title: 'Прогрев аккаунтов', description: 'Постепенный прогрев с реальным поведением', duration: '5-10 дней', automated: true },
      { step: 3, title: 'Поиск целевой аудитории', description: 'AI-поиск потенциальных лидов', duration: 'Постоянно', automated: true },
      { step: 4, title: 'Активность и взаимодействие', description: 'Лайки, подписки, комментарии', duration: 'Постоянно', automated: true },
      { step: 5, title: 'Конвертация в лиды', description: 'Перенаправление на дейтинг-платформы', duration: 'Постоянно', automated: true },
    ],
    recommendedBudget: {
      min: 3000,
      max: 30000,
      currency: 'RUB',
    },
    features: [
      'Автоматические лайки и подписки',
      'AI-генерация привлекательных постов',
      'Умные Stories для увеличения вовлечённости',
      'Автоматические ответы в Direct',
      'Фильтрация по гео и интересам',
    ],
    warnings: [
      'Требует качественные фото профилей',
      'Высокая конкуренция в нише',
      'Необходима регулярная активность',
    ],
  },
  {
    id: 'ofm-tiktok',
    name: 'OFM + TikTok',
    description: 'OnlyFans Marketing через TikTok с вирусным контентом. Высокий потенциал при правильной стратегии.',
    platforms: ['TikTok', 'Instagram', 'Twitter'],
    requiredAccounts: [
      { platform: 'TikTok', minCount: 3, purpose: 'Основной источник трафика', requiresWarming: false },
      { platform: 'Instagram', minCount: 2, purpose: 'Дополнительная воронка', requiresWarming: true },
      { platform: 'Twitter', minCount: 1, purpose: 'Продвижение контента', requiresWarming: false },
    ],
    estimatedROI: {
      min: 200,
      max: 600,
      timeframe: '60 дней',
    },
    risk: 'high',
    steps: [
      { step: 1, title: 'Создание бренда', description: 'Разработка уникального стиля и контента', duration: '2-3 дня', automated: false },
      { step: 2, title: 'Генерация контента', description: 'AI-помощь в создании вирусных видео', duration: 'Постоянно', automated: true },
      { step: 3, title: 'Публикация по расписанию', description: 'Оптимальное время для максимального охвата', duration: 'Постоянно', automated: true },
      { step: 4, title: 'Взаимодействие с аудиторией', description: 'Ответы на комментарии и взаимодействие', duration: 'Постоянно', automated: true },
      { step: 5, title: 'Конвертация в подписчики', description: 'Перенаправление на OnlyFans', duration: 'Постоянно', automated: true },
    ],
    recommendedBudget: {
      min: 10000,
      max: 100000,
      currency: 'RUB',
    },
    features: [
      'AI-генерация идей для видео',
      'Анализ трендов и хештегов',
      'Автоматическая публикация',
      'Умное взаимодействие с аудиторией',
      'Аналитика конверсий',
    ],
    warnings: [
      'Высокий риск бана TikTok аккаунтов',
      'Требуется качественный визуальный контент',
      'Необходима постоянная адаптация к трендам',
    ],
  },
  {
    id: 'crypto-crossplatform',
    name: 'Crypto + CrossPlatform',
    description: 'Криптовалютные офферы с кросс-платформенным продвижением. Высокие выплаты, умеренный риск.',
    platforms: ['Telegram', 'Twitter', 'YouTube', 'Instagram'],
    requiredAccounts: [
      { platform: 'Telegram', minCount: 5, purpose: 'Основные каналы и группы', requiresWarming: true },
      { platform: 'Twitter', minCount: 3, purpose: 'Новостной трафик', requiresWarming: false },
      { platform: 'YouTube', minCount: 1, purpose: 'Длинный контент', requiresWarming: false },
    ],
    estimatedROI: {
      min: 120,
      max: 350,
      timeframe: '45 дней',
    },
    risk: 'medium',
    steps: [
      { step: 1, title: 'Создание инфраструктуры', description: 'Настройка каналов и соцсетей', duration: '3-5 дней', automated: true },
      { step: 2, title: 'Генерация контента', description: 'AI-создание новостного и аналитического контента', duration: 'Постоянно', automated: true },
      { step: 3, title: 'Кросс-постинг', description: 'Синхронизация контента между платформами', duration: 'Постоянно', automated: true },
      { step: 4, title: 'SEO оптимизация', description: 'Повышение видимости контента', duration: 'Постоянно', automated: true },
      { step: 5, title: 'Монетизация', description: 'Интеграция партнёрских ссылок', duration: 'Постоянно', automated: true },
    ],
    recommendedBudget: {
      min: 8000,
      max: 80000,
      currency: 'RUB',
    },
    features: [
      'Автоматический кросс-постинг',
      'AI-генерация крипто-новостей',
      'SEO оптимизация контента',
      'Умное встраивание партнёрских ссылок',
      'Мульти-платформенная аналитика',
    ],
    warnings: [
      'Регуляторные ограничения в некоторых странах',
      'Высокая конкуренция от крупных игроков',
      'Необходимость следить за трендами рынка',
    ],
  },
  {
    id: 'telegram-invites',
    name: 'Telegram + Invites',
    description: 'Массовое привлечение подписчиков в Telegram-каналы с последующей монетизацией. Низкий риск, стабильный рост.',
    platforms: ['Telegram'],
    requiredAccounts: [
      { platform: 'Telegram', minCount: 10, purpose: 'Инвайтинг и активность', requiresWarming: true },
    ],
    estimatedROI: {
      min: 80,
      max: 200,
      timeframe: '30 дней',
    },
    risk: 'low',
    steps: [
      { step: 1, title: 'Прогрев аккаунтов', description: 'Безопасный прогрев для инвайтинга', duration: '7-14 дней', automated: true },
      { step: 2, title: 'Поиск целевой аудитории', description: 'Анализ каналов конкурентов', duration: '1 день', automated: true },
      { step: 3, title: 'Инвайтинг', description: 'Приглашение пользователей с умными задержками', duration: 'Постоянно', automated: true },
      { step: 4, title: 'Удержание аудитории', description: 'Интересный контент для удержания', duration: 'Постоянно', automated: true },
      { step: 5, title: 'Монетизация канала', description: 'Продажа рекламы, партнёрские ссылки', duration: 'Постоянно', automated: false },
    ],
    recommendedBudget: {
      min: 2000,
      max: 20000,
      currency: 'RUB',
    },
    features: [
      'Безопасный инвайтинг с задержками',
      'Автоматический обход ограничений',
      'Умный выбор целевой аудитории',
      'AI-генерация контента для удержания',
      'Статистика и аналитика роста',
    ],
    warnings: [
      'Ограничения Telegram на инвайтинг',
      'Риск блокировки при агрессивном инвайтинге',
      'Требуется время на прогрев аккаунтов',
    ],
  },
  // Новые схемы
  {
    id: 'nutra-health',
    name: 'Nutra + Health',
    description: 'Продвижение нутрацевтики и товаров для здоровья через нативную рекламу. Стабильный спрос.',
    platforms: ['Instagram', 'TikTok', 'YouTube'],
    requiredAccounts: [
      { platform: 'Instagram', minCount: 3, purpose: 'Основной трафик', requiresWarming: true },
      { platform: 'TikTok', minCount: 2, purpose: 'Видео-контент', requiresWarming: false },
    ],
    estimatedROI: {
      min: 80,
      max: 200,
      timeframe: '30 дней',
    },
    risk: 'low',
    steps: [
      { step: 1, title: 'Выбор офферов', description: 'Подбор качественных нутра-офферов', duration: '1 день', automated: false },
      { step: 2, title: 'Создание контента', description: 'AI-генерация нативного контента', duration: 'Постоянно', automated: true },
      { step: 3, title: 'Тестирование', description: 'A/B тестирование подходов', duration: '7 дней', automated: true },
      { step: 4, title: 'Масштабирование', description: 'Увеличение бюджета на успешные связки', duration: 'Постоянно', automated: true },
    ],
    recommendedBudget: {
      min: 5000,
      max: 40000,
      currency: 'RUB',
    },
    features: [
      'AI-генерация отзывов и обзоров',
      'Автоматический подбор креативов',
      'A/B тестирование',
      'Гео-таргетинг',
    ],
    warnings: [
      'Требуется проверка качества офферов',
      'Важно соблюдать рекламные политики',
    ],
  },
  {
    id: 'ecommerce-dropshipping',
    name: 'E-commerce + Dropshipping',
    description: 'Продвижение товаров через маркетплейсы и соцсети. Пассивный доход с автофулфилментом.',
    platforms: ['Instagram', 'TikTok', 'Telegram'],
    requiredAccounts: [
      { platform: 'Instagram', minCount: 2, purpose: 'Витрина товаров', requiresWarming: true },
      { platform: 'TikTok', minCount: 2, purpose: 'Видео-обзоры', requiresWarming: false },
      { platform: 'Telegram', minCount: 1, purpose: 'Канал с товарами', requiresWarming: false },
    ],
    estimatedROI: {
      min: 50,
      max: 150,
      timeframe: '45 дней',
    },
    risk: 'low',
    steps: [
      { step: 1, title: 'Выбор товаров', description: 'AI-анализ трендовых товаров', duration: '2 дня', automated: true },
      { step: 2, title: 'Создание магазина', description: 'Настройка витрины', duration: '3 дня', automated: false },
      { step: 3, title: 'Генерация контента', description: 'AI-создание описаний и фото', duration: 'Постоянно', automated: true },
      { step: 4, title: 'Продвижение', description: 'Таргетированная реклама', duration: 'Постоянно', automated: true },
    ],
    recommendedBudget: {
      min: 10000,
      max: 100000,
      currency: 'RUB',
    },
    features: [
      'AI-подбор трендовых товаров',
      'Автоматическая генерация описаний',
      'Интеграция с поставщиками',
      'Авто-заказы и фулфилмент',
    ],
    warnings: [
      'Требуется начальный капитал на товары',
      'Важно выбрать надёжных поставщиков',
    ],
  },
];

// Маппинг ID схем на типы кампаний/ниши
const SCHEME_TO_NICHE: Record<string, string> = {
  'gambling-telegram': 'gambling',
  'dating-instagram': 'dating',
  'ofm-tiktok': 'ofm',
  'crypto-crossplatform': 'crypto',
  'telegram-invites': 'telegram',
  'nutra-health': 'nutra',
  'ecommerce-dropshipping': 'ecommerce',
};

// GET /api/auto-earn/schemes
export async function GET() {
  try {
    // Загружаем реальные данные о кампаниях из базы
    const campaigns = await db.campaign.findMany({
      where: { status: 'active' },
      select: {
        niche: true,
        type: true,
        revenue: true,
        spent: true,
      },
    });

    // Загружаем количество аккаунтов
    const accountsCount = await db.account.count();
    const activeAccountsCount = await db.account.count({ where: { status: 'active' } });

    // Считаем статистику по каждой схеме
    const schemesWithStats = await Promise.all(
      MONETIZATION_SCHEMES.map(async (scheme) => {
        const niche = SCHEME_TO_NICHE[scheme.id];

        // Считаем кампании этой ниши
        const nicheCampaigns = campaigns.filter(c => c.niche === niche);
        const activeCampaigns = nicheCampaigns.length;

        // Считаем средний ROI
        let avgROI = Math.floor((scheme.estimatedROI.min + scheme.estimatedROI.max) / 2);
        let successRate = scheme.risk === 'low' ? 85 : scheme.risk === 'medium' ? 70 : 55;

        if (nicheCampaigns.length > 0) {
          const campaignsROI = nicheCampaigns
            .filter(c => c.spent > 0)
            .map(c => ((c.revenue - c.spent) / c.spent) * 100);

          if (campaignsROI.length > 0) {
            avgROI = Math.floor(campaignsROI.reduce((a, b) => a + b, 0) / campaignsROI.length);
            successRate = Math.floor((campaignsROI.filter(r => r > 0).length / campaignsROI.length) * 100);
          }
        }

        // Считаем пользователей (уникальные userId с кампаниями этой ниши)
        const totalUsers = await db.campaign.count({
          where: {
            niche,
            status: { in: ['active', 'completed'] },
          },
        });

        return {
          ...scheme,
          stats: {
            activeCampaigns,
            avgROI,
            successRate,
            totalUsers,
          },
        };
      })
    );

    // Общая статистика системы
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalROI = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

    return NextResponse.json({
      success: true,
      schemes: schemesWithStats,
      meta: {
        total: schemesWithStats.length,
        categories: ['gambling', 'dating', 'ofm', 'crypto', 'telegram', 'nutra', 'ecommerce'],
        lastUpdated: new Date().toISOString(),
        systemStats: {
          totalCampaigns: campaigns.length,
          totalAccounts: accountsCount,
          activeAccounts: activeAccountsCount,
          totalRevenue,
          totalSpent,
          totalROI: totalROI.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching monetization schemes:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке схем монетизации' },
      { status: 500 }
    );
  }
}
