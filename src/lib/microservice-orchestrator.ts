// Микросервисная архитектура "Неубиваемость"
// Независимые сервисы с автоматическим перезапуском при падении

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// ==================== ТИПЫ ====================

export interface MicroserviceConfig {
  name: string;
  script: string;
  port: number;
  healthCheckEndpoint?: string;
  restartDelay: number; // ms
  maxRestarts: number;
  restartWindow: number; // ms - окно для подсчёта рестартов
  dependencies: string[]; // имена зависимых сервисов
  env?: Record<string, string>;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'crashed' | 'restarting';
  pid?: number;
  port: number;
  uptime: number; // seconds
  restartCount: number;
  lastStarted?: Date;
  lastCrash?: Date;
  lastError?: string;
}

// ==================== КОНФИГУРАЦИЯ СЕРВИСОВ ====================

export const MICROSERVICES: MicroserviceConfig[] = [
  {
    name: 'ai-service',
    script: 'mini-services/ai-service/index.ts',
    port: 3001,
    healthCheckEndpoint: '/health',
    restartDelay: 5000,
    maxRestarts: 10,
    restartWindow: 60000, // 10 рестартов за минуту = критическая ошибка
    dependencies: [],
    env: { SERVICE_NAME: 'ai-service' },
  },
  {
    name: 'content-generator',
    script: 'mini-services/content-generator/index.ts',
    port: 3002,
    healthCheckEndpoint: '/health',
    restartDelay: 3000,
    maxRestarts: 15,
    restartWindow: 60000,
    dependencies: ['ai-service'], // зависит от AI сервиса
  },
  {
    name: 'realtime-service',
    script: 'mini-services/realtime-service/index.ts',
    port: 3003,
    healthCheckEndpoint: '/health',
    restartDelay: 2000,
    maxRestarts: 20,
    restartWindow: 60000,
    dependencies: [],
  },
  {
    name: 'logs-service',
    script: 'mini-services/logs-service/index.ts',
    port: 3004,
    healthCheckEndpoint: '/health',
    restartDelay: 2000,
    maxRestarts: 20,
    restartWindow: 60000,
    dependencies: [],
  },
  {
    name: 'publisher-service',
    script: 'mini-services/publisher-service/index.ts',
    port: 3005,
    healthCheckEndpoint: '/health',
    restartDelay: 5000,
    maxRestarts: 10,
    restartWindow: 60000,
    dependencies: ['content-generator'],
  },
  {
    name: 'analytics-service',
    script: 'mini-services/analytics-service/index.ts',
    port: 3006,
    healthCheckEndpoint: '/health',
    restartDelay: 5000,
    maxRestarts: 10,
    restartWindow: 60000,
    dependencies: [],
  },
];

// ==================== МЕНЕДЖЕР МИКРОСЕРВИСОВ ====================

