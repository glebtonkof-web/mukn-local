import { PrismaClient } from '@prisma/client';
import { MONETIZATION_SCHEMES } from './src/lib/sim-auto/schemes-library.js';

const prisma = new PrismaClient();

async function seedSchemes() {
  console.log('Seeding monetization schemes...');
  
  let created = 0;
  let updated = 0;
  
  for (const scheme of MONETIZATION_SCHEMES) {
    try {
      const existing = await prisma.monetizationScheme.findUnique({
        where: { id: scheme.id }
      });
      
      const data = {
        id: scheme.id,
        name: scheme.name,
        description: scheme.description || null,
        category: scheme.category,
        platforms: JSON.stringify(scheme.platforms),
        minAccounts: scheme.minAccounts || 1,
        minWarmingDays: scheme.minWarmingDays || 7,
        riskLevel: scheme.riskLevel || 'medium',
        automationLevel: scheme.automationLevel || 50,
        expectedRevenue: scheme.expectedRevenue || null,
        timeToProfit: scheme.timeToProfit || 14,
        isFree: scheme.isFree !== false,
        requirements: scheme.requirements ? JSON.stringify(scheme.requirements) : null,
        config: scheme.config ? JSON.stringify(scheme.config) : null,
        instructions: scheme.instructions ? JSON.stringify(scheme.instructions) : null,
        usageCount: scheme.usageCount || 0,
        successRate: scheme.successRate || 0,
        avgROI: scheme.avgROI || 0,
        isActive: scheme.isActive !== false,
        updatedAt: new Date()
      };
      
      if (existing) {
        await prisma.monetizationScheme.update({
          where: { id: scheme.id },
          data
        });
        updated++;
      } else {
        await prisma.monetizationScheme.create({
          data: { ...data, createdAt: new Date() }
        });
        created++;
      }
    } catch (e) {
      console.error(`Error with scheme ${scheme.id}:`, e.message);
    }
  }
  
  console.log(`Done! Created: ${created}, Updated: ${updated}`);
  await prisma.$disconnect();
}

seedSchemes().catch(e => {
  console.error('Seed error:', e);
  process.exit(1);
});
