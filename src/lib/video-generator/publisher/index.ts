// Publisher Module - Upload videos to social platforms
// Поддержка TikTok, Instagram Reels, YouTube Shorts

import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { PublishResult } from '../types';

interface PublishConfig {
  uploadPostApiKey?: string;
  zernioApiKey?: string;
  platforms: ('tiktok' | 'instagram' | 'youtube' | 'linkedin')[];
}

interface PublishOptions {
  title: string;
  description?: string;
  tags?: string[];
  hashtags?: string[];
  schedule?: Date;
}

/**
 * Публикация через UploadPost API
 */
async function publishViaUploadPost(
  videoPath: string,
  options: PublishOptions,
  config: PublishConfig
): Promise<PublishResult[]> {
  if (!config.uploadPostApiKey) {
    throw new Error('UploadPost API key not configured');
  }
  
  const results: PublishResult[] = [];
  
  // Read video file as base64
  const videoBuffer = await readFile(videoPath);
  const videoBase64 = videoBuffer.toString('base64');
  
  for (const platform of config.platforms) {
    try {
      const response = await fetch('https://api.upload-post.com/v1/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.uploadPostApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video: videoBase64,
          title: options.title,
          description: options.description || '',
          tags: options.tags || [],
          hashtags: options.hashtags || [],
          platform,
          schedule: options.schedule?.toISOString(),
        }),
      });
      
      const data = await response.json();
      
      results.push({
        platform,
        success: response.ok,
        postId: data.id || data.post_id,
        postUrl: data.url || data.post_url,
        error: response.ok ? undefined : data.error || 'Upload failed',
      });
    } catch (error) {
      results.push({
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Публикация через Zernio API
 */
async function publishViaZernio(
  videoPath: string,
  options: PublishOptions,
  config: PublishConfig
): Promise<PublishResult[]> {
  if (!config.zernioApiKey) {
    throw new Error('Zernio API key not configured');
  }
  
  const results: PublishResult[] = [];
  
  // Read video file as base64
  const videoBuffer = await readFile(videoPath);
  const videoBase64 = videoBuffer.toString('base64');
  
  const platformMap: Record<string, string> = {
    tiktok: 'tiktok',
    instagram: 'instagram_reels',
    youtube: 'youtube_shorts',
    linkedin: 'linkedin',
  };
  
  for (const platform of config.platforms) {
    try {
      const response = await fetch('https://api.zernio.com/v2/publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.zernioApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media: videoBase64,
          media_type: 'video',
          title: options.title,
          caption: options.description || '',
          hashtags: options.hashtags || [],
          platforms: [platformMap[platform]],
          scheduled_at: options.schedule?.toISOString(),
        }),
      });
      
      const data = await response.json();
      
      results.push({
        platform,
        success: response.ok,
        postId: data.id || data.post_id,
        postUrl: data.url || data.post_url,
        error: response.ok ? undefined : data.error || 'Upload failed',
      });
    } catch (error) {
      results.push({
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Публикация через локальные браузерные автоматизации (fallback)
 * Использует Playwright для автоматической загрузки
 */
async function publishViaBrowser(
  videoPath: string,
  options: PublishOptions,
  platform: 'tiktok' | 'instagram' | 'youtube'
): Promise<PublishResult> {
  // Это требует установки Playwright и профилей браузера
  // Для демо возвращаем заглушку
  
  return {
    platform,
    success: false,
    error: 'Browser automation requires Playwright setup. Please use API method.',
  };
}

/**
 * Основная функция публикации
 */
export async function publishVideo(
  videoPath: string,
  options: PublishOptions,
  config: PublishConfig
): Promise<PublishResult[]> {
  // Проверяем существование файла
  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }
  
  // Пробуем UploadPost API
  if (config.uploadPostApiKey) {
    return publishViaUploadPost(videoPath, options, config);
  }
  
  // Пробуем Zernio API
  if (config.zernioApiKey) {
    return publishViaZernio(videoPath, options, config);
  }
  
  // Fallback - возвращаем ошибку
  return config.platforms.map(platform => ({
    platform,
    success: false,
    error: 'No API key configured. Please set uploadPostApiKey or zernioApiKey in config.',
  }));
}

/**
 * Публикация на TikTok
 */
export async function publishToTikTok(
  videoPath: string,
  options: PublishOptions,
  config: PublishConfig
): Promise<PublishResult> {
  const results = await publishVideo(videoPath, options, {
    ...config,
    platforms: ['tiktok'],
  });
  return results[0];
}

/**
 * Публикация на Instagram Reels
 */
export async function publishToInstagram(
  videoPath: string,
  options: PublishOptions,
  config: PublishConfig
): Promise<PublishResult> {
  const results = await publishVideo(videoPath, options, {
    ...config,
    platforms: ['instagram'],
  });
  return results[0];
}

/**
 * Публикация на YouTube Shorts
 */
export async function publishToYouTube(
  videoPath: string,
  options: PublishOptions,
  config: PublishConfig
): Promise<PublishResult> {
  const results = await publishVideo(videoPath, options, {
    ...config,
    platforms: ['youtube'],
  });
  return results[0];
}

/**
 * Формирует описание с хештегами
 */
export function formatDescription(
  description: string,
  hashtags: string[]
): string {
  const formattedTags = hashtags
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .join(' ');
  
  if (description && formattedTags) {
    return `${description}\n\n${formattedTags}`;
  }
  
  return description || formattedTags;
}
