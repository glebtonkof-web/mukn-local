import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/monetization/templates - Получить юридические шаблоны
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const niche = searchParams.get('niche');

    const whereClause: Record<string, unknown> = { status: 'active' };
    if (category && category !== 'all') whereClause.category = category;

    const templates = await db.legalTemplate.findMany({
      where: whereClause,
      orderBy: { salesCount: 'desc' },
    });

    // Фильтрация по нише
    let filteredTemplates = templates;
    if (niche && niche !== 'all') {
      filteredTemplates = templates.filter((t) => {
        if (!t.applicableNiches) return true;
        const niches = JSON.parse(t.applicableNiches);
        return niches.includes(niche);
      });
    }

    // Категории
    const categories = await db.legalTemplate.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'active' },
    });

    // Популярные шаблоны
    const popular = await db.legalTemplate.findMany({
      where: { status: 'active' },
      orderBy: { salesCount: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      templates: filteredTemplates,
      categories: categories.map((c) => ({
        name: c.category,
        count: c._count.id,
      })),
      popular,
    });
  } catch (error) {
    console.error('Error fetching legal templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/monetization/templates - Создать шаблон
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      templateContent,
      price,
      currency,
      applicableNiches,
    } = body;

    const template = await db.legalTemplate.create({
      data: {
        name,
        description,
        category: category || 'disclaimer',
        templateContent: templateContent || '',
        aiGenerated: false,
        price: price || 0,
        currency: currency || 'USD',
        applicableNiches: applicableNiches ? JSON.stringify(applicableNiches) : null,
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PUT /api/monetization/templates - Купить и сгенерировать шаблон
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, userId, variables } = body;

    const template = await db.legalTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Генерируем документ с подстановкой переменных
    let generatedContent = template.templateContent;
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        generatedContent = generatedContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
    }

    // Создаём запись о покупке
    const purchase = await db.legalTemplatePurchase.create({
      data: {
        templateId,
        userId: userId || 'default',
        generatedContent,
        price: template.price,
      },
    });

    // Обновляем статистику шаблона
    await db.legalTemplate.update({
      where: { id: templateId },
      data: {
        salesCount: { increment: 1 },
        revenue: { increment: template.price },
      },
    });

    return NextResponse.json({
      success: true,
      purchase,
      content: generatedContent,
    });
  } catch (error) {
    console.error('Error purchasing template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to purchase template' },
      { status: 500 }
    );
  }
}
