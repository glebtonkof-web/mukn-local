import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ==================== TYPES ====================

interface TableStats {
  name: string;
  rowCount: number;
  sizeBytes?: number;
  indexCount: number;
  indexes: IndexInfo[];
  lastUpdated?: Date;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
}

interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsSent: number;
  suggestions: string[];
}

interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  totalTables: number;
  totalRows: number;
  totalSize?: number;
  indexUsage: number;
  slowQueries: QueryAnalysis[];
  recommendations: string[];
  tableStats: TableStats[];
}

// ==================== MAIN ANALYZER ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const table = searchParams.get('table');
    
    const health = await analyzeDatabase(detailed, table);
    
    return NextResponse.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze database' },
      { status: 500 }
    );
  }
}

// ==================== ANALYSIS FUNCTIONS ====================

async function analyzeDatabase(detailed: boolean, specificTable?: string | null): Promise<DatabaseHealth> {
  const tableStats: TableStats[] = [];
  const recommendations: string[] = [];
  let totalRows = 0;
  let indexUsage = 0;
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  // Get all table names from Prisma schema
  const tableNames = await getTableNames();
  const tablesToAnalyze = specificTable 
    ? tableNames.filter(t => t === specificTable)
    : tableNames;
  
  for (const tableName of tablesToAnalyze) {
    try {
      const stats = await analyzeTable(tableName, detailed);
      tableStats.push(stats);
      totalRows += stats.rowCount;
      indexUsage += stats.indexCount;
      
      // Generate recommendations based on table analysis
      if (stats.rowCount > 100000 && stats.indexCount < 3) {
        recommendations.push(`Table "${tableName}" has ${stats.rowCount.toLocaleString()} rows but only ${stats.indexCount} indexes. Consider adding indexes for frequently queried columns.`);
        status = 'warning';
      }
    } catch (error) {
      console.error(`Error analyzing table ${tableName}:`, error);
    }
  }
  
  // Check for N+1 query patterns
  const nPlusOneAnalysis = await detectNPlusOnePatterns();
  recommendations.push(...nPlusOneAnalysis.recommendations);
  if (nPlusOneAnalysis.detected) {
    status = 'warning';
  }
  
  // Check for missing indexes on foreign keys
  const foreignKeyAnalysis = await analyzeForeignKeys();
  recommendations.push(...foreignKeyAnalysis.recommendations);
  if (foreignKeyAnalysis.missingIndexes > 0) {
    status = foreignKeyAnalysis.missingIndexes > 5 ? 'critical' : 'warning';
  }
  
  return {
    status,
    totalTables: tableStats.length,
    totalRows,
    indexUsage,
    slowQueries: [],
    recommendations,
    tableStats: detailed ? tableStats : tableStats.slice(0, 10),
  };
}

async function getTableNames(): Promise<string[]> {
  // SQLite-specific query to get all tables
  const result = await db.$queryRaw<{ name: string }[]>`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%' 
    AND name NOT LIKE '_prisma_migrations'
    ORDER BY name
  `;
  
  return result.map(r => r.name);
}

