// Async Template Compiler - Асинхронная компиляция шаблонов
// Неблокирующая компиляция с кэшированием

import { EventEmitter } from 'events';

// ==================== ТИПЫ ====================

export interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[]; // имена переменных
  compiled?: CompiledTemplate;
  status: 'draft' | 'compiling' | 'ready' | 'error';
  lastCompiled?: number;
  error?: string;
}

export interface CompiledTemplate {
  id: string;
  render: (variables: Record<string, any>) => string;
  variables: string[];
  hash: string;
}

export interface TemplateCache {
  get(key: string): string | undefined;
  set(key: string, value: string, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

export interface CompilerConfig {
  maxConcurrentCompilations: number;
  cacheMaxSize: number; // количество закэшированных рендеров
  cacheTTL: number; // ms - время жизни кэша
  compilationTimeout: number; // ms
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: CompilerConfig = {
  maxConcurrentCompilations: 4,
  cacheMaxSize: 1000,
  cacheTTL: 3600000, // 1 час
  compilationTimeout: 30000, // 30 секунд
};

// ==================== ASYNC TEMPLATE COMPILER ====================

class AsyncTemplateCompilerService extends EventEmitter {
  private config: CompilerConfig;
  private templates: Map<string, Template> = new Map();
  private compilationQueue: Array<{
    templateId: string;
    resolve: (compiled: CompiledTemplate) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeCompilations: number = 0;
  private cache: Map<string, { value: string; expires: number }> = new Map();
  private stats = {
    totalCompilations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageCompileTime: 0,
  };

  constructor(config: Partial<CompilerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCacheCleanup();
  }

  // Запуск очистки кэша
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // каждую минуту
  }

  // Очистка устаревшего кэша
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
    
    // Если кэш слишком большой - удаляем старые
    if (this.cache.size > this.config.cacheMaxSize) {
      const keysToDelete = Array.from(this.cache.keys())
        .slice(0, this.cache.size - this.config.cacheMaxSize);
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
    }
  }

  // Регистрация шаблона
  registerTemplate(id: string, name: string, content: string): Template {
    // Извлекаем переменные
    const variables = this.extractVariables(content);
    
    const template: Template = {
      id,
      name,
      content,
      variables,
      status: 'draft',
    };
    
    this.templates.set(id, template);
    this.emit('template:registered', { template });
    
    return template;
  }

  // Извлечение переменных из шаблона
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  }

  // Асинхронное получение скомпилированного шаблона
  async getTemplate(id: string): Promise<CompiledTemplate> {
    const template = this.templates.get(id);
    
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    
    // Если уже скомпилирован - возвращаем
    if (template.status === 'ready' && template.compiled) {
      return template.compiled;
    }
    
    // Если в процессе компиляции - добавляем в очередь
    if (template.status === 'compiling') {
      return new Promise((resolve, reject) => {
        this.compilationQueue.push({ templateId: id, resolve, reject });
      });
    }
    
    // Компилируем
    return this.compileTemplate(id);
  }

  // Компиляция шаблона
  private async compileTemplate(id: string): Promise<CompiledTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    
    // Ждём освобождения слота
    while (this.activeCompilations >= this.config.maxConcurrentCompilations) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.activeCompilations++;
    template.status = 'compiling';
    
    const startTime = Date.now();
    
    try {
      // Таймаут компиляции
      const compiled = await this.compileWithTimeout(template);
      
      template.compiled = compiled;
      template.status = 'ready';
      template.lastCompiled = Date.now();
      template.error = undefined;
      
      const compileTime = Date.now() - startTime;
      this.stats.totalCompilations++;
      this.stats.averageCompileTime = 
        (this.stats.averageCompileTime * (this.stats.totalCompilations - 1) + compileTime) 
        / this.stats.totalCompilations;
      
      this.emit('template:compiled', { template, compileTime });
      
      // Обрабатываем очередь
      this.processQueue(id, compiled);
      
      return compiled;
    } catch (error) {
      template.status = 'error';
      template.error = error instanceof Error ? error.message : String(error);
      
      this.emit('template:error', { template, error });
      
      // Отклоняем ожидающие в очереди
      this.rejectQueue(id, error instanceof Error ? error : new Error(String(error)));
      
      throw error;
    } finally {
      this.activeCompilations--;
    }
  }

