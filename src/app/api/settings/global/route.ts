import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings/global - Получить глобальные настройки
export async function GET() {
  try {
    // Получаем или создаём настройки (один пользователь по умолчанию)
    let settings = await db.globalSettings.findFirst();

    if (!settings) {
      // Создаём настройки по умолчанию
      settings = await db.globalSettings.create({
        data: {
          userId: 'default',
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка получения глобальных настроек:', error);
    return NextResponse.json(
      { error: 'Не удалось получить настройки' },
      { status: 500 }
    );
  }
}

// POST /api/settings/global - Обновить глобальные настройки
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Получаем существующие настройки
    let settings = await db.globalSettings.findFirst();

    // Подготавливаем данные для обновления
    const updateData: Record<string, unknown> = {};
    
    // Язык
    if (body.interfaceLanguage !== undefined) updateData.interfaceLanguage = body.interfaceLanguage;
    if (body.contentLanguage !== undefined) updateData.contentLanguage = body.contentLanguage;
    
    // AI провайдеры
    if (body.deepseekMode !== undefined) updateData.deepseekMode = body.deepseekMode;
    if (body.hunyuanMode !== undefined) updateData.hunyuanMode = body.hunyuanMode;
    if (body.fallbackAI !== undefined) updateData.fallbackAI = body.fallbackAI;
    
    // Производительность
    if (body.maxThreads !== undefined) updateData.maxThreads = body.maxThreads;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.cachingEnabled !== undefined) updateData.cachingEnabled = body.cachingEnabled;
    
    // Автосохранение
    if (body.autosaveInterval !== undefined) updateData.autosaveInterval = body.autosaveInterval;
    if (body.maxDrafts !== undefined) updateData.maxDrafts = body.maxDrafts;
    
    // Безопасность
    if (body.encryptLocalDB !== undefined) updateData.encryptLocalDB = body.encryptLocalDB;
    if (body.startupPassword !== undefined) updateData.startupPassword = body.startupPassword;
    if (body.deleteTempFiles !== undefined) updateData.deleteTempFiles = body.deleteTempFiles;
    if (body.clearBrowserCache !== undefined) updateData.clearBrowserCache = body.clearBrowserCache;
    if (body.logActions !== undefined) updateData.logActions = body.logActions;
    
    // Облако
    if (body.autoBackupGoogle !== undefined) updateData.autoBackupGoogle = body.autoBackupGoogle;
    if (body.syncBetweenPC !== undefined) updateData.syncBetweenPC = body.syncBetweenPC;

    if (!settings) {
      // Создаём новые настройки
      settings = await db.globalSettings.create({
        data: {
          ...updateData,
          userId: 'default'
        }
      });
    } else {
      // Обновляем существующие настройки
      settings = await db.globalSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки успешно сохранены',
      settings
    });
  } catch (error) {
    console.error('Ошибка обновления глобальных настроек:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить настройки' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/global - Сбросить настройки к значениям по умолчанию
export async function DELETE() {
  try {
    const settings = await db.globalSettings.findFirst();
    
    if (settings) {
      await db.globalSettings.update({
        where: { id: settings.id },
        data: {
          interfaceLanguage: 'ru',
          contentLanguage: 'ru',
          deepseekMode: 'web_chat',
          hunyuanMode: 'web_chat',
          fallbackAI: null,
          maxThreads: 4,
          priority: 'balanced',
          cachingEnabled: true,
          autosaveInterval: 30,
          maxDrafts: 100,
          encryptLocalDB: true,
          startupPassword: null,
          deleteTempFiles: true,
          clearBrowserCache: true,
          logActions: true,
          autoBackupGoogle: false,
          syncBetweenPC: false,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Настройки сброшены к значениям по умолчанию'
    });
  } catch (error) {
    console.error('Ошибка сброса глобальных настроек:', error);
    return NextResponse.json(
      { error: 'Не удалось сбросить настройки' },
      { status: 500 }
    );
  }
}