async function analyzeTable(tableName: string, detailed: boolean): Promise<TableStats> {
  // Get row count
  const countResult = await db.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM ${Prisma.raw(tableName)}
  `;
  const rowCount = Number(countResult[0].count);
  
  // Get indexes for this table
  const indexResult = await db.$queryRaw<{
    name: string;
    unique: number;
    origin: string;
    partial: number;
  }[]>`
    SELECT name, unique, origin, partial 
    FROM pragma_index_list(${Prisma.raw(`'${tableName}'`)})
  `;
  
  const indexes: IndexInfo[] = [];
  
  for (const idx of indexResult) {
    const columnsResult = await db.$queryRaw<{ name: string }[]>`
      SELECT name FROM pragma_index_info(${Prisma.raw(`'${idx.name}'`)})
    `;
    
    indexes.push({
      name: idx.name,
      columns: columnsResult.map(c => c.name),
      unique: idx.unique === 1,
      primary: idx.origin === 'pk',
    });
  }
  
  // Get table size (approximate for SQLite)
  let sizeBytes: number | undefined;
  if (detailed) {
    const pageResult = await db.$queryRaw<[{ pgsize: number }]>`
      SELECT SUM(pgsize) as pgsize FROM dbstat 
      WHERE name = ${tableName}
    `.catch(() => [{ pgsize: 0 }]);
    sizeBytes = pageResult[0]?.pgsize || 0;
  }
  
  return {
    name: tableName,
    rowCount,
    sizeBytes,
    indexCount: indexes.length,
    indexes: detailed ? indexes : indexes.slice(0, 5),
  };
}

async function detectNPlusOnePatterns(): Promise<{
  detected: boolean;
  recommendations: string[];
}> {
  const recommendations: string[] = [];
  let detected = false;
  
  // Check for tables that might cause N+1 queries
  // This is a heuristic check based on relationship patterns
  const relationshipPatterns = [
    {
      parent: 'Influencer',
      child: 'Post',
      fk: 'influencerId',
      suggestion: 'Use include: { posts: true } when fetching Influencer to avoid N+1 queries',
    },
    {
      parent: 'Influencer',
      child: 'Comment',
      fk: 'influencerId',
      suggestion: 'Use include: { comments: true } when fetching Influencer to avoid N+1 queries',
    },
    {
      parent: 'Campaign',
      child: 'Post',
      fk: 'campaignId',
      suggestion: 'Use include: { posts: true } when fetching Campaign to avoid N+1 queries',
    },
    {
      parent: 'Account',
      child: 'AccountAction',
      fk: 'accountId',
      suggestion: 'Use include: { actions: true } when fetching Account to avoid N+1 queries',
    },
    {
      parent: 'User',
      child: 'Influencer',
      fk: 'userId',
      suggestion: 'Use include: { influencers: true } when fetching User to avoid N+1 queries',
    },
  ];
  
  for (const pattern of relationshipPatterns) {
    try {
      // Check if both tables exist
      const tables = await getTableNames();
      if (tables.includes(pattern.parent) && tables.includes(pattern.child)) {
        recommendations.push(pattern.suggestion);
        detected = true;
      }
    } catch {
      // Table doesn't exist, skip
    }
  }
  
  return { detected, recommendations };
}

async function analyzeForeignKeys(): Promise<{
  missingIndexes: number;
  recommendations: string[];
}> {
  const recommendations: string[] = [];
  let missingIndexes = 0;
  
  // Get all foreign keys from the schema
  const foreignKeyPatterns = [
    { table: 'Influencer', column: 'userId' },
    { table: 'Influencer', column: 'accountId' },
    { table: 'Influencer', column: 'simCardId' },
    { table: 'Account', column: 'userId' },
    { table: 'Account', column: 'simCardId' },
    { table: 'Campaign', column: 'userId' },
    { table: 'Post', column: 'influencerId' },
    { table: 'Post', column: 'campaignId' },
    { table: 'Comment', column: 'influencerId' },
    { table: 'Comment', column: 'postId' },
    { table: 'DirectMessage', column: 'influencerId' },
    { table: 'ContentQueue', column: 'influencerId' },
    { table: 'ContentQueue', column: 'offerId' },
    { table: 'InfluencerAnalytics', column: 'influencerId' },
    { table: 'CampaignAnalytics', column: 'campaignId' },
    { table: 'AccountRiskHistory', column: 'accountId' },
    { table: 'WarmingSettings', column: 'userId' },
    { table: 'BudgetSettings', column: 'userId' },
    { table: 'ApiKey', column: 'userId' },
    { table: 'AccountAction', column: 'accountId' },
    { table: 'ActionLog', column: 'userId' },
    { table: 'Notification', column: 'userId' },
    { table: 'Session', column: 'userId' },
    { table: 'AIProviderSettings', column: 'userId' },
    { table: 'AIGlobalSettings', column: 'userId' },
    { table: 'Proxy', column: 'userId' },
    { table: 'AIDialog', column: 'userId' },
    { table: 'ViralChainComment', column: 'chainId' },
    { table: 'ABTestVariant', column: 'abTestId' },
    { table: 'ABTestVariant', column: 'offerId' },
    { table: 'CommentABTestVariant', column: 'abTestId' },
    { table: 'BundleReview', column: 'bundleId' },
    { table: 'OFMProfile', column: 'accountId' },
    { table: 'AIGeneratedContent', column: 'influencerId' },
    { table: 'AIGeneratedContent', column: 'campaignId' },
  ];
  
  for (const fk of foreignKeyPatterns) {
    try {
      // Check if index exists for this foreign key
      const indexCheck = await db.$queryRaw<{ name: string }[]>`
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND tbl_name = ${fk.table}
        AND sql LIKE ${`%${fk.column}%`}
      `;
      
      if (indexCheck.length === 0) {
        recommendations.push(
          `Consider adding index on ${fk.table}.${fk.column} for better join performance`
        );
        missingIndexes++;
      }
    } catch {
      // Table doesn't exist, skip
    }
  }
  
  return { missingIndexes, recommendations };
}

// ==================== INDEX CREATION ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tableName, columns, indexName } = body;
    
    if (action === 'createIndex') {
      if (!tableName || !columns || !Array.isArray(columns) || columns.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing tableName or columns' },
          { status: 400 }
        );
      }
      
      const idxName = indexName || `idx_${tableName}_${columns.join('_')}`;
      const columnsStr = columns.map(c => `"${c}"`).join(', ');
      
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "${idxName}" ON "${tableName}" (${columnsStr})`
      );
      
      return NextResponse.json({
        success: true,
        message: `Index "${idxName}" created successfully on ${tableName}(${columns.join(', ')})`,
      });
    }
    
    if (action === 'optimizeAll') {
      const results = await optimizeAllIndexes();
      return NextResponse.json({
        success: true,
        results,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Index creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create index' },
      { status: 500 }
    );
  }
}

