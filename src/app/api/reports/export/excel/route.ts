/**
 * Excel Export API Endpoint
 * Generates Excel reports using xlsx library
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

// Helper to format date
function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Helper to format currency
function formatCurrency(amount: number, currency: string = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Style for header cells
function styleHeader(ws: XLSX.WorkSheet, cols: number) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '6C63FF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }
}

// Auto-size columns
function autoSizeColumns(ws: XLSX.WorkSheet, minWidth: number = 10, maxWidth: number = 50) {
  const colWidths: number[] = [];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  for (let c = range.s.c; c <= range.e.c; c++) {
    let maxLen = minWidth;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        const len = String(cell.v).length;
        maxLen = Math.min(Math.max(maxLen, len + 2), maxWidth);
      }
    }
    colWidths.push(maxLen);
  }
  
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
}

// Generate Dashboard Excel
async function generateDashboardExcel(startDate?: string, endDate?: string): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  
  // Fetch data
  const [influencers, accounts, campaigns, offers, actionLogs] = await Promise.all([
    db.influencer.findMany(),
    db.account.findMany(),
    db.campaign.findMany(),
    db.offer.findMany(),
    db.actionLog.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
  ]);
  
  // Overview sheet
  const overviewData = [
    ['МУКН | Трафик - Отчёт по дашборду'],
    ['Дата генерации:', formatDate(new Date())],
    ['Период:', startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'За всё время'],
    [],
    ['Общая статистика'],
    ['Метрика', 'Значение'],
    ['Всего инфлюенсеров', influencers.length],
    ['Активных инфлюенсеров', influencers.filter(i => i.status === 'active').length],
    ['Всего аккаунтов', accounts.length],
    ['Активных аккаунтов', accounts.filter(a => a.status === 'active').length],
    ['Забаненных аккаунтов', accounts.filter(a => a.status === 'banned').length],
    ['Всего кампаний', campaigns.length],
    ['Активных кампаний', campaigns.filter(c => c.status === 'active').length],
    ['Всего офферов', offers.length],
    ['Общий доход', influencers.reduce((s, i) => s + i.revenue, 0) + campaigns.reduce((s, c) => s + c.revenue, 0)],
    ['Всего лидов', influencers.reduce((s, i) => s + i.leadsCount, 0) + campaigns.reduce((s, c) => s + c.leadsCount, 0)],
    ['Общий расход', campaigns.reduce((s, c) => s + c.spent, 0)],
  ];
  
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  autoSizeColumns(wsOverview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Обзор');
  
  // Influencers sheet
  const influencersData = [
    ['Имя', 'Возраст', 'Пол', 'Ниша', 'Роль', 'Статус', 'Страна', 'Подписчики', 'Посты', 'Лиды', 'Доход', 'Риск бана', 'Telegram', 'Instagram', 'TikTok', 'Создан'],
    ...influencers.map(i => [
      i.name,
      i.age,
      i.gender,
      i.niche,
      i.role,
      i.status,
      i.country,
      i.subscribersCount,
      i.postsCount,
      i.leadsCount,
      i.revenue,
      `${i.banRisk}%`,
      i.telegramUsername || '-',
      i.instagramUsername || '-',
      i.tiktokUsername || '-',
      formatDate(i.createdAt),
    ]),
  ];
  
  const wsInfluencers = XLSX.utils.aoa_to_sheet(influencersData);
  styleHeader(wsInfluencers, influencersData[0].length);
  autoSizeColumns(wsInfluencers);
  XLSX.utils.book_append_sheet(wb, wsInfluencers, 'Инфлюенсеры');
  
  // Accounts sheet
  const accountsData = [
    ['Платформа', 'Username', 'Телефон', 'Email', 'Статус', 'Риск бана', 'Прогрев', 'Коммент. сегодня', 'DM сегодня', 'Макс. коммент.', 'Макс. DM', 'Прокси', 'Последнее использование', 'Создан'],
    ...accounts.map(a => [
      a.platform,
      a.username || '-',
      a.phone || '-',
      a.email || '-',
      a.status,
      `${a.banRisk}%`,
      `${a.warmingProgress}%`,
      a.dailyComments,
      a.dailyDm,
      a.maxComments,
      a.maxDm,
      a.proxyHost ? `${a.proxyHost}:${a.proxyPort}` : '-',
      formatDate(a.lastUsedAt),
      formatDate(a.createdAt),
    ]),
  ];
  
  const wsAccounts = XLSX.utils.aoa_to_sheet(accountsData);
  styleHeader(wsAccounts, accountsData[0].length);
  autoSizeColumns(wsAccounts);
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Аккаунты');
  
  // Campaigns sheet
  const campaignsData = [
    ['Название', 'Тип', 'Ниша', 'Гео', 'Статус', 'Бюджет', 'Расход', 'Доход', 'Лиды', 'Конверсии', 'ROI', 'Дата начала', 'Дата окончания', 'Создан'],
    ...campaigns.map(c => [
      c.name,
      c.type,
      c.niche || '-',
      c.geo || '-',
      c.status,
      c.budget,
      c.spent,
      c.revenue,
      c.leadsCount,
      c.conversions,
      c.spent > 0 ? `${((c.revenue - c.spent) / c.spent * 100).toFixed(1)}%` : '0%',
      formatDate(c.startDate),
      formatDate(c.endDate),
      formatDate(c.createdAt),
    ]),
  ];
  
  const wsCampaigns = XLSX.utils.aoa_to_sheet(campaignsData);
  styleHeader(wsCampaigns, campaignsData[0].length);
  autoSizeColumns(wsCampaigns);
  XLSX.utils.book_append_sheet(wb, wsCampaigns, 'Кампании');
  
  // Offers sheet
  const offersData = [
    ['Название', 'Сеть', 'Ниша', 'Гео', 'Статус', 'Выплата', 'Валюта', 'Клики', 'Лиды', 'Конверсии', 'Доход', 'Создан'],
    ...offers.map(o => [
      o.name,
      o.network || '-',
      o.niche || '-',
      o.geo || '-',
      o.status,
      o.payout,
      o.currency,
      o.clicks,
      o.leads,
      o.conversions,
      o.revenue,
      formatDate(o.createdAt),
    ]),
  ];
  
  const wsOffers = XLSX.utils.aoa_to_sheet(offersData);
  styleHeader(wsOffers, offersData[0].length);
  autoSizeColumns(wsOffers);
  XLSX.utils.book_append_sheet(wb, wsOffers, 'Офферы');
  
  // Activity Log sheet
  const activityData = [
    ['Дата', 'Действие', 'Тип сущности', 'ID сущности', 'Детали'],
    ...actionLogs.map(l => [
      formatDate(l.createdAt),
      l.action,
      l.entityType,
      l.entityId || '-',
      l.details ? JSON.stringify(l.details) : '-',
    ]),
  ];
  
  const wsActivity = XLSX.utils.aoa_to_sheet(activityData);
  styleHeader(wsActivity, activityData[0].length);
  autoSizeColumns(wsActivity);
  XLSX.utils.book_append_sheet(wb, wsActivity, 'Активность');
  
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// Generate Campaigns Excel
async function generateCampaignsExcel(campaignIds?: string[], startDate?: string, endDate?: string): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  
  const whereClause: any = {};
  if (campaignIds && campaignIds.length > 0) {
    whereClause.id = { in: campaignIds };
  }
  
  const campaigns = await db.campaign.findMany({
    where: whereClause,
    include: {
      CampaignInfluencer: {
        include: {
          Influencer: true,
        },
      },
      CampaignAnalytics: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });
  
  // Campaigns summary
  const summaryData = [
    ['МУКН | Трафик - Отчёт по кампаниям'],
    ['Дата генерации:', formatDate(new Date())],
    ['Период:', startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'За всё время'],
    [],
    ['Сводка'],
    ['Метрика', 'Значение'],
    ['Всего кампаний', campaigns.length],
    ['Активных', campaigns.filter(c => c.status === 'active').length],
    ['Общий бюджет', campaigns.reduce((s, c) => s + c.budget, 0)],
    ['Общий расход', campaigns.reduce((s, c) => s + c.spent, 0)],
    ['Общий доход', campaigns.reduce((s, c) => s + c.revenue, 0)],
    ['Всего лидов', campaigns.reduce((s, c) => s + c.leadsCount, 0)],
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  autoSizeColumns(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');
  
  // Campaigns detail
  const campaignsData = [
    ['ID', 'Название', 'Тип', 'Ниша', 'Гео', 'Статус', 'Бюджет', 'Расход', 'Доход', 'Лиды', 'Конверсии', 'ROI', 'Дата начала', 'Дата окончания'],
    ...campaigns.map(c => [
      c.id,
      c.name,
      c.type,
      c.niche || '-',
      c.geo || '-',
      c.status,
      c.budget,
      c.spent,
      c.revenue,
      c.leadsCount,
      c.conversions,
      c.spent > 0 ? ((c.revenue - c.spent) / c.spent * 100).toFixed(1) : 0,
      formatDate(c.startDate),
      formatDate(c.endDate),
    ]),
  ];
  
  const wsCampaigns = XLSX.utils.aoa_to_sheet(campaignsData);
  styleHeader(wsCampaigns, campaignsData[0].length);
  autoSizeColumns(wsCampaigns);
  XLSX.utils.book_append_sheet(wb, wsCampaigns, 'Кампании');
  
  // Per-campaign analytics sheets
  for (const campaign of campaigns) {
    const sheetName = campaign.name.substring(0, 31).replace(/[\\\/\?\*\[\]:]/g, '');
    
    // Campaign influencers
    const influencersData = [
      ['Инфлюенсеры кампании'],
      ['Имя', 'Ниша', 'Роль в кампании', 'Статус'],
      ...campaign.CampaignInfluencer.map(ci => [
        ci.Influencer?.name || '-',
        ci.Influencer?.niche || '-',
        ci.role,
        ci.status,
      ]),
    ];
    
    // Campaign analytics
    if (campaign.CampaignAnalytics.length > 0) {
      influencersData.push([]);
      influencersData.push(['Аналитика за последние 30 дней']);
      influencersData.push(['Дата', 'Показы', 'Клики', 'Лиды', 'Конверсии', 'Расход', 'Доход']);
      campaign.CampaignAnalytics.forEach(a => {
      influencersData.push([
        formatDate(a.date),
        String(a.impressions),
        String(a.clicks),
        String(a.leads),
        String(a.conversions),
        String(a.spent),
        String(a.revenue),
      ]);
      });
    }
    
    const wsCampaign = XLSX.utils.aoa_to_sheet(influencersData);
    autoSizeColumns(wsCampaign);
    XLSX.utils.book_append_sheet(wb, wsCampaign, sheetName);
  }
  
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// Generate Accounts Excel
async function generateAccountsExcel(): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  
  const accounts = await db.account.findMany({
    include: {
      Influencer: true,
      AccountRiskHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  
  // Overview
  const platforms = ['telegram', 'instagram', 'tiktok', 'youtube'];
  const overviewData = [
    ['МУКН | Трафик - Отчёт по аккаунтам'],
    ['Дата генерации:', formatDate(new Date())],
    [],
    ['Статистика по статусам'],
    ['Статус', 'Количество'],
    ['Всего', accounts.length],
    ['Активные', accounts.filter(a => a.status === 'active').length],
    ['На прогреве', accounts.filter(a => a.status === 'warming').length],
    ['Забаненные', accounts.filter(a => a.status === 'banned').length],
    ['Ограниченные', accounts.filter(a => a.status === 'limited').length],
    ['Флуд', accounts.filter(a => a.status === 'flood').length],
    [],
    ['Статистика по платформам'],
    ['Платформа', 'Всего', 'Активных', 'Забаненных', 'Средний риск бана'],
    ...platforms.map(p => [
      p.charAt(0).toUpperCase() + p.slice(1),
      accounts.filter(a => a.platform === p).length,
      accounts.filter(a => a.platform === p && a.status === 'active').length,
      accounts.filter(a => a.platform === p && a.status === 'banned').length,
      accounts.filter(a => a.platform === p).length > 0
        ? Math.round(accounts.filter(a => a.platform === p).reduce((s, a) => s + a.banRisk, 0) / accounts.filter(a => a.platform === p).length)
        : 0,
    ]),
  ];
  
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  autoSizeColumns(wsOverview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Обзор');
  
  // All accounts
  const accountsData = [
    ['ID', 'Платформа', 'Username', 'Телефон', 'Email', 'Статус', 'Риск бана', 'Прогрев %', 'Коммент. сегодня', 'DM сегодня', 'Подписки сегодня', 'Лайки сегодня', 'Макс. коммент.', 'Макс. DM', 'Макс. подписки', 'Прокси', 'Причина бана', 'Последнее использование', 'Создан', 'Обновлён'],
    ...accounts.map(a => [
      a.id,
      a.platform,
      a.username || '-',
      a.phone || '-',
      a.email || '-',
      a.status,
      a.banRisk,
      a.warmingProgress,
      a.dailyComments,
      a.dailyDm,
      a.dailyFollows,
      a.dailyLikes,
      a.maxComments,
      a.maxDm,
      a.maxFollows,
      a.proxyHost ? `${a.proxyHost}:${a.proxyPort}` : '-',
      a.banReason || '-',
      formatDate(a.lastUsedAt),
      formatDate(a.createdAt),
      formatDate(a.updatedAt),
    ]),
  ];
  
  const wsAccounts = XLSX.utils.aoa_to_sheet(accountsData);
  styleHeader(wsAccounts, accountsData[0].length);
  autoSizeColumns(wsAccounts);
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Аккаунты');
  
  // High risk accounts
  const highRiskAccounts = accounts.filter(a => a.banRisk >= 50);
  if (highRiskAccounts.length > 0) {
    const riskData = [
      ['Аккаунты с высоким риском бана (>= 50%)'],
      ['Платформа', 'Username', 'Риск бана', 'Статус', 'Последнее использование'],
      ...highRiskAccounts.map(a => [
        a.platform,
        a.username || a.phone || '-',
        `${a.banRisk}%`,
        a.status,
        formatDate(a.lastUsedAt),
      ]),
    ];
    
    const wsRisk = XLSX.utils.aoa_to_sheet(riskData);
    autoSizeColumns(wsRisk);
    XLSX.utils.book_append_sheet(wb, wsRisk, 'Высокий риск');
  }
  
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// Generate Influencers Excel
async function generateInfluencersExcel(): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  
  const influencers = await db.influencer.findMany({
    include: {
      Account: true,
      Post: { take: 20, orderBy: { createdAt: 'desc' } },
      InfluencerAnalytics: { take: 30, orderBy: { date: 'desc' } },
    },
  });
  
  // Overview
  const niches = [...new Set(influencers.map(i => i.niche))];
  const overviewData = [
    ['МУКН | Трафик - Отчёт по инфлюенсерам'],
    ['Дата генерации:', formatDate(new Date())],
    [],
    ['Общая статистика'],
    ['Метрика', 'Значение'],
    ['Всего инфлюенсеров', influencers.length],
    ['Активные', influencers.filter(i => i.status === 'active').length],
    ['На прогреве', influencers.filter(i => i.status === 'warming').length],
    ['Приостановленные', influencers.filter(i => i.status === 'paused').length],
    ['Забаненные', influencers.filter(i => i.status === 'banned').length],
    ['Общий доход', influencers.reduce((s, i) => s + i.revenue, 0)],
    ['Всего лидов', influencers.reduce((s, i) => s + i.leadsCount, 0)],
    ['Всего подписчиков', influencers.reduce((s, i) => s + i.subscribersCount, 0)],
    ['Средний риск бана', influencers.length > 0 ? Math.round(influencers.reduce((s, i) => s + i.banRisk, 0) / influencers.length) : 0],
    [],
    ['По нишам'],
    ['Ниша', 'Количество', 'Доход', 'Лиды', 'Подписчики'],
    ...niches.map(n => [
      n,
      influencers.filter(i => i.niche === n).length,
      influencers.filter(i => i.niche === n).reduce((s, i) => s + i.revenue, 0),
      influencers.filter(i => i.niche === n).reduce((s, i) => s + i.leadsCount, 0),
      influencers.filter(i => i.niche === n).reduce((s, i) => s + i.subscribersCount, 0),
    ]),
  ];
  
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  autoSizeColumns(wsOverview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Обзор');
  
  // All influencers
  const influencersData = [
    ['ID', 'Имя', 'Возраст', 'Пол', 'Ниша', 'Роль', 'Стиль', 'Страна', 'Язык', 'Статус', 'Подписчики', 'Посты', 'Лиды', 'Доход', 'Риск бана', 'Прогноз дней жизни', 'Telegram', 'Telegram канал', 'Instagram', 'TikTok', 'YouTube', 'Аккаунт', 'Создан'],
    ...influencers.map(i => [
      i.id,
      i.name,
      i.age,
      i.gender,
      i.niche,
      i.role,
      i.style,
      i.country,
      i.language,
      i.status,
      i.subscribersCount,
      i.postsCount,
      i.leadsCount,
      i.revenue,
      i.banRisk,
      i.predictedLifeDays || '-',
      i.telegramUsername || '-',
      i.telegramChannel || '-',
      i.instagramUsername || '-',
      i.tiktokUsername || '-',
      i.youtubeChannelId || '-',
      i.Account?.username || '-',
      formatDate(i.createdAt),
    ]),
  ];
  
  const wsInfluencers = XLSX.utils.aoa_to_sheet(influencersData);
  styleHeader(wsInfluencers, influencersData[0].length);
  autoSizeColumns(wsInfluencers);
  XLSX.utils.book_append_sheet(wb, wsInfluencers, 'Инфлюенсеры');
  
  // Top performers
  const topInfluencers = [...influencers]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);
  
  const topData = [
    ['Топ-20 инфлюенсеров по доходу'],
    ['Место', 'Имя', 'Ниша', 'Доход', 'Лиды', 'Подписчики', 'Риск бана', 'Статус'],
    ...topInfluencers.map((i, idx) => [
      idx + 1,
      i.name,
      i.niche,
      i.revenue,
      i.leadsCount,
      i.subscribersCount,
      `${i.banRisk}%`,
      i.status,
    ]),
  ];
  
  const wsTop = XLSX.utils.aoa_to_sheet(topData);
  autoSizeColumns(wsTop);
  XLSX.utils.book_append_sheet(wb, wsTop, 'Топ по доходу');
  
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// Generate Audit Logs Excel
async function generateAuditLogsExcel(startDate?: string, endDate?: string): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  
  const whereClause: any = {};
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt.gte = new Date(startDate);
    if (endDate) whereClause.createdAt.lte = new Date(endDate);
  }
  
  const logs = await db.actionLog.findMany({
    where: whereClause,
    include: {
      User: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });
  
  // Overview
  const actionTypes = [...new Set(logs.map(l => l.action))];
  const entityTypes = [...new Set(logs.map(l => l.entityType))];
  
  const overviewData = [
    ['МУКН | Трафик - Журнал действий'],
    ['Дата генерации:', formatDate(new Date())],
    ['Период:', startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'За всё время'],
    [],
    ['Статистика'],
    ['Метрика', 'Значение'],
    ['Всего записей', logs.length],
    [],
    ['По типам действий'],
    ['Действие', 'Количество'],
    ...actionTypes.map(action => [
      action,
      logs.filter(l => l.action === action).length,
    ]),
    [],
    ['По типам сущностей'],
    ['Тип сущности', 'Количество'],
    ...entityTypes.map(type => [
      type,
      logs.filter(l => l.entityType === type).length,
    ]),
  ];
  
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  autoSizeColumns(wsOverview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Сводка');
  
  // All logs
  const logsData = [
    ['ID', 'Дата', 'Действие', 'Тип сущности', 'ID сущности', 'Пользователь', 'Email', 'Детали'],
    ...logs.map(l => [
      l.id,
      formatDate(l.createdAt),
      l.action,
      l.entityType,
      l.entityId || '-',
      l.User?.name || '-',
      l.User?.email || '-',
      l.details ? JSON.stringify(l.details) : '-',
    ]),
  ];
  
  const wsLogs = XLSX.utils.aoa_to_sheet(logsData);
  styleHeader(wsLogs, logsData[0].length);
  autoSizeColumns(wsLogs);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Журнал');
  
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// Main GET handler
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'dashboard';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const campaignIds = searchParams.getAll('campaignIds') || undefined;
    
    let excelBuffer: Buffer;
    
    switch (type) {
      case 'dashboard':
        excelBuffer = await generateDashboardExcel(startDate, endDate);
        break;
      case 'campaigns':
        excelBuffer = await generateCampaignsExcel(campaignIds, startDate, endDate);
        break;
      case 'accounts':
        excelBuffer = await generateAccountsExcel();
        break;
      case 'influencers':
        excelBuffer = await generateInfluencersExcel();
        break;
      case 'audit-logs':
        excelBuffer = await generateAuditLogsExcel(startDate, endDate);
        break;
      default:
        excelBuffer = await generateDashboardExcel(startDate, endDate);
    }
    
    const filename = `mukn-report-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel report' },
      { status: 500 }
    );
  }
}
