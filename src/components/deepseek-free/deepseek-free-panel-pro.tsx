'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Brain,
  Users,
  Database,
  Clock,
  Settings,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Zap,
  Activity,
  Server,
  Shield,
  TrendingUp,
  Cpu,
  HardDrive,
  Globe,
  Mail,
  Lock,
  Sparkles,
  BarChart3,
  LineChart,
  PlayCircle,
  StopCircle,
  RotateCcw,
  UserPlus,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ==================== ТИПЫ ====================

interface AccountStatus {
  id: string
  email: string
  status: 'active' | 'rate_limited' | 'banned' | 'cooldown' | 'error' | 'login_required'
  hourlyLimit: number
  hourlyUsed: number
  dailyLimit: number
  dailyUsed: number
  priority: number
  totalRequests: number
  successRequests: number
  failedRequests: number
  lastRequestAt: string | null
  cooldownUntil: string | null
  bannedAt: string | null
  banReason: string | null
  createdAt: string
  canMakeRequest: boolean
  waitTime: number
}

interface PoolStatus {
  totalAccounts: number
  activeAccounts: number
  rateLimited: number
  banned: number
  errors: number
  requestsToday: number
  requestsHour: number
  successRate: number
  availableCapacity: number
}

interface CacheStats {
  level: string
  size: number
  max_size?: number
  hits: number
  misses: number
  hit_rate: number
  l1_size?: number
  l2_size?: number
  l3_size?: number
  total_hits?: number
  semantic_available?: boolean
}

interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  avgWaitTime: number
  throughput: number
}

interface HealingStats {
  quarantine_count: number
  recovery_attempts: Record<string, number>
  proxy_assignments: number
  monitoring_active: boolean
}

interface SystemStatus {
  pool: PoolStatus
  cache: CacheStats
  queue: QueueStats
  healing: HealingStats
}

interface Metrics {
  accountsTotal: number
  accountsActive: number
  requestsToday: number
  requestsHour: number
  successRate: number
  cacheHitRate: number
  queueSize: number
  availableCapacity: number
}

interface Settings {
  mode: string
  autoRegisterAccounts: boolean
  minActiveAccounts: number
  maxActiveAccounts: number
  globalHourlyLimit: number
  perAccountHourlyLimit: number
  smartQueueEnabled: boolean
  queueDelayMin: number
  queueDelayMax: number
  cacheEnabled: boolean
  cacheTTLMins: number
  semanticSearchEnabled: boolean
  maxCacheSize: number
  headlessMode: boolean
  humanBehaviorEnabled: boolean
  typingSpeedMin: number
  typingSpeedMax: number
  autoReconnectEnabled: boolean
  reconnectDelaySec: number
  maxReconnectAttempts: number
  sessionRefreshHours: number
  notifyOnLimit: boolean
  notifyOnBan: boolean
  notifyOnLowAccounts: boolean
  lowAccountsThreshold: number
  loadBalancerStrategy: string
  replicationFactor: number
  maxConcurrentRequests: number
  autoHealingEnabled: boolean
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function DeepSeekFreePanelPro() {
  const { toast } = useToast()
  
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [accounts, setAccounts] = useState<AccountStatus[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Диалог добавления аккаунта
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPriority, setNewPriority] = useState('5')
  const [newProxy, setNewProxy] = useState('')
  
  // Диалог авто-регистрации
  const [autoRegisterOpen, setAutoRegisterOpen] = useState(false)
  const [registerCount, setRegisterCount] = useState('1')
  const [registering, setRegistering] = useState(false)
  
  // Тестовый запрос
  const [testPrompt, setTestPrompt] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testing, setTesting] = useState(false)
  
  // История запросов для графика
  const [requestHistory, setRequestHistory] = useState<number[]>(Array(60).fill(0))

