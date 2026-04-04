'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  Plus,
  X,
  Settings,
  MoreVertical,
  RefreshCw,
  Trash2,
  LayoutDashboard,
  BarChart3,
  PieChart,
  List,
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  MessageSquare,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

// Types
interface Widget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'list' | 'custom';
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  config?: string;
  dataSource?: string;
  filters?: string;
  refreshInterval: number;
  isVisible: boolean;
  isPinned: boolean;
}

interface WidgetData {
  [key: string]: unknown;
}

// Widget type configurations
const WIDGET_TYPES = [
  { type: 'kpi', name: 'KPI Карточка', icon: Target, defaultWidth: 1, defaultHeight: 1 },
  { type: 'chart', name: 'График', icon: BarChart3, defaultWidth: 2, defaultHeight: 1 },
  { type: 'pie', name: 'Круговая диаграмма', icon: PieChart, defaultWidth: 2, defaultHeight: 1 },
  { type: 'table', name: 'Таблица', icon: List, defaultWidth: 2, defaultHeight: 2 },
  { type: 'list', name: 'Список', icon: Activity, defaultWidth: 1, defaultHeight: 2 },
] as const;

const DATA_SOURCES = [
  { value: 'influencers', label: 'Инфлюенсеры' },
  { value: 'accounts', label: 'Аккаунты' },
  { value: 'campaigns', label: 'Кампании' },
  { value: 'offers', label: 'Офферы' },
  { value: 'revenue', label: 'Доход' },
  { value: 'activity', label: 'Активность' },
  { value: 'risks', label: 'Риски' },
];

const COLORS = ['#6C63FF', '#00D26A', '#FFB800', '#FF4D4D', '#00B4D8', '#FF6B6B'];

// Default widgets
const DEFAULT_WIDGETS: Widget[] = [
  {
    id: 'kpi-revenue',
    type: 'kpi',
    title: 'Доход сегодня',
    positionX: 0,
    positionY: 0,
    width: 1,
    height: 1,
    dataSource: 'revenue',
    refreshInterval: 60,
    isVisible: true,
    isPinned: false,
  },
  {
    id: 'kpi-accounts',
    type: 'kpi',
    title: 'Активные аккаунты',
    positionX: 1,
    positionY: 0,
    width: 1,
    height: 1,
    dataSource: 'accounts',
    refreshInterval: 60,
    isVisible: true,
    isPinned: false,
  },
  {
    id: 'kpi-comments',
    type: 'kpi',
    title: 'Комментариев сегодня',
    positionX: 2,
    positionY: 0,
    width: 1,
    height: 1,
    dataSource: 'activity',
    refreshInterval: 30,
    isVisible: true,
    isPinned: false,
  },
  {
    id: 'kpi-top-channel',
    type: 'kpi',
    title: 'Топ-канал',
    positionX: 3,
    positionY: 0,
    width: 1,
    height: 1,
    dataSource: 'campaigns',
    refreshInterval: 300,
    isVisible: true,
    isPinned: false,
  },
  {
    id: 'chart-revenue',
    type: 'chart',
    title: 'Динамика дохода',
    positionX: 0,
    positionY: 1,
    width: 2,
    height: 1,
    dataSource: 'revenue',
    refreshInterval: 60,
    isVisible: true,
    isPinned: false,
  },
  {
    id: 'list-activity',
    type: 'list',
    title: 'Последняя активность',
    positionX: 2,
    positionY: 1,
    width: 2,
    height: 2,
    dataSource: 'activity',
    refreshInterval: 30,
    isVisible: true,
    isPinned: false,
  },
  {
    id: 'pie-campaigns',
    type: 'pie',
    title: 'Распределение по кампаниям',
    positionX: 0,
    positionY: 2,
    width: 2,
    height: 1,
    dataSource: 'campaigns',
    refreshInterval: 300,
    isVisible: true,
    isPinned: false,
  },
];

// Mock data generators
const generateMockKPIData = (dataSource: string): { value: string | number; change: number; icon: React.ReactNode; color: string } => {
  switch (dataSource) {
    case 'revenue':
      return {
        value: `${Math.floor(Math.random() * 5000 + 500).toLocaleString()} ₽`,
        change: Math.random() * 20 - 5,
        icon: <DollarSign className="w-5 h-5" />,
        color: '#00D26A',
      };
    case 'accounts':
      return {
        value: Math.floor(Math.random() * 30 + 15),
        change: Math.random() * 10 - 3,
        icon: <Users className="w-5 h-5" />,
        color: '#6C63FF',
      };
    case 'activity':
      return {
        value: Math.floor(Math.random() * 200 + 50),
        change: Math.random() * 15,
        icon: <MessageSquare className="w-5 h-5" />,
        color: '#00B4D8',
      };
    case 'campaigns':
      return {
        value: '@crypto_signals',
        change: 0,
        icon: <TrendingUp className="w-5 h-5" />,
        color: '#FFB800',
      };
    default:
      return {
        value: '-',
        change: 0,
        icon: <Activity className="w-5 h-5" />,
        color: '#8A8A8A',
      };
  }
};

