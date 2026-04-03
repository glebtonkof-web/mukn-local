// Video Generator Types

export interface VideoScript {
  id: string;
  title: string;
  orientation: 'portrait' | 'landscape' | 'square';
  voice: string;
  script: string;
  tags?: string[];
  hashtags?: string[];
  description?: string;
}

export interface ParsedScene {
  id: string;
  text: string;
  visualQuery: string | null;
  duration: number; // в секундах
  audioPath?: string;
  visualPath?: string;
  subtitles?: string;
}

export interface ParsedScript {
  id: string;
  title: string;
  orientation: 'portrait' | 'landscape' | 'square';
  voice: string;
  scenes: ParsedScene[];
  totalDuration: number;
  tags?: string[];
  hashtags?: string[];
  description?: string;
}

export interface GenerationProgress {
  stage: 'parsing' | 'tts' | 'visual' | 'assembly' | 'publishing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  currentScene?: number;
  totalScenes?: number;
  outputPath?: string;
  error?: string;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  preview?: string;
}

export interface VisualAsset {
  id: string;
  type: 'video' | 'image';
  url: string;
  thumbnail?: string;
  duration?: number;
  width: number;
  height: number;
  source: 'pexels' | 'pixabay' | 'local';
  photographer?: string;
  sourceUrl?: string;
}

export interface PublishResult {
  platform: 'tiktok' | 'instagram' | 'youtube' | 'linkedin';
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface VideoGeneratorConfig {
  pexelsApiKey?: string;
  pixabayApiKey?: string;
  uploadPostApiKey?: string;
  outputDir: string;
  tempDir: string;
  defaultVoice: string;
  defaultOrientation: 'portrait' | 'landscape' | 'square';
  addSubtitles: boolean;
  fps: number;
  quality: 'low' | 'medium' | 'high';
}

// Доступные голоса Edge-TTS
export const EDGE_TTS_VOICES: VoiceInfo[] = [
  // Русские голоса
  { id: 'ru-RU-SvetlanaNeural', name: 'Светлана', language: 'ru-RU', gender: 'female' },
  { id: 'ru-RU-DmitryNeural', name: 'Дмитрий', language: 'ru-RU', gender: 'male' },
  
  // Английские голоса
  { id: 'en-US-JennyNeural', name: 'Jenny', language: 'en-US', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy', language: 'en-US', gender: 'male' },
  { id: 'en-US-AriaNeural', name: 'Aria', language: 'en-US', gender: 'female' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', language: 'en-US', gender: 'male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', language: 'en-GB', gender: 'female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', language: 'en-GB', gender: 'male' },
  
  // Испанские голоса
  { id: 'es-ES-ElviraNeural', name: 'Elvira', language: 'es-ES', gender: 'female' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro', language: 'es-ES', gender: 'male' },
  
  // Немецкие голоса
  { id: 'de-DE-KatjaNeural', name: 'Katja', language: 'de-DE', gender: 'female' },
  { id: 'de-DE-ConradNeural', name: 'Conrad', language: 'de-DE', gender: 'male' },
  
  // Французские голоса
  { id: 'fr-FR-DeniseNeural', name: 'Denise', language: 'fr-FR', gender: 'female' },
  { id: 'fr-FR-HenriNeural', name: 'Henri', language: 'fr-FR', gender: 'male' },
];

// Разрешения для разных ориентаций
export const VIDEO_RESOLUTIONS = {
  portrait: { width: 1080, height: 1920 }, // 9:16 для TikTok/Reels/Shorts
  landscape: { width: 1920, height: 1080 }, // 16:9 для YouTube
  square: { width: 1080, height: 1080 }, // 1:1 для Instagram
};

// Дефолтная конфигурация
export const DEFAULT_CONFIG: VideoGeneratorConfig = {
  outputDir: './output/videos',
  tempDir: './output/temp',
  defaultVoice: 'ru-RU-SvetlanaNeural',
  defaultOrientation: 'portrait',
  addSubtitles: true,
  fps: 30,
  quality: 'high',
};
