'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Eye,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Settings,
  Target,
  BarChart3,
  Link,
  Save,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface FunnelStep {
  id: string;
  name: string;
  icon: typeof MessageSquare;
  count: number;
  conversion: number;
  color: string;
  bgColor: string;
}

interface UTMTags {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
}

// Default funnel steps
const defaultFunnel: FunnelStep[] = [
  { id: 'comments', name: 'Комментарии', icon: MessageSquare, count: 1000, conversion: 100, color: '#6C63FF', bgColor: 'rgba(108, 99, 255, 0.1)' },
  { id: 'views', name: 'Просмотры профиля', icon: Eye, count: 350, conversion: 35, color: '#FF6B9D', bgColor: 'rgba(255, 107, 157, 0.1)' },
  { id: 'story', name: 'Просмотры сторис', icon: Eye, count: 180, conversion: 51.4, color: '#FFB800', bgColor: 'rgba(255, 184, 0, 0.1)' },
  { id: 'channel', name: 'Вступления в канал', icon: Users, count: 72, conversion: 40, color: '#00D26A', bgColor: 'rgba(0, 210, 106, 0.1)' },
  { id: 'payment', name: 'Оплаты', icon: CreditCard, count: 14, conversion: 19.4, color: '#00D4AA', bgColor: 'rgba(0, 212, 170, 0.1)' },
];

