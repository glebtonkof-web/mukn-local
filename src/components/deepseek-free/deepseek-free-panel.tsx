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
  Activity
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ==================== ТИПЫ ====================

interface AccountStatus {
  id: string
  email: string
  status: 'active' | 'rate_limited' | 'banned' | 'cooldown'
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
}

interface SystemStatus {
  pool: {
    total: number
    active: number
    rateLimited: number
    banned: number
    cooldown: number
    totalRequestsToday: number
    avgHourlyUsage: number
  }
  cache: {
    l1Size: number
    l1MaxSize: number
    l2Size: number
    topHits: Array<{ promptPreview: string; hitCount: number }>
  }
  queue: {
    size: number
    avgWaitTime: number
  }
  metrics: {
    requestsToday: number
    successToday: number
    successRate: string
    avgResponseTime: number
    estimatedSavings: string
  }
  cacheSize: number
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
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function DeepSeekFreePanel() {
  const { toast } = useToast()
  
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [accounts, setAccounts] = useState<AccountStatus[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Диалог добавления аккаунта
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPriority, setNewPriority] = useState('5')
  
  // Тестовый запрос
  const [testPrompt, setTestPrompt] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testing, setTesting] = useState(false)

  // Загрузка данных
  const loadData = useCallback(async () => {
    try {
      const [statusRes, accountsRes, settingsRes] = await Promise.all([
        fetch('/api/deepseek-free/status?userId=default'),
        fetch('/api/deepseek-free/accounts?userId=default'),
        fetch('/api/deepseek-free/settings?userId=default')
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
    } catch (error) {
      console.error('Error loading DeepSeek Free data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadData, 30000)
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
          priority: parseInt(newPriority)
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
      default:
        return <Badge>{status}</Badge>
    }
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
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-500" />
            DeepSeek Free
          </h2>
          <p className="text-muted-foreground">
            Бесплатный безлимитный доступ к DeepSeek через браузерную автоматизацию
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Активных аккаунтов</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {status?.pool.active || 0} / {status?.pool.total || 0}
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
              {status?.metrics.requestsToday || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Успешность: {status?.metrics.successRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Кэш</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {status?.cacheSize || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              L1: {status?.cache.l1Size || 0} / {status?.cache.l1MaxSize || 0}
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
              ${status?.metrics.estimatedSavings || '0.00'}
            </p>
            <p className="text-xs text-muted-foreground">
              Сэкономлено сегодня
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Табы */}
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            <Users className="w-4 h-4 mr-2" />
            Аккаунты
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </TabsTrigger>
          <TabsTrigger value="cache">
            <Database className="w-4 h-4 mr-2" />
            Кэш
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
                    Добавьте аккаунт для доступа к бесплатному DeepSeek
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
                  Нет аккаунтов. Добавьте первый аккаунт DeepSeek.
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
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

        {/* Настройки */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки DeepSeek Free</CardTitle>
              <CardDescription>
                Конфигурация браузерной автоматизации и пула аккаунтов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Пул аккаунтов */}
              <div className="space-y-4">
                <h4 className="font-medium">Пул аккаунтов</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Мин. активных аккаунтов</Label>
                    <Input
                      type="number"
                      value={settings?.minActiveAccounts || 1}
                      onChange={(e) => handleSaveSettings({ minActiveAccounts: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Макс. активных аккаунтов</Label>
                    <Input
                      type="number"
                      value={settings?.maxActiveAccounts || 10}
                      onChange={(e) => handleSaveSettings({ maxActiveAccounts: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Rate Limiting */}
              <div className="space-y-4">
                <h4 className="font-medium">Rate Limiting</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Глобальный лимит (запросов/час)</Label>
                    <Input
                      type="number"
                      value={settings?.globalHourlyLimit || 200}
                      onChange={(e) => handleSaveSettings({ globalHourlyLimit: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>На аккаунт (запросов/час)</Label>
                    <Input
                      type="number"
                      value={settings?.perAccountHourlyLimit || 25}
                      onChange={(e) => handleSaveSettings({ perAccountHourlyLimit: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Умная очередь</Label>
                  <Switch
                    checked={settings?.smartQueueEnabled ?? true}
                    onCheckedChange={(checked) => handleSaveSettings({ smartQueueEnabled: checked })}
                  />
                </div>
              </div>

              <Separator />

              {/* Кэширование */}
              <div className="space-y-4">
                <h4 className="font-medium">Кэширование</h4>
                <div className="flex items-center justify-between">
                  <Label>Включить кэш</Label>
                  <Switch
                    checked={settings?.cacheEnabled ?? true}
                    onCheckedChange={(checked) => handleSaveSettings({ cacheEnabled: checked })}
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
                    <Label>Макс. размер кэша</Label>
                    <Input
                      type="number"
                      value={settings?.maxCacheSize || 10000}
                      onChange={(e) => handleSaveSettings({ maxCacheSize: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Браузер */}
              <div className="space-y-4">
                <h4 className="font-medium">Браузер</h4>
                <div className="flex items-center justify-between">
                  <Label>Скрытый режим (headless)</Label>
                  <Switch
                    checked={settings?.headlessMode ?? true}
                    onCheckedChange={(checked) => handleSaveSettings({ headlessMode: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Имитация поведения человека</Label>
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

              <Separator />

              {/* Авто-восстановление */}
              <div className="space-y-4">
                <h4 className="font-medium">Авто-восстановление</h4>
                <div className="flex items-center justify-between">
                  <Label>Авто-переподключение</Label>
                  <Switch
                    checked={settings?.autoReconnectEnabled ?? true}
                    onCheckedChange={(checked) => handleSaveSettings({ autoReconnectEnabled: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Задержка переподключения (сек)</Label>
                    <Input
                      type="number"
                      value={settings?.reconnectDelaySec || 30}
                      onChange={(e) => handleSaveSettings({ reconnectDelaySec: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Макс. попыток</Label>
                    <Input
                      type="number"
                      value={settings?.maxReconnectAttempts || 5}
                      onChange={(e) => handleSaveSettings({ maxReconnectAttempts: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Кэш */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Кэш ответов</CardTitle>
                  <CardDescription>
                    Многоуровневый кэш (L1 RAM + L2 SQLite)
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
                <div className="text-center">
                  <p className="text-2xl font-bold">{status?.cache.l1Size || 0}</p>
                  <p className="text-sm text-muted-foreground">L1 (RAM)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{status?.cache.l2Size || 0}</p>
                  <p className="text-sm text-muted-foreground">L2 (SQLite)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {status?.cache.topHits?.reduce((sum, h) => sum + h.hitCount, 0) || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Всего попаданий</p>
                </div>
              </div>

              <h4 className="font-medium mb-4">Топ запросов</h4>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {status?.cache.topHits?.map((hit, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate max-w-md">
                        {hit.promptPreview}...
                      </span>
                      <Badge variant="secondary">
                        {hit.hitCount} попаданий
                      </Badge>
                    </div>
                  ))}
                  {(!status?.cache.topHits || status.cache.topHits.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      Кэш пуст
                    </p>
                  )}
                </div>
              </ScrollArea>
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
                />
              </div>
              <Button onClick={handleTestRequest} disabled={testing || !testPrompt}>
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
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {testResponse}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DeepSeekFreePanel
