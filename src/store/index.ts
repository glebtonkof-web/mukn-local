import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Типы данных
export interface Influencer {
  id: string;
  name: string;
  age: number;
  gender: string;
  niche: string;
  role: string;
  style: string;
  country: string;
  avatarUrl?: string;
  status: string;
  telegramUsername?: string;
  telegramChannel?: string;
  instagramUsername?: string;
  tiktokUsername?: string;
  youtubeChannelId?: string;
  subscribersCount: number;
  postsCount: number;
  leadsCount: number;
  revenue: number;
  banRisk: number;
  predictedLifeDays?: number;
  // AI Промпты для генерации контента
  postPrompt?: string;
  commentPrompt?: string;
  dmPrompt?: string;
  storyPrompt?: string;
  greetingPrompt?: string;
  tone?: string;
  phrases?: string;
  forbidden?: string;
  personality?: string;
  interests?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  platform: string;
  username?: string;
  phone?: string;
  status: string;
  banRisk: number;
  warmingProgress: number;
  dailyComments: number;
  dailyDm: number;
  maxComments: number;
  maxDm: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  niche?: string;
  geo?: string;
  status: string;
  budget: number;
  spent: number;
  leadsCount: number;
  revenue: number;
  influencerCount: number;
}

export interface DashboardStats {
  totalInfluencers: number;
  activeInfluencers: number;
  totalAccounts: number;
  activeAccounts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  totalRevenue: number;
  totalSpent: number;
  avgBanRisk: number;
}

export interface Notification {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  lastUsedAt?: string;
}

export interface SimCard {
  id: string;
  phoneNumber: string;
  operator?: string;
  country: string;
  status: 'available' | 'in_use' | 'blocked';
}

export interface Offer {
  id: string;
  name: string;
  network?: string;
  affiliateLink: string;
  niche?: string;
  geo?: string;
  payout: number;
  currency: string;
  status: string;
  clicks: number;
  leads: number;
  revenue: number;
}

// New types for content calendar
export interface ScheduledPost {
  id: string;
  influencerId: string;
  influencerName: string;
  platform: 'telegram' | 'instagram' | 'tiktok' | 'youtube';
  title: string;
  content: string;
  scheduledAt: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'carousel';
}

// New types for warming
export interface WarmingAccount {
  id: string;
  username: string;
  platform: string;
  avatarUrl?: string;
  status: 'warming' | 'paused' | 'completed' | 'error';
  warmingMode: 'fast' | 'standard' | 'maximum' | 'premium';
  progress: number;
  startedAt: Date;
  estimatedEnd: Date;
  daysRemaining: number;
  totalDays: number;
  dailyActions: {
    comments: number;
    dm: number;
    follows: number;
    likes: number;
  };
  maxActions: {
    comments: number;
    dm: number;
    follows: number;
    likes: number;
  };
  alerts: WarmingAlert[];
}

export interface WarmingAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

// New types for image generation
export interface GeneratedImage {
  id: string;
  imageData: string;
  prompt: string;
  size: string;
  style: string;
  createdAt: Date;
  influencerId?: string;
}

// Settings type
export interface AppSettings {
  deepseekApiKey: string;
  replicateApiKey: string;
  telegramApiId: string;
  telegramApiHash: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  criticalAlerts: boolean;
  autoBackup: boolean;
  language: string;
  timezone: string;
}

// Состояние приложения
interface AppState {
  // Навигация
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Инфлюенсеры
  influencers: Influencer[];
  selectedInfluencer: Influencer | null;
  setInfluencers: (influencers: Influencer[]) => void;
  addInfluencer: (influencer: Influencer) => void;
  updateInfluencer: (id: string, data: Partial<Influencer>) => void;
  removeInfluencer: (id: string) => void;
  selectInfluencer: (influencer: Influencer | null) => void;
  
  // Аккаунты
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  
  // Кампании
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  setCampaigns: (campaigns: Campaign[]) => void;
  selectCampaign: (campaign: Campaign | null) => void;
  
  // Офферы
  offers: Offer[];
  setOffers: (offers: Offer[]) => void;
  
  // SIM-карты
  simCards: SimCard[];
  setSimCards: (simCards: SimCard[]) => void;
  
  // API ключи
  apiKeys: ApiKey[];
  setApiKeys: (keys: ApiKey[]) => void;
  
