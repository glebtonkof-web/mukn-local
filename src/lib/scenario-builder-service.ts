/**
 * МУКН | Трафик - Визуальный конструктор сценариев
 * Drag & Drop построитель автоматизаций
 */

export interface Scenario {
  id: string
  name: string
  description?: string
  
  // Узлы (блоки) сценария
  nodes: ScenarioNode[]
  
  // Связи между узлами
  edges: ScenarioEdge[]
  
  // Переменные
  variables: ScenarioVariable[]
  
  // Настройки
  settings: ScenarioSettings
  
  // Статус
  status: 'draft' | 'active' | 'paused' | 'archived'
  version: number
  
  // Статистика
  runsCount: number
  lastRunAt?: Date
  
  // Временные метки
  createdAt: Date
  updatedAt: Date
}

export interface ScenarioNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
  connections: {
    inputs: string[]
    outputs: string[]
  }
}

export type NodeType = 
  | 'trigger' 
  | 'condition' 
  | 'action' 
  | 'delay' 
  | 'loop' 
  | 'ai_task'
  | 'api_call'
  | 'message'
  | 'variable'
  | 'random'
  | 'webhook'
  | 'schedule'

export interface NodeData {
  label: string
  config: Record<string, any>
  description?: string
}

export interface ScenarioEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  condition?: EdgeCondition
}

export interface EdgeCondition {
  type: 'equals' | 'contains' | 'gt' | 'lt' | 'exists' | 'custom'
  value: any
  variable?: string
}

export interface ScenarioVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  value: any
  scope: 'global' | 'local'
  description?: string
}

export interface ScenarioSettings {
  // Ограничения
  maxRuns: number
  maxRunsPerUser: number
  cooldownBetweenRuns: number // секунды
  
  // Обработка ошибок
  onError: 'stop' | 'continue' | 'retry'
  retryCount: number
  retryDelay: number
  
  // Уведомления
  notifyOnComplete: boolean
  notifyOnError: boolean
  notifyChannels: string[]
  
  // Расписание
  schedule?: {
    enabled: boolean
    cron?: string
    timezone: string
  }
}

export interface ScenarioExecution {
  id: string
  scenarioId: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  startedAt: Date
  completedAt?: Date
  currentNode?: string
  variables: Record<string, any>
  logs: ExecutionLog[]
  error?: string
}

export interface ExecutionLog {
  timestamp: Date
  nodeId: string
  level: 'info' | 'warn' | 'error'
  message: string
  data?: any
}

// Шаблоны узлов
export interface NodeTemplate {
  type: NodeType
  label: string
  icon: string
  category: string
  description: string
  defaultConfig: Record<string, any>
  inputs: PortDefinition[]
  outputs: PortDefinition[]
}

export interface PortDefinition {
  id: string
  label: string
  type: 'trigger' | 'flow' | 'data'
  multiple?: boolean
}

class ScenarioBuilderService {
  private scenarios: Map<string, Scenario> = new Map()
  private executions: Map<string, ScenarioExecution> = new Map()
  private nodeTemplates: NodeTemplate[] = []

  constructor() {
    this.initializeNodeTemplates()
    this.initializeDefaultScenarios()
  }

  /**
   * Создать сценарий
   */
  createScenario(data: Partial<Scenario>): Scenario {
    const scenario: Scenario = {
      id: `scenario_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: data.name || 'Новый сценарий',
      description: data.description,
      
      nodes: data.nodes || [],
      edges: data.edges || [],
      variables: data.variables || [],
      
      settings: data.settings || {
        maxRuns: 0,
        maxRunsPerUser: 0,
        cooldownBetweenRuns: 0,
        onError: 'stop',
        retryCount: 3,
        retryDelay: 5,
        notifyOnComplete: false,
        notifyOnError: true,
        notifyChannels: []
      },
      
      status: data.status || 'draft',
      version: 1,
      runsCount: 0,
      
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.scenarios.set(scenario.id, scenario)
    return scenario
  }

  /**
   * Обновить сценарий
   */
  updateScenario(scenarioId: string, data: Partial<Scenario>): Scenario | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    // Увеличиваем версию при изменении узлов или связей
    if (data.nodes || data.edges) {
      scenario.version++
    }

    Object.assign(scenario, data, { updatedAt: new Date() })
    return scenario
  }

  /**
   * Добавить узел
   */
  addNode(scenarioId: string, node: Partial<ScenarioNode>): ScenarioNode | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    const newNode: ScenarioNode = {
      id: node.id || `node_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: node.type || 'action',
      position: node.position || { x: 100, y: 100 },
      data: node.data || { label: 'Новый узел', config: {} },
      connections: node.connections || { inputs: [], outputs: [] }
    }

    scenario.nodes.push(newNode)
    scenario.updatedAt = new Date()
    scenario.version++

    return newNode
  }

