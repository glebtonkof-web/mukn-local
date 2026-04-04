'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { useInfluencers, useAIGeneration } from '@/hooks/use-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  User,
  Palette,
  MessageSquare,
  Check,
  Loader2,
  AlertCircle,
  Globe,
  Instagram,
  Youtube,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Пол и ниша', icon: User },
  { id: 2, title: 'Личность', icon: Sparkles },
  { id: 3, title: 'Внешность', icon: Palette },
  { id: 4, title: 'Характер', icon: MessageSquare },
  { id: 5, title: 'Соцсети', icon: Globe },
  { id: 6, title: 'Стиль', icon: MessageSquare },
  { id: 7, title: 'Промпты', icon: Sparkles },
  { id: 8, title: 'Готово', icon: Check },
];

const NICHES = [
  { id: 'gambling', label: 'Гемблинг', description: 'Казино, ставки, игровые автоматы', color: '#FF4D4D' },
  { id: 'crypto', label: 'Крипта', description: 'Трейдинг, инвестиции, NFT', color: '#FFB800' },
  { id: 'nutra', label: 'Нутра', description: 'БАДы, похудение, здоровье', color: '#00D26A' },
  { id: 'bait', label: 'Байт', description: 'Дейтинг, контент 18+', color: '#E4405F' },
  { id: 'lifestyle', label: 'Лайфстайл', description: 'Универсальный контент', color: '#6C63FF' },
  { id: 'finance', label: 'Финансы', description: 'Инвестиции, заработок, бизнес', color: '#00D4AA' },
  { id: 'dating', label: 'Дейтинг', description: 'Знакомства, отношения', color: '#FF6B9D' },
  { id: 'gaming', label: 'Гейминг', description: 'Видеоигры, стриминг, киберспорт', color: '#9D4EDD' },
];

const ROLES: Record<string, string[]> = {
  gambling: [
    'Успешный игрок',
    'Эксперт по ставкам',
    'Везунчик',
    'Стример казино',
    'Аналитик ставок',
    'Бонус-хантер',
    'Покерный про',
    'Слотс-стример',
    'Спорт-беттор',
    'Арбитражник',
  ],
  crypto: [
    'Успешный трейдер',
    'Криптоинвестор',
    'Аналитик рынка',
    'Блокчейн-эксперт',
    'NFT-коллекционер',
    'Дефи-фермер',
    'Крипто-блогер',
    'AirDrop охотник',
    'Веб3 разработчик',
    'Крипто-миллионер',
  ],
  nutra: [
    'Фитнес-тренер',
    'Нутрициолог',
    'Врач-диетолог',
    'Блогер о здоровье',
    'Бодибилдер',
    'Йога-инструктор',
    'Мотиватор похудения',
    'Спортсмен',
    'Wellness-коуч',
    'Био-хакер',
  ],
  bait: [
    'Модель',
    'Инстаграм-звезда',
    'ТикТокер',
    'Стримерша',
    'OnlyFans модель',
    'Кам-модель',
    'Фитнес-модель',
    'Эротическая модель',
    'Вебкам-модель',
    'Косплейщица',
  ],
  lifestyle: [
    'Путешественник',
    'Бизнесмен',
    'Блогер',
    'Предприниматель',
    'Мотивационный спикер',
    'Лайф-коуч',
    'Инфлюенсер',
    'Фэшн-блогер',
    'Техно-энтузиаст',
    'Автомобильный энтузиаст',
  ],
  finance: [
    'Инвестор',
    'Финансовый консультант',
    'Бизнес-коуч',
    'Предприниматель',
    'Финансист',
    'Топ-менеджер',
    'Стартапер',
    'Фрилансер-миллионер',
    'Агент по недвижимости',
    'Кредитный специалист',
  ],
  dating: [
    'Пикап-мастер',
    'Девушка-мечта',
    'Отношения-коуч',
    'Свадебный блогер',
    'Психолог отношений',
    'Секс-эксперт',
    'Семейный консультант',
    'Мачо',
    'Идеальная жена',
    'Знаток Tinder',
  ],
  gaming: [
    'Про-геймер',
    'Стример',
    'Игровой блогер',
    'Киберспортсмен',
    'Гейм-девушка',
    'Летсплейщик',
    'Гейм-критик',
    'Модмейкер',
    'Скорраннер',
    'Игровой комментатор',
  ],
};

