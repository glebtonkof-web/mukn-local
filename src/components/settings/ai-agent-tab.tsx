'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Zap,
  GitBranch,
  Shield,
  Save,
  Loader2,
  Plus,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';
import { toast } from 'sonner';

interface AutomationRule {
  id: string;
  name: string;
  isActive: boolean;
  conditionType: string;
  conditionConfig: string;
  actionType: string;
  actionConfig: string;
}

export function AIAgentTab() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AutomationRule> | null>(null);

  // Загрузка правил
  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/automation');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки правил:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Создать новое правило
  const handleCreateRule = () => {
    setEditingRule({
      name: '',
      isActive: true,
      conditionType: 'time',
      conditionConfig: '{}',
      actionType: 'publish',
      actionConfig: '{}',
    });
  };

  // Сохранить правило
  const handleSaveRule = async () => {
    if (!editingRule) return;
    
    setIsSaving(true);
    try {
      const isNew = !editingRule.id;
      const url = '/api/settings/automation';
      const method = isNew ? 'POST' : 'PUT';
      const body = isNew 
        ? editingRule 
        : { id: editingRule.id, ...editingRule };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(isNew ? 'Правило создано' : 'Правило обновлено');
        setEditingRule(null);
        await loadRules();
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка сохранения правила');
    } finally {
      setIsSaving(false);
    }
  };

  // Переключить активность правила
  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      await fetch('/api/settings/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      });
      
      setRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, isActive: !r.isActive } : r
      ));
    } catch (error) {
      console.error('Ошибка переключения:', error);
    }
  };

  // Удалить правило
  const handleDeleteRule = async (id: string) => {
    try {
      await fetch(`/api/settings/automation?id=${id}`, {
        method: 'DELETE',
      });
      
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success('Правило удалено');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Ошибка удаления правила');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#6C63FF]" />
          <h3 className="text-white font-medium">IF-THEN правила</h3>
        </div>
        <Button
          onClick={handleCreateRule}
          size="sm"
          className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
        >
          <Plus className="w-4 h-4 mr-1" />
          Новое правило
        </Button>
      </div>

      {/* Редактор правила */}
      {editingRule && (
        <Card className="bg-[#1E1F26] border-[#6C63FF]">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              {editingRule.id ? 'Редактирование правила' : 'Новое правило'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[#8A8A8A] text-sm">Название</Label>
              <Input
                value={editingRule.name || ''}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                className="bg-[#14151A] border-[#2A2B32] text-white mt-1"
                placeholder="Например: Автопубликация в прайм-тайм"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#8A8A8A] text-sm">Тип условия</Label>
                <Select
                  value={editingRule.conditionType}
                  onValueChange={(v) => setEditingRule({ ...editingRule, conditionType: v })}
                >
                  <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="time" className="text-white">Время</SelectItem>
                    <SelectItem value="metrics" className="text-white">Метрики</SelectItem>
                    <SelectItem value="event" className="text-white">Событие</SelectItem>
                    <SelectItem value="quantity" className="text-white">Количество</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#8A8A8A] text-sm">Тип действия</Label>
                <Select
                  value={editingRule.actionType}
                  onValueChange={(v) => setEditingRule({ ...editingRule, actionType: v })}
                >
                  <SelectTrigger className="bg-[#14151A] border-[#2A2B32] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E1F26] border-[#2A2B32]">
                    <SelectItem value="publish" className="text-white">Опубликовать</SelectItem>
                    <SelectItem value="delete" className="text-white">Удалить</SelectItem>
                    <SelectItem value="edit" className="text-white">Редактировать</SelectItem>
                    <SelectItem value="switch_ai" className="text-white">Сменить AI</SelectItem>
                    <SelectItem value="notify" className="text-white">Уведомить</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[#8A8A8A] text-sm">Конфигурация условия (JSON)</Label>
              <Textarea
                value={editingRule.conditionConfig || '{}'}
                onChange={(e) => setEditingRule({ ...editingRule, conditionConfig: e.target.value })}
                className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[60px]"
                placeholder='{"time": "18:00", "days": ["monday", "tuesday"]}'
              />
            </div>

            <div>
              <Label className="text-[#8A8A8A] text-sm">Конфигурация действия (JSON)</Label>
              <Textarea
                value={editingRule.actionConfig || '{}'}
                onChange={(e) => setEditingRule({ ...editingRule, actionConfig: e.target.value })}
                className="bg-[#14151A] border-[#2A2B32] text-white mt-1 font-mono text-sm min-h-[60px]"
                placeholder='{"platform": "telegram", "content": "auto"}'
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingRule(null)}
                className="border-[#2A2B32] text-[#8A8A8A] hover:text-white"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSaveRule}
                disabled={isSaving || !editingRule.name}
                className="bg-[#6C63FF] hover:bg-[#6C63FF]/80"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список правил */}
      {rules.length === 0 ? (
        <Card className="bg-[#1E1F26] border-[#2A2B32]">
          <CardContent className="py-8 text-center">
            <Bot className="w-12 h-12 text-[#8A8A8A] mx-auto mb-4" />
            <p className="text-[#8A8A8A]">Нет созданных правил автоматизации</p>
            <Button
              onClick={handleCreateRule}
              variant="outline"
              className="mt-4 border-[#6C63FF] text-[#6C63FF]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать правило
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} className="bg-[#1E1F26] border-[#2A2B32]">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${rule.isActive ? 'bg-[#6C63FF]/20' : 'bg-[#2A2B32]'}`}>
                      <GitBranch className={`w-4 h-4 ${rule.isActive ? 'text-[#6C63FF]' : 'text-[#8A8A8A]'}`} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A] text-xs">
                          IF: {rule.conditionType}
                        </Badge>
                        <Badge variant="outline" className="border-[#2A2B32] text-[#8A8A8A] text-xs">
                          THEN: {rule.actionType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRule(rule)}
                      className={rule.isActive ? 'text-[#00D26A]' : 'text-[#8A8A8A]'}
                    >
                      {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                      className="text-[#8A8A8A] hover:text-white"
                    >
                      Редактировать
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-[#FF4D4D] hover:text-[#FF4D4D]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
