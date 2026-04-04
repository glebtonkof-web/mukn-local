'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  CalendarIcon,
  User,
  Settings,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Types
interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  user?: {
    id: string;
    name?: string;
    email: string;
  };
}

interface AuditLogFilters {
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Action type configurations
const ACTION_CONFIGS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  create: { label: 'Создание', color: 'bg-[#00D26A]/20 text-[#00D26A]', icon: <CheckCircle className="w-3 h-3" /> },
  update: { label: 'Обновление', color: 'bg-[#6C63FF]/20 text-[#6C63FF]', icon: <Settings className="w-3 h-3" /> },
  delete: { label: 'Удаление', color: 'bg-[#FF4D4D]/20 text-[#FF4D4D]', icon: <Trash2 className="w-3 h-3" /> },
  login: { label: 'Вход', color: 'bg-[#00B4D8]/20 text-[#00B4D8]', icon: <User className="w-3 h-3" /> },
  logout: { label: 'Выход', color: 'bg-[#8A8A8A]/20 text-[#8A8A8A]', icon: <User className="w-3 h-3" /> },
  start: { label: 'Запуск', color: 'bg-[#00D26A]/20 text-[#00D26A]', icon: <Activity className="w-3 h-3" /> },
  stop: { label: 'Остановка', color: 'bg-[#FFB800]/20 text-[#FFB800]', icon: <Activity className="w-3 h-3" /> },
  ban: { label: 'Бан', color: 'bg-[#FF4D4D]/20 text-[#FF4D4D]', icon: <XCircle className="w-3 h-3" /> },
  warning: { label: 'Предупреждение', color: 'bg-[#FFB800]/20 text-[#FFB800]', icon: <AlertTriangle className="w-3 h-3" /> },
  export: { label: 'Экспорт', color: 'bg-[#00B4D8]/20 text-[#00B4D8]', icon: <Download className="w-3 h-3" /> },
  import: { label: 'Импорт', color: 'bg-[#00B4D8]/20 text-[#00B4D8]', icon: <FileText className="w-3 h-3" /> },
};

