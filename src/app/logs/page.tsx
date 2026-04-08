'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Загружаем логи через SSE или polling
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/sim-auto/logs');
      if (response.ok) {
        const data = await response.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('/api/sim-auto/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'bg-blue-500';
      case 'warn': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'success': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📋 Логи МУКН
            <Badge variant="outline">{logs.length} записей</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">Все</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? '⏸ Автопрокрутка' : '▶ Автопрокрутка'}
            </Button>
            <Button variant="destructive" size="sm" onClick={clearLogs}>
              🗑 Очистить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full rounded border bg-black p-2 font-mono text-sm" ref={scrollRef}>
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Нет логов. Запустите процесс регистрации для просмотра логов.
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 py-1 hover:bg-gray-900 px-1 rounded"
                >
                  <span className="text-gray-500 text-xs shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                  </span>
                  <Badge className={`${getLevelColor(log.level)} text-xs shrink-0`}>
                    {log.level.toUpperCase()}
                  </Badge>
                  <span className="text-gray-300 break-all">
                    {log.message}
                    {log.details && (
                      <span className="text-gray-500 ml-2">({log.details})</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
