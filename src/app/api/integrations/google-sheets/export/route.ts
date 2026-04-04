/**
 * Google Sheets Export API Endpoint
 * Handles data export to Google Sheets
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleSheetsClient,
  getGoogleSheetsConnection,
  updateGoogleSheetsConnection,
  recordExport,
} from '@/lib/google-sheets';
import { logger } from '@/lib/logger';

// Supported export data types
const EXPORT_DATA_TYPES = [
  { value: 'campaigns', label: 'Кампании', description: 'Экспорт данных о кампаниях' },
  { value: 'accounts', label: 'Аккаунты', description: 'Экспорт списка аккаунтов' },
  { value: 'leads', label: 'Лиды', description: 'Экспорт данных о лидах' },
  { value: 'comments', label: 'Комментарии', description: 'Экспорт истории комментариев' },
  { value: 'analytics', label: 'Аналитика', description: 'Экспорт аналитических данных' },
] as const;

/**
 * GET /api/integrations/google-sheets/export
 * Get export history and supported data types
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');
    const action = searchParams.get('action');

    // Get supported data types
    if (action === 'types') {
      return NextResponse.json({
        dataTypes: EXPORT_DATA_TYPES,
      });
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Get connection with export history
    const connection = await getGoogleSheetsConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connection: {
        id: connection.id,
        name: connection.name,
        status: connection.status,
        spreadsheetId: connection.spreadsheetId,
        spreadsheetName: connection.spreadsheetName,
      },
      exports: connection.exports,
      dataTypes: EXPORT_DATA_TYPES,
    });
  } catch (error) {
    logger.error('Google Sheets export GET error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/google-sheets/export
 * Export data to Google Sheets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, dataType, filters, options } = body;

    if (!connectionId || !dataType) {
      return NextResponse.json(
        { error: 'Connection ID and data type are required' },
        { status: 400 }
      );
    }

    // Validate data type
    if (!EXPORT_DATA_TYPES.find(t => t.value === dataType)) {
      return NextResponse.json(
        { error: `Invalid data type: ${dataType}` },
        { status: 400 }
      );
    }

    // Get connection
    const connection = await getGoogleSheetsConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.status !== 'connected' || !connection.spreadsheetId) {
      return NextResponse.json(
        { error: 'Connection is not properly configured' },
        { status: 400 }
      );
    }

    // Create export record
    const exportRecord = await recordExport(connectionId, dataType, filters ? JSON.stringify(filters) : null, {
      status: 'exporting',
      exportedRows: 0,
      exportedColumns: 0,
    });

    try {
      // Initialize Google Sheets client
      const client = new GoogleSheetsClient({
        accessToken: connection.accessToken || '',
        refreshToken: connection.refreshToken || '',
        expiresAt: connection.tokenExpiry || undefined,
      });

      // Prepare export configuration
      const config = {
        spreadsheetId: connection.spreadsheetId,
        sheetName: options?.sheetName || dataType,
        range: options?.range,
        includeHeaders: options?.includeHeaders !== false,
        headers: options?.headers,
        data: [],
      };

      let result;

      // Export based on data type
      switch (dataType) {
        case 'campaigns':
          result = await client.exportCampaigns(config, filters);
          break;

        case 'accounts':
          result = await client.exportAccounts(config, filters);
          break;

        case 'leads':
          result = await exportLeads(client, config, filters);
          break;

        case 'comments':
          result = await exportComments(client, config, filters);
          break;

        case 'analytics':
          result = await exportAnalytics(client, config, filters);
          break;

        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      // Update export record
      await recordExport(connectionId, dataType, filters ? JSON.stringify(filters) : null, {
        status: result.success ? 'completed' : 'failed',
        exportedRows: result.exportedRows,
        exportedColumns: result.exportedColumns,
        sheetName: config.sheetName,
        range: config.range,
        error: result.success ? undefined : 'Export failed',
      });

      // Update connection stats
      await updateGoogleSheetsConnection(connectionId, {
        totalExports: connection.totalExports + 1,
        lastSyncAt: new Date(),
        lastError: result.success ? null : 'Export failed',
      });

      return NextResponse.json({
        success: result.success,
        exportId: exportRecord.id,
        exportedRows: result.exportedRows,
        exportedColumns: result.exportedColumns,
        sheetName: config.sheetName,
      });
    } catch (exportError) {
      // Update export record with error
      await recordExport(connectionId, dataType, filters ? JSON.stringify(filters) : null, {
        status: 'failed',
        exportedRows: 0,
        exportedColumns: 0,
        error: (exportError as Error).message,
      });

      throw exportError;
    }
  } catch (error) {
    logger.error('Google Sheets export error', error as Error);
    return NextResponse.json(
      { error: 'Export failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Export leads data
 */