async function optimizeAllIndexes(): Promise<string[]> {
  const results: string[] = [];
  const foreignKeyPatterns = [
    { table: 'Influencer', columns: ['userId'] },
    { table: 'Influencer', columns: ['accountId'] },
    { table: 'Influencer', columns: ['simCardId'] },
    { table: 'Influencer', columns: ['status'] },
    { table: 'Account', columns: ['userId'] },
    { table: 'Account', columns: ['status'] },
    { table: 'Account', columns: ['platform'] },
    { table: 'Campaign', columns: ['userId'] },
    { table: 'Campaign', columns: ['status'] },
    { table: 'Campaign', columns: ['niche'] },
    { table: 'Post', columns: ['influencerId'] },
    { table: 'Post', columns: ['campaignId'] },
    { table: 'Post', columns: ['status'] },
    { table: 'Comment', columns: ['influencerId'] },
    { table: 'Comment', columns: ['status'] },
    { table: 'InfluencerAnalytics', columns: ['influencerId', 'date'] },
    { table: 'CampaignAnalytics', columns: ['campaignId', 'date'] },
    { table: 'Notification', columns: ['userId', 'isRead'] },
    { table: 'AIProviderSettings', columns: ['userId', 'provider'] },
    { table: 'AIProviderSettings', columns: ['isActive'] },
    { table: 'Session', columns: ['userId'] },
    { table: 'Session', columns: ['token'] },
  ];
  
  for (const pattern of foreignKeyPatterns) {
    try {
      const idxName = `idx_${pattern.table}_${pattern.columns.join('_')}`;
      const columnsStr = pattern.columns.map(c => `"${c}"`).join(', ');
      
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "${idxName}" ON "${pattern.table}" (${columnsStr})`
      );
      
      results.push(`Created index ${idxName}`);
    } catch (error) {
      console.error(`Failed to create index for ${pattern.table}:`, error);
    }
  }
  
  return results;
}

// ==================== DELETE INDEX ====================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const indexName = searchParams.get('indexName');
    
    if (!indexName) {
      return NextResponse.json(
        { success: false, error: 'Missing indexName parameter' },
        { status: 400 }
      );
    }
    
    await db.$executeRawUnsafe(`DROP INDEX IF EXISTS "${indexName}"`);
    
    return NextResponse.json({
      success: true,
      message: `Index "${indexName}" dropped successfully`,
    });
  } catch (error) {
    console.error('Index deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete index' },
      { status: 500 }
    );
  }
}
