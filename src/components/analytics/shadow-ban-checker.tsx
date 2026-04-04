'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  User,
  Instagram,
  MessageCircle,
  BarChart3,
  Lightbulb,
  AlertCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface ShadowBanResult {
  username: string;
  platform: string;
  checkedAt: Date;
  overallStatus: 'safe' | 'warning' | 'danger';
  riskScore: number;
  checks: {
    profileVisibility: {
      status: 'pass' | 'warning' | 'fail';
      message: string;
      details?: string;
    };
    searchVisibility: {
      status: 'pass' | 'warning' | 'fail';
      message: string;
      found: boolean;
    };
    hashtagVisibility: {
      status: 'pass' | 'warning' | 'fail';
      message: string;
      testedHashtags: string[];
    };
    storyViews: {
      status: 'pass' | 'warning' | 'fail';
      message: string;
      avgViews: number;
      expectedViews: number;
      ratio: number;
    };
    engagementRate: {
      status: 'pass' | 'warning' | 'fail';
      message: string;
      rate: number;
      previousRate?: number;
    };
  };
  recommendations: string[];
  riskFactors: string[];
}

// Demo results
const generateDemoResult = (username: string): ShadowBanResult => {
  const riskScore = Math.floor(Math.random() * 60) + 10;
  const status = riskScore < 30 ? 'safe' : riskScore < 60 ? 'warning' : 'danger';

  return {
    username,
    platform: 'instagram',
    checkedAt: new Date(),
    overallStatus: status,
    riskScore,
    checks: {
      profileVisibility: {
        status: riskScore < 40 ? 'pass' : riskScore < 70 ? 'warning' : 'fail',
        message: riskScore < 40 ? 'Профиль виден в поиске' : riskScore < 70 ? 'Ограниченная видимость' : 'Профиль скрыт',
        details: 'Проверка через инкогнито-режим',
      },
      searchVisibility: {
        status: riskScore < 50 ? 'pass' : 'warning',
        message: riskScore < 50 ? 'Аккаунт находится в поиске' : 'Аккаунт может не появляться в результатах',
        found: riskScore < 50,
      },
      hashtagVisibility: {
        status: riskScore < 35 ? 'pass' : riskScore < 65 ? 'warning' : 'fail',
        message: riskScore < 35 ? 'Хэштеги работают нормально' : riskScore < 65 ? 'Некоторые хэштеги скрыты' : 'Хэштеги заблокированы',
        testedHashtags: ['#crypto', '#trading', '#money', '#investment'],
      },
      storyViews: {
        status: riskScore < 45 ? 'pass' : riskScore < 70 ? 'warning' : 'fail',
        message: riskScore < 45 ? 'Нормальные просмотры сторис' : 'Сниженные просмотры',
        avgViews: Math.floor(500 + Math.random() * 500),
        expectedViews: 800,
        ratio: Math.random() * 0.5 + 0.5,
      },
      engagementRate: {
        status: riskScore < 40 ? 'pass' : 'warning',
        message: riskScore < 40 ? 'Нормальный вовлечённость' : 'Сниженная вовлечённость',
        rate: Math.random() * 5 + 1,
        previousRate: Math.random() * 5 + 3,
      },
    },
    recommendations: [
      'Снизьте активность на 24-48 часов',
      'Избегайте использования одинаковых хэштегов',
      'Увеличьте интервалы между действиями',
      'Добавьте больше уникального контента',
      'Взаимодействуйте с контентом других пользователей',
    ].slice(0, 3 + Math.floor(Math.random() * 2)),
    riskFactors: [
      'Высокая частота публикаций',
      'Повторяющиеся хэштеги',
      'Массовые подписки',
      'Подозрительные комментарии',
      'Низкое качество контента',
    ].slice(0, 2 + Math.floor(Math.random() * 3)),
  };
};

// Status icons and colors
const statusConfig = {
  pass: { icon: CheckCircle, color: '#00D26A', label: 'OK' },
  warning: { icon: AlertTriangle, color: '#FFB800', label: 'Внимание' },
  fail: { icon: XCircle, color: '#FF4D4D', label: 'Проблема' },
};

