/**
 * Real-time Notifications Hook
 * Provides WebSocket connection for real-time updates and notifications
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

// Types
export interface RealtimeNotification {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export interface RealtimeEvent {
  event: string;
  payload: unknown;
  timestamp: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastConnected: Date | null;
}

// Event types for strong typing
type EventType =
  | 'notification:new'
  | 'notification:read'
  | 'comment:new'
  | 'comment:posted'
  | 'comment:failed'
  | 'account:banned'
  | 'account:limited'
  | 'account:flood'
  | 'campaign:started'
  | 'campaign:paused'
  | 'campaign:completed'
  | 'lead:new'
  | 'lead:converted'
  | 'risk:alert'
  | 'limit:reached'
  | 'task:completed'
  | 'task:failed'
  | 'system:warning'
  | 'system:error';

interface UseRealtimeNotificationsOptions {
  userId?: string;
  enableToasts?: boolean;
  enableSound?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onNotification?: (notification: RealtimeNotification) => void;
  onEvent?: (event: RealtimeEvent) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    userId = 'default-user',
    enableToasts = true,
    enableSound = false,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    onNotification,
    onEvent,
    onConnectionChange,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
    lastConnected: null,
  });
  
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Play notification sound
  const playSound = useCallback(() => {
    if (!enableSound || typeof window === 'undefined') return;
    
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Ignore audio errors
    }
  }, [enableSound]);
  
  // Show toast notification
  const showToast = useCallback((notification: RealtimeNotification) => {
    if (!enableToasts) return;
    
    const toastOptions = {
      description: notification.message,
      action: notification.action ? {
        label: notification.action.label,
        onClick: notification.action.onClick || (() => {}),
      } : undefined,
    };
    
    switch (notification.type) {
      case 'success':
        toast.success(notification.title, toastOptions);
        break;
      case 'error':
        toast.error(notification.title, toastOptions);
        break;
      case 'warning':
        toast.warning(notification.title, toastOptions);
        break;
      default:
        toast.info(notification.title, toastOptions);
    }
  }, [enableToasts]);
  
  // Handle incoming notification
  const handleNotification = useCallback((data: RealtimeNotification) => {
    const notification: RealtimeNotification = {
      ...data,
      timestamp: new Date(data.timestamp || new Date()),
    };
    
    // Add to local state
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
    
    // Callback
    if (onNotification) {
      onNotification(notification);
    }
    
    // Show toast
    showToast(notification);
    
    // Play sound
    playSound();
  }, [onNotification, showToast, playSound]);
  
  // Handle incoming event
  const handleEvent = useCallback((data: RealtimeEvent) => {
    const event: RealtimeEvent = {
      ...data,
      timestamp: new Date(data.timestamp || new Date()),
    };
    
    if (onEvent) {
      onEvent(event);
    }
  }, [onEvent]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    
    setStatus(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const socket = io('/', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        query: {
          XTransformPort: '3003',
          userId,
        },
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay,
      });
      
      socketRef.current = socket;
      
      // Connection events
      socket.on('connect', () => {
        console.log('[Realtime] Connected');
        setStatus({
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
          lastConnected: new Date(),
        });
        
        // Authenticate
        socket.emit('auth', userId);
        
        if (onConnectionChange) {
          onConnectionChange({
            isConnected: true,
            isConnecting: false,
            error: null,
            reconnectAttempts: 0,
            lastConnected: new Date(),
          });
        }
      });
      
      socket.on('disconnect', (reason) => {
        console.log('[Realtime] Disconnected:', reason);
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: reason,
        }));
        
        if (onConnectionChange) {
          onConnectionChange({
            isConnected: false,
            isConnecting: false,
            error: reason,
            reconnectAttempts: status.reconnectAttempts,
            lastConnected: status.lastConnected,
          });
        }
      });
      
      socket.on('connect_error', (error) => {
        console.error('[Realtime] Connection error:', error);
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message,
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));
      });
      
      // Application events
      socket.on('notification:new', handleNotification);
      socket.on('notification', handleNotification);
      socket.on('event', handleEvent);
      
      // Specific event types
      socket.on('comment:new', (data) => {
        handleNotification({
          id: `comment-${Date.now()}`,
          type: 'info',
          title: 'Новый комментарий',
          message: `Комментарий в канале ${data.channelName || 'неизвестно'}`,
          timestamp: new Date(),
          entityType: 'comment',
          entityId: data.id,
        });
      });
      
      socket.on('comment:posted', (data) => {
        handleNotification({
          id: `posted-${Date.now()}`,
          type: 'success',
          title: 'Комментарий опубликован',
          message: data.message || 'Комментарий успешно опубликован',
          timestamp: new Date(),
          entityType: 'comment',
          entityId: data.id,
        });
      });
      
      socket.on('account:banned', (data) => {
        handleNotification({
          id: `ban-${Date.now()}`,
          type: 'error',
          title: 'Аккаунт забанен',
          message: `Аккаунт @${data.username || data.phone} был заблокирован`,
          timestamp: new Date(),
          entityType: 'account',
          entityId: data.id,
        });
      });
      
      socket.on('account:limited', (data) => {
        handleNotification({
          id: `limit-${Date.now()}`,
          type: 'warning',
          title: 'Аккаунт ограничен',
          message: `Аккаунт @${data.username || data.phone} получил ограничения`,
          timestamp: new Date(),
          entityType: 'account',
          entityId: data.id,
        });
      });
      
      socket.on('campaign:started', (data) => {
        handleNotification({
          id: `campaign-${Date.now()}`,
          type: 'success',
          title: 'Кампания запущена',
          message: `Кампания "${data.name}" успешно запущена`,
          timestamp: new Date(),
          entityType: 'campaign',
          entityId: data.id,
        });
      });
      
      socket.on('lead:new', (data) => {
        handleNotification({
          id: `lead-${Date.now()}`,
          type: 'success',
          title: 'Новый лид!',
          message: `Получен новый лид из ${data.source || 'кампании'}`,
          timestamp: new Date(),
          entityType: 'lead',
          entityId: data.id,
        });
      });
      
      socket.on('risk:alert', (data) => {
        handleNotification({
          id: `risk-${Date.now()}`,
          type: data.level === 'high' ? 'error' : 'warning',
          title: 'Предупреждение о риске',
          message: data.message,
          timestamp: new Date(),
          entityType: 'account',
          entityId: data.accountId,
        });
      });
      
      socket.on('limit:reached', (data) => {
        handleNotification({
          id: `limit-reached-${Date.now()}`,
          type: 'warning',
          title: 'Достигнут лимит',
          message: data.message,
          timestamp: new Date(),
          entityType: data.entityType,
          entityId: data.entityId,
        });
      });
      
      socket.on('task:completed', (data) => {
        handleNotification({
          id: `task-${Date.now()}`,
          type: 'success',
          title: 'Задача завершена',
          message: data.message || 'Задача успешно выполнена',
          timestamp: new Date(),
          entityType: 'task',
          entityId: data.id,
        });
      });
      
    } catch (error) {
      console.error('[Realtime] Failed to connect:', error);
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: 'Failed to initialize socket',
      }));
    }
  }, [userId, maxReconnectAttempts, reconnectDelay, handleNotification, handleEvent, onConnectionChange, status.reconnectAttempts, status.lastConnected]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setStatus({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
      lastConnected: null,
    });
  }, []);
  
  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Emit read event
    if (socketRef.current) {
      socketRef.current.emit('notification:read', notificationId);
    }
  }, []);
  
  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Emit read all event
    if (socketRef.current) {
      socketRef.current.emit('notification:read-all');
    }
  }, []);
  
  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);
  
  // Subscribe to entity updates
  const subscribeToEntity = useCallback((entityType: string, entityId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe:entity', { entityType, entityId });
    }
  }, []);
  
  // Unsubscribe from entity updates
  const unsubscribeFromEntity = useCallback((entityType: string, entityId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:entity', { entityType, entityId });
    }
  }, []);
  
  // Send custom event
  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);
  
  // Auto-connect on mount
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      connect();
    }, 0);
    
    return () => {
      clearTimeout(timer);
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Reconnect on userId change
  useEffect(() => {
    if (userId && socketRef.current) {
      socketRef.current.emit('auth', userId);
    }
  }, [userId]);
  
  return {
    // Status
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
    error: status.error,
    reconnectAttempts: status.reconnectAttempts,
    lastConnected: status.lastConnected,
    
    // Notifications
    notifications,
    unreadCount,
    
    // Actions
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    
    // Subscriptions
    subscribeToEntity,
    unsubscribeFromEntity,
    
    // Low-level
    emit,
    getSocket: () => socketRef.current,
  };
}

export default useRealtimeNotifications;