  // Компиляция с таймаутом
  private compileWithTimeout(template: Template): Promise<CompiledTemplate> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Compilation timeout'));
      }, this.config.compilationTimeout);
      
      // Асинхронная компиляция (имитация для неблокирующего выполнения)
      setImmediate(() => {
        try {
          const compiled = this.doCompile(template);
          clearTimeout(timeout);
          resolve(compiled);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  // Непосредственная компиляция
  private doCompile(template: Template): CompiledTemplate {
    const content = template.content;
    const variables = template.variables;
    
    // Создаём функцию рендеринга
    const render = (vars: Record<string, any>): string => {
      let result = content;
      
      for (const varName of variables) {
        const value = vars[varName] ?? '';
        const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
        result = result.replace(regex, String(value));
      }
      
      // Условные блоки
      result = this.processConditionals(result, vars);
      
      // Циклы
      result = this.processLoops(result, vars);
      
      return result;
    };
    
    // Хеш для инвалидации кэша
    const hash = this.generateHash(content);
    
    return {
      id: template.id,
      render,
      variables,
      hash,
    };
  }

  // Обработка условных блоков
  private processConditionals(content: string, vars: Record<string, any>): string {
    // {{#if condition}}...{{/if}}
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return content.replace(ifRegex, (match, condition, body) => {
      const value = vars[condition];
      return value ? body : '';
    });
  }

  // Обработка циклов
  private processLoops(content: string, vars: Record<string, any>): string {
    // {{#each items}}...{{/each}}
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    
    return content.replace(eachRegex, (match, arrayName, body) => {
      const array = vars[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = body;
        itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
        
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            itemContent = itemContent.replace(
              new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
              String(value)
            );
          }
        }
        
        return itemContent;
      }).join('');
    });
  }

  // Генерация хеша
  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // Обработка очереди
  private processQueue(templateId: string, compiled: CompiledTemplate): void {
    const toResolve = this.compilationQueue.filter(q => q.templateId === templateId);
    this.compilationQueue = this.compilationQueue.filter(q => q.templateId !== templateId);
    
    for (const item of toResolve) {
      item.resolve(compiled);
    }
  }

  // Отклонение очереди
  private rejectQueue(templateId: string, error: Error): void {
    const toReject = this.compilationQueue.filter(q => q.templateId === templateId);
    this.compilationQueue = this.compilationQueue.filter(q => q.templateId !== templateId);
    
    for (const item of toReject) {
      item.reject(error);
    }
  }

  // Рендеринг шаблона с кэшированием
  async render(id: string, variables: Record<string, any>): Promise<string> {
    // Проверяем кэш рендеров
    const cacheKey = this.getCacheKey(id, variables);
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      this.stats.cacheHits++;
      return cached.value;
    }
    
    this.stats.cacheMisses++;
    
    // Получаем скомпилированный шаблон
    const compiled = await this.getTemplate(id);
    
    // Рендерим
    const result = compiled.render(variables);
    
    // Кэшируем
    this.cache.set(cacheKey, {
      value: result,
      expires: Date.now() + this.config.cacheTTL,
    });
    
    return result;
  }

  // Ключ кэша
  private getCacheKey(templateId: string, variables: Record<string, any>): string {
    const varsHash = JSON.stringify(variables);
    return `${templateId}:${varsHash}`;
  }

  // Инвалидация кэша шаблона
  invalidateCache(id: string): void {
    // Удаляем все записи кэша для этого шаблона
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${id}:`)) {
        this.cache.delete(key);
      }
    }
    
    const template = this.templates.get(id);
    if (template) {
      template.compiled = undefined;
      template.status = 'draft';
    }
    
    this.emit('cache:invalidated', { templateId: id });
  }

  // Массовая инвалидация
  invalidateAll(): void {
    this.cache.clear();
    
    for (const template of this.templates.values()) {
      template.compiled = undefined;
      template.status = 'draft';
    }
    
    this.emit('cache:invalidated:all');
  }

  // Получение шаблона
  getTemplateInfo(id: string): Template | undefined {
    return this.templates.get(id);
  }

  // Получение всех шаблонов
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  // Получение статистики
  getStats(): typeof this.stats & { cacheSize: number } {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
    };
  }

  // Удаление шаблона
  deleteTemplate(id: string): void {
    this.invalidateCache(id);
    this.templates.delete(id);
    this.emit('template:deleted', { id });
  }
}

// ==================== SINGLETON ====================

let compilerInstance: AsyncTemplateCompilerService | null = null;

export function getAsyncTemplateCompiler(config?: Partial<CompilerConfig>): AsyncTemplateCompilerService {
  if (!compilerInstance) {
    compilerInstance = new AsyncTemplateCompilerService(config);
  }
  return compilerInstance;
}

export const asyncTemplateCompiler = {
  registerTemplate: (id: string, name: string, content: string) =>
    getAsyncTemplateCompiler().registerTemplate(id, name, content),
  getTemplate: (id: string) => getAsyncTemplateCompiler().getTemplate(id),
  render: (id: string, vars: Record<string, any>) => getAsyncTemplateCompiler().render(id, vars),
  invalidateCache: (id: string) => getAsyncTemplateCompiler().invalidateCache(id),
  invalidateAll: () => getAsyncTemplateCompiler().invalidateAll(),
  getStats: () => getAsyncTemplateCompiler().getStats(),
  getAllTemplates: () => getAsyncTemplateCompiler().getAllTemplates(),
};
