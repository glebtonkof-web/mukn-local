import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.monetizationScheme.count();
  console.log('Total schemes in DB:', count);
  
  const sample = await prisma.monetizationScheme.findMany({ take: 3 });
  console.log('Sample:', JSON.stringify(sample, null, 2));
  
  await prisma.$disconnect();
}

check().catch(console.error);
