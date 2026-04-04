'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Sparkles, Film, Download, Trash2, RefreshCw,
  Dice5, Globe, Gamepad2, Clock, CheckCircle2,
  XCircle, Loader2, Eye
} from 'lucide-react'

interface Casino {
  id: string
  name: string
  geo: string[]
}

interface Game {
  slug: string
  name: string
  provider: string
  category: string
}

interface Creative {
  id: string
  casino_id: string
  casino_name: string
  game_slug: string
  geo: string
  duration: number
  mp4_path?: string
  gif_path?: string
  thumbnail_path?: string
  cta_text: string
  bonus_text: string
  offer_link: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  error?: string
}

interface ProgressInfo {
  step: string
  progress: number
  message: string
}

export function CreativeGeneratorPanel() {
  const [casinos, setCasinos] = useState<Casino[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [creatives, setCreatives] = useState<Creative[]>([])
  
  const [selectedCasino, setSelectedCasino] = useState<string>('')
  const [selectedGeo, setSelectedGeo] = useState<string>('')
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [duration, setDuration] = useState<number>(15)
  const [count, setCount] = useState<number>(1)
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'gif' | 'both'>('mp4')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [activeTab, setActiveTab] = useState('generate')

  useEffect(() => {
    fetch('/api/creatives?action=casinos')
      .then(res => res.json())
      .then(data => setCasinos(data.casinos || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (selectedCasino) {
      fetch(`/api/creatives?action=games&casinoId=${selectedCasino}`)
        .then(res => res.json())
        .then(data => setGames(data.games || []))
        .catch(console.error)
      
      setSelectedGame('')
      const casino = casinos.find(c => c.id === selectedCasino)
      if (casino && casino.geo.length > 0) {
        setSelectedGeo(casino.geo[0])
      }
    }
  }, [selectedCasino, casinos])

  const loadCreatives = useCallback(() => {
    fetch('/api/creatives')
      .then(res => res.json())
      .then(data => setCreatives(data.creatives || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    loadCreatives()
  }, [loadCreatives])

  const handleGenerate = async () => {
    if (!selectedCasino) return

    setIsGenerating(true)
    setProgress({ step: 'init', progress: 0, message: 'Инициализация генерации...' })

    try {
      const response = await fetch('/api/creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: count > 1 ? 'generate_batch' : 'generate',
          casino_id: selectedCasino,
          geo: selectedGeo || undefined,
          game_slug: selectedGame || undefined,
          duration,
          output_format: outputFormat,
          count
        })
      })

      const data = await response.json()

      if (data.success) {
        setProgress({ step: 'complete', progress: 100, message: 'Креативы успешно созданы!' })
        loadCreatives()
      } else {
        setProgress({ step: 'error', progress: 0, message: data.error || 'Ошибка генерации' })
      }
    } catch (error: any) {
      setProgress({ step: 'error', progress: 0, message: error.message })
    } finally {
      setIsGenerating(false)
      setTimeout(() => setProgress(null), 3000)
    }
  }

  const handleDelete = async (creativeId: string) => {
    try {
      await fetch(`/api/creatives?creativeId=${creativeId}`, { method: 'DELETE' })
      loadCreatives()
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'processing': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin" />
      case 'failed': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6 text-orange-500" />
            Генератор гемблинг-креативов
          </h2>
          <p className="text-muted-foreground">
            Создание видео-креативов под бренды казино
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {creatives.filter(c => c.status === 'completed').length} креативов
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">Генерация</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
          <TabsTrigger value="casinos">Казино</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Параметры генерации</CardTitle>
              <CardDescription>Выберите казино, гео и игру</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Dice5 className="w-4 h-4" />
                    Казино
                  </Label>
                  <Select value={selectedCasino} onValueChange={setSelectedCasino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите казино" />
                    </SelectTrigger>
                    <SelectContent>
                      {casinos.map(casino => (
                        <SelectItem key={casino.id} value={casino.id}>
                          {casino.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Гео
                  </Label>
                  <Select value={selectedGeo} onValueChange={setSelectedGeo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите гео" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCasino && casinos.find(c => c.id === selectedCasino)?.geo.map(geo => (
                        <SelectItem key={geo} value={geo}>{geo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    Игра
                  </Label>
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger>
                      <SelectValue placeholder="Случайная игра" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">🎲 Случайная</SelectItem>
                      {games.map(game => (
                        <SelectItem key={game.slug} value={game.slug}>
                          {game.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Длительность</Label>
                  <Select value={duration.toString()} onValueChange={v => setDuration(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 сек</SelectItem>
                      <SelectItem value="15">15 сек</SelectItem>
                      <SelectItem value="20">20 сек</SelectItem>
                      <SelectItem value="30">30 сек</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Количество</Label>
                  <Input type="number" min={1} max={50} value={count}
                    onChange={e => setCount(parseInt(e.target.value) || 1)} />
                </div>

                <div className="space-y-2">
                  <Label>Формат</Label>
                  <Select value={outputFormat} onValueChange={v => setOutputFormat(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (1080x1920)</SelectItem>
                      <SelectItem value="gif">GIF (640x640)</SelectItem>
                      <SelectItem value="both">MP4 + GIF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{progress.message}</span>
                    <span>{progress.progress}%</span>
                  </div>
                  <Progress value={progress.progress} />
                </div>
              )}

              <Button onClick={handleGenerate} disabled={!selectedCasino || isGenerating} className="w-full">
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Генерация...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Создать {count > 1 ? `${count} креативов` : 'креатив'}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">История генераций</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {creatives.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Нет созданных креативов</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {creatives.map(creative => (
                      <div key={creative.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getStatusColor(creative.status)}`}>
                            {getStatusIcon(creative.status)}
                          </div>
                          <div>
                            <p className="font-medium">{creative.casino_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {creative.game_slug} • {creative.geo} • {creative.duration}сек
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {creative.mp4_path && (
                            <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                          )}
                          {creative.mp4_path && (
                            <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(creative.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="casinos">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Настроенные казино</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {casinos.map(casino => (
                  <div key={casino.id} className="p-4 rounded-lg border hover:border-orange-500 cursor-pointer transition-colors"
                    onClick={() => { setSelectedCasino(casino.id); setActiveTab('generate') }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold">
                        {casino.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{casino.name}</p>
                        <p className="text-xs text-muted-foreground">{casino.id}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {casino.geo.map(g => (
                        <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CreativeGeneratorPanel
