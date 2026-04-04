'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Target, Plus, DollarSign, TrendingUp, ExternalLink,
  Play, Pause, Edit, Trash2, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const offers = [
  { id: '1', name: 'Crypto Signals Pro', type: 'crypto', status: 'active', clicks: 1234, leads: 89, revenue: 45600, payout: 500 },
  { id: '2', name: 'Casino VIP', type: 'casino', status: 'active', clicks: 2345, leads: 156, revenue: 78900, payout: 450 },
  { id: '3', name: 'Dating App', type: 'dating', status: 'paused', clicks: 567, leads: 23, revenue: 3400, payout: 150 },
  { id: '4', name: 'Health Products', type: 'nutra', status: 'active', clicks: 890, leads: 45, revenue: 12300, payout: 280 },
];

export function OffersView() {
  const [offersList, setOffersList] = useState(offers);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOffers = offersList.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setOffersList(prev => prev.map(o => 
      o.id === id ? { ...o, status: o.status === 'active' ? 'paused' : 'active' } : o
    ));
    toast.success('Статус изменён');
  };

  const totalRevenue = offersList.reduce((a, o) => a + o.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-[#6C63FF]" />
            Офферы
          </h1>
          <p className="text-[#8A8A8A]">{offersList.filter(o => o.status === 'active').length} активных</p>
        </div>
        <Button className="bg-[#6C63FF]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить оффер
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
                <p className="text-xs text-[#8A8A8A]">Общий доход</p>
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
                <p className="text-2xl font-bold text-white">{offersList.reduce((a, o) => a + o.clicks, 0).toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Кликов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{offersList.reduce((a, o) => a + o.leads, 0)}</p>
                <p className="text-xs text-[#8A8A8A]">Лидов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#E4405F]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{offersList.length}</p>
                <p className="text-xs text-[#8A8A8A]">Офферов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-4">
          <Input
            placeholder="Поиск офферов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1E1F26] border-[#2A2B32]"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOffers.map((offer) => (
          <Card key={offer.id} className={cn(
            'bg-[#14151A] border-[#2A2B32]',
            offer.status === 'active' && 'border-l-4 border-l-[#00D26A]'
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-medium">{offer.name}</h4>
                  <Badge className="bg-[#6C63FF]/20 text-[#6C63FF]">{offer.type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={offer.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                    {offer.status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(offer.id)}>
                    {offer.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="p-2 bg-[#1E1F26] rounded">
                  <p className="text-sm font-bold text-white">{offer.clicks}</p>
                  <p className="text-xs text-[#8A8A8A]">Клики</p>
                </div>
                <div className="p-2 bg-[#1E1F26] rounded">
                  <p className="text-sm font-bold text-white">{offer.leads}</p>
                  <p className="text-xs text-[#8A8A8A]">Лиды</p>
                </div>
                <div className="p-2 bg-[#1E1F26] rounded">
                  <p className="text-sm font-bold text-[#00D26A]">{offer.payout}₽</p>
                  <p className="text-xs text-[#8A8A8A]">Выплата</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00D26A] font-bold text-lg">{offer.revenue.toLocaleString()}₽</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
