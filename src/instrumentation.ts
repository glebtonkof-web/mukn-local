/**
 * МУКН | Трафик - Instrumentation
 * Инициализация при старте сервера
 * Запуск критических сервисов для 24/7 работы
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting initialization...');

    try {
      // Инициализация Process Manager
      const { getProcessManager } = await import('@/lib/process-manager');
      const processManager = getProcessManager();
      processManager.start();
      console.log('[Instrumentation] Process Manager started');

      // Регистрируем shutdown callback для закрытия БД
      processManager.onShutdown(async () => {
        console.log('[Instrumentation] Closing database connections...');
        const { db } = await import('@/lib/db');
        await db.$disconnect();
        console.log('[Instrumentation] Database connections closed');
      });

      // Запуск микросервисов (опционально)
      // const { orchestrator } = await import('@/lib/microservice-orchestrator');
      // await orchestrator.startAll();

      console.log('[Instrumentation] Initialization completed');
    } catch (error) {
      console.error('[Instrumentation] Initialization error:', error);
    }
  }
}
