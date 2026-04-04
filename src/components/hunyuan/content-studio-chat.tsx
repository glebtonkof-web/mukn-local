'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Image as ImageIcon,
  Video,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Download,
  Edit3,
  Copy,
  Share2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

// Типы
type CommandType = '/create' | '/fix' | '/publish' | '/template' | '/analytics' | '/help';
type ContentType = 'image' | 'video' | 'audio' | 'avatar';
type Platform = 'telegram' | 'instagram' | 'tiktok' | 'youtube' | 'vk' | 'twitter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  command?: CommandType;
  result?: {
    success: boolean;
    contentId?: string;
    mediaUrl?: string;
    mediaBase64?: string;
    platforms?: Platform[];
  };
  isGenerating?: boolean;
}

interface ContentPreview {
  id: string;
  type: ContentType;
  prompt: string;
  mediaUrl?: string;
  mediaBase64?: string;
  status: string;
  createdAt: Date;
}

// Команды
const COMMANDS: { command: CommandType; description: string; example: string }[] = [
  { command: '/create', description: 'Создать контент', example: '/create image девушка в крипто-стиле' },
  { command: '/fix', description: 'Редактировать контент', example: '/fix сделай фон темнее' },
  { command: '/publish', description: 'Опубликовать на платформы', example: '/publish telegram instagram' },
  { command: '/template', description: 'Сохранить как шаблон', example: '/template мой-стиль' },
  { command: '/analytics', description: 'Показать аналитику', example: '/analytics 7d' },
  { command: '/help', description: 'Справка по командам', example: '/help' },
];

