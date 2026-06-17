CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TYPE "PublicTraceVisibility" AS ENUM ('INHERIT', 'PUBLIC', 'PRIVATE', 'LIMITED');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "publicTraceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publicTracePolicy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" ("id", "name", "slug", "status", "publicTraceEnabled", "publicTracePolicy", "createdAt", "updatedAt")
VALUES ('org_default', 'FarmicleGrow', 'farmiclegrow', 'ACTIVE', true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "User"
ADD COLUMN "organizationId" TEXT DEFAULT 'org_default';

ALTER TABLE "Session"
ADD COLUMN "organizationId" TEXT DEFAULT 'org_default';

ALTER TABLE "AuditLog"
ADD COLUMN "organizationId" TEXT DEFAULT 'org_default';

UPDATE "User" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "Session" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
UPDATE "AuditLog" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;

ALTER TABLE "AgronomistDistrict" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "ApprovalAction" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "Batch" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default',
ADD COLUMN "publicTraceVisibility" "PublicTraceVisibility" NOT NULL DEFAULT 'INHERIT';
ALTER TABLE "BatchMilestone" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "BuyerProfile" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "Certification" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "Community" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "District" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "Document" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "FarmLocation" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "FarmPlot" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "FarmProfile" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "Farmer" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "FarmerSubmission" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "FieldActivity" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "HarvestRecord" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "InputTraceability" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "MarketplaceListing" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "MovementLog" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "Notification" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "Order" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "OrderItem" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "OrderMessage" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "PlantingActivity" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "ProductionRecord" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "QualityTest" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "SalesRecord" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';
ALTER TABLE "WarehouseEntry" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'org_default';

DROP INDEX "Community_districtId_name_key";
DROP INDEX "District_regionId_name_key";

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "Session_organizationId_idx" ON "Session"("organizationId");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

CREATE INDEX "AgronomistDistrict_organizationId_idx" ON "AgronomistDistrict"("organizationId");
CREATE INDEX "ApprovalAction_organizationId_idx" ON "ApprovalAction"("organizationId");
CREATE INDEX "Batch_organizationId_idx" ON "Batch"("organizationId");
CREATE INDEX "BatchMilestone_organizationId_idx" ON "BatchMilestone"("organizationId");
CREATE INDEX "BuyerProfile_organizationId_idx" ON "BuyerProfile"("organizationId");
CREATE INDEX "Certification_organizationId_idx" ON "Certification"("organizationId");
CREATE INDEX "Community_organizationId_idx" ON "Community"("organizationId");
CREATE UNIQUE INDEX "Community_organizationId_districtId_name_key" ON "Community"("organizationId", "districtId", "name");
CREATE INDEX "District_organizationId_idx" ON "District"("organizationId");
CREATE UNIQUE INDEX "District_organizationId_regionId_name_key" ON "District"("organizationId", "regionId", "name");
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");
CREATE INDEX "FarmLocation_organizationId_idx" ON "FarmLocation"("organizationId");
CREATE INDEX "FarmPlot_organizationId_idx" ON "FarmPlot"("organizationId");
CREATE INDEX "FarmProfile_organizationId_idx" ON "FarmProfile"("organizationId");
CREATE INDEX "Farmer_organizationId_idx" ON "Farmer"("organizationId");
CREATE INDEX "FarmerSubmission_organizationId_idx" ON "FarmerSubmission"("organizationId");
CREATE INDEX "FieldActivity_organizationId_idx" ON "FieldActivity"("organizationId");
CREATE INDEX "HarvestRecord_organizationId_idx" ON "HarvestRecord"("organizationId");
CREATE INDEX "InputTraceability_organizationId_idx" ON "InputTraceability"("organizationId");
CREATE INDEX "MarketplaceListing_organizationId_idx" ON "MarketplaceListing"("organizationId");
CREATE INDEX "MovementLog_organizationId_idx" ON "MovementLog"("organizationId");
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");
CREATE INDEX "OrderItem_organizationId_idx" ON "OrderItem"("organizationId");
CREATE INDEX "OrderMessage_organizationId_idx" ON "OrderMessage"("organizationId");
CREATE INDEX "PlantingActivity_organizationId_idx" ON "PlantingActivity"("organizationId");
CREATE INDEX "ProductionRecord_organizationId_idx" ON "ProductionRecord"("organizationId");
CREATE INDEX "QualityTest_organizationId_idx" ON "QualityTest"("organizationId");
CREATE INDEX "SalesRecord_organizationId_idx" ON "SalesRecord"("organizationId");
CREATE INDEX "WarehouseEntry_organizationId_idx" ON "WarehouseEntry"("organizationId");

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgronomistDistrict" ADD CONSTRAINT "AgronomistDistrict_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchMilestone" ADD CONSTRAINT "BatchMilestone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Community" ADD CONSTRAINT "Community_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "District" ADD CONSTRAINT "District_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmLocation" ADD CONSTRAINT "FarmLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmPlot" ADD CONSTRAINT "FarmPlot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmProfile" ADD CONSTRAINT "FarmProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Farmer" ADD CONSTRAINT "Farmer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmerSubmission" ADD CONSTRAINT "FarmerSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldActivity" ADD CONSTRAINT "FieldActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InputTraceability" ADD CONSTRAINT "InputTraceability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovementLog" ADD CONSTRAINT "MovementLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlantingActivity" ADD CONSTRAINT "PlantingActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QualityTest" ADD CONSTRAINT "QualityTest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseEntry" ADD CONSTRAINT "WarehouseEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

