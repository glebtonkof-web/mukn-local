/**
 * Content Studio Types
 * All type definitions for the content creation system
 */

// ============== Base Types ==============

export type ContentType = 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'text' 
  | 'gif'
  | 'meme'
  | 'story'
  | 'music';

export type ContentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed';

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '3:4';

export interface ContentMetadata {
  id: string;
  type: ContentType;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
  prompt?: string;
  tags?: string[];
  [key: string]: any;
}

// ============== Image Types ==============

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  style?: ImageStyle;
  quality?: 'standard' | 'hd';
  numberOfImages?: number;
}

export interface ImageStyle {
  type: 'realistic' | 'anime' | '3d' | 'artistic' | 'cinematic' | 'cartoon' | 'abstract';
  modifiers?: string[];
}

export interface GeneratedImage {
  id: string;
  url: string;
  base64?: string;
  width: number;
  height: number;
  format: string;
  seed?: number;
}

// ============== Video Types ==============

export interface VideoGenerationOptions {
  prompt: string;
  duration: number; // seconds
  aspectRatio?: AspectRatio;
  style?: VideoStyle;
  provider?: 'auto' | 'kling' | 'luma' | 'runway';
  fps?: number;
  withAudio?: boolean;
}

export interface VideoStyle {
  type: 'cinematic' | 'anime' | 'realistic' | '3d' | 'vintage' | 'dark' | 'bright';
  cameraMovement?: 'static' | 'zoom-in' | 'zoom-out' | 'pan' | 'tilt' | 'dynamic';
}

export interface GeneratedVideo {
  id: string;
  url: string;
  localPath?: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  format: string;
  thumbnailUrl?: string;
  provider: string;
}

export interface LongVideoOptions {
  prompt: string; // Long scenario
  targetDuration: number;
  aspectRatio?: AspectRatio;
  style?: VideoStyle;
  voiceover?: boolean;
  voiceoverText?: string;
  backgroundMusic?: string;
  transitions?: TransitionType[];
}

export type TransitionType = 
  | 'none' 
  | 'fade' 
  | 'crossfade' 
  | 'zoom-in' 
  | 'zoom-out' 
  | 'slide-left' 
  | 'slide-right';

// ============== Audio Types ==============

export interface AudioGenerationOptions {
  type: 'tts' | 'music' | 'sfx';
  text?: string; // For TTS
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  
  // Music generation
  style?: MusicStyle;
  duration?: number;
  tempo?: number;
  mood?: string;
  instruments?: string[];
}

export interface MusicStyle {
  genre: 'ambient' | 'chill' | 'cinematic' | 'electronic' | 'classical' | 'pop' | 'hiphop' | 'rock' | 'lofi';
  mood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'dramatic' | 'romantic' | 'mysterious';
  instruments?: string[];
}

export interface GeneratedAudio {
  id: string;
  url: string;
  base64?: string;
  duration: number;
  format: string;
  sampleRate?: number;
  channels?: number;
}

// ============== Text Types ==============

export interface TextGenerationOptions {
  prompt: string;
  type: 'article' | 'post' | 'caption' | 'script' | 'meme' | 'ad-copy';
  tone?: 'formal' | 'casual' | 'humorous' | 'professional' | 'emotional';
  length?: 'short' | 'medium' | 'long';
  language?: string;
  keywords?: string[];
  targetAudience?: string;
}

export interface GeneratedText {
  id: string;
  content: string;
  type: string;
  wordCount: number;
  language: string;
  suggestions?: string[];
}

// ============== Translation Types ==============

export interface TranslationOptions {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting?: boolean;
  context?: string;
}

export interface TranslatedContent {
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

// ============== Watermark Removal Types ==============

export interface WatermarkRemovalOptions {
  type: 'crop' | 'blur' | 'inpaint' | 'logo-overlay' | 'auto';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'custom';
  customPosition?: { x: number; y: number; width: number; height: number };
  intensity?: number; // 0-100
  customLogo?: string; // For logo overlay
}

export interface WatermarkRemovalResult {
  id: string;
  originalUrl: string;
  processedUrl: string;
  method: string;
  success: boolean;
}

// ============== Content Pipeline Types ==============

export interface PipelineStep {
  id: string;
  type: ContentType | 'translate' | 'watermark-remove' | 'resize' | 'compress' | 'format-convert';
  options: Record<string, any>;
  dependencies?: string[]; // IDs of previous steps
}

export interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  status: ContentStatus;
  createdAt: Date;
  completedAt?: Date;
  results: Record<string, any>;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  steps: Omit<PipelineStep, 'id'>[];
  category: 'social-media' | 'advertising' | 'content-creation' | 'video-production';
}

// ============== Provider Types ==============

export interface ContentProvider {
  name: string;
  type: ContentType;
  available: boolean;
  credits?: number;
  limits?: {
    daily?: number;
    hourly?: number;
    monthly?: number;
  };
  capabilities?: string[];
}

// ============== API Response Types ==============

export interface ContentStudioResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: ContentMetadata;
}