// Платформы
const PLATFORMS: { id: Platform; name: string; icon: string; color: string }[] = [
  { id: 'telegram', name: 'Telegram', icon: '📱', color: '#0088cc' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000' },
  { id: 'vk', name: 'VK', icon: '💬', color: '#4A76A8' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
];

export function ContentStudioChatInterface() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Привет! Я Content Studio AI. Создаю изображения, видео и аудио.\n\nДоступные команды:\n• /create [type] [prompt] - создать контент\n• /fix [command] - редактировать\n• /publish [platforms] - опубликовать\n• /template [name] - сохранить шаблон\n• /analytics [period] - статистика\n\nПример: /create image портрет девушки в неоновом стиле',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentContent, setCurrentContent] = useState<ContentPreview | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Парсинг команды
  const parseCommand = (input: string): { command: CommandType | null; args: string } => {
    const trimmed = input.trim();
    
    for (const cmd of COMMANDS) {
      if (trimmed.startsWith(cmd.command)) {
        const args = trimmed.slice(cmd.command.length).trim();
        return { command: cmd.command, args };
      }
    }
    
    return { command: null, args: trimmed };
  };

  // Отправка сообщения
  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const { command, args } = parseCommand(input);

    if (command) {
      await handleCommand(command, args, userMessage.id);
    } else {
      // Обычный промпт = /create image
      await handleCommand('/create', `image ${input}`, userMessage.id);
    }
  };

  // Обработка команды
  const handleCommand = async (command: CommandType, args: string, messageId: string) => {
    setIsGenerating(true);

    // Добавляем сообщение "генерация..."
    const generatingMessage: Message = {
      id: `gen_${Date.now()}`,
      role: 'assistant',
      content: 'Генерация...',
      timestamp: new Date(),
      command,
      isGenerating: true,
    };
    setMessages(prev => [...prev, generatingMessage]);

    try {
      let result: Message['result'];
      let responseText = '';

      switch (command) {
        case '/create':
          const createResult = await handleCreateCommand(args);
          result = createResult.result;
          responseText = createResult.text;
          if (createResult.content) {
            setCurrentContent(createResult.content);
          }
          break;

        case '/fix':
          const fixResult = await handleFixCommand(args);
          result = fixResult.result;
          responseText = fixResult.text;
          break;

        case '/publish':
          const publishResult = await handlePublishCommand(args);
          result = publishResult.result;
          responseText = publishResult.text;
          break;

        case '/template':
          const templateResult = await handleTemplateCommand(args);
          result = templateResult.result;
          responseText = templateResult.text;
          break;

        case '/analytics':
          const analyticsResult = await handleAnalyticsCommand(args);
          result = analyticsResult.result;
          responseText = analyticsResult.text;
          break;

        case '/help':
          responseText = COMMANDS.map(c => `**${c.command}** - ${c.description}\n  Пример: \`${c.example}\``).join('\n\n');
          break;

        default:
          responseText = 'Неизвестная команда. Введите /help для списка команд.';
      }

      // Обновляем сообщение с результатом
      setMessages(prev => prev.map(m => 
        m.id === generatingMessage.id
          ? { ...m, content: responseText, isGenerating: false, result }
          : m
      ));

    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === generatingMessage.id
          ? { ...m, content: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`, isGenerating: false }
          : m
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  // Команда /create
  const handleCreateCommand = async (args: string): Promise<{
    result: Message['result'];
    text: string;
    content?: ContentPreview;
  }> => {
    const parts = args.split(' ');
    const type = parts[0] as ContentType;
    const prompt = parts.slice(1).join(' ');

    if (!['image', 'video', 'audio', 'avatar'].includes(type)) {
      return {
        result: { success: false },
        text: 'Укажите тип контента: image, video, audio или avatar\nПример: `/create image ваш промпт`',
      };
    }

    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'avatar' ? 'generateAvatar' : `generate${type.charAt(0).toUpperCase() + type.slice(1)}`,
          prompt,
          type,
          gender: type === 'avatar' ? 'female' : undefined,
          age: type === 'avatar' ? 'young' : undefined,
          style: type === 'avatar' ? 'professional' : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const content: ContentPreview = {
          id: data.contentId,
          type,
          prompt,
          mediaUrl: data.mediaUrl,
          mediaBase64: data.mediaBase64,
          status: 'completed',
          createdAt: new Date(),
        };

        return {
          result: {
            success: true,
            contentId: data.contentId,
            mediaUrl: data.mediaUrl,
            mediaBase64: data.mediaBase64,
          },
          text: `✅ ${type === 'image' ? 'Изображение' : type === 'video' ? 'Видео' : type === 'audio' ? 'Аудио' : 'Аватар'} создано!\n\nID: \`${data.contentId}\`\n\nИспользуйте /publish для публикации или /fix для редактирования.`,
          content,
        };
      } else {
        return {
          result: { success: false },
          text: `❌ Ошибка генерации: ${data.error || 'Неизвестная ошибка'}`,
        };
      }
    } catch (error) {
      return {
        result: { success: false },
        text: `❌ Ошибка: ${error instanceof Error ? error.message : 'Не удалось подключиться к API'}`,
      };
    }
  };

  // Команда /fix
  const handleFixCommand = async (args: string): Promise<{
    result: Message['result'];
    text: string;
  }> => {
    if (!currentContent) {
      return {
        result: { success: false },
        text: '❌ Нет контента для редактирования. Сначала создайте контент командой /create.',
      };
    }

    try {
      const response = await fetch('/api/hunyuan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editImage',
          imagePath: currentContent.mediaUrl,
          command: args,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentContent(prev => prev ? {
          ...prev,
          mediaUrl: data.mediaUrl,
          mediaBase64: data.mediaBase64,
        } : null);

        return {
          result: {
            success: true,
            contentId: data.contentId,
            mediaUrl: data.mediaUrl,
          },
          text: `✅ Контент отредактирован!\n\nПрименено: "${args}"`,
        };
      } else {
        return {
          result: { success: false },
          text: `❌ Ошибка редактирования: ${data.error}`,
        };
      }
    } catch (error) {
      return {
        result: { success: false },
        text: `❌ Ошибка: ${error instanceof Error ? error.message : 'Не удалось подключиться к API'}`,
      };
    }
  };

  // Команда /publish
  const handlePublishCommand = async (args: string): Promise<{
    result: Message['result'];
    text: string;
  }> => {
    if (!currentContent) {
      return {
        result: { success: false },
        text: '❌ Нет контента для публикации. Сначала создайте контент командой /create.',
      };
    }

    // Парсим платформы
    const platformsArg = args.split(' ').filter(p => PLATFORMS.some(pl => pl.id === p)) as Platform[];
    const platforms = platformsArg.length > 0 ? platformsArg : ['telegram'];

    try {
      const response = await fetch('/api/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: currentContent.id,
          platforms,
        }),
      });

      const data = await response.json();

      if (data.results) {
        const successful = data.results.filter((r: any) => r.success);
        const failed = data.results.filter((r: any) => !r.success);

        let text = `📤 Публикация завершена!\n\n`;
        text += `✅ Успешно: ${successful.map((r: any) => r.platform).join(', ')}\n`;
        if (failed.length > 0) {
          text += `❌ Ошибки: ${failed.map((r: any) => `${r.platform} (${r.error})`).join(', ')}`;
        }

        return {
          result: {
            success: successful.length > 0,
            contentId: currentContent.id,
            platforms,
          },
          text,
        };
      } else {
        return {
          result: { success: false },
          text: `❌ Ошибка публикации: ${data.error}`,
        };
      }
    } catch (error) {
      return {
        result: { success: false },
        text: `❌ Ошибка: ${error instanceof Error ? error.message : 'Не удалось подключиться к API'}`,
      };
    }
  };

  // Команда /template
  const handleTemplateCommand = async (args: string): Promise<{
    result: Message['result'];
    text: string;
  }> => {
    if (!currentContent) {
      return {
        result: { success: false },
        text: '❌ Нет контента для сохранения как шаблон.',
      };
    }

    const name = args || `template_${Date.now()}`;

    try {
      const response = await fetch('/api/hunyuan/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contentType: currentContent.type,
          promptTemplate: currentContent.prompt,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          result: { success: true },
          text: `✅ Шаблон "${name}" сохранён!\n\nID: \`${data.templateId}\``,
        };
      } else {
        return {
          result: { success: false },
          text: `❌ Ошибка сохранения: ${data.error}`,
        };
      }
    } catch (error) {
      return {
        result: { success: false },
        text: `❌ Ошибка: ${error instanceof Error ? error.message : 'Не удалось подключиться к API'}`,
      };
    }
  };

  // Команда /analytics
  const handleAnalyticsCommand = async (args: string): Promise<{
    result: Message['result'];
    text: string;
  }> => {
    const period = args || '7d';

    try {
      const response = await fetch(`/api/hunyuan/analytics?period=${period}`);
      const data = await response.json();

      if (data.stats) {
        return {
          result: { success: true },
          text: `📊 Аналитика за ${period}:\n\n` +
            `• Создано: ${data.stats.totalCreated}\n` +
            `• Опубликовано: ${data.stats.totalPublished}\n` +
            `• Просмотров: ${data.stats.totalViews}\n` +
            `• Кликов: ${data.stats.totalClicks}\n` +
            `• Конверсий: ${data.stats.totalConversions}`,
        };
      } else {
        return {
          result: { success: true },
          text: `📊 Аналитика за ${period}:\n\nДанных пока нет. Создайте контент командой /create.`,
        };
      }
    } catch (error) {
      return {
        result: { success: false },
        text: `❌ Ошибка получения аналитики: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      };
    }
  };

  // Быстрые команды
  const quickCommands = [
    { label: 'Изображение', command: '/create image ' },
    { label: 'Видео', command: '/create video ' },
    { label: 'Аватар', command: '/create avatar ' },
    { label: 'Редактировать', command: '/fix ' },
    { label: 'Опубликовать', command: '/publish telegram' },
  ];

  // Рендер превью контента
  const renderContentPreview = () => {
    if (!currentContent) return null;

    return (
      <div className="mt-4 p-4 rounded-lg bg-[#1E1F26] border border-[#2A2B32]">
        <div className="flex items-start gap-4">
          <div className="w-32 h-32 rounded-lg bg-[#2A2B32] overflow-hidden flex items-center justify-center">
            {currentContent.mediaBase64 ? (
              <img
                src={`data:image/png;base64,${currentContent.mediaBase64.substring(0, 100)}...`}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-[#6C63FF]" />
            )}
          </div>
          <div className="flex-1">
            <Badge variant="outline" className="mb-2">{currentContent.type}</Badge>
            <p className="text-sm text-[#8A8A8A] line-clamp-2">{currentContent.prompt}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setShowPublishDialog(true)}>
                <Globe className="w-4 h-4 mr-1" />
                Опубликовать
              </Button>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Скачать
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[#14151A] border-[#2A2B32] h-[700px] flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#6C63FF]" />
          Content Studio AI
          <Badge variant="outline" className="ml-auto">DeepSeek + Hunyuan</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-4 pt-0">
        {/* Быстрые команды */}
        <div className="flex gap-2 mb-4 shrink-0 flex-wrap">
          {quickCommands.map((cmd, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => setInput(cmd.command)}
              className="border-[#2A2B32] text-[#8A8A8A] hover:text-white hover:border-[#6C63FF]"
            >
              {cmd.label}
            </Button>
          ))}
        </div>

        {/* Сообщения */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 bg-[#6C63FF]/20 shrink-0">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="w-4 h-4 text-[#6C63FF]" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-[#6C63FF] text-white'
                      : 'bg-[#1E1F26] text-[#E0E0E0] border border-[#2A2B32]'
                  }`}
                >
                  {message.isGenerating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Генерация...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Превью результата */}
                      {message.result?.mediaBase64 && (
                        <div className="mt-3 rounded-lg overflow-hidden bg-[#2A2B32]">
                          <img
                            src={`data:image/png;base64,${message.result.mediaBase64}`}
                            alt="Generated"
                            className="w-full max-w-[300px]"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 bg-[#00D26A]/20 shrink-0">
                    <AvatarFallback className="bg-transparent">
                      <User className="w-4 h-4 text-[#00D26A]" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Превью текущего контента */}
        {currentContent && renderContentPreview()}

        {/* Поле ввода */}
        <div className="mt-4 flex gap-2 shrink-0">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Введите команду или промпт..."
            className="flex-1 bg-[#1E1F26] border-[#2A2B32] focus:border-[#6C63FF]"
            disabled={isGenerating}
          />
          <Button
            onClick={handleSend}
            disabled={isGenerating || !input.trim()}
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>

      {/* Диалог публикации */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Выберите платформы для публикации</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {PLATFORMS.map(platform => (
              <button
                key={platform.id}
                onClick={() => {
                  setSelectedPlatforms(prev =>
                    prev.includes(platform.id)
                      ? prev.filter(p => p !== platform.id)
                      : [...prev, platform.id]
                  );
                }}
                className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                  selectedPlatforms.includes(platform.id)
                    ? 'border-[#6C63FF] bg-[#6C63FF]/20'
                    : 'border-[#2A2B32] hover:border-[#6C63FF]/50'
                }`}
              >
                <span>{platform.icon}</span>
                <span>{platform.name}</span>
                {selectedPlatforms.includes(platform.id) && (
                  <CheckCircle className="w-4 h-4 text-[#00D26A] ml-auto" />
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)} className="border-[#2A2B32]">
              Отмена
            </Button>
            <Button
              onClick={() => {
                handleCommand('/publish', selectedPlatforms.join(' '), '');
                setShowPublishDialog(false);
              }}
              disabled={selectedPlatforms.length === 0}
              className="bg-[#6C63FF]"
            >
              Опубликовать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
