/**
 * МУКН Content Studio - Unified Content Creation Platform
 * Комбайн для создания всех типов контента
 * 
 * Modules:
 * - Image Generation (AI)
 * - Video Generation (Free Video Gen)
 * - Audio/Music Generation
 * - Text Generation (AI)
 * - Translation
 * - Watermark Removal
 * - Content Pipeline
 */

export * from './types';
export * from './image-generator';
export * from './audio-generator';
export * from './text-generator';
export * from './translator';
export * from './watermark-remover';
export * from './pipeline';
export * from './content-studio';

// Version
export const CONTENT_STUDIO_VERSION = '1.0.0';
