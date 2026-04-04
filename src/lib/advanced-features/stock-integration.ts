// Интеграция с сервисами стоковых фото/видео
// Pexels, Pixabay, Unsplash (бесплатные)

import { db } from '../db';
import { nanoid } from 'nanoid';

export type StockProvider = 'pexels' | 'pixabay' | 'unsplash';

export interface StockImage {
  id: string;
  provider: StockProvider;
  url: string;
  thumbnailUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl?: string;
  alt?: string;
  tags: string[];
}

export interface StockVideo {
  id: string;
  provider: StockProvider;
  url: string;
  thumbnailUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  duration: number; // секунды
  photographer: string;
  tags: string[];
}

export interface StockSearchOptions {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  perPage?: number;
  page?: number;
}

class StockIntegrationService {
  private apiKeys: Record<StockProvider, string | null> = {
    pexels: null,
    pixabay: null,
    unsplash: null,
  };

  constructor() {
    this.loadApiKeys();
  }

  private async loadApiKeys(): Promise<void> {
    const integrations = await db.stockIntegration.findMany();
    integrations.forEach(int => {
      this.apiKeys[int.provider as StockProvider] = int.apiKey;
    });
  }

  // Поиск изображений
  async searchImages(options: StockSearchOptions): Promise<StockImage[]> {
    const results: StockImage[] = [];
    const errors: string[] = [];

    // Пробуем все провайдеры параллельно
    const searches = await Promise.allSettled([
      this.searchPexelsImages(options),
      this.searchPixabayImages(options),
      this.searchUnsplashImages(options),
    ]);

    searches.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        const providers: StockProvider[] = ['pexels', 'pixabay', 'unsplash'];
        errors.push(`${providers[index]}: ${result.reason}`);
      }
    });

    if (results.length === 0 && errors.length > 0) {
      console.warn('[StockIntegration] Search errors:', errors);
    }

    // Перемешиваем результаты для разнообразия
    return this.shuffleArray(results);
  }

  // Поиск видео
  async searchVideos(options: StockSearchOptions): Promise<StockVideo[]> {
    const results: StockVideo[] = [];

    const searches = await Promise.allSettled([
      this.searchPexelsVideos(options),
      this.searchPixabayVideos(options),
    ]);

    searches.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });

    return this.shuffleArray(results);
  }

  // Pexels Images
  private async searchPexelsImages(options: StockSearchOptions): Promise<StockImage[]> {
    const apiKey = this.apiKeys.pexels || process.env.PEXELS_API_KEY;
    if (!apiKey) return [];

    try {
      const orientation = options.orientation === 'landscape' ? 'landscape' : 
                          options.orientation === 'portrait' ? 'portrait' : 'square';

      const params = new URLSearchParams({
        query: options.query,
        per_page: String(options.perPage || 15),
        page: String(options.page || 1),
        orientation,
      });

      const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
        headers: { Authorization: apiKey },
      });

      if (!response.ok) return [];

      const data = await response.json();

      return data.photos.map((photo: any) => ({
        id: `pexels_${photo.id}`,
        provider: 'pexels' as StockProvider,
        url: photo.url,
        thumbnailUrl: photo.src.medium,
        downloadUrl: photo.src.large,
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        alt: photo.alt,
        tags: [],
      }));
    } catch (error) {
      console.error('[StockIntegration] Pexels images error:', error);
      return [];
    }
  }

  // Pexels Videos
  private async searchPexelsVideos(options: StockSearchOptions): Promise<StockVideo[]> {
    const apiKey = this.apiKeys.pexels || process.env.PEXELS_API_KEY;
    if (!apiKey) return [];

    try {
      const params = new URLSearchParams({
        query: options.query,
        per_page: String(options.perPage || 15),
        page: String(options.page || 1),
      });

      const response = await fetch(`https://api.pexels.com/videos/search?${params}`, {
        headers: { Authorization: apiKey },
      });

      if (!response.ok) return [];

      const data = await response.json();

      return data.videos.map((video: any) => ({
        id: `pexels_${video.id}`,
        provider: 'pexels' as StockProvider,
        url: video.url,
        thumbnailUrl: video.image,
        downloadUrl: video.video_files[0]?.link || '',
        width: video.width,
        height: video.height,
        duration: Math.round(video.duration),
        photographer: video.user.name,
        tags: [],
      }));
    } catch (error) {
      console.error('[StockIntegration] Pexels videos error:', error);
      return [];
    }
  }

  // Pixabay Images
  private async searchPixabayImages(options: StockSearchOptions): Promise<StockImage[]> {
    const apiKey = this.apiKeys.pixabay || process.env.PIXABAY_API_KEY;
    if (!apiKey) return [];

    try {
      const orientation = options.orientation === 'landscape' ? 'horizontal' : 
                          options.orientation === 'portrait' ? 'vertical' : 'all';

      const params = new URLSearchParams({
        key: apiKey,
        q: options.query,
        per_page: String(options.perPage || 15),
        page: String(options.page || 1),
        image_type: 'photo',
        orientation,
        safesearch: 'true',
      });

      const response = await fetch(`https://pixabay.com/api/?${params}`);

      if (!response.ok) return [];

      const data = await response.json();

      return data.hits.map((hit: any) => ({
        id: `pixabay_${hit.id}`,
        provider: 'pixabay' as StockProvider,
        url: hit.pageURL,
        thumbnailUrl: hit.webformatURL,
        downloadUrl: hit.largeImageURL,
        width: hit.webformatWidth,
        height: hit.webformatHeight,
        photographer: hit.user,
        tags: hit.tags.split(', ').slice(0, 5),
      }));
    } catch (error) {
      console.error('[StockIntegration] Pixabay images error:', error);
      return [];
    }
  }

  // Pixabay Videos
  private async searchPixabayVideos(options: StockSearchOptions): Promise<StockVideo[]> {
    const apiKey = this.apiKeys.pixabay || process.env.PIXABAY_API_KEY;
    if (!apiKey) return [];

    try {
      const params = new URLSearchParams({
        key: apiKey,
        q: options.query,
        per_page: String(options.perPage || 15),
        page: String(options.page || 1),
        video_type: 'all',
      });

      const response = await fetch(`https://pixabay.com/api/videos/?${params}`);

      if (!response.ok) return [];

      const data = await response.json();

      return data.hits.map((hit: any) => ({
        id: `pixabay_${hit.id}`,
        provider: 'pixabay' as StockProvider,
        url: hit.pageURL,
        thumbnailUrl: hit.picture_id,
        downloadUrl: hit.videos.medium.url,
        width: hit.videos.medium.width,
        height: hit.videos.medium.height,
        duration: Math.round(hit.duration),
        photographer: hit.user,
        tags: hit.tags.split(', ').slice(0, 5),
      }));
    } catch (error) {
      console.error('[StockIntegration] Pixabay videos error:', error);
      return [];
    }
  }

  // Unsplash Images
  private async searchUnsplashImages(options: StockSearchOptions): Promise<StockImage[]> {
    const apiKey = this.apiKeys.unsplash || process.env.UNSPLASH_ACCESS_KEY;
    if (!apiKey) return [];

    try {
      const orientation = options.orientation || undefined;

      const params = new URLSearchParams({
        query: options.query,
        per_page: String(options.perPage || 15),
        page: String(options.page || 1),
        ...(orientation && { orientation }),
      });

      const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
        headers: { Authorization: `Client-ID ${apiKey}` },
      });

      if (!response.ok) return [];

      const data = await response.json();

      return data.results.map((photo: any) => ({
        id: `unsplash_${photo.id}`,
        provider: 'unsplash' as StockProvider,
        url: photo.links.html,
        thumbnailUrl: photo.urls.small,
        downloadUrl: photo.urls.full,
        width: photo.width,
        height: photo.height,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        alt: photo.alt_description,
        tags: photo.tags?.map((t: any) => t.title).slice(0, 5) || [],
      }));
    } catch (error) {
      console.error('[StockIntegration] Unsplash images error:', error);
      return [];
    }
  }

  // Скачать изображение
  async downloadImage(image: StockImage): Promise<Buffer | null> {
    try {
      const response = await fetch(image.downloadUrl);
      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('[StockIntegration] Download error:', error);
      return null;
    }
  }

  // Получить изображение по ключевым словам (fallback для Hunyuan)
  async getImageForKeywords(keywords: string[], options?: Partial<StockSearchOptions>): Promise<StockImage | null> {
    const query = keywords.join(' ');
    const images = await this.searchImages({
      query,
      perPage: 10,
      ...options,
    });

    return images[0] || null;
  }

  // Настроить API ключ
  async configureProvider(provider: StockProvider, apiKey: string): Promise<void> {
    this.apiKeys[provider] = apiKey;

    await db.stockIntegration.upsert({
      where: { provider },
      create: {
        id: nanoid(),
        provider,
        apiKey,
        isActive: true,
        updatedAt: new Date(),
      },
      update: {
        apiKey,
        isActive: true,
      },
    });
  }

  // Получить статус провайдеров
  async getProvidersStatus(): Promise<Record<StockProvider, { configured: boolean; dailyLimit?: number; dailyUsed: number }>> {
    const integrations = await db.stockIntegration.findMany();

    const status: Record<StockProvider, { configured: boolean; dailyLimit?: number; dailyUsed: number }> = {
      pexels: { configured: false, dailyUsed: 0 },
      pixabay: { configured: false, dailyUsed: 0 },
      unsplash: { configured: false, dailyUsed: 0 },
    };

    integrations.forEach(int => {
      status[int.provider as StockProvider] = {
        configured: !!int.apiKey && int.isActive,
        dailyLimit: int.dailyLimit || undefined,
        dailyUsed: int.dailyUsed,
      };
    });

    return status;
  }

  // Приватные методы
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

let stockIntegrationInstance: StockIntegrationService | null = null;

export function getStockIntegration(): StockIntegrationService {
  if (!stockIntegrationInstance) {
    stockIntegrationInstance = new StockIntegrationService();
  }
  return stockIntegrationInstance;
}

export const stockIntegration = {
  searchImages: (options: StockSearchOptions) => getStockIntegration().searchImages(options),
  searchVideos: (options: StockSearchOptions) => getStockIntegration().searchVideos(options),
  download: (image: StockImage) => getStockIntegration().downloadImage(image),
  getImageForKeywords: (keywords: string[], options?: Partial<StockSearchOptions>) => 
    getStockIntegration().getImageForKeywords(keywords, options),
  configure: (provider: StockProvider, apiKey: string) => 
    getStockIntegration().configureProvider(provider, apiKey),
  getStatus: () => getStockIntegration().getProvidersStatus(),
};
