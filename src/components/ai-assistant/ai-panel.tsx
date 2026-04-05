'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useModeStore } from '@/store/mode-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Bot, Send, Maximize2, Minimize2, X, 
  Copy, Check, Trash2, RotateCcw, Square,
  History, Bookmark, BookmarkCheck, Download,
  Settings, Mic, MicOff, Volume2, VolumeX,
  MessageSquare, Plus, Search, Edit2, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ==================== ТИПЫ ====================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  bookmarked?: boolean;
  edited?: boolean;
  regenerationOf?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model?: string;
  systemPrompt?: string;
}

interface Settings {
  model: string;
  temperature: number;
  systemPrompt: string;
}

interface CustomPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== КОНСТАНТЫ ====================

const MODELS = [
  { id: 'deepseek', name: 'DeepSeek', icon: '🧠' },
  { id: 'gpt-4', name: 'GPT-4', icon: '🤖' },
  { id: 'claude', name: 'Claude', icon: '🎭' },
];

const QUICK_PROMPTS = [
  { id: 'code', label: '💻 Код', prompt: 'Напиши пример кода на Python' },
  { id: 'explain', label: '📚 Объясни', prompt: 'Объясни простыми словами как работает blockchain' },
  { id: 'translate', label: '🌐 Переведи', prompt: 'Переведи на английский: Привет, как дела?' },
  { id: 'creative', label: '✨ Творчество', prompt: 'Напиши короткую историю о космосе' },
  { id: 'math', label: '🔢 Математика', prompt: 'Реши уравнение: x² + 5x + 6 = 0' },
  { id: 'help', label: '❓ Помощь', prompt: 'Что ты умеешь?' },
];

const DEFAULT_SYSTEM_PROMPT = `Ты — дружелюбный AI-ассистент DeepSeek.

Ты можешь обсуждать абсолютно любые темы:
- Программирование и технологии
- Наука, математика, физика
- История, философия, литература
- Бизнес, финансы, маркетинг
- Творчество, искусство, музыка
- Повседневные вопросы
- И абсолютно любые другие темы

Правила общения:
- Отвечай развернуто и полезно
- Будь дружелюбным и позитивным
- Используй эмодзи умеренно
- Форматируй списки через • или цифры
- Если что-то не знаешь — честно признай
- Давай примеры и пояснения

Отвечай на том языке, на котором задан вопрос.`;

