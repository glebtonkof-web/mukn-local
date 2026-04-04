// API: Теневые аккаунты поддержки (УРОВЕНЬ 2, функция 8)
// Создаёт защитные аккаунты для ответов на негативные комментарии
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Получить список теневых аккаунтов для основного аккаунта
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const primaryAccountId = searchParams.get('primaryAccountId');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    // Если primaryAccountId не передан, возвращаем все теневые аккаунты
    if (!primaryAccountId) {
      const allShadowAccounts = await db.shadowSupportAccount.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
      
      return NextResponse.json({
        success: true,
        shadowAccounts: allShadowAccounts,
        total: allShadowAccounts.length,
        active: allShadowAccounts.filter(sa => sa.isActive).length,
        hint: 'Provide primaryAccountId query parameter to get specific account shadow accounts',
      });
    }
    
    const whereClause: any = { primaryAccountId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }
    
    const shadowAccounts = await db.shadowSupportAccount.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
    
    // Получаем информацию об основном и теневых аккаунтах
    const primaryAccount = await db.account.findUnique({
      where: { id: primaryAccountId },
    });
    
    const shadowAccountIds = shadowAccounts
      .map(sa => sa.shadowAccountId)
      .filter(Boolean);
    
    const shadowAccountDetails = shadowAccountIds.length > 0
      ? await db.account.findMany({
          where: { id: { in: shadowAccountIds } },
        })
      : [];
    
    // Объединяем данные
    const enrichedAccounts = shadowAccounts.map(sa => ({
      ...sa,
      shadowAccount: shadowAccountDetails.find(a => a.id === sa.shadowAccountId),
      primaryAccount,
      triggerKeywords: sa.triggerKeywords ? JSON.parse(sa.triggerKeywords) : [],
      responseTemplates: sa.responseTemplates ? JSON.parse(sa.responseTemplates) : [],
    }));
    
    return NextResponse.json({
      success: true,
      primaryAccount,
      shadowAccounts: enrichedAccounts,
      total: shadowAccounts.length,
      active: shadowAccounts.filter(sa => sa.isActive).length,
    });
  } catch (error) {
    console.error('[ShadowAccounts API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get shadow accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Создать теневой аккаунт для защиты
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      primaryAccountId,
      primaryInfluencerId,
      shadowAccountId,
      shadowInfluencerId,
      triggerKeywords = [],
      responseTemplates = [],
    } = body;
    
    if (!primaryAccountId || !shadowAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: primaryAccountId, shadowAccountId' },
        { status: 400 }
      );
    }
    
    // Проверяем существование аккаунтов
    const [primaryAccount, shadowAccount] = await Promise.all([
      db.account.findUnique({ where: { id: primaryAccountId } }),
      db.account.findUnique({ where: { id: shadowAccountId } }),
    ]);
    
    if (!primaryAccount) {
      return NextResponse.json(
        { error: 'Primary account not found' },
        { status: 404 }
      );
    }
    
    if (!shadowAccount) {
      return NextResponse.json(
        { error: 'Shadow account not found' },
        { status: 404 }
      );
    }
    
    // Проверяем, что теневой аккаунт ещё не привязан к другому основному
    const existingBinding = await db.shadowSupportAccount.findFirst({
      where: { shadowAccountId },
    });
    
    if (existingBinding) {
      return NextResponse.json(
        { error: 'Shadow account is already bound to another primary account', existingBinding },
        { status: 400 }
      );
    }
    
    // Создаём привязку
    const shadowSupportAccount = await db.shadowSupportAccount.create({
      data: {
        primaryAccountId,
        primaryInfluencerId,
        shadowAccountId,
        shadowInfluencerId,
        triggerKeywords: JSON.stringify(triggerKeywords),
        responseTemplates: JSON.stringify(responseTemplates),
        isActive: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      shadowSupportAccount,
      message: 'Shadow support account created successfully',
    });
  } catch (error) {
    console.error('[ShadowAccounts API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create shadow account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT: Обновить триггер-слова и шаблоны ответов
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      triggerKeywords,
      responseTemplates,
      isActive,
    } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }
    
    const existingAccount = await db.shadowSupportAccount.findUnique({
      where: { id },
    });
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Shadow support account not found' },
        { status: 404 }
      );
    }
    
    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (triggerKeywords !== undefined) {
      updateData.triggerKeywords = JSON.stringify(triggerKeywords);
    }
    
    if (responseTemplates !== undefined) {
      updateData.responseTemplates = JSON.stringify(responseTemplates);
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    const updatedAccount = await db.shadowSupportAccount.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      shadowSupportAccount: {
        ...updatedAccount,
        triggerKeywords: updatedAccount.triggerKeywords ? JSON.parse(updatedAccount.triggerKeywords) : [],
        responseTemplates: updatedAccount.responseTemplates ? JSON.parse(updatedAccount.responseTemplates) : [],
      },
      message: 'Shadow support account updated successfully',
    });
  } catch (error) {
    console.error('[ShadowAccounts API] PUT Error:', error);
    return NextResponse.json(
      { error: 'Failed to update shadow account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Удалить теневой аккаунт поддержки
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shadowAccountId = searchParams.get('shadowAccountId');
    
    if (!id && !shadowAccountId) {
      return NextResponse.json(
        { error: 'Missing required field: id or shadowAccountId' },
        { status: 400 }
      );
    }
    
    let whereClause: any;
    if (id) {
      whereClause = { id };
    } else {
      whereClause = { shadowAccountId };
    }
    
    const existingAccount = await db.shadowSupportAccount.findFirst({
      where: whereClause,
    });
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Shadow support account not found' },
        { status: 404 }
      );
    }
    
    await db.shadowSupportAccount.delete({
      where: { id: existingAccount.id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Shadow support account deleted successfully',
      deletedAccount: {
        id: existingAccount.id,
        primaryAccountId: existingAccount.primaryAccountId,
        shadowAccountId: existingAccount.shadowAccountId,
      },
    });
  } catch (error) {
    console.error('[ShadowAccounts API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete shadow account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH: Записать использование защитного комментария
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, success } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }
    
    const existingAccount = await db.shadowSupportAccount.findUnique({
      where: { id },
    });
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Shadow support account not found' },
        { status: 404 }
      );
    }
    
    const updatedAccount = await db.shadowSupportAccount.update({
      where: { id },
      data: {
        defensesCount: { increment: 1 },
        successCount: success ? { increment: 1 } : undefined,
      },
    });
    
    return NextResponse.json({
      success: true,
      shadowSupportAccount: updatedAccount,
      message: 'Defense usage recorded',
    });
  } catch (error) {
    console.error('[ShadowAccounts API] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to record defense usage', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
