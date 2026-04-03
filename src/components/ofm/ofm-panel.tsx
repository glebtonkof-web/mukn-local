'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Image as ImageIcon,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Plus,
  Sparkles,
  Play,
  Heart,
  Zap,
  DollarSign,
  Eye,
} from 'lucide-react';
import { ProfilesPanel } from './profiles-panel';
import { StoriesPanel } from './stories-panel';
import { CommentsPanel } from './comments-panel';
import { TrafficFunnelPanel } from './traffic-funnel-panel';
import { TrafficMethodsPanelExtended } from './traffic-methods-panel-extended';

export function OFMPanel() {
  const [activeTab, setActiveTab] = useState('profiles');

  // Mock overview stats
  const overviewStats = {
    totalProfiles: 12,
    activeStories: 24,
    commentsToday: 156,
    revenue: 24500,
  };

  const quickActions = [
    { icon: Plus, label: 'Создать профиль', color: '#FF6B9D' },
    { icon: ImageIcon, label: 'Генерировать сторис', color: '#6C63FF' },
    { icon: Play, label: 'Запустить кампанию', color: '#00D26A' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Heart className="w-7 h-7 text-[#FF6B9D]" />
            AI OFM Module
          </h1>
          <p className="text-[#8A8A8A]">Автоматизация трафика для OnlyFans моделей</p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white hover:border-[#FF6B9D]"
            >
              <action.icon className="w-4 h-4 mr-2" style={{ color: action.color }} />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#FF6B9D]/20 to-[#FF6B9D]/5 border-[#FF6B9D]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#FF6B9D]/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#FF6B9D]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{overviewStats.totalProfiles}</p>
                <p className="text-sm text-[#FF6B9D]">Профилей</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#6C63FF]/20 to-[#6C63FF]/5 border-[#6C63FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#6C63FF]/20 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{overviewStats.activeStories}</p>
                <p className="text-sm text-[#6C63FF]">Активных сторис</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#00D26A]/20 to-[#00D26A]/5 border-[#00D26A]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#00D26A]/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{overviewStats.commentsToday}</p>
                <p className="text-sm text-[#00D26A]">Комментариев сегодня</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#FFB800]/20 to-[#FFB800]/5 border-[#FFB800]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#FFB800]/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">${overviewStats.revenue.toLocaleString()}</p>
                <p className="text-sm text-[#FFB800]">Доход за месяц</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32] grid grid-cols-5">
          <TabsTrigger value="profiles" className="data-[state=active]:bg-[#FF6B9D]">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Профили</span>
          </TabsTrigger>
          <TabsTrigger value="stories" className="data-[state=active]:bg-[#6C63FF]">
            <ImageIcon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Stories</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-[#00D26A]">
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Комменты</span>
          </TabsTrigger>
          <TabsTrigger value="funnel" className="data-[state=active]:bg-[#FFB800]">
            <TrendingUp className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Воронка</span>
          </TabsTrigger>
          <TabsTrigger value="methods" className="data-[state=active]:bg-[#00D4AA]">
            <Zap className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">130 Методов</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-6">
          <ProfilesPanel />
        </TabsContent>

        <TabsContent value="stories" className="mt-6">
          <StoriesPanel />
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <CommentsPanel />
        </TabsContent>

        <TabsContent value="funnel" className="mt-6">
          <TrafficFunnelPanel />
        </TabsContent>

        <TabsContent value="methods" className="mt-6">
          <TrafficMethodsPanelExtended />
        </TabsContent>
      </Tabs>

      {/* Analytics Summary Card - shown at bottom */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#6C63FF]" />
            Быстрая аналитика
          </CardTitle>
          <CardDescription>Обзор ключевых показателей эффективности</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#FF6B9D] to-[#6C63FF] flex items-center justify-center mb-3">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">45.2K</p>
              <p className="text-sm text-[#8A8A8A]">Просмотров</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#00D26A] to-[#00D4AA] flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">2.8K</p>
              <p className="text-sm text-[#8A8A8A]">Подписчиков</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#FFB800] to-[#FF6B9D] flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">6.2%</p>
              <p className="text-sm text-[#8A8A8A]">Конверсия</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D26A] flex items-center justify-center mb-3">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">$8.76</p>
              <p className="text-sm text-[#8A8A8A]">CPA</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
