'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Settings,
  BarChart3,
  Smartphone,
  Bell,
  LogOut,
  Zap,
  Calendar,
  Flame,
  Shield,
  Video,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { id: 'influencers', label: 'Инфлюенсеры', icon: Users },
  { id: 'ai-comments', label: 'AI-комментарии', icon: Sparkles },
  { id: 'ai-pool', label: 'ИИ-пул', icon: Zap },
  { id: 'content', label: 'Контент', icon: FileText },
  { id: 'video-generator', label: 'Генератор видео', icon: Video },
  { id: 'calendar', label: 'Календарь', icon: Calendar },
  { id: 'monetization', label: 'Монетизация', icon: DollarSign },
  { id: 'warming', label: 'Прогрев', icon: Flame },
  { id: 'infrastructure', label: 'Инфраструктура', icon: Smartphone },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'shadowban', label: 'Shadow Ban', icon: Shield },
];

interface SidebarProps {
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
}

export function Sidebar({ unreadNotifications = 0, onNotificationsClick }: SidebarProps) {
  const { activeTab, setActiveTab, setSettingsOpen, notifications } = useAppStore();
  
  const actualUnreadCount = notifications.filter(n => !n.isRead).length || unreadNotifications;

  return (
    <div className="flex flex-col h-full w-64 bg-[#14151A] border-r border-[#2A2B32]">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">МУКН</h1>
            <p className="text-xs text-[#8A8A8A]">Трафик</p>
          </div>
        </div>
      </div>

      <Separator className="bg-[#2A2B32]" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/25'
                    : 'text-[#8A8A8A] hover:bg-[#1E1F26] hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-[#2A2B32]" />

      {/* Bottom section */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#8A8A8A] hover:bg-[#1E1F26] hover:text-white transition-all"
        >
          <Settings className="w-5 h-5" />
          Настройки
        </button>

        <button
          onClick={onNotificationsClick}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#8A8A8A] hover:bg-[#1E1F26] hover:text-white transition-all relative"
        >
          <Bell className="w-5 h-5" />
          Уведомления
          {actualUnreadCount > 0 && (
            <Badge className="ml-auto bg-[#FF4D4D] text-white text-xs px-2 py-0.5">
              {actualUnreadCount}
            </Badge>
          )}
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#8A8A8A] hover:bg-[#1E1F26] hover:text-white transition-all">
          <LogOut className="w-5 h-5" />
          Выход
        </button>
      </div>

      {/* Version */}
      <div className="p-4 text-center">
        <p className="text-xs text-[#8A8A8A]">v1.0.0 Enterprise</p>
      </div>
    </div>
  );
}
