/**
 * Prompt Variator - Создание вариаций промтов для разнообразия контента
 */

import { getZAI } from '@/lib/z-ai';
import {
  PromptConfig,
  PromptVariationConfig,
  ContentType,
} from './types';

// Слова для контекста по категориям
const CONTEXT_WORDS: Record<string, string[]> = {
  lifestyle: ['уютный', 'теплый', 'атмосферный', 'уют', 'дом', 'комфорт', 'расслабляющий'],
  nature: ['природа', 'лес', 'море', 'горы', 'закат', 'рассвет', 'пейзаж'],
  technology: ['современный', 'технологичный', 'инновационный', 'цифровой', 'будущее'],
  fashion: ['стильный', 'элегантный', 'модный', 'трендовый', 'шикарный'],
  food: ['вкусный', 'аппетитный', 'изысканный', 'гастрономический'],
  travel: ['путешествие', 'приключение', 'открытие', 'исследование', 'дорога'],
  fitness: ['спорт', 'тренировка', 'здоровье', 'энергия', 'сила'],
  beauty: ['красота', 'уход', 'нежный', 'сияющий', 'преображение'],
  business: ['успех', 'рост', 'развитие', 'прогресс', 'достижение'],
  entertainment: ['развлечение', 'веселье', 'игра', 'праздник', 'радость'],
};

// Стили по умолчанию
const DEFAULT_STYLES: Record<ContentType, string[]> = {
  video: ['кинематографичный', 'динамичный', 'атмосферный', 'эпичный', 'минималистичный'],
  image: ['реалистичный', 'художественный', 'фотографичный', 'абстрактный', 'современный'],
  text: ['информативный', 'увлекательный', 'эмоциональный', 'экспертный', 'дружелюбный'],
  audio: ['мелодичный', 'энергичный', 'спокойный', 'атмосферный', 'динамичный'],
};

// Тональности
const TONES = [
  'дружелюбный',
  'профессиональный',
  'игривый',
  'серьезный',
  'вдохновляющий',
  'информативный',
  'эмоциональный',
  'нейтральный',
];

/**
 * Класс для создания вариаций промтов
 */
export class PromptVariator {
  private zai: any = null;
  private defaultConfig: PromptVariationConfig = {
    enabled: true,
    style: 'ai',
    useAI: true,
    variationIntensity: 0.5,
    preserveKeywords: [],
    contextWords: [],
    temperature: 0.7,
  };

  async initialize() {
    if (!this.zai) {
      this.zai = await getZAI();
    }
  }

  /**
   * Создать вариацию промта
   */
  async vary(
    originalPrompt: string,
    contentType: ContentType,
    config?: Partial<PromptVariationConfig>
  ): Promise<string> {
    const finalConfig = { ...this.defaultConfig, ...config };

    if (!finalConfig.enabled) {
      return originalPrompt;
    }

    switch (finalConfig.style) {
      case 'ai':
        return this.aiVariation(originalPrompt, contentType, finalConfig);
      case 'template':
        return this.templateVariation(originalPrompt, contentType, finalConfig);
      case 'random':
        return this.randomVariation(originalPrompt, contentType, finalConfig);
      case 'mixed':
        return this.mixedVariation(originalPrompt, contentType, finalConfig);
      default:
        return originalPrompt;
    }
  }

  /**
   * AI вариация с помощью LLM
   */
  private async aiVariation(
    prompt: string,
    contentType: ContentType,
    config: PromptVariationConfig
  ): Promise<string> {
    try {
      await this.initialize();

      const intensityDesc = config.variationIntensity < 0.3
        ? 'минимально измени'
        : config.variationIntensity < 0.6
        ? 'умеренно измени'
        : 'значительно измени';

      const systemPrompt = `Ты - эксперт по созданию промтов для генерации ${contentType === 'video' ? 'видео' : contentType === 'image' ? 'изображений' : contentType === 'text' ? 'текста' : 'аудио'} контента.
Твоя задача - создать вариацию промта, сохраняя основной смысл, но добавляя разнообразие.
${config.preserveKeywords.length > 0 ? `Обязательно сохрани эти ключевые слова: ${config.preserveKeywords.join(', ')}` : ''}`;

      const userPrompt = `${intensityDesc} следующий промт для генерации ${contentType}, сохраняя его суть:

"${prompt}"

${config.contextWords.length > 0 ? `Можешь использовать контекстные слова: ${config.contextWords.join(', ')}` : ''}

Верни только новый промт без объяснений.`;

      const completion = await this.zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature || 0.7,
        max_tokens: 500,
      });

