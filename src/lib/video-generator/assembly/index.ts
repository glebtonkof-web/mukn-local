// Video Assembly Module - Combine Audio, Video, Subtitles
// Использует FFmpeg для сборки видео

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ParsedScene, VIDEO_RESOLUTIONS } from '../types';

const execAsync = promisify(exec);

interface AssemblyConfig {
  outputDir: string;
  tempDir: string;
  fps: number;
  quality: 'low' | 'medium' | 'high';
  addSubtitles: boolean;
  orientation: 'portrait' | 'landscape' | 'square';
}

interface AssemblyResult {
  outputPath: string;
  duration: number;
  size: number;
}

/**
 * Проверяет, установлен ли FFmpeg
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Получает параметры качества для FFmpeg
 */
function getQualityParams(quality: 'low' | 'medium' | 'high'): string {
  const params = {
    low: '-crf 28 -preset ultrafast -b:v 1M',
    medium: '-crf 23 -preset medium -b:v 3M',
    high: '-crf 18 -preset slow -b:v 8M',
  };
  return params[quality];
}

/**
 * Создаёт SRT файл субтитров
 */
async function createSubtitlesFile(
  scenes: ParsedScene[],
  outputPath: string
): Promise<string> {
  let srtContent = '';
  let index = 1;
  let currentTime = 0;
  
  for (const scene of scenes) {
    const startTime = formatSRTTime(currentTime);
    const endTime = formatSRTTime(currentTime + scene.duration);
    
    // Разбиваем длинный текст на строки
    const lines = splitTextToLines(scene.text, 40);
    
    srtContent += `${index}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${lines.join('\n')}\n\n`;
    
    currentTime += scene.duration;
    index++;
  }
  
  await writeFile(outputPath, srtContent);
  return outputPath;
}

/**
 * Форматирует время для SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Разбивает текст на строки определённой длины
 */
function splitTextToLines(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLen) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Создаёт слайд-шоу из изображений
 */
async function createSlideshow(
  imagePaths: string[],
  audioPath: string,
  outputPath: string,
  config: AssemblyConfig
): Promise<string> {
  const res = VIDEO_RESOLUTIONS[config.orientation];
  const qualityParams = getQualityParams(config.quality);
  
  // Создаём файл со списком изображений
  const listPath = outputPath.replace('.mp4', '_images.txt');
  const imageDuration = 3; // секунды на изображение
  
  const listContent = imagePaths
    .map(p => `file '${p}'\nduration ${imageDuration}`)
    .join('\n');
  
  await writeFile(listPath, listContent);
  
  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -i "${audioPath}" \
    -vf "scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 ${qualityParams} -c:a aac -b:a 192k \
    -shortest -pix_fmt yuv420p \
    "${outputPath}"`;
  
  await execAsync(cmd, { timeout: 300000 });
  
  // Удаляем временный файл
  try { await unlink(listPath); } catch {}
  
  return outputPath;
}

/**
 * Объединяет видео и аудио в один файл
 */
async function combineVideoAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string,
  config: AssemblyConfig
): Promise<string> {
  const res = VIDEO_RESOLUTIONS[config.orientation];
  const qualityParams = getQualityParams(config.quality);
  
  const cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" \
    -vf "scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 ${qualityParams} -c:a aac -b:a 192k \
    -map 0:v:0 -map 1:a:0 \
    -shortest -pix_fmt yuv420p \
    "${outputPath}"`;
  
  await execAsync(cmd, { timeout: 300000 });
  
  return outputPath;
}

/**
 * Добавляет субтитры к видео
 */
async function addSubtitles(
  videoPath: string,
  subtitlesPath: string,
  outputPath: string,
  config: AssemblyConfig
): Promise<string> {
  const qualityParams = getQualityParams(config.quality);
  
  // Стиль субтитров
  const subtitleStyle = `ForceStyle='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BackColour=&H80000000,BorderStyle=3,Outline=2,Shadow=1'`;
  
  const cmd = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${subtitlesPath}':${subtitleStyle}" \
    -c:v libx264 ${qualityParams} -c:a copy \
    "${outputPath}"`;
  
  await execAsync(cmd, { timeout: 300000 });
  
  return outputPath;
}

/**
 * Склеивает несколько видео в одно
 */
