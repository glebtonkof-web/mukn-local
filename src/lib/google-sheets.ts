/**
 * Google Sheets Integration Library
 * Handles OAuth2 authentication and data export/import with Google Sheets API
 */

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Google OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// Google Sheets API scopes
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

// Types
export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  scope: string;
}

export interface GoogleSheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheets: {
    sheetId: number;
    title: string;
    index: number;
  }[];
}

export interface SheetRange {
  sheetName: string;
  startRow: number;
  startCol: string;
  endRow?: number;
  endCol?: string;
}

export interface ExportConfig {
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
  includeHeaders?: boolean;
  data: Record<string, unknown>[];
  headers?: string[];
}

export interface ImportConfig {
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
  headerRow?: number;
  maxRows?: number;
}

/**
 * Google Sheets Client
 */
export class GoogleSheetsClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(tokens?: { accessToken: string; refreshToken: string; expiresAt?: Date }) {
    if (tokens) {
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.tokenExpiry = tokens.expiresAt?.getTime() || null;
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<GoogleTokens | null> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
          code,
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to exchange code for tokens', new Error(error));
        return null;
      }

      const tokens = await response.json();
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        expires_at: Date.now() + (tokens.expires_in * 1000),
        token_type: tokens.token_type,
        scope: tokens.scope,
      };
    } catch (error) {
      logger.error('Failed to exchange code for tokens', error as Error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        logger.error('Failed to refresh token', new Error(await response.text()));
        return false;
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;
      this.tokenExpiry = Date.now() + (tokens.expires_in * 1000);
      return true;
    } catch (error) {
      logger.error('Failed to refresh token', error as Error);
      return false;
    }
  }

  /**
   * Check if token needs refresh
   */
  private async ensureValidToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    // Refresh if token expires in less than 5 minutes
    if (this.tokenExpiry && this.tokenExpiry - Date.now() < 5 * 60 * 1000) {
      return this.refreshAccessToken();
    }

    return true;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    await this.ensureValidToken();

    return fetch(`https://sheets.googleapis.com/v4/spreadsheets${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * Get spreadsheet info
   */
  async getSpreadsheetInfo(spreadsheetId: string): Promise<GoogleSheetInfo | null> {
    try {
      const response = await this.apiRequest(`/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,index)`);

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to get spreadsheet info', new Error(error));
        return null;
      }

      const data = await response.json();
      return {
        spreadsheetId: data.spreadsheetId,
        spreadsheetUrl: data.spreadsheetUrl,
        title: data.properties.title,
        sheets: data.sheets.map((s: { properties: { sheetId: number; title: string; index: number } }) => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title,
          index: s.properties.index,
        })),
      };
    } catch (error) {
      logger.error('Failed to get spreadsheet info', error as Error);
      return null;
    }
  }

  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(title: string): Promise<GoogleSheetInfo | null> {
    try {
      const response = await this.apiRequest('', {
        method: 'POST',
        body: JSON.stringify({
          properties: { title },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to create spreadsheet', new Error(error));
        return null;
      }

      const data = await response.json();
      return {
        spreadsheetId: data.spreadsheetId,
        spreadsheetUrl: data.spreadsheetUrl,
        title: data.properties.title,
        sheets: data.sheets.map((s: { properties: { sheetId: number; title: string; index: number } }) => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title,
          index: s.properties.index,
        })),
      };
    } catch (error) {
      logger.error('Failed to create spreadsheet', error as Error);
      return null;
    }
  }

  /**
   * Read data from sheet
   */
  async readRange(spreadsheetId: string, range: string): Promise<string[][] | null> {
    try {
      const response = await this.apiRequest(`/${spreadsheetId}/values/${encodeURIComponent(range)}`);

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to read range', new Error(error));
        return null;
      }

      const data = await response.json();
      return data.values || [];
    } catch (error) {
      logger.error('Failed to read range', error as Error);
      return null;
    }
  }

  /**
   * Write data to sheet
   */
  async writeRange(
    spreadsheetId: string,
    range: string,
    values: string[][],
    options?: { valueInputOption?: string }
  ): Promise<boolean> {
    try {
      const response = await this.apiRequest(
        `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${options?.valueInputOption || 'USER_ENTERED'}`,
        {
          method: 'PUT',
          body: JSON.stringify({ values }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to write range', new Error(error));
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to write range', error as Error);
      return false;
    }
  }

  /**
   * Append data to sheet
   */
  async appendRange(
    spreadsheetId: string,
    range: string,
    values: string[][],
    options?: { valueInputOption?: string; insertDataOption?: string }
  ): Promise<{ success: boolean; updatedRange?: string; updatedRows?: number }> {
    try {
      const params = new URLSearchParams({
        valueInputOption: options?.valueInputOption || 'USER_ENTERED',
        insertDataOption: options?.insertDataOption || 'INSERT_ROWS',
      });

      const response = await this.apiRequest(
        `/${spreadsheetId}/values/${encodeURIComponent(range)}:append?${params.toString()}`,
        {
          method: 'POST',
          body: JSON.stringify({ values }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to append range', new Error(error));
        return { success: false };
      }

      const data = await response.json();
      return {
        success: true,
        updatedRange: data.updates?.updatedRange,
        updatedRows: data.updates?.updatedRows,
      };
    } catch (error) {
      logger.error('Failed to append range', error as Error);
      return { success: false };
    }
  }

  /**
   * Clear range in sheet
   */
  async clearRange(spreadsheetId: string, range: string): Promise<boolean> {
    try {
      const response = await this.apiRequest(
        `/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
        { method: 'POST' }
      );

      return response.ok;
    } catch (error) {
      logger.error('Failed to clear range', error as Error);
      return false;
    }
  }

  /**
   * Export campaign data to sheet
   */
  async exportCampaigns(
    config: ExportConfig,
    filters?: {
      status?: string;
      niche?: string;
      geo?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ success: boolean; exportedRows: number; exportedColumns: number }> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.niche) where.niche = filters.niche;
    if (filters?.geo) where.geo = filters.geo;

    const campaigns = await db.campaign.findMany({
      where,
      include: {
        influencers: { include: { influencer: true } },
        offers: { include: { offer: true } },
      },
    });

    // Define headers
    const headers = config.headers || [
      'ID', 'Name', 'Type', 'Status', 'Niche', 'Geo',
      'Budget', 'Spent', 'Currency', 'Leads', 'Conversions', 'Revenue',
      'Start Date', 'End Date', 'Created At', 'Influencers', 'Offers'
    ];

    // Convert data to rows
    const rows: string[][] = [];
    if (config.includeHeaders !== false) {
      rows.push(headers);
    }

    for (const campaign of campaigns) {
      rows.push([
        campaign.id,
        campaign.name,
        campaign.type,
        campaign.status,
        campaign.niche || '',
        campaign.geo || '',
        campaign.budget.toString(),
        campaign.spent.toString(),
        campaign.currency,
        campaign.leadsCount.toString(),
        campaign.conversions.toString(),
        campaign.revenue.toString(),
        campaign.startDate?.toISOString() || '',
        campaign.endDate?.toISOString() || '',
        campaign.createdAt.toISOString(),
        campaign.influencers.map(i => i.influencer?.name).join(', '),
        campaign.offers.map(o => o.offer?.name).join(', '),
      ]);
    }

    // Write to sheet
    const range = config.range || `${config.sheetName || 'Sheet1'}!A1`;
    const success = await this.writeRange(config.spreadsheetId, range, rows);

    return {
      success,
      exportedRows: rows.length,
      exportedColumns: headers.length,
    };
  }

  /**
   * Export accounts data to sheet
   */
  async exportAccounts(
    config: ExportConfig,
    filters?: {
      status?: string;
      platform?: string;
    }
  ): Promise<{ success: boolean; exportedRows: number; exportedColumns: number }> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.platform) where.platform = filters.platform;

    const accounts = await db.account.findMany({
      where,
      include: {
        simCard: true,
        influencers: true,
      },
    });

    const headers = config.headers || [
      'ID', 'Platform', 'Username', 'Phone', 'Email',
      'Status', 'Ban Risk', 'Proxy', 'Daily Comments', 'Daily DM',
      'Created At', 'Last Used At'
    ];

    const rows: string[][] = [];
    if (config.includeHeaders !== false) {
      rows.push(headers);
    }

    for (const account of accounts) {
      rows.push([
        account.id,
        account.platform,
        account.username || '',
        account.phone || '',
        account.email || '',
        account.status,
        account.banRisk.toString(),
        account.proxyHost ? `${account.proxyHost}:${account.proxyPort}` : '',
        account.dailyComments.toString(),
        account.dailyDm.toString(),
        account.createdAt.toISOString(),
        account.lastUsedAt?.toISOString() || '',
      ]);
    }

    const range = config.range || `${config.sheetName || 'Sheet1'}!A1`;
    const success = await this.writeRange(config.spreadsheetId, range, rows);

    return {
      success,
      exportedRows: rows.length,
      exportedColumns: headers.length,
    };
  }

  /**
   * Import channels from sheet
   */
  async importChannels(
    config: ImportConfig
  ): Promise<{
    success: boolean;
    importedRows: number;
    skippedRows: number;
    data: { channelId: string; channelName?: string; username?: string }[];
  }> {
    const range = config.range || `${config.sheetName || 'Sheet1'}!A:Z`;
    const values = await this.readRange(config.spreadsheetId, range);

    if (!values || values.length === 0) {
      return { success: false, importedRows: 0, skippedRows: 0, data: [] };
    }

    const headerRow = config.headerRow || 1;
    const headers = values[headerRow - 1];
    const dataRows = values.slice(headerRow);

    const imported: { channelId: string; channelName?: string; username?: string }[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    // Find column indices
    const idIndex = headers.findIndex(h => h.toLowerCase().includes('id') || h.toLowerCase().includes('channel'));
    const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('title'));
    const usernameIndex = headers.findIndex(h => h.toLowerCase().includes('username') || h.toLowerCase().includes('link'));

    for (let i = 0; i < (config.maxRows || dataRows.length); i++) {
      const row = dataRows[i];
      if (!row || !row[idIndex]) {
        skippedCount++;
        continue;
      }

      imported.push({
        channelId: row[idIndex],
        channelName: row[nameIndex] || undefined,
        username: row[usernameIndex] || undefined,
      });
      importedCount++;
    }

    return {
      success: true,
      importedRows: importedCount,
      skippedRows: skippedCount,
      data: imported,
    };
  }

  /**
   * Import blacklist from sheet
   */
  async importBlacklist(
    config: ImportConfig
  ): Promise<{
    success: boolean;
    importedRows: number;
    skippedRows: number;
    data: { type: string; value: string; reason?: string }[];
  }> {
    const range = config.range || `${config.sheetName || 'Sheet1'}!A:Z`;
    const values = await this.readRange(config.spreadsheetId, range);

    if (!values || values.length === 0) {
      return { success: false, importedRows: 0, skippedRows: 0, data: [] };
    }

    const headerRow = config.headerRow || 1;
    const headers = values[headerRow - 1];
    const dataRows = values.slice(headerRow);

    const imported: { type: string; value: string; reason?: string }[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < (config.maxRows || dataRows.length); i++) {
      const row = dataRows[i];
      if (!row || !row[0]) {
        skippedCount++;
        continue;
      }

      // Detect type from first column value
      const value = row[0].toString();
      let type = 'channel';
      if (value.startsWith('@')) type = 'username';
      else if (value.includes('t.me/')) type = 'link';
      else if (/^-?\d+$/.test(value)) type = 'channel_id';

      imported.push({
        type,
        value,
        reason: row[1] || undefined,
      });
      importedCount++;
    }

    return {
      success: true,
      importedRows: importedCount,
      skippedRows: skippedCount,
      data: imported,
    };
  }
}