const overallStatusConfig = {
  safe: { color: '#00D26A', label: 'Безопасен', icon: Shield },
  warning: { color: '#FFB800', label: 'В зоне риска', icon: AlertTriangle },
  danger: { color: '#FF4D4D', label: 'Опасная зона', icon: XCircle },
};

export function ShadowBanChecker() {
  const [username, setUsername] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ShadowBanResult | null>(null);
  const [checkHistory, setCheckHistory] = useState<{ username: string; platform: string; riskScore: number; date: Date }[]>([]);

  const handleCheck = async () => {
    if (!username.trim()) {
      toast.error('Введите имя пользователя');
      return;
    }

    setIsLoading(true);
    setResult(null);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newResult = generateDemoResult(username);
    setResult(newResult);
    setCheckHistory([
      { username, platform, riskScore: newResult.riskScore, date: new Date() },
      ...checkHistory.slice(0, 9),
    ]);
    setIsLoading(false);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#00D26A';
    if (score < 60) return '#FFB800';
    return '#FF4D4D';
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return 'Низкий риск';
    if (score < 60) return 'Средний риск';
    return 'Высокий риск';
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#6C63FF]" />
            Проверка Shadow Ban
          </CardTitle>
          <CardDescription className="text-[#8A8A8A]">
            Проверьте видимость аккаунта на Instagram, TikTok или Telegram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[140px] bg-[#1E1F26] border-[#2A2B32] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                <SelectItem value="instagram" className="text-white">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </div>
                </SelectItem>
                <SelectItem value="tiktok" className="text-white">TikTok</SelectItem>
                <SelectItem value="telegram" className="text-white">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Telegram
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите имя пользователя (без @)"
                className="pl-10 bg-[#1E1F26] border-[#2A2B32] text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>

            <Button
              onClick={handleCheck}
              disabled={isLoading}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80 min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Проверка...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Проверить
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${overallStatusConfig[result.overallStatus].color}20` }}
                  >
                    {(() => {
                      const Icon = overallStatusConfig[result.overallStatus].icon;
                      return <Icon className="w-8 h-8" style={{ color: overallStatusConfig[result.overallStatus].color }} />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">@{result.username}</h2>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: overallStatusConfig[result.overallStatus].color,
                        color: overallStatusConfig[result.overallStatus].color,
                      }}
                    >
                      {overallStatusConfig[result.overallStatus].label}
                    </Badge>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-[#8A8A8A]">Риск-скор</p>
                  <p className="text-3xl font-bold" style={{ color: getRiskColor(result.riskScore) }}>
                    {result.riskScore}%
                  </p>
                  <p className="text-sm" style={{ color: getRiskColor(result.riskScore) }}>
                    {getRiskLabel(result.riskScore)}
                  </p>
                </div>
              </div>

              {/* Risk Score Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8A8A]">Уровень риска</span>
                  <span className="text-white">{result.riskScore}%</span>
                </div>
                <Progress
                  value={result.riskScore}
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-[#8A8A8A]">
                  <span>Безопасно</span>
                  <span>Внимание</span>
                  <span>Опасно</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Profile Visibility */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#8A8A8A]" />
                    <span className="text-white font-medium">Видимость профиля</span>
                  </div>
                  {(() => {
                    const config = statusConfig[result.checks.profileVisibility.status];
                    const Icon = config.icon;
                    return <Icon className="w-5 h-5" style={{ color: config.color }} />;
                  })()}
                </div>
                <p className="text-sm text-[#8A8A8A]">{result.checks.profileVisibility.message}</p>
                {result.checks.profileVisibility.details && (
                  <p className="text-xs text-[#8A8A8A] mt-1">{result.checks.profileVisibility.details}</p>
                )}
              </CardContent>
            </Card>

            {/* Search Visibility */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#8A8A8A]" />
                    <span className="text-white font-medium">Поиск</span>
                  </div>
                  {(() => {
                    const config = statusConfig[result.checks.searchVisibility.status];
                    const Icon = config.icon;
                    return <Icon className="w-5 h-5" style={{ color: config.color }} />;
                  })()}
                </div>
                <p className="text-sm text-[#8A8A8A]">{result.checks.searchVisibility.message}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-2',
                    result.checks.searchVisibility.found
                      ? 'border-[#00D26A] text-[#00D26A]'
                      : 'border-[#FF4D4D] text-[#FF4D4D]'
                  )}
                >
                  {result.checks.searchVisibility.found ? 'Найден' : 'Не найден'}
                </Badge>
              </CardContent>
            </Card>

            {/* Hashtag Visibility */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#8A8A8A]" />
                    <span className="text-white font-medium">Хэштеги</span>
                  </div>
                  {(() => {
                    const config = statusConfig[result.checks.hashtagVisibility.status];
                    const Icon = config.icon;
                    return <Icon className="w-5 h-5" style={{ color: config.color }} />;
                  })()}
                </div>
                <p className="text-sm text-[#8A8A8A]">{result.checks.hashtagVisibility.message}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.checks.hashtagVisibility.testedHashtags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="border-[#2A2B32] text-[#8A8A8A] text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Story Views */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-[#8A8A8A]" />
                    <span className="text-white font-medium">Просмотры сторис</span>
                  </div>
                  {(() => {
                    const config = statusConfig[result.checks.storyViews.status];
                    const Icon = config.icon;
                    return <Icon className="w-5 h-5" style={{ color: config.color }} />;
                  })()}
                </div>
                <p className="text-sm text-[#8A8A8A]">{result.checks.storyViews.message}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Среднее</p>
                    <p className="text-lg font-bold text-white">{result.checks.storyViews.avgViews}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Ожидаемое</p>
                    <p className="text-lg font-bold text-[#8A8A8A]">{result.checks.storyViews.expectedViews}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Соотношение</p>
                    <p className="text-lg font-bold" style={{ color: getRiskColor(100 - (result.checks.storyViews.ratio || 0) * 100) }}>
                      {((result.checks.storyViews.ratio || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Rate */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#8A8A8A]" />
                    <span className="text-white font-medium">Вовлечённость</span>
                  </div>
                  {(() => {
                    const config = statusConfig[result.checks.engagementRate.status];
                    const Icon = config.icon;
                    return <Icon className="w-5 h-5" style={{ color: config.color }} />;
                  })()}
                </div>
                <p className="text-sm text-[#8A8A8A]">{result.checks.engagementRate.message}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-[#8A8A8A]">Текущая</p>
                    <p className="text-lg font-bold text-white">{(result.checks.engagementRate.rate || 0).toFixed(2)}%</p>
                  </div>
                  {result.checks.engagementRate.previousRate && (
                    <div className="flex items-center gap-1">
                      {result.checks.engagementRate.rate < result.checks.engagementRate.previousRate ? (
                        <TrendingDown className="w-4 h-4 text-[#FF4D4D]" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-[#00D26A]" />
                      )}
                      <span className="text-sm text-[#8A8A8A]">
                        было {(result.checks.engagementRate.previousRate || 0).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8A8A8A]" />
                    <span className="text-white font-medium">Информация</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Платформа</span>
                    <span className="text-white capitalize">{result.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Проверено</span>
                    <span className="text-white">
                      {result.checkedAt.toLocaleTimeString('ru-RU')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations & Risk Factors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recommendations */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#FFB800]" />
                  Рекомендации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                      <span className="text-[#8A8A8A]">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#FF4D4D]" />
                  Факторы риска
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.riskFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-[#FFB800] shrink-0 mt-0.5" />
                      <span className="text-[#8A8A8A]">{factor}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Check History */}
      {checkHistory.length > 0 && (
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardHeader>
            <CardTitle className="text-white text-lg">История проверок</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {checkHistory.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#1E1F26]"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
                        {item.platform}
                      </Badge>
                      <span className="text-white">@{item.username}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#8A8A8A]">
                        {item.date.toLocaleTimeString('ru-RU')}
                      </span>
                      <Badge
                        variant="outline"
                        style={{ borderColor: getRiskColor(item.riskScore), color: getRiskColor(item.riskScore) }}
                      >
                        {item.riskScore}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ShadowBanChecker;
