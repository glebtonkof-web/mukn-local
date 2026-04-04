import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/settings/automation - Получить правила автоматизации
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    const where: Record<string, unknown> = { userId: 'default' };
    if (campaignId) where.campaignId = campaignId;

    const rules = await db.automationRule.findMany({ 
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Ошибка получения правил автоматизации:', error);
    return NextResponse.json(
      { error: 'Не удалось получить правила автоматизации' },
      { status: 500 }
    );
  }
}

// POST /api/settings/automation - Создать правило автоматизации
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, conditionType, conditionConfig, actionType, actionConfig, campaignId, isActive } = body;

    if (!name || !conditionType || !actionType) {
      return NextResponse.json(
        { error: 'Название, тип условия и тип действия обязательны' },
        { status: 400 }
      );
    }

    const rule = await db.automationRule.create({
      data: {
        id: nanoid(),
        name,
        conditionType,
        conditionConfig: typeof conditionConfig === 'string' ? conditionConfig : JSON.stringify(conditionConfig),
        actionType,
        actionConfig: typeof actionConfig === 'string' ? actionConfig : JSON.stringify(actionConfig),
        campaignId,
        isActive: isActive ?? true,
        userId: 'default',
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Правило автоматизации создано',
      rule
    });
  } catch (error) {
    console.error('Ошибка создания правила автоматизации:', error);
    return NextResponse.json(
      { error: 'Не удалось создать правило автоматизации' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/automation - Обновить правило автоматизации
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID правила обязателен' },
        { status: 400 }
      );
    }

    const rule = await db.automationRule.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Правило автоматизации обновлено',
      rule
    });
  } catch (error) {
    console.error('Ошибка обновления правила автоматизации:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить правило автоматизации' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/automation - Удалить правило автоматизации
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID правила обязателен' },
        { status: 400 }
      );
    }

    await db.automationRule.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Правило автоматизации удалено'
    });
  } catch (error) {
    console.error('Ошибка удаления правила автоматизации:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить правило автоматизации' },
      { status: 500 }
    );
  }
}