const generateMockChartData = () => {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return days.map(day => ({
    name: day,
    value: Math.floor(Math.random() * 3000 + 500),
    secondary: Math.floor(Math.random() * 100 + 20),
  }));
};

const generateMockPieData = () => {
  return [
    { name: 'Crypto Signals', value: 4000 },
    { name: 'Casino Royale', value: 3000 },
    { name: 'Dating Apps', value: 2000 },
    { name: 'Nutra', value: 1500 },
    { name: 'Другие', value: 1000 },
  ];
};

const generateMockActivityData = () => {
  const types = [
    { type: 'comment', message: 'Комментарий опубликован в @crypto_news', color: 'bg-[#6C63FF]/20 text-[#6C63FF]' },
    { type: 'warning', message: 'Аккаунт приближается к лимиту', color: 'bg-[#FFB800]/20 text-[#FFB800]' },
    { type: 'ban', message: 'Аккаунт заблокирован', color: 'bg-[#FF4D4D]/20 text-[#FF4D4D]' },
    { type: 'success', message: 'Кампания запущена', color: 'bg-[#00D26A]/20 text-[#00D26A]' },
    { type: 'join', message: 'Новый аккаунт добавлен', color: 'bg-[#00D26A]/20 text-[#00D26A]' },
  ];
  
  return Array.from({ length: 10 }, (_, i) => {
    const randomType = types[Math.floor(Math.random() * types.length)];
    return {
      id: `activity-${i}`,
      ...randomType,
      time: `${Math.floor(Math.random() * 60) + 1} мин назад`,
    };
  });
};

