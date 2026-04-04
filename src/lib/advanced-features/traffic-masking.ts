// Маскировка трафика под реального пользователя
// Случайные User-Agent, задержки, движения мыши

import { db } from '../db';
import { nanoid } from 'nanoid';

export interface MaskingProfile {
  id?: string;
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  language: string;
  timezone: string;
  avgTypingSpeed: number;
  avgReadingTime: number;
  mouseMovements: boolean;
  randomScrolls: boolean;
  minDelay: number;
  maxDelay: number;
}

export interface BrowserFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  language: string;
  timezone: string;
  platform: string;
  webgl: string;
  fonts: string[];
  canvas: string;
  audioContext: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

const TIMEZONES = [
  'Europe/Moscow', 'Europe/Kiev', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore',
];

const LANGUAGES = [
  'ru-RU', 'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'zh-CN',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 2560, height: 1440 },
];

class TrafficMaskingService {
  private currentProfile: MaskingProfile | null = null;
  private sessionActivity: { lastAction: Date; actionCount: number } = {
    lastAction: new Date(),
    actionCount: 0,
  };

  // Создать случайный профиль маскировки
  async createRandomProfile(name?: string): Promise<MaskingProfile> {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const viewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
    const language = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
    const timezone = TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];

    const profile: MaskingProfile = {
      name: name || `Profile_${Date.now()}`,
      userAgent,
      viewport,
      language,
      timezone,
      avgTypingSpeed: 30 + Math.floor(Math.random() * 70), // 30-100 символов/мин
      avgReadingTime: 2000 + Math.floor(Math.random() * 6000), // 2-8 секунд
      mouseMovements: Math.random() > 0.2,
      randomScrolls: Math.random() > 0.3,
      minDelay: 800 + Math.floor(Math.random() * 700),
      maxDelay: 3000 + Math.floor(Math.random() * 4000),
    };

    const saved = await db.trafficMasking.create({
      data: {
        id: nanoid(),
        name: profile.name,
        userAgent: profile.userAgent,
        viewport: JSON.stringify(profile.viewport),
        language: profile.language,
        timezone: profile.timezone,
        avgTypingSpeed: profile.avgTypingSpeed,
        avgReadingTime: profile.avgReadingTime,
        mouseMovements: profile.mouseMovements,
        randomScrolls: profile.randomScrolls,
        minDelay: profile.minDelay,
        maxDelay: profile.maxDelay,
        updatedAt: new Date(),
      },
    });