      const variedPrompt = completion.choices[0]?.message?.content?.trim() || prompt;
      return variedPrompt;
    } catch (error) {
      console.error('AI variation failed:', error);
      return prompt;
    }
  }

  /**
   * Вариация по шаблонам
   */
  private templateVariation(
    prompt: string,
    contentType: ContentType,
    config: PromptVariationConfig
  ): string {
    const styles = DEFAULT_STYLES[contentType];
    const tones = TONES;

    // Добавляем случайный стиль
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomTone = tones[Math.floor(Math.random() * tones.length)];

    // Выбираем случайные контекстные слова
    const contextWord = config.contextWords.length > 0
      ? config.contextWords[Math.floor(Math.random() * config.contextWords.length)]
      : '';

    // Формируем вариацию
    const prefixes = [
      `${randomStyle} ${contentType}: `,
      `${randomTone} стиль: `,
      contextWord ? `${contextWord}, ` : '',
      '',
    ];

    const suffixes = [
      `, ${randomStyle} стиль`,
      `, ${randomTone} тональность`,
      contextWord ? `, с акцентом на ${contextWord}` : '',
      '',
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    // Применяем вариацию
    let variedPrompt = prompt;
    if (prefix && !prompt.toLowerCase().startsWith(prefix.toLowerCase())) {
      variedPrompt = prefix + variedPrompt;
    }
    if (suffix && !prompt.toLowerCase().endsWith(suffix.toLowerCase())) {
      variedPrompt = variedPrompt + suffix;
    }

    return variedPrompt;
  }

  /**
   * Случайная вариация (добавление элементов)
   */
  private randomVariation(
    prompt: string,
    contentType: ContentType,
    config: PromptVariationConfig
  ): string {
    const variations: string[] = [];

    // Выбираем случайную категорию контекстных слов
    const categories = Object.keys(CONTEXT_WORDS);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const words = CONTEXT_WORDS[randomCategory];

    // Добавляем 1-3 случайных слова
    const numWords = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numWords && words.length > 0; i++) {
      const idx = Math.floor(Math.random() * words.length);
      variations.push(words[idx]);
      words.splice(idx, 1);
    }

    // Добавляем стиль
    const styles = DEFAULT_STYLES[contentType];
    const style = styles[Math.floor(Math.random() * styles.length)];
    variations.push(style);

    // Формируем итоговый промт
    const additions = variations.slice(0, Math.ceil(config.variationIntensity * variations.length));
    if (additions.length > 0) {
      return `${prompt}, ${additions.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Смешанная вариация (AI + шаблоны)
   */
  private async mixedVariation(
    prompt: string,
    contentType: ContentType,
    config: PromptVariationConfig
  ): Promise<string> {
    // Сначала применяем шаблонную вариацию
    let variedPrompt = this.templateVariation(prompt, contentType, config);

    // Затем применяем AI вариацию с меньшей интенсивностью
    const aiConfig = { ...config, variationIntensity: config.variationIntensity * 0.5 };
    variedPrompt = await this.aiVariation(variedPrompt, contentType, aiConfig);

    return variedPrompt;
  }

  /**
   * Создать несколько вариаций
   */
  async createVariations(
    prompt: string,
    contentType: ContentType,
    count: number = 3,
    config?: Partial<PromptVariationConfig>
  ): Promise<string[]> {
    const variations: string[] = [prompt]; // Оригинал всегда включаем

    for (let i = 1; i < count; i++) {
      const varied = await this.vary(prompt, contentType, config);
      if (varied !== prompt) {
        variations.push(varied);
      }
    }

    return variations;
  }

  /**
   * Улучшить промт для конкретного типа контента
   */
  async enhanceForContentType(
    prompt: string,
    contentType: ContentType
  ): Promise<string> {
    try {
      await this.initialize();

      const enhancements: Record<ContentType, string> = {
        video: 'Добавь детали о движении, динамике, ракурсах и transitions',
        image: 'Добавь детали о композиции, освещении, цветовой палитре',
        text: 'Добавь детали о структуре, тональности, ключевых моментах',
        audio: 'Добавь детали о темпе, ритме, настроении, инструментах',
      };

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Ты - эксперт по созданию промтов для ${contentType} контента. Улучшай промты, делая их более детальными и эффективными.`,
          },
          {
            role: 'user',
            content: `Улучши этот промт для генерации ${contentType}: "${prompt}". ${enhancements[contentType]}. Верни только улучшенный промт.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content?.trim() || prompt;
    } catch (error) {
      console.error('Prompt enhancement failed:', error);
      return prompt;
    }
  }

  /**
   * Анализировать промт и предложить улучшения
   */
  async analyzePrompt(
    prompt: string,
    contentType: ContentType
  ): Promise<{
    quality: number;
    suggestions: string[];
    improvedPrompt: string;
  }> {
    try {
      await this.initialize();

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Ты - эксперт по анализу промтов для ${contentType} контента. Оцени качество промта по шкале 1-10, предложи улучшения и предоставь улучшенную версию.`,
          },
          {
            role: 'user',
            content: `Проанализируй этот промт для генерации ${contentType}: "${prompt}"

Верни JSON в формате:
{
  "quality": <число от 1 до 10>,
  "suggestions": ["предложение1", "предложение2"],
  "improvedPrompt": "улучшенный промт"
}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        quality: 5,
        suggestions: ['Не удалось проанализировать промт'],
        improvedPrompt: prompt,
      };
    } catch (error) {
      console.error('Prompt analysis failed:', error);
      return {
        quality: 5,
        suggestions: [],
        improvedPrompt: prompt,
      };
    }
  }
}

// Singleton
let variatorInstance: PromptVariator | null = null;

export function getPromptVariator(): PromptVariator {
  if (!variatorInstance) {
    variatorInstance = new PromptVariator();
  }
  return variatorInstance;
}

export default PromptVariator;
