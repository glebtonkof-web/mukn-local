'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Mail, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Play, 
  CheckCircle, 
  XCircle,
  Clock,
  Loader2,
  Globe,
  Users
} from 'lucide-react'

interface EmailAccount {
  id: string
  email: string
  service: {
    name: string
    displayName: string
    domain: string
  }
  status: string
  isVerified: boolean
  usedCount: number
  createdAt: string
  lastLoginAt?: string
}

interface RegistrationTask {
  id: string
  status: string
  platform: string
  email?: string
  socialUsername?: string
  error?: string
  createdAt: string
}

const EMAIL_PROVIDERS = [
  { value: 'gmail', label: 'Gmail', domain: 'gmail.com' },
  { value: 'yandex', label: 'Yandex Mail', domain: 'yandex.ru' },
  { value: 'mailru', label: 'Mail.ru', domain: 'mail.ru' },
  { value: 'outlook', label: 'Outlook', domain: 'outlook.com' },
  { value: 'protonmail', label: 'ProtonMail', domain: 'proton.me' },
  { value: 'rambler', label: 'Rambler', domain: 'rambler.ru' },
]

const SOCIAL_PLATFORMS = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'vk', label: 'VK' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'discord', label: 'Discord' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'twitch', label: 'Twitch' },
]

export function EmailAccountsPanel() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [tasks, setTasks] = useState<RegistrationTask[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0
  })
  
  // Формы
  const [registerEmailProvider, setRegisterEmailProvider] = useState('yandex')
  const [registerSocialPlatform, setRegisterSocialPlatform] = useState('telegram')
  const [batchCount, setBatchCount] = useState(5)
  const [useTempEmail, setUseTempEmail] = useState(false)

  // Загрузка данных
  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/email-accounts?limit=50')
      const data = await res.json()
      if (data.success) {
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/unified-registration')
      const data = await res.json()
      if (data.success) {
        setTasks(data.tasks)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  useEffect(() => {
    loadAccounts()
    loadTasks()
    const interval = setInterval(() => {
      loadTasks()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Создать временный email
  const createTempEmail = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_temp' })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Создан временный email: ${data.email}`)
        loadAccounts()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Зарегистрировать email
  const registerEmail = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          provider: registerEmailProvider
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Email зарегистрирован: ${data.email}`)
        loadAccounts()
      } else {
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Создать задачу на регистрацию соцсети
  const createSocialTask = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/unified-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_task',
          platform: registerSocialPlatform,
          useTempEmail,
          emailProvider: registerEmailProvider
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Задача создана: ${data.taskId}`)
        loadTasks()
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Массовая регистрация
  const batchRegister = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/unified-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_register',
          platforms: [registerSocialPlatform],
          count: batchCount,
          useTempEmail,
          emailProvider: registerEmailProvider
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Создано ${data.taskIds.length} задач`)
        loadTasks()
        // Запускаем обработку
        await fetch('/api/unified-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_processing' })
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Обработать задачу
  const processTask = async (taskId: string) => {
    try {
      await fetch('/api/unified-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_task', taskId })
      })
      loadTasks()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Удалить аккаунт
  const deleteAccount = async (id: string) => {
    if (!confirm('Удалить аккаунт?')) return
    try {
      await fetch(`/api/email-accounts?id=${id}`, { method: 'DELETE' })
      loadAccounts()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      active: { variant: 'default', icon: CheckCircle },
      registered: { variant: 'default', icon: CheckCircle },
      completed: { variant: 'default', icon: CheckCircle },
      pending: { variant: 'secondary', icon: Clock },
      registering_email: { variant: 'outline', icon: Loader2 },
      registering_social: { variant: 'outline', icon: Loader2 },
      failed: { variant: 'destructive', icon: XCircle },
      banned: { variant: 'destructive', icon: XCircle }
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Почтовые аккаунты и регистрация
          </CardTitle>
          <CardDescription>
            Управление почтовыми аккаунтами и автоматическая регистрация в социальных сетях
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Статистика */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Всего задач</div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Ожидают</div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <div className="text-xs text-muted-foreground">В процессе</div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Завершено</div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Ошибок</div>
            </div>
          </div>

          <Tabs defaultValue="accounts">
            <TabsList>
              <TabsTrigger value="accounts">
                <Mail className="h-4 w-4 mr-2" />
                Email аккаунты ({accounts.length})
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <Clock className="h-4 w-4 mr-2" />
                Задачи ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="register">
                <Plus className="h-4 w-4 mr-2" />
                Регистрация
              </TabsTrigger>
            </TabsList>

            {/* Email аккаунты */}
            <TabsContent value="accounts" className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button onClick={createTempEmail} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Временный email
                </Button>
                <Button onClick={registerEmail} disabled={loading} variant="outline">
                  <Globe className="h-4 w-4 mr-2" />
                  Зарегистрировать {EMAIL_PROVIDERS.find(p => p.value === registerEmailProvider)?.label}
                </Button>
                <Select value={registerEmailProvider} onValueChange={setRegisterEmailProvider}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Сервис</th>
                      <th className="p-3 text-left">Статус</th>
                      <th className="p-3 text-left">Использований</th>
                      <th className="p-3 text-left">Создан</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(acc => (
                      <tr key={acc.id} className="border-t">
                        <td className="p-3 font-mono text-sm">{acc.email}</td>
                        <td className="p-3">{acc.service?.displayName || acc.service?.name}</td>
                        <td className="p-3">{getStatusBadge(acc.status)}</td>
                        <td className="p-3">{acc.usedCount}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(acc.createdAt).toLocaleString('ru')}
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost" onClick={() => deleteAccount(acc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {accounts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Нет email аккаунтов
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Задачи */}
            <TabsContent value="tasks" className="space-y-4">
              <Button onClick={() => loadTasks()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>

              <div className="border rounded-lg overflow-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">ID</th>
                      <th className="p-3 text-left">Платформа</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Username</th>
                      <th className="p-3 text-left">Статус</th>
                      <th className="p-3 text-left">Создан</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id} className="border-t">
                        <td className="p-3 font-mono text-xs">{task.id.slice(0, 8)}...</td>
                        <td className="p-3 font-medium">{task.platform}</td>
                        <td className="p-3 text-sm">{task.email || '-'}</td>
                        <td className="p-3 text-sm">{task.socialUsername || '-'}</td>
                        <td className="p-3">{getStatusBadge(task.status)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(task.createdAt).toLocaleString('ru')}
                        </td>
                        <td className="p-3">
                          {task.status === 'pending' && (
                            <Button size="sm" onClick={() => processTask(task.id)}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {tasks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Нет задач
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Регистрация */}
            <TabsContent value="register" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Регистрация соцсети */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Регистрация соцсети</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Платформа</Label>
                      <Select value={registerSocialPlatform} onValueChange={setRegisterSocialPlatform}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Email провайдер</Label>
                      <Select value={registerEmailProvider} onValueChange={setRegisterEmailProvider}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMAIL_PROVIDERS.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={useTempEmail}
                        onCheckedChange={setUseTempEmail}
                      />
                      <Label>Использовать временный email</Label>
                    </div>

                    <Button onClick={createSocialTask} disabled={loading} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Создать задачу
                    </Button>
                  </CardContent>
                </Card>

                {/* Массовая регистрация */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Массовая регистрация</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Платформа</Label>
                      <Select value={registerSocialPlatform} onValueChange={setRegisterSocialPlatform}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Количество аккаунтов</Label>
                      <Input
                        type="number"
                        value={batchCount}
                        onChange={e => setBatchCount(parseInt(e.target.value) || 1)}
                        min={1}
                        max={50}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={useTempEmail}
                        onCheckedChange={setUseTempEmail}
                      />
                      <Label>Временные email</Label>
                    </div>

                    <Button onClick={batchRegister} disabled={loading} className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Зарегистрировать {batchCount} аккаунтов
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmailAccountsPanel
