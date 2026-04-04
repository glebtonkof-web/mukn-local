// Создание интерактивных опросов
// DeepSeek придумывает тему и варианты

import { db } from '../db';
import { nanoid } from 'nanoid';

export interface PollOption {
  text: string;
  imageUrl?: string;
}

export interface PollConfig {
  platform: 'telegram' | 'instagram' | 'vk';
  topic?: string;
  niche?: string;
  optionsCount?: number;
  allowMultiple?: boolean;
  anonymous?: boolean;
  duration?: number; // часы
}

class InteractivePollsService {
  // Сгенерировать опрос
  async generate(config: PollConfig): Promise<{
    id: string;
    question: string;
    options: PollOption[];
    aiPrompt: string;
  }> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const optionsCount = config.optionsCount || 4;

    // Генерируем вопрос и варианты
    const prompt = `Create an engaging poll for ${config.platform} ${config.topic ? `about "${config.topic}"` : ''}.
${config.niche ? `Niche: ${config.niche}` : ''}

Requirements:
- Question should be engaging and encourage participation
- Exactly ${optionsCount} answer options
- Options should be balanced and interesting
- Make it viral-friendly

Respond in JSON format:
{
  "question": "Your engaging question here?",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "reasoning": "Why this poll will engage users"
}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a social media engagement expert specializing in viral polls.' },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';

    let question = 'What do you think?';
    let options: string[] = ['Yes', 'No', 'Maybe', 'Not sure'];

    try {
      const parsed = JSON.parse(content);
      question = parsed.question || question;
      options = parsed.options?.slice(0, optionsCount) || options;
    } catch {
      // Используем дефолтные значения
    }

    // Сохраняем в БД
    const poll = await db.interactivePoll.create({
      data: {
        id: nanoid(),
        title: question.substring(0, 100),
        question,
        options: JSON.stringify(options.map(o => ({ text: o }))),
        platform: config.platform,
        allowMultiple: config.allowMultiple || false,
        anonymous: config.anonymous ?? true,
        duration: config.duration || 24,
        status: 'draft',
        aiGenerated: true,
        aiPrompt: prompt,
        updatedAt: new Date(),
      },
    });

    return {
      id: poll.id,
      question,
      options: options.map(text => ({ text })),
      aiPrompt: prompt,
    };
  }

  // Получить опрос
  async getPoll(id: string): Promise<any | null> {
    return db.interactivePoll.findUnique({ where: { id } });
  }

  // Активировать опрос
  async activate(id: string): Promise<void> {
    await db.interactivePoll.update({
      where: { id },
      data: {
        status: 'active',
      },
    });
  }

  // Записать голос
  async recordVote(id: string, optionIndex: number): Promise<void> {
    const poll = await db.interactivePoll.findUnique({ where: { id } });
    if (!poll) return;

    const results = poll.results ? JSON.parse(poll.results) : {};
    results[optionIndex] = (results[optionIndex] || 0) + 1;

    await db.interactivePoll.update({
      where: { id },
      data: {
        totalVotes: { increment: 1 },
        results: JSON.stringify(results),
      },
    });
  }

  // Закрыть опрос
  async close(id: string): Promise<void> {
    await db.interactivePoll.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });
  }

  // Получить результаты
  async getResults(id: string): Promise<{
    question: string;
    totalVotes: number;
    results: Record<number, number>;
    winner: { optionIndex: number; percentage: number };
  }> {
    const poll = await db.interactivePoll.findUnique({ where: { id } });
    if (!poll) {
      return {
        question: '',
        totalVotes: 0,
        results: {},
        winner: { optionIndex: 0, percentage: 0 },
      };
    }

    const results = poll.results ? JSON.parse(poll.results) : {};
    const options: string[] = JSON.parse(poll.options).map((o: any) => o.text);

    // Находим победителя
    let winnerIndex = 0;
    let winnerVotes = 0;
    Object.entries(results).forEach(([index, votes]) => {
      if ((votes as number) > winnerVotes) {
        winnerVotes = votes as number;
        winnerIndex = parseInt(index);
      }
    });

    const winnerPercentage = poll.totalVotes > 0 
      ? (winnerVotes / poll.totalVotes) * 100 
      : 0;

    return {
      question: poll.question,
      totalVotes: poll.totalVotes,
      results,
      winner: {
        optionIndex: winnerIndex,
        percentage: winnerPercentage,
      },
    };
  }

  // Форматировать для Telegram
  formatForTelegram(id: string): Promise<string> {
    return this.getPoll(id).then(poll => {
      if (!poll) return '';
      
      const options = JSON.parse(poll.options);
      const lines = [
        `📊 *${poll.question}*`,
        '',
        ...options.map((o: any, i: number) => `${i + 1}. ${o.text}`),
        '',
        `_Reply with the number of your choice_`,
      ];
      
      return lines.join('\n');
    });
  }

  // Получить историю опросов
  async getHistory(limit: number = 20): Promise<any[]> {
    return db.interactivePoll.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

let pollsInstance: InteractivePollsService | null = null;

export function getInteractivePolls(): InteractivePollsService {
  if (!pollsInstance) {
    pollsInstance = new InteractivePollsService();
  }
  return pollsInstance;
}

export const interactivePolls = {
  generate: (config: PollConfig) => getInteractivePolls().generate(config),
  get: (id: string) => getInteractivePolls().getPoll(id),
  activate: (id: string) => getInteractivePolls().activate(id),
  vote: (id: string, optionIndex: number) => getInteractivePolls().recordVote(id, optionIndex),
  close: (id: string) => getInteractivePolls().close(id),
  results: (id: string) => getInteractivePolls().getResults(id),
  formatTelegram: (id: string) => getInteractivePolls().formatForTelegram(id),
  history: (limit?: number) => getInteractivePolls().getHistory(limit),
};
