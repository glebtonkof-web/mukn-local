'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore, Campaign } from '@/store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  Rocket,
} from 'lucide-react';
import { toast } from 'sonner';

// Utility functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-[#00D26A]';
    case 'paused': return 'bg-[#FFB800]';
    case 'error': return 'bg-[#FF4D4D]';
    case 'draft': return 'bg-[#8A8A8A]';
    default: return 'bg-[#8A8A8A]';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Активна';
    case 'paused': return 'Пауза';
    case 'error': return 'Ошибка';
    case 'draft': return 'Черновик';
    default: return status;
  }
};

const getOfferTypeLabel = (type: string) => {
  switch (type) {
    case 'casino': return 'Казино';
    case 'crypto': return 'Крипта';
    case 'dating': return 'Дейтинг';
    case 'nutra': return 'Нутра';
    default: return type;
  }
};

// Sortable Item Component
interface SortableCampaignCardProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onToggleStatus: (campaign: Campaign) => void;
  onDuplicate: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}

function SortableCampaignCard({
  campaign,
  onEdit,
  onToggleStatus,
  onDuplicate,
  onDelete,
}: SortableCampaignCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: campaign.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-[0.98]'
      )}
    >
      <Card className={cn(
        'bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-all duration-200 group',
        isDragging && 'shadow-2xl shadow-[#6C63FF]/30 border-[#6C63FF]'
      )}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-2">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[#2A2B32] transition-colors touch-manipulation"
              aria-label="Перетащить"
            >
              <GripVertical className="w-4 h-4 text-[#8A8A8A] group-hover:text-white" />
            </button>
            <div className={cn('w-3 h-3 rounded-full', getStatusColor(campaign.status))} />
            <CardTitle className="text-lg text-white">{campaign.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
              <DropdownMenuItem onClick={() => onEdit(campaign)} className="text-white hover:bg-[#1E1F26]">
                <Edit className="w-4 h-4 mr-2" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(campaign)} className="text-white hover:bg-[#1E1F26]">
                {campaign.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Запустить
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(campaign)} className="text-white hover:bg-[#1E1F26]">
                <Copy className="w-4 h-4 mr-2" />
                Дублировать
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(campaign)} className="text-[#FF4D4D] hover:bg-[#1E1F26]">
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
              {getOfferTypeLabel(campaign.offerType)}
            </Badge>
            <Badge className={cn(
              'text-white',
              campaign.status === 'active' ? 'bg-[#00D26A]' :
              campaign.status === 'paused' ? 'bg-[#FFB800]' :
              campaign.status === 'error' ? 'bg-[#FF4D4D]' : 'bg-[#8A8A8A]'
            )}>
              {getStatusLabel(campaign.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#8A8A8A]">Аккаунты</p>
              <p className="text-white font-medium">{campaign.accountsActive}/{campaign.accountsTotal}</p>
            </div>
            <div>
              <p className="text-[#8A8A8A]">Комментов сегодня</p>
              <p className="text-white font-medium">{campaign.commentsToday}</p>
            </div>
            <div>
              <p className="text-[#8A8A8A]">Доход</p>
              <p className="text-[#00D26A] font-medium">{campaign.revenue?.toLocaleString() || 0} ₽</p>
            </div>
            <div>
              <p className="text-[#8A8A8A]">Бюджет</p>
              <p className="text-white font-medium">{campaign.budgetSpent || 0}/{campaign.budget || 0} ₽</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#8A8A8A]">
              <span>Расход бюджета</span>
              <span>{Math.round(((campaign.budgetSpent || 0) / (campaign.budget || 1)) * 100)}%</span>
            </div>
            <Progress value={((campaign.budgetSpent || 0) / (campaign.budget || 1)) * 100} className="h-2" />
          </div>

          <Button
            onClick={() => onToggleStatus(campaign)}
            className={cn(
              'w-full touch-manipulation min-h-[44px]',
              campaign.status === 'active'
                ? 'bg-[#FFB800] hover:bg-[#FFB800]/80 text-black'
                : 'bg-[#00D26A] hover:bg-[#00D26A]/80 text-black'
            )}
          >
            {campaign.status === 'active' ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Приостановить
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Запустить
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Drag Overlay Component
function CampaignCardOverlay({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="bg-[#14151A] border-[#6C63FF] shadow-2xl shadow-[#6C63FF]/30 rotate-2 scale-[1.02]">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-[#6C63FF]" />
          <div className={cn('w-3 h-3 rounded-full', getStatusColor(campaign.status))} />
          <CardTitle className="text-lg text-white">{campaign.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="py-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-[#6C63FF] text-[#6C63FF]">
            {getOfferTypeLabel(campaign.offerType)}
          </Badge>
          <Badge className={cn(
            'text-white',
            campaign.status === 'active' ? 'bg-[#00D26A]' :
            campaign.status === 'paused' ? 'bg-[#FFB800]' : 'bg-[#8A8A8A]'
          )}>
            {getStatusLabel(campaign.status)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Draggable Campaign List Component
interface DraggableCampaignListProps {
  campaigns: Campaign[];
  onReorder?: (campaigns: Campaign[]) => void;
  layout?: 'grid' | 'list';
  onEdit?: (campaign: Campaign) => void;
}

export function DraggableCampaignList({
  campaigns: initialCampaigns,
  onReorder,
  layout = 'grid',
  onEdit,
}: DraggableCampaignListProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const { updateCampaign, removeCampaign, addCampaign } = useAppStore();

  // Sync with props
  React.useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = campaigns.findIndex((c) => c.id === active.id);
      const newIndex = campaigns.findIndex((c) => c.id === over.id);

      const newCampaigns = arrayMove(campaigns, oldIndex, newIndex);
      setCampaigns(newCampaigns);

      if (onReorder) {
        onReorder(newCampaigns);
      }

      toast.success('Порядок кампаний изменён');
    }

    setActiveId(null);
  };

  const handleToggleStatus = useCallback((campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    updateCampaign(campaign.id, { status: newStatus });
    toast.success(`Кампания ${newStatus === 'active' ? 'запущена' : 'приостановлена'}`);
  }, [updateCampaign]);

  const handleDuplicate = useCallback((campaign: Campaign) => {
    addCampaign({
      ...campaign,
      id: `c${Date.now()}`,
      name: `${campaign.name} (копия)`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    toast.success('Кампания скопирована');
  }, [addCampaign]);

  const handleDelete = useCallback((campaign: Campaign) => {
    removeCampaign(campaign.id);
    toast.success('Кампания удалена');
  }, [removeCampaign]);

  const activeCampaign = activeId ? campaigns.find((c) => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={campaigns.map(c => c.id)}
        strategy={layout === 'grid' ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        <div className={cn(
          layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-2'
        )}>
          {campaigns.map((campaign) => (
            <SortableCampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={onEdit || (() => {})}
              onToggleStatus={handleToggleStatus}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeCampaign ? <CampaignCardOverlay campaign={activeCampaign} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// Campaign Category Drop Zone
interface CampaignCategoryZoneProps {
  id: string;
  title: string;
  campaigns: Campaign[];
  color?: string;
  onDrop?: (campaign: Campaign, zoneId: string) => void;
}

export function CampaignCategoryZone({
  id,
  title,
  campaigns,
  color = '#6C63FF',
}: CampaignCategoryZoneProps) {
  return (
    <div
      className="rounded-lg border-2 border-dashed border-[#2A2B32] p-4 transition-colors hover:border-[#6C63FF]/50"
      data-zone-id={id}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <Badge variant="outline" className="ml-auto border-[#2A2B32] text-[#8A8A8A]">
          {campaigns.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {campaigns.length === 0 ? (
          <p className="text-sm text-[#8A8A8A] text-center py-4">
            Перетащите кампанию сюда
          </p>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center gap-2 px-3 py-2 bg-[#1E1F26] rounded-lg"
            >
              <div className={cn('w-2 h-2 rounded-full', getStatusColor(campaign.status))} />
              <span className="text-sm text-white">{campaign.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DraggableCampaignList;
