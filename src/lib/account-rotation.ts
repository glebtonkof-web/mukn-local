// Account Rotation - Посменная работа аккаунтов с отдыхом
// Распределение нагрузки, тайм-ауты, восстановление

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface AccountShift {
  start: number; // час начала смены (0-23)
  end: number;   // час конца смены (0-23, может быть больше 23 для перехода через полночь)
  accountIds: string[];
  maxActionsPerShift: number;
  cooldownAfterShift: number; // ms - отдых после смены
}

export interface RotationConfig {
  shifts: AccountShift[];
  minRestBetweenActions: number; // ms - минимальный отдых между действиями
  maxActionsPerHour: number;
  restAfterConsecutiveActions: number; // ms - отдых после N действий подряд
  consecutiveActionThreshold: number; // количество действий подряд
  maxDailyActions: number;
  restAfterDailyLimit: number; // ms - отдых при достижении дневного лимита
}

export interface AccountState {
  id: string;
  status: 'active' | 'resting' | 'cooldown' | 'exhausted' | 'banned';
  currentShift: number | null;
  actionsInCurrentShift: number;
  actionsToday: number;
  lastActionAt: number | null;
  restUntil: number | null;
  totalActions: number;
  exhaustionLevel: number; // 0-100
}

export interface RotationStats {
  totalActions: number;
  actionsPerAccount: Record<string, number>;
  shiftUtilization: number[];
  averageRestTime: number;
  accountSwitches: number;
}

// ==================== КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ ====================

const DEFAULT_CONFIG: RotationConfig = {
  shifts: [
    { start: 8, end: 16, accountIds: [], maxActionsPerShift: 100, cooldownAfterShift: 3600000 },   // Утренняя смена
    { start: 16, end: 24, accountIds: [], maxActionsPerShift: 100, cooldownAfterShift: 3600000 },  // Вечерняя смена
    { start: 0, end: 8, accountIds: [], maxActionsPerShift: 50, cooldownAfterShift: 7200000 },     // Ночная смена
  ],
  minRestBetweenActions: 5000, // 5 секунд
  maxActionsPerHour: 20,
  restAfterConsecutiveActions: 60000, // 1 минута
  consecutiveActionThreshold: 5,
  maxDailyActions: 200,
  restAfterDailyLimit: 86400000, // 24 часа
};

// ==================== ACCOUNT ROTATION SERVICE ====================

class AccountRotationService extends EventEmitter {
  private config: RotationConfig;
  private accountStates: Map<string, AccountState> = new Map();
  private stats: RotationStats;
  private currentHour: number;
  private hourCheckInterval: NodeJS.Timeout | null = null;
  private actionQueue: Array<{
    accountId: string;
    action: () => Promise<any>;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config: Partial<RotationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentHour = new Date().getHours();
    this.stats = {
      totalActions: 0,
      actionsPerAccount: {},
      shiftUtilization: new Array(24).fill(0),
      averageRestTime: 0,
      accountSwitches: 0,
    };
    this.startHourCheck();
  }

  // Запуск проверки часа
  private startHourCheck(): void {
    this.hourCheckInterval = setInterval(() => {
      const newHour = new Date().getHours();
      if (newHour !== this.currentHour) {
        this.onHourChange(this.currentHour, newHour);
        this.currentHour = newHour;
      }
    }, 60000); // каждую минуту
  }

  // Обработка смены часа
  private onHourChange(oldHour: number, newHour: number): void {
    console.log(`[Rotation] Hour changed: ${oldHour} -> ${newHour}`);
    
    // Сброс дневных счётчиков в полночь
    if (newHour === 0) {
      this.resetDailyCounters();
    }
    
    // Проверка смен
    this.checkShiftChanges(newHour);
    
    this.emit('hour:changed', { oldHour, newHour });
  }

  // Сброс дневных счётчиков
  private resetDailyCounters(): void {
    for (const [id, state] of this.accountStates) {
      state.actionsToday = 0;
      if (state.status === 'exhausted') {
        state.status = 'resting';
        state.restUntil = Date.now() + 3600000; // 1 час отдыха
      }
    }
    console.log('[Rotation] Daily counters reset');
    this.emit('day:reset');
  }

