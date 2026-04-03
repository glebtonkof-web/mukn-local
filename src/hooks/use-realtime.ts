'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { io, Socket } from 'socket.io-client';

interface RealtimeEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
}

export function useRealtime(userId: string = 'default-user') {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const {
    addNotification,
    setInfluencers,
    influencers,
  } = useAppStore();

  // Обработка событий - объявляем сначала
  const handleEvent = useCallback((event: RealtimeEvent) => {
    console.log('[Realtime] Event received:', event.type);

    switch (event.type) {
      case 'influencer:created':
        setInfluencers([...influencers, event.payload as never]);
        addNotification({
          id: Date.now().toString(),
          type: 'success',
          title: 'Новый инфлюенсер',
          message: `Инфлюенсер ${(event.payload as { name: string }).name} создан`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        break;

      case 'influencer:updated':
        setInfluencers(
          influencers.map((i) =>
            i.id === (event.payload as { id: string }).id ? (event.payload as never) : i
          )
        );
        break;

      case 'influencer:deleted':
        setInfluencers(influencers.filter((i) => i.id !== (event.payload as { id: string }).id));
        break;

      case 'account:banned':
        addNotification({
          id: Date.now().toString(),
          type: 'error',
          title: 'Аккаунт забанен',
          message: 'Один из аккаунтов был заблокирован',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        break;

      case 'lead:new':
        addNotification({
          id: Date.now().toString(),
          type: 'success',
          title: 'Новый лид',
          message: 'Получен новый лид!',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        break;

      case 'risk:alert':
        const riskData = event.payload as { level: string; message: string };
        addNotification({
          id: Date.now().toString(),
          type: riskData.level === 'high' ? 'error' : 'warning',
          title: 'Предупреждение о риске',
          message: riskData.message,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        break;

      case 'notification:new':
        addNotification(event.payload as never);
        break;
    }
  }, [addNotification, influencers, setInfluencers]);

  // Подключение к WebSocket серверу
  useEffect(() => {
    const initSocket = async () => {
      try {
        socketRef.current = io('/', {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          query: {
            XTransformPort: '3003',
          },
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
          console.log('[Realtime] Connected');
          setIsConnected(true);
          socket.emit('auth', userId);
        });

        socket.on('disconnect', () => {
          console.log('[Realtime] Disconnected');
          setIsConnected(false);
        });

        socket.on('event', handleEvent);

        socket.on('connect_error', (error) => {
          console.error('[Realtime] Connection error:', error);
          setIsConnected(false);
        });
      } catch (error) {
        console.error('[Realtime] Failed to initialize socket:', error);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId, handleEvent]);

  // Подписка на инфлюенсера
  const subscribeToInfluencer = useCallback((influencerId: string) => {
    socketRef.current?.emit('subscribe:influencer', influencerId);
  }, []);

  // Отписка от инфлюенсера
  const unsubscribeFromInfluencer = useCallback((influencerId: string) => {
    socketRef.current?.emit('unsubscribe:influencer', influencerId);
  }, []);

  // Подписка на кампанию
  const subscribeToCampaign = useCallback((campaignId: string) => {
    socketRef.current?.emit('subscribe:campaign', campaignId);
  }, []);

  return {
    subscribeToInfluencer,
    unsubscribeFromInfluencer,
    subscribeToCampaign,
    isConnected,
  };
}