// KPI Widget Component
function KPIWidget({ widget, onEdit, onDelete }: { widget: Widget; onEdit: () => void; onDelete: () => void }) {
  const [data, setData] = useState(generateMockKPIData(widget.dataSource || 'revenue'));
  const [loading, setLoading] = useState(false);
  
  const refreshData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setData(generateMockKPIData(widget.dataSource || 'revenue'));
      setLoading(false);
    }, 500);
  }, [widget.dataSource]);
  
  useEffect(() => {
    const interval = setInterval(refreshData, widget.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [widget.refreshInterval, refreshData]);
  
  return (
    <Card className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-all h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
        <CardTitle className="text-sm font-medium text-[#8A8A8A]">{widget.title}</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={refreshData}>
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
              <DropdownMenuItem onClick={onEdit} className="text-white hover:bg-[#1E1F26]">
                <Settings className="w-4 h-4 mr-2" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-[#FF4D4D] hover:bg-[#1E1F26]">
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-white">{data.value}</p>
            {data.change !== 0 && (
              <div className={cn('flex items-center gap-1 mt-1 text-sm', data.change >= 0 ? 'text-[#00D26A]' : 'text-[#FF4D4D]')}>
                {data.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {data.change >= 0 ? '+' : ''}{data.change.toFixed(1)}%
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${data.color}20` }}>
            <span style={{ color: data.color }}>{data.icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Chart Widget Component
function ChartWidget({ widget, onEdit, onDelete }: { widget: Widget; onEdit: () => void; onDelete: () => void }) {
  const [data] = useState(generateMockChartData);
  
  return (
    <Card className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-all h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
        <CardTitle className="text-sm font-medium text-white">{widget.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
            <DropdownMenuItem onClick={onEdit} className="text-white hover:bg-[#1E1F26]">
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-[#FF4D4D] hover:bg-[#1E1F26]">
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2B32" />
              <XAxis dataKey="name" stroke="#8A8A8A" fontSize={10} />
              <YAxis stroke="#8A8A8A" fontSize={10} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#6C63FF" radius={[4, 4, 0, 0]} name="Доход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Pie Chart Widget Component
function PieWidget({ widget, onEdit, onDelete }: { widget: Widget; onEdit: () => void; onDelete: () => void }) {
  const [data] = useState(generateMockPieData);
  
  return (
    <Card className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-all h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
        <CardTitle className="text-sm font-medium text-white">{widget.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
            <DropdownMenuItem onClick={onEdit} className="text-white hover:bg-[#1E1F26]">
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-[#FF4D4D] hover:bg-[#1E1F26]">
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#14151A', border: '1px solid #2A2B32', borderRadius: '8px' }}
              />
              <Legend />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// List Widget Component
function ListWidget({ widget, onEdit, onDelete }: { widget: Widget; onEdit: () => void; onDelete: () => void }) {
  const [data] = useState(generateMockActivityData);
  
  return (
    <Card className="bg-[#14151A] border-[#2A2B32] hover:border-[#6C63FF]/50 transition-all h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
        <CardTitle className="text-sm font-medium text-white">{widget.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#14151A] border-[#2A2B32]">
            <DropdownMenuItem onClick={onEdit} className="text-white hover:bg-[#1E1F26]">
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-[#FF4D4D] hover:bg-[#1E1F26]">
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {data.map(item => (
              <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-[#1E1F26] hover:bg-[#2A2B32] transition-colors">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0', item.color)}>
                  <Activity className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{item.message}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Main Widget Dashboard Component
export function WidgetDashboard() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Form state for new/edit widget
  const [formData, setFormData] = useState<Partial<Widget>>({
    title: '',
    type: 'kpi',
    dataSource: 'revenue',
    width: 1,
    height: 1,
    refreshInterval: 60,
    isVisible: true,
  });
  
  // Drag handlers
  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };
  
  const handleDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    setDragOverPosition({ x, y });
  };
  
  const handleDrop = (e: React.DragEvent, targetX: number, targetY: number) => {
    e.preventDefault();
    if (!draggedWidget) return;
    
    setWidgets(prev => {
      const draggedIndex = prev.findIndex(w => w.id === draggedWidget);
      if (draggedIndex === -1) return prev;
      
      const draggedW = prev[draggedIndex];
      const others = prev.filter(w => w.id !== draggedWidget);
      
      // Update positions for all widgets after the target position
      const updatedWidgets = others.map(w => {
        if (w.positionY > targetY || (w.positionY === targetY && w.positionX >= targetX)) {
          return {
            ...w,
            positionY: w.positionY + (w.positionY === targetY && w.positionX >= targetX ? 0 : 1),
          };
        }
        return w;
      });
      
      updatedWidgets.push({
        ...draggedW,
        positionX: targetX,
        positionY: targetY,
      });
      
      return updatedWidgets.sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX);
    });
    
    setDraggedWidget(null);
    setDragOverPosition(null);
    toast.success('Виджет перемещён');
  };
  
  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverPosition(null);
  };
  
  // Widget CRUD handlers
  const handleAddWidget = () => {
    const maxY = Math.max(...widgets.map(w => w.positionY), 0);
    const maxXInLastRow = Math.max(
      ...widgets.filter(w => w.positionY === maxY).map(w => w.positionX + w.width),
      0
    );
    
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: formData.type as Widget['type'],
      title: formData.title || 'Новый виджет',
      positionX: maxXInLastRow >= 4 ? 0 : maxXInLastRow,
      positionY: maxXInLastRow >= 4 ? maxY + 1 : maxY,
      width: formData.width || 1,
      height: formData.height || 1,
      dataSource: formData.dataSource,
      refreshInterval: formData.refreshInterval || 60,
      isVisible: true,
      isPinned: false,
    };
    
    setWidgets(prev => [...prev, newWidget]);
    setAddDialogOpen(false);
    setFormData({
      title: '',
      type: 'kpi',
      dataSource: 'revenue',
      width: 1,
      height: 1,
      refreshInterval: 60,
      isVisible: true,
    });
    toast.success('Виджет добавлен');
  };
  
  const handleEditWidget = () => {
    if (!editingWidget) return;
    
    setWidgets(prev =>
      prev.map(w =>
        w.id === editingWidget.id
          ? { ...w, ...formData }
          : w
      )
    );
    
    setEditDialogOpen(false);
    setEditingWidget(null);
    setFormData({
      title: '',
      type: 'kpi',
      dataSource: 'revenue',
      width: 1,
      height: 1,
      refreshInterval: 60,
      isVisible: true,
    });
    toast.success('Виджет обновлён');
  };
  
  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    toast.success('Виджет удалён');
  };
  
  const openEditDialog = (widget: Widget) => {
    setEditingWidget(widget);
    setFormData({
      title: widget.title,
      type: widget.type,
      dataSource: widget.dataSource,
      width: widget.width,
      height: widget.height,
      refreshInterval: widget.refreshInterval,
      isVisible: widget.isVisible,
    });
    setEditDialogOpen(true);
  };
  
  // Render widget by type
  const renderWidget = (widget: Widget) => {
    const commonProps = {
      widget,
      onEdit: () => openEditDialog(widget),
      onDelete: () => handleDeleteWidget(widget.id),
    };
    
    switch (widget.type) {
      case 'kpi':
        return <KPIWidget {...commonProps} />;
      case 'chart':
        return <ChartWidget {...commonProps} />;
      case 'pie':
        return <PieWidget {...commonProps} />;
      case 'list':
        return <ListWidget {...commonProps} />;
      case 'table':
        return <ListWidget {...commonProps} />;
      default:
        return <KPIWidget {...commonProps} />;
    }
  };
  
  // Organize widgets into grid
  const renderGrid = () => {
    const grid: (Widget | null)[][] = Array(10).fill(null).map(() => Array(4).fill(null));
    
    widgets
      .filter(w => w.isVisible)
      .sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX)
      .forEach(widget => {
        const y = Math.min(widget.positionY, 9);
        const x = Math.min(widget.positionX, 3);
        grid[y][x] = widget;
      });
    
    return (
      <div className="space-y-4">
        {grid.map((row, y) => (
          <div key={y} className="grid grid-cols-4 gap-4">
            {row.map((widget, x) => (
              <div
                key={x}
                className={cn(
                  'min-h-[100px]',
                  dragOverPosition?.x === x && dragOverPosition?.y === y && 'ring-2 ring-[#6C63FF] rounded-lg'
                )}
                onDragOver={(e) => handleDragOver(e, x, y)}
                onDrop={(e) => handleDrop(e, x, y)}
              >
                {widget && (
                  <div
                    draggable
                    onDragStart={() => handleDragStart(widget.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'cursor-move h-full',
                      widget.width === 2 && 'col-span-2',
                      draggedWidget === widget.id && 'opacity-50'
                    )}
                  >
                    {renderWidget(widget)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-[#6C63FF]" />
          <div>
            <h2 className="text-lg font-semibold text-white">Настраиваемый дашборд</h2>
            <p className="text-sm text-[#8A8A8A]">Перетащите виджеты для изменения позиции</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWidgets(DEFAULT_WIDGETS)}
            className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Сбросить
          </Button>
          <Button
            onClick={() => setAddDialogOpen(true)}
            size="sm"
            className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить виджет
          </Button>
        </div>
      </div>
      
      {/* Widget Grid */}
      <div ref={gridRef} className="relative">
        {renderGrid()}
      </div>
      
      {/* Add Widget Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Добавить виджет</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Название виджета"
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Тип виджета</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as Widget['type'] })}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                  {WIDGET_TYPES.map(t => (
                    <SelectItem key={t.type} value={t.type}>
                      <div className="flex items-center gap-2">
                        <t.icon className="w-4 h-4" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Источник данных</Label>
              <Select value={formData.dataSource} onValueChange={(v) => setFormData({ ...formData, dataSource: v })}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                  {DATA_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ширина (колонки)</Label>
                <Select value={formData.width?.toString()} onValueChange={(v) => setFormData({ ...formData, width: parseInt(v) })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Высота (ряды)</Label>
                <Select value={formData.height?.toString()} onValueChange={(v) => setFormData({ ...formData, height: parseInt(v) })}>
                  <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Интервал обновления (секунды)</Label>
              <Input
                type="number"
                value={formData.refreshInterval}
                onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) })}
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="border-[#2A2B32]">
              Отмена
            </Button>
            <Button onClick={handleAddWidget} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Widget Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-[#14151A] border-[#2A2B32] text-white">
          <DialogHeader>
            <DialogTitle>Редактировать виджет</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Тип виджета</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as Widget['type'] })}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                  {WIDGET_TYPES.map(t => (
                    <SelectItem key={t.type} value={t.type}>
                      <div className="flex items-center gap-2">
                        <t.icon className="w-4 h-4" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Источник данных</Label>
              <Select value={formData.dataSource} onValueChange={(v) => setFormData({ ...formData, dataSource: v })}>
                <SelectTrigger className="bg-[#1E1F26] border-[#2A2B32]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#14151A] border-[#2A2B32]">
                  {DATA_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Интервал обновления (секунды)</Label>
              <Input
                type="number"
                value={formData.refreshInterval}
                onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) })}
                className="bg-[#1E1F26] border-[#2A2B32]"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Видим</Label>
              <Switch
                checked={formData.isVisible}
                onCheckedChange={(v) => setFormData({ ...formData, isVisible: v })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-[#2A2B32]">
              Отмена
            </Button>
            <Button onClick={handleEditWidget} className="bg-[#6C63FF] hover:bg-[#6C63FF]/80">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WidgetDashboard;
