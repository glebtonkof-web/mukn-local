import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/spam-methods - Получить все методы спама
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    // Получаем все типы настроек спама
    const [
      forwardSpam,
      pollSpam,
      fakeArguments,
      reactionSpam,
      storiesSpam,
    ] = await Promise.all([
      db.forwardSpamSettings.findMany({ where: { status: 'active' } }),
      db.pollSpamSettings.findMany({ where: { status: 'active' } }),
      db.fakeArgument.findMany({ where: { status: 'active' } }),
      db.reactionSpamSettings.findMany({ where: { status: 'active' } }),
      db.storiesSpamSettings.findMany({ where: { status: 'active' } }),
    ]);

    // Если пусто - возвращаем демо
    if (type === 'all') {
      return NextResponse.json({
        success: true,
        methods: {
          forward: forwardSpam.length > 0 ? forwardSpam : createDemoForwardSpam(),
          polls: pollSpam.length > 0 ? pollSpam : createDemoPollSpam(),
          arguments: fakeArguments.length > 0 ? fakeArguments : createDemoFakeArguments(),
          reactions: reactionSpam.length > 0 ? reactionSpam : createDemoReactionSpam(),
          stories: storiesSpam.length > 0 ? storiesSpam : createDemoStoriesSpam(),
        },
        descriptions: {
          forward: 'Спам через пересылаемые сообщения - создаём канал-прокладку, публикуем оффер, пересылаем в целевые чаты',
          polls: 'Спам через опросы - создаём опрос с интригующим вопросом, в вариантах ответа скрываем ссылку',
          arguments: 'Фейковые срачи - два аккаунта спорят, третий "разруливает" с оффером',
          reactions: 'Спам через реакции - цепочка реакций привлекает внимание к сообщению',
          stories: 'Telegram Stories - анонсы в сторис с оффером',
        },
      });
    }

    // Возвращаем конкретный тип
    const results: any = {};
    switch (type) {
      case 'forward':
        results.methods = forwardSpam.length > 0 ? forwardSpam : createDemoForwardSpam();
        break;
      case 'polls':
        results.methods = pollSpam.length > 0 ? pollSpam : createDemoPollSpam();
        break;
      case 'arguments':
        results.methods = fakeArguments.length > 0 ? fakeArguments : createDemoFakeArguments();
        break;
      case 'reactions':
        results.methods = reactionSpam.length > 0 ? reactionSpam : createDemoReactionSpam();
        break;
      case 'stories':
        results.methods = storiesSpam.length > 0 ? storiesSpam : createDemoStoriesSpam();
        break;
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Error fetching spam methods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch spam methods' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/spam-methods - Создать новую конфигурацию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config } = body;

    let result;

    switch (type) {
      case 'forward':
        result = await db.forwardSpamSettings.create({
          data: {
            campaignId: config.campaignId,
            proxyChannelId: config.proxyChannelId,
            messageTemplate: config.messageTemplate,
            status: 'active',
          },
        });
        break;

      case 'polls':
        result = await db.pollSpamSettings.create({
          data: {
            question: config.question,
            options: JSON.stringify(config.options),
            status: 'active',
          },
        });
        break;

      case 'arguments':
        result = await db.fakeArgument.create({
          data: {
            account1Id: config.account1Id,
            account2Id: config.account2Id,
            resolverAccountId: config.resolverAccountId,
            argumentScript: JSON.stringify(config.script),
            status: 'active',
          },
        });
        break;

      case 'reactions':
        result = await db.reactionSpamSettings.create({
          data: {
            reactions: JSON.stringify(config.reactions),
            sequence: config.sequence ?? true,
            status: 'active',
          },
        });
        break;

      case 'stories':
        result = await db.storiesSpamSettings.create({
          data: {
            storyTemplate: config.storyTemplate,
            offerIntegration: config.offerIntegration,
            status: 'active',
          },
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid spam type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Конфигурация ${type} создана`,
    });
  } catch (error) {
    console.error('Error creating spam config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create config' },
      { status: 500 }
    );
  }
}

// Demo data functions
function createDemoForwardSpam() {
  return [{
    id: 'fwd-1',
    campaignId: 'campaign-1',
    proxyChannelId: '@crypto_signals_pro',
    messageTemplate: '🔥 Сигнал дня: BTC/USDT +15% за час! Подписывайся...',
    sentCount: 1250,
    successRate: 78,
    status: 'active',
  }];
}

function createDemoPollSpam() {
  return [{
    id: 'poll-1',
    question: 'Какой заработок в интернете реален?',
    options: JSON.stringify([
      'До $100/мес',
      '$100-500/мес',
      '$500-2000/мес → ссылка в профиле',
      'Более $2000/мес',
    ]),
    createdCount: 45,
    avgEngagement: 12.5,
    status: 'active',
  }];
}

function createDemoFakeArguments() {
  return [{
    id: 'arg-1',
    account1Id: 'acc-1',
    account2Id: 'acc-2',
    resolverAccountId: 'acc-3',
    argumentScript: JSON.stringify([
      { account: 1, text: 'Этот казино развод!' },
      { account: 2, text: 'Сам ты развод, я вчера вывел $500' },
      { account: 1, text: 'Докажи!' },
      { account: 3, text: 'Парни, сам играю тут уже месяц - ссылка в профиле' },
    ]),
    argumentsRun: 23,
    avgAttention: 85,
    status: 'active',
  }];
}

function createDemoReactionSpam() {
  return [{
    id: 'react-1',
    reactions: JSON.stringify(['🔥', '💰', '🚀', '💎']),
    sequence: true,
    appliedCount: 3500,
    clickRate: 3.2,
    status: 'active',
  }];
}

function createDemoStoriesSpam() {
  return [{
    id: 'story-1',
    storyTemplate: 'Ежедневный профит: +$150 📈 Ссылка в описании профиля',
    offerIntegration: 'crypto_exchange',
    storiesCount: 89,
    avgViews: 450,
    status: 'active',
  }];
}
