/**
 * Publisher Service - Автоматическая публикация контента
 * Порт: 3005
 */

import { createServer } from 'http';
import { parse } from 'url';

const PORT = 3005;

// Типы
type Platform = 'telegram' | 'instagram' | 'tiktok' | 'youtube';
type PublishStatus = 'pending' | 'published' | 'failed' | 'scheduled';

interface PublishTask {
  id: string;
  platform: Platform;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PublishStatus;
  platformPostId?: string;
  error?: string;
  retries: number;
  maxRetries: number;
}

interface PublishResult {
  taskId: string;
  success: boolean;
  platformPostId?: string;
  publishedAt?: Date;
  error?: string;
}

// Очередь задач
const taskQueue: PublishTask[] = [];
const publishedTasks: PublishTask[] = [];
const MAX_QUEUE_SIZE = 1000;

// Статистика
const stats = {
  totalPublished: 0,
  totalFailed: 0,
  byPlatform: {} as Record<Platform, { published: number; failed: number }>,
  averageLatency: 0,
};

// Инициализация статистики по платформам
(['telegram', 'instagram', 'tiktok', 'youtube'] as Platform[]).forEach(p => {
  stats.byPlatform[p] = { published: 0, failed: 0 };
});

// Добавление задачи в очередь
function createTask(
  platform: Platform,
  content: string,
  mediaUrls?: string[],
  scheduledAt?: Date
): PublishTask {
  const task: PublishTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    platform,
    content,
    mediaUrls,
    scheduledAt,
    status: 'pending',
    retries: 0,
    maxRetries: 3,
  };

  if (taskQueue.length < MAX_QUEUE_SIZE) {
    taskQueue.push(task);
    console.log(`[Publisher] Task ${task.id} added to queue`);
  } else {
    throw new Error('Queue is full');
  }

  return task;
}

// Публикация на платформе
async function publishToPlatform(task: PublishTask): Promise<PublishResult> {
  const startTime = Date.now();
  console.log(`[Publisher] Publishing to ${task.platform}: ${task.id}`);

  try {
    // В реальной реализации - вызов API платформы
    // Telegram: fetch(`https://api.telegram.org/bot${token}/sendMessage`, {...})
    // Instagram: graph.facebook.com API
    // TikTok: business-api.tiktok.com
    // YouTube: youtube.googleapis.com

    // Симуляция публикации
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // 95% успешность
    if (Math.random() > 0.05) {
      const latency = Date.now() - startTime;
      stats.averageLatency = (stats.averageLatency * stats.totalPublished + latency) / (stats.totalPublished + 1);

      return {
        taskId: task.id,
        success: true,
        platformPostId: `${task.platform}_${Date.now()}`,
        publishedAt: new Date(),
      };
    } else {
      throw new Error('Platform API error');
    }
  } catch (error) {
    return {
      taskId: task.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Обработка очереди
async function processQueue(): Promise<void> {
  const now = new Date();

  for (let i = taskQueue.length - 1; i >= 0; i--) {
    const task = taskQueue[i];

    // Проверка scheduled задач
    if (task.scheduledAt && task.scheduledAt > now) {
      continue;
    }

    // Удаляем из очереди
    taskQueue.splice(i, 1);

    // Публикуем
    const result = await publishToPlatform(task);

    if (result.success) {
      task.status = 'published';
      task.publishedAt = result.publishedAt;
      task.platformPostId = result.platformPostId;

      stats.totalPublished++;
      stats.byPlatform[task.platform].published++;

      console.log(`[Publisher] Task ${task.id} published successfully`);
    } else {
      task.retries++;
      task.error = result.error;

      if (task.retries < task.maxRetries) {
        // Повторная попытка
        taskQueue.push(task);
        console.log(`[Publisher] Task ${task.id} retry ${task.retries}/${task.maxRetries}`);
      } else {
        task.status = 'failed';
        stats.totalFailed++;
        stats.byPlatform[task.platform].failed++;
        console.log(`[Publisher] Task ${task.id} failed after ${task.retries} retries`);
      }
    }

    publishedTasks.push(task);
  }
}

// Периодическая обработка очереди
setInterval(processQueue, 5000);

// HTTP сервер
const server = createServer(async (req, res) => {
  const url = parse(req.url || '', true);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /publish - добавить задачу на публикацию
  if (req.method === 'POST' && url.pathname === '/publish') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { platform, content, mediaUrls, scheduledAt } = JSON.parse(body);
        const task = createTask(
          platform,
          content,
          mediaUrls,
          scheduledAt ? new Date(scheduledAt) : undefined
        );

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ taskId: task.id, status: task.status }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // GET /queue - получить очередь
  if (req.method === 'GET' && url.pathname === '/queue') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ queue: taskQueue, count: taskQueue.length }));
    return;
  }

  // GET /published - получить опубликованные
  if (req.method === 'GET' && url.pathname === '/published') {
    const limit = parseInt(url.query?.limit as string || '50');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tasks: publishedTasks.slice(-limit) }));
    return;
  }

  // GET /task/:id - статус задачи
  if (req.method === 'GET' && url.pathname?.startsWith('/task/')) {
    const taskId = url.pathname.split('/')[2];
    const task = taskQueue.find(t => t.id === taskId) || publishedTasks.find(t => t.id === taskId);

    if (task) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    return;
  }

  // GET /stats - статистика
  if (req.method === 'GET' && url.pathname === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
    return;
  }

  // DELETE /task/:id - отменить задачу
  if (req.method === 'DELETE' && url.pathname?.startsWith('/task/')) {
    const taskId = url.pathname.split('/')[2];
    const index = taskQueue.findIndex(t => t.id === taskId);

    if (index !== -1) {
      taskQueue.splice(index, 1);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Task not found in queue' }));
    }
    return;
  }

  // GET /health - health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      queueSize: taskQueue.length,
      totalPublished: stats.totalPublished,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[Publisher] Running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Publisher] Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('[Publisher] Server closed');
    process.exit(0);
  });
});

export { createTask, processQueue, stats };