  /**
   * Обновить узел
   */
  updateNode(scenarioId: string, nodeId: string, data: Partial<ScenarioNode>): ScenarioNode | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    const node = scenario.nodes.find(n => n.id === nodeId)
    if (!node) return null

    Object.assign(node, data)
    scenario.updatedAt = new Date()

    return node
  }

  /**
   * Удалить узел
   */
  deleteNode(scenarioId: string, nodeId: string): boolean {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return false

    const index = scenario.nodes.findIndex(n => n.id === nodeId)
    if (index === -1) return false

    // Удаляем связанные связи
    scenario.edges = scenario.edges.filter(e => e.source !== nodeId && e.target !== nodeId)

    scenario.nodes.splice(index, 1)
    scenario.updatedAt = new Date()
    scenario.version++

    return true
  }

  /**
   * Добавить связь
   */
  addEdge(scenarioId: string, edge: Partial<ScenarioEdge>): ScenarioEdge | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    // Проверяем существование узлов
    const sourceExists = scenario.nodes.some(n => n.id === edge.source)
    const targetExists = scenario.nodes.some(n => n.id === edge.target)
    
    if (!sourceExists || !targetExists) return null

    const newEdge: ScenarioEdge = {
      id: edge.id || `edge_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      source: edge.source || '',
      target: edge.target || '',
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      condition: edge.condition
    }

    scenario.edges.push(newEdge)
    scenario.updatedAt = new Date()

    return newEdge
  }

  /**
   * Удалить связь
   */
  deleteEdge(scenarioId: string, edgeId: string): boolean {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return false

    const index = scenario.edges.findIndex(e => e.id === edgeId)
    if (index === -1) return false

    scenario.edges.splice(index, 1)
    scenario.updatedAt = new Date()

    return true
  }

  /**
   * Выполнить сценарий
   */
  async executeScenario(scenarioId: string, context: Record<string, any> = {}): Promise<ScenarioExecution> {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario || scenario.status !== 'active') {
      throw new Error('Scenario not found or not active')
    }

    const execution: ScenarioExecution = {
      id: `exec_${Date.now()}`,
      scenarioId,
      status: 'running',
      startedAt: new Date(),
      variables: { ...context },
      logs: []
    }

    this.executions.set(execution.id, execution)

    // Находим начальный узел (trigger)
    const triggerNode = scenario.nodes.find(n => n.type === 'trigger')
    if (!triggerNode) {
      execution.status = 'failed'
      execution.error = 'No trigger node found'
      execution.completedAt = new Date()
      return execution
    }

    // Выполняем сценарий
    try {
      await this.executeNode(scenario, execution, triggerNode.id)
      execution.status = 'completed'
    } catch (error: any) {
      execution.status = 'failed'
      execution.error = error.message
    }

    execution.completedAt = new Date()
    scenario.runsCount++
    scenario.lastRunAt = new Date()

    return execution
  }

  /**
   * Выполнение узла
   */
  private async executeNode(
    scenario: Scenario,
    execution: ScenarioExecution,
    nodeId: string
  ): Promise<void> {
    const node = scenario.nodes.find(n => n.id === nodeId)
    if (!node) return

    execution.currentNode = nodeId
    execution.logs.push({
      timestamp: new Date(),
      nodeId,
      level: 'info',
      message: `Executing node: ${node.data.label}`
    })

    // Выполнение в зависимости от типа
    switch (node.type) {
      case 'trigger':
        // Триггер просто передаёт управление дальше
        break

      case 'condition':
        const conditionResult = this.evaluateCondition(node.data.config, execution.variables)
        if (!conditionResult) {
          // Условие не выполнено - идём по ветке false
          return
        }
        break

      case 'action':
        await this.executeAction(node.data.config, execution)
        break

      case 'delay':
        await this.delay(node.data.config.duration * 1000)
        break

      case 'loop':
        await this.executeLoop(scenario, execution, node)
        break

      case 'ai_task':
        await this.executeAITask(node.data.config, execution)
        break

      case 'api_call':
        await this.executeAPICall(node.data.config, execution)
        break

      case 'message':
        execution.logs.push({
          timestamp: new Date(),
          nodeId,
          level: 'info',
          message: `Message: ${node.data.config.text}`
        })
        break

      case 'variable':
        execution.variables[node.data.config.name] = this.evaluateValue(node.data.config.value, execution.variables)
        break

      case 'random':
        const randomValue = Math.random()
        const branches = node.data.config.branches || []
        let selectedBranch = branches[0]
        for (const branch of branches) {
          if (randomValue <= branch.probability) {
            selectedBranch = branch
            break
          }
        }
        break

      case 'webhook':
        await this.executeWebhook(node.data.config, execution)
        break

      case 'schedule':
        // Обработка расписания
        break
    }

    // Находим следующие узлы
    const nextEdges = scenario.edges.filter(e => e.source === nodeId)
    
    for (const edge of nextEdges) {
      // Проверяем условие связи
      if (edge.condition && !this.evaluateEdgeCondition(edge.condition, execution.variables)) {
        continue
      }

      await this.executeNode(scenario, execution, edge.target)
    }
  }

  /**
   * Оценка условия
   */
  private evaluateCondition(config: Record<string, any>, variables: Record<string, any>): boolean {
    const { type, left, operator, right } = config
    
    const leftValue = this.evaluateValue(left, variables)
    const rightValue = this.evaluateValue(right, variables)

    switch (operator) {
      case 'equals': return leftValue === rightValue
      case 'not_equals': return leftValue !== rightValue
      case 'contains': return String(leftValue).includes(String(rightValue))
      case 'gt': return Number(leftValue) > Number(rightValue)
      case 'lt': return Number(leftValue) < Number(rightValue)
      case 'gte': return Number(leftValue) >= Number(rightValue)
      case 'lte': return Number(leftValue) <= Number(rightValue)
      case 'exists': return leftValue !== undefined && leftValue !== null
      case 'is_true': return Boolean(leftValue)
      case 'is_false': return !Boolean(leftValue)
      default: return true
    }
  }

  /**
   * Оценка условия связи
   */
  private evaluateEdgeCondition(condition: EdgeCondition, variables: Record<string, any>): boolean {
    const value = condition.variable ? variables[condition.variable] : null

    switch (condition.type) {
      case 'equals': return value === condition.value
      case 'contains': return String(value).includes(String(condition.value))
      case 'gt': return Number(value) > Number(condition.value)
      case 'lt': return Number(value) < Number(condition.value)
      case 'exists': return value !== undefined && value !== null
      case 'custom': return true // Пользовательское условие
      default: return true
    }
  }

  /**
   * Оценка значения
   */
  private evaluateValue(value: any, variables: Record<string, any>): any {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const varName = value.slice(2, -1)
      return variables[varName]
    }
    return value
  }

  /**
   * Выполнение действия
   */
  private async executeAction(config: Record<string, any>, execution: ScenarioExecution): Promise<void> {
    const { actionType, params } = config

    switch (actionType) {
      case 'send_message':
        execution.logs.push({
          timestamp: new Date(),
          nodeId: execution.currentNode || '',
          level: 'info',
          message: `Sending message: ${params.text}`
        })
        break

      case 'add_tag':
        execution.logs.push({
          timestamp: new Date(),
          nodeId: execution.currentNode || '',
          level: 'info',
          message: `Adding tag: ${params.tag}`
        })
        break

      case 'set_variable':
        execution.variables[params.name] = params.value
        break

      case 'http_request':
        // HTTP запрос
        break
    }
  }

  /**
   * Выполнение цикла
   */
  private async executeLoop(
    scenario: Scenario,
    execution: ScenarioExecution,
    node: ScenarioNode
  ): Promise<void> {
    const { items, iterations } = node.data.config
    
    const loopItems = items || Array.from({ length: iterations || 1 }, (_, i) => i)

    for (const item of loopItems) {
      execution.variables['loop_item'] = item
      
      // Находим вложенные узлы
      const childEdges = scenario.edges.filter(e => e.source === node.id)
      for (const edge of childEdges) {
        await this.executeNode(scenario, execution, edge.target)
      }
    }
  }

  /**
   * AI задача
   */
  private async executeAITask(config: Record<string, any>, execution: ScenarioExecution): Promise<void> {
    const { prompt, model, outputVariable } = config

    // В реальной реализации - вызов AI API
    await this.delay(500)

    const result = `AI response to: ${prompt}`
    execution.variables[outputVariable] = result

    execution.logs.push({
      timestamp: new Date(),
      nodeId: execution.currentNode || '',
      level: 'info',
      message: `AI task completed: ${result.substring(0, 50)}...`
    })
  }

  /**
   * API вызов
   */
  private async executeAPICall(config: Record<string, any>, execution: ScenarioExecution): Promise<void> {
    const { url, method, headers, body, outputVariable } = config

    // В реальной реализации - HTTP запрос
    await this.delay(200)

    const result = { status: 200, data: {} }
    execution.variables[outputVariable] = result

    execution.logs.push({
      timestamp: new Date(),
      nodeId: execution.currentNode || '',
      level: 'info',
      message: `API call completed: ${method} ${url}`
    })
  }

  /**
   * Вебхук
   */
  private async executeWebhook(config: Record<string, any>, execution: ScenarioExecution): Promise<void> {
    const { url, method = 'POST', payload } = config

    // В реальной реализации - отправка на вебхук
    await this.delay(100)

    execution.logs.push({
      timestamp: new Date(),
      nodeId: execution.currentNode || '',
      level: 'info',
      message: `Webhook called: ${url}`
    })
  }

  /**
   * Получить шаблоны узлов
   */
  getNodeTemplates(): NodeTemplate[] {
    return this.nodeTemplates
  }

  /**
   * Получить сценарий
   */
  getScenario(id: string): Scenario | undefined {
    return this.scenarios.get(id)
  }

  /**
   * Получить все сценарии
   */
  getAllScenarios(): Scenario[] {
    return Array.from(this.scenarios.values())
  }

  /**
   * Получить выполнение
   */
  getExecution(id: string): ScenarioExecution | undefined {
    return this.executions.get(id)
  }

  /**
   * Получить выполнения сценария
   */
  getScenarioExecutions(scenarioId: string): ScenarioExecution[] {
    return Array.from(this.executions.values()).filter(e => e.scenarioId === scenarioId)
  }

  /**
   * Активировать сценарий
   */
  activateScenario(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return false

    // Валидация
    if (!this.validateScenario(scenario)) {
      return false
    }

    scenario.status = 'active'
    scenario.updatedAt = new Date()
    return true
  }

  /**
   * Приостановить сценарий
   */
  pauseScenario(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return false

    scenario.status = 'paused'
    scenario.updatedAt = new Date()
    return true
  }

  /**
   * Валидация сценария
   */
  private validateScenario(scenario: Scenario): boolean {
    // Должен быть хотя бы один триггер
    const hasTrigger = scenario.nodes.some(n => n.type === 'trigger')
    if (!hasTrigger) return false

    // Все связи должны указывать на существующие узлы
    for (const edge of scenario.edges) {
      if (!scenario.nodes.find(n => n.id === edge.source)) return false
      if (!scenario.nodes.find(n => n.id === edge.target)) return false
    }

    return true
  }

  /**
   * Экспорт сценария
   */
  exportScenario(scenarioId: string): string | null {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) return null

    return JSON.stringify(scenario, null, 2)
  }

  /**
   * Импорт сценария
   */
  importScenario(data: string): Scenario | null {
    try {
      const parsed = JSON.parse(data)
      parsed.id = `scenario_${Date.now()}_${Math.random().toString(36).substring(7)}`
      parsed.createdAt = new Date()
      parsed.updatedAt = new Date()
      parsed.version = 1
      parsed.runsCount = 0
      parsed.status = 'draft'

      this.scenarios.set(parsed.id, parsed)
      return parsed
    } catch {
      return null
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Инициализация шаблонов узлов
   */
  private initializeNodeTemplates(): void {
    this.nodeTemplates = [
      {
        type: 'trigger',
        label: 'Триггер',
        icon: 'play',
        category: 'events',
        description: 'Начало сценария',
        defaultConfig: { type: 'manual' },
        inputs: [],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'condition',
        label: 'Условие',
        icon: 'git-branch',
        category: 'logic',
        description: 'Проверка условия',
        defaultConfig: { left: '', operator: 'equals', right: '' },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [
          { id: 'true', label: 'Да', type: 'flow' },
          { id: 'false', label: 'Нет', type: 'flow' }
        ]
      },
      {
        type: 'action',
        label: 'Действие',
        icon: 'zap',
        category: 'actions',
        description: 'Выполнить действие',
        defaultConfig: { actionType: 'send_message', params: {} },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'delay',
        label: 'Задержка',
        icon: 'clock',
        category: 'logic',
        description: 'Пауза в выполнении',
        defaultConfig: { duration: 5, unit: 'seconds' },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'ai_task',
        label: 'AI задача',
        icon: 'brain',
        category: 'ai',
        description: 'Запрос к AI',
        defaultConfig: { prompt: '', model: 'deepseek-chat', outputVariable: 'ai_result' },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'api_call',
        label: 'API запрос',
        icon: 'globe',
        category: 'integration',
        description: 'HTTP запрос к внешнему API',
        defaultConfig: { url: '', method: 'GET', headers: {}, body: '', outputVariable: 'api_result' },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'loop',
        label: 'Цикл',
        icon: 'repeat',
        category: 'logic',
        description: 'Повторение действий',
        defaultConfig: { iterations: 3, items: null },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'variable',
        label: 'Переменная',
        icon: 'variable',
        category: 'data',
        description: 'Установить переменную',
        defaultConfig: { name: '', value: '' },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'random',
        label: 'Случайный путь',
        icon: 'shuffle',
        category: 'logic',
        description: 'Случайный выбор ветки',
        defaultConfig: { branches: [{ probability: 0.5, label: 'A' }, { probability: 1, label: 'B' }] },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [
          { id: 'a', label: 'A', type: 'flow' },
          { id: 'b', label: 'B', type: 'flow' }
        ]
      },
      {
        type: 'webhook',
        label: 'Вебхук',
        icon: 'link',
        category: 'integration',
        description: 'Отправить данные на вебхук',
        defaultConfig: { url: '', method: 'POST', payload: {} },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      },
      {
        type: 'message',
        label: 'Сообщение',
        icon: 'message-square',
        category: 'communication',
        description: 'Отправить сообщение',
        defaultConfig: { text: '', platform: 'telegram', chatId: '' },
        inputs: [{ id: 'in', label: 'Вход', type: 'flow' }],
        outputs: [{ id: 'out', label: 'Выход', type: 'flow' }]
      }
    ]
  }

  /**
   * Инициализация дефолтных сценариев
   */
  private initializeDefaultScenarios(): void {
    // Простой сценарий приветствия
    const welcomeScenario = this.createScenario({
      name: 'Автоприветствие',
      description: 'Автоматическое приветствие новых пользователей',
      status: 'draft'
    })

    this.addNode(welcomeScenario.id, {
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: { label: 'Новый пользователь', config: { type: 'new_user' } }
    })

    this.addNode(welcomeScenario.id, {
      type: 'message',
      position: { x: 350, y: 100 },
      data: { 
        label: 'Приветствие', 
        config: { text: 'Привет! Добро пожаловать! 👋', platform: 'telegram' } 
      }
    })

    this.addEdge(welcomeScenario.id, {
      source: welcomeScenario.nodes[0].id,
      target: welcomeScenario.nodes[1].id
    })
  }
}

export const scenarioBuilderService = new ScenarioBuilderService()
export default scenarioBuilderService
