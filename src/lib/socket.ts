/**
 * Socket.IO Server Handler
 * Handles WebSocket connections and real-time events for МУКН | Трафик
 */

import { Server as HTTPServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// Global variable to store the Socket.IO server instance
let io: SocketIOServer | null = null;

// Connected users map
const connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

// Initialize Socket.IO server
export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }
  
  io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });
  
  // Middleware for authentication
  io.use(async (socket: Socket, next) => {
    try {
      const userId = socket.handshake.query.userId as string || socket.handshake.auth.userId;
      
      if (userId) {
        socket.data.userId = userId;
        next();
      } else {
        // Allow anonymous connections
        socket.data.userId = 'anonymous';
        next();
      }
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  
  // Connection handler
  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    
    console.log(`[Socket.IO] User connected: ${userId} (${socket.id})`);
    
    // Track connected users
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);
    
    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Send initial connection status
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date(),
    });
    
    // Handle authentication
    socket.on('auth', async (data: string | { userId: string }) => {
      const newUserId = typeof data === 'string' ? data : data.userId;
      
      if (newUserId && newUserId !== userId) {
        // Leave old room
        socket.leave(`user:${userId}`);
        
        // Update user tracking
        connectedUsers.get(userId)?.delete(socket.id);
        if (connectedUsers.get(userId)?.size === 0) {
          connectedUsers.delete(userId);
        }
        
        // Update socket data
        socket.data.userId = newUserId;
        
        // Join new room
        socket.join(`user:${newUserId}`);
        
        // Track new user
        if (!connectedUsers.has(newUserId)) {
          connectedUsers.set(newUserId, new Set());
        }
        connectedUsers.get(newUserId)!.add(socket.id);
        
        console.log(`[Socket.IO] User re-authenticated: ${userId} -> ${newUserId}`);
      }
    });
    
    // Handle subscription to entities
    socket.on('subscribe:entity', (data: { entityType: string; entityId: string }) => {
      const room = `${data.entityType}:${data.entityId}`;
      socket.join(room);
      console.log(`[Socket.IO] User ${userId} subscribed to ${room}`);
    });
    
    // Handle unsubscription
    socket.on('unsubscribe:entity', (data: { entityType: string; entityId: string }) => {
      const room = `${data.entityType}:${data.entityId}`;
      socket.leave(room);
      console.log(`[Socket.IO] User ${userId} unsubscribed from ${room}`);
    });
    
    // Handle subscription to influencer
    socket.on('subscribe:influencer', (influencerId: string) => {
      socket.join(`influencer:${influencerId}`);
    });
    
    // Handle unsubscription from influencer
    socket.on('unsubscribe:influencer', (influencerId: string) => {
      socket.leave(`influencer:${influencerId}`);
    });
    
    // Handle subscription to campaign
    socket.on('subscribe:campaign', (campaignId: string) => {
      socket.join(`campaign:${campaignId}`);
    });
    
    // Handle notification read
    socket.on('notification:read', async (notificationId: string) => {
      try {
        await db.notification.update({
          where: { id: notificationId },
          data: { isRead: true, readAt: new Date() },
        });
      } catch (error) {
        console.error('[Socket.IO] Error marking notification as read:', error);
      }
    });
    
    // Handle notification read all
    socket.on('notification:read-all', async () => {
      try {
        await db.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
      } catch (error) {
        console.error('[Socket.IO] Error marking all notifications as read:', error);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${userId} (${socket.id}) - ${reason}`);
      
      // Remove from connected users
      connectedUsers.get(userId)?.delete(socket.id);
      if (connectedUsers.get(userId)?.size === 0) {
        connectedUsers.delete(userId);
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for user ${userId}:`, error);
    });
  });
  
  return io;
}

// Get the Socket.IO server instance
export function getSocketIO(): SocketIOServer | null {
  return io;
}

// Emit to specific user
export function emitToUser(userId: string, event: string, data: unknown): boolean {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return false;
  }
  
  io.to(`user:${userId}`).emit(event, data);
  return true;
}

// Emit to all users
export function emitToAll(event: string, data: unknown): boolean {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return false;
  }
  
  io.emit(event, data);
  return true;
}

// Emit to entity subscribers
export function emitToEntity(
  entityType: string,
  entityId: string,
  event: string,
  data: unknown
): boolean {
  if (!io) {
    console.warn('[Socket.IO] Server not initialized');
    return false;
  }
  
  io.to(`${entityType}:${entityId}`).emit(event, data);
  return true;
}

// Create and send notification
export async function sendNotification(
  userId: string,
  notification: {
    type: 'warning' | 'error' | 'success' | 'info';
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }
): Promise<void> {
  try {
    // Save to database
    const savedNotification = await db.notification.create({
      data: {
        id: nanoid(),
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        entityType: notification.entityType || null,
        entityId: notification.entityId || null,
        isRead: false
      },
    });
    
    // Emit via Socket.IO
    emitToUser(userId, 'notification:new', {
      id: savedNotification.id,
      type: savedNotification.type,
      title: savedNotification.title,
      message: savedNotification.message,
      entityType: savedNotification.entityType,
      entityId: savedNotification.entityId,
      timestamp: savedNotification.createdAt,
    });
  } catch (error) {
    console.error('[Socket.IO] Error sending notification:', error);
  }
}

// Log action and emit event
export async function logAndEmit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: unknown,
  event?: string
): Promise<void> {
  try {
    // Save to action log
    const log = await db.actionLog.create({
      data: {
        id: nanoid(),
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null
      },
    });
    
    // Emit event if specified
    if (event && io) {
      emitToUser(userId, event, {
        logId: log.id,
        action,
        entityType,
        entityId,
        details,
        timestamp: log.createdAt,
      });
      
      // Also emit to entity subscribers
      if (entityId) {
        emitToEntity(entityType, entityId, event, {
          logId: log.id,
          action,
          userId,
          details,
          timestamp: log.createdAt,
        });
      }
    }
  } catch (error) {
    console.error('[Socket.IO] Error logging action:', error);
  }
}

// Get connected users count
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

// Check if user is connected
export function isUserConnected(userId: string): boolean {
  const sockets = connectedUsers.get(userId);
  return sockets !== undefined && sockets.size > 0;
}

// Export types for external use
export type { Socket, SocketIOServer };
