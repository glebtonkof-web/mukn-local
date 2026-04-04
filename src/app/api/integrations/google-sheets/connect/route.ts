/**
 * Google Sheets Connect API Endpoint
 * Handles OAuth2 flow and connection management
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleSheetsClient,
  createGoogleSheetsConnection,
  getGoogleSheetsConnection,
  updateGoogleSheetsConnection,
  deleteGoogleSheetsConnection,
} from '@/lib/google-sheets';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET /api/integrations/google-sheets/connect
 * Initiate OAuth2 flow or get connection status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const connectionId = searchParams.get('connectionId');
    const userId = searchParams.get('userId') || 'default-user';

    // Handle OAuth callback
    if (action === 'callback') {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code) {
        return NextResponse.json(
          { error: 'Authorization code is required' },
          { status: 400 }
        );
      }

      // Exchange code for tokens
      const tokens = await GoogleSheetsClient.exchangeCodeForTokens(code);
      if (!tokens) {
        return NextResponse.json(
          { error: 'Failed to exchange authorization code' },
          { status: 500 }
        );
      }

      // Parse state to get connection name
      const stateData = state ? JSON.parse(atob(state)) : {};
      const connectionName = stateData.name || 'Google Sheets Connection';

      // Create connection
      const connection = await createGoogleSheetsConnection(
        stateData.userId || userId,
        connectionName,
        tokens
      );

      if (!connection) {
        return NextResponse.json(
          { error: 'Failed to create connection' },
          { status: 500 }
        );
      }

      // Redirect to success page or return success
      return NextResponse.json({
        success: true,
        connectionId: connection.id,
        message: 'Successfully connected to Google Sheets',
      });
    }

    // Get authorization URL
    if (action === 'authorize') {
      const name = searchParams.get('name') || 'Google Sheets Connection';
      const state = btoa(JSON.stringify({ userId, name }));

      const authUrl = GoogleSheetsClient.getAuthorizationUrl(state);

      return NextResponse.json({
        authorizationUrl: authUrl,
      });
    }

    // Get specific connection
    if (connectionId) {
      const connection = await getGoogleSheetsConnection(connectionId);

      if (!connection) {
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        );
      }

      // Get spreadsheet info if connected
      let spreadsheetInfo: {
        spreadsheetId: string;
        spreadsheetUrl: string;
        title: string;
        sheets: { sheetId: number; title: string; index: number }[];
      } | null = null;
      if (connection.spreadsheetId && connection.status === 'connected') {
        const client = new GoogleSheetsClient({
          accessToken: connection.accessToken || '',
          refreshToken: connection.refreshToken || '',
          expiresAt: connection.tokenExpiry || undefined,
        });
        spreadsheetInfo = await client.getSpreadsheetInfo(connection.spreadsheetId);
      }

      return NextResponse.json({
        connection: {
          id: connection.id,
          name: connection.name,
          status: connection.status,
          spreadsheetId: connection.spreadsheetId,
          spreadsheetName: connection.spreadsheetName,
          spreadsheetUrl: connection.spreadsheetUrl,
          autoSync: connection.autoSync,
          syncInterval: connection.syncInterval,
          lastSyncAt: connection.lastSyncAt,
          totalExports: connection.totalExports,
          totalImports: connection.totalImports,
          lastError: connection.lastError,
          createdAt: connection.createdAt,
          // Note: exports and imports relations need to be defined in schema
          exports: [],
          imports: [],
        },
        spreadsheet: spreadsheetInfo,
      });
    }

    // List all connections for user
    const connections = await db.googleSheetsConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      connections: connections.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        spreadsheetId: c.spreadsheetId,
        spreadsheetName: c.spreadsheetName,
        autoSync: c.autoSync,
        lastSyncAt: c.lastSyncAt,
        totalExports: c.totalExports,
        totalImports: c.totalImports,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Google Sheets connect error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/google-sheets/connect
 * Create or update connection with spreadsheet selection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, userId, name, spreadsheetId, spreadsheetUrl, spreadsheetName, autoSync, syncInterval, syncConfig } = body;

    // Create new connection
    if (!connectionId) {
      if (!name || !userId) {
        return NextResponse.json(
          { error: 'Name and userId are required for new connections' },
          { status: 400 }
        );
      }

      // Check if connection with same name exists
      const existing = await db.googleSheetsConnection.findFirst({
        where: { userId, name },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Connection with this name already exists' },
          { status: 400 }
        );
      }

      const connection = await db.googleSheetsConnection.create({
        data: {
          userId,
          name,
          spreadsheetId,
          spreadsheetUrl,
          spreadsheetName,
          autoSync: autoSync || false,
          syncInterval: syncInterval || 60,
          syncConfig: syncConfig ? JSON.stringify(syncConfig) : null,
          status: spreadsheetId ? 'connected' : 'pending',
        },
      });

      return NextResponse.json({ connection }, { status: 201 });
    }

    // Update existing connection
    const updateData: Record<string, unknown> = {};
    if (spreadsheetId !== undefined) updateData.spreadsheetId = spreadsheetId;
    if (spreadsheetUrl !== undefined) updateData.spreadsheetUrl = spreadsheetUrl;
    if (spreadsheetName !== undefined) updateData.spreadsheetName = spreadsheetName;
    if (autoSync !== undefined) updateData.autoSync = autoSync;
    if (syncInterval !== undefined) updateData.syncInterval = syncInterval;
    if (syncConfig !== undefined) updateData.syncConfig = JSON.stringify(syncConfig);

    if (spreadsheetId) {
      updateData.status = 'connected';
    }

    const connection = await updateGoogleSheetsConnection(connectionId, updateData);

    return NextResponse.json({ connection });
  } catch (error) {
    logger.error('Failed to create/update Google Sheets connection', error as Error);
    return NextResponse.json(
      { error: 'Failed to create/update connection' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/google-sheets/connect
 * Update connection settings
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, autoSync, syncInterval, syncConfig } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (autoSync !== undefined) updateData.autoSync = autoSync;
    if (syncInterval !== undefined) updateData.syncInterval = syncInterval;
    if (syncConfig !== undefined) updateData.syncConfig = JSON.stringify(syncConfig);

    const connection = await updateGoogleSheetsConnection(connectionId, updateData);

    return NextResponse.json({ connection });
  } catch (error) {
    logger.error('Failed to update Google Sheets connection', error as Error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/google-sheets/connect
 * Delete a connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    await deleteGoogleSheetsConnection(connectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete Google Sheets connection', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
