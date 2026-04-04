'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRightLeft,
  Sparkles,
  Copy,
  Check,
  Clock,
  Send,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CrossPost {
  id: string;
  sourceChannelId: string;
  sourcePostId: string;
  originalComment: string;
  adaptedComment: string;
  targetChannelId: string | null;
  status: string;
  engagementRate: number | null;
  createdAt: string;
  postedAt: string | null;
  aiModel: string | null;
}

interface AdaptationResult {
  adaptedComment: string;
  styleChanges: string[];
  confidence: number;
  aiModel: string;
  provider: string;
}

export function CrossPostPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [userId] = useState('default-user');

  // Form state
  const [sourceChannel, setSourceChannel] = useState('');
  const [sourcePost, setSourcePost] = useState('');
  const [originalComment, setOriginalComment] = useState('');
  const [targetChannel, setTargetChannel] = useState('');
  const [targetChannelTheme, setTargetChannelTheme] = useState('');
  const [targetPostContent, setTargetPostContent] = useState('');

  // Results state
  const [adaptedResult, setAdaptedResult] = useState<AdaptationResult | null>(null);
  const [crossPosts, setCrossPosts] = useState<CrossPost[]>([]);
  const [copied, setCopied] = useState(false);

  // Fetch existing cross-posts
  useEffect(() => {
    fetchCrossPosts();
  }, []);

  const fetchCrossPosts = async () => {
    try {
      const res = await fetch('/api/advanced/cross-post?limit=10');
      const data = await res.json();
      if (data.success) {
        setCrossPosts(data.crossPosts);
      }
    } catch (error) {
      console.error('Error fetching cross-posts:', error);
    }
  };

  // AI adaptation
  const adaptComment = async () => {
    if (!sourceChannel || !sourcePost || !originalComment) {
      return;
    }

    setLoading('adapt');
    try {
      const res = await fetch('/api/advanced/cross-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceChannelId: sourceChannel,
          sourcePostId: sourcePost,
          originalComment,
          targetChannelId: targetChannel || undefined,
          targetChannelTheme: targetChannelTheme || undefined,
          targetPostContent: targetPostContent || undefined,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAdaptedResult(data.crossPost);
        fetchCrossPosts();
      }
    } catch (error) {
      console.error('Error adapting comment:', error);
    } finally {
      setLoading(null);
    }
  };

  // Mark as posted
  const markAsPosted = async (id: string) => {
    try {
      const res = await fetch('/api/advanced/cross-post', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'posted' }),
      });

      const data = await res.json();
      if (data.success) {
        fetchCrossPosts();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Update engagement
  const updateEngagement = async (id: string, rate: number) => {
    try {
      await fetch('/api/advanced/cross-post', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'posted', engagementRate: rate }),
      });
      fetchCrossPosts();
    } catch (error) {
      console.error('Error updating engagement:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'posted':
        return <Badge variant="default" className="gap-1 bg-green-500"><Send className="h-3 w-3" /> Posted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-purple-500" />
            Кросспостинг с обогащением
          </CardTitle>
          <CardDescription>
            Адаптация успешных комментариев для разных каналов с помощью DeepSeek AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Исходный канал</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">ID канала</label>
                <Input
                  placeholder="@channel или ID"
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">ID поста</label>
                <Input
                  placeholder="123 или ссылка"
                  value={sourcePost}
                  onChange={(e) => setSourcePost(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm">Оригинальный комментарий</label>
              <Textarea
                placeholder="Текст успешного комментария, который нужно адаптировать..."
                value={originalComment}
                onChange={(e) => setOriginalComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Target Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Целевой канал</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">ID целевого канала</label>
                <Input
                  placeholder="@target_channel"
                  value={targetChannel}
                  onChange={(e) => setTargetChannel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Тематика канала</label>
                <Input
                  placeholder="крипта, игры, финансы..."
                  value={targetChannelTheme}
                  onChange={(e) => setTargetChannelTheme(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm">Контекст поста (опционально)</label>
              <Textarea
                placeholder="Текст поста, под который адаптируем комментарий..."
                value={targetPostContent}
                onChange={(e) => setTargetPostContent(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Adapt Button */}
          <Button
            onClick={adaptComment}
            disabled={loading === 'adapt' || !sourceChannel || !sourcePost || !originalComment}
            className="w-full"
          >
            {loading === 'adapt' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Адаптация...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Адаптировать с DeepSeek
              </>
            )}
          </Button>

          {/* Adapted Result */}
          {adaptedResult && (
            <div className="space-y-4 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Адаптированный комментарий</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{adaptedResult.aiModel}</Badge>
                  <Badge variant="outline">{adaptedResult.provider}</Badge>
                </div>
              </div>

              <div className="p-3 rounded bg-background/50 border">
                <p>{adaptedResult.adaptedComment}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Уверенность AI:</span>
                  <span className="font-medium">{Math.round(adaptedResult.confidence * 100)}%</span>
                </div>
                <Progress value={adaptedResult.confidence * 100} className="h-2" />
              </div>

              {adaptedResult.styleChanges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Изменения стиля:</span>
                  <div className="flex flex-wrap gap-2">
                    {adaptedResult.styleChanges.map((change, i) => (
                      <Badge key={i} variant="secondary">{change}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(adaptedResult.adaptedComment)}
                >
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История кросспостов</CardTitle>
          <CardDescription>
            Последние адаптированные комментарии
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {crossPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Нет кросспостов. Адаптируйте первый комментарий выше.</p>
              </div>
            ) : (
              crossPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-lg border space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{post.sourceChannelId}</span>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {post.targetChannelId || 'Не указан'}
                        </span>
                      </div>
                      {getStatusBadge(post.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.engagementRate !== null && (
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {post.engagementRate.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Оригинал:</p>
                      <p className="line-clamp-2">{post.originalComment}</p>
                    </div>
                    <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Адаптировано:</p>
                      <p className="line-clamp-2">{post.adaptedComment}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {post.aiModel && `AI: ${post.aiModel}`}
                    </span>
                    <div className="flex gap-2">
                      {post.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsPosted(post.id)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Отметить отправленным
                        </Button>
                      )}
                      {post.status === 'posted' && post.engagementRate === null && (
                        <Select onValueChange={(value) => updateEngagement(post.id, parseFloat(value))}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Конверсия %" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5">0.5%</SelectItem>
                            <SelectItem value="1.0">1.0%</SelectItem>
                            <SelectItem value="2.0">2.0%</SelectItem>
                            <SelectItem value="3.0">3.0%</SelectItem>
                            <SelectItem value="5.0">5.0%</SelectItem>
                            <SelectItem value="10.0">10.0%</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(post.adaptedComment)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CrossPostPanel;
