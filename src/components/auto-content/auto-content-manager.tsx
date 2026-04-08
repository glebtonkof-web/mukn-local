'use client';

/**
 * Auto Content Manager - UI для управления автогенерацией контента 24/365
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Settings,
  BarChart3,
  Clock,
  Zap,
  Image,
  Video,
  FileText,
  Music,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';

// Типы
interface Campaign {
  id: string;
  name: string;
  description?: string;
  contentTypes: string[];
  prompts: {
    basePrompt: string;
    variations?: string[];
    style?: string;
    tone?: string;
  };
  status: 'paused' | 'running' | 'stopped' | 'error';
  scheduleMode: string;
  intervalSeconds: number;
  workHoursStart: string;
  workHoursEnd: string;
  maxGenerationsPerDay: number;
  maxGenerationsPerHour: number;
  totalGenerated: number;
  totalPublished: number;
  totalFailed: number;
  lastGenerationAt?: string;
  startedAt?: string;
  autoPublish: boolean;
  createdAt: string;
}

interface Job {
  id: string;
  campaignId: string;
  contentType: string;
  prompt: string;
  status: string;
  resultUrl?: string;
  resultBase64?: string;
  createdAt: string;
  completedAt?: string;
}

export function AutoContentManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'jobs' | 'settings'>('campaigns');

  // Форма создания кампании
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contentTypes: ['image'] as string[],
    prompt: '',
    intervalSeconds: 300,
    maxGenerationsPerDay: 100,
    maxGenerationsPerHour: 10,
    autoPublish: false,
    autoStart: true,
    promptVariation: true,
  });

  // Загрузка данных
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsRes, jobsRes] = await Promise.all([
        fetch('/api/auto-content/campaigns'),
        fetch('/api/auto-content/jobs?limit=20'),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.data || []);
      }

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Обновляем данные каждые 30 секунд
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Управление кампанией
  const handleStartCampaign = async (id: string) => {
    try {
      await fetch(`/api/auto-content/campaigns/${id}/start`, { method: 'POST' });
      loadData();
    } catch (error) {
      console.error('Failed to start campaign:', error);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await fetch(`/api/auto-content/campaigns/${id}/pause`, { method: 'POST' });
      loadData();
    } catch (error) {
      console.error('Failed to pause campaign:', error);
    }
  };

  const handleStopCampaign = async (id: string) => {
    try {
      await fetch(`/api/auto-content/campaigns/${id}/stop`, { method: 'POST' });
      loadData();
    } catch (error) {
      console.error('Failed to stop campaign:', error);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Удалить кампанию?')) return;
    try {
      await fetch(`/api/auto-content/campaigns/${id}`, { method: 'DELETE' });
      loadData();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  // Создание кампании
  const handleCreateCampaign = async () => {
    try {
      const res = await fetch('/api/auto-content/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          contentTypes: formData.contentTypes,
          prompts: { basePrompt: formData.prompt },
          schedule: { intervalSeconds: formData.intervalSeconds },
          limits: {
            maxGenerationsPerDay: formData.maxGenerationsPerDay,
            maxGenerationsPerHour: formData.maxGenerationsPerHour,
          },
          publish: { autoPublish: formData.autoPublish },
          promptVariation: { enabled: formData.promptVariation },
          autoStart: formData.autoStart,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          contentTypes: ['image'],
          prompt: '',
          intervalSeconds: 300,
          maxGenerationsPerDay: 100,
          maxGenerationsPerHour: 10,
          autoPublish: false,
          autoStart: true,
          promptVariation: true,
        });
        loadData();
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  // Иконка типа контента
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Иконка статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'stopped': return <Square className="w-4 h-4 text-gray-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Статус на русском
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Работает';
      case 'paused': return 'Пауза';
      case 'stopped': return 'Остановлена';
      case 'error': return 'Ошибка';
      default: return status;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Автогенерация 24/365
          </h1>
          <p className="text-gray-500 text-sm">
            Автоматическое создание контента без остановки
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Новая кампания
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Всего кампаний</div>
          <div className="text-2xl font-bold">{campaigns.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Активных</div>
          <div className="text-2xl font-bold text-green-500">
            {campaigns.filter(c => c.status === 'running').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Всего сгенерировано</div>
          <div className="text-2xl font-bold">
            {campaigns.reduce((sum, c) => sum + c.totalGenerated, 0)}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="text-sm text-gray-500">Опубликовано</div>
          <div className="text-2xl font-bold text-blue-500">
            {campaigns.reduce((sum, c) => sum + c.totalPublished, 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'campaigns' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          Кампании
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'jobs' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          Задачи
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'settings' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          Настройки
        </button>
      </div>

      {/* Content */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Нет кампаний автогенерации</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Создать первую кампанию
              </button>
            </div>
          ) : (
            campaigns.map(campaign => (
              <div
                key={campaign.id}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(campaign.status)}
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <p className="text-sm text-gray-500">{campaign.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Каждые {Math.floor(campaign.intervalSeconds / 60)} мин
                        </span>
                        <span className="flex items-center gap-1">
                          {campaign.contentTypes.map(t => getContentTypeIcon(t))}
                        </span>
                        <span>
                          {campaign.workHoursStart} - {campaign.workHoursEnd}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === 'running' && (
                      <button
                        onClick={() => handlePauseCampaign(campaign.id)}
                        className="p-2 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                        title="Пауза"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {(campaign.status === 'paused' || campaign.status === 'stopped') && (
                      <button
                        onClick={() => handleStartCampaign(campaign.id)}
                        className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                        title="Запустить"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.status !== 'stopped' && (
                      <button
                        onClick={() => handleStopCampaign(campaign.id)}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Остановить"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCampaign(campaign)}
                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                      title="Статистика"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                  <div className="flex gap-6">
                    <div>
                      <span className="text-gray-500">Сгенерировано:</span>{' '}
                      <span className="font-medium">{campaign.totalGenerated}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Опубликовано:</span>{' '}
                      <span className="font-medium text-blue-500">{campaign.totalPublished}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ошибок:</span>{' '}
                      <span className="font-medium text-red-500">{campaign.totalFailed}</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {getStatusText(campaign.status)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Тип</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Промт</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Нет задач
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono">{job.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getContentTypeIcon(job.contentType)}
                        <span className="text-sm">{job.contentType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">
                      {job.prompt}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        job.status === 'completed' ? 'bg-green-100 text-green-700' :
                        job.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleString('ru')}
                    </td>
                    <td className="px-4 py-3">
                      {job.resultUrl && (
                        <a
                          href={job.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Глобальные настройки</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Автозапуск при старте</div>
                <div className="text-sm text-gray-500">
                  Автоматически запускать активные кампании при запуске системы
                </div>
              </div>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Уведомления</div>
                <div className="text-sm text-gray-500">
                  Отправлять уведомления о важных событиях
                </div>
              </div>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Новая кампания автогенерации</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Например: Ежедневные видео"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Краткое описание кампании"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Тип контента</label>
                <div className="flex gap-2 flex-wrap">
                  {['video', 'image', 'text', 'audio'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const types = formData.contentTypes.includes(type)
                          ? formData.contentTypes.filter(t => t !== type)
                          : [...formData.contentTypes, type];
                        setFormData({ ...formData, contentTypes: types });
                      }}
                      className={`px-3 py-2 rounded-lg flex items-center gap-1 ${
                        formData.contentTypes.includes(type)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      {getContentTypeIcon(type)}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Промт *</label>
                <textarea
                  value={formData.prompt}
                  onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Опишите, какой контент нужно генерировать..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Интервал (мин)</label>
                  <input
                    type="number"
                    value={formData.intervalSeconds / 60}
                    onChange={e => setFormData({ ...formData, intervalSeconds: parseInt(e.target.value) * 60 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Лимит в день</label>
                  <input
                    type="number"
                    value={formData.maxGenerationsPerDay}
                    onChange={e => setFormData({ ...formData, maxGenerationsPerDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={1}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Вариации промтов</div>
                  <div className="text-sm text-gray-500">
                    AI будет создавать вариации промтов для разнообразия
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.promptVariation}
                  onChange={e => setFormData({ ...formData, promptVariation: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Автозапуск</div>
                  <div className="text-sm text-gray-500">
                    Запустить сразу после создания
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoStart}
                  onChange={e => setFormData({ ...formData, autoStart: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={!formData.name || !formData.prompt}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedCampaign.name}</h2>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="p-2 hover:bg-gray-100 rounded-lg text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Сгенерировано</div>
                <div className="text-2xl font-bold">{selectedCampaign.totalGenerated}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Опубликовано</div>
                <div className="text-2xl font-bold text-blue-500">{selectedCampaign.totalPublished}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Ошибок</div>
                <div className="text-2xl font-bold text-red-500">{selectedCampaign.totalFailed}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Успешность</div>
                <div className="text-2xl font-bold text-green-500">
                  {selectedCampaign.totalGenerated > 0
                    ? Math.round((selectedCampaign.totalGenerated - selectedCampaign.totalFailed) / selectedCampaign.totalGenerated * 100)
                    : 0}%
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-2">Промт</div>
              <div className="text-sm text-gray-600">{selectedCampaign.prompts.basePrompt}</div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoContentManager;
