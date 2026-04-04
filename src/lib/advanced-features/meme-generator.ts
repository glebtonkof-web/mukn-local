// Генерация мемов с текстом
// AI ищет популярный шаблон и вписывает свой текст

import { db } from '../db';
import { stockIntegration } from './stock-integration';

export interface MemeTemplate {
  id: string;
  name: string;
  imageUrl: string;
  textPositions: Array<{
    position: 'top' | 'bottom' | 'center';
    maxWidth: number;
    fontSize: number;
  }>;
}

export interface MemeConfig {
  topic: string;
  templateId?: string;
  topText?: string;
  bottomText?: string;
  autoGenerate?: boolean;
}

// Популярные шаблоны мемов
const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: 'drake',
    name: 'Drake Hotline Bling',
    imageUrl: 'https://i.imgflip.com/30b1gx.jpg',
    textPositions: [
      { position: 'top', maxWidth: 300, fontSize: 24 },
      { position: 'bottom', maxWidth: 300, fontSize: 24 },
    ],
  },
  {
    id: 'distracted',
    name: 'Distracted Boyfriend',
    imageUrl: 'https://i.imgflip.com/1ur9b0.jpg',
    textPositions: [
      { position: 'top', maxWidth: 300, fontSize: 24 },
    ],
  },
  {
    id: 'buttons',
    name: 'Two Buttons',
    imageUrl: 'https://i.imgflip.com/1g8my4.jpg',
    textPositions: [
      { position: 'top', maxWidth: 150, fontSize: 18 },
      { position: 'bottom', maxWidth: 150, fontSize: 18 },
    ],
  },
  {
    id: 'change-my-mind',
    name: 'Change My Mind',
    imageUrl: 'https://i.imgflip.com/24y43o.jpg',
    textPositions: [
      { position: 'center', maxWidth: 250, fontSize: 20 },
    ],
  },
  {
    id: 'expanding-brain',
    name: 'Expanding Brain',
    imageUrl: 'https://i.imgflip.com/1jwhww.jpg',
    textPositions: [
      { position: 'top', maxWidth: 300, fontSize: 16 },
      { position: 'bottom', maxWidth: 300, fontSize: 16 },
    ],
  },
];

class MemeGeneratorService {
  // Сгенерировать мем
  async generate(config: MemeConfig): Promise<{
    id: string;
    imageUrl: string;
    topText?: string;
    bottomText?: string;
  }> {
    let topText = config.topText;
    let bottomText = config.bottomText;
    let imageUrl = '';

    // Если нужно автогенерировать текст
    if (config.autoGenerate || (!topText && !bottomText)) {
      const generated = await this.generateMemeText(config.topic);
      topText = topText || generated.topText;
      bottomText = bottomText || generated.bottomText;
    }

    // Выбираем шаблон
    const template = config.templateId 
      ? MEME_TEMPLATES.find(t => t.id === config.templateId) || MEME_TEMPLATES[0]
      : MEME_TEMPLATES[Math.floor(Math.random() * MEME_TEMPLATES.length)];

    // Генерируем изображение с текстом
    try {
      imageUrl = await this.renderMeme(template, topText, bottomText, config.topic);
    } catch (error) {
      console.error('[MemeGenerator] Render error:', error);
      // Fallback - просто возвращаем шаблон
      imageUrl = template.imageUrl;
    }

    // Сохраняем в БД
    const meme = await db.generatedMeme.create({
      data: {
        templateId: template.id,
        templateName: template.name,
        topText,
        bottomText,
        imageUrl,
        topic: config.topic,
        aiPrompt: config.autoGenerate ? `Generate meme about ${config.topic}` : null,
        status: 'completed',
      },
    });

    return {
      id: meme.id,
      imageUrl: meme.imageUrl,
      topText: meme.topText || undefined,
      bottomText: meme.bottomText || undefined,
    };
  }

  // Генерация текста для мема
  private async generateMemeText(topic: string): Promise<{ topText: string; bottomText: string }> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const prompt = `Create a funny meme about "${topic}".

Requirements:
- Short punchy text (max 50 characters per line)
- Top text sets up the joke
- Bottom text delivers the punchline
- Make it relatable and shareable
- Use current internet humor style

Respond in JSON:
{
  "topText": "Setup line",
  "bottomText": "Punchline"
}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a meme expert with great sense of humor.' },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(content);
      return {
        topText: parsed.topText || `When someone mentions ${topic}`,
        bottomText: parsed.bottomText || 'Me: *interested*',
      };
    } catch {
      return {
        topText: `POV: ${topic}`,
        bottomText: 'When you realize...',
      };
    }
  }

  // Рендеринг мема (генерация изображения)
  private async renderMeme(
    template: MemeTemplate,
    topText?: string,
    bottomText?: string,
    topic?: string
  ): Promise<string> {
    // Используем AI для генерации изображения в стиле мема
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const prompt = `Meme image, ${topic || 'funny situation'} theme, 
${topText ? `with text "${topText}" at top,` : ''} 
${bottomText ? `with text "${bottomText}" at bottom,` : ''}
internet meme style, Impact font, white text with black outline, 
funny, shareable, social media format, 1:1 aspect ratio`;

    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    });

    const base64 = response.data[0]?.base64;
    if (!base64) {
      throw new Error('Failed to generate meme image');
    }

    return `data:image/png;base64,${base64}`;
  }

  // Получить список шаблонов
  getTemplates(): MemeTemplate[] {
    return MEME_TEMPLATES;
  }

  // Получить созданные мемы
  async getMemes(limit: number = 20): Promise<any[]> {
    return db.generatedMeme.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Получить конкретный мем
  async getMeme(id: string): Promise<any | null> {
    return db.generatedMeme.findUnique({ where: { id } });
  }

  // Обновить метрики
  async updateMetrics(id: string, metrics: { shares: number; likes: number }): Promise<void> {
    await db.generatedMeme.update({
      where: { id },
      data: {
        shares: { increment: metrics.shares },
        likes: { increment: metrics.likes },
      },
    });
  }

  // Пакетная генерация мемов
  async generateBatch(topics: string[]): Promise<Array<{
    id: string;
    imageUrl: string;
    topText?: string;
    bottomText?: string;
  }>> {
    const results: Array<{
      id: string;
      imageUrl: string;
      topText?: string;
      bottomText?: string;
    }> = [];

    for (const topic of topics) {
      try {
        const meme = await this.generate({
          topic,
          autoGenerate: true,
        });
        results.push(meme);

        // Небольшая задержка между генерациями
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[MemeGenerator] Failed to generate meme for "${topic}":`, error);
      }
    }

    return results;
  }
}

let memeGeneratorInstance: MemeGeneratorService | null = null;

export function getMemeGenerator(): MemeGeneratorService {
  if (!memeGeneratorInstance) {
    memeGeneratorInstance = new MemeGeneratorService();
  }
  return memeGeneratorInstance;
}

export const memeGenerator = {
  generate: (config: MemeConfig) => getMemeGenerator().generate(config),
  getTemplates: () => getMemeGenerator().getTemplates(),
  getMemes: (limit?: number) => getMemeGenerator().getMemes(limit),
  getMeme: (id: string) => getMemeGenerator().getMeme(id),
  updateMetrics: (id: string, metrics: { shares: number; likes: number }) => 
    getMemeGenerator().updateMetrics(id, metrics),
  generateBatch: (topics: string[]) => getMemeGenerator().generateBatch(topics),
};
