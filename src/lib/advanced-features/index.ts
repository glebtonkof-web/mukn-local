// Экспорт всех продвинутых функций
// МУКН | Трафик - Enterprise AI-платформа

// 1. Пошаговая генерация контента
export { stepByStep, StepByStepGenerator, getStepByStepGenerator } from './step-by-step-generator';
export type { StepConfig, StepResult, ContentType, GenerationStep } from './step-by-step-generator';

// 2. Детальный логгер действий
export { actionLogger, getActionLogger } from './action-logger';
export type { LogEntry, LogFilter, LogAction, LogEntityType } from './action-logger';

// 3. Рейтинг понимания стиля
export { aiStyleRating, getAIStyleRating } from './ai-style-rating';
export type { StyleRatingComponents, StyleFeedback, StylePattern } from './ai-style-rating';

// 4. Маскировка трафика
export { trafficMasking, getTrafficMasking } from './traffic-masking';
export type { MaskingProfile, BrowserFingerprint } from './traffic-masking';

// 5. Отправка отчётов
export { reportSender, getReportSender } from './report-sender';
export type { ReportConfig, ReportData, ReportChannel } from './report-sender';

// 6. Интеграция со стоками
export { stockIntegration, getStockIntegration } from './stock-integration';
export type { StockProvider, StockImage, StockVideo, StockSearchOptions } from './stock-integration';

// 7. Stories-слайды
export { storiesSlides, getStoriesGenerator } from './stories-generator';
export type { StorySlide, StoriesConfig } from './stories-generator';

// 8. Интерактивные опросы
export { interactivePolls, getInteractivePolls } from './interactive-polls';
export type { PollOption, PollConfig } from './interactive-polls';

// 9. Генерация мемов
export { memeGenerator, getMemeGenerator } from './meme-generator';
export type { MemeTemplate, MemeConfig } from './meme-generator';

// 10. Генерация GIF
export { gifGenerator, getGIFGenerator } from './gif-generator';
export type { GIFConfig, GIFResult } from './gif-generator';

// 11. Вечнозелёный контент
export { evergreenContent, getEvergreenService } from './evergreen-content';
export type { EvergreenConfig, EvergreenUpdate } from './evergreen-content';

// 12. Цепочки постов (воронки)
export { postFunnel, getPostFunnel } from './post-funnel';
export type { FunnelStage, FunnelConfig } from './post-funnel';

// 13. Авто-репост
export { autoRepost, getAutoRepost } from './auto-repost';
export type { RepostSource, RepostConfig, ViralPost } from './auto-repost';

// 14. Полностью автоматический режим
export { fullAutoMode, getFullAutoMode } from './full-auto-mode';
export type { FullAutoConfig, AutoAction } from './full-auto-mode';

// 15-19. Дополнительные функции
export { 
  trendAdapter, 
  failureAnalyzer, 
  contentIdeasGenerator, 
  bestTimePredictor, 
  audienceEmotionAnalyzer 
} from './additional-features';

// Инициализация всех сервисов
export async function initializeAdvancedFeatures(): Promise<void> {
  console.log('[AdvancedFeatures] Initializing...');
  
  // Проверяем подключение к БД
  try {
    const { db } = await import('../db');
    await db.$queryRaw`SELECT 1`;
    console.log('[AdvancedFeatures] Database connected');
  } catch (error) {
    console.error('[AdvancedFeatures] Database connection failed:', error);
  }
  
  console.log('[AdvancedFeatures] Ready');
}
