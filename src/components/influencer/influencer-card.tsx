'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MoreVertical,
  TrendingUp,
  Users,
  MessageSquare,
  DollarSign,
  Edit,
  Trash2,
  Play,
  Pause,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Influencer } from '@/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InfluencerCardProps {
  influencer: Influencer;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
}

const nicheColors: Record<string, string> = {
  gambling: '#FF4D4D',
  crypto: '#FFB800',
  nutra: '#00D26A',
  bait: '#E4405F',
  lifestyle: '#6C63FF',
  finance: '#00D4AA',
  dating: '#FF6B9D',
  gaming: '#9D4EDD',
};

const nicheLabels: Record<string, string> = {
  gambling: 'Гемблинг',
  crypto: 'Крипта',
  nutra: 'Нутра',
  bait: 'Байт',
  lifestyle: 'Лайфстайл',
  finance: 'Финансы',
  dating: 'Дейтинг',
  gaming: 'Гейминг',
};

const statusColors: Record<string, string> = {
  draft: 'bg-[#8A8A8A]',
  warming: 'bg-[#FFB800]',
  active: 'bg-[#00D26A]',
  paused: 'bg-[#6C63FF]',
  banned: 'bg-[#FF4D4D]',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  warming: 'Прогрев',
  active: 'Активен',
  paused: 'Пауза',
  banned: 'Забанен',
};

export function InfluencerCard({
  influencer,
  onSelect,
  onEdit,
  onDelete,
  onToggleStatus,
}: InfluencerCardProps) {
  const getRiskColor = (risk: number) => {
    if (risk < 30) return '#00D26A';
    if (risk < 60) return '#FFB800';
    return '#FF4D4D';
  };

  const platforms: string[] = [];
  if (influencer.telegramUsername) platforms.push('telegram');
  if (influencer.instagramUsername) platforms.push('instagram');
  if (influencer.tiktokUsername) platforms.push('tiktok');
  if (influencer.youtubeChannelId) platforms.push('youtube');

  return (
    <Card
      className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-all duration-300 cursor-pointer group"
      onClick={onSelect}
    >
      {/* Ниша индикатор */}
      <div
        className="h-1 rounded-t-lg"
        style={{ backgroundColor: nicheColors[influencer.niche] || '#6C63FF' }}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-[#2A2B32]">
              <AvatarImage src={influencer.avatarUrl} alt={influencer.name} />
              <AvatarFallback className="bg-[#6C63FF] text-white font-bold">
                {influencer.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-white">{influencer.name}</h3>
              <p className="text-sm text-[#8A8A8A]">{influencer.role}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#8A8A8A] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1E1F26] border-[#2A2B32]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                <Edit className="w-4 h-4 mr-2" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus?.(); }}>
                {influencer.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Приостановить
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Активировать
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2A2B32]" />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                className="text-[#FF4D4D] focus:text-[#FF4D4D]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Бейджи */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: nicheColors[influencer.niche], color: nicheColors[influencer.niche] }}
          >
            {nicheLabels[influencer.niche] || influencer.niche}
          </Badge>
          <Badge
            variant="outline"
            className={cn('text-xs text-white border-0', statusColors[influencer.status])}
          >
            {statusLabels[influencer.status] || influencer.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Риск бана */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8A8A8A]">Риск бана</span>
            <span className="font-medium" style={{ color: getRiskColor(influencer.banRisk ?? 0) }}>
              {influencer.banRisk ?? 0}%
            </span>
          </div>
          <Progress
            value={influencer.banRisk ?? 0}
            className="h-1.5"
          />
        </div>

        {/* Метрики */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8A8A8A]" />
            <span className="text-sm text-[#8A8A8A]">
              {(influencer.subscribersCount ?? 0).toLocaleString('ru-RU')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#8A8A8A]" />
            <span className="text-sm text-[#8A8A8A]">{influencer.leadsCount ?? 0} лидов</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <DollarSign className="w-4 h-4 text-[#00D26A]" />
            <span className="text-sm text-[#00D26A] font-medium">
              {(influencer.revenue ?? 0).toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {/* Платформы */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#2A2B32]">
          {platforms.includes('telegram') && (
            <div className="w-6 h-6 rounded-full bg-[#0088cc] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
              </svg>
            </div>
          )}
          {platforms.includes('instagram') && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#dc2743] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
          )}
          {platforms.includes('tiktok') && (
            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </div>
          )}
          {platforms.includes('youtube') && (
            <div className="w-6 h-6 rounded-full bg-[#FF0000] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Сетка инфлюенсеров
interface InfluencerGridProps {
  influencers: Influencer[];
  onSelect?: (influencer: Influencer) => void;
  onEdit?: (influencer: Influencer) => void;
  onDelete?: (influencer: Influencer) => void;
  onToggleStatus?: (influencer: Influencer) => void;
}

export function InfluencerGrid({
  influencers,
  onSelect,
  onEdit,
  onDelete,
  onToggleStatus,
}: InfluencerGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {influencers.map((influencer) => (
        <InfluencerCard
          key={influencer.id}
          influencer={influencer}
          onSelect={() => onSelect?.(influencer)}
          onEdit={() => onEdit?.(influencer)}
          onDelete={() => onDelete?.(influencer)}
          onToggleStatus={() => onToggleStatus?.(influencer)}
        />
      ))}
    </div>
  );
}
