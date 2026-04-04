'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, Users, DollarSign, TrendingUp, Image, 
  MessageSquare, Mic, Video, Heart, Eye, Play, Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ofmProfiles = [
  { id: '1', name: 'Алиса', status: 'active', revenue: 23400, subscribers: 567, stories: 12, avatar: '👩‍🦰' },
  { id: '2', name: 'Мария', status: 'active', revenue: 34500, subscribers: 892, stories: 24, avatar: '👩‍🦱' },
  { id: '3', name: 'Елена', status: 'paused', revenue: 12300, subscribers: 234, stories: 8, avatar: '👩' },
  { id: '4', name: 'Дарья', status: 'active', revenue: 45600, subscribers: 1234, stories: 45, avatar: '👩‍🦳' },
];

const stories = [
  { id: '1', profile: 'Алиса', views: 1234, reactions: 89, revenue: 2300 },
  { id: '2', profile: 'Мария', views: 2345, reactions: 156, revenue: 4500 },
  { id: '3', profile: 'Дарья', views: 3456, reactions: 234, revenue: 6700 },
];

export function OFMView() {
  const [profiles, setProfiles] = useState(ofmProfiles);
  const [activeTab, setActiveTab] = useState('profiles');

  const totalRevenue = profiles.reduce((acc, p) => acc + p.revenue, 0);
  const totalSubscribers = profiles.reduce((acc, p) => acc + p.subscribers, 0);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-[#E4405F]" />
            OFM - OnlyFans Model
          </h1>
          <p className="text-[#8A8A8A]">Управление моделями и контентом</p>
        </div>
        <Button className="bg-[#E4405F] hover:bg-[#E4405F]/80">
          <Users className="w-4 h-4 mr-2" />
          Добавить модель
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalRevenue.toLocaleString()}₽</p>
                <p className="text-xs text-[#8A8A8A]">Общий доход</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalSubscribers.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Подписчиков</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Image className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{profiles.reduce((a, p) => a + p.stories, 0)}</p>
                <p className="text-xs text-[#8A8A8A]">Stories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{profiles.length}</p>
                <p className="text-xs text-[#8A8A8A]">Моделей</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Табы */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="profiles" className="data-[state=active]:bg-[#E4405F]">Профили</TabsTrigger>
          <TabsTrigger value="stories" className="data-[state=active]:bg-[#E4405F]">Stories</TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-[#E4405F]">Комментарии</TabsTrigger>
          <TabsTrigger value="voice" className="data-[state=active]:bg-[#E4405F]">Голосовые</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className={cn(
                'bg-[#14151A] border-[#2A2B32]',
                profile.status === 'active' && 'border-l-4 border-l-[#E4405F]'
              )}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#1E1F26] flex items-center justify-center text-2xl">
                      {profile.avatar}
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-lg">{profile.name}</h4>
                      <Badge className={profile.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                        {profile.status === 'active' ? 'Активна' : 'Пауза'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-[#1E1F26] rounded">
                      <p className="text-lg font-bold text-white">{profile.subscribers}</p>
                      <p className="text-xs text-[#8A8A8A]">Подписчики</p>
                    </div>
                    <div className="p-2 bg-[#1E1F26] rounded">
                      <p className="text-lg font-bold text-white">{profile.stories}</p>
                      <p className="text-xs text-[#8A8A8A]">Stories</p>
                    </div>
                    <div className="p-2 bg-[#1E1F26] rounded">
                      <p className="text-lg font-bold text-[#00D26A]">{profile.revenue.toLocaleString()}₽</p>
                      <p className="text-xs text-[#8A8A8A]">Доход</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stories" className="mt-6">
          <div className="space-y-3">
            {stories.map((story) => (
              <Card key={story.id} className="bg-[#14151A] border-[#2A2B32]">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                        <Image className="w-5 h-5 text-[#E4405F]" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{story.profile}</p>
                        <div className="flex gap-4 text-xs text-[#8A8A8A]">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {story.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {story.reactions}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#00D26A] font-bold">{story.revenue.toLocaleString()}₽</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#E4405F]" />
                AI Комментарии для OFM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto text-[#8A8A8A] mb-4" />
                <p className="text-[#8A8A8A]">Настройте AI для автокомментариев</p>
                <Button className="mt-4 bg-[#E4405F]">Настроить</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#E4405F]" />
                Голосовые сообщения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mic className="w-12 h-12 mx-auto text-[#8A8A8A] mb-4" />
                <p className="text-[#8A8A8A]">TTS для голосовых сообщений</p>
                <Button className="mt-4 bg-[#E4405F]">Настроить TTS</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
