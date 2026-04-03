// Хук для загрузки данных из API
import { useState, useEffect, useCallback } from 'react';
import { useAppStore, type Influencer, type Account, type Campaign, type Offer, type SimCard } from '@/store';

interface DashboardData {
  overview: {
    totalRevenue: number;
    totalSpent: number;
    totalLeads: number;
    roi: string;
  };
  influencerStats: {
    total: number;
    active: number;
    warming: number;
    paused: number;
    banned: number;
    totalSubscribers: number;
    totalLeads: number;
    totalRevenue: number;
    avgBanRisk: number;
  };
  accountStats: {
    total: number;
    active: number;
    warming: number;
    banned: number;
    limited: number;
    flood: number;
    byPlatform: Record<string, number>;
  };
  campaignStats: {
    total: number;
    active: number;
    draft: number;
    completed: number;
    totalBudget: number;
    totalSpent: number;
    totalLeads: number;
    totalRevenue: number;
  };
  offerStats: {
    total: number;
    active: number;
    totalClicks: number;
    totalLeads: number;
    totalConversions: number;
    totalRevenue: number;
  };
  simCardStats: {
    total: number;
    available: number;
    inUse: number;
    blocked: number;
    limit: number;
  };
  topInfluencers: Array<{
    id: string;
    name: string;
    niche: string;
    revenue: number;
    leads: number;
    banRisk: number;
    status: string;
  }>;
  highRiskAccounts: Array<{
    id: string;
    platform: string;
    username?: string;
    phone?: string;
    banRisk: number;
    status: string;
  }>;
  activity: Array<{
    id: string;
    type: string;
    target?: string;
    result?: string;
    error?: string;
    createdAt: Date;
    platform?: string;
  }>;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useInfluencers() {
  const { influencers, setInfluencers, addInfluencer, updateInfluencer, removeInfluencer } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfluencers = useCallback(async (filters?: { status?: string; niche?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.niche) params.append('niche', filters.niche);

      const response = await fetch(`/api/influencers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch influencers');
      const result = await response.json();
      setInfluencers(result.influencers.map((i: any) => ({
        id: i.id,
        name: i.name,
        age: i.age,
        gender: i.gender,
        niche: i.niche,
        role: i.role,
        style: i.style,
        country: i.country,
        avatarUrl: i.avatarUrl,
        status: i.status,
        telegramUsername: i.telegramUsername,
        telegramChannel: i.telegramChannel,
        instagramUsername: i.instagramUsername,
        tiktokUsername: i.tiktokUsername,
        youtubeChannelId: i.youtubeChannelId,
        subscribersCount: i.subscribersCount ?? 0,
        postsCount: i.postsCount ?? 0,
        leadsCount: i.leadsCount ?? 0,
        revenue: i.revenue ?? 0,
        banRisk: i.banRisk ?? 0,
        predictedLifeDays: i.predictedLifeDays,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [setInfluencers]);

  const createInfluencer = useCallback(async (data: Partial<Influencer>) => {
    try {
      const response = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create influencer');
      const result = await response.json();
      // Используем полные данные от API, включая дефолтные значения
      const newInfluencer: Influencer = {
        id: result.influencer.id,
        name: result.influencer.name,
        age: result.influencer.age,
        gender: result.influencer.gender,
        niche: result.influencer.niche,
        role: result.influencer.role,
        style: result.influencer.style,
        country: result.influencer.country,
        avatarUrl: result.influencer.avatarUrl,
        status: result.influencer.status,
        telegramUsername: result.influencer.telegramUsername,
        telegramChannel: result.influencer.telegramChannel,
        instagramUsername: result.influencer.instagramUsername,
        tiktokUsername: result.influencer.tiktokUsername,
        youtubeChannelId: result.influencer.youtubeChannelId,
        subscribersCount: result.influencer.subscribersCount ?? 0,
        postsCount: result.influencer.postsCount ?? 0,
        leadsCount: result.influencer.leadsCount ?? 0,
        revenue: result.influencer.revenue ?? 0,
        banRisk: result.influencer.banRisk ?? 0,
        predictedLifeDays: result.influencer.predictedLifeDays,
        createdAt: result.influencer.createdAt,
        updatedAt: result.influencer.updatedAt,
      };
      addInfluencer(newInfluencer);
      return result.influencer;
    } catch (e) {
      throw e;
    }
  }, [addInfluencer]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  const updateInfluencerFromHook = useCallback(async (id: string, data: Partial<Influencer>) => {
    try {
      const response = await fetch(`/api/influencers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update influencer');
      const result = await response.json();
      updateInfluencer(id, data);
      return result.influencer;
    } catch (e) {
      throw e;
    }
  }, [updateInfluencer]);

  return {
    influencers,
    loading,
    error,
    refetch: fetchInfluencers,
    createInfluencer,
    updateInfluencer: updateInfluencerFromHook,
  };
}

export function useAccounts() {
  const { accounts, setAccounts } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async (filters?: { status?: string; platform?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.platform) params.append('platform', filters.platform);

      const response = await fetch(`/api/accounts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const result = await response.json();
      setAccounts(result.accounts.map((a: any) => ({
        id: a.id,
        platform: a.platform,
        username: a.username,
        phone: a.phone,
        status: a.status,
        banRisk: a.banRisk,
        warmingProgress: a.warmingProgress,
        dailyComments: a.dailyComments,
        dailyDm: a.dailyDm,
        maxComments: a.maxComments,
        maxDm: a.maxDm,
      })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [setAccounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts };
}

export function useSimCards() {
  const { simCards, setSimCards } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimCards = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const response = await fetch(`/api/sim-cards${params}`);
      if (!response.ok) throw new Error('Failed to fetch SIM cards');
      const result = await response.json();
      setSimCards(result.simCards.map((s: any) => ({
        id: s.id,
        phoneNumber: s.phoneNumber,
        operator: s.operator,
        country: s.country,
        status: s.status,
      })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [setSimCards]);

  useEffect(() => {
    fetchSimCards();
  }, [fetchSimCards]);

  return { simCards, loading, error, refetch: fetchSimCards };
}

export function useOffers() {
  const { offers, setOffers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/offers');
      if (!response.ok) throw new Error('Failed to fetch offers');
      const result = await response.json();
      setOffers(result.offers.map((o: any) => ({
        id: o.id,
        name: o.name,
        network: o.network,
        affiliateLink: o.affiliateLink,
        niche: o.niche,
        geo: o.geo,
        payout: o.payout,
        currency: o.currency,
        status: o.status,
        clicks: o.clicks,
        leads: o.leads,
        revenue: o.revenue,
      })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [setOffers]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  return { offers, loading, error, refetch: fetchOffers };
}

export function useCampaigns() {
  const { campaigns, setCampaigns } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const result = await response.json();
      setCampaigns(result.campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        niche: c.niche,
        geo: c.geo,
        status: c.status,
        budget: c.budget,
        spent: c.spent,
        leadsCount: c.leadsCount,
        revenue: c.revenue,
        influencerCount: c.influencers?.length || 0,
      })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [setCampaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return { campaigns, loading, error, refetch: fetchCampaigns };
}

// Хук для генерации контента через DeepSeek
export function useAIGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContent = useCallback(async (
    type: 'post' | 'comment' | 'dm' | 'story' | 'style' | 'bio' | 'name' | 'greeting',
    context: {
      influencerName?: string;
      influencerAge?: number;
      influencerRole?: string;
      influencerStyle?: string;
      niche?: string;
      platform?: string;
      topic?: string;
      gender?: string;
      tone?: string;
      personality?: string[];
      interests?: string[];
      customPrompt?: string;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          prompt: '', // Промпт генерируется автоматически
          context,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate content');
      const result = await response.json();
      return result.result as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generateContent, loading, error };
}

// Интерфейсы для новых хуков
export interface DashboardMetrics {
  totalInfluencers: number;
  activeInfluencers: number;
  warmingInfluencers: number;
  pausedInfluencers: number;
  bannedInfluencers: number;
  totalSubscribers: number;
  totalLeads: number;
  totalRevenue: number;
  avgBanRisk: number;
  totalAccounts: number;
  activeAccounts: number;
  warmingAccounts: number;
  bannedAccounts: number;
  limitedAccounts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpent: number;
  campaignRevenue: number;
  monthlyRevenue: number;
  monthlyLeads: number;
  roi: number;
  totalSimCards: number;
  availableSimCards: number;
  inUseSimCards: number;
}

export interface DashboardEvent {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  entityType?: string;
  entityId?: string;
}

export interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
}

export interface ChartSummary {
  total: number;
  change: number | string;
  metric: string;
  days: number;
}

// Хук для метрик дашборда
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const result = await response.json();
      setMetrics(result.metrics);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Каждую минуту
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

// Хук для событий дашборда
export function useDashboardEvents(limit: number = 20) {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/events?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const result = await response.json();
      setEvents(result.events.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Каждые 30 секунд
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

// Хук для данных графика
export function useDashboardChart(days: number = 7, metric: 'subscribers' | 'revenue' | 'leads' = 'subscribers') {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [summary, setSummary] = useState<ChartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/chart?days=${days}&metric=${metric}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      const result = await response.json();
      setChartData(result.chartData);
      setSummary(result.summary);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [days, metric]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  return { chartData, summary, loading, error, refetch: fetchChart };
}
