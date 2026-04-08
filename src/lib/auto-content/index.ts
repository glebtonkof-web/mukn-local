/**
 * Auto Content Module - Автономная генерация контента 24/365
 * Экспорт всех компонентов модуля
 */

export * from './types';
export { AutoContentService, getAutoContentService } from './auto-content-service';
export { PromptVariator, getPromptVariator } from './prompt-variator';

// Инициализация при импорте
import { getAutoContentService } from './auto-content-service';

let initialized = false;

export async function initializeAutoContent(): Promise<void> {
  if (initialized) return;

  const service = getAutoContentService();
  await service.initialize();
  initialized = true;

  console.log('[AutoContent] Module initialized');
}

// Автоинициализация
if (typeof window === 'undefined') {
  initializeAutoContent().catch(console.error);
}
