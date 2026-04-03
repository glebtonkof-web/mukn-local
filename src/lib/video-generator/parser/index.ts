// Script Parser Module
// Парсит JSON-сценарии и разбивает на сцены

import { VideoScript, ParsedScript, ParsedScene } from '../types';
import { randomUUID } from 'crypto';

/**
 * Извлекает визуальные теги из текста
 * Формат: [Visual: описание] или [Visual: "описание с пробелами"]
 */
function extractVisualTag(text: string): { visualQuery: string | null; cleanText: string } {
  // Паттерн для [Visual: ...]
  const visualPattern = /\[Visual:\s*([^\]]+)\]/gi;
  const matches = text.matchAll(visualPattern);
  
  const visualQueries: string[] = [];
  let cleanText = text;
  
  for (const match of matches) {
    visualQueries.push(match[1].trim());
    cleanText = cleanText.replace(match[0], '').trim();
  }
  
  return {
    visualQuery: visualQueries.length > 0 ? visualQueries.join(', ') : null,
    cleanText: cleanText.replace(/\s+/g, ' ').trim(),
  };
}

/**
 * Оценивает длительность текста в секундах
 * Примерно 150 слов в минуту для русского языка
 */
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const wordsPerSecond = 2.5; // 150 слов в минуту
  const minDuration = 2; // Минимум 2 секунды на сцену
  return Math.max(minDuration, Math.ceil(words / wordsPerSecond));
}

/**
 * Разбивает текст на сцены по различным разделителям
 */
function splitIntoScenes(text: string): string[] {
  // Сначала пробуем разбить по явным маркерам сцен
  const sceneMarkers = text.split(/\[Scene\]|\[Сцена\]/gi);
  
  if (sceneMarkers.length > 1) {
    return sceneMarkers.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // Затем по двойным переносам строк (абзацы)
  const paragraphs = text.split(/\n\s*\n/);
  if (paragraphs.length > 1) {
    return paragraphs.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // Если есть визуальные теги, разбиваем по ним
  const visualSplit = text.split(/(?=\[Visual:)/gi);
  if (visualSplit.length > 1) {
    return visualSplit.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // Иначе весь текст как одна сцена
  return [text.trim()];
}

/**
 * Парсит JSON-сценарий в структурированный формат
 */
export function parseScript(script: VideoScript): ParsedScript {
  const scenes: ParsedScene[] = [];
  const rawScenes = splitIntoScenes(script.script);
  
  let totalDuration = 0;
  
  for (let i = 0; i < rawScenes.length; i++) {
    const sceneText = rawScenes[i];
    const { visualQuery, cleanText } = extractVisualTag(sceneText);
    
    if (cleanText.length === 0) continue;
    
    const duration = estimateDuration(cleanText);
    totalDuration += duration;
    
    scenes.push({
      id: `scene-${i + 1}`,
      text: cleanText,
      visualQuery,
      duration,
    });
  }
  
  // Если сцен нет, создаём одну из всего текста
  if (scenes.length === 0) {
    const { visualQuery, cleanText } = extractVisualTag(script.script);
    const duration = estimateDuration(cleanText);
    totalDuration = duration;
    
    scenes.push({
      id: 'scene-1',
      text: cleanText,
      visualQuery,
      duration,
    });
  }
  
  return {
    id: script.id,
    title: script.title,
    orientation: script.orientation,
    voice: script.voice,
    scenes,
    totalDuration,
    tags: script.tags,
    hashtags: script.hashtags,
    description: script.description,
  };
}

/**
 * Парсит массив сценариев
 */
export function parseScripts(scripts: VideoScript[]): ParsedScript[] {
  return scripts.map(parseScript);
}

/**
 * Валидирует JSON-сценарий
 */
export function validateScript(script: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!script || typeof script !== 'object') {
    return { valid: false, errors: ['Script must be an object'] };
  }
  
  const s = script as Record<string, unknown>;
  
  if (!s.id || typeof s.id !== 'string') {
    errors.push('Missing or invalid "id" field');
  }
  
  if (!s.title || typeof s.title !== 'string') {
    errors.push('Missing or invalid "title" field');
  }
  
  if (!s.script || typeof s.script !== 'string') {
    errors.push('Missing or invalid "script" field');
  }
  
  if (s.orientation && !['portrait', 'landscape', 'square'].includes(s.orientation as string)) {
    errors.push('Invalid "orientation" - must be portrait, landscape, or square');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Создаёт тестовый сценарий
 */
export function createTestScript(): VideoScript {
  return {
    id: 'test-video-1',
    title: 'Как заработать на крипте в 2026? Топ-3 монеты',
    orientation: 'portrait',
    voice: 'ru-RU-SvetlanaNeural',
    script: `[Visual: bitcoin chart growth] Привет, друзья! Сегодня разберём три монеты, которые могут выстрелить в 2026.

[Visual: solana logo] Первая — Solana. Она уже показала рост 200% за месяц и продолжает расти.

[Visual: ethereum logo] Вторая — Ethereum. После обновления сети транзакции стали быстрее и дешевле.

[Visual: checklist] Подписывайся на мой Telegram-канал — ссылка в описании! Там больше секретов крипты.`,
    tags: ['crypto', 'investment', '2026'],
    hashtags: ['#крипта', '#инвестиции', '#биткоин', '#solana'],
    description: 'Обзор перспективных криптовалют на 2026 год',
  };
}

/**
 * Создаёт несколько тестовых сценариев
 */
export function createTestScripts(): VideoScript[] {
  return [
    createTestScript(),
    {
      id: 'test-video-2',
      title: '5 приложений для продуктивности',
      orientation: 'portrait',
      voice: 'ru-RU-DmitryNeural',
      script: `[Visual: smartphone apps] Привет! Сегодня покажу 5 приложений, которые изменят твою продуктивность.

[Visual: notion app] Первое — Notion. Идеально для заметок и планирования.

[Visual: todoist app] Второе — Todoist. Лучший таск-менеджер на рынке.

[Visual: forest app] Третье — Forest. Помогает не отвлекаться от работы.

[Visual: calendar app] Четвёртое — Google Calendar. Классика для планирования.

[Visual: subscribe button] Подпишись на канал, чтобы не пропустить новые видео!`,
      tags: ['productivity', 'apps', 'tips'],
      hashtags: ['#продуктивность', '#приложения', '#лайфхаки'],
    },
  ];
}