async function exportLeads(
  client: GoogleSheetsClient,
  config: { spreadsheetId: string; sheetName?: string; range?: string; includeHeaders?: boolean; headers?: string[]; data: never[] },
  filters?: { niche?: string; geo?: string; startDate?: string; endDate?: string }
): Promise<{ success: boolean; exportedRows: number; exportedColumns: number }> {
  const { db } = await import('@/lib/db');

  const where: Record<string, unknown> = {};
  if (filters?.niche) where.niche = filters.niche;
  if (filters?.geo) where.country = filters.geo;

  const influencers = await db.influencer.findMany({
    where,
    include: {
      comments: { where: { status: 'posted' } },
      directMessages: { where: { converted: true } },
    },
  });

  const headers = config.headers || [
    'ID', 'Name', 'Niche', 'Country', 'Subscribers', 'Leads', 'Revenue',
    'Comments Made', 'DM Sent', 'Status', 'Created At'
  ];

  const rows: string[][] = [];
  if (config.includeHeaders !== false) {
    rows.push(headers);
  }

  for (const inf of influencers) {
    rows.push([
      inf.id,
      inf.name,
      inf.niche,
      inf.country,
      inf.subscribersCount.toString(),
      inf.leadsCount.toString(),
      inf.revenue.toString(),
      inf.comments.length.toString(),
      inf.directMessages.length.toString(),
      inf.status,
      inf.createdAt.toISOString(),
    ]);
  }

  const range = config.range || `${config.sheetName || 'Sheet1'}!A1`;
  const success = await client.writeRange(config.spreadsheetId, range, rows);

  return { success, exportedRows: rows.length, exportedColumns: headers.length };
}

/**
 * Export comments data
 */
async function exportComments(
  client: GoogleSheetsClient,
  config: { spreadsheetId: string; sheetName?: string; range?: string; includeHeaders?: boolean; headers?: string[]; data: never[] },
  filters?: { platform?: string; status?: string; startDate?: string; endDate?: string }
): Promise<{ success: boolean; exportedRows: number; exportedColumns: number }> {
  const { db } = await import('@/lib/db');

  const where: Record<string, unknown> = {};
  if (filters?.platform) where.targetPlatform = filters.platform;
  if (filters?.status) where.status = filters.status;

  const comments = await db.comment.findMany({
    where,
    include: { influencer: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const headers = config.headers || [
    'ID', 'Content', 'Platform', 'Target Type', 'Target URL',
    'Status', 'AI Generated', 'Influencer', 'Posted At', 'Created At'
  ];

  const rows: string[][] = [];
  if (config.includeHeaders !== false) {
    rows.push(headers);
  }

  for (const comment of comments) {
    rows.push([
      comment.id,
      comment.content.substring(0, 500),
      comment.targetPlatform,
      comment.targetType,
      comment.targetUrl || '',
      comment.status,
      comment.aiGenerated ? 'Yes' : 'No',
      comment.influencer?.name || '',
      comment.postedAt?.toISOString() || '',
      comment.createdAt.toISOString(),
    ]);
  }

  const range = config.range || `${config.sheetName || 'Sheet1'}!A1`;
  const success = await client.writeRange(config.spreadsheetId, range, rows);

  return { success, exportedRows: rows.length, exportedColumns: headers.length };
}

/**
 * Export analytics data
 */
async function exportAnalytics(
  client: GoogleSheetsClient,
  config: { spreadsheetId: string; sheetName?: string; range?: string; includeHeaders?: boolean; headers?: string[]; data: never[] },
  filters?: { campaignId?: string; startDate?: string; endDate?: string }
): Promise<{ success: boolean; exportedRows: number; exportedColumns: number }> {
  const { db } = await import('@/lib/db');

  const where: Record<string, unknown> = {};
  if (filters?.campaignId) where.campaignId = filters.campaignId;

  const analytics = await db.campaignAnalytics.findMany({
    where,
    include: { campaign: true },
    orderBy: { date: 'desc' },
    take: 1000,
  });

  const headers = config.headers || [
    'Date', 'Campaign', 'Impressions', 'Clicks', 'Leads', 'Conversions',
    'Spent', 'Revenue', 'CTR', 'CVR', 'ROI'
  ];

  const rows: string[][] = [];
  if (config.includeHeaders !== false) {
    rows.push(headers);
  }

  for (const a of analytics) {
    const ctr = a.impressions > 0 ? (a.clicks / a.impressions * 100).toFixed(2) : '0';
    const cvr = a.clicks > 0 ? (a.conversions / a.clicks * 100).toFixed(2) : '0';
    const roi = a.spent > 0 ? ((a.revenue - a.spent) / a.spent * 100).toFixed(2) : '0';

    rows.push([
      a.date.toISOString().split('T')[0],
      a.campaign?.name || '',
      a.impressions.toString(),
      a.clicks.toString(),
      a.leads.toString(),
      a.conversions.toString(),
      a.spent.toString(),
      a.revenue.toString(),
      `${ctr}%`,
      `${cvr}%`,
      `${roi}%`,
    ]);
  }

  const range = config.range || `${config.sheetName || 'Sheet1'}!A1`;
  const success = await client.writeRange(config.spreadsheetId, range, rows);

  return { success, exportedRows: rows.length, exportedColumns: headers.length };
}
