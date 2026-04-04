'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  UserCircle, Plus, DollarSign, TrendingUp, ExternalLink,
  Edit, Trash2, Instagram, Youtube, Twitter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const influencers = [
  { id: '1', name: 'Crypto Alex', platform: 'Telegram', subscribers: 125000, engagement: 8.5, revenue: 45000, avatar: '👨‍💼' },
  { id: '2', name: 'Trading Queen', platform: 'Instagram', subscribers: 89000, engagement: 6.2, revenue: 32000, avatar: '👩‍💼' },
  { id: '3', name: 'Signal Master', platform: 'TikTok', subscribers: 234000, engagement: 12.3, revenue: 67000, avatar: '🧑‍💻' },
  { id: '4', name: 'Invest Pro', platform: 'YouTube', subscribers: 56000, engagement: 4.5, revenue: 23000, avatar: '👨‍🎓' },
];

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'Instagram': return Instagram;
    case 'TikTok': return Youtube;
    case 'YouTube': return Youtube;
    case 'Twitter': return Twitter;
    default: return UserCircle;
  }
};

export function InfluencersView() {
  const [influencersList] = useState(influencers);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInfluencers = influencersList.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = influencersList.reduce((a, i) => a + i.revenue, 0);
  const totalSubscribers = influencersList.reduce((a, i) => a + i.subscribers, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCircle className="w-7 h-7 text-[#6C63FF]" />
            Инфлюенсеры
          </h1>
          <p className="text-[#8A8A8A]">{influencersList.length} партнёров</p>
        </div>
        <Button className="bg-[#6C63FF]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить инфлюенсера
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalRevenue.toLocaleString()}₽</p>
                <p className="text-xs text-[#8A8A8A]">Доход</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(totalSubscribers / 1000).toFixed(0)}K</p>
                <p className="text-xs text-[#8A8A8A]">Подписчиков</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{influencersList.length}</p>
                <p className="text-xs text-[#8A8A8A]">Инфлюенсеров</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {(influencersList.reduce((a, i) => a + i.engagement, 0) / influencersList.length).toFixed(1)}%
                </p>
                <p className="text-xs text-[#8A8A8A]">Сред. ER</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          <Input
            placeholder="Поиск инфлюенсеров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1E1F26] border-[#2A2B32]"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInfluencers.map((influencer) => {
          const PlatformIcon = getPlatformIcon(influencer.platform);
          return (
            <Card key={influencer.id} className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-[#1E1F26] flex items-center justify-center text-2xl">
                    {influencer.avatar}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{influencer.name}</h4>
                    <div className="flex items-center gap-2">
                      <PlatformIcon className="w-4 h-4 text-[#8A8A8A]" />
                      <span className="text-sm text-[#8A8A8A]">{influencer.platform}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-[#1E1F26] rounded">
                    <p className="text-sm font-bold text-white">{(influencer.subscribers / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-[#8A8A8A]">Подписчики</p>
                  </div>
                  <div className="p-2 bg-[#1E1F26] rounded">
                    <p className="text-sm font-bold text-[#6C63FF]">{influencer.engagement}%</p>
                    <p className="text-xs text-[#8A8A8A]">ER</p>
                  </div>
                  <div className="p-2 bg-[#1E1F26] rounded">
                    <p className="text-sm font-bold text-[#00D26A]">{influencer.revenue.toLocaleString()}₽</p>
                    <p className="text-xs text-[#8A8A8A]">Доход</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