/**
 * Database helper functions
 */
export async function createGoogleSheetsConnection(
  userId: string,
  name: string,
  tokens: GoogleTokens
): Promise<{ id: string } | null> {
  try {
    const connection = await db.googleSheetsConnection.create({
      data: {
        userId,
        name,
        accessToken: tokens.access_token, // Should be encrypted in production
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expires_at || Date.now() + tokens.expires_in * 1000),
        status: 'connected',
      }
    });

    return { id: connection.id };
  } catch (error) {
    logger.error('Failed to create Google Sheets connection', error as Error);
    return null;
  }
}

export async function getGoogleSheetsConnection(connectionId: string) {
  return db.googleSheetsConnection.findUnique({
    where: { id: connectionId },
    include: {
      exports: { take: 10, orderBy: { createdAt: 'desc' } },
      imports: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function updateGoogleSheetsConnection(
  connectionId: string,
  data: Partial<{
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date;
    spreadsheetId: string;
    spreadsheetName: string;
    spreadsheetUrl: string;
    status: string;
    lastSyncAt: Date;
    autoSync: boolean;
    syncInterval: number;
    syncConfig: string;
    lastError: string;
  }>
) {
  return db.googleSheetsConnection.update({
    where: { id: connectionId },
    data,
  });
}

export async function deleteGoogleSheetsConnection(connectionId: string) {
  return db.googleSheetsConnection.delete({
    where: { id: connectionId },
  });
}

export async function recordExport(
  connectionId: string,
  dataType: string,
  filters: string | null,
  result: {
    status: string;
    exportedRows: number;
    exportedColumns: number;
    sheetName?: string;
    range?: string;
    error?: string;
  }
) {
  return db.googleSheetsExport.create({
    data: {
      connectionId,
      dataType,
      filters,
      ...result,
    },
  });
}

export async function recordImport(
  connectionId: string,
  dataType: string,
  result: {
    status: string;
    importedRows: number;
    skippedRows: number;
    importedData?: string;
    error?: string;
    errorRows?: string;
  }
) {
  return db.googleSheetsImport.create({
    data: {
      connectionId,
      dataType,
      ...result,
    },
  });
}
