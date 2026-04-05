import { NextResponse } from 'next/server';

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
      { step: 5, title: 'Конвертация в подписчиков', description: 'Перенаправление на OnlyFans', duration: 'Постоянно', automated: true },
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
];

// GET /api/auto-earn/schemes
export async function GET() {
  try {
    // Добавляем статистику по каждой схеме
    const schemesWithStats = MONETIZATION_SCHEMES.map(scheme => ({
      ...scheme,
      stats: {
        activeCampaigns: Math.floor(Math.random() * 50) + 10,
        avgROI: Math.floor((scheme.estimatedROI.min + scheme.estimatedROI.max) / 2),
        successRate: scheme.risk === 'low' ? 85 : scheme.risk === 'medium' ? 70 : 55,
        totalUsers: Math.floor(Math.random() * 500) + 100,
      },
    }));

    return NextResponse.json({
      success: true,
      schemes: schemesWithStats,
      meta: {
        total: schemesWithStats.length,
        categories: ['gambling', 'dating', 'ofm', 'crypto', 'telegram'],
        lastUpdated: new Date().toISOString(),
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
