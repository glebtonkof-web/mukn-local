'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, Users, DollarSign, TrendingUp, Image, 
  MessageSquare, Mic, Video, Heart, Eye, Play, Pause,
  Loader2, Plus, RefreshCw, AlertCircle, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface OFMProfile {
  id: string;
  name: string;
  age: number;
  bio: string | null;
  niche: string;
  style: string;
  storiesCount: number;
  commentsCount: number;
  revenue: number;
  status: string;
  account?: {
    id: string;
    platform: string;
    username: string | null;
    status: string;
  } | null;
  _count?: {
    stories: number;
    comments: number;
  };
}

interface OFMStory {
  id: string;
  text: string | null;
  imageUrl: string | null;
  views: number;
  clicks: number;
  forwards: number;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    name: string;
    niche: string;
    style: string;
  };
}

interface GeneratedStory {
  id: string;
  text: string;
  imageBase64: string;
  suggestedLink: string;
  theme: string;
  themeName: string;
}

interface StoryTheme {
  id: string;
  name: string;
  description: string;
}

export function OFMView() {
  // State
  const [profiles, setProfiles] = useState<OFMProfile[]>([]);
  const [stories, setStories] = useState<OFMStory[]>([]);
  const [themes, setThemes] = useState<StoryTheme[]>([]);
  const [activeTab, setActiveTab] = useState('profiles');
  
  // Loading states
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingStories, setLoadingStories] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  
  // Error states
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  
  // Generated story preview
  const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('lifestyle');

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    setProfilesError(null);
    try {
      const response = await fetch('/api/ofm/profiles');
      if (!response.ok) throw new Error('Failed to fetch profiles');
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setProfilesError('Не удалось загрузить профили');
      toast.error('Ошибка загрузки профилей');
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  // Fetch stories
  const fetchStories = useCallback(async () => {
    setLoadingStories(true);
    setStoriesError(null);
    try {
      const response = await fetch('/api/ofm/stories');
      if (!response.ok) throw new Error('Failed to fetch stories');
      const data = await response.json();
      setStories(data.stories || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStoriesError('Не удалось загрузить сторис');
      toast.error('Ошибка загрузки сторис');
    } finally {
      setLoadingStories(false);
    }
  }, []);

  // Fetch themes
  const fetchThemes = useCallback(async () => {
    try {
      const response = await fetch('/api/ofm/stories/generate');
      if (!response.ok) throw new Error('Failed to fetch themes');
      const data = await response.json();
      setThemes(data.themes || []);
    } catch (error) {
      console.error('Error fetching themes:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProfiles();
    fetchThemes();
  }, [fetchProfiles, fetchThemes]);

  // Load stories when tab changes
  useEffect(() => {
    if (activeTab === 'stories' && stories.length === 0) {
      fetchStories();
    }
  }, [activeTab, stories.length, fetchStories]);

  // Create new profile
  const handleCreateProfile = async () => {
    setCreatingProfile(true);
    try {
      const response = await fetch('/api/ofm/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Модель ${profiles.length + 1}`,
          age: 23,
          niche: 'relationships',
          style: 'playful',
          status: 'active',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create profile');
      
      toast.success('Профиль создан');
      fetchProfiles();
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Ошибка создания профиля');
    } finally {
      setCreatingProfile(false);
    }
  };

  // Generate story
  const handleGenerateStory = async () => {
    if (profiles.length === 0) {
      toast.error('Сначала создайте профиль');
      return;
    }
    
    setGeneratingStory(true);
    setGeneratedStory(null);
    
    try {
      const response = await fetch('/api/ofm/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          niche: profiles[0]?.niche || 'relationships',
          style: profiles[0]?.style || 'casual',
          includeLink: true,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate story');
      
      const data = await response.json();
      
      if (data.success && data.story) {
        setGeneratedStory(data.story);
        toast.success('Сторис сгенерирована!');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating story:', error);
      toast.error('Ошибка генерации сторис');
    } finally {
      setGeneratingStory(false);
    }
  };

  // Save generated story
  const handleSaveStory = async () => {
    if (!generatedStory || profiles.length === 0) return;
    
    try {
      const response = await fetch('/api/ofm/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profiles[0].id,
          text: generatedStory.text,
          imageUrl: generatedStory.imageBase64 ? `data:image/png;base64,${generatedStory.imageBase64}` : null,
          linkText: generatedStory.suggestedLink,
          status: 'draft',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save story');
      
      toast.success('Сторис сохранена');
      setGeneratedStory(null);
      fetchStories();
    } catch (error) {
      console.error('Error saving story:', error);
      toast.error('Ошибка сохранения сторис');
    }
  };

  // Toggle profile status
  const handleToggleStatus = async (profile: OFMProfile) => {
    const newStatus = profile.status === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch('/api/ofm/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          status: newStatus,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      
      toast.success(`Статус изменен на "${newStatus === 'active' ? 'Активна' : 'Пауза'}"`);
      fetchProfiles();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  // Delete profile
  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Удалить профиль? Это действие нельзя отменить.')) return;
    
    try {
      const response = await fetch(`/api/ofm/profiles?id=${profileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete profile');
      
      toast.success('Профиль удален');
      fetchProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Ошибка удаления профиля');
    }
  };

  // Calculate totals
  const totalRevenue = profiles.reduce((acc, p) => acc + (p.revenue || 0), 0);
  const totalSubscribers = profiles.reduce((acc, p) => acc + (p.followersGained || 0), 0);
  const totalStories = profiles.reduce((acc, p) => acc + (p.storiesCount || p._count?.stories || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-[#E4405F]" />
            OFM - OnlyFans Model
          </h1>
          <p className="text-[#8A8A8A]">Управление моделями и контентом</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchProfiles}
            disabled={loadingProfiles}
            className="border-[#2A2B32] hover:bg-[#2A2B32]"
          >
            <RefreshCw className={cn("w-4 h-4", loadingProfiles && "animate-spin")} />
          </Button>
          <Button 
            className="bg-[#E4405F] hover:bg-[#E4405F]/80"
            onClick={handleCreateProfile}
            disabled={creatingProfile}
          >
            {creatingProfile ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Добавить модель
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {profilesError && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{profilesError}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchProfiles}
                className="ml-auto"
              >
                Повторить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
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
                <p className="text-2xl font-bold text-white">{totalStories}</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="profiles" className="data-[state=active]:bg-[#E4405F]">Профили</TabsTrigger>
          <TabsTrigger value="stories" className="data-[state=active]:bg-[#E4405F]">Stories</TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-[#E4405F]">Комментарии</TabsTrigger>
          <TabsTrigger value="voice" className="data-[state=active]:bg-[#E4405F]">Голосовые</TabsTrigger>
        </TabsList>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="mt-6">
          {loadingProfiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#E4405F]" />
            </div>
          ) : profiles.length === 0 ? (
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-[#8A8A8A] mb-4" />
                <p className="text-[#8A8A8A] mb-4">Нет профилей моделей</p>
                <Button 
                  className="bg-[#E4405F] hover:bg-[#E4405F]/80"
                  onClick={handleCreateProfile}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первый профиль
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.id} className={cn(
                  'bg-[#14151A] border-[#2A2B32]',
                  profile.status === 'active' && 'border-l-4 border-l-[#E4405F]'
                )}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-[#1E1F26] flex items-center justify-center text-2xl">
                        👩
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium text-lg">{profile.name}</h4>
                          <Badge className={profile.status === 'active' ? 'bg-[#00D26A]' : 'bg-[#8A8A8A]'}>
                            {profile.status === 'active' ? 'Активна' : 'Пауза'}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#8A8A8A]">{profile.niche} • {profile.style}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="p-2 bg-[#1E1F26] rounded">
                        <p className="text-lg font-bold text-white">{profile.followersGained || 0}</p>
                        <p className="text-xs text-[#8A8A8A]">Подписчики</p>
                      </div>
                      <div className="p-2 bg-[#1E1F26] rounded">
                        <p className="text-lg font-bold text-white">{profile.storiesCount || profile._count?.stories || 0}</p>
                        <p className="text-xs text-[#8A8A8A]">Stories</p>
                      </div>
                      <div className="p-2 bg-[#1E1F26] rounded">
                        <p className="text-lg font-bold text-[#00D26A]">{(profile.revenue || 0).toLocaleString()}₽</p>
                        <p className="text-xs text-[#8A8A8A]">Доход</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-[#2A2B32] hover:bg-[#2A2B32]"
                        onClick={() => handleToggleStatus(profile)}
                      >
                        {profile.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" /> Пауза
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" /> Активировать
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-[#2A2B32] hover:bg-red-500/20 text-red-400"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stories Tab */}
        <TabsContent value="stories" className="mt-6">
          {/* Story Generator */}
          <Card className="bg-[#14151A] border-[#2A2B32] mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E4405F]" />
                AI Генератор Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {themes.length > 0 ? themes.map((theme) => (
                    <Button
                      key={theme.id}
                      variant={selectedTheme === theme.id ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        selectedTheme === theme.id 
                          ? 'bg-[#E4405F] hover:bg-[#E4405F]/80' 
                          : 'border-[#2A2B32] hover:bg-[#2A2B32]'
                      )}
                      onClick={() => setSelectedTheme(theme.id)}
                    >
                      {theme.name}
                    </Button>
                  )) : (
                    <>
                      <Button
                        variant={selectedTheme === 'lifestyle' ? 'default' : 'outline'}
                        size="sm"
                        className={selectedTheme === 'lifestyle' ? 'bg-[#E4405F]' : 'border-[#2A2B32]'}
                        onClick={() => setSelectedTheme('lifestyle')}
                      >
                        Лайфстайл
                      </Button>
                      <Button
                        variant={selectedTheme === 'fitness' ? 'default' : 'outline'}
                        size="sm"
                        className={selectedTheme === 'fitness' ? 'bg-[#E4405F]' : 'border-[#2A2B32]'}
                        onClick={() => setSelectedTheme('fitness')}
                      >
                        Фитнес
                      </Button>
                      <Button
                        variant={selectedTheme === 'travel' ? 'default' : 'outline'}
                        size="sm"
                        className={selectedTheme === 'travel' ? 'bg-[#E4405F]' : 'border-[#2A2B32]'}
                        onClick={() => setSelectedTheme('travel')}
                      >
                        Путешествия
                      </Button>
                    </>
                  )}
                </div>
                
                <Button 
                  className="bg-[#E4405F] hover:bg-[#E4405F]/80"
                  onClick={handleGenerateStory}
                  disabled={generatingStory || profiles.length === 0}
                >
                  {generatingStory ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Сгенерировать Story
                    </>
                  )}
                </Button>
                
                {profiles.length === 0 && (
                  <p className="text-xs text-[#8A8A8A]">Сначала создайте профиль модели</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generated Story Preview */}
          {generatedStory && (
            <Card className="bg-[#14151A] border-[#2A2B32] border-[#E4405F] mb-6">
              <CardHeader>
                <CardTitle className="text-white">Предпросмотр</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedStory.imageBase64 && (
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#1E1F26]">
                      <img 
                        src={`data:image/png;base64,${generatedStory.imageBase64}`}
                        alt="Generated story"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col justify-between">
                    <div>
                      <Badge className="mb-2">{generatedStory.themeName}</Badge>
                      <p className="text-white mb-4">{generatedStory.text}</p>
                      {generatedStory.suggestedLink && (
                        <div className="p-3 bg-[#1E1F26] rounded">
                          <p className="text-xs text-[#8A8A8A]">Текст ссылки:</p>
                          <p className="text-white">{generatedStory.suggestedLink}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1 bg-[#00D26A] hover:bg-[#00D26A]/80"
                        onClick={handleSaveStory}
                      >
                        Сохранить
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#2A2B32]"
                        onClick={() => setGeneratedStory(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stories List */}
          {loadingStories ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#E4405F]" />
            </div>
          ) : storiesError ? (
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
                <p className="text-red-400">{storiesError}</p>
                <Button 
                  variant="outline" 
                  className="mt-4 border-[#2A2B32]"
                  onClick={fetchStories}
                >
                  Повторить
                </Button>
              </CardContent>
            </Card>
          ) : stories.length === 0 ? (
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="py-12 text-center">
                <Image className="w-12 h-12 mx-auto text-[#8A8A8A] mb-4" />
                <p className="text-[#8A8A8A]">Нет сторис</p>
                <p className="text-xs text-[#8A8A8A] mt-2">Сгенерируйте первую сторис выше</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {stories.map((story) => (
                <Card key={story.id} className="bg-[#14151A] border-[#2A2B32]">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#E4405F]/20 flex items-center justify-center">
                          <Image className="w-5 h-5 text-[#E4405F]" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{story.profile?.name || 'Без профиля'}</p>
                          <div className="flex gap-4 text-xs text-[#8A8A8A]">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {story.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" /> {story.clicks}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn(
                          story.status === 'published' ? 'bg-[#00D26A]' :
                          story.status === 'draft' ? 'bg-[#FFB800]' : 'bg-[#8A8A8A]'
                        )}>
                          {story.status === 'published' ? 'Опубликовано' :
                           story.status === 'draft' ? 'Черновик' : story.status}
                        </Badge>
                      </div>
                    </div>
                    {story.text && (
                      <p className="text-sm text-[#8A8A8A] mt-2 line-clamp-2">{story.text}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Comments Tab */}
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
                <p className="text-[#8A8A8A] mb-4">Настройте AI для автокомментариев</p>
                <p className="text-xs text-[#8A8A8A] mb-4">
                  {profiles.length === 0 
                    ? 'Сначала создайте профиль модели' 
                    : `Профилей: ${profiles.length}`}
                </p>
                <Button 
                  className="bg-[#E4405F] hover:bg-[#E4405F]/80"
                  disabled={profiles.length === 0}
                  onClick={() => toast.info('Настройка комментариев в разработке')}
                >
                  Настроить
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Tab */}
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
                <p className="text-[#8A8A8A] mb-4">TTS для голосовых сообщений</p>
                <p className="text-xs text-[#8A8A8A] mb-4">
                  {profiles.length === 0 
                    ? 'Сначала создайте профиль модели' 
                    : `Профилей: ${profiles.length}`}
                </p>
                <Button 
                  className="bg-[#E4405F] hover:bg-[#E4405F]/80"
                  disabled={profiles.length === 0}
                  onClick={() => toast.info('Настройка TTS в разработке')}
                >
                  Настроить TTS
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
