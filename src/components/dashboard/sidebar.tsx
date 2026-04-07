'use client';

import { useAppStore } from '@/store';
import { useModeStore } from '@/store/mode-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Rocket,
  Zap,
  Bell,
  Brain,
  Bot,
  DollarSign,
  TrendingUp,
  Globe,
  Cpu,
  MessageSquare,
  Target,
  UserCircle,
  Briefcase,
  Shield,
  Smartphone,
  Video,
  Calendar,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronRight,
  Terminal,
  Keyboard,
  Heart,
  Menu,
  Flame,
  ArrowUpRight,
  Monitor,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { ThemeSwitcherIcon } from '@/components/ui/theme-switcher';

const navSections = [
  {
    title: '🚀 Быстрый старт',
    items: [
      { id: 'auto-earn', label: 'Авто-заработок', icon: Zap, badge: 'NEW' },
      { id: 'sim-auto', label: 'SIM Auto', icon: Smartphone, badge: 'PRO' },
    ]
  },
  {
    title: 'Основное',
    items: [
      { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
      { id: 'campaigns', label: 'Кампании', icon: Rocket },
      { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    ]
  },
  {
    title: 'Трафик',
    items: [
      { id: 'traffic', label: 'Методы трафика', icon: TrendingUp, badge: '130' },
      { id: 'traffic-pour', label: 'Залив трафика', icon: ArrowUpRight, badge: 'NEW' },
      { id: 'offers', label: 'Офферы', icon: Target },
      { id: 'influencers', label: 'Инфлюенсеры', icon: UserCircle },
    ]
  },
  {
    title: 'AI & Автоматизация',
    items: [
      { id: 'content-studio', label: 'Content Studio', icon: Layers, badge: 'PRO' },
      { id: 'ai-assistant', label: 'AI Ассистент', icon: Bot, badge: 'NEW' },
      { id: 'deepseek-free', label: 'DeepSeek Free', icon: Cpu, badge: 'FREE' },
      { id: 'hunyuan', label: 'Hunyuan Studio', icon: Sparkles },
      { id: 'ai-comments', label: 'AI Комментарии', icon: MessageSquare },
      { id: 'ai-pool', label: 'AI Pool', icon: Brain },
    ]
  },
  {
    title: 'Instagram',
    items: [
      { id: 'instagram-warming', label: 'Прогрев IG', icon: Flame, badge: '21д' },
      { id: 'shadow-ban', label: 'Shadow Ban', icon: Shield },
    ]
  },
  {
    title: 'Advanced',
    items: [
      { id: 'advanced', label: 'Advanced Tools', icon: Cpu, badge: '17' },
      { id: 'warming', label: 'Прогрев', icon: Zap },
    ]
  },
  {
    title: 'Монетизация',
    items: [
      { id: 'monetization', label: 'Монетизация', icon: DollarSign },
      { id: 'ofm', label: 'OFM', icon: Briefcase },
    ]
  },
  {
    title: 'Инфраструктура',
    items: [
      { id: 'proxies', label: 'Прокси', icon: Globe },
      { id: 'sim-cards', label: 'SIM-карты', icon: Smartphone },
      { id: 'antidetect', label: 'Антидетект', icon: Monitor, badge: 'NEW' },
    ]
  },
  {
    title: 'Система',
    items: [
      { id: 'settings', label: 'Настройки', icon: Settings },
    ]
  },
];

interface SidebarProps {
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
  onMobileMenuClick?: () => void;
}

export function Sidebar({ unreadNotifications = 0, onNotificationsClick, onMobileMenuClick }: SidebarProps) {
  const { activeTab, setActiveTab, notifications } = useAppStore();
  const { uiMode, terminalMode, setTerminalMode } = useModeStore();
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  
  const actualUnreadCount = notifications.filter(n => !n.isRead).length || unreadNotifications;
  const isExpert = uiMode === 'expert';

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => 
      prev.includes(title) 
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  return (
    <div className="flex flex-col h-full w-64 bg-[#14151A] border-r border-[#2A2B32] hidden md:flex overflow-hidden">
      {/* Logo */}
      <div className="p-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">МУКН</h1>
            <p className="text-xs text-[#8A8A8A] truncate">Трафик Enterprise</p>
          </div>
        </div>
      </div>

      <Separator className="bg-[#2A2B32] shrink-0" />

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-2 min-w-0">
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#6C63FF] uppercase tracking-wider hover:text-[#8A8A8A] transition-colors min-w-0"
            >
              <span className="truncate">{section.title}</span>
              {collapsedSections.includes(section.title) ? (
                <ChevronRight className="w-3 h-3 shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 shrink-0" />
              )}
            </button>
            
            {!collapsedSections.includes(section.title) && (
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 rounded-lg font-medium transition-all duration-200 min-w-0',
                        isExpert ? 'py-2 text-xs' : 'py-3 text-sm',
                        isActive
                          ? 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/25'
                          : 'text-[#8A8A8A] hover:bg-[#1E1F26] hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <Badge className="bg-[#6C63FF]/20 text-[#6C63FF] text-xs px-1.5 py-0 shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        ))}
      </div>

      <Separator className="bg-[#2A2B32]" />

      {/* Theme Switcher */}
      <div className="p-2 flex items-center justify-between px-3">
        <span className="text-xs text-[#8A8A8A]">Тема</span>
        <ThemeSwitcherIcon />
      </div>

      <Separator className="bg-[#2A2B32]" />

      {/* Expert Mode Tools */}
      {isExpert && (
        <div className="p-2 border-t border-[#2A2B32]">
          <p className="px-3 py-1 text-xs text-[#6C63FF] uppercase tracking-wider">Expert Tools</p>
          <button
            onClick={() => setTerminalMode(true)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              terminalMode
                ? 'bg-[#6C63FF] text-white'
                : 'text-[#8A8A8A] hover:bg-[#1E1F26] hover:text-white'
            )}
          >
            <Terminal className="w-4 h-4" />
            Terminal Mode
            <Badge className="ml-auto bg-[#FFB800]/20 text-[#FFB800] text-xs">Ctrl+`</Badge>
          </button>
          <button
            onClick={() => toast.info('Горячие клавиши: N, P, R, /, Ctrl+K, Esc, Ctrl+T')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#8A8A8A] hover:bg-[#1E1F26] hover:text-white transition-all"
          >
            <Keyboard className="w-4 h-4" />
            Горячие клавиши
          </button>
        </div>
      )}

      {/* Bottom section */}
      <div className="p-2">
        <button
          onClick={onNotificationsClick}
          className={cn(
            'w-full flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all relative',
            isExpert ? 'py-2 text-xs' : 'py-2.5 text-sm'
          )}
        >
          <Bell className="w-4 h-4" />
          Уведомления
          {actualUnreadCount > 0 && (
            <Badge className="ml-auto bg-[#FF4D4D] text-white text-xs px-1.5 py-0">
              {actualUnreadCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Version */}
      <div className="p-3 text-center border-t border-[#2A2B32]">
        <p className="text-xs text-[#8A8A8A]">v2.1.0 Enterprise</p>
        <p className="text-xs text-[#6C63FF]">130 методов трафика</p>
      </div>
    </div>
  );
}

// Mobile Header Component
export function MobileHeader({ 
  unreadNotifications = 0, 
  onNotificationsClick,
  onMenuClick 
}: { 
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
  onMenuClick?: () => void;
}) {
  const { activeTab, notifications } = useAppStore();
  const actualUnreadCount = notifications.filter(n => !n.isRead).length || unreadNotifications;

  // Get current tab name
  const getCurrentTabName = () => {
    for (const section of navSections) {
      const item = section.items.find(i => i.id === activeTab);
      if (item) return item.label;
    }
    return 'МУКН';
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#14151A] border-b border-[#2A2B32] z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-11 w-11 touch-manipulation"
          aria-label="Открыть меню"
        >
          <Menu className="w-6 h-6 text-white" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-white">{getCurrentTabName()}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitcherIcon />
        <Button
          variant="ghost"
          size="icon"
          onClick={onNotificationsClick}
          className="h-11 w-11 touch-manipulation relative"
          aria-label="Уведомления"
        >
          <Bell className="w-5 h-5 text-[#8A8A8A]" />
          {actualUnreadCount > 0 && (
            <Badge className="absolute top-1 right-1 bg-[#FF4D4D] text-white text-xs w-5 h-5 flex items-center justify-center p-0">
              {actualUnreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
