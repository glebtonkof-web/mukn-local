// Video Generator - Main orchestrator
// Объединяет все модули для генерации видео

import { VideoScript, ParsedScript, GenerationProgress, VideoGeneratorConfig, DEFAULT_CONFIG } from './types';
import { parseScript, validateScript } from './parser';
import { generateAllAudio, installEdgeTTS, checkEdgeTTS } from './tts';
import { getVisualForScene } from './visual';
import { assembleVideo } from './assembly';
import { publishVideo, formatDescription } from './publisher';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export class VideoGenerator {
  private config: VideoGeneratorConfig;
  private onProgress?: (progress: GenerationProgress) => void;

  constructor(config: Partial<VideoGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Устанавливает callback для отслеживания прогресса
   */
  setProgressCallback(callback: (progress: GenerationProgress) => void): void {
    this.onProgress = callback;
  }

  /**
   * Отправляет обновление прогресса
   */
  private updateProgress(progress: Partial<GenerationProgress>): void {
    if (this.onProgress) {
      this.onProgress({
        stage: progress.stage || 'parsing',
        progress: progress.progress || 0,
        message: progress.message || '',
        currentScene: progress.currentScene,
        totalScenes: progress.totalScenes,
        outputPath: progress.outputPath,
        error: progress.error,
      });
    }
  }

  /**
   * Проверяет и создаёт необходимые директории
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.config.outputDir,
      this.config.tempDir,
      path.join(this.config.tempDir, 'audio'),
      path.join(this.config.tempDir, 'visuals'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Проверяет зависимости
   */
  async checkDependencies(): Promise<{
    ffmpeg: boolean;
    edgeTTS: boolean;
    pexels: boolean;
  }> {
    const { checkFFmpeg } = await import('./assembly');
    const hasFFmpeg = await checkFFmpeg();
    const hasEdgeTTS = await checkEdgeTTS();
    
    return {
      ffmpeg: hasFFmpeg,
      edgeTTS: hasEdgeTTS,
      pexels: !!this.config.pexelsApiKey,
    };
  }

  /**
   * Генерирует видео из сценария
   */
  async generate(
    script: VideoScript,
    options: { publish?: boolean; platforms?: ('tiktok' | 'instagram' | 'youtube')[] } = {}
  ): Promise<{
    success: boolean;
    parsedScript: ParsedScript | null;
    outputPath: string | null;
    publishResults?: Awaited<ReturnType<typeof publishVideo>>;
    error?: string;
  }> {
    try {
      // 1. Валидация сценария
      this.updateProgress({ stage: 'parsing', progress: 0, message: 'Валидация сценария...' });
      
      const validation = validateScript(script);
      if (!validation.valid) {
        throw new Error(`Invalid script: ${validation.errors.join(', ')}`);
      }

      // 2. Парсинг сценария
      this.updateProgress({ stage: 'parsing', progress: 5, message: 'Парсинг сценария...' });
      
      const parsedScript = parseScript(script);
      this.updateProgress({
        stage: 'parsing',
        progress: 10,
        message: `Найдено ${parsedScript.scenes.length} сцен`,
        totalScenes: parsedScript.scenes.length,
      });

      // Создаём директории
      await this.ensureDirectories();

      // 3. Генерация озвучки
      this.updateProgress({ stage: 'tts', progress: 15, message: 'Генерация озвучки...' });
      
      const audioDir = path.join(this.config.tempDir, 'audio');
      const scenesWithAudio = await generateAllAudio(
        parsedScript.scenes,
        parsedScript.voice,
        audioDir,
        (current, total) => {
          const progress = 15 + (current / total) * 30;
          this.updateProgress({
            stage: 'tts',
            progress,
            message: `Озвучка сцены ${current}/${total}`,
            currentScene: current,
            totalScenes: total,
          });
        }
      );
      
      parsedScript.scenes = scenesWithAudio;

      // 4. Поиск визуального ряда
      this.updateProgress({ stage: 'visual', progress: 45, message: 'Поиск видео...' });
      
      const visualDir = path.join(this.config.tempDir, 'visuals');
      
      for (let i = 0; i < parsedScript.scenes.length; i++) {
        const scene = parsedScript.scenes[i];
        
        this.updateProgress({
          stage: 'visual',
          progress: 45 + (i / parsedScript.scenes.length) * 25,
          message: `Поиск видео для сцены ${i + 1}/${parsedScript.scenes.length}`,
          currentScene: i + 1,
          totalScenes: parsedScript.scenes.length,
        });
        
        if (scene.visualQuery) {
          try {
            const { visualPath } = await getVisualForScene(
              scene.visualQuery,
              scene.id,
              {
                pexelsApiKey: this.config.pexelsApiKey,
                pixabayApiKey: this.config.pixabayApiKey,
              },
              parsedScript.orientation,
              visualDir
            );
            
            parsedScript.scenes[i].visualPath = visualPath ?? undefined;
          } catch (error) {
            console.error(`Failed to get visual for scene ${scene.id}:`, error);
          }
        }
      }

      // 5. Сборка видео
      this.updateProgress({ stage: 'assembly', progress: 70, message: 'Сборка видео...' });
      
      const result = await assembleVideo(
        parsedScript.scenes,
        parsedScript.title,
        {
          outputDir: this.config.outputDir,
          tempDir: this.config.tempDir,
          fps: this.config.fps,
          quality: this.config.quality,
          addSubtitles: this.config.addSubtitles,
          orientation: parsedScript.orientation,
        },
        (stage, progress) => {
          this.updateProgress({
            stage: 'assembly',
            progress: 70 + progress * 0.25,
            message: `Сборка: ${stage}`,
          });
        }
      );

      this.updateProgress({
        stage: 'assembly',
        progress: 95,
        message: 'Видео готово!',
        outputPath: result.outputPath,
      });

      // 6. Публикация (если запрошено)
      let publishResults;
      
      if (options.publish && options.platforms && options.platforms.length > 0) {
        this.updateProgress({ stage: 'publishing', progress: 95, message: 'Публикация...' });
        
        try {
          publishResults = await publishVideo(
            result.outputPath,
            {
              title: parsedScript.title,
              description: parsedScript.description,
              tags: parsedScript.tags,
              hashtags: parsedScript.hashtags,
            },
            {
              uploadPostApiKey: this.config.uploadPostApiKey,
              platforms: options.platforms,
            }
          );
        } catch (error) {
          console.error('Publishing failed:', error);
        }
      }

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'Готово!',
        outputPath: result.outputPath,
      });

      return {
        success: true,
        parsedScript,
        outputPath: result.outputPath,
        publishResults,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: 'Ошибка',
        error: errorMessage,
      });

      return {
        success: false,
        parsedScript: null,
        outputPath: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Генерирует видео из JSON-файла
   */
  async generateFromFile(
    filePath: string,
    options?: { publish?: boolean; platforms?: ('tiktok' | 'instagram' | 'youtube')[] }
  ): Promise<ReturnType<VideoGenerator['generate']>> {
    const { readFile } = await import('fs/promises');
    const content = await readFile(filePath, 'utf-8');
    const script = JSON.parse(content);
    
    // Поддержка как одного сценария, так и массива
    if (Array.isArray(script)) {
      // Генерируем только первый сценарий из массива
      return this.generate(script[0], options);
    }
    
    return this.generate(script, options);
  }

  /**
   * Сохраняет конфигурацию
   */
  async saveConfig(filePath: string): Promise<void> {
    await writeFile(filePath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Создаёт пример сценария
   */
  static createSampleScript(): VideoScript {
    return {
      id: 'sample-video-1',
      title: 'Тестовое видео',
      orientation: 'portrait',
      voice: 'ru-RU-SvetlanaNeural',
      script: `[Visual: beautiful sunset] Привет! Это тестовое видео, созданное автоматически.

[Visual: city skyline] Мы тестируем генератор видео.

[Visual: technology] Подписывайтесь на канал!`,
      tags: ['test', 'demo'],
      hashtags: ['#тест', '#демо'],
      description: 'Демонстрация работы генератора видео',
    };
  }
}

// Экспорт для удобства
export * from './types';
export * from './parser';
export * from './tts';
export * from './visual';
export * from './assembly';
export * from './publisher';
