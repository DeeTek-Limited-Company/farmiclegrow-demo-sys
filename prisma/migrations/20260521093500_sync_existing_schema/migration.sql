CREATE TYPE "MilestoneType" AS ENUM ('CLEANING', 'GRADING', 'PACKAGING', 'PORT_ARRIVAL', 'PORT_DEPARTURE', 'IN_TRANSIT', 'DELIVERED');

CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED', 'INACTIVE');

CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'NEGOTIATING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED');

ALTER TABLE "FarmProfile"
ADD COLUMN "farmSize" DECIMAL(10,2),
ADD COLUMN "farmSizeUnit" TEXT,
ADD COLUMN "ownershipType" TEXT,
ADD COLUMN "irrigationType" TEXT,
ADD COLUMN "numberOfPlots" INTEGER;

ALTER TABLE "Farmer"
ADD COLUMN "primaryCrop" TEXT,
ADD COLUMN "secondaryCrops" JSONB;

ALTER TABLE "FarmerSubmission"
ADD COLUMN "dataQualityScore" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "MovementLog"
ADD COLUMN "orderId" TEXT;

CREATE TABLE "BatchMilestone" (
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

CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "minOrderQuantity" DECIMAL(12,2),
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
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

CREATE TABLE "OrderItem" (
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

CREATE TABLE "OrderMessage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyerProfile" (
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

CREATE INDEX "BatchMilestone_batchId_idx" ON "BatchMilestone"("batchId");

CREATE UNIQUE INDEX "MarketplaceListing_batchId_key" ON "MarketplaceListing"("batchId");
CREATE INDEX "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");
CREATE INDEX "MarketplaceListing_category_idx" ON "MarketplaceListing"("category");

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");
CREATE INDEX "Order_status_idx" ON "Order"("status");

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_batchId_idx" ON "OrderItem"("batchId");

CREATE INDEX "OrderMessage_orderId_idx" ON "OrderMessage"("orderId");
CREATE INDEX "OrderMessage_senderId_idx" ON "OrderMessage"("senderId");

CREATE UNIQUE INDEX "BuyerProfile_userId_key" ON "BuyerProfile"("userId");

ALTER TABLE "MovementLog" ADD CONSTRAINT "MovementLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BatchMilestone" ADD CONSTRAINT "BatchMilestone_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
