import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import ZAI from 'z-ai-web-dev-sdk';
import { nanoid } from 'nanoid';

// HTML шаблоны для лендингов
const LANDING_TEMPLATES = {
  crypto: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { max-width: 600px; padding: 40px 20px; text-align: center; }
    h1 { font-size: 2.5em; margin-bottom: 20px; }
    p { font-size: 1.2em; opacity: 0.8; margin-bottom: 30px; }
    .cta { 
      display: inline-block;
      background: linear-gradient(90deg, #6c5ce7, #a29bfe);
      color: white;
      padding: 15px 40px;
      border-radius: 50px;
      text-decoration: none;
      font-size: 1.1em;
      font-weight: bold;
      transition: transform 0.2s;
    }
    .cta:hover { transform: scale(1.05); }
    .countdown { margin: 30px 0; font-size: 1.5em; }
    .spots { color: #ff6b6b; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>{title}</h1>
    <p>{description}</p>
    <div class="countdown">Осталось <span class="spots">{spots}</span> мест</div>
    <a href="{telegramLink}" class="cta">Получить доступ в Telegram</a>
  </div>
</body>
</html>`,

  job: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .card { 
      max-width: 500px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    h1 { color: #2d3436; margin-bottom: 10px; }
    .salary { color: #00b894; font-size: 2em; font-weight: bold; margin: 20px 0; }
    p { color: #636e72; margin-bottom: 15px; }
    ul { text-align: left; margin: 20px 0; padding-left: 20px; }
    li { margin: 10px 0; color: #2d3436; }
    .cta { 
      display: block;
      background: #0984e3;
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-decoration: none;
      text-align: center;
      font-weight: bold;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>{position}</h1>
    <div class="salary">{salary}$/месяц</div>
    <p>{description}</p>
    <ul>
      <li>Удалённая работа</li>
      <li>Гибкий график</li>
      <li>Обучение бесплатно</li>
      <li>Опыт не важен</li>
    </ul>
    <a href="{telegramLink}" class="cta">Подать заявку в Telegram</a>
  </div>
</body>
</html>`,

  course: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { 
      max-width: 500px;
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
    }
    h1 { color: #2d3436; font-size: 1.8em; margin-bottom: 15px; }
    .original { text-decoration: line-through; color: #b2bec3; font-size: 1.5em; }
    .price { color: #e17055; font-size: 2.5em; font-weight: bold; }
    .free { color: #00b894; font-size: 2em; font-weight: bold; }
    p { color: #636e72; margin: 20px 0; }
    .cta { 
      display: block;
      background: linear-gradient(90deg, #667eea, #764ba2);
      color: white;
      padding: 18px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: bold;
      font-size: 1.1em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>{title}</h1>
    <div class="original">{originalPrice}$</div>
    <div class="free">БЕСПЛАТНО</div>
    <p>{description}</p>
    <a href="{telegramLink}" class="cta">Скачать в Telegram</a>
  </div>
</body>
</html>`,
};

// GET /api/traffic/landing - Get landing pages
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      const landing = await db.landingPageProxy.findUnique({
        where: { id },
      });
      return NextResponse.json({ landing });
    }

    const landings = await db.landingPageProxy.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      landings,
      templates: Object.keys(LANDING_TEMPLATES),
    });
  } catch (error) {
    logger.error('Failed to fetch landing pages', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch landing pages' },
      { status: 500 }
    );
  }
}

// POST /api/traffic/landing - Create landing page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, params } = body;

    if (!template || !LANDING_TEMPLATES[template as keyof typeof LANDING_TEMPLATES]) {
      return NextResponse.json(
        { error: 'Valid template is required' },
        { status: 400 }
      );
    }

    // Generate content with DeepSeek
    const zai = await ZAI.create();
    
    const prompt = `Создай контент для лендинга:
Тип: ${template}
Тема: ${params.topic || 'общая'}
Целевое действие: переход в Telegram

Нужно сгенерировать:
1. title - продающий заголовок (до 60 символов)
2. description - описание (до 200 символов)

Ответ в формате JSON.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Ты копирайтер для лендингов. Отвечай в JSON формате.' },
        { role: 'user', content: prompt },
      ],
    });

    let generatedContent;
    try {
      generatedContent = JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch {
      generatedContent = {
        title: params.topic || 'Эксклюзивное предложение',
        description: 'Успей получить доступ до окончания акции',
      };
    }

    // Build HTML
    const htmlTemplate = LANDING_TEMPLATES[template as keyof typeof LANDING_TEMPLATES];
    const htmlContent = htmlTemplate
      .replace('{title}', generatedContent.title || params.topic || 'Предложение')
      .replace('{description}', generatedContent.description || params.description || '')
      .replace('{telegramLink}', params.telegramLink || 'https://t.me/yourchannel')
      .replace('{position}', params.position || 'Менеджер')
      .replace('{salary}', params.salary || '3000-5000')
      .replace('{originalPrice}', params.originalPrice || '500')
      .replace('{spots}', params.spots || '23');

    // Save to database
    const landing = await db.landingPageProxy.create({
      data: {
        id: nanoid(),
        title: generatedContent.title || params.topic || 'Landing',
        description: generatedContent.description,
        htmlContent,
        telegramLink: params.telegramLink,
        hostingProvider: 'local',
      },
    });

    // Generate short URL (mock - in production use bit.ly or similar)
    const shortUrl = `https://l.example.com/${landing.id.slice(0, 8)}`;

    await db.landingPageProxy.update({
      where: { id: landing.id },
      data: { shortUrl, url: shortUrl },
    });

    logger.info('Landing page created', { landingId: landing.id });

    return NextResponse.json({
      success: true,
      landing: {
        ...landing,
        shortUrl,
        url: shortUrl,
      },
      htmlContent,
    });
  } catch (error) {
    logger.error('Failed to create landing page', error as Error);
    return NextResponse.json(
      { error: 'Failed to create landing page' },
      { status: 500 }
    );
  }
}

// PUT /api/traffic/landing - Update landing stats
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, visits, clicks } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Landing ID is required' },
        { status: 400 }
      );
    }

    const landing = await db.landingPageProxy.update({
      where: { id },
      data: {
        totalVisits: { increment: visits || 0 },
        telegramClicks: { increment: clicks || 0 },
      },
    });

    return NextResponse.json({ success: true, landing });
  } catch (error) {
    logger.error('Failed to update landing page', error as Error);
    return NextResponse.json(
      { error: 'Failed to update landing page' },
      { status: 500 }
    );
  }
}

// DELETE /api/traffic/landing - Delete landing page
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Landing ID is required' },
        { status: 400 }
      );
    }

    await db.landingPageProxy.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete landing page', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete landing page' },
      { status: 500 }
    );
  }
}