// 20 предустановленных системных промптов
const SYSTEM_PROMPTS = [
  {
    id: 'default',
    name: '🎯 Стандартный',
    description: 'Универсальный помощник для любых задач',
    prompt: DEFAULT_SYSTEM_PROMPT,
  },
  {
    id: 'coder',
    name: '💻 Программист',
    description: 'Эксперт по программированию и коду',
    prompt: `Ты — опытный программист-эксперт. Твоя специализация:
- Написание чистого, эффективного и хорошо документированного кода
- Code review и оптимизация существующего кода
- Решение сложных алгоритмических задач
- Архитектурные решения и паттерны проектирования
- Debug и поиск ошибок

Правила:
- Всегда объясняй логику кода
- Предлагай альтернативные решения
- Указывай на потенциальные проблемы
- Используй best practices
- Добавляй комментарии к сложным участкам`,
  },
  {
    id: 'translator',
    name: '🌐 Переводчик',
    description: 'Профессиональный переводчик на любые языки',
    prompt: `Ты — профессиональный переводчик. Ты владеешь всеми языками мира на уровне носителя.

Правила перевода:
- Сохраняй стиль и тон оригинала
- Адаптируй идиомы и культурные особенности
- Предлагай несколько вариантов перевода когда уместно
- Объясняй сложные переводы
- Указывай на игру слов если есть
- Сохраняй форматирование оригинала`,
  },
  {
    id: 'writer',
    name: '✍️ Писатель',
    description: 'Творческий писатель для текстов и историй',
    prompt: `Ты — талантливый писатель и редактор. Ты можешь:
- Писать художественные произведения любых жанров
- Создавать увлекательные сюжеты и персонажей
- Редактировать и улучшать тексты
- Писать статьи, эссе, посты для соцсетей
- Создавать диалоги и сценарии

Стиль работы:
- Богатый словарный запас
- Живые метафоры и образы
- Грамотная структура повествования
- Умение держать внимание читателя`,
  },
  {
    id: 'teacher',
    name: '📚 Учитель',
    description: 'Педагог для объяснения сложных тем простым языком',
    prompt: `Ты — талантливый педагог. Твоя задача объяснять сложные темы простым языком.

Методика обучения:
- Разбивай сложное на простые части
- Используй аналогии из повседневной жизни
- Давай практические примеры
- Проверяй понимание вопросами
- Адаптируй уровень сложности под ученика
- Поощряй вопросы и любопытство

Формат объяснения:
1. Краткое введение в тему
2. Основная часть с примерами
3. Практическое применение
4. Резюме ключевых моментов`,
  },
  {
    id: 'analyst',
    name: '📊 Аналитик',
    description: 'Аналитик данных и бизнес-консультант',
    prompt: `Ты — бизнес-аналитик и эксперт по данным. Твои навыки:
- Анализ данных и выявление паттернов
- Бизнес-аналитика и стратегии
- Финансовое моделирование
- Исследование рынка
- Прогнозирование трендов

Подход к работе:
- Опирайся на факты и данные
- Структурируй информацию
- Давай конкретные рекомендации
- Оценивай риски и возможности
- Используй аналитические фреймворки`,
  },
  {
    id: 'scientist',
    name: '🔬 Учёный',
    description: 'Научный эксперт для исследований и объяснений',
    prompt: `Ты — учёный-исследователь. Твоя экспертиза охватывает:
- Физика, химия, биология
- Математика и статистика
- Научный метод и исследования
- Актуальные научные открытия

Принципы работы:
- Точность и научная корректность
- Объяснение через научные принципы
- Ссылки на исследования когда уместно
- Отделение фактов от гипотез
- Критическое мышление`,
  },
  {
    id: 'lawyer',
    name: '⚖️ Юрист',
    description: 'Юридический консультант и правовой эксперт',
    prompt: `Ты — юридический консультант. Твоя экспертиза:
- Гражданское и уголовное право
- Корпоративное право
- Договоры и соглашения
- Правовые процедуры

Правила работы:
- Разъясняй юридические термины простым языком
- Указывай на возможные риски
- Предлагай варианты решения проблем
- Напоминай о сроках и процедурах
- Рекомендуешь обратиться к специалисту для сложных случаев`,
  },
  {
    id: 'doctor',
    name: '🏥 Медик',
    description: 'Медицинский консультант для здоровья',
    prompt: `Ты — медицинский консультант. Твои знания:
- Анатомия и физиология
- Симптомы и диагностика
- Лечение и профилактика
- Здоровый образ жизни

ВАЖНО: Ты не заменяешь врача. Всегда рекомендуй обратиться к специалисту.

Правила:
- Давай общую информацию
- Объясняй медицинские термины
- Указывай когда нужен врач
- Не ставь диагнозы
- Не назначай лечение`,
  },
  {
    id: 'psychologist',
    name: '🧠 Психолог',
    description: 'Психолог для поддержки и саморазвития',
    prompt: `Ты — психолог-консультант. Твои компетенции:
- Эмоциональная поддержка
- Психологические техники
- Личностное развитие
- Отношения и коммуникация

Подход:
- Эмпатия и понимание
- Активное слушание
- Практические советы
- Техники самопомощи
- Рекомендация обратиться к специалисту при необходимости`,
  },
  {
    id: 'marketer',
    name: '📈 Маркетолог',
    description: 'Маркетинг и продвижение бизнеса',
    prompt: `Ты — маркетолог-эксперт. Твои навыки:
- Стратегический маркетинг
- Digital-маркетинг и SMM
- Контент-маркетинг
- Брендинг и позиционирование
- Аналитика и метрики

Подход:
- Практические рекомендации
- Кейсы и примеры
- Актуальные тренды
- Инструменты и сервисы
- KPI и измерение результатов`,
  },
  {
    id: 'seo',
    name: '🔍 SEO-специалист',
    description: 'SEO оптимизация и поисковое продвижение',
    prompt: `Ты — SEO-эксперт. Твоя экспертиза:
- Техническое SEO
- Контентная оптимизация
- Ссылочное продвижение
- Локальное SEO
- Аналитика и отчетность

Работа:
- Аудит сайтов
- Ключевые слова и семантика
- Оптимизация контента
- Структура сайта
- Инструменты: Google Search Console, Analytics, и др.`,
  },
  {
    id: 'designer',
    name: '🎨 Дизайнер',
    description: 'Дизайн и визуальные решения',
    prompt: `Ты — эксперт по дизайну. Твои навыки:
- UI/UX дизайн
- Графический дизайн
- Брендинг и айдентика
- Типографика и композиция
- Инструменты дизайна

Подход:
- Современные тренды
- Практические советы
- Критика и улучшение
- Теория дизайна
- Инструменты и ресурсы`,
  },
  {
    id: 'pm',
    name: '📋 Проджект-менеджер',
    description: 'Управление проектами и командой',
    prompt: `Ты — проджект-менеджер. Твои компетенции:
- Методологии: Agile, Scrum, Kanban
- Планирование и оценка
- Управление рисками
- Работа с командой
- Инструменты управления

Работа:
- Структурирование задач
- Приоритизация
- Дедлайны и планирование
- Коммуникация
- Метрики и KPI`,
  },
  {
    id: 'hr',
    name: '👥 HR-эксперт',
    description: 'Кадры, найм и развитие персонала',
    prompt: `Ты — HR-эксперт. Твои знания:
- Найм и подбор персонала
- Адаптация сотрудников
- Обучение и развитие
- Корпоративная культура
- Трудовое право

Работа:
- Описание вакансий
- Вопросы для собеседований
- Оценка кандидатов
- Мотивация и удержание
- HR-процессы`,
  },
  {
    id: 'sales',
    name: '💼 Продавец',
    description: 'Продажи и работа с клиентами',
    prompt: `Ты — эксперт по продажам. Твои навыки:
- Техники продаж
- Работа с возражениями
- Переговоры
- CRM и воронка продаж
- Клиентский сервис

Подход:
- Скрипты продаж
- Обработка возражений
- Закрытие сделок
- Up-sell и cross-sell
- Построение отношений`,
  },
  {
    id: 'finance',
    name: '💰 Финансист',
    description: 'Финансовое планирование и инвестиции',
    prompt: `Ты — финансовый консультант. Твои знания:
- Личные финансы
- Инвестирование
- Бюджетирование
- Налоги
- Банковские продукты

Работа:
- Финансовое планирование
- Анализ инвестиций
- Оптимизация расходов
- Выбор финансовых продуктов
- Риск-менеджмент`,
  },
  {
    id: 'fitness',
    name: '💪 Фитнес-тренер',
    description: 'Тренировки и здоровый образ жизни',
    prompt: `Ты — фитнес-тренер. Твои знания:
- Силовые тренировки
- Кардио и выносливость
- Гибкость и растяжка
- Питание и БЖУ
- Восстановление

Работа:
- Программы тренировок
- Техника упражнений
- Планы питания
- Мотивация
- Трекинг прогресса`,
  },
  {
    id: 'chef',
    name: '👨‍🍳 Шеф-повар',
    description: 'Кулинария и рецепты',
    prompt: `Ты — шеф-повар. Твои знания:
- Рецепты разных кухонь
- Техники приготовления
- Сочетание продуктов
- Презентация блюд
- Организация кухни

Работа:
- Рецепты с инструкциями
- Замена ингредиентов
- Советы по готовке
- Меню на разные случаи
- Кухонные лайфхаки`,
  },
  {
    id: 'travel',
    name: '✈️ Путешественник',
    description: 'Путешествия и туризм',
    prompt: `Ты — эксперт по путешествиям. Твои знания:
- Страны и города
- Достопримечательности
- Бюджетные путешествия
- Визы и документы
- Локальные особенности

Работа:
- Планирование маршрутов
- Советы по местам
- Бюджет и экономия
- Безопасность
- Культурные особенности`,
  },
];

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function AIAssistantPanel() {
  const {
    aiPanelOpen, aiPanelWidth, aiPanelExpanded,
    setAIPanelOpen, setAIPanelExpanded,
    getCachedResponse, cacheResponse,
  } = useModeStore();

  // Состояния
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // История чатов
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Редактирование
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  // Настройки
  const [settings, setSettings] = useState<Settings>({
    model: 'deepseek',
    temperature: 0.7,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // Пользовательские промпты
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [showAddPromptForm, setShowAddPromptForm] = useState(false);
  
  // Голосовые функции
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Черновик
  const [draft, setDraft] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Текущий чат
  const currentChat = chats.find(c => c.id === currentChatId);
  const messages = currentChat?.messages || [];

  // ==================== ЭФФЕКТЫ ====================

  // Загрузка данных из localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('ai-chats');
    const savedSettings = localStorage.getItem('ai-settings');
    const savedDraft = localStorage.getItem('ai-draft');
    const savedCustomPrompts = localStorage.getItem('ai-custom-prompts');

    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        setChats(parsed.map((c: Chat) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        })));
        if (parsed.length > 0) {
          setCurrentChatId(parsed[0].id);
        }
      } catch (e) {
        console.error('Error loading chats:', e);
      }
    }

    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }

    if (savedDraft) {
      setDraft(savedDraft);
      setInput(savedDraft);
    }

    if (savedCustomPrompts) {
      try {
        const parsed = JSON.parse(savedCustomPrompts);
        setCustomPrompts(parsed.map((p: CustomPrompt) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        })));
      } catch (e) {
        console.error('Error loading custom prompts:', e);
      }
    }
  }, []);

  // Сохранение в localStorage
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('ai-chats', JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('ai-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('ai-draft', input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem('ai-custom-prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);

  // Предзагрузка голосов для Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;

      // Функция загрузки голосов
      const loadVoices = () => {
        const voices = synth.getVoices();
        // Сохраняем в window для отладки
        (window as any).__ttsVoices = voices;
        return voices;
      };

      // Загружаем сразу
      loadVoices();

      // И при изменении списка голосов
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }

      // В Chrome иногда нужно вызвать resume при загрузке страницы
      const fixChrome = () => {
        if (synth.paused) {
          synth.resume();
        }
      };

      // Вызываем при visibility change
      document.addEventListener('visibilitychange', fixChrome);

      return () => {
        document.removeEventListener('visibilitychange', fixChrome);
      };
    }
  }, []);

  // Автопрокрутка
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, loading]);

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K - открыть/закрыть панель
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setAIPanelOpen(!aiPanelOpen);
      }
      // Ctrl+N - новый чат
      if (e.ctrlKey && e.key === 'n' && aiPanelOpen) {
        e.preventDefault();
        createNewChat();
      }
      // Ctrl+R - регенерация
      if (e.ctrlKey && e.key === 'r' && aiPanelOpen && messages.length > 0) {
        e.preventDefault();
        regenerateLastResponse();
      }
      // Escape - отмена генерации
      if (e.key === 'Escape' && loading) {
        stopGeneration();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aiPanelOpen, loading, messages]);

  // ==================== ФУНКЦИИ ====================

  // Создание нового чата
  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: settings.model,
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  }, [settings.model]);

  // Удаление чата
  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(chats.length > 1 ? chats.find(c => c.id !== chatId)?.id || null : null);
    }
  }, [currentChatId, chats]);

  // Обновление заголовка чата
  const updateChatTitle = useCallback((chatId: string, firstMessage: string) => {
    const title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
    setChats(prev => prev.map(c => 
      c.id === chatId ? { ...c, title, updatedAt: new Date() } : c
    ));
  }, []);

  // Отправка сообщения
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Создаём чат если нет
    let chatId = currentChatId;
    if (!chatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: 'Новый чат',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setChats(prev => [newChat, ...prev]);
      chatId = newChat.id;
      setCurrentChatId(chatId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    // Добавляем сообщение пользователя
    setChats(prev => prev.map(c => 
      c.id === chatId 
        ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() }
        : c
    ));

    // Обновляем заголовок если первое сообщение
    const currentMessages = chats.find(c => c.id === chatId)?.messages || [];
    if (currentMessages.length === 0) {
      updateChatTitle(chatId, input);
    }

    setInput('');
    setDraft('');
    setLoading(true);
    setStreamingContent('');

    // Проверяем кэш
    const cached = getCachedResponse(input, 'default');
    if (cached) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cached.response + '\n\n_📦 Из кэша_',
        timestamp: new Date(),
      };
      setChats(prev => prev.map(c => 
        c.id === chatId 
          ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
          : c
      ));
      setLoading(false);
      return;
    }

    // Создаём AbortController для возможности отмены
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input }
          ],
          temperature: settings.temperature,
          maxTokens: 2000,
          systemPrompt: settings.systemPrompt,
          model: settings.model,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // Проверяем, поддерживает ли ответ streaming
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/event-stream') || contentType?.includes('application/stream+json')) {
        // Streaming
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                }
              } catch (e) {
                // Игнорируем ошибки парсинга
              }
            }
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
        };

        setChats(prev => prev.map(c => 
          c.id === chatId 
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
            : c
        ));
        setStreamingContent('');

        // Кэшируем
        cacheResponse({
          key: `${input}|default`,
          prompt: input,
          context: 'default',
          response: fullContent,
          tokensUsed: 0,
          timestamp: new Date(),
        });

      } else {
        // Обычный ответ без streaming
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.result,
          timestamp: new Date(),
        };

        setChats(prev => prev.map(c => 
          c.id === chatId 
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
            : c
        ));

        cacheResponse({
          key: `${input}|default`,
          prompt: input,
          context: 'default',
          response: data.result,
          tokensUsed: data.usage?.tokens || 0,
          timestamp: new Date(),
        });
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Отменено пользователем
      } else {
        console.error('AI Chat error:', error);
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Ошибка подключения. Проверьте интернет и попробуйте снова.\n\nВаш вопрос: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`,
          timestamp: new Date(),
        };

        setChats(prev => prev.map(c => 
          c.id === chatId 
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date() }
            : c
        ));
      }
    }

    setLoading(false);
    setAbortController(null);
  };

  // Остановка генерации
  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
      setStreamingContent('');
    }
  };

  // Регенерация последнего ответа
  const regenerateLastResponse = async () => {
    if (messages.length < 2 || loading) return;

    // Находим последнее сообщение пользователя
    const lastUserIndex = messages.findLastIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;

    const lastUserMessage = messages[lastUserIndex];
    
    // Удаляем последний ответ ассистента
    setChats(prev => prev.map(c => {
      if (c.id !== currentChatId) return c;
      const newMessages = c.messages.slice(0, lastUserIndex + 1);
      return { ...c, messages: newMessages, updatedAt: new Date() };
    }));

    // Генерируем новый ответ
    setInput(lastUserMessage.content);
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  // Редактирование сообщения
  const startEditing = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    const messageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (messageIndex === -1) return;

    // Обновляем сообщение и удаляем все последующие
    setChats(prev => prev.map(c => {
      if (c.id !== currentChatId) return c;
      const newMessages = c.messages.slice(0, messageIndex);
      newMessages.push({
        ...c.messages[messageIndex],
        content: editContent,
        edited: true,
      });
      return { ...c, messages: newMessages, updatedAt: new Date() };
    }));

    setEditingMessageId(null);
    setEditContent('');
    
    // Генерируем новый ответ
    setInput(editContent);
    setTimeout(() => sendMessage(), 100);
  };

  // Закладки
  const toggleBookmark = (messageId: string) => {
    setChats(prev => prev.map(c => {
      if (c.id !== currentChatId) return c;
      return {
        ...c,
        messages: c.messages.map(m => 
          m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m
        ),
        updatedAt: new Date(),
      };
    }));
  };

  // Копирование
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Скопировано');
  };

  // Экспорт чата
  const exportChat = (format: 'md' | 'json' | 'txt') => {
    if (!currentChat) return;

    let content = '';
    const filename = `chat-${currentChatId}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(currentChat, null, 2);
    } else if (format === 'md') {
      content = `# ${currentChat.title}\n\n`;
      content += `*Создан: ${currentChat.createdAt.toLocaleString()}*\n\n---\n\n`;
      messages.forEach(m => {
        content += `## ${m.role === 'user' ? '👤 Вы' : '🤖 AI'}\n\n${m.content}\n\n`;
      });
    } else {
      content = `${currentChat.title}\n${'='.repeat(50)}\n\n`;
      messages.forEach(m => {
        content += `[${m.role === 'user' ? 'ВЫ' : 'AI'}]:\n${m.content}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Экспортировано в ${format.toUpperCase()}`);
  };

  // Голосовой ввод
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Голосовой ввод не поддерживается в этом браузере');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);

      // Обработка разных типов ошибок
      switch (event.error) {
        case 'network':
          toast.error('Нет связи с сервером распознавания речи. Проверьте интернет.');
          break;
        case 'not-allowed':
        case 'permission-denied':
          toast.error('Доступ к микрофону запрещён. Разрешите в настройках браузера.');
          break;
        case 'no-speech':
          // Не показываем ошибку - пользователь просто не говорил
          break;
        case 'aborted':
          // Пользователь отменил - не ошибка
          break;
        case 'audio-capture':
          toast.error('Микрофон не найден или недоступен.');
          break;
        case 'service-not-allowed':
          toast.error('Сервис распознавания речи недоступен.');
          break;
        default:
          // Только для реальных ошибок логируем
          if (event.error) {
            console.warn('Speech recognition:', event.error);
          }
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
  };

  // Озвучка ответа
  const speakText = (text: string) => {
    // Проверяем поддержку Speech Synthesis
    if (typeof window === 'undefined') {
      toast.error('Озвучка недоступна');
      return;
    }

    if (!('speechSynthesis' in window)) {
      toast.error('Ваш браузер не поддерживает озвучку');
      return;
    }

    const synth = window.speechSynthesis;

    // Если уже говорим — останавливаем
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    // Останавливаем любой предыдущий синтез
    synth.cancel();

    // Очищаем текст от markdown и спецсимволов
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      toast.error('Нет текста для озвучки');
      return;
    }

    // Получаем голоса
    let voices = synth.getVoices();

    const doSpeak = () => {
      voices = synth.getVoices();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Ищем русский голос
      const russianVoice = voices.find(v => v.lang === 'ru-RU') ||
                           voices.find(v => v.lang.startsWith('ru'));
      if (russianVoice) {
        utterance.voice = russianVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        setIsSpeaking(false);
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('TTS error:', e.error);
        }
      };

      // Фикс для Chrome - resume если paused
      if (synth.paused) {
        synth.resume();
      }

      synth.speak(utterance);

      // Фикс для Chrome - иногда speak не работает без этого
      // Периодически проверяем и резюмируем если нужно
      const keepAlive = setInterval(() => {
        if (!synth.speaking) {
          clearInterval(keepAlive);
          return;
        }
        if (synth.paused) {
          synth.resume();
        }
      }, 10000);

      // Очищаем интервал через 5 минут максимум
      setTimeout(() => clearInterval(keepAlive), 300000);
    };

    // Голоса могут загружаться асинхронно в некоторых браузерах
    if (voices.length === 0 && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = doSpeak;
      // Fallback - ждём немного и запускаем
      setTimeout(() => {
        if (!isSpeaking) {
          doSpeak();
        }
      }, 100);
    } else {
      doSpeak();
    }
  };

  // Очистка чата
  const clearCurrentChat = () => {
    setChats(prev => prev.map(c =>
      c.id === currentChatId
        ? { ...c, messages: [], title: 'Новый чат', updatedAt: new Date() }
        : c
    ));
  };

  // ==================== ФУНКЦИИ ПОЛЬЗОВАТЕЛЬСКИХ ПРОМПТОВ ====================

  // Добавление нового промпта
  const addCustomPrompt = () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) {
      toast.error('Заполните название и содержание промпта');
      return;
    }

    const newPrompt: CustomPrompt = {
      id: Date.now().toString(),
      name: newPromptName.trim(),
      description: newPromptDescription.trim() || 'Пользовательский промпт',
      prompt: newPromptContent.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setCustomPrompts(prev => [...prev, newPrompt]);
    setNewPromptName('');
    setNewPromptDescription('');
    setNewPromptContent('');
    setShowAddPromptForm(false);
    toast.success('Промпт добавлен');
  };

  // Удаление промпта
  const deleteCustomPrompt = (id: string) => {
    setCustomPrompts(prev => prev.filter(p => p.id !== id));
    if (editingPromptId === id) {
      setEditingPromptId(null);
    }
    toast.success('Промпт удалён');
  };

  // Начать редактирование промпта
  const startEditingPrompt = (prompt: CustomPrompt) => {
    setEditingPromptId(prompt.id);
    setNewPromptName(prompt.name);
    setNewPromptDescription(prompt.description);
    setNewPromptContent(prompt.prompt);
    setShowAddPromptForm(true);
  };

  // Сохранить отредактированный промпт
  const saveEditedPrompt = () => {
    if (!editingPromptId || !newPromptName.trim() || !newPromptContent.trim()) {
      toast.error('Заполните название и содержание промпта');
      return;
    }

    setCustomPrompts(prev => prev.map(p =>
      p.id === editingPromptId
        ? {
            ...p,
            name: newPromptName.trim(),
            description: newPromptDescription.trim() || 'Пользовательский промпт',
            prompt: newPromptContent.trim(),
            updatedAt: new Date(),
          }
        : p
    ));

    setEditingPromptId(null);
    setNewPromptName('');
    setNewPromptDescription('');
    setNewPromptContent('');
    setShowAddPromptForm(false);
    toast.success('Промпт обновлён');
  };

  // Отмена редактирования
  const cancelEditingPrompt = () => {
    setEditingPromptId(null);
    setNewPromptName('');
    setNewPromptDescription('');
    setNewPromptContent('');
    setShowAddPromptForm(false);
  };

  // Фильтрация чатов для поиска
  const filteredChats = chats.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ==================== РЕНДЕРИНГ ====================

  if (!aiPanelOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setAIPanelOpen(true)}
              className="fixed right-4 bottom-4 w-14 h-14 rounded-full bg-[#6C63FF] shadow-lg flex items-center justify-center hover:bg-[#6C63FF]/80 transition-all z-50 group"
            >
              <Bot className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#00D26A] rounded-full animate-pulse" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Открыть AI чат (Ctrl+K)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div 
      className={cn(
        'fixed right-0 top-0 h-full bg-[#14151A] border-l border-[#2A2B32] flex transition-all z-40',
        aiPanelExpanded ? 'w-full' : '',
        showHistory ? '' : ''
      )}
      style={{ width: aiPanelExpanded ? '100%' : `${aiPanelWidth + (showHistory ? 280 : 0)}px` }}
    >
      {/* Боковая панель истории */}
      {showHistory && (
        <div className="w-[280px] border-r border-[#2A2B32] flex flex-col bg-[#0D0E12]">
          <div className="p-4 border-b border-[#2A2B32] flex items-center justify-between">
            <h3 className="text-white font-medium flex items-center gap-2">
              <History className="w-4 h-4" />
              История
            </h3>
            <Button size="sm" onClick={createNewChat} className="h-8 bg-[#6C63FF]">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Поиск */}
          <div className="p-2 border-b border-[#2A2B32]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1E1F26] border border-[#2A2B32] rounded pl-8 pr-3 py-2 text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#6C63FF]"
              />
            </div>
          </div>
          
          {/* Список чатов */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setCurrentChatId(chat.id)}
                className={cn(
                  'p-3 cursor-pointer border-b border-[#2A2B32] hover:bg-[#1E1F26] transition-colors',
                  chat.id === currentChatId && 'bg-[#1E1F26] border-l-2 border-l-[#6C63FF]'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{chat.title}</p>
                    <p className="text-xs text-[#8A8A8A] mt-1">
                      {chat.messages.length} сообщений • {chat.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Основная панель */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2B32]">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-[#8A8A8A]"
                  >
                    {showHistory ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showHistory ? 'Скрыть историю' : 'Показать историю'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#6C63FF]" />
            </div>
            <div>
              <h3 className="text-white font-medium">DeepSeek AI</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#00D26A]/20 text-[#00D26A] text-xs">
                  <span className="w-1.5 h-1.5 bg-[#00D26A] rounded-full mr-1 animate-pulse" />
                  Безлимит
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Выбор модели */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#8A8A8A]">
                  <Sparkles className="w-4 h-4 mr-1" />
                  {MODELS.find(m => m.id === settings.model)?.name}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 bg-[#1E1F26] border-[#2A2B32]">
                <div className="space-y-1">
                  {MODELS.map(model => (
                    <Button
                      key={model.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSettings(s => ({ ...s, model: model.id }))}
                      className={cn(
                        'w-full justify-start text-[#8A8A8A] hover:text-white',
                        settings.model === model.id && 'text-white bg-[#6C63FF]/20'
                      )}
                    >
                      {model.icon} {model.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Настройки */}
            <Popover open={showSettings} onOpenChange={setShowSettings}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#8A8A8A]">
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] bg-[#1E1F26] border-[#2A2B32] max-h-[85vh] flex flex-col p-0">
                <div className="flex flex-col min-h-0 h-full">
                  {/* Заголовок */}
                  <div className="p-4 border-b border-[#2A2B32] flex-shrink-0">
                    <h4 className="text-white font-medium">Настройки AI</h4>
                  </div>

                  {/* Прокручиваемая область */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4
                    [&::-webkit-scrollbar]:w-2
                    [&::-webkit-scrollbar-track]:bg-[#14151A]
                    [&::-webkit-scrollbar-thumb]:bg-[#6C63FF]
                    [&::-webkit-scrollbar-thumb]:rounded-full"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#6C63FF #14151A' }}
                  >
                    {/* Температура */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8A8A8A]">Температура</span>
                        <span className="text-white">{settings.temperature}</span>
                      </div>
                      <Slider
                        value={[settings.temperature]}
                        min={0}
                        max={2}
                        step={0.1}
                        onValueChange={([v]) => setSettings(s => ({ ...s, temperature: v }))}
                      />
                      <p className="text-xs text-[#8A8A8A]">
                        Низкая = точность, Высокая = креативность
                      </p>
                    </div>

                    {/* Раздел: Стандартные промпты */}
                    <div className="space-y-2">
                      <span className="text-sm text-[#8A8A8A] font-medium">📚 Стандартные промпты (20)</span>
                      <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1
                        [&::-webkit-scrollbar]:w-1
                        [&::-webkit-scrollbar-track]:bg-[#14151A]
                        [&::-webkit-scrollbar-thumb]:bg-[#6C63FF]
                        [&::-webkit-scrollbar-thumb]:rounded-full"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#6C63FF #14151A' }}
                      >
                        {SYSTEM_PROMPTS.map((sp) => (
                          <button
                            key={sp.id}
                            onClick={() => setSettings(s => ({ ...s, systemPrompt: sp.prompt }))}
                            className={cn(
                              'w-full text-left p-2 rounded-lg transition-colors',
                              'hover:bg-[#2A2B32] border border-transparent',
                              settings.systemPrompt === sp.prompt && 'bg-[#6C63FF]/20 border-[#6C63FF]'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white">{sp.name}</span>
                              {settings.systemPrompt === sp.prompt && (
                                <Check className="w-4 h-4 text-[#6C63FF]" />
                              )}
                            </div>
                            <p className="text-xs text-[#8A8A8A] mt-0.5 truncate">{sp.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Раздел: Пользовательские промпты */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8A8A8A] font-medium">
                          ✨ Мои промпты ({customPrompts.length})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowAddPromptForm(true);
                            setEditingPromptId(null);
                            setNewPromptName('');
                            setNewPromptDescription('');
                            setNewPromptContent('');
                          }}
                          className="h-7 px-2 text-xs text-[#6C63FF] hover:text-white hover:bg-[#6C63FF]/20"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Добавить
                        </Button>
                      </div>

                      {customPrompts.length > 0 && (
                        <div className="max-h-[150px] overflow-y-auto space-y-1 pr-1
                          [&::-webkit-scrollbar]:w-1
                          [&::-webkit-scrollbar-track]:bg-[#14151A]
                          [&::-webkit-scrollbar-thumb]:bg-[#6C63FF]
                          [&::-webkit-scrollbar-thumb]:rounded-full"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#6C63FF #14151A' }}
                        >
                          {customPrompts.map((cp) => (
                            <div
                              key={cp.id}
                              className={cn(
                                'p-2 rounded-lg border transition-colors',
                                settings.systemPrompt === cp.prompt
                                  ? 'bg-[#6C63FF]/20 border-[#6C63FF]'
                                  : 'bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => setSettings(s => ({ ...s, systemPrompt: cp.prompt }))}
                                  className="flex-1 text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-white">{cp.name}</span>
                                    {settings.systemPrompt === cp.prompt && (
                                      <Check className="w-3 h-3 text-[#6C63FF]" />
                                    )}
                                  </div>
                                  <p className="text-xs text-[#8A8A8A] mt-0.5 truncate">{cp.description}</p>
                                </button>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingPrompt(cp)}
                                    className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-[#6C63FF]"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCustomPrompt(cp.id)}
                                    className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-red-500"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {customPrompts.length === 0 && !showAddPromptForm && (
                        <p className="text-xs text-[#8A8A8A] text-center py-2">
                          Нет пользовательских промптов
                        </p>
                      )}
                    </div>

                    {/* Форма добавления/редактирования промпта */}
                    {showAddPromptForm && (
                      <div className="space-y-3 p-3 bg-[#14151A] rounded-lg border border-[#2A2B32]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">
                            {editingPromptId ? '✏️ Редактировать промпт' : '➕ Новый промпт'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditingPrompt}
                            className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Название промпта *"
                            value={newPromptName}
                            onChange={(e) => setNewPromptName(e.target.value)}
                            className="w-full bg-[#0D0E12] border border-[#2A2B32] rounded px-3 py-2 text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#6C63FF]"
                          />
                          <input
                            type="text"
                            placeholder="Описание (необязательно)"
                            value={newPromptDescription}
                            onChange={(e) => setNewPromptDescription(e.target.value)}
                            className="w-full bg-[#0D0E12] border border-[#2A2B32] rounded px-3 py-2 text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-[#6C63FF]"
                          />
                          <Textarea
                            placeholder="Содержание промпта *"
                            value={newPromptContent}
                            onChange={(e) => setNewPromptContent(e.target.value)}
                            className="bg-[#0D0E12] border-[#2A2B32] text-white text-xs min-h-[100px] max-h-[200px]
                              [&::-webkit-scrollbar]:w-1.5
                              [&::-webkit-scrollbar-track]:bg-[#0D0E12]
                              [&::-webkit-scrollbar-thumb]:bg-[#6C63FF]
                              [&::-webkit-scrollbar-thumb]:rounded-full"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#6C63FF #0D0E12', overflowY: 'auto' }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={editingPromptId ? saveEditedPrompt : addCustomPrompt}
                            className="flex-1 bg-[#6C63FF] hover:bg-[#6C63FF]/80"
                          >
                            {editingPromptId ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Сохранить
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Добавить
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditingPrompt}
                            className="border-[#2A2B32] text-[#8A8A8A]"
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Редактор текущего промпта */}
                    <div className="space-y-2 pt-2 border-t border-[#2A2B32]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8A8A8A]">📝 Редактировать текущий:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSettings(s => ({ ...s, systemPrompt: DEFAULT_SYSTEM_PROMPT }))}
                          className="h-6 px-2 text-xs text-[#8A8A8A] hover:text-white"
                        >
                          Сбросить
                        </Button>
                      </div>
                      <Textarea
                        value={settings.systemPrompt}
                        onChange={(e) => setSettings(s => ({ ...s, systemPrompt: e.target.value }))}
                        className="bg-[#14151A] border-[#2A2B32] text-white text-xs min-h-[150px] max-h-[300px]
                          [&::-webkit-scrollbar]:w-2
                          [&::-webkit-scrollbar-track]:bg-[#14151A]
                          [&::-webkit-scrollbar-thumb]:bg-[#6C63FF]
                          [&::-webkit-scrollbar-thumb]:rounded-full"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#6C63FF #14151A', overflowY: 'auto' }}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button variant="ghost" size="sm" onClick={() => setAIPanelExpanded(!aiPanelExpanded)} className="text-[#8A8A8A]">
              {aiPanelExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAIPanelOpen(false)} className="text-[#8A8A8A]">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-2 border-b border-[#2A2B32] flex gap-1 flex-wrap">
          {QUICK_PROMPTS.map((qp) => (
            <Button
              key={qp.id}
              variant="outline"
              size="sm"
              onClick={() => setInput(qp.prompt)}
              className="h-7 text-xs border-[#2A2B32] text-[#8A8A8A] hover:text-white"
            >
              {qp.label}
            </Button>
          ))}
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1E1F26] [&::-webkit-scrollbar-thumb]:bg-[#6C63FF] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#8B7FFF]"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#6C63FF #1E1F26' }}
        >
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 mx-auto text-[#6C63FF] mb-4" />
              <h4 className="text-white font-medium mb-2">Привет! Чем могу помочь?</h4>
              <p className="text-sm text-[#8A8A8A] mb-4">
                Спроси меня о чём угодно — я отвечу!
              </p>
              <div className="space-y-2 text-left max-w-[280px] mx-auto">
                <div className="p-3 bg-[#1E1F26] rounded-lg text-sm text-[#8A8A8A]">
                  💡 "Напиши код на Python"
                </div>
                <div className="p-3 bg-[#1E1F26] rounded-lg text-sm text-[#8A8A8A]">
                  💡 "Объясни квантовую физику"
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3 rounded-lg group',
                    msg.role === 'user' 
                      ? 'bg-[#6C63FF]/20 ml-4' 
                      : 'bg-[#1E1F26] mr-4'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {msg.role === 'assistant' && (
                      <Bot className="w-5 h-5 text-[#6C63FF] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Редактирование */}
                      {editingMessageId === msg.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-[#0D0E12] border-[#2A2B32] text-white min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEdit} className="bg-[#00D26A]">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Сохранить
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingMessageId(null)} className="border-[#2A2B32]">
                              <XCircle className="w-4 h-4 mr-1" />
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Markdown рендеринг */}
                          <div className="text-sm text-white prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                code({ className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeString = String(children).replace(/\n$/, '');
                                  
                                  if (match) {
                                    return (
                                      <div className="relative group/code">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => copyToClipboard(codeString, `code-${msg.id}`)}
                                          className="absolute top-2 right-2 h-6 px-2 bg-[#2A2B32]/80 opacity-0 group-hover/code:opacity-100 transition-opacity"
                                        >
                                          {copiedId === `code-${msg.id}` ? (
                                            <Check className="w-3 h-3 text-[#00D26A]" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </Button>
                                        <SyntaxHighlighter
                                          style={vscDarkPlus}
                                          language={match[1]}
                                          PreTag="div"
                                          customStyle={{ 
                                            margin: 0, 
                                            borderRadius: '8px',
                                            fontSize: '13px'
                                          }}
                                        >
                                          {codeString}
                                        </SyntaxHighlighter>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <code className="bg-[#2A2B32] px-1.5 py-0.5 rounded text-[#FF79C6]" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-bold text-[#6C63FF]">{children}</strong>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-2 border-[#6C63FF] pl-3 italic text-[#8A8A8A]">
                                    {children}
                                  </blockquote>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                          
                          {msg.edited && (
                            <span className="text-xs text-[#8A8A8A] italic">(ред.)</span>
                          )}
                          
                          {/* Кнопки действий */}
                          {msg.role === 'assistant' && (
                            <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(msg.content, msg.id)}
                                      className="h-6 px-2 text-xs text-[#8A8A8A]"
                                    >
                                      {copiedId === msg.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                      Копировать
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Копировать ответ</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => regenerateLastResponse()}
                                      className="h-6 px-2 text-xs text-[#8A8A8A]"
                                    >
                                      <RotateCcw className="w-3 h-3 mr-1" />
                                      Регенерировать
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Сгенерировать новый ответ (Ctrl+R)</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => speakText(msg.content)}
                                      className="h-6 px-2 text-xs text-[#8A8A8A]"
                                    >
                                      {isSpeaking ? <VolumeX className="w-3 h-3 mr-1" /> : <Volume2 className="w-3 h-3 mr-1" />}
                                      {isSpeaking ? 'Стоп' : 'Озвучить'}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Озвучить ответ</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleBookmark(msg.id)}
                                      className="h-6 px-2 text-xs text-[#8A8A8A]"
                                    >
                                      {msg.bookmarked ? (
                                        <BookmarkCheck className="w-3 h-3 mr-1 text-[#FFD700]" />
                                      ) : (
                                        <Bookmark className="w-3 h-3 mr-1" />
                                      )}
                                      {msg.bookmarked ? 'В закладках' : 'В закладки'}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Сохранить в закладки</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                          
                          {/* Кнопки для сообщений пользователя */}
                          {msg.role === 'user' && (
                            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(msg.id, msg.content)}
                                className="h-6 px-2 text-xs text-[#8A8A8A]"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Редактировать
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Streaming контент */}
              {loading && streamingContent && (
                <div className="p-3 rounded-lg bg-[#1E1F26] mr-4">
                  <div className="flex items-start gap-2">
                    <Bot className="w-5 h-5 text-[#6C63FF] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Индикатор загрузки */}
              {loading && !streamingContent && (
                <div className="flex items-center gap-2 p-3 bg-[#1E1F26] rounded-lg mr-4">
                  <Bot className="w-5 h-5 text-[#6C63FF] animate-pulse" />
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#2A2B32]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Спросите AI... (Shift+Enter для новой строки)"
                className="bg-[#1E1F26] border-[#2A2B32] text-white min-h-[44px] max-h-[200px] resize-none pr-20"
                disabled={loading}
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleVoiceInput}
                        className={cn(
                          'h-8 w-8 p-0 text-[#8A8A8A]',
                          isRecording && 'text-red-500 animate-pulse'
                        )}
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRecording ? 'Остановить запись' : 'Голосовой ввод'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {loading ? (
              <Button onClick={stopGeneration} className="bg-red-500 hover:bg-red-600 h-11">
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={sendMessage} disabled={!input.trim()} className="bg-[#6C63FF] h-11">
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={createNewChat} className="h-6 text-xs text-[#8A8A8A]">
                      <Plus className="w-3 h-3 mr-1" />
                      Новый чат
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Создать новый чат (Ctrl+N)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-[#8A8A8A]">
                    <Download className="w-3 h-3 mr-1" />
                    Экспорт
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 bg-[#1E1F26] border-[#2A2B32]">
                  <div className="space-y-1">
                    <Button variant="ghost" size="sm" onClick={() => exportChat('md')} className="w-full justify-start text-[#8A8A8A]">
                      📄 Markdown
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => exportChat('json')} className="w-full justify-start text-[#8A8A8A]">
                      📋 JSON
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => exportChat('txt')} className="w-full justify-start text-[#8A8A8A]">
                      📝 TXT
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex gap-1">
              <span className="text-xs text-[#8A8A8A]">Ctrl+K закрыть</span>
              <Button variant="ghost" size="sm" onClick={clearCurrentChat} className="h-6 text-xs text-[#8A8A8A]">
                <Trash2 className="w-3 h-3 mr-1" />
                Очистить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Label компонент
function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={cn('text-sm font-medium', className)}>{children}</label>;
}
