/**
 * API Client with SWR caching for МУКН | Трафик
 * Provides real data fetching with caching, error handling, and loading states
 */

import useSWR, { SWRConfiguration, mutate } from 'swr';

// Base API URL
const API_BASE = '/api';

// Generic fetcher with error handling
async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// POST/PUT/DELETE fetcher
async function apiRequest<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// ==================== Types ====================

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
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  platform: string;
  username?: string;
  phone?: string;
  email?: string;
  status: string;
  banRisk: number;
  warmingProgress: number;
  dailyComments: number;
  dailyDm: number;
  dailyFollows: number;
  dailyLikes: number;
  maxComments: number;
  maxDm: number;
  maxFollows: number;
  proxyHost?: string;
  proxyPort?: number;
  banReason?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  niche?: string;
  geo?: string;
  status: string;
  budget: number;
  spent: number;
  currency: string;
  leadsCount: number;
  conversions: number;
  revenue: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  influencers?: { influencerId: string }[];
}

export interface Offer {
  id: string;
  name: string;
  description?: string;
  network?: string;
  networkOfferId?: string;
  affiliateLink: string;
  niche?: string;
  geo?: string;
  payout: number;
  currency: string;
  status: string;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface SimCard {
  id: string;
  phoneNumber: string;
  operator?: string;
  country: string;
  status: string;
  telegramAccountId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
  user?: {
    id: string;
    name?: string;
    email: string;
  };
}

export interface Notification {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface DashboardEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
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

// ==================== Dashboard Hooks ====================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 3,
};

export function useDashboardMetrics() {
  const { data, error, isLoading, mutate } = useSWR<{ metrics: DashboardMetrics }>(
    `${API_BASE}/dashboard/metrics`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    metrics: data?.metrics ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  };
}

export function useDashboardEvents(limit: number = 20) {
  const { data, error, isLoading, mutate } = useSWR<{ events: DashboardEvent[] }>(
    `${API_BASE}/dashboard/events?limit=${limit}`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    events: data?.events ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  };
}

export function useDashboardChart(
  days: number = 7,
  metric: 'subscribers' | 'revenue' | 'leads' = 'subscribers'
) {
  const { data, error, isLoading, mutate } = useSWR<{
    chartData: ChartDataPoint[];
    summary: ChartSummary;
  }>(
    `${API_BASE}/dashboard/chart?days=${days}&metric=${metric}`,
    fetcher,
    defaultConfig
  );

  return {
    chartData: data?.chartData ?? [],
    summary: data?.summary ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  };
}

export function useDashboardKPI() {
  const { data, error, isLoading, mutate } = useSWR<{
    kpi: Array<{
      title: string;
      value: string | number;
      change?: number;
      icon: string;
      color: string;
    }>;
  }>(
    `${API_BASE}/dashboard/kpi`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 60000,
    }
  );

  return {
    kpiData: data?.kpi ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  };
}

// ==================== Influencers Hooks ====================

export function useInfluencers(filters?: { status?: string; niche?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.niche) params.append('niche', filters.niche);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  
  const { data, error, isLoading, mutate } = useSWR<{ influencers: Influencer[] }>(
    `${API_BASE}/influencers${query}`,
    fetcher,
    defaultConfig
  );

  const createInfluencer = async (influencerData: Partial<Influencer>) => {
    const result = await apiRequest<{ influencer: Influencer }>(
      `${API_BASE}/influencers`,
      'POST',
      influencerData
    );
    mutate(); // Revalidate cache
    return result.influencer;
  };

  const updateInfluencer = async (id: string, influencerData: Partial<Influencer>) => {
    const result = await apiRequest<{ influencer: Influencer }>(
      `${API_BASE}/influencers/${id}`,
      'PATCH',
      influencerData
    );
    mutate(); // Revalidate cache
    return result.influencer;
  };

  const deleteInfluencer = async (id: string) => {
    await apiRequest<{ success: boolean }>(
      `${API_BASE}/influencers/${id}`,
      'DELETE'
    );
    mutate(); // Revalidate cache
  };

  return {
    influencers: data?.influencers ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    createInfluencer,
    updateInfluencer,
    deleteInfluencer,
  };
}

// ==================== Accounts Hooks ====================

export function useAccounts(filters?: { status?: string; platform?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.platform) params.append('platform', filters.platform);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  
  const { data, error, isLoading, mutate } = useSWR<{ accounts: Account[] }>(
    `${API_BASE}/accounts${query}`,
    fetcher,
    defaultConfig
  );

  const createAccount = async (accountData: Partial<Account>) => {
    const result = await apiRequest<{ account: Account }>(
      `${API_BASE}/accounts`,
      'POST',
      accountData
    );
    mutate();
    return result.account;
  };

  const updateAccount = async (id: string, accountData: Partial<Account>) => {
    const result = await apiRequest<{ account: Account }>(
      `${API_BASE}/accounts/${id}`,
      'PATCH',
      accountData
    );
    mutate();
    return result.account;
  };

  return {
    accounts: data?.accounts ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    createAccount,
    updateAccount,
  };
}

// ==================== Campaigns Hooks ====================

export function useCampaigns(filters?: { status?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  
  const { data, error, isLoading, mutate } = useSWR<{ campaigns: Campaign[] }>(
    `${API_BASE}/campaigns${query}`,
    fetcher,
    defaultConfig
  );

  const createCampaign = async (campaignData: Partial<Campaign>) => {
    const result = await apiRequest<{ campaign: Campaign }>(
      `${API_BASE}/campaigns`,
      'POST',
      campaignData
    );
    mutate();
    return result.campaign;
  };

  const updateCampaign = async (id: string, campaignData: Partial<Campaign>) => {
    const result = await apiRequest<{ campaign: Campaign }>(
      `${API_BASE}/campaigns/${id}`,
      'PATCH',
      campaignData
    );
    mutate();
    return result.campaign;
  };

  const deleteCampaign = async (id: string) => {
    await apiRequest<{ success: boolean }>(
      `${API_BASE}/campaigns/${id}`,
      'DELETE'
    );
    mutate();
  };

  const pauseCampaign = async (id: string) => {
    const result = await apiRequest<{ campaign: Campaign }>(
      `${API_BASE}/campaigns/${id}/pause`,
      'POST'
    );
    mutate();
    return result.campaign;
  };

  const resumeCampaign = async (id: string) => {
    const result = await apiRequest<{ campaign: Campaign }>(
      `${API_BASE}/campaigns/${id}/resume`,
      'POST'
    );
    mutate();
    return result.campaign;
  };

  const pauseAllCampaigns = async () => {
    await apiRequest<{ success: boolean }>(
      `${API_BASE}/campaigns/pause-all`,
      'POST'
    );
    mutate();
  };

  return {
    campaigns: data?.campaigns ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    pauseCampaign,
    resumeCampaign,
    pauseAllCampaigns,
  };
}

// ==================== Offers Hooks ====================

export function useOffers() {
  const { data, error, isLoading, mutate } = useSWR<{ offers: Offer[] }>(
    `${API_BASE}/offers`,
    fetcher,
    defaultConfig
  );

  const createOffer = async (offerData: Partial<Offer>) => {
    const result = await apiRequest<{ offer: Offer }>(
      `${API_BASE}/offers`,
      'POST',
      offerData
    );
    mutate();
    return result.offer;
  };

  const updateOffer = async (id: string, offerData: Partial<Offer>) => {
    const result = await apiRequest<{ offer: Offer }>(
      `${API_BASE}/offers/${id}`,
      'PATCH',
      offerData
    );
    mutate();
    return result.offer;
  };

  const deleteOffer = async (id: string) => {
    await apiRequest<{ success: boolean }>(
      `${API_BASE}/offers/${id}`,
      'DELETE'
    );
    mutate();
  };

  return {
    offers: data?.offers ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    createOffer,
    updateOffer,
    deleteOffer,
  };
}

// ==================== SimCards Hooks ====================

export function useSimCards(status?: string) {
  const query = status ? `?status=${status}` : '';
  
  const { data, error, isLoading, mutate } = useSWR<{ simCards: SimCard[] }>(
    `${API_BASE}/sim-cards${query}`,
    fetcher,
    defaultConfig
  );

  return {
    simCards: data?.simCards ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  };
}

// ==================== Audit Logs Hooks ====================

export function useAuditLogs(filters?: {
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.action) params.append('action', filters.action);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());
  
  const query = params.toString() ? `?${params.toString()}` : '';
  
  const { data, error, isLoading, mutate } = useSWR<{
    logs: ActionLog[];
    total: number;
    hasMore: boolean;
  }>(
    `${API_BASE}/audit-logs${query}`,
    fetcher,
    defaultConfig
  );

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  };
}

// ==================== Notifications Hooks ====================

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<{ notifications: Notification[] }>(
    `${API_BASE}/notifications`,
    fetcher,
    {
      ...defaultConfig,
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  );

  const markAsRead = async (id: string) => {
    await apiRequest<{ success: boolean }>(
      `${API_BASE}/notifications/${id}/read`,
      'PATCH'
    );
    mutate();
  };

  const markAllAsRead = async () => {
    await apiRequest<{ success: boolean }>(
      `${API_BASE}/notifications/read-all`,
      'PATCH'
    );
    mutate();
  };

  return {
    notifications: data?.notifications ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
    markAsRead,
    markAllAsRead,
  };
}

// ==================== Export Functions ====================

export async function exportToPDF(params: {
  type: 'dashboard' | 'campaigns' | 'accounts' | 'influencers' | 'audit-logs';
  startDate?: string;
  endDate?: string;
  campaignIds?: string[];
}): Promise<Blob> {
  const queryParams = new URLSearchParams();
  queryParams.append('type', params.type);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.campaignIds) {
    params.campaignIds.forEach(id => queryParams.append('campaignIds', id));
  }
  
  const response = await fetch(`${API_BASE}/reports/export/pdf?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to export PDF');
  }
  
  return response.blob();
}

export async function exportToExcel(params: {
  type: 'dashboard' | 'campaigns' | 'accounts' | 'influencers' | 'audit-logs';
  startDate?: string;
  endDate?: string;
  campaignIds?: string[];
}): Promise<Blob> {
  const queryParams = new URLSearchParams();
  queryParams.append('type', params.type);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.campaignIds) {
    params.campaignIds.forEach(id => queryParams.append('campaignIds', id));
  }
  
  const response = await fetch(`${API_BASE}/reports/export/excel?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to export Excel');
  }
  
  return response.blob();
}

// ==================== Utility Functions ====================

export function clearAllCache() {
  mutate(
    key => typeof key === 'string' && key.startsWith(API_BASE),
    undefined,
    { revalidate: true }
  );
}

export function prefetchData() {
  // Prefetch common data
  fetcher(`${API_BASE}/dashboard/metrics`);
  fetcher(`${API_BASE}/influencers`);
  fetcher(`${API_BASE}/accounts`);
  fetcher(`${API_BASE}/campaigns`);
}

// Download helper
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
