'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Shield, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const redirect = searchParams.get('redirect') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        router.push(redirect)
      } else {
        setError(data.error || 'Ошибка авторизации')
      }
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-800/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-white">МУКН | Трафик</CardTitle>
          <CardDescription className="text-gray-400">
            Локальная авторизация
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Пароль доступа
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите LOCAL_API_KEY"
                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || !password}
            >
              {loading ? 'Проверка...' : 'Войти'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
            <p className="text-xs text-gray-400 text-center">
              Установите <code className="text-blue-400">LOCAL_API_KEY</code> в файле{' '}
              <code className="text-gray-300">.env</code> для защиты проекта
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
