// Visual Module - Search and Download Stock Videos/Images
// Использует Pexels API (бесплатный) и Pixabay API (бесплатный)

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { VisualAsset, VIDEO_RESOLUTIONS } from '../types';

const PEXELS_API_URL = 'https://api.pexels.com/videos/search';
const PIXABAY_API_URL = 'https://pixabay.com/api/videos/';

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  user: { name: string };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

interface PixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  videos: {
    large?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
  };
  user_id: number;
}

/**
 * Ищет видео на Pexels
 */
async function searchPexels(
  query: string,
  apiKey: string,
  orientation: 'portrait' | 'landscape' | 'square' = 'portrait',
  perPage: number = 5
): Promise<VisualAsset[]> {
  try {
    const orientationMap = {
      portrait: 'portrait',
      landscape: 'landscape',
      square: 'square',
    };
    
    const url = new URL(PEXELS_API_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', perPage.toString());
    url.searchParams.set('orientation', orientationMap[orientation]);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': apiKey,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }
    
    const data = await response.json();
    const videos: PexelsVideo[] = data.videos || [];
    
    return videos.map(video => {
      // Выбираем лучший файл по качеству
      const targetRes = VIDEO_RESOLUTIONS[orientation];
      const sortedFiles = video.video_files
        .filter(f => f.file_type === 'video/mp4')
        .sort((a, b) => {
          const aDiff = Math.abs(a.height - targetRes.height);
          const bDiff = Math.abs(b.height - targetRes.height);
          return aDiff - bDiff;
        });
      
      const bestFile = sortedFiles[0] || video.video_files[0];
      
      return {
        id: `pexels-${video.id}`,
        type: 'video' as const,
        url: bestFile?.link || '',
        thumbnail: video.image,
        duration: video.duration,
        width: bestFile?.width || 1920,
        height: bestFile?.height || 1080,
        source: 'pexels' as const,
        photographer: video.user.name,
        sourceUrl: video.url,
      };
    }).filter(v => v.url);
  } catch (error) {
    console.error('Pexels search error:', error);
    return [];
  }
}

/**
 * Ищет видео на Pixabay
 */
async function searchPixabay(
  query: string,
  apiKey: string,
  orientation: 'portrait' | 'landscape' | 'square' = 'portrait',
  perPage: number = 5
): Promise<VisualAsset[]> {
  try {
    const url = new URL(PIXABAY_API_URL);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', perPage.toString());
    url.searchParams.set('safesearch', 'true');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }
    
    const data = await response.json();
    const videos: PixabayVideo[] = data.hits || [];
    
    return videos.map(video => {
      const videoFile = video.videos.large || video.videos.medium || video.videos.small;
      
      return {
        id: `pixabay-${video.id}`,
        type: 'video' as const,
        url: videoFile?.url || '',
        thumbnail: '',
        duration: video.duration,
        width: videoFile?.width || 1920,
        height: videoFile?.height || 1080,
        source: 'pixabay' as const,
        photographer: '',
        sourceUrl: video.pageURL,
      };
    }).filter(v => v.url);
  } catch (error) {
    console.error('Pixabay search error:', error);
    return [];
  }
}

/**
 * Ищет видео на всех платформах
 */
export async function searchVideos(
  query: string,
  config: { pexelsApiKey?: string; pixabayApiKey?: string },
  orientation: 'portrait' | 'landscape' | 'square' = 'portrait',
  perPage: number = 5
): Promise<VisualAsset[]> {
  const results: VisualAsset[] = [];
  
  // Pexels (основной источник)
  if (config.pexelsApiKey) {
    const pexelsResults = await searchPexels(query, config.pexelsApiKey, orientation, perPage);
    results.push(...pexelsResults);
  }
  
  // Pixabay (дополнительный)
  if (config.pixabayApiKey && results.length < perPage) {
    const pixabayResults = await searchPixabay(query, config.pixabayApiKey, orientation, perPage);
    results.push(...pixabayResults);
  }
  
  return results.slice(0, perPage);
}

/**
 * Скачивает видео по URL
 */
export async function downloadVideo(
  url: string,
  outputPath: string
): Promise<string> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Создаём директорию если нужно
  const dir = path.dirname(outputPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  
  await writeFile(outputPath, buffer);
  
  return outputPath;
}

/**
 * Ищет и скачивает видео для визуального запроса
 */
export async function getVisualForScene(
  visualQuery: string | null,
  sceneId: string,
  config: { pexelsApiKey?: string; pixabayApiKey?: string },
  orientation: 'portrait' | 'landscape' | 'square' = 'portrait',
  outputDir: string
): Promise<{ visualPath: string | null; asset: VisualAsset | null }> {
  if (!visualQuery) {
    return { visualPath: null, asset: null };
  }
  
  // Извлекаем ключевые слова из запроса
  const keywords = visualQuery
    .replace(/[^\w\sа-яёА-ЯЁ]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3)
    .join(' ');
  
  if (!keywords) {
    return { visualPath: null, asset: null };
  }
  
  try {
    const assets = await searchVideos(keywords, config, orientation, 3);
    
    if (assets.length === 0) {
      console.log(`No videos found for: ${keywords}`);
      return { visualPath: null, asset: null };
    }
    
    // Скачиваем первое найденное видео
    const asset = assets[0];
    const outputPath = path.join(outputDir, `${sceneId}.mp4`);
    
    await downloadVideo(asset.url, outputPath);
    
    return { visualPath: outputPath, asset };
  } catch (error) {
    console.error(`Failed to get visual for scene ${sceneId}:`, error);
    return { visualPath: null, asset: null };
  }
}

/**
 * Генерирует placeholder изображение если видео не найдено
 */
export async function generatePlaceholder(
  text: string,
  outputPath: string,
  orientation: 'portrait' | 'landscape' | 'square' = 'portrait'
): Promise<string> {
  // Используем picsum.photos для случайных изображений
  const res = VIDEO_RESOLUTIONS[orientation];
  const seed = Date.now();
  const url = `https://picsum.photos/seed/${seed}/${res.width}/${res.height}`;
  
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    const dir = path.dirname(outputPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    await writeFile(outputPath, buffer);
    return outputPath;
  } catch (error) {
    console.error('Failed to generate placeholder:', error);
    return '';
  }
}
