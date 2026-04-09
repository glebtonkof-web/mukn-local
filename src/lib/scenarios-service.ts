// Scenarios System - Запись и воспроизведение макросов
// Пользователь записывает последовательность действий, софт повторяет

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface ScenarioAction {
  id: string;
  type: ScenarioActionType;
  timestamp: number;
  params: Record<string, any>;
  result?: any;
  error?: string;
}

export type ScenarioActionType = 
  | 'navigate'
  | 'click'
  | 'type'
  | 'select'
  | 'wait'
  | 'generate_content'
  | 'publish_post'
  | 'create_story'
  | 'schedule_post'
  | 'add_account'
  | 'switch_account'
  | 'ai_request'
  | 'api_call'
  | 'custom';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'publishing' | 'accounts' | 'analytics' | 'custom';
  actions: ScenarioAction[];
  variables: ScenarioVariable[];
  schedule?: ScenarioSchedule;
  status: 'draft' | 'recording' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  runCount: number;
  errorCount: number;
  metadata: {
    platform?: string;
    niche?: string;
    estimatedDuration?: number; // ms
  };
}

export interface ScenarioVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'account' | 'influencer';
  defaultValue?: any;
  required: boolean;
  description?: string;
  options?: string[]; // для type: 'select'
}

export interface ScenarioSchedule {
  enabled: boolean;
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';
  time?: string; // HH:MM
  daysOfWeek?: number[]; // 0-6
  dayOfMonth?: number; // 1-31
  cronExpression?: string;
  nextRunAt?: number;
}

export interface ScenarioRunResult {
  scenarioId: string;
  success: boolean;
  startTime: number;
  endTime: number;
  actionsCompleted: number;
  actionsFailed: number;
  error?: string;
  outputs: Record<string, any>;
}

export interface ScenarioConfig {
  maxActionsPerScenario: number;
  maxConcurrentRuns: number;
  defaultTimeout: number; // ms
  recordingDelay: number; // ms - задержка при записи
  autoSaveInterval: number; // ms
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: ScenarioConfig = {
  maxActionsPerScenario: 100,
  maxConcurrentRuns: 5,
  defaultTimeout: 30000,
  recordingDelay: 100,
  autoSaveInterval: 10000,
};

// ==================== SCENARIOS SERVICE ====================

class ScenariosService extends EventEmitter {
  private config: ScenarioConfig;
  private scenarios: Map<string, Scenario> = new Map();
  private recordingScenario: Scenario | null = null;
  private runningScenarios: Map<string, AbortController> = new Map();
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map();
  private actionHandlers: Map<ScenarioActionType, (params: any) => Promise<any>> = new Map();

  constructor(config: Partial<ScenarioConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultHandlers();
  }

  // Регистрация стандартных обработчиков
  private registerDefaultHandlers(): void {
    // Navigate
    this.registerHandler('navigate', async (params) => {
      console.log(`[Scenario] Navigate to: ${params.url}`);
      return { navigated: true, url: params.url };
    });

    // Click
    this.registerHandler('click', async (params) => {
      console.log(`[Scenario] Click on: ${params.selector}`);
      return { clicked: true, selector: params.selector };
    });

    // Type
    this.registerHandler('type', async (params) => {
      console.log(`[Scenario] Type into: ${params.selector}`);
      return { typed: true, text: params.text };
    });

    // Wait
    this.registerHandler('wait', async (params) => {
      const duration = params.duration || 1000;
      await new Promise(resolve => setTimeout(resolve, duration));
      return { waited: true, duration };
    });

    // Generate content
    this.registerHandler('generate_content', async (params) => {
      // Вызов AI для генерации
      const { getZAI } = await import('@/lib/z-ai');
      const zai = await getZAI();
      
      const response = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: params.systemPrompt || 'You are a content creator.' },
          { role: 'user', content: params.prompt },
        ],
      });
      