const PERSONALITY_TRAITS = [
  { id: 'confident', label: 'Уверенный', description: 'Самоуверенный, решительный' },
  { id: 'friendly', label: 'Дружелюбный', description: 'Общительный, открытый' },
  { id: 'mysterious', label: 'Загадочный', description: 'Интригующий, таинственный' },
  { id: 'energetic', label: 'Энергичный', description: 'Активный, мотивирующий' },
  { id: 'calm', label: 'Спокойный', description: 'Уравновешенный, мудрый' },
  { id: 'playful', label: 'Игривый', description: 'Шутливый, лёгкий' },
  { id: 'professional', label: 'Профессиональный', description: 'Серьёзный, экспертный' },
  { id: 'caring', label: 'Заботливый', description: 'Внимательный, эмпатичный' },
];

const INTERESTS = [
  'Путешествия', 'Фитнес', 'Криптовалюты', 'Игры', 'Музыка',
  'Кино', 'Мода', 'Еда', 'Автомобили', 'Технологии',
  'Спорт', 'Искусство', 'Фотография', 'Книги', 'Йога',
  'Медитация', 'Бизнес', 'Инвестиции', 'Ночная жизнь', 'Природа',
];

const TIMEZONES = [
  { id: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { id: 'Europe/Kiev', label: 'Киев (UTC+2)' },
  { id: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { id: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { id: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { id: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { id: 'Europe/London', label: 'Лондон (UTC+0)' },
  { id: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
  { id: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)' },
  { id: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
];

const LANGUAGES = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'uk', label: 'Українська' },
  { id: 'kz', label: 'Қазақша' },
];

interface FormData {
  gender: 'male' | 'female';
  niche: string;
  name: string;
  age: number;
  role: string;
  country: string;
  language: string;
  timezone: string;
  avatarUrl: string;
  style: string;
  personality: string[];
  interests: string[];
  bio: string;
  telegramUsername: string;
  telegramChannel: string;
  instagramUsername: string;
  tiktokUsername: string;
  youtubeChannelId: string;
  // Расширенные промпты
  postPrompt: string;
  commentPrompt: string;
  dmPrompt: string;
  storyPrompt: string;
  greetingPrompt: string;
  tone: string;
  phrases: string;
  forbidden: string;
}

export function CreateInfluencerDialog() {
  const { createInfluencerOpen, setCreateInfluencerOpen, editingInfluencer, setEditingInfluencer } = useAppStore();
  const { createInfluencer, updateInfluencer } = useInfluencers();
  const { generateContent, loading: aiLoading } = useAIGeneration();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPhotos, setGeneratedPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    gender: 'female',
    niche: '',
    name: '',
    age: 24,
    role: '',
    country: 'RU',
    language: 'ru',
    timezone: 'Europe/Moscow',
    avatarUrl: '',
    style: '',
    personality: [],
    interests: [],
    bio: '',
    telegramUsername: '',
    telegramChannel: '',
    instagramUsername: '',
    tiktokUsername: '',
    youtubeChannelId: '',
    // Расширенные промпты
    postPrompt: '',
    commentPrompt: '',
    dmPrompt: '',
    storyPrompt: '',
    greetingPrompt: '',
    tone: '',
    phrases: '',
    forbidden: '',
  });

  const isEditMode = !!editingInfluencer;

  // Initialize form when editing
  useEffect(() => {
    if (editingInfluencer) {
      setFormData({
        gender: editingInfluencer.gender as 'male' | 'female',
        niche: editingInfluencer.niche || '',
        name: editingInfluencer.name,
        age: editingInfluencer.age ?? 24,
        role: editingInfluencer.role || '',
        country: editingInfluencer.country || 'RU',
        language: 'ru',
        timezone: 'Europe/Moscow',
        avatarUrl: editingInfluencer.avatarUrl || '',
        style: editingInfluencer.style || '',
        personality: [],
        interests: [],
        bio: '',
        telegramUsername: editingInfluencer.telegramUsername || '',
        telegramChannel: editingInfluencer.telegramChannel || '',
        instagramUsername: editingInfluencer.instagramUsername || '',
        tiktokUsername: editingInfluencer.tiktokUsername || '',
        youtubeChannelId: editingInfluencer.youtubeChannelId || '',
        // Расширенные промпты
        postPrompt: editingInfluencer.postPrompt || '',
        commentPrompt: editingInfluencer.commentPrompt || '',
        dmPrompt: editingInfluencer.dmPrompt || '',
        storyPrompt: editingInfluencer.storyPrompt || '',
        greetingPrompt: editingInfluencer.greetingPrompt || '',
        tone: editingInfluencer.tone || '',
        phrases: editingInfluencer.phrases || '',
        forbidden: editingInfluencer.forbidden || '',
      });
      if (editingInfluencer.avatarUrl) {
        setGeneratedPhotos([editingInfluencer.avatarUrl]);
      }
    }
  }, [editingInfluencer]);

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.gender && formData.niche;
      case 2:
        return formData.name && formData.age >= 18 && formData.role;
      case 3:
        return true; // Avatar is optional
      case 4:
        return true; // Personality is optional
      case 5:
        return true; // Social media is optional
      case 6:
        return formData.style.length >= 20;
      case 7:
        return true; // Prompts are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGeneratePersonality = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Генерируем имя через AI
      const generatedName = await generateContent('style', {
        niche: formData.niche,
        influencerRole: formData.gender === 'female' ? 'девушка' : 'парень',
        topic: 'generate_name',
      });
      
      // Парсим имя из ответа
      const nameMatch = generatedName.match(/Имя:\s*(.+)/i);
      const name = nameMatch ? nameMatch[1].trim() : (formData.gender === 'female' ? 'София' : 'Максим');
      
      const names = formData.gender === 'female' 
        ? ['София', 'Алиса', 'Мария', 'Анна', 'Елена', 'Виктория', 'Дарья', 'Полина']
        : ['Александр', 'Максим', 'Дмитрий', 'Артём', 'Иван', 'Кирилл', 'Никита', 'Андрей'];
      
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomAge = Math.floor(Math.random() * 15) + 20; // 20-35
      
      setFormData({
        ...formData,
        name: randomName,
        age: randomAge,
        role: ROLES[formData.niche]?.[0] || '',
      });
      
      toast.success('Личность сгенерирована');
    } catch (e) {
      // Fallback к случайным данным
      const names = formData.gender === 'female' 
        ? ['София', 'Алиса', 'Мария', 'Анна', 'Елена', 'Виктория']
        : ['Александр', 'Максим', 'Дмитрий', 'Артём', 'Иван', 'Кирилл'];
      
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomAge = Math.floor(Math.random() * 15) + 20;
      
      setFormData({
        ...formData,
        name: randomName,
        age: randomAge,
        role: ROLES[formData.niche]?.[0] || '',
      });
      
      toast.info('Использованы случайные данные');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePhotos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Используем CLI инструмент для генерации фото
      // В реальном проекте здесь вызывается FLUX API через Replicate
      
      // Для демо используем dicebear аватары с уникальным сидом
      const seed = Date.now();
      const genderStyle = formData.gender === 'female' ? 'female' : 'male';
      
      const photos = Array.from({ length: 4 }, (_, i) => 
        `https://api.dicebear.com/7.x/personas/svg?seed=${seed}_${i}_${genderStyle}`
      );
      
      setGeneratedPhotos(photos);
      setFormData({ ...formData, avatarUrl: photos[0] });
      
      toast.success('Фото сгенерированы');
    } catch (e) {
      setError('Ошибка генерации фото');
      toast.error('Ошибка генерации фото');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStyle = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const style = await generateContent('style', {
        niche: formData.niche,
        influencerRole: formData.role,
        influencerName: formData.name,
        influencerAge: formData.age,
        gender: formData.gender,
        personality: formData.personality,
        interests: formData.interests,
      });
      
      setFormData({ ...formData, style });
      toast.success('Стиль сгенерирован');
    } catch (e) {
      // Fallback к шаблонам
      const styles: Record<string, string> = {
        gambling: 'Уверенный, азартный, использует сленг игроков. Эмодзи: 🎰💰🔥 Эмоциональные посты о больших выигрышах.',
        crypto: 'Аналитический, профессиональный, с цифрами и графиками. Эмодзи: 📈🚀💎 Упоминает тренды и прогнозы.',
        nutra: 'Дружелюбный, заботливый, экспертный. Эмодзи: 💪🥗✨ Делиться личным опытом и результатами.',
        bait: 'Игривый, флиртующий, интригующий. Эмодзи: 💋🔥💕 Намёки и провокации.',
        lifestyle: 'Позитивный, вдохновляющий, мотивирующий. Эмодзи: 🌟💫🎯 Истории успеха и советы.',
        finance: 'Профессиональный, экспертный, уверенный. Эмодзи: 💼📈💰 Стратегии инвестирования.',
        dating: 'Романтичный, эмоциональный, открытый. Эмодзи: 💕❤️💑 Истории о любви.',
        gaming: 'Энергичный, вовлекающий, фанатский. Эмодзи: 🎮🕹️👾 Обсуждение игр.',
      };
      
      setFormData({ ...formData, style: styles[formData.niche] || '' });
      toast.info('Использован шаблон стиля');
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация отдельных промптов
  const handleGeneratePostPrompt = async () => {
    setIsLoading(true);
    try {
      const prompt = await generateContent('post', {
        niche: formData.niche,
        influencerRole: formData.role,
        influencerName: formData.name,
        influencerAge: formData.age,
        gender: formData.gender,
        influencerStyle: formData.style,
        topic: 'общая тема блога',
        platform: 'Telegram',
      });
      setFormData({ ...formData, postPrompt: prompt });
      toast.success('Промпт для постов сгенерирован');
    } catch (e) {
      toast.error('Ошибка генерации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCommentPrompt = async () => {
    setIsLoading(true);
    try {
      const prompt = await generateContent('comment', {
        niche: formData.niche,
        influencerRole: formData.role,
        influencerName: formData.name,
        influencerStyle: formData.style,
        topic: 'комментирование постов',
      });
      setFormData({ ...formData, commentPrompt: prompt });
      toast.success('Промпт для комментариев сгенерирован');
    } catch (e) {
      toast.error('Ошибка генерации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDmPrompt = async () => {
    setIsLoading(true);
    try {
      const prompt = await generateContent('dm', {
        niche: formData.niche,
        influencerRole: formData.role,
        influencerName: formData.name,
        influencerStyle: formData.style,
        gender: formData.gender,
      });
      setFormData({ ...formData, dmPrompt: prompt });
      toast.success('Промпт для DM сгенерирован');
    } catch (e) {
      toast.error('Ошибка генерации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStoryPrompt = async () => {
    setIsLoading(true);
    try {
      const prompt = await generateContent('story', {
        niche: formData.niche,
        influencerRole: formData.role,
        influencerName: formData.name,
        influencerStyle: formData.style,
        platform: 'Instagram',
      });
      setFormData({ ...formData, storyPrompt: prompt });
      toast.success('Промпт для сторис сгенерирован');
    } catch (e) {
      toast.error('Ошибка генерации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAllPrompts = async () => {
    setIsLoading(true);
    try {
      // Генерируем все промпты параллельно
      const [post, comment, dm, story, greeting] = await Promise.all([
        generateContent('post', {
          niche: formData.niche,
          influencerRole: formData.role,
          influencerName: formData.name,
          influencerAge: formData.age,
          gender: formData.gender,
          influencerStyle: formData.style,
          topic: 'тема дня',
          platform: 'Telegram',
        }),
        generateContent('comment', {
          niche: formData.niche,
          influencerRole: formData.role,
          influencerName: formData.name,
          influencerStyle: formData.style,
        }),
        generateContent('dm', {
          niche: formData.niche,
          influencerRole: formData.role,
          influencerName: formData.name,
          influencerStyle: formData.style,
          gender: formData.gender,
        }),
        generateContent('story', {
          niche: formData.niche,
          influencerRole: formData.role,
          influencerName: formData.name,
          influencerStyle: formData.style,
        }),
        generateContent('greeting', {
          niche: formData.niche,
          influencerRole: formData.role,
          influencerName: formData.name,
          influencerStyle: formData.style,
        }),
      ]);
      
      setFormData({
        ...formData,
        postPrompt: post,
        commentPrompt: comment,
        dmPrompt: dm,
        storyPrompt: story,
        greetingPrompt: greeting,
      });
      toast.success('Все промпты сгенерированы!');
    } catch (e) {
      toast.error('Ошибка генерации промптов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEditMode && editingInfluencer) {
        // Update existing influencer
        await updateInfluencer(editingInfluencer.id, {
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          niche: formData.niche,
          role: formData.role,
          style: formData.style,
          country: formData.country,
          avatarUrl: formData.avatarUrl,
          telegramUsername: formData.telegramUsername || undefined,
          telegramChannel: formData.telegramChannel || undefined,
          instagramUsername: formData.instagramUsername || undefined,
          tiktokUsername: formData.tiktokUsername || undefined,
          youtubeChannelId: formData.youtubeChannelId || undefined,
        });

        toast.success(`Инфлюенсер "${formData.name}" обновлён!`);
      } else {
        // Create new influencer
        await createInfluencer({
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          niche: formData.niche,
          role: formData.role,
          style: formData.style,
          country: formData.country,
          avatarUrl: formData.avatarUrl,
          telegramUsername: formData.telegramUsername || undefined,
          telegramChannel: formData.telegramChannel || undefined,
          instagramUsername: formData.instagramUsername || undefined,
          tiktokUsername: formData.tiktokUsername || undefined,
          youtubeChannelId: formData.youtubeChannelId || undefined,
        });

        toast.success(`Инфлюенсер "${formData.name}" создан!`);
      }

      setCreateInfluencerOpen(false);
      resetForm();
    } catch (e) {
      setError(isEditMode ? 'Ошибка обновления инфлюенсера' : 'Ошибка создания инфлюенсера');
      toast.error(isEditMode ? 'Ошибка обновления инфлюенсера' : 'Ошибка создания инфлюенсера');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setGeneratedPhotos([]);
    setError(null);
    setEditingInfluencer(null);
    setFormData({
      gender: 'female',
      niche: '',
      name: '',
      age: 24,
      role: '',
      country: 'RU',
      language: 'ru',
      timezone: 'Europe/Moscow',
      avatarUrl: '',
      style: '',
      personality: [],
      interests: [],
      bio: '',
      telegramUsername: '',
      telegramChannel: '',
      instagramUsername: '',
      tiktokUsername: '',
      youtubeChannelId: '',
      postPrompt: '',
      commentPrompt: '',
      dmPrompt: '',
      storyPrompt: '',
      greetingPrompt: '',
      tone: '',
      phrases: '',
      forbidden: '',
    });
  };

  return (
    <Dialog open={createInfluencerOpen} onOpenChange={(open) => {
      setCreateInfluencerOpen(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-3xl bg-[#14151A] border-[#2A2B32] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? 'Редактирование AI-инфлюенсера' : 'Создание AI-инфлюенсера'}
          </DialogTitle>
          <DialogDescription className="text-[#8A8A8A]">
            {isEditMode ? 'Изменение параметров виртуального инфлюенсера' : 'Пошаговый мастер создания виртуального инфлюенсера'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="py-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex flex-col items-center',
                    isActive ? 'text-[#6C63FF]' : isCompleted ? 'text-[#00D26A]' : 'text-[#8A8A8A]'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      isActive ? 'bg-[#6C63FF] text-white' :
                      isCompleted ? 'bg-[#00D26A] text-white' :
                      'bg-[#1E1F26] text-[#8A8A8A]'
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-[#FF4D4D]/20 border border-[#FF4D4D] rounded-lg text-[#FF4D4D]">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[300px] py-4">
          {/* Step 1: Gender & Niche */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-white">Пол</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(v) => setFormData({ ...formData, gender: v as 'male' | 'female' })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" className="border-[#6C63FF]" />
                    <Label htmlFor="female" className="text-white">Женский</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" className="border-[#6C63FF]" />
                    <Label htmlFor="male" className="text-white">Мужской</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-white">Ниша</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {NICHES.map((niche) => (
                    <Card
                      key={niche.id}
                      className={cn(
                        'cursor-pointer p-4 transition-all border-2',
                        formData.niche === niche.id
                          ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                          : 'border-[#2A2B32] bg-[#1E1F26] hover:border-[#6C63FF]/50'
                      )}
                      onClick={() => setFormData({ ...formData, niche: niche.id })}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: niche.color }}
                        />
                        <span className="font-medium text-white">{niche.label}</span>
                      </div>
                      <p className="text-xs text-[#8A8A8A]">{niche.description}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Personality */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleGeneratePersonality}
                  disabled={isLoading || !formData.niche}
                  className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI-генерация
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Имя</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="София"
                    className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Возраст</Label>
                  <Input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 18 })}
                    min={18}
                    max={50}
                    className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Роль</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    {(ROLES[formData.niche] || []).map((role) => (
                      <SelectItem key={role} value={role} className="text-white hover:bg-[#2A2B32]">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Страна</Label>
                <Select
                  value={formData.country}
                  onValueChange={(v) => setFormData({ ...formData, country: v })}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                    <SelectValue placeholder="Выберите страну" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="RU" className="text-white">Россия</SelectItem>
                    <SelectItem value="UA" className="text-white">Украина</SelectItem>
                    <SelectItem value="KZ" className="text-white">Казахстан</SelectItem>
                    <SelectItem value="BY" className="text-white">Беларусь</SelectItem>
                    <SelectItem value="US" className="text-white">США</SelectItem>
                    <SelectItem value="DE" className="text-white">Германия</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Appearance */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-white">Внешность</Label>
                  <p className="text-sm text-[#8A8A8A]">AI сгенерирует уникальные фото</p>
                </div>
                <Button
                  onClick={handleGeneratePhotos}
                  disabled={isLoading}
                  className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Сгенерировать фото
                </Button>
              </div>

              {generatedPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {generatedPhotos.map((url, index) => (
                    <div
                      key={index}
                      className={cn(
                        'cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
                        formData.avatarUrl === url
                          ? 'border-[#6C63FF] ring-2 ring-[#6C63FF]/50'
                          : 'border-[#2A2B32] hover:border-[#6C63FF]/50'
                      )}
                      onClick={() => setFormData({ ...formData, avatarUrl: url })}
                    >
                      <Avatar className="w-full h-24 rounded-none">
                        <AvatarImage src={url} alt={`Photo ${index + 1}`} />
                        <AvatarFallback className="bg-[#1E1F26]">#{index + 1}</AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
                </div>
              )}

              {formData.avatarUrl && (
                <div className="flex items-center gap-3 p-3 bg-[#1E1F26] rounded-lg">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={formData.avatarUrl} />
                    <AvatarFallback className="bg-[#6C63FF]">{formData.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">Выбрано фото</p>
                    <p className="text-sm text-[#8A8A8A]">Нажмите на другое фото для замены</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Personality & Interests */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <Label className="text-white mb-3 block">Черты характера</Label>
                <p className="text-sm text-[#8A8A8A] mb-3">Выберите основные черты личности</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PERSONALITY_TRAITS.map((trait) => (
                    <button
                      key={trait.id}
                      type="button"
                      onClick={() => {
                        const newPersonality = formData.personality.includes(trait.id)
                          ? formData.personality.filter((p) => p !== trait.id)
                          : [...formData.personality, trait.id];
                        setFormData({ ...formData, personality: newPersonality });
                      }}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        formData.personality.includes(trait.id)
                          ? 'border-[#6C63FF] bg-[#6C63FF]/10'
                          : 'border-[#2A2B32] bg-[#1E1F26] hover:border-[#6C63FF]/50'
                      )}
                    >
                      <p className="font-medium text-white text-sm">{trait.label}</p>
                      <p className="text-xs text-[#8A8A8A]">{trait.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-white mb-3 block">Интересы</Label>
                <p className="text-sm text-[#8A8A8A] mb-3">Выберите увлечения персонажа</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => {
                        const newInterests = formData.interests.includes(interest)
                          ? formData.interests.filter((i) => i !== interest)
                          : [...formData.interests, interest];
                        setFormData({ ...formData, interests: newInterests });
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-all',
                        formData.interests.includes(interest)
                          ? 'bg-[#6C63FF] text-white'
                          : 'bg-[#1E1F26] text-[#8A8A8A] hover:bg-[#2A2B32]'
                      )}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block">Био / О себе</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Краткое описание персонажа..."
                  className="min-h-[80px] bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">Язык</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(v) => setFormData({ ...formData, language: v })}
                  >
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id} className="text-white">
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Часовой пояс</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                  >
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.id} value={tz.id} className="text-white">
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Social Media */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <Label className="text-white mb-2 block">Telegram</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#8A8A8A] mb-1">Username</p>
                    <Input
                      value={formData.telegramUsername}
                      onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value.replace('@', '') })}
                      placeholder="username"
                      className="bg-[#1E1F26] border-[#2A2B32] text-white"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[#8A8A8A] mb-1">Канал</p>
                    <Input
                      value={formData.telegramChannel}
                      onChange={(e) => setFormData({ ...formData, telegramChannel: e.target.value })}
                      placeholder="@channel"
                      className="bg-[#1E1F26] border-[#2A2B32] text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-[#E4405F]" />
                  Instagram
                </Label>
                <Input
                  value={formData.instagramUsername}
                  onChange={(e) => setFormData({ ...formData, instagramUsername: e.target.value.replace('@', '') })}
                  placeholder="username"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block">TikTok</Label>
                <Input
                  value={formData.tiktokUsername}
                  onChange={(e) => setFormData({ ...formData, tiktokUsername: e.target.value.replace('@', '') })}
                  placeholder="username"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>

              <div>
                <Label className="text-white mb-2 block flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-[#FF0000]" />
                  YouTube
                </Label>
                <Input
                  value={formData.youtubeChannelId}
                  onChange={(e) => setFormData({ ...formData, youtubeChannelId: e.target.value })}
                  placeholder="Channel ID или ссылка"
                  className="bg-[#1E1F26] border-[#2A2B32] text-white"
                />
              </div>

              <div className="p-3 bg-[#1E1F26] rounded-lg border border-[#2A2B32]">
                <p className="text-sm text-[#8A8A8A]">
                  💡 Социальные сети можно привязать позже. Настройте их в карточке инфлюенсера.
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Style */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-white">Стиль общения</Label>
                  <p className="text-sm text-[#8A8A8A]">Промпт для AI при генерации контента</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleGenerateStyle}
                  disabled={isLoading}
                  className="border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF]/10"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI-генерация
                </Button>
              </div>

              <Textarea
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                placeholder="Опишите стиль общения вашего инфлюенсера..."
                className="min-h-[150px] bg-[#1E1F26] border-[#2A2B32] text-white"
              />

              <div className="flex items-center gap-2 text-sm">
                <span className={formData.style.length >= 20 ? 'text-[#00D26A]' : 'text-[#8A8A8A]'}>
                  {formData.style.length}/20+ символов
                </span>
              </div>
            </div>
          )}

          {/* Step 7: AI Prompts */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-white text-lg">Промпты для AI-генерации</Label>
                  <p className="text-sm text-[#8A8A8A]">Настройте индивидуальные промпты для разных типов контента</p>
                </div>
                <Button
                  onClick={handleGenerateAllPrompts}
                  disabled={isLoading || !formData.style}
                  className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Сгенерировать все
                </Button>
              </div>

              {/* Промпт для постов */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white flex items-center gap-2">
                    <span className="text-[#6C63FF]">📝</span> Промпт для постов
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGeneratePostPrompt}
                    disabled={isLoading}
                    className="text-[#6C63FF] hover:text-[#6C63FF]/80"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Button>
                </div>
                <Textarea
                  value={formData.postPrompt}
                  onChange={(e) => setFormData({ ...formData, postPrompt: e.target.value })}
                  placeholder="Инструкции для генерации постов в Telegram/Instagram..."
                  className="min-h-[80px] bg-[#1E1F26] border-[#2A2B32] text-white text-sm"
                />
              </div>

              {/* Промпт для комментариев */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white flex items-center gap-2">
                    <span className="text-[#00D26A]">💬</span> Промпт для комментариев
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateCommentPrompt}
                    disabled={isLoading}
                    className="text-[#6C63FF] hover:text-[#6C63FF]/80"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Button>
                </div>
                <Textarea
                  value={formData.commentPrompt}
                  onChange={(e) => setFormData({ ...formData, commentPrompt: e.target.value })}
                  placeholder="Инструкции для генерации комментариев..."
                  className="min-h-[60px] bg-[#1E1F26] border-[#2A2B32] text-white text-sm"
                />
              </div>

              {/* Промпт для DM */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white flex items-center gap-2">
                    <span className="text-[#FFB800]">✉️</span> Промпт для Direct Messages
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDmPrompt}
                    disabled={isLoading}
                    className="text-[#6C63FF] hover:text-[#6C63FF]/80"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Button>
                </div>
                <Textarea
                  value={formData.dmPrompt}
                  onChange={(e) => setFormData({ ...formData, dmPrompt: e.target.value })}
                  placeholder="Инструкции для генерации личных сообщений..."
                  className="min-h-[60px] bg-[#1E1F26] border-[#2A2B32] text-white text-sm"
                />
              </div>

              {/* Промпт для сторис */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white flex items-center gap-2">
                    <span className="text-[#E4405F]">📱</span> Промпт для Stories
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateStoryPrompt}
                    disabled={isLoading}
                    className="text-[#6C63FF] hover:text-[#6C63FF]/80"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Button>
                </div>
                <Textarea
                  value={formData.storyPrompt}
                  onChange={(e) => setFormData({ ...formData, storyPrompt: e.target.value })}
                  placeholder="Инструкции для генерации сторис..."
                  className="min-h-[60px] bg-[#1E1F26] border-[#2A2B32] text-white text-sm"
                />
              </div>

              {/* Дополнительные настройки */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Тон общения</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(v) => setFormData({ ...formData, tone: v })}
                  >
                    <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32] text-white">
                      <SelectValue placeholder="Выберите тон" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                      <SelectItem value="friendly" className="text-white">Дружелюбный</SelectItem>
                      <SelectItem value="professional" className="text-white">Профессиональный</SelectItem>
                      <SelectItem value="playful" className="text-white">Игривый</SelectItem>
                      <SelectItem value="energetic" className="text-white">Энергичный</SelectItem>
                      <SelectItem value="calm" className="text-white">Спокойный</SelectItem>
                      <SelectItem value="mysterious" className="text-white">Загадочный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Типичные фразы</Label>
                  <Input
                    value={formData.phrases}
                    onChange={(e) => setFormData({ ...formData, phrases: e.target.value })}
                    placeholder="фраза1, фраза2, фраза3"
                    className="bg-[#1E1F26] border-[#2A2B32] text-white"
                  />
                </div>
              </div>

              {/* Запреты */}
              <div className="space-y-2">
                <Label className="text-white text-sm">Запретные темы/фразы</Label>
                <Textarea
                  value={formData.forbidden}
                  onChange={(e) => setFormData({ ...formData, forbidden: e.target.value })}
                  placeholder="Чего инфлюенсер НИКОГДА не скажет или не обсудит..."
                  className="min-h-[50px] bg-[#1E1F26] border-[#2A2B32] text-white text-sm"
                />
              </div>

              <div className="p-3 bg-[#1E1F26] rounded-lg border border-[#2A2B32]">
                <p className="text-xs text-[#8A8A8A]">
                  💡 Промпты используются AI для генерации контента. Можно оставить пустыми — будет использоваться общий стиль общения.
                </p>
              </div>
            </div>
          )}

          {/* Step 8: Complete */}
          {currentStep === 8 && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#00D26A]/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-[#00D26A]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isEditMode ? 'Готово к сохранению!' : 'Инфлюенсер готов к созданию!'}
                </h3>
                <p className="text-[#8A8A8A] mt-2">
                  {formData.name}, {formData.age} лет — {formData.role}
                </p>
              </div>

              <div className="flex justify-center gap-4 flex-wrap">
                <Badge className="bg-[#6C63FF]">{formData.gender === 'female' ? '👩' : '👨'} {formData.name}</Badge>
                <Badge variant="outline" className="border-[#FFB800] text-[#FFB800]">{formData.age} лет</Badge>
                <Badge variant="outline" className="border-[#00D26A] text-[#00D26A]">{formData.role}</Badge>
              </div>

              {formData.interests.length > 0 && (
                <div className="flex justify-center gap-2 flex-wrap">
                  {formData.interests.slice(0, 5).map((interest) => (
                    <Badge key={interest} variant="outline" className="border-[#2A2B32] text-[#8A8A8A]">
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-sm text-[#8A8A8A]">
                {isEditMode ? (
                  <>После сохранения изменения вступят в силу немедленно.</>
                ) : (
                  <>
                    После создания инфлюенсера вы сможете:<br/>
                    • Привязать SIM-карту и зарегистрировать Telegram<br/>
                    • Настроить кросспостинг в Instagram, TikTok, YouTube<br/>
                    • Запустить автоматическую генерацию контента
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t border-[#2A2B32]">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="text-[#8A8A8A] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
            >
              Далее
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-[#00D26A] hover:bg-[#00D26A]/80"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isEditMode ? 'Сохранить изменения' : 'Создать инфлюенсера'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