// Entity type configurations
const ENTITY_LABELS: Record<string, string> = {
  influencer: 'Инфлюенсер',
  account: 'Аккаунт',
  campaign: 'Кампания',
  offer: 'Оффер',
  simCard: 'SIM-карта',
  proxy: 'Прокси',
  user: 'Пользователь',
  notification: 'Уведомление',
  comment: 'Комментарий',
  post: 'Пост',
  dm: 'Сообщение',
  settings: 'Настройки',
  system: 'Система',
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  
  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  // Available filter options
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  
  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('offset', (page * pageSize).toString());
      
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      
      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setHasMore(data.hasMore);
      
      if (data.filters) {
        setAvailableEntityTypes(data.filters.entityTypes || []);
        setAvailableActions(data.filters.actions || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Ошибка загрузки журнала');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);
  
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  
  // Apply date filters
  const applyDateFilters = () => {
    setFilters(prev => ({
      ...prev,
      startDate: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      endDate: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
    }));
    setPage(0);
  };
  
  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };
  
  // Export logs
  const exportLogs = async (format: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.append('type', 'audit-logs');
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const url = `/api/reports/export/${format}?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      toast.success(`Журнал экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта');
    }
  };
  
  // View log details
  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };
  
  // Format time ago
  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru });
  };
  
  // Get action config
  const getActionConfig = (action: string) => {
    return ACTION_CONFIGS[action] || {
      label: action,
      color: 'bg-[#8A8A8A]/20 text-[#8A8A8A]',
      icon: <Info className="w-3 h-3" />,
    };
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-[#6C63FF]" />
          <div>
            <h2 className="text-lg font-semibold text-white">Журнал изменений</h2>
            <p className="text-sm text-[#8A8A8A]">История всех действий в системе</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'border-[#2A2B32] text-[#8A8A8A] hover:text-white',
              showFilters && 'border-[#6C63FF] text-[#6C63FF]'
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Фильтры
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs()}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 bg-[#14151A] border-[#2A2B32]">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-[#1E1F26]"
                  onClick={() => exportLogs('excel')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-[#1E1F26]"
                  onClick={() => exportLogs('pdf')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF (.pdf)
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Поиск</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
                  <Input
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Поиск..."
                    className="pl-10 bg-[#1E1F26] border-[#2A2B32]"
                  />
                </div>
              </div>
              
              {/* Entity Type */}
              <div className="space-y-2">
                <Label>Тип сущности</Label>
                <Select
                  value={filters.entityType || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, entityType: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    <SelectItem value="all">Все типы</SelectItem>
                    {availableEntityTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {ENTITY_LABELS[type] || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Action */}
              <div className="space-y-2">
                <Label>Действие</Label>
                <Select
                  value={filters.action || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, action: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue placeholder="Все действия" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    <SelectItem value="all">Все действия</SelectItem>
                    {availableActions.map(action => (
                      <SelectItem key={action} value={action}>
                        {ACTION_CONFIGS[action]?.label || action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Период</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 bg-[#1E1F26] border-[#2A2B32] text-white justify-start',
                          !dateFrom && 'text-[#8A8A8A]'
                        )}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : 'От'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#14151A] border-[#2A2B32]">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'flex-1 bg-[#1E1F26] border-[#2A2B32] text-white justify-start',
                          !dateTo && 'text-[#8A8A8A]'
                        )}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dateTo ? format(dateTo, 'dd.MM.yyyy') : 'До'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#14151A] border-[#2A2B32]">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-[#2A2B32] text-[#8A8A8A]"
              >
                Сбросить
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  applyDateFilters();
                  setPage(0);
                }}
                className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
              >
                Применить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="text-sm text-[#8A8A8A]">Всего записей</div>
            <div className="text-2xl font-bold text-white">{total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="text-sm text-[#8A8A8A]">Сегодня</div>
            <div className="text-2xl font-bold text-white">
              {logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="text-sm text-[#8A8A8A]">За неделю</div>
            <div className="text-2xl font-bold text-white">
              {logs.filter(l => {
                const diff = Date.now() - new Date(l.createdAt).getTime();
                return diff < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14151A] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="text-sm text-[#8A8A8A]">Типов действий</div>
            <div className="text-2xl font-bold text-white">{availableActions.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Logs Table */}
      <Card className="bg-[#14151A] border-[#2A2B32]">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2A2B32] hover:bg-transparent">
                  <TableHead className="text-[#8A8A8A]">Дата</TableHead>
                  <TableHead className="text-[#8A8A8A]">Действие</TableHead>
                  <TableHead className="text-[#8A8A8A]">Сущность</TableHead>
                  <TableHead className="text-[#8A8A8A]">ID</TableHead>
                  <TableHead className="text-[#8A8A8A]">Пользователь</TableHead>
                  <TableHead className="text-[#8A8A8A]">Детали</TableHead>
                  <TableHead className="text-[#8A8A8A] w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#6C63FF]" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#8A8A8A]">
                      Нет записей в журнале
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const actionConfig = getActionConfig(log.action);
                    return (
                      <TableRow
                        key={log.id}
                        className="border-[#2A2B32] hover:bg-[#1E1F26] cursor-pointer"
                        onClick={() => viewLogDetails(log)}
                      >
                        <TableCell className="text-white">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#8A8A8A]" />
                            <div>
                              <div className="text-sm">{format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm')}</div>
                              <div className="text-xs text-[#8A8A8A]">{formatTimeAgo(log.createdAt)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('flex items-center gap-1 w-fit', actionConfig.color)}>
                            {actionConfig.icon}
                            {actionConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">
                          {ENTITY_LABELS[log.entityType] || log.entityType}
                        </TableCell>
                        <TableCell className="text-[#8A8A8A] font-mono text-xs">
                          {log.entityId ? log.entityId.substring(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="text-white">
                          {log.user?.name || log.user?.email || 'Система'}
                        </TableCell>
                        <TableCell className="text-[#8A8A8A] max-w-[200px] truncate">
                          {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="w-4 h-4 text-[#8A8A8A]" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#8A8A8A]">
          Показано {logs.length} из {total} записей
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(prev => prev - 1)}
            className="border-[#2A2B32] text-[#8A8A8A]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 text-[#8A8A8A]">
            Страница {page + 1} из {Math.ceil(total / pageSize)}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setPage(prev => prev + 1)}
            className="border-[#2A2B32] text-[#8A8A8A]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#6C63FF]" />
              Детали записи
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#8A8A8A]">ID</Label>
                  <div className="font-mono text-sm">{selectedLog.id}</div>
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">Дата</Label>
                  <div>{format(new Date(selectedLog.createdAt), 'dd.MM.yyyy HH:mm:ss')}</div>
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">Действие</Label>
                  <div>
                    <Badge className={cn('mt-1', getActionConfig(selectedLog.action).color)}>
                      {getActionConfig(selectedLog.action).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">Тип сущности</Label>
                  <div>{ENTITY_LABELS[selectedLog.entityType] || selectedLog.entityType}</div>
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">ID сущности</Label>
                  <div className="font-mono text-sm">{selectedLog.entityId || '-'}</div>
                </div>
                <div>
                  <Label className="text-[#8A8A8A]">Пользователь</Label>
                  <div>{selectedLog.user?.name || selectedLog.user?.email || 'Система'}</div>
                </div>
              </div>
              
              {selectedLog.details && (
                <div>
                  <Label className="text-[#8A8A8A]">Детали</Label>
                  <pre className="mt-2 p-4 bg-[#1E1F26] rounded-lg text-sm overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AuditLogViewer;