      return { 
        generated: true, 
        content: response.choices[0]?.message?.content,
      };
    });

    // Publish post
    this.registerHandler('publish_post', async (params) => {
      console.log(`[Scenario] Publish post to: ${params.platform}`);
      return { 
        published: true, 
        postId: `post-${Date.now()}`,
        platform: params.platform,
      };
    });

    // API call
    this.registerHandler('api_call', async (params) => {
      const response = await fetch(params.url, {
        method: params.method || 'GET',
        headers: params.headers,
        body: params.body ? JSON.stringify(params.body) : undefined,
      });
      
      const data = await response.json();
      return { success: response.ok, data };
    });
  }

  // Регистрация обработчика действия
  registerHandler(type: ScenarioActionType, handler: (params: any) => Promise<any>): void {
    this.actionHandlers.set(type, handler);
  }

  // Создание нового сценария
  createScenario(
    name: string,
    description: string,
    category: Scenario['category']
  ): Scenario {
    const scenario: Scenario = {
      id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      actions: [],
      variables: [],
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      runCount: 0,
      errorCount: 0,
      metadata: {},
    };
    
    this.scenarios.set(scenario.id, scenario);
    this.emit('scenario:created', { scenario });
    
    return scenario;
  }

  // Начало записи сценария
  startRecording(name: string, category: Scenario['category'] = 'custom'): Scenario {
    if (this.recordingScenario) {
      throw new Error('Already recording a scenario');
    }
    
    const scenario = this.createScenario(name, 'Recorded scenario', category);
    scenario.status = 'recording';
    this.recordingScenario = scenario;
    
    console.log(`[Scenario] Started recording: ${name}`);
    this.emit('recording:started', { scenario });
    
    return scenario;
  }

  // Запись действия
  recordAction(type: ScenarioActionType, params: Record<string, any>): ScenarioAction | null {
    if (!this.recordingScenario) {
      console.warn('[Scenario] No active recording');
      return null;
    }
    
    if (this.recordingScenario.actions.length >= this.config.maxActionsPerScenario) {
      console.warn('[Scenario] Max actions reached');
      this.stopRecording();
      return null;
    }
    
    const action: ScenarioAction = {
      id: `action-${Date.now()}`,
      type,
      timestamp: Date.now(),
      params,
    };
    
    this.recordingScenario.actions.push(action);
    this.recordingScenario.updatedAt = Date.now();
    
    this.emit('action:recorded', { action, scenario: this.recordingScenario });
    
    return action;
  }

  // Остановка записи
  stopRecording(): Scenario | null {
    if (!this.recordingScenario) {
      return null;
    }
    
    const scenario = this.recordingScenario;
    scenario.status = 'ready';
    scenario.metadata.estimatedDuration = this.calculateEstimatedDuration(scenario);
    this.recordingScenario = null;
    
    console.log(`[Scenario] Stopped recording: ${scenario.name}`);
    this.emit('recording:stopped', { scenario });
    
    return scenario;
  }

  // Расчёт примерной длительности
  private calculateEstimatedDuration(scenario: Scenario): number {
    let duration = 0;
    for (const action of scenario.actions) {
      if (action.type === 'wait' && action.params.duration) {
        duration += action.params.duration;
      } else {
        duration += 1000; // По умолчанию 1 сек на действие
      }
    }
    return duration;
  }

  // Добавление переменной
  addVariable(scenarioId: string, variable: ScenarioVariable): void {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    
    scenario.variables.push(variable);
    scenario.updatedAt = Date.now();
    this.emit('variable:added', { scenario, variable });
  }

  // Установка расписания
  setSchedule(scenarioId: string, schedule: ScenarioSchedule): void {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    
    scenario.schedule = schedule;
    scenario.updatedAt = Date.now();
    
    // Отменяем старый таймер
    const oldTimer = this.scheduledTimers.get(scenarioId);
    if (oldTimer) {
      clearTimeout(oldTimer);
    }
    
    // Устанавливаем новый
    if (schedule.enabled) {
      this.scheduleNextRun(scenario);
    }
    
    this.emit('schedule:set', { scenario, schedule });
  }

  // Планирование следующего запуска
  private scheduleNextRun(scenario: Scenario): void {
    if (!scenario.schedule?.enabled) return;
    
    const now = Date.now();
    let nextRun: number;
    
    switch (scenario.schedule.type) {
      case 'once':
        // Парсим время
        const [hours, minutes] = (scenario.schedule.time || '09:00').split(':').map(Number);
        nextRun = new Date().setHours(hours, minutes, 0, 0);
        if (nextRun < now) nextRun += 86400000; // На завтра
        break;
        
      case 'daily':
        const [h, m] = (scenario.schedule.time || '09:00').split(':').map(Number);
        nextRun = new Date().setHours(h, m, 0, 0);
        while (nextRun < now) nextRun += 86400000;
        break;
        
      case 'weekly':
        // TODO: Implement weekly scheduling
        nextRun = now + 86400000;
        break;
        
      default:
        nextRun = now + 3600000; // Через час
    }
    
    scenario.schedule.nextRunAt = nextRun;
    
    const delay = nextRun - now;
    const timer = setTimeout(() => {
      this.runScenario(scenario.id);
      this.scheduleNextRun(scenario);
    }, delay);
    
    this.scheduledTimers.set(scenario.id, timer);
    
    console.log(`[Scenario] Scheduled: ${scenario.name} at ${new Date(nextRun).toISOString()}`);
  }

  // Запуск сценария
  async runScenario(
    scenarioId: string,
    variables?: Record<string, any>
  ): Promise<ScenarioRunResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    
    if (scenario.status === 'running') {
      throw new Error(`Scenario already running: ${scenarioId}`);
    }
    
    scenario.status = 'running';
    scenario.lastRunAt = Date.now();
    scenario.runCount++;
    
    const abortController = new AbortController();
    this.runningScenarios.set(scenarioId, abortController);
    
    const result: ScenarioRunResult = {
      scenarioId,
      success: true,
      startTime: Date.now(),
      endTime: 0,
      actionsCompleted: 0,
      actionsFailed: 0,
      outputs: {},
    };
    
    console.log(`[Scenario] Running: ${scenario.name}`);
    this.emit('scenario:started', { scenario });
    
    try {
      // Подставляем переменные
      const resolvedVariables = this.resolveVariables(scenario, variables);
      
      // Выполняем действия
      for (const action of scenario.actions) {
        if (abortController.signal.aborted) {
          throw new Error('Scenario aborted');
        }
        
        const resolvedParams = this.resolveParams(action.params, resolvedVariables);
        
        this.emit('action:executing', { scenario, action });
        
        try {
          const handler = this.actionHandlers.get(action.type);
          if (!handler) {
            throw new Error(`No handler for action type: ${action.type}`);
          }
          
          action.result = await handler(resolvedParams);
          result.actionsCompleted++;
          
          this.emit('action:completed', { scenario, action });
          
          // Задержка между действиями
          if (this.config.recordingDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.recordingDelay));
          }
        } catch (error) {
          action.error = error instanceof Error ? error.message : String(error);
          result.actionsFailed++;
          
          this.emit('action:failed', { scenario, action, error });
          
          // Можно добавить логику продолжения при ошибке
          throw error;
        }
      }
      
      scenario.status = 'completed';
      result.endTime = Date.now();
      
      console.log(`[Scenario] Completed: ${scenario.name} (${result.actionsCompleted} actions)`);
      this.emit('scenario:completed', { scenario, result });
    } catch (error) {
      scenario.status = 'error';
      scenario.errorCount++;
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      result.endTime = Date.now();
      
      console.error(`[Scenario] Failed: ${scenario.name}`, result.error);
      this.emit('scenario:failed', { scenario, result, error });
    } finally {
      this.runningScenarios.delete(scenarioId);
    }
    
    return result;
  }

  // Разрешение переменных
  private resolveVariables(
    scenario: Scenario,
    providedVariables?: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    for (const variable of scenario.variables) {
      resolved[variable.name] = providedVariables?.[variable.name] ?? variable.defaultValue;
    }
    
    return resolved;
  }

  // Разрешение параметров
  private resolveParams(
    params: Record<string, any>,
    variables: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Заменяем {{variable}} на значение
        resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          return variables[varName] ?? match;
        });
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  // Приостановка выполнения
  pauseScenario(scenarioId: string): void {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario || scenario.status !== 'running') return;
    
    scenario.status = 'paused';
    this.emit('scenario:paused', { scenario });
  }

  // Возобновление выполнения
  resumeScenario(scenarioId: string): void {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario || scenario.status !== 'paused') return;
    
    scenario.status = 'running';
    this.emit('scenario:resumed', { scenario });
  }

  // Отмена выполнения
  abortScenario(scenarioId: string): void {
    const abortController = this.runningScenarios.get(scenarioId);
    if (abortController) {
      abortController.abort();
    }
    
    const scenario = this.scenarios.get(scenarioId);
    if (scenario) {
      scenario.status = 'draft';
    }
    
    this.emit('scenario:aborted', { scenarioId });
  }

  // Удаление сценария
  deleteScenario(scenarioId: string): void {
    // Отменяем расписание
    const timer = this.scheduledTimers.get(scenarioId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTimers.delete(scenarioId);
    }
    
    // Отменяем выполнение
    this.abortScenario(scenarioId);
    
    this.scenarios.delete(scenarioId);
    this.emit('scenario:deleted', { scenarioId });
  }

  // Получение сценария
  getScenario(scenarioId: string): Scenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  // Получение всех сценариев
  getAllScenarios(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  // Получение сценариев по категории
  getScenariosByCategory(category: Scenario['category']): Scenario[] {
    return this.getAllScenarios().filter(s => s.category === category);
  }

  // Получение запланированных сценариев
  getScheduledScenarios(): Scenario[] {
    return this.getAllScenarios().filter(s => s.schedule?.enabled);
  }

  // Шаблоны сценариев
  getScenarioTemplates(): Array<{
    name: string;
    description: string;
    category: Scenario['category'];
    actions: Partial<ScenarioAction>[];
    variables: ScenarioVariable[];
  }> {
    return [
      {
        name: 'Утренняя рассылка',
        description: 'Генерация и публикация утреннего поста в Telegram',
        category: 'content',
        actions: [
          { type: 'generate_content', params: { prompt: 'Morning update for {{niche}}' } },
          { type: 'wait', params: { duration: 2000 } },
          { type: 'publish_post', params: { platform: 'telegram' } },
        ],
        variables: [
          { name: 'niche', type: 'string', required: true, description: 'Тематика поста' },
        ],
      },
      {
        name: 'Вирусный Reels',
        description: 'Создание Reels для Instagram в вечернее время',
        category: 'publishing',
        actions: [
          { type: 'generate_content', params: { prompt: 'Viral Reels script' } },
          { type: 'wait', params: { duration: 3000 } },
          { type: 'publish_post', params: { platform: 'instagram', type: 'reels' } },
        ],
        variables: [],
      },
      {
        name: 'Новости крипты',
        description: 'Публикация новостей криптовалют на всех платформах',
        category: 'content',
        actions: [
          { type: 'generate_content', params: { prompt: 'Crypto news summary' } },
          { type: 'publish_post', params: { platform: 'telegram' } },
          { type: 'wait', params: { duration: 5000 } },
          { type: 'publish_post', params: { platform: 'instagram' } },
        ],
        variables: [],
      },
    ];
  }
}

