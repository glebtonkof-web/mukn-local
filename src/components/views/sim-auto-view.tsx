'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Smartphone,
  UserPlus,
  Flame,
  TrendingUp,
  DollarSign,
  Zap,
  Shield,
} from 'lucide-react';

import { FullAutoLauncher } from '@/components/sim-auto/full-auto-launcher';
import { SimScannerPanel } from '@/components/sim-auto/sim-scanner-panel';
import { RegistrationPanel } from '@/components/sim-auto/registration-panel';
import { WarmingPanel } from '@/components/sim-auto/warming-panel';
import { SchemesPanel } from '@/components/sim-auto/schemes-panel';
import { ProfitDashboard } from '@/components/sim-auto/profit-dashboard';
import { ProxyStatus } from '@/components/sim-auto/proxy-status';

export function SimAutoView() {
  const [activeTab, setActiveTab] = useState('launcher');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#FFB800]" />
            SIM Auto-Registration
            <Badge className="bg-[#00D26A]/20 text-[#00D26A] ml-2">PRO</Badge>
          </h1>
          <p className="text-[#8A8A8A] mt-1">
            Автоматическая регистрация и монетизация через SIM-карты
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#14151A] border border-[#2A2B32] p-1 h-auto flex-wrap gap-1">
          <TabsTrigger
            value="launcher"
            className="data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white text-[#8A8A8A] flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            <span className="hidden sm:inline">Автозапуск</span>
          </TabsTrigger>
          <TabsTrigger
            value="sims"
            className="data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white text-[#8A8A8A] flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">SIM-карты</span>
          </TabsTrigger>
          <TabsTrigger
            value="registration"
            className="data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white text-[#8A8A8A] flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Регистрация</span>
          </TabsTrigger>
          <TabsTrigger
            value="warming"
            className="data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white text-[#8A8A8A] flex items-center gap-2"
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Прогрев</span>
          </TabsTrigger>
          <TabsTrigger
            value="schemes"
            className="data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white text-[#8A8A8A] flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Схемы</span>
          </TabsTrigger>
          <TabsTrigger
            value="profit"
            className="data-[state=active]:bg-[#6C63FF] data-[state=active]:text-white text-[#8A8A8A] flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Доход</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="launcher" className="space-y-6">
          <FullAutoLauncher />
          
          {/* Proxy Status for RF */}
          <ProxyStatus />
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4 text-center">
                <Smartphone className="w-6 h-6 mx-auto text-[#6C63FF] mb-2" />
                <div className="text-xl font-bold text-white">0</div>
                <div className="text-xs text-[#8A8A8A]">SIM-карт</div>
              </CardContent>
            </Card>
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4 text-center">
                <UserPlus className="w-6 h-6 mx-auto text-[#00D26A] mb-2" />
                <div className="text-xl font-bold text-white">0</div>
                <div className="text-xs text-[#8A8A8A]">Аккаунтов</div>
              </CardContent>
            </Card>
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-[#FFB800] mb-2" />
                <div className="text-xl font-bold text-white">0</div>
                <div className="text-xs text-[#8A8A8A]">Схем</div>
              </CardContent>
            </Card>
            <Card className="bg-[#14151A] border-[#2A2B32]">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-6 h-6 mx-auto text-[#00D26A] mb-2" />
                <div className="text-xl font-bold text-white">0₽</div>
                <div className="text-xs text-[#8A8A8A]">Доход</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sims">
          <SimScannerPanel />
        </TabsContent>

        <TabsContent value="registration">
          <RegistrationPanel />
        </TabsContent>

        <TabsContent value="warming">
          <WarmingPanel />
        </TabsContent>

        <TabsContent value="schemes">
          <SchemesPanel />
        </TabsContent>

        <TabsContent value="profit">
          <ProfitDashboard />
        </TabsContent>
      </Tabs>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#14151A] to-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#6C63FF]/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-[#6C63FF]" />
              </div>
              <div>
                <h3 className="text-white font-medium">Авто-сканирование</h3>
                <p className="text-xs text-[#8A8A8A]">Автоматическое обнаружение SIM</p>
              </div>
            </div>
            <p className="text-sm text-[#8A8A8A]">
              Система автоматически сканирует подключённые модемы и GSM-шлюзы для обнаружения доступных SIM-карт.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#14151A] to-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#00D26A]/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-[#00D26A]" />
              </div>
              <div>
                <h3 className="text-white font-medium">Умный прогрев</h3>
                <p className="text-xs text-[#8A8A8A]">21-дневная стратегия</p>
              </div>
            </div>
            <p className="text-sm text-[#8A8A8A]">
              Автоматический прогрев аккаунтов с адаптивными лимитами и контролем риска бана.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#14151A] to-[#1E1F26] border-[#2A2B32]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFB800]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <h3 className="text-white font-medium">AI-ранжирование</h3>
                <p className="text-xs text-[#8A8A8A]">Топ-50 лучших схем</p>
              </div>
            </div>
            <p className="text-sm text-[#8A8A8A]">
              ИИ анализирует и ранжирует схемы монетизации по эффективности и автоматически применяет лучшие.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SimAutoView;