export function TrafficFunnelPanel() {
  const [funnel, setFunnel] = useState<FunnelStep[]>(defaultFunnel);
  const [expandedSteps, setExpandedSteps] = useState<string[]>(['comments']);
  const [isEditing, setIsEditing] = useState(false);
  
  const [utmTags, setUtmTags] = useState<UTMTags>({
    source: 'telegram',
    medium: 'comment',
    campaign: 'ofm_promo',
    content: '',
    term: '',
  });

  const [utmEnabled, setUtmEnabled] = useState(true);

  const toggleStep = (stepId: string) => {
    if (expandedSteps.includes(stepId)) {
      setExpandedSteps(expandedSteps.filter((id) => id !== stepId));
    } else {
      setExpandedSteps([...expandedSteps, stepId]);
    }
  };

  const handleConversionChange = (stepId: string, value: number) => {
    const stepIndex = funnel.findIndex((s) => s.id === stepId);
    if (stepIndex === -1 || stepIndex === 0) return;

    const newFunnel = [...funnel];
    const conversion = value / 100;
    const prevStep = newFunnel[stepIndex - 1];
    newFunnel[stepIndex] = {
      ...newFunnel[stepIndex],
      conversion: value,
      count: Math.round(prevStep.count * conversion),
    };

    // Recalculate downstream steps
    for (let i = stepIndex + 1; i < newFunnel.length; i++) {
      const prevConversion = newFunnel[i].conversion / 100;
      newFunnel[i] = {
        ...newFunnel[i],
        count: Math.round(newFunnel[i - 1].count * prevConversion),
      };
    }

    setFunnel(newFunnel);
  };

  const handleCountChange = (stepId: string, value: number) => {
    const stepIndex = funnel.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const newFunnel = [...funnel];
    newFunnel[stepIndex] = {
      ...newFunnel[stepIndex],
      count: value,
    };

    // Recalculate conversion
    if (stepIndex > 0) {
      const prevCount = newFunnel[stepIndex - 1].count;
      newFunnel[stepIndex].conversion = prevCount > 0 ? (value / prevCount) * 100 : 0;
    }

    // Recalculate downstream steps
    for (let i = stepIndex + 1; i < newFunnel.length; i++) {
      const conversion = newFunnel[i].conversion / 100;
      newFunnel[i] = {
        ...newFunnel[i],
        count: Math.round(newFunnel[i - 1].count * conversion),
      };
    }

    setFunnel(newFunnel);
  };

  const calculateRevenuePerVisitor = () => {
    const comments = funnel[0].count;
    const payments = funnel[funnel.length - 1].count;
    const avgPayment = 500; // Average payment in $
    return comments > 0 ? ((payments * avgPayment) / comments).toFixed(2) : '0';
  };

  const saveSettings = () => {
    toast.success('Настройки сохранены');
    setIsEditing(false);
  };

  const totalConversion = funnel.length > 1
    ? ((funnel[funnel.length - 1].count / funnel[0].count) * 100).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{funnel[0].count.toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Комментариев</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalConversion}%</p>
                <p className="text-xs text-[#8A8A8A]">Общая конверсия</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B9D]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#FF6B9D]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${calculateRevenuePerVisitor()}</p>
                <p className="text-xs text-[#8A8A8A]">Доход на посетителя</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${(funnel[funnel.length - 1].count * 500).toLocaleString()}</p>
                <p className="text-xs text-[#8A8A8A]">Потенциальный доход</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Funnel */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#FF6B9D]" />
                Визуализация воронки
              </CardTitle>
              <CardDescription>Отслеживайте конверсии на каждом этапе</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                'border-[#2A2B32]',
                isEditing && 'border-[#FF6B9D] text-[#FF6B9D]'
              )}
            >
              <Settings className="w-4 h-4 mr-2" />
              {isEditing ? 'Готово' : 'Редактировать'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnel.map((step, index) => {
              const Icon = step.icon;
              const isExpanded = expandedSteps.includes(step.id);
              const width = index === 0 ? 100 : (step.count / funnel[0].count) * 100;

              return (
                <div key={step.id}>
                  <div
                    className={cn(
                      'relative p-4 rounded-lg border transition-all cursor-pointer',
                      isExpanded ? 'border-[#FF6B9D]' : 'border-[#2A2B32]'
                    )}
                    style={{ backgroundColor: step.bgColor }}
                    onClick={() => toggleStep(step.id)}
                  >
                    {/* Funnel bar */}
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: step.color }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{step.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-white">
                              {step.count.toLocaleString()}
                            </span>
                            {index > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: step.color, color: step.color }}
                              >
                                {step.conversion.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Progress bar representing funnel width */}
                        <div className="relative h-2 bg-[#14151A] rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all"
                            style={{
                              width: `${width}%`,
                              backgroundColor: step.color,
                            }}
                          />
                        </div>
                      </div>

                      <div className="ml-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[#8A8A8A]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#8A8A8A]" />
                        )}
                      </div>
                    </div>

                    {/* Arrow to next step */}
                    {index < funnel.length - 1 && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                        <ArrowRight className="w-5 h-5 text-[#8A8A8A] rotate-90" />
                      </div>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="p-4 bg-[#14151A] border border-t-0 border-[#2A2B32] rounded-b-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-[#8A8A8A]">Количество</label>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={step.count}
                              onChange={(e) => handleCountChange(step.id, parseInt(e.target.value) || 0)}
                              className="bg-[#1E1F26] border-[#2A2B32] text-white"
                            />
                          ) : (
                            <p className="text-xl font-bold text-white">{step.count.toLocaleString()}</p>
                          )}
                        </div>

                        {index > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm text-[#8A8A8A]">Конверсия (%)</label>
                            {isEditing ? (
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={step.conversion.toFixed(1)}
                                onChange={(e) => handleConversionChange(step.id, parseFloat(e.target.value) || 0)}
                                className="bg-[#1E1F26] border-[#2A2B32] text-white"
                              />
                            ) : (
                              <p className="text-xl font-bold text-white">{step.conversion.toFixed(1)}%</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* UTM Tracking Settings */}
      <Card className="bg-[#1E1F26] border-[#2A2B32]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Link className="w-5 h-5 text-[#6C63FF]" />
                UTM-метки
              </CardTitle>
              <CardDescription>Отслеживание источников трафика</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={utmEnabled} onCheckedChange={setUtmEnabled} />
              <span className="text-sm text-[#8A8A8A]">
                {utmEnabled ? 'Включено' : 'Выключено'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {utmEnabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-[#8A8A8A]">Source</label>
                  <Input
                    value={utmTags.source}
                    onChange={(e) => setUtmTags({ ...utmTags, source: e.target.value })}
                    placeholder="telegram"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#8A8A8A]">Medium</label>
                  <Input
                    value={utmTags.medium}
                    onChange={(e) => setUtmTags({ ...utmTags, medium: e.target.value })}
                    placeholder="comment"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#8A8A8A]">Campaign</label>
                  <Input
                    value={utmTags.campaign}
                    onChange={(e) => setUtmTags({ ...utmTags, campaign: e.target.value })}
                    placeholder="ofm_promo"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#8A8A8A]">Content</label>
                  <Input
                    value={utmTags.content}
                    onChange={(e) => setUtmTags({ ...utmTags, content: e.target.value })}
                    placeholder="profile_anna"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#8A8A8A]">Term</label>
                  <Input
                    value={utmTags.term}
                    onChange={(e) => setUtmTags({ ...utmTags, term: e.target.value })}
                    placeholder="keyword"
                    className="bg-[#14151A] border-[#2A2B32] text-white"
                  />
                </div>
              </div>

              {/* Generated URL Preview */}
              <div className="p-3 bg-[#14151A] rounded-lg border border-[#2A2B32]">
                <p className="text-xs text-[#8A8A8A] mb-1">Сгенерированная ссылка:</p>
                <code className="text-sm text-[#6C63FF] break-all">
                  https://t.me/your_channel?utm_source={utmTags.source}&utm_medium={utmTags.medium}&utm_campaign={utmTags.campaign}
                  {utmTags.content && `&utm_content=${utmTags.content}`}
                  {utmTags.term && `&utm_term=${utmTags.term}`}
                </code>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveSettings} className="bg-[#FF6B9D] hover:bg-[#FF6B9D]/80">
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://t.me/your_channel?utm_source=${utmTags.source}&utm_medium=${utmTags.medium}&utm_campaign=${utmTags.campaign}`
                    );
                    toast.success('Ссылка скопирована');
                  }}
                  className="border-[#2A2B32]"
                >
                  Копировать ссылку
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