// ==================== SINGLETON ====================

let scenariosInstance: ScenariosService | null = null;

export function getScenariosService(config?: Partial<ScenarioConfig>): ScenariosService {
  if (!scenariosInstance) {
    scenariosInstance = new ScenariosService(config);
  }
  return scenariosInstance;
}

export const scenariosService = {
  createScenario: (name: string, desc: string, cat: Scenario['category']) =>
    getScenariosService().createScenario(name, desc, cat),
  startRecording: (name: string, cat?: Scenario['category']) =>
    getScenariosService().startRecording(name, cat),
  recordAction: (type: ScenarioActionType, params: Record<string, any>) =>
    getScenariosService().recordAction(type, params),
  stopRecording: () => getScenariosService().stopRecording(),
  runScenario: (id: string, vars?: Record<string, any>) =>
    getScenariosService().runScenario(id, vars),
  pauseScenario: (id: string) => getScenariosService().pauseScenario(id),
  resumeScenario: (id: string) => getScenariosService().resumeScenario(id),
  abortScenario: (id: string) => getScenariosService().abortScenario(id),
  setSchedule: (id: string, schedule: ScenarioSchedule) =>
    getScenariosService().setSchedule(id, schedule),
  deleteScenario: (id: string) => getScenariosService().deleteScenario(id),
  getScenario: (id: string) => getScenariosService().getScenario(id),
  getAllScenarios: () => getScenariosService().getAllScenarios(),
  getScenarioTemplates: () => getScenariosService().getScenarioTemplates(),
};
