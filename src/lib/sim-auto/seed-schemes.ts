/**
 * Seed Schemes - Database seeding for monetization schemes
 */

import { db } from '@/lib/db';
import { MONETIZATION_SCHEMES, type MonetizationSchemeDefinition } from './schemes-library';
import { logger } from '@/lib/logger';

export interface SeedingStatus {
  total: number;
  seeded: number;
  lastSeededAt: Date | null;
  isSeeding: boolean;
}

let seedingInProgress = false;
let lastSeededAt: Date | null = null;

/**
 * Seed all schemes to database
 */
export async function seedSchemes(): Promise<{ success: boolean; count: number; errors: string[] }> {
  if (seedingInProgress) {
    return { success: false, count: 0, errors: ['Seeding already in progress'] };
  }
  
  seedingInProgress = true;
  const errors: string[] = [];
  let count = 0;
  
  try {
    for (const scheme of MONETIZATION_SCHEMES) {
      try {
        await seedScheme(scheme);
        count++;
      } catch (error) {
        errors.push(`Failed to seed ${scheme.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    lastSeededAt = new Date();
    logger.info('Schemes seeded successfully', { count, errors: errors.length });
    
    return { success: true, count, errors };
  } finally {
    seedingInProgress = false;
  }
}

/**
 * Clear all schemes from database
 */
export async function clearSchemes(): Promise<{ success: boolean; count: number }> {
  try {
    const result = await db.monetizationScheme.deleteMany({});
    logger.info('Schemes cleared', { count: result.count });
    return { success: true, count: result.count };
  } catch (error) {
    logger.error('Failed to clear schemes', error as Error);
    return { success: false, count: 0 };
  }
}

/**
 * Reseed schemes (clear and seed)
 */
export async function reseedSchemes(): Promise<{ success: boolean; count: number; errors: string[] }> {
  const clearResult = await clearSchemes();
  if (!clearResult.success) {
    return { success: false, count: 0, errors: ['Failed to clear existing schemes'] };
  }
  
  return seedSchemes();
}

/**
 * Get seeding status
 */
export function getSeedingStatus(): SeedingStatus {
  return {
    total: MONETIZATION_SCHEMES.length,
    seeded: 0, // Would need to query database
    lastSeededAt,
    isSeeding: seedingInProgress
  };
}

/**
 * Seed a single scheme
 */
export async function seedScheme(scheme: MonetizationSchemeDefinition): Promise<boolean> {
  try {
    await db.monetizationScheme.upsert({
      where: { id: scheme.id },
      update: {
        name: scheme.name,
        description: scheme.description,
        category: scheme.category,
        platforms: JSON.stringify(scheme.platforms),
        minAccounts: scheme.minAccounts,
        minWarmingDays: scheme.minWarmingDays,
        riskLevel: scheme.riskLevel,
        automationLevel: scheme.automationLevel,
        expectedRevenue: scheme.expectedRevenue,
        timeToProfit: scheme.timeToProfit,
        isFree: scheme.isFree,
        requirements: scheme.requirements ? JSON.stringify(scheme.requirements) : null,
        config: scheme.config ? JSON.stringify(scheme.config) : null,
        instructions: scheme.instructions ? JSON.stringify(scheme.instructions) : null,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        id: scheme.id,
        name: scheme.name,
        description: scheme.description,
        category: scheme.category,
        platforms: JSON.stringify(scheme.platforms),
        minAccounts: scheme.minAccounts,
        minWarmingDays: scheme.minWarmingDays,
        riskLevel: scheme.riskLevel,
        automationLevel: scheme.automationLevel,
        expectedRevenue: scheme.expectedRevenue,
        timeToProfit: scheme.timeToProfit,
        isFree: scheme.isFree,
        requirements: scheme.requirements ? JSON.stringify(scheme.requirements) : null,
        config: scheme.config ? JSON.stringify(scheme.config) : null,
        instructions: scheme.instructions ? JSON.stringify(scheme.instructions) : null,
        isActive: true
      }
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to seed scheme', error as Error, { schemeId: scheme.id });
    return false;
  }
}

/**
 * Update scheme statistics
 */
export async function updateSchemeStats(
  schemeId: string,
  stats: { usageCount?: number; successRate?: number; avgROI?: number }
): Promise<boolean> {
  try {
    await db.monetizationScheme.update({
      where: { id: schemeId },
      data: {
        usageCount: stats.usageCount,
        successRate: stats.successRate,
        avgROI: stats.avgROI,
        updatedAt: new Date()
      }
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to update scheme stats', error as Error, { schemeId });
    return false;
  }
}

/**
 * Export schemes to JSON
 */
export async function exportSchemesToJson(): Promise<string> {
  const schemes = await db.monetizationScheme.findMany({
    where: { isActive: true }
  });
  
  return JSON.stringify(schemes, null, 2);
}

/**
 * Import schemes from JSON
 */
export async function importSchemesFromJson(jsonData: string): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;
  
  try {
    const schemes = JSON.parse(jsonData);
    
    for (const scheme of schemes) {
      try {
        await db.monetizationScheme.upsert({
          where: { id: scheme.id },
          update: scheme,
          create: scheme
        });
        count++;
      } catch (error) {
        errors.push(`Failed to import ${scheme.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { success: true, count, errors };
  } catch (error) {
    return { success: false, count: 0, errors: ['Invalid JSON data'] };
  }
}

export default {
  seedSchemes,
  clearSchemes,
  reseedSchemes,
  getSeedingStatus,
  seedScheme,
  updateSchemeStats,
  exportSchemesToJson,
  importSchemesFromJson
};
