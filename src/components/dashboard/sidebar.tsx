'use client';

import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Rocket,
  Zap,
  Bell,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Кампании', icon: Rocket },
  { id: 'accounts', label: 'Аккаунты', icon: Users },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

interface SidebarProps {
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
}

export function Sidebar({ unreadNotifications = 0, onNotificationsClick }: SidebarProps) {
  const { activeTab, setActiveTab, notifications } = useAppStore();
  
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
      <div className="flex-1 px-3 py-4">
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
      </div>

      <Separator className="bg-[#2A2B32]" />

      {/* Bottom section */}
      <div className="p-3 space-y-1">
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
      </div>

      {/* Version */}
      <div className="p-4 text-center">
        <p className="text-xs text-[#8A8A8A]">v2.0.0 Enterprise</p>
      </div>
    </div>
  );
}
