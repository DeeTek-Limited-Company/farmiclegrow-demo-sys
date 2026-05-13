import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Attempting manual table creation...');

  async function safeExecute(name: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ ${name} completed.`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log(`ℹ️ ${name} already exists.`);
      } else {
        console.error(`❌ ${name} failed:`, e.message);
      }
    }
  }

  // BatchMilestone
  await safeExecute('Create BatchMilestone Table', `
    CREATE TABLE IF NOT EXISTS "BatchMilestone" (
      "id" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'COMPLETED',
      "location" TEXT,
      "performedBy" TEXT,
      "notes" TEXT,
      "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "BatchMilestone_pkey" PRIMARY KEY ("id")
    );
  `);

  await safeExecute('Create BatchMilestone Index', `
    CREATE INDEX IF NOT EXISTS "BatchMilestone_batchId_idx" ON "BatchMilestone"("batchId");
  `);

  await safeExecute('Create BatchMilestone FK', `
    ALTER TABLE "BatchMilestone" ADD CONSTRAINT "BatchMilestone_batchId_fkey" 
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);

  // MarketplaceListing
  await safeExecute('Create MarketplaceListing Table', `
    CREATE TABLE IF NOT EXISTS "MarketplaceListing" (
      "id" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "price" DECIMAL(12,2) NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "category" TEXT,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "isFeatured" BOOLEAN NOT NULL DEFAULT false,
      "minOrderQuantity" DECIMAL(12,2),
      "unit" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
    );
  `);

  await safeExecute('Create MarketplaceListing Index', `
    CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceListing_batchId_key" ON "MarketplaceListing"("batchId");
  `);

  await safeExecute('Create MarketplaceListing FK', `
    ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_batchId_fkey" 
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);

  await prisma.$disconnect();
}

main();