    return { ...profile, id: saved.id };
  }

  // Получить профиль для использования
  async getProfile(profileId?: string): Promise<MaskingProfile> {
    if (profileId) {
      const saved = await db.trafficMasking.findUnique({ where: { id: profileId } });
      if (saved) {
        return {
          id: saved.id,
          name: saved.name,
          userAgent: saved.userAgent,
          viewport: JSON.parse(saved.viewport || '{"width":1920,"height":1080}'),
          language: saved.language,
          timezone: saved.timezone,
          avgTypingSpeed: saved.avgTypingSpeed,
          avgReadingTime: saved.avgReadingTime,
          mouseMovements: saved.mouseMovements,
          randomScrolls: saved.randomScrolls,
          minDelay: saved.minDelay,
          maxDelay: saved.maxDelay,
        };
      }
    }

    // Получить случайный активный профиль
    const profiles = await db.trafficMasking.findMany({
      where: { isActive: true },
      take: 10,
    });

    if (profiles.length > 0) {
      const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
      await db.trafficMasking.update({
        where: { id: randomProfile.id },
        data: { usageCount: { increment: 1 } },
      });

      return {
        id: randomProfile.id,
        name: randomProfile.name,
        userAgent: randomProfile.userAgent,
        viewport: JSON.parse(randomProfile.viewport || '{"width":1920,"height":1080}'),
        language: randomProfile.language,
        timezone: randomProfile.timezone,
        avgTypingSpeed: randomProfile.avgTypingSpeed,
        avgReadingTime: randomProfile.avgReadingTime,
        mouseMovements: randomProfile.mouseMovements,
        randomScrolls: randomProfile.randomScrolls,
        minDelay: randomProfile.minDelay,
        maxDelay: randomProfile.maxDelay,
      };
    }

    // Создать новый профиль если нет активных
    return this.createRandomProfile();
  }

  // Сгенерировать случайную задержку
  getRandomDelay(profile?: MaskingProfile): number {
    const minDelay = profile?.minDelay || 1000;
    const maxDelay = profile?.maxDelay || 5000;
    
    // Используем нормальное распределение для более естественных задержек
    const mean = (minDelay + maxDelay) / 2;
    const stdDev = (maxDelay - minDelay) / 4;
    
    let delay = mean + (Math.random() - 0.5) * 2 * stdDev;
    delay = Math.max(minDelay, Math.min(maxDelay, delay));
    
    return Math.round(delay);
  }

  // Сгенерировать задержку для печати
  getTypingDelay(profile: MaskingProfile): number {
    const baseDelay = 60000 / profile.avgTypingSpeed; // мс на символ
    const variation = baseDelay * 0.3; // ±30% вариация
    return Math.round(baseDelay + (Math.random() - 0.5) * 2 * variation);
  }

  // Сгенерировать движения мыши
  generateMouseMovements(startX: number, startY: number, endX: number, endY: number): Array<{ x: number; y: number; delay: number }> {
    const movements: Array<{ x: number; y: number; delay: number }> = [];
    const steps = 5 + Math.floor(Math.random() * 10);
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const noise = {
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 50,
      };
      
      movements.push({
        x: Math.round(startX + (endX - startX) * progress + noise.x),
        y: Math.round(startY + (endY - startY) * progress + noise.y),
        delay: 20 + Math.floor(Math.random() * 80),
      });
    }
    
    return movements;
  }

  // Сгенерировать прокрутку страницы
  generateScrollMovements(totalHeight: number): Array<{ y: number; delay: number }> {
    const scrolls: Array<{ y: number; delay: number }> = [];
    const scrollSteps = Math.ceil(totalHeight / 300);
    
    for (let i = 0; i < scrollSteps; i++) {
      const baseY = Math.min(300 * (i + 1), totalHeight);
      const noise = Math.floor((Math.random() - 0.5) * 100);
      
      scrolls.push({
        y: baseY + noise,
        delay: 500 + Math.floor(Math.random() * 1500),
      });
      
      // Случайная пауза при чтении
      if (Math.random() > 0.7) {
        scrolls.push({
          y: baseY + noise,
          delay: 1000 + Math.floor(Math.random() * 3000),
        });
      }
    }
    
    return scrolls;
  }

  // Генерация полного отпечатка браузера
  generateBrowserFingerprint(profile: MaskingProfile): BrowserFingerprint {
    return {
      userAgent: profile.userAgent,
      viewport: profile.viewport,
      language: profile.language,
      timezone: profile.timezone,
      platform: profile.userAgent.includes('Windows') ? 'Win32' :
                profile.userAgent.includes('Mac') ? 'MacIntel' :
                profile.userAgent.includes('Linux') ? 'Linux x86_64' : 'Win32',
      webgl: this.generateWebGLHash(),
      fonts: this.getRandomFonts(),
      canvas: this.generateCanvasHash(),
      audioContext: this.generateAudioHash(),
    };
  }

  // Записать активность сессии
  recordActivity(): void {
    this.sessionActivity.lastAction = new Date();
    this.sessionActivity.actionCount++;
  }

  // Проверить, нужна ли пауза (имитация усталости пользователя)
  needsBreak(): boolean {
    const timeSinceLastAction = Date.now() - this.sessionActivity.lastAction.getTime();
    const actionsInSession = this.sessionActivity.actionCount;
    
    // После 20-50 действий делаем длинную паузу
    if (actionsInSession > 20 + Math.floor(Math.random() * 30)) {
      return true;
    }
    
    return false;
  }

  // Получить длительность паузы
  getBreakDuration(): number {
    // Пауза от 1 до 5 минут
    return 60000 + Math.floor(Math.random() * 240000);
  }

  // Сбросить сессию
  resetSession(): void {
    this.sessionActivity = {
      lastAction: new Date(),
      actionCount: 0,
    };
  }

  // Приватные методы для генерации хешей
  private generateWebGLHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 8; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private getRandomFonts(): string[] {
    const fonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
      'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Courier New',
    ];
    const count = 5 + Math.floor(Math.random() * 5);
    return fonts.sort(() => Math.random() - 0.5).slice(0, count);
  }

  private generateCanvasHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 40; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private generateAudioHash(): string {
    return `${35 + Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 100)}`;
  }
}

let trafficMaskingInstance: TrafficMaskingService | null = null;

export function getTrafficMasking(): TrafficMaskingService {
  if (!trafficMaskingInstance) {
    trafficMaskingInstance = new TrafficMaskingService();
  }
  return trafficMaskingInstance;
}

export const trafficMasking = {
  createProfile: (name?: string) => getTrafficMasking().createRandomProfile(name),
  getProfile: (profileId?: string) => getTrafficMasking().getProfile(profileId),
  getRandomDelay: (profile?: MaskingProfile) => getTrafficMasking().getRandomDelay(profile),
  getTypingDelay: (profile: MaskingProfile) => getTrafficMasking().getTypingDelay(profile),
  generateMouseMovements: (sx: number, sy: number, ex: number, ey: number) => 
    getTrafficMasking().generateMouseMovements(sx, sy, ex, ey),
  generateScrollMovements: (height: number) => getTrafficMasking().generateScrollMovements(height),
  generateFingerprint: (profile: MaskingProfile) => getTrafficMasking().generateBrowserFingerprint(profile),
  recordActivity: () => getTrafficMasking().recordActivity(),
  needsBreak: () => getTrafficMasking().needsBreak(),
  getBreakDuration: () => getTrafficMasking().getBreakDuration(),
  resetSession: () => getTrafficMasking().resetSession(),
};
