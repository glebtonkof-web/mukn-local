// WebSocket сервис для real-time логов и уведомлений
// Порт: 3004

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const PORT = 3004;

// Хранилище логов в памяти
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context?: Record<string, unknown>;
  service?: string;
}

const logBuffer: LogEntry[] = [];
const MAX_LOGS = 500;

// Создаём HTTP сервер
const httpServer = new HttpServer();

// Создаём Socket.IO сервер
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Интерфейс для подключённых клиентов
interface ConnectedClient {
  id: string;
  userId?: string;
  subscriptions: Set<string>;
}

const connectedClients = new Map<string, ConnectedClient>();

// Обработка подключений
io.on('connection', (socket: Socket) => {
  console.log(`[LogsService] Client connected: ${socket.id}`);
  
  connectedClients.set(socket.id, {
    id: socket.id,
    subscriptions: new Set(['logs', 'notifications']),
  });

  // Отправляем последние логи при подключении
  socket.emit('logs:history', logBuffer.slice(-100));

  // Подписка на канал
  socket.on('subscribe', (channel: string) => {
    const client = connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.add(channel);
      console.log(`[LogsService] Client ${socket.id} subscribed to ${channel}`);
    }
  });

  // Отписка от канала
  socket.on('unsubscribe', (channel: string) => {
    const client = connectedClients.get(socket.id);
    if (client) {
      client.subscriptions.delete(channel);
      console.log(`[LogsService] Client ${socket.id} unsubscribed from ${channel}`);
    }
  });

  // Приём нового лога от клиента (например, от web-приложения)
  socket.on('log', (entry: Omit<LogEntry, 'id'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Добавляем в буфер
    logBuffer.push(newEntry);
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.shift();
    }

    // Рассылаем всем подписанным на логи
    broadcastLog(newEntry);
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    console.log(`[LogsService] Client disconnected: ${socket.id}`);
    connectedClients.delete(socket.id);
  });
});

// Рассылка лога всем подписанным клиентам
function broadcastLog(entry: LogEntry) {
  connectedClients.forEach((client) => {
    if (client.subscriptions.has('logs')) {
      io.to(client.id).emit('log', entry);
    }
  });
}

// Рассылка уведомления
function broadcastNotification(notification: {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
}) {
  connectedClients.forEach((client) => {
    if (client.subscriptions.has('notifications')) {
      io.to(client.id).emit('notification', notification);
    }
  });
}

// REST API для добавления логов извне
import { createServer as createRestServer } from 'http';
import { parse } from 'url';

const restHandler = async (req: any, res: any) => {
  const url = parse(req.url || '', true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /log - добавить лог
  if (req.method === 'POST' && url.pathname === '/log') {
    let body = '';
    req.on('data', (chunk: string) => body += chunk);
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        const newEntry: LogEntry = {
          ...entry,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: entry.timestamp || new Date().toISOString(),
        };

        logBuffer.push(newEntry);
        if (logBuffer.length > MAX_LOGS) {
          logBuffer.shift();
        }

        broadcastLog(newEntry);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: newEntry.id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // POST /notification - отправить уведомление
  if (req.method === 'POST' && url.pathname === '/notification') {
    let body = '';
    req.on('data', (chunk: string) => body += chunk);
    req.on('end', () => {
      try {
        const notification = JSON.parse(body);
        notification.id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        broadcastNotification(notification);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: notification.id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // GET /logs - получить последние логи
  if (req.method === 'GET' && url.pathname === '/logs') {
    const limit = parseInt(url.query?.limit as string || '100');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(logBuffer.slice(-limit)));
    return;
  }

  // GET /health - health check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      connections: connectedClients.size,
      logCount: logBuffer.length,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
};

const restServer = createRestServer(restHandler);
restServer.listen(PORT + 1, () => {
  console.log(`[LogsService] REST API listening on port ${PORT + 1}`);
});

// Запуск WebSocket сервера
httpServer.listen(PORT, () => {
  console.log(`[LogsService] WebSocket server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[LogsService] Received SIGTERM, shutting down...');
  io.close(() => {
    console.log('[LogsService] WebSocket server closed');
  });
  restServer.close(() => {
    console.log('[LogsService] REST server closed');
  });
});

export { io, broadcastLog, broadcastNotification };
