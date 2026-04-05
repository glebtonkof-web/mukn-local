/**
 * МУКН | Трафик - Instrumentation
 * Инициализация при старте сервера
 * Запуск критических сервисов для 24/7 работы
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting initialization...');
    console.log('[Instrumentation] Node.js version:', process.version);
    console.log('[Instrumentation] Platform:', process.platform);
    console.log('[Instrumentation] Environment:', process.env.NODE_ENV);

    try {
      // 1. Инициализация Process Manager
      console.log('[Instrumentation] Initializing Process Manager...');
      const { getProcessManager } = await import('@/lib/process-manager');
      const processManager = getProcessManager();
      processManager.start();
      console.log('[Instrumentation] Process Manager started');

      // 2. Регистрируем shutdown callback для закрытия БД
      processManager.onShutdown(async () => {
        console.log('[Instrumentation] Closing database connections...');
        const { db } = await import('@/lib/db');
        await db.$disconnect();
        console.log('[Instrumentation] Database connections closed');
      });

      // 3. Регистрируем shutdown callback для алертов
      processManager.onShutdown(async () => {
        console.log('[Instrumentation] Sending shutdown alert...');
        try {
          const { alerts } = await import('@/lib/alert-service');
          await alerts.warning(
            'Сервис останавливается',
            'МУКН | Трафик останавливается для обслуживания',
            'system'
          );
        } catch {
          // Ignore alert errors during shutdown
        }
      });

      // 4. Запуск Keep-Alive Service
      console.log('[Instrumentation] Starting Keep-Alive service...');
      try {
        const { keepAlive } = await import('@/lib/keep-alive');
        await keepAlive.start();
        console.log('[Instrumentation] Keep-Alive service started');
      } catch (error) {
        console.warn('[Instrumentation] Could not start Keep-Alive service:', error);
      }

      // 5. Отправка startup алерта
      try {
        const { alerts } = await import('@/lib/alert-service');
        await alerts.info(
          'Сервис запущен',
          `МУКН | Трафик запущен и готов к работе. Node ${process.version}`,
          'system'
        );
      } catch {
        // Ignore alert errors during startup
      }

      // 6. Проверка критических переменных окружения
      const requiredEnvVars = ['DATABASE_URL'];
      const missingVars = requiredEnvVars.filter(v => !process.env[v]);
      if (missingVars.length > 0) {
        console.warn('[Instrumentation] Missing environment variables:', missingVars);
      }

      // 7. Запись heartbeat в базу данных
      try {
        const { db } = await import('@/lib/db');
        await db.serviceHeartbeat.upsert({
          where: { serviceName: 'mukn-traffic' },
          create: {
            id: 'mukn-traffic-main',
            serviceName: 'mukn-traffic',
            status: 'running',
            lastHeartbeat: new Date(),
            uptime: 0,
          },
          update: {
            status: 'running',
            lastHeartbeat: new Date(),
          },
        });
      } catch (error) {
        console.warn('[Instrumentation] Could not write initial heartbeat:', error);
      }

      // 8. Запуск периодического heartbeat
      setInterval(async () => {
        try {
          const { db } = await import('@/lib/db');
          await db.serviceHeartbeat.update({
            where: { serviceName: 'mukn-traffic' },
            data: {
              lastHeartbeat: new Date(),
              uptime: Math.floor(process.uptime()),
            },
          });
        } catch {
          // Ignore heartbeat errors
        }
      }, 60000); // Каждую минуту

      console.log('[Instrumentation] ✅ Initialization completed');
      console.log('[Instrumentation] Application ready for 24/7 operation');
      
    } catch (error) {
      console.error('[Instrumentation] ❌ Initialization error:', error);
      
      // Попытка отправить алерт об ошибке
      try {
        const { alerts } = await import('@/lib/alert-service');
        await alerts.critical(
          'Ошибка инициализации',
          `Критическая ошибка при запуске: ${error}`,
          'system'
        );
      } catch {
        // Ignore
      }
    }
  }
}
