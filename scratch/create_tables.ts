import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Attempting manual table creation for Orders and Marketplace...');

  async function safeExecute(name: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ ${name} completed.`);
    } catch (e: any) {
      if (
        e.message?.includes('already exists') ||
        e.message?.includes('already exist') ||
        e.message?.includes('duplicate')
      ) {
        console.log(`ℹ️ ${name} already exists or skipped.`);
      } else {
        console.error(`❌ ${name} failed:`, e.message);
      }
    }
  }

  // 1. MilestoneType Enum
  await safeExecute('Create MilestoneType Enum', `
    DO $$ BEGIN
      CREATE TYPE "MilestoneType" AS ENUM ('CLEANING', 'GRADING', 'PACKAGING', 'PORT_ARRIVAL', 'PORT_DEPARTURE', 'IN_TRANSIT', 'DELIVERED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 2. MilestoneStatus Enum
  await safeExecute('Create MilestoneStatus Enum', `
    DO $$ BEGIN
      CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 3. BatchMilestone Table
  await safeExecute('Create BatchMilestone Table', `
    CREATE TABLE IF NOT EXISTS "BatchMilestone" (
      "id" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "type" "MilestoneType" NOT NULL,
      "status" "MilestoneStatus" NOT NULL DEFAULT 'COMPLETED',
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

  // 4. ListingStatus Enum
  await safeExecute('Create ListingStatus Enum', `
    DO $$ BEGIN
      CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED', 'INACTIVE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 5. MarketplaceListing Table
  await safeExecute('Create MarketplaceListing Table', `
    CREATE TABLE IF NOT EXISTS "MarketplaceListing" (
      "id" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "price" DECIMAL(12,2) NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
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

  await safeExecute('Create MarketplaceListing Unique Index', `
    CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceListing_batchId_key" ON "MarketplaceListing"("batchId");
  `);

  await safeExecute('Create MarketplaceListing Status Index', `
    CREATE INDEX IF NOT EXISTS "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");
  `);

  await safeExecute('Create MarketplaceListing Category Index', `
    CREATE INDEX IF NOT EXISTS "MarketplaceListing_category_idx" ON "MarketplaceListing"("category");
  `);

  await safeExecute('Create MarketplaceListing FK', `
    ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_batchId_fkey" 
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);

  // 6. OrderStatus Enum
  await safeExecute('Create OrderStatus Enum', `
    DO $$ BEGIN
      CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'NEGOTIATING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 7. Order Table
  await safeExecute('Create Order Table', `
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL,
      "orderNumber" TEXT NOT NULL,
      "buyerId" TEXT NOT NULL,
      "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
      "totalAmount" DECIMAL(14,2),
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "shippingAddress" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
    );
  `);

  await safeExecute('Create Order Unique Index', `
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
  `);

  await safeExecute('Create Order Buyer Index', `
    CREATE INDEX IF NOT EXISTS "Order_buyerId_idx" ON "Order"("buyerId");
  `);

  await safeExecute('Create Order Status Index', `
    CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
  `);

  await safeExecute('Create Order FK', `
    ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" 
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  `);

  // 8. OrderItem Table
  await safeExecute('Create OrderItem Table', `
    CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "quantity" DECIMAL(12,2) NOT NULL,
      "unit" TEXT,
      "pricePerUnit" DECIMAL(12,2) NOT NULL,
      "totalPrice" DECIMAL(14,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
    );
  `);

  await safeExecute('Create OrderItem Order Index', `
    CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
  `);

  await safeExecute('Create OrderItem Batch Index', `
    CREATE INDEX IF NOT EXISTS "OrderItem_batchId_idx" ON "OrderItem"("batchId");
  `);

  await safeExecute('Create OrderItem Order FK', `
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);

  await safeExecute('Create OrderItem Batch FK', `
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_batchId_fkey" 
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  `);

  // 9. MovementLog updates
  await safeExecute('Add orderId to MovementLog', `
    ALTER TABLE "MovementLog" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
  `);

  await safeExecute('Create MovementLog Order FK', `
    ALTER TABLE "MovementLog" ADD CONSTRAINT "MovementLog_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  `);

  // 10. BuyerProfile Table
  await safeExecute('Create BuyerProfile Table', `
    CREATE TABLE IF NOT EXISTS "BuyerProfile" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "companyName" TEXT NOT NULL,
      "phoneNumber" TEXT,
      "businessAddress" TEXT,
      "country" TEXT,
      "taxId" TEXT,
      "businessType" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
    );
  `);

  await safeExecute('Create BuyerProfile Unique User Index', `
    CREATE UNIQUE INDEX IF NOT EXISTS "BuyerProfile_userId_key" ON "BuyerProfile"("userId");
  `);

  await safeExecute('Create BuyerProfile User FK', `
    ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);

  // 11. OrderMessage Table
  await safeExecute('Create OrderMessage Table', `
    CREATE TABLE IF NOT EXISTS "OrderMessage" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id")
    );
  `);

  await safeExecute('Create OrderMessage Order Index', `
    CREATE INDEX IF NOT EXISTS "OrderMessage_orderId_idx" ON "OrderMessage"("orderId");
  `);

  await safeExecute('Create OrderMessage Sender Index', `
    CREATE INDEX IF NOT EXISTS "OrderMessage_senderId_idx" ON "OrderMessage"("senderId");
  `);

  await safeExecute('Create OrderMessage Order FK', `
    ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);

  await safeExecute('Create OrderMessage Sender FK', `
    ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_senderId_fkey" 
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  `);

  console.log('Finished manual table creation.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error in script:', err);
  process.exit(1);
});