  // Проверка смен
  private checkShiftChanges(currentHour: number): void {
    for (const shift of this.config.shifts) {
      const shiftStart = shift.start;
      const shiftEnd = shift.end;
      
      // Проверяем, началась ли смена
      const isActive = this.isShiftActive(shift, currentHour);
      
      for (const accountId of shift.accountIds) {
        const state = this.getOrCreateAccountState(accountId);
        
        if (isActive && state.currentShift === null) {
          // Смена началась
          state.currentShift = shiftStart;
          state.actionsInCurrentShift = 0;
          console.log(`[Rotation] Account ${accountId} started shift ${shiftStart}-${shiftEnd}`);
          this.emit('shift:started', { accountId, shift });
        } else if (!isActive && state.currentShift === shiftStart) {
          // Смена закончилась
          console.log(`[Rotation] Account ${accountId} ended shift ${shiftStart}-${shiftEnd}`);
          this.emit('shift:ended', { accountId, shift });
          
          state.currentShift = null;
          state.status = 'cooldown';
          state.restUntil = Date.now() + shift.cooldownAfterShift;
        }
      }
    }
  }

  // Проверка активности смены
  private isShiftActive(shift: AccountShift, hour: number): boolean {
    if (shift.start < shift.end) {
      return hour >= shift.start && hour < shift.end;
    } else {
      // Смена переходит через полночь
      return hour >= shift.start || hour < shift.end;
    }
  }

  // Получение или создание состояния аккаунта
  private getOrCreateAccountState(accountId: string): AccountState {
    if (!this.accountStates.has(accountId)) {
      this.accountStates.set(accountId, {
        id: accountId,
        status: 'resting',
        currentShift: null,
        actionsInCurrentShift: 0,
        actionsToday: 0,
        lastActionAt: null,
        restUntil: null,
        totalActions: 0,
        exhaustionLevel: 0,
      });
    }
    return this.accountStates.get(accountId)!;
  }

  // Регистрация аккаунта в системе ротации
  registerAccount(accountId: string, shifts?: number[]): void {
    const state = this.getOrCreateAccountState(accountId);
    
    if (shifts) {
      // Добавляем аккаунт в указанные смены
      for (const shiftStart of shifts) {
        const shift = this.config.shifts.find(s => s.start === shiftStart);
        if (shift && !shift.accountIds.includes(accountId)) {
          shift.accountIds.push(accountId);
        }
      }
    }
    
    console.log(`[Rotation] Account ${accountId} registered`);
    this.emit('account:registered', { accountId });
  }

  // Удаление аккаунта из ротации
  unregisterAccount(accountId: string): void {
    // Удаляем из всех смен
    for (const shift of this.config.shifts) {
      const index = shift.accountIds.indexOf(accountId);
      if (index > -1) {
        shift.accountIds.splice(index, 1);
      }
    }
    
    this.accountStates.delete(accountId);
    console.log(`[Rotation] Account ${accountId} unregistered`);
    this.emit('account:unregistered', { accountId });
  }

  // Получение активного аккаунта для действия
  getActiveAccount(): string | null {
    const currentHour = new Date().getHours();
    const availableAccounts: Array<{ id: string; priority: number }> = [];
    
    for (const shift of this.config.shifts) {
      if (!this.isShiftActive(shift, currentHour)) continue;
      
      for (const accountId of shift.accountIds) {
        const state = this.getOrCreateAccountState(accountId);
        
        // Проверяем готовность аккаунта
        if (this.isAccountReady(state, shift)) {
          // Приоритет: меньше действий = выше приоритет
          const priority = -state.actionsInCurrentShift;
          availableAccounts.push({ id: accountId, priority });
        }
      }
    }
    
    if (availableAccounts.length === 0) {
      return null;
    }
    
    // Сортируем по приоритету и выбираем
    availableAccounts.sort((a, b) => b.priority - a.priority);
    return availableAccounts[0].id;
  }

  // Проверка готовности аккаунта
  private isAccountReady(state: AccountState, shift: AccountShift): boolean {
    // Проверяем статус
    if (state.status === 'banned' || state.status === 'exhausted') {
      return false;
    }
    
    // Проверяем отдых
    if (state.restUntil && Date.now() < state.restUntil) {
      return false;
    }
    
    // Проверяем лимиты
    if (state.actionsInCurrentShift >= shift.maxActionsPerShift) {
      return false;
    }
    
    if (state.actionsToday >= this.config.maxDailyActions) {
      state.status = 'exhausted';
      return false;
    }
    
    // Проверяем минимальный отдых между действиями
    if (state.lastActionAt) {
      const timeSinceLastAction = Date.now() - state.lastActionAt;
      if (timeSinceLastAction < this.config.minRestBetweenActions) {
        return false;
      }
    }
    
    return true;
  }

