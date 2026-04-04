// Timezone Distribution - Учёт локального времени аккаунтов
// Естественное поведение на основе часового пояса

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface TimezoneAccount {
  id: string;
  timezone: string;
  status: 'active' | 'sleeping' | 'waking';
  lastActivity: number | null;
  activitySchedule: {
    wakeHour: number; // час пробуждения (0-23)
    sleepHour: number; // час засыпания (0-23)
    peakHours: number[]; // часы пиковой активности
  };
}

export interface TimezoneConfig {
  defaultWakeHour: number;
  defaultSleepHour: number;
  minActivityRatio: number; // минимальная доля активных аккаунтов
  respectWeekends: boolean;
  weekendDelayMultiplier: number;
  checkInterval: number; // ms
}

export interface TimezoneStats {
  totalAccounts: number;
  activeAccounts: number;
  sleepingAccounts: number;
  byTimezone: Record<string, { total: number; active: number }>;
  currentPeakTimezones: string[];
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: TimezoneConfig = {
  defaultWakeHour: 8,
  defaultSleepHour: 23,
  minActivityRatio: 0.3, // минимум 30% аккаунтов активны
  respectWeekends: true,
  weekendDelayMultiplier: 1.5,
  checkInterval: 60000, // 1 минута
};

// ==================== TIMEZONE DISTRIBUTOR ====================

class TimezoneDistributionService extends EventEmitter {
  private config: TimezoneConfig;
  private accounts: Map<string, TimezoneAccount> = new Map();
  private stats: TimezoneStats;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<TimezoneConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalAccounts: 0,
      activeAccounts: 0,
      sleepingAccounts: 0,
      byTimezone: {},
      currentPeakTimezones: [],
    };
    this.startPeriodicCheck();
  }

  // Запуск периодической проверки
  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(() => {
      this.updateAllAccountStatuses();
    }, this.config.checkInterval);
  }

  // Регистрация аккаунта
  registerAccount(
    id: string,
    timezone: string,
    schedule?: Partial<TimezoneAccount['activitySchedule']>
  ): void {
    const account: TimezoneAccount = {
      id,
      timezone,
      status: 'active',
      lastActivity: null,
      activitySchedule: {
        wakeHour: schedule?.wakeHour ?? this.config.defaultWakeHour,
        sleepHour: schedule?.sleepHour ?? this.config.defaultSleepHour,
        peakHours: schedule?.peakHours ?? [9, 12, 18, 21],
      },
    };
    
    this.accounts.set(id, account);
    this.updateStats();
    
    console.log(`[Timezone] Account ${id} registered with timezone ${timezone}`);
    this.emit('account:registered', { account });
  }

  // Удаление аккаунта
  unregisterAccount(id: string): void {
    this.accounts.delete(id);
    this.updateStats();
    this.emit('account:unregistered', { id });
  }

  // Обновление статусов всех аккаунтов
  private updateAllAccountStatuses(): void {
    for (const [id, account] of this.accounts) {
      const previousStatus = account.status;
      const isActive = this.isAccountActive(account);
      
      account.status = isActive ? 'active' : 'sleeping';
      
      if (account.status !== previousStatus) {
        this.emit('account:status:changed', { 
          id, 
          from: previousStatus, 
          to: account.status 
        });
      }
    }
    
    this.updateStats();
    this.updatePeakTimezones();
  }

  // Проверка активности аккаунта
  isAccountActive(account: TimezoneAccount): boolean {
    const localTime = this.getLocalTime(account.timezone);
    const hour = localTime.getHours();
    const dayOfWeek = localTime.getDay();
    
    const { wakeHour, sleepHour } = account.activitySchedule;
    
    // Проверка выходных
    if (this.config.respectWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      // На выходных аккаунты "просыпаются" позже
      return hour >= wakeHour + 1 && hour < sleepHour - 1;
    }
    
    // Обычная проверка
    if (wakeHour <= sleepHour) {
      return hour >= wakeHour && hour < sleepHour;
    } else {
      // Переход через полночь
      return hour >= wakeHour || hour < sleepHour;
    }
  }

  // Получение локального времени
  getLocalTime(timezone: string): Date {
    const now = new Date();
    
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(now);
      const partsMap: Record<string, string> = {};
      for (const part of parts) {
        partsMap[part.type] = part.value;
      }
      
      return new Date(
        parseInt(partsMap.year),
        parseInt(partsMap.month) - 1,
        parseInt(partsMap.day),
        parseInt(partsMap.hour),
        parseInt(partsMap.minute),
        parseInt(partsMap.second)
      );
    } catch {
      // Fallback: используем UTC
      return now;
    }
  }

  // Получение активных аккаунтов
  getActiveAccounts(): TimezoneAccount[] {
    return Array.from(this.accounts.values()).filter(a => a.status === 'active');
  }

  // Получение аккаунтов для действия
  getAccountsForAction(count: number = 1): TimezoneAccount[] {
    const activeAccounts = this.getActiveAccounts();
    
    if (activeAccounts.length === 0) {
      // Если нет активных - принудительно "будим" минимум
      const forced = this.forceWakeMinimum(count);
      return forced;
    }
    
    // Сортируем по времени последней активности
    activeAccounts.sort((a, b) => {
      const aTime = a.lastActivity || 0;
      const bTime = b.lastActivity || 0;
      return aTime - bTime; // Сначала те, кто давно неактивен
    });
    
    // Приоритизируем аккаунты в пиковые часы
    const inPeakHours = activeAccounts.filter(a => this.isPeakHour(a));
    const notInPeakHours = activeAccounts.filter(a => !this.isPeakHour(a));
    
    // Возвращаем с приоритетом пиковых часов
    const result = [...inPeakHours, ...notInPeakHours].slice(0, count);
    
    // Обновляем время последней активности
    const now = Date.now();
    for (const account of result) {
      account.lastActivity = now;
    }
    
    return result;
  }

  // Принудительное пробуждение минимума аккаунтов
  private forceWakeMinimum(count: number): TimezoneAccount[] {
    const allAccounts = Array.from(this.accounts.values());
    const result: TimezoneAccount[] = [];
    
    // Выбираем аккаунты с наименьшим "истощением"
    for (const account of allAccounts) {
      if (result.length >= count) break;
      account.status = 'waking';
      result.push(account);
    }
    
    if (result.length > 0) {
      console.log(`[Timezone] Force woke ${result.length} accounts`);
      this.emit('accounts:force-woken', { count: result.length });
    }
    
    return result;
  }

  // Проверка пикового часа
  private isPeakHour(account: TimezoneAccount): boolean {
    const localTime = this.getLocalTime(account.timezone);
    const hour = localTime.getHours();
    return account.activitySchedule.peakHours.includes(hour);
  }

  // Обновление статистики
  private updateStats(): void {
    const accounts = Array.from(this.accounts.values());
    
    this.stats.totalAccounts = accounts.length;
    this.stats.activeAccounts = accounts.filter(a => a.status === 'active').length;
    this.stats.sleepingAccounts = accounts.filter(a => a.status === 'sleeping').length;
    
    // По часовым поясам
    this.stats.byTimezone = {};
    for (const account of accounts) {
      if (!this.stats.byTimezone[account.timezone]) {
        this.stats.byTimezone[account.timezone] = { total: 0, active: 0 };
      }
      this.stats.byTimezone[account.timezone].total++;
      if (account.status === 'active') {
        this.stats.byTimezone[account.timezone].active++;
      }
    }
  }

  // Обновление пиковых часовых поясов
  private updatePeakTimezones(): void {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // Часовые пояса, где сейчас оптимальное время (18:00-22:00 местного)
    const peakTimezones: string[] = [];
    
    for (const [tz] of Object.entries(this.stats.byTimezone)) {
      try {
        const localTime = this.getLocalTime(tz);
        const localHour = localTime.getHours();
        
        if (localHour >= 18 && localHour <= 22) {
          peakTimezones.push(tz);
        }
      } catch {
        // Skip invalid timezone
      }
    }
    
    this.stats.currentPeakTimezones = peakTimezones;
  }

  // Расчёт задержки на основе часового пояса
  getDelayForAccount(accountId: string): number {
    const account = this.accounts.get(accountId);
    if (!account) return 5000; // Default 5 sec
    
    const localTime = this.getLocalTime(account.timezone);
    const hour = localTime.getHours();
    const dayOfWeek = localTime.getDay();
    
    let baseDelay = 5000;
    
    // Ночная активность (менее естественная - больше задержка)
    if (hour < 6 || hour >= 22) {
      baseDelay *= 3;
    }
    
    // Выходные
    if (this.config.respectWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      baseDelay *= this.config.weekendDelayMultiplier;
    }
    
    // Пиковые часы (меньше задержка - более активны)
    if (this.isPeakHour(account)) {
      baseDelay *= 0.5;
    }
    
    // Случайный джиттер
    const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1);
    
    return Math.max(1000, baseDelay + jitter);
  }

  // Получение лучшего времени для публикации
  getBestPublishTime(accountId: string): Date {
    const account = this.accounts.get(accountId);
    if (!account) return new Date();
    
    const localTime = this.getLocalTime(account.timezone);
    const { peakHours, wakeHour, sleepHour } = account.activitySchedule;
    
    // Находим ближайший пиковый час
    let bestHour = peakHours[0] || wakeHour + 2;
    
    const currentHour = localTime.getHours();
    
    // Если текущий час до пикового - используем первый пик
    if (currentHour < bestHour) {
      // Уже сегодня
    } else {
      // Ищем следующий пик или берём первый на завтра
      const nextPeak = peakHours.find(h => h > currentHour);
      if (nextPeak) {
        bestHour = nextPeak;
      } else {
        bestHour = peakHours[0];
        // На завтра
        localTime.setDate(localTime.getDate() + 1);
      }
    }
    
    localTime.setHours(bestHour, Math.floor(Math.random() * 60), 0, 0);
    
    return localTime;
  }

  // Получение статистики
  getStats(): TimezoneStats {
    return { ...this.stats };
  }

  // Получение аккаунта
  getAccount(id: string): TimezoneAccount | undefined {
    return this.accounts.get(id);
  }

  // Получение всех аккаунтов
  getAllAccounts(): TimezoneAccount[] {
    return Array.from(this.accounts.values());
  }

  // Остановка сервиса
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// ==================== SINGLETON ====================

let timezoneInstance: TimezoneDistributionService | null = null;

export function getTimezoneDistribution(config?: Partial<TimezoneConfig>): TimezoneDistributionService {
  if (!timezoneInstance) {
    timezoneInstance = new TimezoneDistributionService(config);
  }
  return timezoneInstance;
}

export const timezoneDistribution = {
  registerAccount: (id: string, tz: string, schedule?: Partial<TimezoneAccount['activitySchedule']>) =>
    getTimezoneDistribution().registerAccount(id, tz, schedule),
  unregisterAccount: (id: string) => getTimezoneDistribution().unregisterAccount(id),
  getActiveAccounts: () => getTimezoneDistribution().getActiveAccounts(),
  getAccountsForAction: (count?: number) => getTimezoneDistribution().getAccountsForAction(count),
  getLocalTime: (tz: string) => getTimezoneDistribution().getLocalTime(tz),
  getDelayForAccount: (id: string) => getTimezoneDistribution().getDelayForAccount(id),
  getBestPublishTime: (id: string) => getTimezoneDistribution().getBestPublishTime(id),
  getStats: () => getTimezoneDistribution().getStats(),
};