  // Загрузка данных
  const loadData = useCallback(async () => {
    try {
      const [statusRes, accountsRes, settingsRes, metricsRes] = await Promise.all([
        fetch('/api/deepseek-free/status?userId=default'),
        fetch('/api/deepseek-free/accounts?userId=default'),
        fetch('/api/deepseek-free/settings?userId=default'),
        fetch('/api/deepseek-free/metrics?userId=default')
      ])

      if (statusRes.ok) {
        const data = await statusRes.json()
        if (data.success) setStatus(data.status)
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json()
        if (data.success) setAccounts(data.accounts)
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        if (data.success) setSettings(data.settings)
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        if (data.success) setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error loading DeepSeek Free data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    
    // Автообновление каждые 10 секунд
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  // Обновить
  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  // Добавить аккаунт
  const handleAddAccount = async () => {
    if (!newEmail || !newPassword) {
      toast({
        title: 'Ошибка',
        description: 'Заполните email и пароль',
        variant: 'destructive'
      })
      return
    }

    try {
      const res = await fetch('/api/deepseek-free/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default',
          email: newEmail,
          password: newPassword,
          priority: parseInt(newPriority),
          proxy: newProxy || null
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Аккаунт добавлен',
          description: `${newEmail} успешно добавлен в пул`
        })
        setAddAccountOpen(false)
        setNewEmail('')
        setNewPassword('')
        setNewPriority('5')
        setNewProxy('')
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось добавить аккаунт',
        variant: 'destructive'
      })
    }
  }

  // Авто-регистрация
  const handleAutoRegister = async () => {
    setRegistering(true)
    
    try {
      const res = await fetch('/api/deepseek-free/accounts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: parseInt(registerCount)
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Регистрация завершена',
          description: `Успешно создано ${data.successful}/${data.total} аккаунтов`
        })
        setAutoRegisterOpen(false)
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Ошибка при регистрации',
        variant: 'destructive'
      })
    } finally {
      setRegistering(false)
    }
  }

  // Удалить аккаунт
  const handleDeleteAccount = async (accountId: string) => {
    try {
      const res = await fetch(`/api/deepseek-free/accounts?accountId=${accountId}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Аккаунт удалён',
          description: 'Аккаунт успешно удалён из пула'
        })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить аккаунт',
        variant: 'destructive'
      })
    }
  }

  // Очистить кэш
  const handleClearCache = async () => {
    try {
      const res = await fetch('/api/deepseek-free/cache?all=true', {
        method: 'DELETE'
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Кэш очищен',
          description: data.message
        })
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось очистить кэш',
        variant: 'destructive'
      })
    }
  }

  // Тестовый запрос
  const handleTestRequest = async () => {
    if (!testPrompt) return
    
    setTesting(true)
    setTestResponse('')

    try {
      const res = await fetch('/api/deepseek-free/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default',
          prompt: testPrompt
        })
      })

      const data = await res.json()

      if (data.success) {
        setTestResponse(data.response || '')
        toast({
          title: 'Успешно',
          description: data.fromCache ? 'Ответ из кэша' : 'Ответ получен',
          variant: 'default'
        })
      } else {
        setTestResponse(`Ошибка: ${data.error}`)
      }
    } catch (error: any) {
      setTestResponse(`Ошибка: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  // Сохранить настройки
  const handleSaveSettings = async (newSettings: Partial<Settings>) => {
    try {
      const res = await fetch('/api/deepseek-free/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'default',
          ...newSettings
        })
      })

      const data = await res.json()

      if (data.success) {
        setSettings(data.settings)
        toast({
          title: 'Настройки сохранены',
          description: 'Новые настройки применены'
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить настройки',
        variant: 'destructive'
      })
    }
  }

  // Статус аккаунта
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Активен</Badge>
      case 'rate_limited':
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Лимит</Badge>
      case 'banned':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Забанен</Badge>
      case 'cooldown':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Ожидание</Badge>
      case 'error':
        return <Badge className="bg-red-400"><AlertCircle className="w-3 h-3 mr-1" />Ошибка</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Расчёт экономии
  const calculateSavings = () => {
    if (!metrics) return '$0.00'
    const tokensEstimate = metrics.requestsToday * 500 // Примерно 500 токенов на запрос
    const cost = (tokensEstimate / 1000) * 0.002 // $0.002 за 1K токенов
    return `$${cost.toFixed(2)}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Загрузка DeepSeek Free...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-6 pr-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-500" />
            DeepSeek Free — Промышленная версия
          </h2>
          <p className="text-muted-foreground">
            Бесплатный безлимитный доступ к DeepSeek с промышленным масштабированием
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button onClick={() => setAutoRegisterOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Авто-регистрация
          </Button>
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Активных</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {status?.pool.activeAccounts || 0} / {status?.pool.totalAccounts || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Запросов сегодня</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {status?.pool.requestsToday || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              В час: {status?.pool.requestsHour || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Кэш HIT</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {((status?.cache.hit_rate || 0) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {status?.cache.hits || 0} попаданий
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-muted-foreground">Успешность</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {((status?.pool.successRate || 0) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Экономия</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {calculateSavings()}
            </p>
            <p className="text-xs text-muted-foreground">
              Сэкономлено сегодня
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Мощность</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {status?.pool.availableCapacity || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Запросов в час
            </p>
          </CardContent>
        </Card>
      </div>

      {/* График запросов (визуализация) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Активность за последний час
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-20">
            {requestHistory.map((count, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t transition-all"
                style={{ 
                  height: `${Math.min(100, (count / Math.max(...requestHistory, 1)) * 100)}%`,
                  opacity: 0.3 + (i / requestHistory.length) * 0.7
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>60 мин назад</span>
            <span>Сейчас</span>
          </div>
        </CardContent>
      </Card>

      {/* Табы */}
      <Tabs defaultValue="accounts">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="accounts">
            <Users className="w-4 h-4 mr-2" />
            Аккаунты
          </TabsTrigger>
          <TabsTrigger value="cache">
            <Database className="w-4 h-4 mr-2" />
            Кэш
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Clock className="w-4 h-4 mr-2" />
            Очередь
          </TabsTrigger>
          <TabsTrigger value="healing">
            <Shield className="w-4 h-4 mr-2" />
            Самовосстановление
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </TabsTrigger>
          <TabsTrigger value="test">
            <Zap className="w-4 h-4 mr-2" />
            Тест
          </TabsTrigger>
        </TabsList>

        {/* Аккаунты */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Пул аккаунтов DeepSeek</h3>
            <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить аккаунт
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить аккаунт DeepSeek</DialogTitle>
                  <DialogDescription>
                    Добавьте существующий аккаунт для доступа к DeepSeek
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      placeholder="user@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Пароль</Label>
                    <Input
                      type="password"
                      placeholder="Пароль от аккаунта DeepSeek"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Приоритет (1-10)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Прокси (опционально)</Label>
                    <Input
                      placeholder="http://host:port:user:pass"
                      value={newProxy}
                      onChange={(e) => setNewProxy(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddAccountOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleAddAccount}>
                    Добавить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {accounts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет аккаунтов в пуле</p>
                  <p className="text-sm mt-2">Добавьте аккаунты вручную или используйте авто-регистрацию</p>
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{account.email}</span>
                          {getStatusBadge(account.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Приоритет: {account.priority} • 
                          Запросов: {account.totalRequests} • 
                          Успешно: {account.successRequests}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">Часовой лимит</p>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(account.hourlyUsed / account.hourlyLimit) * 100} 
                              className="w-24 h-2"
                            />
                            <span className="text-xs">{account.hourlyUsed}/{account.hourlyLimit}</span>
                          </div>
                          {account.waitTime > 0 && (
                            <p className="text-xs text-yellow-500 mt-1">
                              Ждите {Math.ceil(account.waitTime)} сек
                            </p>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие нельзя отменить. Аккаунт {account.email} будет удалён из пула.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAccount(account.id)}>
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Кэш */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Многоуровневый кэш</CardTitle>
                  <CardDescription>
                    L1 (RAM) + L2 (SQLite) + L3 (File) с семантическим поиском
                  </CardDescription>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Очистить кэш
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Очистить весь кэш?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Все сохранённые ответы будут удалены. Это действие нельзя отменить.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearCache}>
                        Очистить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <HardDrive className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{status?.cache.l1_size || 0}</p>
                  <p className="text-sm text-muted-foreground">L1 (RAM)</p>
                  <p className="text-xs text-muted-foreground">&lt; 1 мс</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Database className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{status?.cache.l2_size || 0}</p>
                  <p className="text-sm text-muted-foreground">L2 (SQLite)</p>
                  <p className="text-xs text-muted-foreground">&lt; 10 мс</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Server className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{status?.cache.l3_size || 0}</p>
                  <p className="text-sm text-muted-foreground">L3 (File)</p>
                  <p className="text-xs text-muted-foreground">&lt; 100 мс</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Семантический поиск</p>
                  <p className="text-sm text-muted-foreground">
                    Находит похожие запросы даже с разной формулировкой
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {status?.cache.semantic_available ? (
                    <Badge className="bg-green-500">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Недоступен</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Очередь */}
        <TabsContent value="queue" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{status?.queue.pending || 0}</p>
                <p className="text-sm text-muted-foreground">В очереди</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <PlayCircle className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{status?.queue.processing || 0}</p>
                <p className="text-sm text-muted-foreground">Выполняется</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{status?.queue.completed || 0}</p>
                <p className="text-sm text-muted-foreground">Завершено</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold">{status?.queue.failed || 0}</p>
                <p className="text-sm text-muted-foreground">Ошибок</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Производительность очереди</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Среднее время ожидания</p>
                <p className="text-xl font-bold">{(status?.queue.avgWaitTime || 0).toFixed(1)} сек</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Пропускная способность</p>
                <p className="text-xl font-bold">{status?.queue.throughput || 0} зап/мин</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Самовосстановление */}
        <TabsContent value="healing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Self-Healing система</CardTitle>
                  <CardDescription>
                    Автоматическое восстановление при ошибках и блоках
                  </CardDescription>
                </div>
                <Badge className={status?.healing?.monitoring_active ? "bg-green-500" : "bg-gray-500"}>
                  {status?.healing?.monitoring_active ? 'Активен' : 'Остановлен'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{status?.healing?.quarantine_count || 0}</p>
                  <p className="text-sm text-muted-foreground">В карантине</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <RotateCcw className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{Object.keys(status?.healing?.recovery_attempts || {}).length}</p>
                  <p className="text-sm text-muted-foreground">Попыток восстановления</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Globe className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{status?.healing?.proxy_assignments || 0}</p>
                  <p className="text-sm text-muted-foreground">Прокси назначено</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Настройки */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки пула аккаунтов</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Балансировщик */}
              <div className="space-y-4">
                <h4 className="font-medium">Балансировщик нагрузки</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Стратегия</Label>
                    <Select
                      value={settings?.loadBalancerStrategy || 'least_used'}
                      onValueChange={(v) => handleSaveSettings({ loadBalancerStrategy: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="least_used">Минимальная нагрузка</SelectItem>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="weighted">Взвешенный</SelectItem>
                        <SelectItem value="random">Случайный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Фактор репликации</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={settings?.replicationFactor || 1}
                      onChange={(e) => handleSaveSettings({ replicationFactor: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Кол-во аккаунтов для одного запроса</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Макс. параллельных запросов: {settings?.maxConcurrentRequests || 20}</Label>
                  <Slider
                    value={[settings?.maxConcurrentRequests || 20]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={([v]) => handleSaveSettings({ maxConcurrentRequests: v })}
                  />
                </div>
              </div>

              <Separator />

              {/* Авто-восстановление */}
              <div className="space-y-4">
                <h4 className="font-medium">Авто-восстановление</h4>
                <div className="flex items-center justify-between">
                  <Label>Включить авто-healing</Label>
                  <Switch
                    checked={settings?.autoHealingEnabled ?? true}
                    onCheckedChange={(checked) => handleSaveSettings({ autoHealingEnabled: checked })}
                  />
                </div>
              </div>

              <Separator />

              {/* Кэширование */}
              <div className="space-y-4">
                <h4 className="font-medium">Кэширование</h4>
                <div className="flex items-center justify-between">
                  <Label>Семантический поиск</Label>
                  <Switch
                    checked={settings?.semanticSearchEnabled ?? true}
                    onCheckedChange={(checked) => handleSaveSettings({ semanticSearchEnabled: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>TTL кэша (минуты)</Label>
                    <Input
                      type="number"
                      value={settings?.cacheTTLMins || 60}
                      onChange={(e) => handleSaveSettings({ cacheTTLMins: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Макс. размер L1</Label>
                    <Input
                      type="number"
                      value={settings?.maxCacheSize || 10000}
                      onChange={(e) => handleSaveSettings({ maxCacheSize: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Человеческое поведение */}
              <div className="space-y-4">
                <h4 className="font-medium">Имитация человека</h4>
                <div className="flex items-center justify-between">
                  <Label>Включить</Label>
                  <Switch
                    checked={settings?.humanBehaviorEnabled ?? true}
                    onCheckedChange={(checked) => handleSaveSettings({ humanBehaviorEnabled: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Скорость набора мин (мс)</Label>
                    <Input
                      type="number"
                      value={settings?.typingSpeedMin || 50}
                      onChange={(e) => handleSaveSettings({ typingSpeedMin: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Скорость набора макс (мс)</Label>
                    <Input
                      type="number"
                      value={settings?.typingSpeedMax || 150}
                      onChange={(e) => handleSaveSettings({ typingSpeedMax: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Тест */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Тестовый запрос</CardTitle>
              <CardDescription>
                Отправьте тестовый запрос к DeepSeek Free
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Промпт</Label>
                <Input
                  placeholder="Введите запрос..."
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="text-lg"
                />
              </div>
              <Button onClick={handleTestRequest} disabled={testing || !testPrompt} size="lg">
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Выполняется...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Отправить запрос
                  </>
                )}
              </Button>
              
              {testResponse && (
                <div className="space-y-2">
                  <Label>Ответ</Label>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap max-h-96 overflow-auto">
                    {testResponse}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch тест</CardTitle>
              <CardDescription>
                Тестирование параллельной обработки
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={async () => {
                  const prompts = [
                    'Что такое AI?',
                    'Объясни machine learning',
                    'Что такое нейросети?'
                  ]
                  
                  try {
                    const res = await fetch('/api/deepseek-free/batch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompts })
                    })
                    
                    const data = await res.json()
                    toast({
                      title: 'Batch завершён',
                      description: `Успешно: ${data.successful}/${data.total}`
                    })
                  } catch (error: any) {
                    toast({
                      title: 'Ошибка',
                      description: error.message,
                      variant: 'destructive'
                    })
                  }
                }}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Запустить 3 параллельных запроса
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалог авто-регистрации */}
      <Dialog open={autoRegisterOpen} onOpenChange={setAutoRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Авто-регистрация аккаунтов</DialogTitle>
            <DialogDescription>
              Автоматическое создание новых аккаунтов DeepSeek через временную почту
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Количество аккаунтов</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={registerCount}
                onChange={(e) => setRegisterCount(e.target.value)}
              />
            </div>
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Процесс:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Создание временной почты</li>
                <li>Регистрация на DeepSeek</li>
                <li>Получение кода верификации</li>
                <li>Подтверждение аккаунта</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoRegisterOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAutoRegister} disabled={registering}>
              {registering ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Зарегистрировать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ScrollArea>
  )
}

export default DeepSeekFreePanelPro
