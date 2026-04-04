import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import ZAI from 'z-ai-web-dev-sdk';

// Типы фейкового контента
export const FAKE_CONTENT_TYPES = {
  screenshot: {
    name: 'Скриншот дохода',
    platforms: ['binance', 'telegram_wallet', 'bank_app', 'crypto_exchange'],
  },
  news: {
    name: 'Новостной скриншот',
    platforms: ['forbes', 'bloomberg', 'rbc', 'tass', 'reuters', 'bbc'],
  },
  dialog: {
    name: 'Фейковый диалог',
    platforms: ['telegram', 'whatsapp', 'viber'],
  },
  vacancy: {
    name: 'Фейковая вакансия',
    platforms: ['linkedin', 'hh', 'telegram'],
  },
  review: {
    name: 'Фейковый отзыв',
    platforms: ['otzovik', 'irecommend', 'trustpilot'],
  },
};

// GET /api/traffic/fake-content - Get content types
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (type && type in FAKE_CONTENT_TYPES) {
      const history = await db.fakeContentGenerator.findMany({
        where: { contentType: type },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return NextResponse.json({
        type: FAKE_CONTENT_TYPES[type as keyof typeof FAKE_CONTENT_TYPES],
        history,
      });
    }

    return NextResponse.json({ types: FAKE_CONTENT_TYPES });
  } catch (error) {
    logger.error('Failed to fetch fake content types', error as Error);
    return NextResponse.json({ types: FAKE_CONTENT_TYPES });
  }
}

// POST /api/traffic/fake-content - Generate fake content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentType, params } = body;

    if (!contentType) {
      return NextResponse.json(
        { error: 'Content type is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    let result: Record<string, unknown> = {};

    switch (contentType) {
      case 'screenshot':
      case 'income': {
        // Генерация изображения скриншота
        const imagePrompt = `A realistic screenshot of ${params.platform || 'Binance'} crypto wallet mobile app showing balance. Professional UI, dark mode, realistic. No text overlay.`;
        
        let imageBase64: string | undefined | null = null;
        try {
          const imageResponse = await zai.images.generations.create({
            prompt: imagePrompt,
            size: '1024x1024',
          });
          imageBase64 = imageResponse.data[0]?.base64;
        } catch (imgError) {
          logger.error('Failed to generate image', imgError as Error);
        }

        result = {
          text: `Баланс: ${params.amount || '10,000'} USDT`,
          imageBase64,
        };
        break;
      }

      case 'news': {
        const newsPrompt = `Придумай сенсационный новостной заголовок про "${params.topic || 'криптовалюту'}".
Издание: ${params.source || 'Forbes'}
Тон: кликбейт. Также короткий лид-абзац.`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Ты пишешь новостные заголовки.' },
            { role: 'user', content: newsPrompt },
          ],
        });

        result = {
          headline: completion.choices[0]?.message?.content?.split('\n')[0],
          content: completion.choices[0]?.message?.content,
        };
        break;
      }

      case 'vacancy': {
        const vacancyPrompt = `Создай описание удалённой вакансии:
Должность: ${params.position || 'Менеджер'}
Зарплата: ${params.salary || '3000-5000'}$
Требования: минимальные
В конце: "Подробности: Telegram @${params.channel || 'jobs'}"`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Ты HR-специалист.' },
            { role: 'user', content: vacancyPrompt },
          ],
        });

        result = { vacancy: completion.choices[0]?.message?.content };
        break;
      }

      case 'dialog': {
        const dialogPrompt = `Создай диалог в Telegram про ${params.topic || 'инвестиции'}.
Один спрашивает, другой рекомендует канал @${params.channel || 'tips'}.`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Ты создаёшь диалоги в Telegram.' },
            { role: 'user', content: dialogPrompt },
          ],
        });

        result = { dialog: completion.choices[0]?.message?.content };
        break;
      }

      case 'review': {
        const reviewPrompt = `Напиши отзыв про ${params.product || 'курс'}.
Рейтинг: 5 звёзд. В конце: "Подробнее в Telegram @${params.channel || 'reviews'}"`;

        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'Ты пишешь отзывы.' },
            { role: 'user', content: reviewPrompt },
          ],
        });

        result = { review: completion.choices[0]?.message?.content };
        break;
      }
    }

    // Сохраняем
    try {
      await db.fakeContentGenerator.create({
        data: {
          id: nanoid(),
          contentType: String(contentType),
          template: JSON.stringify(params),
          methodId: params?.methodId ? parseInt(String(params.methodId)) : null,
          updatedAt: new Date(),
        },
      });
    } catch {
      // Ignore DB errors
    }

    return NextResponse.json({ success: true, contentType, result });
  } catch (error) {
    logger.error('Failed to generate fake content', error as Error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