class MicroserviceOrchestrator extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private statuses: Map<string, ServiceStatus> = new Map();
  private restartHistory: Map<string, number[]> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor() {
    super();
    this.initializeStatuses();
  }

  private initializeStatuses(): void {
    for (const config of MICROSERVICES) {
      this.statuses.set(config.name, {
        name: config.name,
        status: 'stopped',
        port: config.port,
        uptime: 0,
        restartCount: 0,
      });
      this.restartHistory.set(config.name, []);
    }
  }

  // Запуск отдельного сервиса
  async startService(name: string): Promise<void> {
    const config = MICROSERVICES.find(s => s.name === name);
    if (!config) {
      throw new Error(`Service "${name}" not found in configuration`);
    }

    // Проверяем зависимости
    for (const depName of config.dependencies) {
      const depStatus = this.statuses.get(depName);
      if (!depStatus || depStatus.status !== 'running') {
        console.log(`[Orchestrator] Starting dependency "${depName}" for "${name}"`);
        await this.startService(depName);
        // Ждём готовности зависимости
        await this.waitForService(depName, 30000);
      }
    }

    // Если уже запущен - пропускаем
    if (this.processes.has(name)) {
      const status = this.statuses.get(name);
      if (status?.status === 'running') {
        console.log(`[Orchestrator] Service "${name}" already running`);
        return;
      }
    }

    console.log(`[Orchestrator] Starting service "${name}" on port ${config.port}`);

    const status = this.statuses.get(name)!;
    status.status = 'restarting';
    this.emit('service:starting', { name });

    // Запускаем процесс
    const proc = spawn('bun', ['run', config.script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...config.env,
        PORT: String(config.port),
        SERVICE_NAME: name,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.processes.set(name, proc);

    // Обработка stdout
    proc.stdout?.on('data', (data: Buffer) => {
      console.log(`[${name}] ${data.toString().trim()}`);
    });

    // Обработка stderr
    proc.stderr?.on('data', (data: Buffer) => {
      console.error(`[${name}:ERROR] ${data.toString().trim()}`);
    });

    // Обработка падения процесса
    proc.on('exit', (code, signal) => {
      this.handleServiceExit(name, code, signal);
    });

    proc.on('error', (error) => {
      console.error(`[${name}] Process error:`, error);
      this.handleServiceExit(name, 1, null);
    });

    // Обновляем статус
    status.status = 'running';
    status.pid = proc.pid;
    status.lastStarted = new Date();
    status.uptime = 0;

    this.emit('service:started', { name, pid: proc.pid, port: config.port });
    console.log(`[Orchestrator] Service "${name}" started (PID: ${proc.pid})`);
  }

  // Обработка падения сервиса
  private async handleServiceExit(name: string, code: number | null, signal: string | null): Promise<void> {
    const config = MICROSERVICES.find(s => s.name === name);
    const status = this.statuses.get(name)!;
    
    status.status = 'crashed';
    status.lastCrash = new Date();
    status.lastError = signal ? `Signal: ${signal}` : `Exit code: ${code}`;
    
    console.error(`[Orchestrator] Service "${name}" crashed: ${status.lastError}`);
    this.emit('service:crashed', { name, code, signal });
    
    this.processes.delete(name);

    if (!config) return;

    // Проверяем количество рестартов
    const now = Date.now();
    const history = this.restartHistory.get(name)!.filter(t => now - t < config.restartWindow);
    history.push(now);
    this.restartHistory.set(name, history);

    if (history.length >= config.maxRestarts) {
      console.error(`[Orchestrator] Service "${name}" exceeded max restarts (${config.maxRestarts})`);
      this.emit('service:failed', { name, restartCount: history.length });
      return;
    }

    // Автоматический перезапуск с задержкой
    console.log(`[Orchestrator] Restarting "${name}" in ${config.restartDelay}ms... (attempt ${history.length}/${config.maxRestarts})`);
    
    await new Promise(resolve => setTimeout(resolve, config.restartDelay));
    
    try {
      await this.startService(name);
      status.restartCount++;
    } catch (error) {
      console.error(`[Orchestrator] Failed to restart "${name}":`, error);
    }
  }

  // Остановка сервиса
  async stopService(name: string): Promise<void> {
    const proc = this.processes.get(name);
    const status = this.statuses.get(name);
    
    if (!proc) {
      console.log(`[Orchestrator] Service "${name}" not running`);
      return;
    }

    console.log(`[Orchestrator] Stopping service "${name}"...`);
    
    status!.status = 'stopped';
    
    // Graceful shutdown
    proc.kill('SIGTERM');
    
    // Ждём 10 секунд, затем force kill
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 10000);
      
      proc.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    
    this.processes.delete(name);
    this.emit('service:stopped', { name });
    console.log(`[Orchestrator] Service "${name}" stopped`);
  }

  // Перезапуск сервиса
  async restartService(name: string): Promise<void> {
    await this.stopService(name);
    await this.startService(name);
  }

  // Ожидание готовности сервиса
  private async waitForService(name: string, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    const config = MICROSERVICES.find(s => s.name === name);
    
    while (Date.now() - startTime < timeoutMs) {
      const status = this.statuses.get(name);
      if (status?.status === 'running') {
        // Дополнительная проверка health endpoint
        if (config?.healthCheckEndpoint) {
          try {
            const response = await fetch(`http://localhost:${config.port}${config.healthCheckEndpoint}`);
            if (response.ok) return true;
          } catch {
            // Service not ready yet
          }
        } else {
          return true;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return false;
  }

  // Запуск всех сервисов
  async startAll(): Promise<void> {
    console.log('[Orchestrator] Starting all services...');
    
    // Сортируем по зависимостям (топологическая сортировка)
    const sorted = this.topologicalSort();
    
    for (const name of sorted) {
      await this.startService(name);
    }
    
    // Запускаем health check мониторинг
    this.startHealthMonitoring();
    
    console.log('[Orchestrator] All services started');
    this.emit('all:started');
  }

  // Остановка всех сервисов
  async stopAll(): Promise<void> {
    console.log('[Orchestrator] Stopping all services...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Останавливаем в обратном порядке зависимостей
    const sorted = this.topologicalSort().reverse();
    
    for (const name of sorted) {
      await this.stopService(name);
    }
    
    console.log('[Orchestrator] All services stopped');
    this.emit('all:stopped');
  }

  // Топологическая сортировка по зависимостям
  private topologicalSort(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving "${name}"`);
      }

      visiting.add(name);
      const config = MICROSERVICES.find(s => s.name === name);
      
      if (config) {
        for (const dep of config.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const config of MICROSERVICES) {
      visit(config.name);
    }

    return result;
  }

  // Мониторинг здоровья сервисов
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const config of MICROSERVICES) {
        const status = this.statuses.get(config.name)!;
        
        if (status.status !== 'running') continue;
        
        // Проверяем health endpoint
        if (config.healthCheckEndpoint) {
          try {
            const response = await fetch(
              `http://localhost:${config.port}${config.healthCheckEndpoint}`,
              { method: 'GET', signal: AbortSignal.timeout(5000) }
            );
            
            if (!response.ok) {
              console.warn(`[Orchestrator] Health check failed for "${config.name}": ${response.status}`);
            }
          } catch (error) {
            console.warn(`[Orchestrator] Health check error for "${config.name}":`, error);
            // Сервис может зависнуть - пробуем перезапустить
            const proc = this.processes.get(config.name);
            if (proc && status.status === 'running') {
              console.log(`[Orchestrator] Service "${config.name}" appears hung, restarting...`);
              await this.restartService(config.name);
            }
          }
        }

        // Обновляем uptime
        if (status.lastStarted) {
          status.uptime = Math.floor((Date.now() - status.lastStarted.getTime()) / 1000);
        }
      }
    }, 15000); // каждые 15 секунд
  }

  // Получить статус всех сервисов
  getAllStatuses(): ServiceStatus[] {
    return Array.from(this.statuses.values());
  }

  // Получить статус конкретного сервиса
  getStatus(name: string): ServiceStatus | undefined {
    return this.statuses.get(name);
  }

  // Общий uptime оркестратора
  getOrchestratorUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

// ==================== SINGLETON ====================

let orchestratorInstance: MicroserviceOrchestrator | null = null;

export function getOrchestrator(): MicroserviceOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MicroserviceOrchestrator();
  }
  return orchestratorInstance;
}

export const orchestrator = {
  startAll: () => getOrchestrator().startAll(),
  stopAll: () => getOrchestrator().stopAll(),
  startService: (name: string) => getOrchestrator().startService(name),
  stopService: (name: string) => getOrchestrator().stopService(name),
  restartService: (name: string) => getOrchestrator().restartService(name),
  getAllStatuses: () => getOrchestrator().getAllStatuses(),
  getStatus: (name: string) => getOrchestrator().getStatus(name),
};
