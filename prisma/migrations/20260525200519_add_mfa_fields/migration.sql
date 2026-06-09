/*
  Warnings:

  - You are about to drop the column `cropType` on the `FarmProfile` table. All the data in the column will be lost.
  - You are about to drop the column `expectedYieldTon` on the `FarmProfile` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrganizationStatus" ADD VALUE 'TRIAL';
ALTER TYPE "OrganizationStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "AgronomistDistrict" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ApprovalAction" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Batch" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BatchMilestone" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BuyerProfile" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Certification" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Community" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "District" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FarmLocation" ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL,
ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FarmPlot" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FarmProfile" DROP COLUMN "cropType",
DROP COLUMN "expectedYieldTon",
ALTER COLUMN "totalAreaHectare" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Farmer" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FarmerSubmission" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FieldActivity" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HarvestRecord" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "InputTraceability" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MarketplaceListing" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MovementLog" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderMessage" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "country" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'STARTER',
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlantingActivity" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductionRecord" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "QualityTest" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SalesRecord" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ALTER COLUMN "organizationId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WarehouseEntry" ALTER COLUMN "organizationId" DROP DEFAULT;