async function concatVideos(
  videoPaths: string[],
  outputPath: string,
  config: AssemblyConfig
): Promise<string> {
  if (videoPaths.length === 0) {
    throw new Error('No videos to concatenate');
  }
  
  if (videoPaths.length === 1) {
    return videoPaths[0];
  }
  
  const res = VIDEO_RESOLUTIONS[config.orientation];
  const qualityParams = getQualityParams(config.quality);
  
  // Создаём файл со списком видео
  const listPath = outputPath.replace('.mp4', '_list.txt');
  const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(listPath, listContent);
  
  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" \
    -vf "scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 ${qualityParams} -c:a aac -b:a 192k \
    "${outputPath}"`;
  
  await execAsync(cmd, { timeout: 600000 });
  
  // Удаляем временный файл
  try { await unlink(listPath); } catch {}
  
  return outputPath;
}

/**
 * Создаёт видео из одной сцены
 */
async function createSceneVideo(
  scene: ParsedScene,
  config: AssemblyConfig
): Promise<string> {
  const res = VIDEO_RESOLUTIONS[config.orientation];
  const qualityParams = getQualityParams(config.quality);
  const outputPath = path.join(config.tempDir, `${scene.id}_final.mp4`);
  
  // Если есть и видео и аудио
  if (scene.visualPath && scene.audioPath) {
    // Создаём видео с зацикливанием если видео короче аудио
    const cmd = `ffmpeg -y -stream_loop -1 -i "${scene.visualPath}" -i "${scene.audioPath}" \
      -vf "scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2" \
      -c:v libx264 ${qualityParams} -c:a aac -b:a 192k \
      -map 0:v:0 -map 1:a:0 \
      -shortest -pix_fmt yuv420p \
      "${outputPath}"`;
    
    await execAsync(cmd, { timeout: 300000 });
    return outputPath;
  }
  
  // Если есть только аудио - создаём видео с цветным фоном
  if (scene.audioPath) {
    const cmd = `ffmpeg -y -f lavfi -i color=c=black:s=${res.width}x${res.height}:d=${scene.duration}:r=${config.fps} \
      -i "${scene.audioPath}" \
      -vf "drawtext=text='${scene.text.replace(/'/g, "\\'")}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
      -c:v libx264 ${qualityParams} -c:a aac -b:a 192k \
      -shortest -pix_fmt yuv420p \
      "${outputPath}"`;
    
    await execAsync(cmd, { timeout: 300000 });
    return outputPath;
  }
  
  throw new Error(`Scene ${scene.id} has no audio or visual`);
}

/**
 * Собирает финальное видео из всех сцен
 */
export async function assembleVideo(
  scenes: ParsedScene[],
  title: string,
  config: AssemblyConfig,
  onProgress?: (stage: string, progress: number) => void
): Promise<AssemblyResult> {
  // Проверяем FFmpeg
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    throw new Error('FFmpeg is not installed. Please install FFmpeg to continue.');
  }
  
  // Создаём директории
  if (!existsSync(config.outputDir)) {
    await mkdir(config.outputDir, { recursive: true });
  }
  if (!existsSync(config.tempDir)) {
    await mkdir(config.tempDir, { recursive: true });
  }
  
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9а-яёА-ЯЁ\s-]/g, '').slice(0, 50);
  const timestamp = Date.now();
  const finalOutput = path.join(config.outputDir, `${sanitizedTitle}_${timestamp}.mp4`);
  
  onProgress?.('preparing', 10);
  
  // Генерируем видео для каждой сцены
  const sceneVideos: string[] = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    onProgress?.('scenes', 10 + (i / scenes.length) * 60);
    
    try {
      const sceneVideo = await createSceneVideo(scene, config);
      sceneVideos.push(sceneVideo);
    } catch (error) {
      console.error(`Failed to create video for scene ${scene.id}:`, error);
    }
  }
  
  if (sceneVideos.length === 0) {
    throw new Error('No scene videos were created');
  }
  
  onProgress?.('concatenating', 75);
  
  // Склеиваем все видео
  if (sceneVideos.length === 1) {
    // Копируем файл
    const { stdout } = await execAsync(`cp "${sceneVideos[0]}" "${finalOutput}"`);
  } else {
    await concatVideos(sceneVideos, finalOutput, config);
  }
  
  onProgress?.('subtitles', 85);
  
  // Добавляем субтитры если нужно
  if (config.addSubtitles) {
    const subtitlesPath = path.join(config.tempDir, 'subtitles.srt');
    await createSubtitlesFile(scenes, subtitlesPath);
    
    const withSubtitlesPath = finalOutput.replace('.mp4', '_subtitled.mp4');
    
    try {
      await addSubtitles(finalOutput, subtitlesPath, withSubtitlesPath, config);
      // Заменяем оригинал
      await execAsync(`mv "${withSubtitlesPath}" "${finalOutput}"`);
    } catch (error) {
      console.error('Failed to add subtitles:', error);
      // Продолжаем без субтитров
    }
    
    // Удаляем временные файлы
    try { await unlink(subtitlesPath); } catch {}
  }
  
  onProgress?.('cleanup', 95);
  
  // Удаляем временные видео сцен
  for (const video of sceneVideos) {
    try { await unlink(video); } catch {}
  }
  
  // Получаем информацию о файле
  const { stdout: durationOut } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalOutput}"`
  );
  const duration = parseFloat(durationOut) || 0;
  
  const { stdout: sizeOut } = await execAsync(
    `stat -c%s "${finalOutput}" 2>/dev/null || stat -f%z "${finalOutput}"`
  );
  const size = parseInt(sizeOut) || 0;
  
  onProgress?.('complete', 100);
  
  return {
    outputPath: finalOutput,
    duration,
    size,
  };
}

/**
 * Получает информацию о видео файле
 */
export async function getVideoInfo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  size: number;
}> {
  const { stdout: probeOut } = await execAsync(
    `ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate -of json "${filePath}"`
  );
  
  const info = JSON.parse(probeOut);
  const stream = info.streams?.[0] || {};
  const format = info.format || {};
  
  const fpsParts = (stream.r_frame_rate || '30/1').split('/');
  const fps = parseInt(fpsParts[0]) / parseInt(fpsParts[1] || '1');
  
  return {
    duration: parseFloat(format.duration) || 0,
    width: stream.width || 0,
    height: stream.height || 0,
    fps: fps || 30,
    size: parseInt(format.size) || 0,
  };
}
