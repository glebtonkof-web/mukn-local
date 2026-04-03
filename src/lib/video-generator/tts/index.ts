// TTS Module - Text-to-Speech Generation
// Использует edge-tts через Python или z-ai-web-dev-sdk

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, access } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ParsedScene, VoiceInfo, EDGE_TTS_VOICES } from '../types';
import ZAI from 'z-ai-web-dev-sdk';

const execAsync = promisify(exec);

const TTS_ENGINE = 'edge-tts'; // 'edge-tts' | 'zai-sdk'

/**
 * Проверяет, установлен ли edge-tts
 */
export async function checkEdgeTTS(): Promise<boolean> {
  try {
    await execAsync('python3 -c "import edge_tts; print(edge_tts.__version__)"');
    return true;
  } catch {
    try {
      await execAsync('python -c "import edge_tts; print(edge_tts.__version__)"');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Генерирует озвучку через edge-tts (Python)
 */
async function generateEdgeTTS(
  text: string,
  voice: string,
  outputPath: string
): Promise<{ duration: number }> {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  // Экранируем кавычки в тексте
  const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
  
  const script = `
import asyncio
import edge_tts

async def main():
    communicate = edge_tts.Communicate("${escapedText}", "${voice}")
    await communicate.save("${outputPath}")
    print("OK")

asyncio.run(main())
`;

  const scriptPath = outputPath.replace('.mp3', '_script.py');
  await writeFile(scriptPath, script);
  
  try {
    const { stdout, stderr } = await execAsync(
      `${pythonCmd} "${scriptPath}"`,
      { timeout: 60000 }
    );
    
    if (stderr && !stderr.includes('OK')) {
      throw new Error(`Edge-TTS error: ${stderr}`);
    }
    
    // Оценка длительности
    const words = text.split(/\s+/).length;
    const duration = Math.ceil(words / 2.5);
    
    return { duration };
  } finally {
    // Удаляем временный скрипт
    try {
      await execAsync(`rm "${scriptPath}"`);
    } catch {}
  }
}

/**
 * Генерирует озвучку через z-ai-web-dev-sdk (fallback)
 */
async function generateZAITTS(
  text: string,
  voice: string,
  outputPath: string
): Promise<{ duration: number }> {
  const zai = await ZAI.create();
  
  // Маппинг голосов edge-tts на голоса zai
  const voiceMap: Record<string, string> = {
    'ru-RU-SvetlanaNeural': 'tongtong',
    'ru-RU-DmitryNeural': 'xiaochen',
    'en-US-JennyNeural': 'tongtong',
    'en-US-GuyNeural': 'jam',
    'default': 'tongtong',
  };
  
  const zaiVoice = voiceMap[voice] || voiceMap['default'];
  
  const response = await zai.audio.tts.create({
    input: text.slice(0, 1024), // Максимум 1024 символа
    voice: zaiVoice,
    speed: 1.0,
    response_format: 'wav',
    stream: false,
  });
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));
  
  await writeFile(outputPath, buffer);
  
  // Оценка длительности
  const words = text.split(/\s+/).length;
  const duration = Math.ceil(words / 2.5);
  
  return { duration };
}

/**
 * Генерирует озвучку для одной сцены
 */
export async function generateSceneAudio(
  scene: ParsedScene,
  voice: string,
  outputDir: string
): Promise<{ audioPath: string; duration: number }> {
  // Создаём директорию если её нет
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  
  const audioPath = path.join(outputDir, `${scene.id}.mp3`);
  
  // Проверяем, есть ли уже сгенерированный файл
  try {
    await access(audioPath);
    const words = scene.text.split(/\s+/).length;
    return { audioPath, duration: Math.ceil(words / 2.5) };
  } catch {}
  
  let duration: number;
  
  if (TTS_ENGINE === 'edge-tts') {
    const hasEdgeTTS = await checkEdgeTTS();
    
    if (hasEdgeTTS) {
      const result = await generateEdgeTTS(scene.text, voice, audioPath);
      duration = result.duration;
    } else {
      // Fallback на z-ai-sdk
      const wavPath = audioPath.replace('.mp3', '.wav');
      const result = await generateZAITTS(scene.text, voice, wavPath);
      duration = result.duration;
      return { audioPath: wavPath, duration };
    }
  } else {
    const wavPath = audioPath.replace('.mp3', '.wav');
    const result = await generateZAITTS(scene.text, voice, wavPath);
    duration = result.duration;
    return { audioPath: wavPath, duration };
  }
  
  return { audioPath, duration };
}

/**
 * Генерирует озвучку для всех сцен
 */
export async function generateAllAudio(
  scenes: ParsedScene[],
  voice: string,
  outputDir: string,
  onProgress?: (current: number, total: number) => void
): Promise<ParsedScene[]> {
  const results: ParsedScene[] = [];
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    
    if (onProgress) {
      onProgress(i + 1, scenes.length);
    }
    
    try {
      const { audioPath, duration } = await generateSceneAudio(scene, voice, outputDir);
      
      results.push({
        ...scene,
        audioPath,
        duration,
      });
    } catch (error) {
      console.error(`Failed to generate audio for scene ${scene.id}:`, error);
      results.push(scene);
    }
  }
  
  return results;
}

/**
 * Получает список доступных голосов
 */
export function getAvailableVoices(): VoiceInfo[] {
  return EDGE_TTS_VOICES;
}

/**
 * Устанавливает edge-tts если не установлен
 */
export async function installEdgeTTS(): Promise<boolean> {
  try {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    await execAsync(`${pythonCmd} -m pip install edge-tts`);
    return true;
  } catch (error) {
    console.error('Failed to install edge-tts:', error);
    return false;
  }
}
