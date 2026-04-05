import { NextResponse } from 'next/server';

/**
 * Content Studio API - Main Status Endpoint
 * Provides overview of all available tools and providers
 */

// All available video providers
const VIDEO_PROVIDERS = [
  {
    id: 'wan',
    name: 'Wan.video',
    url: 'https://wan.video',
    status: 'available',
    maxDuration: 10,
    features: ['text_to_video', 'image_to_video', 'extend'],
    quality: 'high',
  },
  {
    id: 'pollo',
    name: 'Pollo AI',
    url: 'https://pollo.ai',
    status: 'available',
    maxDuration: 15,
    features: ['image_to_video', 'auto_audio', '50_models'],
    quality: 'high',
  },
  {
    id: 'kling',
    name: 'Kling AI',
    url: 'https://klingai.com',
    status: 'available',
    maxDuration: 10,
    features: ['text_to_video', 'motion_brush'],
    quality: 'high',
  },
  {
    id: 'minimax',
    name: 'MiniMax Hailuo',
    url: 'https://minimax.io',
    status: 'available',
    maxDuration: 6,
    features: ['text_to_video', 'image_to_video'],
    quality: 'high',
  },
  {
    id: 'runway',
    name: 'Runway Gen-3',
    url: 'https://runwayml.com',
    status: 'available',
    maxDuration: 10,
    features: ['gen3_alpha', 'professional'],
    quality: 'professional',
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    url: 'https://lumalabs.ai',
    status: 'available',
    maxDuration: 5,
    features: ['dream_machine', '3d_aware'],
    quality: 'high',
  },
  {
    id: 'pika',
    name: 'Pika Art',
    url: 'https://pika.art',
    status: 'available',
    maxDuration: 10,
    features: ['text_to_video', 'lip_sync'],
    quality: 'medium',
  },
  {
    id: 'haiper',
    name: 'Haiper AI',
    url: 'https://haiper.ai',
    status: 'available',
    maxDuration: 10,
    features: ['text_to_video', 'fast'],
    quality: 'medium',
  },
  {
    id: 'vidu',
    name: 'Vidu Studio',
    url: 'https://vidu.studio',
    status: 'available',
    maxDuration: 10,
    features: ['text_to_video'],
    quality: 'medium',
  },
  {
    id: 'qwen',
    name: 'Qwen Video',
    url: 'https://qwen.ai',
    status: 'available',
    maxDuration: 10,
    features: ['text_to_video', 'multilingual'],
    quality: 'medium',
  },
  {
    id: 'digen',
    name: 'Digen.ai',
    url: 'https://digen.ai',
    status: 'available',
    maxDuration: 5,
    features: ['text_to_video', 'fast'],
    quality: 'medium',
  },
  {
    id: 'meta',
    name: 'Meta Movie Gen',
    url: 'https://meta.ai',
    status: 'available',
    maxDuration: 60,
    features: ['long_video', 'audio_generation'],
    quality: 'high',
  },
];

// Audio providers
const AUDIO_PROVIDERS = {
  tts: [
    {
      id: 'minimax_tts',
      name: 'MiniMax Speech',
      features: ['emotional_voices', 'asmr', 'horror'],
    },
    {
      id: 'natural_readers',
      name: 'NaturalReaders',
      features: ['western_voices', 'british', 'american'],
    },
  ],
  music: [
    {
      id: 'minimax_music',
      name: 'MiniMax Music',
      features: ['instrumental', 'metal', 'jazz', 'meditative'],
    },
  ],
};

export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'Content Studio API',
    version: '2.0.0',
    status: 'operational',
    providers: {
      video: VIDEO_PROVIDERS,
      audio: AUDIO_PROVIDERS,
    },
    endpoints: {
      video_generation: '/api/content-studio/generate',
      image_generation: '/api/content-studio/image',
      text_to_speech: '/api/content-studio/tts',
      music_generation: '/api/content-studio/music',
      task_management: '/api/content-studio/tasks',
    },
    capabilities: {
      video: {
        max_duration: 60,
        supported_ratios: ['16:9', '9:16', '1:1'],
        formats: ['mp4', 'webm'],
      },
      image: {
        max_resolution: '2048x2048',
        supported_styles: ['cinematic', 'realistic', 'anime', 'fantasy', 'scifi', 'portrait', 'dark'],
      },
      audio: {
        max_tts_length: 10000,
        max_music_duration: 300,
      },
    },
  });
}
