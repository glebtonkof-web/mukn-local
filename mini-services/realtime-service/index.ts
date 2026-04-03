/**
 * Real-time Service - WebSocket сервер для обновлений в реальном времени
 * Порт: 3003
 */

import { Server } from 'socket.io';

const PORT = 3003;

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Типы событий
type EventType =
  | 'influencer:created'
  | 'influencer:updated'
  | 'influencer:deleted'
  | 'account:status'
  | 'account:banned'
  | 'campaign:created'
  | 'campaign:updated'
  | 'post:published'
  | 'lead:new'
  | 'notification:new'
  | 'risk:alert';

interface EventData {
  type: EventType;
  payload: unknown;
  timestamp: Date;
}

// Хранилище подключений
const connectedClients = new Map<string, Set<string>>(); // userId -> socketIds

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Аутентификация
  socket.on('auth', (userId: string) => {
    socket.data.userId = userId;

    if (!connectedClients.has(userId)) {
      connectedClients.set(userId, new Set());
    }
    connectedClients.get(userId)!.add(socket.id);

    socket.join(`user:${userId}`);
    console.log(`[WS] User ${userId} authenticated on socket ${socket.id}`);
  });

  // Подписка на инфлюенсера
  socket.on('subscribe:influencer', (influencerId: string) => {
    socket.join(`influencer:${influencerId}`);
    console.log(`[WS] Socket ${socket.id} subscribed to influencer ${influencerId}`);
  });

  // Отписка от инфлюенсера
  socket.on('unsubscribe:influencer', (influencerId: string) => {
    socket.leave(`influencer:${influencerId}`);
    console.log(`[WS] Socket ${socket.id} unsubscribed from influencer ${influencerId}`);
  });

  // Подписка на кампанию
  socket.on('subscribe:campaign', (campaignId: string) => {
    socket.join(`campaign:${campaignId}`);
  });

  // Отписка от кампании
  socket.on('unsubscribe:campaign', (campaignId: string) => {
    socket.leave(`campaign:${campaignId}`);
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (userId && connectedClients.has(userId)) {
      connectedClients.get(userId)!.delete(socket.id);
      if (connectedClients.get(userId)!.size === 0) {
        connectedClients.delete(userId);
      }
    }
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });

  // Пинг-понг для проверки соединения
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// API для отправки событий
export function emitToUser(userId: string, event: EventType, data: unknown) {
  const eventData: EventData = {
    type: event,
    payload: data,
    timestamp: new Date(),
  };
  io.to(`user:${userId}`).emit('event', eventData);
}

export function emitToInfluencer(influencerId: string, event: EventType, data: unknown) {
  const eventData: EventData = {
    type: event,
    payload: data,
    timestamp: new Date(),
  };
  io.to(`influencer:${influencerId}`).emit('event', eventData);
}

export function emitToCampaign(campaignId: string, event: EventType, data: unknown) {
  const eventData: EventData = {
    type: event,
    payload: data,
    timestamp: new Date(),
  };
  io.to(`campaign:${campaignId}`).emit('event', eventData);
}

export function broadcast(event: EventType, data: unknown) {
  const eventData: EventData = {
    type: event,
    payload: data,
    timestamp: new Date(),
  };
  io.emit('event', eventData);
}

console.log(`[WS] Real-time service running on port ${PORT}`);
