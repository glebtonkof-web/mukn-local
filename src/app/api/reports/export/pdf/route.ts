/**
 * PDF Export API Endpoint
 * Generates PDF reports using jspdf and jspdf-autotable
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Color scheme
const COLORS = {
  primary: [108, 99, 255] as [number, number, number],
  secondary: [42, 43, 50] as [number, number, number],
  success: [0, 210, 106] as [number, number, number],
  warning: [255, 184, 0] as [number, number, number],
  danger: [255, 77, 77] as [number, number, number],
  text: [255, 255, 255] as [number, number, number],
  gray: [138, 138, 138] as [number, number, number],
};

// Add header to PDF
function addHeader(doc: jsPDF, title: string, period?: string) {
  // Logo area
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 30, 'F');
  
  // Title
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('МУКН | Трафик', 15, 15);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 15, 23);
  
  // Period if provided
  if (period) {
    doc.setFontSize(10);
    doc.text(period, 150, 23);
  }
  
  // Date generated
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.text(`Сгенерировано: ${formatDate(new Date())}`, 150, 15);
}

// Add footer to PDF
function addFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, pageHeight - 15, 210, 15, 'F');
  
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(8);
  doc.text(
    `Страница ${pageNumber} из ${totalPages}`,
    105,
    pageHeight - 7,
    { align: 'center' }
  );
  doc.text('МУКН | Трафик - Enterprise AI-платформа', 15, pageHeight - 7);
}

// Generate Dashboard PDF
async function generateDashboardPDF(startDate?: string, endDate?: string): Promise<Buffer> {
  const doc = new jsPDF();
  let pageNum = 1;
  
  // Fetch data
  const [influencers, accounts, campaigns, offers] = await Promise.all([
    db.influencer.findMany(),
    db.account.findMany(),
    db.campaign.findMany(),
    db.offer.findMany(),
  ]);
  
  const period = startDate && endDate
    ? `Период: ${formatDate(startDate)} - ${formatDate(endDate)}`
    : 'За всё время';
  
  addHeader(doc, 'Отчёт по дашборду', period);
  
  let yPos = 40;
  
  // Overview stats
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Общая статистика', 15, yPos);
  yPos += 10;
  
  const totalRevenue = influencers.reduce((sum, i) => sum + i.revenue, 0) +
                       campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const totalLeads = influencers.reduce((sum, i) => sum + i.leadsCount, 0) +
                     campaigns.reduce((sum, c) => sum + c.leadsCount, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent * 100).toFixed(1) : '0';
  
  autoTable(doc, {
    startY: yPos,
    head: [['Метрика', 'Значение']],
    body: [
      ['Всего инфлюенсеров', influencers.length.toString()],
      ['Активных инфлюенсеров', influencers.filter(i => i.status === 'active').length.toString()],
      ['Всего аккаунтов', accounts.length.toString()],
      ['Активных аккаунтов', accounts.filter(a => a.status === 'active').length.toString()],
      ['Всего кампаний', campaigns.length.toString()],
      ['Активных кампаний', campaigns.filter(c => c.status === 'active').length.toString()],
      ['Всего офферов', offers.length.toString()],
      ['Общий доход', formatCurrency(totalRevenue)],
      ['Всего лидов', totalLeads.toString()],
      ['Общий расход', formatCurrency(totalSpent)],
      ['ROI', `${roi}%`],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Influencers table
  if (yPos > 200) {
    doc.addPage();
    pageNum++;
    addHeader(doc, 'Отчёт по дашборду', period);
    yPos = 40;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Инфлюенсеры', 15, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Имя', 'Ниша', 'Статус', 'Подписчики', 'Доход', 'Риск бана']],
    body: influencers.slice(0, 20).map(i => [
      i.name,
      i.niche,
      i.status,
      i.subscribersCount.toString(),
      formatCurrency(i.revenue),
      `${i.banRisk}%`,
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Campaigns table
  if (yPos > 200) {
    doc.addPage();
    pageNum++;
    addHeader(doc, 'Отчёт по дашборду', period);
    yPos = 40;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Кампании', 15, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Название', 'Тип', 'Статус', 'Бюджет', 'Расход', 'Доход']],
    body: campaigns.map(c => [
      c.name,
      c.type,
      c.status,
      formatCurrency(c.budget, c.currency),
      formatCurrency(c.spent, c.currency),
      formatCurrency(c.revenue, c.currency),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

// Generate Campaigns PDF
async function generateCampaignsPDF(campaignIds?: string[], startDate?: string, endDate?: string): Promise<Buffer> {
  const doc = new jsPDF();
  
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
    },
  });
  
  const period = startDate && endDate
    ? `Период: ${formatDate(startDate)} - ${formatDate(endDate)}`
    : 'За всё время';
  
  addHeader(doc, 'Отчёт по кампаниям', period);
  
  let yPos = 40;
  
  for (const campaign of campaigns) {
    if (yPos > 220) {
      doc.addPage();
      addHeader(doc, 'Отчёт по кампаниям', period);
      yPos = 40;
    }
    
    // Campaign header
    doc.setFillColor(...COLORS.secondary);
    doc.rect(15, yPos - 5, 180, 25, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(campaign.name, 20, yPos + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(`Тип: ${campaign.type} | Статус: ${campaign.status}`, 20, yPos + 12);
    doc.text(`Ниша: ${campaign.niche || '-'} | Гео: ${campaign.geo || '-'}`, 20, yPos + 18);
    
    yPos += 30;
    
    // Campaign stats
    autoTable(doc, {
      startY: yPos,
      head: [['Метрика', 'Значение']],
      body: [
        ['Бюджет', formatCurrency(campaign.budget, campaign.currency)],
        ['Расход', formatCurrency(campaign.spent, campaign.currency)],
        ['Доход', formatCurrency(campaign.revenue, campaign.currency)],
        ['Лиды', campaign.leadsCount.toString()],
        ['Конверсии', campaign.conversions.toString()],
        ['ROI', campaign.spent > 0 
          ? `${((campaign.revenue - campaign.spent) / campaign.spent * 100).toFixed(1)}%`
          : '0%'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.text,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60 },
      },
      margin: { left: 15, right: 15 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Influencers in campaign
    if (campaign.CampaignInfluencer.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.primary);
      doc.text('Инфлюенсеры:', 15, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Имя', 'Ниша', 'Роль', 'Статус']],
        body: campaign.CampaignInfluencer.map(ci => [
          ci.Influencer?.name || '-',
          ci.Influencer?.niche || '-',
          ci.role,
          ci.status,
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: COLORS.text,
        },
        margin: { left: 15, right: 15 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }
  
  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

// Generate Accounts PDF
async function generateAccountsPDF(): Promise<Buffer> {
  const doc = new jsPDF();
  
  const accounts = await db.account.findMany({
    include: {
      Influencer: true,
    },
  });
  
  addHeader(doc, 'Отчёт по аккаунтам');
  
  let yPos = 40;
  
  // Overview
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Статистика аккаунтов', 15, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Статус', 'Количество']],
    body: [
      ['Всего', accounts.length.toString()],
      ['Активные', accounts.filter(a => a.status === 'active').length.toString()],
      ['На прогреве', accounts.filter(a => a.status === 'warming').length.toString()],
      ['Забаненные', accounts.filter(a => a.status === 'banned').length.toString()],
      ['Ограниченные', accounts.filter(a => a.status === 'limited').length.toString()],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Accounts by platform
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text('По платформам', 15, yPos);
  yPos += 5;
  
  const platforms = ['telegram', 'instagram', 'tiktok', 'youtube'];
  autoTable(doc, {
    startY: yPos,
    head: [['Платформа', 'Количество', 'Активных', 'Забаненных']],
    body: platforms.map(platform => [
      platform.charAt(0).toUpperCase() + platform.slice(1),
      accounts.filter(a => a.platform === platform).length.toString(),
      accounts.filter(a => a.platform === platform && a.status === 'active').length.toString(),
      accounts.filter(a => a.platform === platform && a.status === 'banned').length.toString(),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Detailed accounts list
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text('Список аккаунтов', 15, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Платформа', 'Username', 'Статус', 'Риск бана', 'Прогрев']],
    body: accounts.map(a => [
      a.platform,
      a.username || a.phone || '-',
      a.status,
      `${a.banRisk}%`,
      `${a.warmingProgress}%`,
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

// Generate Influencers PDF
async function generateInfluencersPDF(): Promise<Buffer> {
  const doc = new jsPDF();
  
  const influencers = await db.influencer.findMany({
    include: {
      Account: true,
      Post: true,
    },
  });
  
  addHeader(doc, 'Отчёт по инфлюенсерам');
  
  let yPos = 40;
  
  // Overview
  const totalRevenue = influencers.reduce((sum, i) => sum + i.revenue, 0);
  const totalLeads = influencers.reduce((sum, i) => sum + i.leadsCount, 0);
  const avgBanRisk = influencers.length > 0
    ? Math.round(influencers.reduce((sum, i) => sum + i.banRisk, 0) / influencers.length)
    : 0;
  
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Общая статистика', 15, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Метрика', 'Значение']],
    body: [
      ['Всего инфлюенсеров', influencers.length.toString()],
      ['Активные', influencers.filter(i => i.status === 'active').length.toString()],
      ['На прогреве', influencers.filter(i => i.status === 'warming').length.toString()],
      ['Общий доход', formatCurrency(totalRevenue)],
      ['Всего лидов', totalLeads.toString()],
      ['Средний риск бана', `${avgBanRisk}%`],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // By niche
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text('По нишам', 15, yPos);
  yPos += 5;
  
  const niches = [...new Set(influencers.map(i => i.niche))];
  autoTable(doc, {
    startY: yPos,
    head: [['Ниша', 'Количество', 'Доход', 'Лиды']],
    body: niches.map(niche => [
      niche,
      influencers.filter(i => i.niche === niche).length.toString(),
      formatCurrency(influencers.filter(i => i.niche === niche).reduce((s, i) => s + i.revenue, 0)),
      influencers.filter(i => i.niche === niche).reduce((s, i) => s + i.leadsCount, 0).toString(),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Detailed list
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text('Список инфлюенсеров', 15, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Имя', 'Ниша', 'Статус', 'Подписчики', 'Доход', 'Риск']],
    body: influencers.map(i => [
      i.name,
      i.niche,
      i.status,
      i.subscribersCount.toString(),
      formatCurrency(i.revenue),
      `${i.banRisk}%`,
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

// Generate Audit Logs PDF
async function generateAuditLogsPDF(startDate?: string, endDate?: string): Promise<Buffer> {
  const doc = new jsPDF();
  
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
    take: 500,
  });
  
  const period = startDate && endDate
    ? `Период: ${formatDate(startDate)} - ${formatDate(endDate)}`
    : 'За всё время';
  
  addHeader(doc, 'Журнал действий', period);
  
  let yPos = 40;
  
  // Overview
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Статистика действий', 15, yPos);
  yPos += 5;
  
  const actionTypes = [...new Set(logs.map(l => l.action))];
  autoTable(doc, {
    startY: yPos,
    head: [['Тип действия', 'Количество']],
    body: actionTypes.map(action => [
      action,
      logs.filter(l => l.action === action).length.toString(),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Logs table
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text('Детальный журнал', 15, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Дата', 'Действие', 'Сущность', 'Пользователь', 'Детали']],
    body: logs.map(l => [
      formatDate(l.createdAt),
      l.action,
      l.entityType,
      l.User?.name || l.User?.email || '-',
      l.details ? JSON.stringify(l.details).substring(0, 50) : '-',
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { cellWidth: 55 },
    },
    margin: { left: 15, right: 15 },
  });
  
  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

// Main GET handler
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'dashboard';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const campaignIds = searchParams.getAll('campaignIds') || undefined;
    
    let pdfBuffer: Buffer;
    
    switch (type) {
      case 'dashboard':
        pdfBuffer = await generateDashboardPDF(startDate, endDate);
        break;
      case 'campaigns':
        pdfBuffer = await generateCampaignsPDF(campaignIds, startDate, endDate);
        break;
      case 'accounts':
        pdfBuffer = await generateAccountsPDF();
        break;
      case 'influencers':
        pdfBuffer = await generateInfluencersPDF();
        break;
      case 'audit-logs':
        pdfBuffer = await generateAuditLogsPDF(startDate, endDate);
        break;
      default:
        pdfBuffer = await generateDashboardPDF(startDate, endDate);
    }
    
    const filename = `mukn-report-${type}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
