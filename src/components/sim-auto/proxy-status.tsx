'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Globe, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Shield,
  Zap
} from 'lucide-react'

interface ProxyStats {
  total: number
  working: number
  byType: Record<string, number>
  byCountry: Record<string, number>
  avgSpeed: number
}

interface ProxyInfo {
  id: string
  host: string
  port: number
  type: string
  country?: string
  speed?: number
  working?: boolean
}

export function ProxyStatus() {
  const [stats, setStats] = useState<ProxyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [proxies, setProxies] = useState<ProxyInfo[]>([])

  // Fetch proxy stats
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/proxy?action=stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch proxy stats')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresh proxies from sources
  const refreshProxies = async () => {
    try {
      setRefreshing(true)
      setError(null)
      
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setLastUpdate(new Date())
        await fetchStats()
      } else {
        setError(data.error || 'Failed to refresh proxies')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRefreshing(false)
    }
  }

  // Fetch proxy list
  const fetchProxyList = async () => {
    try {
      const response = await fetch('/api/proxy?action=list')
      const data = await response.json()
      
      if (data.success) {
        setProxies(data.proxies)
      }
    } catch (err) {
      console.error('Failed to fetch proxy list:', err)
    }
  }

  // Initial load
  useEffect(() => {
    fetchStats()
    fetchProxyList()
  }, [fetchStats])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const getStatusColor = () => {
    if (!stats) return 'secondary'
    if (stats.working >= 10) return 'success'
    if (stats.working >= 5) return 'warning'
    return 'destructive'
  }

  const getSpeedLabel = (speed: number) => {
    if (speed < 1000) return 'Быстрый'
    if (speed < 3000) return 'Средний'
    if (speed < 5000) return 'Медленный'
    return 'Очень медленный'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Прокси для РФ</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor()}>
              {stats?.working ?? 0} рабочих
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshProxies}
              disabled={refreshing}
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Автоматический сбор и проверка бесплатных прокси
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        
        {/* Loading */}
        {loading && !stats && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Всего проверено</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            
            {/* Working */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Рабочих</div>
              <div className="text-2xl font-bold text-green-500">{stats.working}</div>
            </div>
            
            {/* Success Rate */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Успешность</div>
              <div className="text-2xl font-bold">
                {stats.total > 0 
                  ? Math.round((stats.working / stats.total) * 100) 
                  : 0}%
              </div>
            </div>
            
            {/* Avg Speed */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Скорость</div>
              <div className="text-2xl font-bold">
                {Math.round(stats.avgSpeed)}ms
              </div>
            </div>
          </div>
        )}
        
        {/* By Type */}
        {stats && Object.keys(stats.byType).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">По типу:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {type.toUpperCase()}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* By Country */}
        {stats && Object.keys(stats.byCountry).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">По стране (топ 5):</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCountry)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([country, count]) => (
                  <Badge key={country} variant="outline">
                    <Globe className="h-3 w-3 mr-1" />
                    {country}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}
        
        {/* Proxy List */}
        {proxies.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Лучшие прокси:</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {proxies.slice(0, 10).map((proxy) => (
                <div 
                  key={proxy.id}
                  className="flex items-center justify-between bg-muted/30 rounded px-2 py-1 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{proxy.host}:{proxy.port}</span>
                    <Badge variant="outline" className="text-xs">
                      {proxy.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {proxy.country && (
                      <span className="text-xs">{proxy.country}</span>
                    )}
                    {proxy.speed && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {proxy.speed}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Last Update */}
        {lastUpdate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
          </div>
        )}
        
        {/* Progress when refreshing */}
        {refreshing && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Поиск и проверка прокси...
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProxyList}
            disabled={loading}
          >
            Обновить список
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={refreshProxies}
            disabled={refreshing}
          >
            {refreshing ? 'Поиск...' : 'Найти новые прокси'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
