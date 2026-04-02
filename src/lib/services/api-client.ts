/**
 * API Client - Центральный клиент для всех API запросов
 * Включает обработку ошибок, retry логику и кэширование
 */

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  success: boolean;
}

// Кастомный класс ошибки
class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Коды ошибок
const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

// Задержка для retry
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Экспоненциальная задержка
const getRetryDelay = (attempt: number, baseDelay: number): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Макс 30 секунд
};

/**
 * Основная функция для выполнения запросов
 */
async function request<T>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
  } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Успешный ответ
      if (response.ok) {
        const data = await response.json();
        return {
          data,
          error: null,
          status: response.status,
          success: true,
        };
      }

      // Обработка ошибок HTTP
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || response.statusText;

      switch (response.status) {
        case 401:
          throw new ApiError('Не авторизован', response.status, ERROR_CODES.UNAUTHORIZED);
        case 403:
          throw new ApiError('Доступ запрещён', response.status, ERROR_CODES.FORBIDDEN);
        case 404:
          throw new ApiError('Не найдено', response.status, ERROR_CODES.NOT_FOUND);
        case 422:
          throw new ApiError(errorMessage, response.status, ERROR_CODES.VALIDATION_ERROR);
        case 429:
          throw new ApiError('Превышен лимит запросов', response.status, ERROR_CODES.RATE_LIMIT);
        default:
          if (response.status >= 500) {
            throw new ApiError('Ошибка сервера', response.status, ERROR_CODES.SERVER_ERROR);
          }
          throw new ApiError(errorMessage, response.status, ERROR_CODES.UNKNOWN);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;

      // Не повторяем для определенных ошибок
      if (error instanceof ApiError) {
        if (
          error.code === ERROR_CODES.UNAUTHORIZED ||
          error.code === ERROR_CODES.FORBIDDEN ||
          error.code === ERROR_CODES.NOT_FOUND ||
          error.code === ERROR_CODES.VALIDATION_ERROR
        ) {
          return {
            data: null,
            error: error.message,
            status: error.status,
            success: false,
          };
        }
      }

      // Retry для сетевых ошибок и серверных ошибок
      if (attempt < retries) {
        const waitTime = getRetryDelay(attempt, retryDelay);
        console.warn(`Попытка ${attempt + 1}/${retries} не удалась. Повтор через ${waitTime}мс`);
        await delay(waitTime);
      }
    }
  }

  // Все попытки исчерпаны
  const errorMessage = lastError instanceof ApiError ? lastError.message : 'Ошибка сети';
  const statusCode = lastError instanceof ApiError ? lastError.status : 0;

  return {
    data: null,
    error: errorMessage,
    status: statusCode,
    success: false,
  };
}

// ============ API METHODS ============

export const api = {
  get: <T>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'GET' }),

  post: <T>(url: string, body: unknown, config?: Omit<RequestConfig, 'method'>) =>
    request<T>(url, { ...config, method: 'POST', body }),

  put: <T>(url: string, body: unknown, config?: Omit<RequestConfig, 'method'>) =>
    request<T>(url, { ...config, method: 'PUT', body }),

  patch: <T>(url: string, body: unknown, config?: Omit<RequestConfig, 'method'>) =>
    request<T>(url, { ...config, method: 'PATCH', body }),

  delete: <T>(url: string, config?: Omit<RequestConfig, 'method'>) =>
    request<T>(url, { ...config, method: 'DELETE' }),
};

// ============ SPACIFIC API ENDPOINTS ============

export const influencerApi = {
  getAll: (params?: { status?: string; niche?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.niche) searchParams.set('niche', params.niche);
    const query = searchParams.toString();
    return api.get<{ influencers: unknown[] }>(`/api/influencers${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    api.get<{ influencer: unknown }>(`/api/influencers/${id}`),

  create: (data: unknown) =>
    api.post<{ influencer: unknown }>('/api/influencers', data),

  update: (id: string, data: unknown) =>
    api.put<{ influencer: unknown }>(`/api/influencers/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/influencers/${id}`),
};

export const aiApi = {
  generate: (params: {
    type: 'post' | 'comment' | 'dm' | 'story' | 'style';
    prompt: string;
    context?: Record<string, unknown>;
  }) => api.post<{ result: string; usage: { tokens: number; cost: number } }>('/api/ai/generate', params),
};

export const accountApi = {
  getAll: () => api.get<{ accounts: unknown[] }>('/api/accounts'),
  create: (data: unknown) => api.post<{ account: unknown }>('/api/accounts', data),
  update: (id: string, data: unknown) => api.patch<{ account: unknown }>(`/api/accounts/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/accounts/${id}`),
};

export const campaignApi = {
  getAll: () => api.get<{ campaigns: unknown[] }>('/api/campaigns'),
  create: (data: unknown) => api.post<{ campaign: unknown }>('/api/campaigns', data),
  update: (id: string, data: unknown) => api.patch<{ campaign: unknown }>(`/api/campaigns/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/campaigns/${id}`),
};

export default api;