  // Статистика дашборда
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats) => void;
  
  // Уведомления
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Модальные окна
  createInfluencerOpen: boolean;
  setCreateInfluencerOpen: (open: boolean) => void;
  editingInfluencer: Influencer | null;
  setEditingInfluencer: (influencer: Influencer | null) => void;
  createCampaignOpen: boolean;
  setCreateCampaignOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  imageGeneratorOpen: boolean;
  setImageGeneratorOpen: (open: boolean) => void;
  
  // Scheduled posts
  scheduledPosts: ScheduledPost[];
  setScheduledPosts: (posts: ScheduledPost[]) => void;
  addScheduledPost: (post: ScheduledPost) => void;
  updateScheduledPost: (id: string, data: Partial<ScheduledPost>) => void;
  removeScheduledPost: (id: string) => void;
  
  // Warming accounts
  warmingAccounts: WarmingAccount[];
  setWarmingAccounts: (accounts: WarmingAccount[]) => void;
  
  // Generated images gallery
  generatedImages: GeneratedImage[];
  addGeneratedImage: (image: GeneratedImage) => void;
  removeGeneratedImage: (id: string) => void;
  
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Загрузка
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Ошибки
  error: string | null;
  setError: (error: string | null) => void;
  
  // Real-time
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Навигация
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Инфлюенсеры
      influencers: [],
      selectedInfluencer: null,
      setInfluencers: (influencers) => set({ influencers }),
      addInfluencer: (influencer) => set((state) => ({
        influencers: [influencer, ...state.influencers]
      })),
      updateInfluencer: (id, data) => set((state) => ({
        influencers: state.influencers.map((i) =>
          i.id === id ? { ...i, ...data } : i
        )
      })),
      removeInfluencer: (id) => set((state) => ({
        influencers: state.influencers.filter((i) => i.id !== id)
      })),
      selectInfluencer: (influencer) => set({ selectedInfluencer: influencer }),
      
      // Аккаунты
      accounts: [],
      setAccounts: (accounts) => set({ accounts }),
      
      // Кампании
      campaigns: [],
      selectedCampaign: null,
      setCampaigns: (campaigns) => set({ campaigns }),
      selectCampaign: (campaign) => set({ selectedCampaign: campaign }),
      
      // Офферы
      offers: [],
      setOffers: (offers) => set({ offers }),
      
      // SIM-карты
      simCards: [],
      setSimCards: (simCards) => set({ simCards }),
      
      // API ключи
      apiKeys: [],
      setApiKeys: (apiKeys) => set({ apiKeys }),
      
      // Статистика
      dashboardStats: null,
      setDashboardStats: (stats) => set({ dashboardStats: stats }),
      
      // Уведомления
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, 100) // Храним последние 100
      })),
      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        )
      })),
      clearNotifications: () => set({ notifications: [] }),
      
      // Модальные окна
      createInfluencerOpen: false,
      setCreateInfluencerOpen: (open) => set({ createInfluencerOpen: open }),
      editingInfluencer: null,
      setEditingInfluencer: (influencer) => set({ editingInfluencer: influencer }),
      createCampaignOpen: false,
      setCreateCampaignOpen: (open) => set({ createCampaignOpen: open }),
      settingsOpen: false,
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      imageGeneratorOpen: false,
      setImageGeneratorOpen: (open) => set({ imageGeneratorOpen: open }),
      
      // Scheduled posts
      scheduledPosts: [],
      setScheduledPosts: (posts) => set({ scheduledPosts: posts }),
      addScheduledPost: (post) => set((state) => ({
        scheduledPosts: [...state.scheduledPosts, post]
      })),
      updateScheduledPost: (id, data) => set((state) => ({
        scheduledPosts: state.scheduledPosts.map((p) =>
          p.id === id ? { ...p, ...data } : p
        )
      })),
      removeScheduledPost: (id) => set((state) => ({
        scheduledPosts: state.scheduledPosts.filter((p) => p.id !== id)
      })),
      
      // Warming accounts
      warmingAccounts: [],
      setWarmingAccounts: (accounts) => set({ warmingAccounts: accounts }),
      
      // Generated images
      generatedImages: [],
      addGeneratedImage: (image) => set((state) => ({
        generatedImages: [image, ...state.generatedImages].slice(0, 50)
      })),
      removeGeneratedImage: (id) => set((state) => ({
        generatedImages: state.generatedImages.filter((i) => i.id !== id)
      })),
      
      // Settings
      settings: {
        deepseekApiKey: '',
        replicateApiKey: '',
        telegramApiId: '',
        telegramApiHash: '',
        notificationsEnabled: true,
        emailNotifications: false,
        criticalAlerts: true,
        autoBackup: true,
        language: 'ru',
        timezone: 'Europe/Moscow',
      },
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      // Загрузка
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      // Ошибки
      error: null,
      setError: (error) => set({ error }),
      
      // Real-time
      isConnected: false,
      setConnected: (connected) => set({ isConnected: connected }),
    }),
    {
      name: 'mukn-traffic-store',
      partialize: (state) => ({
        activeTab: state.activeTab,
        notifications: state.notifications,
        settings: state.settings,
      }),
    }
  )
);
