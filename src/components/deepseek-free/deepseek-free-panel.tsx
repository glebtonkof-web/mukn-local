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
  Activity,
  Cpu,
  TrendingUp,
  Shield
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"><CheckCircle className="w-3 h-3 mr-1" />Активен</Badge>
      case 'rate_limited':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Лимит</Badge>
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"><XCircle className="w-3 h-3 mr-1" />Забанен</Badge>
      case 'cooldown':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"><Clock className="w-3 h-3 mr-1" />Ожидание</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">Загрузка DeepSeek Free...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border/50 p-4 md:p-6 bg-gradient-to-r from-background to-background/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                DeepSeek Free
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Бесплатный безлимитный доступ к DeepSeek
              </p>
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Обновить
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Метрики */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  <span className="text-xs md:text-sm text-muted-foreground">Аккаунтов</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-emerald-400">
                  {status?.pool.active || 0}<span className="text-muted-foreground text-base">/{status?.pool.total || 0}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">активных</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                  <span className="text-xs md:text-sm text-muted-foreground">Запросов</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-blue-400">
                  {status?.metrics.requestsToday || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">сегодня</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                  <span className="text-xs md:text-sm text-muted-foreground">Кэш HIT</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-purple-400">
                  {status?.metrics.successRate || 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">успешность</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
                  <span className="text-xs md:text-sm text-muted-foreground">Экономия</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-amber-400">
                  ${status?.metrics.estimatedSavings || '0.00'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">сэкономлено</p>
              </CardContent>
            </Card>
          </div>

          {/* Дополнительные метрики */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs text-muted-foreground">В очереди</p>
                <p className="text-sm font-medium">{status?.queue.size || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Avg время</p>
                <p className="text-sm font-medium">{status?.metrics.avgResponseTime || 0}ms</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Shield className="w-4 h-4 text-violet-400" />
              <div>
                <p className="text-xs text-muted-foreground">L1/L2 кэш</p>
                <p className="text-sm font-medium">{status?.cache.l1Size || 0}/{status?.cache.l2Size || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-xs text-muted-foreground">Ожидание</p>
                <p className="text-sm font-medium">{status?.queue.avgWaitTime || 0}ms</p>
              </div>
            </div>
          </div>

          {/* Табы */}
          <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1">
              <TabsTrigger value="accounts" className="text-xs md:text-sm py-2">
                <Users className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Аккаунты</span>
                <span className="sm:hidden">Аккаунты</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs md:text-sm py-2">
                <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Настройки</span>
                <span className="sm:hidden">Настройки</span>
              </TabsTrigger>
              <TabsTrigger value="cache" className="text-xs md:text-sm py-2">
                <Database className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Кэш</span>
                <span className="sm:hidden">Кэш</span>
              </TabsTrigger>
              <TabsTrigger value="test" className="text-xs md:text-sm py-2">
                <Zap className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Тест</span>
                <span className="sm:hidden">Тест</span>
              </TabsTrigger>
            </TabsList>

            {/* Аккаунты */}
            <TabsContent value="accounts" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold">Пул аккаунтов DeepSeek</h3>
                <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить аккаунт
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
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
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setAddAccountOpen(false)} className="w-full sm:w-auto">
                        Отмена
                      </Button>
                      <Button onClick={handleAddAccount} className="w-full sm:w-auto">
                        Добавить
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-3">
                {accounts.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="p-8 text-center">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Нет аккаунтов</p>
                      <p className="text-xs text-muted-foreground mt-1">Добавьте первый аккаунт DeepSeek</p>
                    </CardContent>
                  </Card>
                ) : (
                  accounts.map((account) => (
                    <Card key={account.id} className="bg-card/50 hover:bg-card/80 transition-colors">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                              <Brain className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm md:text-base">{account.email}</span>
                                {getStatusBadge(account.status)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Приоритет: {account.priority} • Запросов: {account.totalRequests}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="flex-1 sm:flex-none">
                              <p className="text-xs text-muted-foreground mb-1">Часовой лимит</p>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(account.hourlyUsed / account.hourlyLimit) * 100} 
                                  className="w-20 sm:w-24 h-2"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {account.hourlyUsed}/{account.hourlyLimit}
                                </span>
                              </div>
                            </div>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0">
                                  <Trash2 className="w-4 h-4 text-red-400" />
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
            <TabsContent value="settings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Настройки DeepSeek Free</CardTitle>
                  <CardDescription>
                    Конфигурация браузерной автоматизации и пула аккаунтов
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Пул аккаунтов */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Пул аккаунтов</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Мин. активных аккаунтов</Label>
                        <Input
                          type="number"
                          value={settings?.minActiveAccounts || 1}
                          onChange={(e) => handleSaveSettings({ minActiveAccounts: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Макс. активных аккаунтов</Label>
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
                    <h4 className="font-medium text-sm">Rate Limiting</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Глобальный лимит (запросов/час)</Label>
                        <Input
                          type="number"
                          value={settings?.globalHourlyLimit || 200}
                          onChange={(e) => handleSaveSettings({ globalHourlyLimit: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">На аккаунт (запросов/час)</Label>
                        <Input
                          type="number"
                          value={settings?.perAccountHourlyLimit || 25}
                          onChange={(e) => handleSaveSettings({ perAccountHourlyLimit: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <Label className="text-xs">Умная очередь</Label>
                      <Switch
                        checked={settings?.smartQueueEnabled ?? true}
                        onCheckedChange={(checked) => handleSaveSettings({ smartQueueEnabled: checked })}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Кэширование */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Кэширование</h4>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <Label className="text-xs">Включить кэш</Label>
                      <Switch
                        checked={settings?.cacheEnabled ?? true}
                        onCheckedChange={(checked) => handleSaveSettings({ cacheEnabled: checked })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">TTL кэша (минуты)</Label>
                        <Input
                          type="number"
                          value={settings?.cacheTTLMins || 60}
                          onChange={(e) => handleSaveSettings({ cacheTTLMins: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Макс. размер кэша</Label>
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
                    <h4 className="font-medium text-sm">Браузер</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <Label className="text-xs">Скрытый режим (headless)</Label>
                        <Switch
                          checked={settings?.headlessMode ?? true}
                          onCheckedChange={(checked) => handleSaveSettings({ headlessMode: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <Label className="text-xs">Имитация поведения человека</Label>
                        <Switch
                          checked={settings?.humanBehaviorEnabled ?? true}
                          onCheckedChange={(checked) => handleSaveSettings({ humanBehaviorEnabled: checked })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Скорость набора мин (мс)</Label>
                        <Input
                          type="number"
                          value={settings?.typingSpeedMin || 50}
                          onChange={(e) => handleSaveSettings({ typingSpeedMin: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Скорость набора макс (мс)</Label>
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
                    <h4 className="font-medium text-sm">Авто-восстановление</h4>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <Label className="text-xs">Авто-переподключение</Label>
                      <Switch
                        checked={settings?.autoReconnectEnabled ?? true}
                        onCheckedChange={(checked) => handleSaveSettings({ autoReconnectEnabled: checked })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Задержка переподключения (сек)</Label>
                        <Input
                          type="number"
                          value={settings?.reconnectDelaySec || 30}
                          onChange={(e) => handleSaveSettings({ reconnectDelaySec: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Макс. попыток</Label>
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
            <TabsContent value="cache" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Кэш ответов</CardTitle>
                      <CardDescription>
                        Многоуровневый кэш (L1 RAM + L2 SQLite)
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Очистить
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
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                      <p className="text-2xl font-bold text-blue-400">{status?.cache.l1Size || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">L1 (RAM)</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                      <p className="text-2xl font-bold text-purple-400">{status?.cache.l2Size || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">L2 (SQLite)</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                      <p className="text-2xl font-bold text-emerald-400">
                        {status?.cache.topHits?.reduce((sum, h) => sum + h.hitCount, 0) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Попаданий</p>
                    </div>
                  </div>

                  <h4 className="font-medium mb-4">Топ запросов</h4>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {status?.cache.topHits?.map((hit, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm truncate max-w-[200px] md:max-w-md">
                            {hit.promptPreview}...
                          </span>
                          <Badge variant="secondary" className="shrink-0 ml-2">
                            {hit.hitCount}
                          </Badge>
                        </div>
                      ))}
                      {(!status?.cache.topHits || status.cache.topHits.length === 0) && (
                        <div className="text-center py-8">
                          <Database className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground">Кэш пуст</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Тест */}
            <TabsContent value="test" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Тестовый запрос</CardTitle>
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
                      className="w-full"
                    />
                  </div>
                  <Button 
                    onClick={handleTestRequest} 
                    disabled={testing || !testPrompt}
                    className="w-full sm:w-auto"
                  >
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
                      <div className="p-4 bg-muted/30 rounded-lg whitespace-pre-wrap text-sm">
                        {testResponse}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}

export default DeepSeekFreePanel