  // Выполнение действия с автоматическим выбором аккаунта
  async executeWithRotation<T>(
    action: (accountId: string) => Promise<T>
  ): Promise<{ result: T; accountId: string }> {
    const accountId = this.getActiveAccount();
    
    if (!accountId) {
      throw new Error('No available accounts for rotation');
    }
    
    const state = this.getOrCreateAccountState(accountId);
    
    try {
      // Обновляем состояние перед действием
      state.lastActionAt = Date.now();
      state.status = 'active';
      
      // Выполняем действие
      const result = await action(accountId);
      
      // Обновляем статистику
      state.actionsInCurrentShift++;
      state.actionsToday++;
      state.totalActions++;
      this.stats.totalActions++;
      this.stats.actionsPerAccount[accountId] = (this.stats.actionsPerAccount[accountId] || 0) + 1;
      this.stats.shiftUtilization[this.currentHour]++;
      
      // Проверяем на необходимость отдыха
      if (state.actionsInCurrentShift % this.config.consecutiveActionThreshold === 0) {
        state.status = 'resting';
        state.restUntil = Date.now() + this.config.restAfterConsecutiveActions;
        console.log(`[Rotation] Account ${accountId} resting after ${state.actionsInCurrentShift} actions`);
      }
      
      // Увеличиваем уровень истощения
      state.exhaustionLevel = Math.min(100, state.exhaustionLevel + 1);
      
      this.emit('action:completed', { accountId, totalActions: state.totalActions });
      
      return { result, accountId };
    } catch (error) {
      // При ошибке - переводим аккаунт на отдых
      state.status = 'cooldown';
      state.restUntil = Date.now() + 300000; // 5 минут
      
      this.emit('action:failed', { accountId, error });
      throw error;
    }
  }

  // Ручной отдых аккаунта
  setAccountRest(accountId: string, durationMs: number): void {
    const state = this.getOrCreateAccountState(accountId);
    state.status = 'resting';
    state.restUntil = Date.now() + durationMs;
    
    console.log(`[Rotation] Account ${accountId} set to rest for ${durationMs}ms`);
    this.emit('account:resting', { accountId, duration: durationMs });
  }

  // Отметка аккаунта как забаненного
  markAccountBanned(accountId: string): void {
    const state = this.getOrCreateAccountState(accountId);
    state.status = 'banned';
    
    console.log(`[Rotation] Account ${accountId} marked as banned`);
    this.emit('account:banned', { accountId });
  }

  // Восстановление аккаунта
  recoverAccount(accountId: string): void {
    const state = this.getOrCreateAccountState(accountId);
    state.status = 'resting';
    state.restUntil = Date.now() + 3600000; // 1 час отдыха
    state.exhaustionLevel = Math.max(0, state.exhaustionLevel - 20);
    
    console.log(`[Rotation] Account ${accountId} recovered`);
    this.emit('account:recovered', { accountId });
  }

  // Получение состояния всех аккаунтов
  getAllAccountStates(): AccountState[] {
    return Array.from(this.accountStates.values());
  }

  // Получение состояния конкретного аккаунта
  getAccountState(accountId: string): AccountState | undefined {
    return this.accountStates.get(accountId);
  }

  // Получение статистики
  getStats(): RotationStats {
    return { ...this.stats };
  }

  // Получение конфигурации смен
  getShifts(): AccountShift[] {
    return this.config.shifts.map(shift => ({ ...shift }));
  }

  // Обновление конфигурации смен
  updateShifts(shifts: AccountShift[]): void {
    this.config.shifts = shifts;
    this.emit('shifts:updated', { shifts });
  }

  // Остановка сервиса
  stop(): void {
    if (this.hourCheckInterval) {
      clearInterval(this.hourCheckInterval);
      this.hourCheckInterval = null;
    }
  }
}

// ==================== SINGLETON ====================

let rotationInstance: AccountRotationService | null = null;

export function getAccountRotation(config?: Partial<RotationConfig>): AccountRotationService {
  if (!rotationInstance) {
    rotationInstance = new AccountRotationService(config);
  }
  return rotationInstance;
}

export const accountRotation = {
  registerAccount: (id: string, shifts?: number[]) => getAccountRotation().registerAccount(id, shifts),
  unregisterAccount: (id: string) => getAccountRotation().unregisterAccount(id),
  getActiveAccount: () => getAccountRotation().getActiveAccount(),
  executeWithRotation: <T>(action: (id: string) => Promise<T>) => 
    getAccountRotation().executeWithRotation(action),
  setAccountRest: (id: string, duration: number) => getAccountRotation().setAccountRest(id, duration),
  markAccountBanned: (id: string) => getAccountRotation().markAccountBanned(id),
  recoverAccount: (id: string) => getAccountRotation().recoverAccount(id),
  getAllAccountStates: () => getAccountRotation().getAllAccountStates(),
  getStats: () => getAccountRotation().getStats(),
  getShifts: () => getAccountRotation().getShifts(),
};
