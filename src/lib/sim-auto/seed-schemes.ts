// Database Seeder for Monetization Schemes
// Seeds 200+ monetization schemes into the database

import { db } from '@/lib/db';
import { MONETIZATION_SCHEMES } from './schemes-library';

/**
 * Seed all monetization schemes to database
 */
export async function seedSchemes(): Promise<{
  success: boolean;
  total: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const result = {
    success: true,
    total: MONETIZATION_SCHEMES.length,
    created: 0,
    updated: 0,
    errors: [] as string[]
  };

  console.log(`Starting to seed ${MONETIZATION_SCHEMES.length} monetization schemes...`);

  for (const scheme of MONETIZATION_SCHEMES) {
    try {
      // Check if scheme already exists
      const existing = await db.monetizationScheme.findUnique({
        where: { id: scheme.id }
      });

      const schemeData = {
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
        isActive: true,
        updatedAt: new Date()
      };

      if (existing) {
        // Update existing scheme
        await db.monetizationScheme.update({
          where: { id: scheme.id },
          data: schemeData
        });
        result.updated++;
      } else {
        // Create new scheme
        await db.monetizationScheme.create({
          data: {
            ...schemeData,
            usageCount: 0,
            successRate: 0,
            avgROI: 0,
            createdAt: new Date()
          }
        });
        result.created++;
      }
    } catch (error) {
      result.errors.push(`Failed to seed scheme ${scheme.id}: ${error}`);
      console.error(`Failed to seed scheme ${scheme.id}:`, error);
    }
  }

  console.log(`Seeding complete. Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors.length}`);

  return result;
}

/**
 * Clear all schemes from database
 */
export async function clearSchemes(): Promise<void> {
  console.log('Clearing all monetization schemes...');
  
  await db.monetizationScheme.deleteMany({});
  
  console.log('All schemes cleared');
}

/**
 * Reseed schemes (clear and re-populate)
 */
export async function reseedSchemes(): Promise<{
  success: boolean;
  total: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  await clearSchemes();
  return seedSchemes();
}

/**
 * Get seeding status
 */
export async function getSeedingStatus(): Promise<{
  totalInCode: number;
  totalInDb: number;
  synced: boolean;
  missing: string[];
}> {
  const dbSchemes = await db.monetizationScheme.findMany({
    select: { id: true }
  });

  const dbIds = new Set(dbSchemes.map(s => s.id));
  const codeIds = MONETIZATION_SCHEMES.map(s => s.id);

  const missing = codeIds.filter(id => !dbIds.has(id));

  return {
    totalInCode: MONETIZATION_SCHEMES.length,
    totalInDb: dbSchemes.length,
    synced: missing.length === 0,
    missing
  };
}

/**
 * Seed individual scheme
 */
export async function seedScheme(schemeId: string): Promise<boolean> {
  const scheme = MONETIZATION_SCHEMES.find(s => s.id === schemeId);
  if (!scheme) {
    console.error(`Scheme ${schemeId} not found in library`);
    return false;
  }

  try {
    const existing = await db.monetizationScheme.findUnique({
      where: { id: scheme.id }
    });

    const schemeData = {
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
      isActive: true,
      updatedAt: new Date()
    };

    if (existing) {
      await db.monetizationScheme.update({
        where: { id: scheme.id },
        data: schemeData
      });
    } else {
      await db.monetizationScheme.create({
        data: {
          ...schemeData,
          usageCount: 0,
          successRate: 0,
          avgROI: 0,
          createdAt: new Date()
        }
      });
    }

    return true;
  } catch (error) {
    console.error(`Failed to seed scheme ${schemeId}:`, error);
    return false;
  }
}

/**
 * Update scheme statistics from database
 */
export async function updateSchemeStats(): Promise<void> {
  console.log('Updating scheme statistics...');

  const schemes = await db.monetizationScheme.findMany();

  for (const scheme of schemes) {
    // Get profit logs for this scheme
    const profitLogs = await db.simCardProfitLog.findMany({
      where: { schemeId: scheme.id }
    });

    if (profitLogs.length === 0) continue;

    const totalRevenue = profitLogs.reduce((sum, log) => sum + log.amount, 0);
    const avgROI = profitLogs.length > 0 ? totalRevenue / profitLogs.length : 0;
    const successRate = 1; // Would need more data to calculate properly

    await db.monetizationScheme.update({
      where: { id: scheme.id },
      data: {
        successRate,
        avgROI,
        updatedAt: new Date()
      }
    });
  }

  console.log('Scheme statistics updated');
}

/**
 * Export schemes to JSON for backup
 */
export function exportSchemesToJson(): string {
  return JSON.stringify(MONETIZATION_SCHEMES, null, 2);
}

/**
 * Import schemes from JSON
 */
export function importSchemesFromJson(jsonStr: string): {
  success: boolean;
  count: number;
  errors: string[];
} {
  try {
    const schemes = JSON.parse(jsonStr);
    
    if (!Array.isArray(schemes)) {
      return { success: false, count: 0, errors: ['Invalid JSON format'] };
    }

    // Validate schemes
    const errors: string[] = [];
    for (const scheme of schemes) {
      if (!scheme.id || !scheme.name || !scheme.category) {
        errors.push(`Invalid scheme: ${JSON.stringify(scheme)}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, count: 0, errors };
    }

    // Note: This only validates and returns count
    // Use seedSchemes() to actually populate database
    return { success: true, count: schemes.length, errors: [] };
  } catch (error) {
    return { 
      success: false, 
      count: 0, 
      errors: [`Failed to parse JSON: ${error}`] 
    };
  }
}

const seedSchemesModule = {
  seedSchemes,
  clearSchemes,
  reseedSchemes,
  getSeedingStatus,
  seedScheme,
  updateSchemeStats,
  exportSchemesToJson,
  importSchemesFromJson
};

export default seedSchemesModule;
