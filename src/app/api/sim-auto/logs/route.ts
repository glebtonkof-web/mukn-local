/**
 * API для работы с логами
 */

import { NextRequest, NextResponse } from 'next/server';

// Глобальное хранилище логов (в памяти)
declare global {
  var muknLogs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    details?: string;
  }>;
}

// Инициализируем глобальное хранилище
if (!globalThis.muknLogs) {
  globalThis.muknLogs = [];
}

// Максимальное количество логов
const MAX_LOGS = 1000;

/**
 * Добавить лог (для использования из других модулей)
 */
export function addLog(
  level: 'info' | 'warn' | 'error' | 'success',
  message: string,
  details?: string
) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  
  globalThis.muknLogs.push(log);
  
  // Ограничиваем размер
  if (globalThis.muknLogs.length > MAX_LOGS) {
    globalThis.muknLogs = globalThis.muknLogs.slice(-MAX_LOGS);
  }
  
  // Также выводим в консоль
  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[consoleMethod](`[${level.toUpperCase()}] ${message}`, details || '');
}

/**
 * GET - Получить логи
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '500');
    const level = searchParams.get('level');
    
    let logs = globalThis.muknLogs || [];
    
    // Фильтрация по уровню
    if (level && level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }
    
    // Ограничение количества
    logs = logs.slice(-limit);
    
    return NextResponse.json({
      success: true,
      logs,
      total: globalThis.muknLogs?.length || 0
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: []
    }, { status: 500 });
  }
}

/**
 * DELETE - Очистить логи
 */
export async function DELETE(request: NextRequest) {
  try {
    globalThis.muknLogs = [];
    
    return NextResponse.json({
      success: true,
      message: 'Логи очищены'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
