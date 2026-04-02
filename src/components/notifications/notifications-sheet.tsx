'use client';

import { useAppStore, Notification } from '@/store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const notificationIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const notificationColors = {
  success: '#00D26A',
  error: '#FF4D4D',
  warning: '#FFB800',
  info: '#6C63FF',
};

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const { notifications, markNotificationRead, clearNotifications } = useAppStore();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.isRead) {
        markNotificationRead(n.id);
      }
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
  };

  // Демо уведомления если пусто
  const demoNotifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Система запущена',
      message: 'МУКН | Трафик успешно инициализирован и готов к работе',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'info',
      title: 'База данных готова',
      message: 'SQLite база данных синхронизирована',
      isRead: false,
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: '3',
      type: 'warning',
      title: 'API ключи не настроены',
      message: 'Добавьте DeepSeek API ключ в настройках для генерации контента',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const displayNotifications = notifications.length > 0 ? notifications : demoNotifications;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[540px] bg-[#14151A] border-[#2A2B32] text-white">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-white">
            <Bell className="w-5 h-5 text-[#6C63FF]" />
            Уведомления
            {unreadCount > 0 && (
              <Badge className="bg-[#FF4D4D] text-white ml-2">
                {unreadCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-[#8A8A8A]">
            Уведомления о событиях в системе
          </SheetDescription>
        </SheetHeader>

        {/* Actions */}
        {displayNotifications.length > 0 && (
          <div className="flex gap-2 mt-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Прочитать все
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearNotifications}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Очистить
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-3 pr-4">
            {displayNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto text-[#8A8A8A] opacity-50 mb-4" />
                <p className="text-[#8A8A8A]">Нет уведомлений</p>
              </div>
            ) : (
              displayNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const color = notificationColors[notification.type];
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 rounded-lg border transition-all',
                      notification.isRead
                        ? 'bg-[#1E1F26] border-[#2A2B32]'
                        : 'bg-[#1E1F26] border-l-4 border-l-[#6C63FF] border-t-[#2A2B32] border-r-[#2A2B32] border-b-[#2A2B32]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'font-medium',
                            notification.isRead ? 'text-[#8A8A8A]' : 'text-white'
                          )}>
                            {notification.title}
                          </p>
                          <button
                            onClick={() => markNotificationRead(notification.id)}
                            className="text-[#8A8A8A] hover:text-white shrink-0"
                          >
                            {notification.isRead ? null : <X className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <p className={cn(
                          'text-sm mt-1',
                          notification.isRead ? 'text-[#6A6A6A]' : 'text-[#A0A0A0]'
                        )}>
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-[#6A6A6A] mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
