'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Activity,
  Target,
  Wallet,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  stats: {
    totalInfluencers: number;
    activeInfluencers: number;
    totalLeads: number;
    totalRevenue: number;
    totalSpent: number;
    avgBanRisk: number;
    activeAccounts: number;
    activeCampaigns: number;
  };
}

export function KPICards({ stats }: KPICardsProps) {
  const roi = stats.totalSpent > 0 
    ? (((stats.totalRevenue - stats.totalSpent) / stats.totalSpent) * 100).toFixed(1)
    : '0';

  const roiNum = parseFloat(roi);

  const kpiItems = [
    {
      title: 'AI-Инфлюенсеры',
      value: stats.activeInfluencers,
      subValue: `из ${stats.totalInfluencers} активных`,
      icon: Users,
      color: '#6C63FF',
      bgColor: 'rgba(108, 99, 255, 0.1)',
    },
    {
      title: 'Лиды',
      value: stats.totalLeads,
      subValue: 'за всё время',
      icon: Target,
      color: '#00D26A',
      bgColor: 'rgba(0, 210, 106, 0.1)',
    },
    {
      title: 'Доход',
      value: `${stats.totalRevenue.toLocaleString('ru-RU')} ₽`,
      subValue: 'общий доход',
      icon: DollarSign,
      color: '#FFB800',
      bgColor: 'rgba(255, 184, 0, 0.1)',
    },
    {
      title: 'ROI',
      value: `${roi}%`,
      subValue: `расход: ${stats.totalSpent.toLocaleString('ru-RU')} ₽`,
      icon: TrendingUp,
      color: roiNum >= 0 ? '#00D26A' : '#FF4D4D',
      bgColor: roiNum >= 0 ? 'rgba(0, 210, 106, 0.1)' : 'rgba(255, 77, 77, 0.1)',
    },
    {
      title: 'Активные аккаунты',
      value: stats.activeAccounts,
      subValue: 'в работе',
      icon: Activity,
      color: '#00B4D8',
      bgColor: 'rgba(0, 180, 216, 0.1)',
    },
    {
      title: 'Средний риск бана',
      value: `${stats.avgBanRisk}%`,
      subValue: 'по всем аккаунтам',
      icon: Shield,
      color: stats.avgBanRisk < 30 ? '#00D26A' : stats.avgBanRisk < 60 ? '#FFB800' : '#FF4D4D',
      bgColor: stats.avgBanRisk < 30 ? 'rgba(0, 210, 106, 0.1)' : stats.avgBanRisk < 60 ? 'rgba(255, 184, 0, 0.1)' : 'rgba(255, 77, 77, 0.1)',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpiItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card
            key={index}
            className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-colors"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#8A8A8A]">
                {item.title}
              </CardTitle>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: item.bgColor }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <p className="text-xs text-[#8A8A8A] mt-1">{item.subValue}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Карточка риска бана
interface RiskCardProps {
  title: string;
  risk: number;
  description: string;
}

export function RiskCard({ title, risk, description }: RiskCardProps) {
  const getRiskColor = (risk: number) => {
    if (risk < 30) return '#00D26A';
    if (risk < 60) return '#FFB800';
    return '#FF4D4D';
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[#8A8A8A]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" style={{ color: getRiskColor(risk) }}>
              {risk}%
            </span>
            <span className="text-sm text-[#8A8A8A]">риск</span>
          </div>
          <Progress
            value={risk}
            className="h-2"
            style={{
              // @ts-ignore
              '--progress-background': getRiskColor(risk),
            }}
          />
          <p className="text-xs text-[#8A8A8A]">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
