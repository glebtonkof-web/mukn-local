'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Video, Sparkles, Image, FileText, 
  Play, Pause, Plus, Clock, CheckCircle, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const contentCalendar = [
  { id: '1', date: '2024-01-15', time: '10:00', title: 'Crypto Signal Post', status: 'published', platform: 'Telegram' },
  { id: '2', date: '2024-01-15', time: '14:00', title: 'Reels Video', status: 'scheduled', platform: 'Instagram' },
  { id: '3', date: '2024-01-16', time: '09:00', title: 'Trading Tips', status: 'draft', platform: 'TikTok' },
  { id: '4', date: '2024-01-16', time: '18:00', title: 'Market Analysis', status: 'scheduled', platform: 'YouTube' },
];

const videoGenerations = [
  { id: '1', title: 'Crypto Promo', status: 'completed', duration: '0:30', thumbnail: '🎬' },
  { id: '2', title: 'Trading Tutorial', status: 'processing', duration: '1:45', thumbnail: '⏳' },
  { id: '3', title: 'Signal Highlights', status: 'queued', duration: '0:15', thumbnail: '📋' },
];

const aiGenerations = [
  { id: '1', type: 'Text', prompt: 'Crypto signal description...', status: 'completed' },
  { id: '2', type: 'Image', prompt: 'Trading chart visualization...', status: 'completed' },
  { id: '3', type: 'Text', prompt: 'Instagram caption...', status: 'processing' },
];

export function ContentView() {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#6C63FF]" />
            Контент
          </h1>
          <p className="text-[#8A8A8A]">Календарь, видео и AI генерация</p>
        </div>
        <Button className="bg-[#6C63FF]">
          <Plus className="w-4 h-4 mr-2" />
          Создать контент
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1E1F26] border-[#2A2B32]">
          <TabsTrigger value="calendar" className="data-[state=active]:bg-[#6C63FF]">Календарь</TabsTrigger>
          <TabsTrigger value="video" className="data-[state=active]:bg-[#6C63FF]">Видео</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-[#6C63FF]">AI Генерация</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <Card className="bg-[#14151A] border-[#2A2B32]">
            <CardHeader>
              <CardTitle className="text-white">Расписание публикаций</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contentCalendar.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#1E1F26] rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-[#8A8A8A]">{item.date}</p>
                        <p className="text-white font-medium">{item.time}</p>
                      </div>
                      <div>
                        <p className="text-white">{item.title}</p>
                        <p className="text-xs text-[#8A8A8A]">{item.platform}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      item.status === 'published' ? 'bg-[#00D26A]' :
                      item.status === 'scheduled' ? 'bg-[#FFB800]' : 'bg-[#8A8A8A]'
                    )}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {videoGenerations.map((video) => (
              <Card key={video.id} className="bg-[#14151A] border-[#2A2B32]">
                <CardContent className="pt-6">
                  <div className="text-4xl text-center mb-4">{video.thumbnail}</div>
                  <h4 className="text-white font-medium text-center mb-2">{video.title}</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8A8A8A]">{video.duration}</span>
                    <Badge className={cn(
                      video.status === 'completed' ? 'bg-[#00D26A]' :
                      video.status === 'processing' ? 'bg-[#FFB800]' : 'bg-[#8A8A8A]'
                    )}>
                      {video.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button className="mt-4 w-full bg-[#6C63FF]">
            <Video className="w-4 h-4 mr-2" />
            Создать видео
          </Button>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <div className="space-y-3">
            {aiGenerations.map((gen) => (
              <Card key={gen.id} className="bg-[#14151A] border-[#2A2B32]">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                        {gen.type === 'Text' ? <FileText className="w-5 h-5 text-[#6C63FF]" /> : <Image className="w-5 h-5 text-[#6C63FF]" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">{gen.type}</p>
                        <p className="text-xs text-[#8A8A8A] truncate max-w-[300px]">{gen.prompt}</p>
                      </div>
                    </div>
                    <Badge className={gen.status === 'completed' ? 'bg-[#00D26A]' : 'bg-[#FFB800]'}>
                      {gen.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function VideoGeneratorView() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setGenerating(false);
    toast.success('Видео добавлено в очередь');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video className="w-7 h-7 text-[#6C63FF]" />
            Видео генератор
          </h1>
          <p className="text-[#8A8A8A]">AI генерация видео контента</p>
        </div>
      </div>

      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="py-12 text-center">
          <Video className="w-16 h-16 mx-auto text-[#6C63FF] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Создать видео</h3>
          <p className="text-[#8A8A8A] mb-6">Опишите желаемое видео для AI генерации</p>
          <Button 
            onClick={handleGenerate} 
            disabled={generating}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            {generating ? 'Генерация...' : 'Создать видео'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {videoGenerations.map((video) => (
          <Card key={video.id} className="bg-[#14151A] border-[#2A2B32]">
            <CardContent className="pt-6">
              <div className="text-4xl text-center mb-4">{video.thumbnail}</div>
              <h4 className="text-white font-medium text-center">{video.title}</h4>
              <p className="text-xs text-[#8A8A8A] text-center">{video.duration}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
