/*
  Warnings:

  - You are about to drop the column `recordedAt` on the `ProductionRecord` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ghanaCardNumber]` on the table `Farmer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `ProductionRecord` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'HARVESTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "FarmLocation" ADD COLUMN     "community" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "isValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "FarmProfile" ADD COLUMN     "farmType" TEXT;

-- AlterTable
ALTER TABLE "Farmer" ADD COLUMN     "certificationStatus" TEXT,
ADD COLUMN     "communityId" TEXT,
ADD COLUMN     "cooperativeName" TEXT,
ADD COLUMN     "ghanaCardNumber" TEXT,
ADD COLUMN     "qualityScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "yearsFarming" INTEGER;

-- AlterTable
ALTER TABLE "ProductionRecord" DROP COLUMN "recordedAt",
ADD COLUMN     "actualYieldTon" DECIMAL(10,2),
ADD COLUMN     "cropVariety" TEXT,
ADD COLUMN     "expectedHarvestDate" TIMESTAMP(3),
ADD COLUMN     "expectedYieldTon" DECIMAL(10,2),
ADD COLUMN     "farmProfileId" TEXT,
ADD COLUMN     "farmSizeHectares" DECIMAL(10,2),
ADD COLUMN     "farmingMethod" TEXT,
ADD COLUMN     "harvestDate" TIMESTAMP(3),
ADD COLUMN     "inputsUsed" JSONB,
ADD COLUMN     "irrigationType" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "plantingDate" TIMESTAMP(3),
ADD COLUMN     "plotId" TEXT,
ADD COLUMN     "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "quantityTon" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "temporaryPassword" TEXT;

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "productionRecordId" TEXT NOT NULL,
    "crop" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgronomistDistrict" (
    "id" TEXT NOT NULL,
    "agronomistId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgronomistDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmPlot" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "plotName" TEXT,
    "gpsPolygon" JSONB,
    "plotSizeHectare" DECIMAL(10,2),
    "soilType" TEXT,
    "irrigationSource" TEXT,
    "previousCrop" TEXT,
    "currentCrop" TEXT,
    "plantingSeason" TEXT,
    "ownershipType" TEXT,
    "landDocumentAvailable" BOOLEAN DEFAULT false,
    "environmentalRiskLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmPlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantingActivity" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "productionRecordId" TEXT,
    "cropType" TEXT NOT NULL,
    "varietyName" TEXT,
    "seedSource" TEXT,
    "seedBatchNumber" TEXT,
    "seedQuantityUsed" DECIMAL(10,2),
    "plantingDate" TIMESTAMP(3) NOT NULL,
    "spacingUsed" TEXT,
    "germinationRate" DECIMAL(5,2),
    "fieldOfficerName" TEXT,
    "photosUploaded" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldActivity" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "productionRecordId" TEXT,
    "activityType" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "labourUsed" TEXT,
    "inputUsed" TEXT,
    "quantityApplied" DECIMAL(10,2),
    "quantityUnit" TEXT,
    "weatherCondition" TEXT,
    "performedBy" TEXT,
    "supervisorVerified" BOOLEAN NOT NULL DEFAULT false,
    "geoTaggedPhoto" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputTraceability" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "inputCategory" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "batchNumber" TEXT,
    "supplier" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "quantityUsed" DECIMAL(10,2),
    "quantityUnit" TEXT,
    "applicationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InputTraceability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestRecord" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "productionRecordId" TEXT,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "crop" TEXT NOT NULL,
    "variety" TEXT,
    "quantityHarvested" DECIMAL(12,2),
    "unit" TEXT,
    "harvestMethod" TEXT,
    "harvestTeam" TEXT,
    "initialQualityGrade" TEXT,
    "moistureReading" DECIMAL(5,2),
    "photos" JSONB,
    "supervisorApproved" BOOLEAN NOT NULL DEFAULT false,
    "supervisorName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HarvestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementLog" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "driverName" TEXT,
    "vehicleNumber" TEXT,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3),
    "quantitySent" DECIMAL(12,2),
    "quantityReceived" DECIMAL(12,2),
    "conditionOnArrival" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseEntry" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "harvestId" TEXT,
    "warehouseName" TEXT NOT NULL,
    "warehouseLocation" TEXT,
    "dateIn" TIMESTAMP(3) NOT NULL,
    "dateOut" TIMESTAMP(3),
    "quantityStored" DECIMAL(12,2),
    "stackNumber" TEXT,
    "temperature" DECIMAL(6,2),
    "humidity" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerType" TEXT,
    "quantitySold" DECIMAL(12,2),
    "pricePerUnit" DECIMAL(12,2),
    "totalValue" DECIMAL(14,2),
    "dateSold" TIMESTAMP(3) NOT NULL,
    "destination" TEXT,
    "paymentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityTest" (
    "id" TEXT NOT NULL,
    "harvestId" TEXT NOT NULL,
    "dateTested" TIMESTAMP(3) NOT NULL,
    "moisturePct" DECIMAL(5,2),
    "foreignMatterPct" DECIMAL(5,2),
    "brokenGrainPct" DECIMAL(5,2),
    "colorGrade" TEXT,
    "pestDamage" TEXT,
    "aflatoxinTest" TEXT,
    "passed" BOOLEAN NOT NULL,
    "testedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchId_key" ON "Batch"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "District_regionId_name_key" ON "District"("regionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Community_districtId_name_key" ON "Community"("districtId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AgronomistDistrict_agronomistId_districtId_key" ON "AgronomistDistrict"("agronomistId", "districtId");

-- CreateIndex
CREATE INDEX "PlantingActivity_farmerId_plantingDate_idx" ON "PlantingActivity"("farmerId", "plantingDate");

-- CreateIndex
CREATE INDEX "PlantingActivity_plotId_plantingDate_idx" ON "PlantingActivity"("plotId", "plantingDate");

-- CreateIndex
CREATE INDEX "PlantingActivity_productionRecordId_idx" ON "PlantingActivity"("productionRecordId");

-- CreateIndex
CREATE INDEX "FieldActivity_farmerId_activityDate_idx" ON "FieldActivity"("farmerId", "activityDate");

-- CreateIndex
CREATE INDEX "FieldActivity_plotId_activityDate_idx" ON "FieldActivity"("plotId", "activityDate");

-- CreateIndex
CREATE INDEX "FieldActivity_productionRecordId_idx" ON "FieldActivity"("productionRecordId");

-- CreateIndex
CREATE INDEX "InputTraceability_farmerId_applicationDate_idx" ON "InputTraceability"("farmerId", "applicationDate");

-- CreateIndex
CREATE INDEX "InputTraceability_plotId_applicationDate_idx" ON "InputTraceability"("plotId", "applicationDate");

-- CreateIndex
CREATE INDEX "InputTraceability_inputCategory_idx" ON "InputTraceability"("inputCategory");

-- CreateIndex
CREATE INDEX "HarvestRecord_farmerId_harvestDate_idx" ON "HarvestRecord"("farmerId", "harvestDate");

-- CreateIndex
CREATE INDEX "HarvestRecord_plotId_harvestDate_idx" ON "HarvestRecord"("plotId", "harvestDate");

-- CreateIndex
CREATE INDEX "HarvestRecord_productionRecordId_idx" ON "HarvestRecord"("productionRecordId");

-- CreateIndex
CREATE INDEX "MovementLog_batchId_dispatchDate_idx" ON "MovementLog"("batchId", "dispatchDate");

-- CreateIndex
CREATE INDEX "WarehouseEntry_batchId_dateIn_idx" ON "WarehouseEntry"("batchId", "dateIn");

-- CreateIndex
CREATE INDEX "WarehouseEntry_harvestId_idx" ON "WarehouseEntry"("harvestId");

-- CreateIndex
CREATE INDEX "SalesRecord_batchId_dateSold_idx" ON "SalesRecord"("batchId", "dateSold");

-- CreateIndex
CREATE INDEX "QualityTest_harvestId_dateTested_idx" ON "QualityTest"("harvestId", "dateTested");

-- CreateIndex
CREATE INDEX "QualityTest_passed_idx" ON "QualityTest"("passed");

-- CreateIndex
CREATE UNIQUE INDEX "Farmer_ghanaCardNumber_key" ON "Farmer"("ghanaCardNumber");

-- AddForeignKey
ALTER TABLE "Farmer" ADD CONSTRAINT "Farmer_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_farmProfileId_fkey" FOREIGN KEY ("farmProfileId") REFERENCES "FarmProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "FarmPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productionRecordId_fkey" FOREIGN KEY ("productionRecordId") REFERENCES "ProductionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgronomistDistrict" ADD CONSTRAINT "AgronomistDistrict_agronomistId_fkey" FOREIGN KEY ("agronomistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgronomistDistrict" ADD CONSTRAINT "AgronomistDistrict_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmPlot" ADD CONSTRAINT "FarmPlot_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingActivity" ADD CONSTRAINT "PlantingActivity_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "FarmPlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingActivity" ADD CONSTRAINT "PlantingActivity_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingActivity" ADD CONSTRAINT "PlantingActivity_productionRecordId_fkey" FOREIGN KEY ("productionRecordId") REFERENCES "ProductionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldActivity" ADD CONSTRAINT "FieldActivity_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "FarmPlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldActivity" ADD CONSTRAINT "FieldActivity_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldActivity" ADD CONSTRAINT "FieldActivity_productionRecordId_fkey" FOREIGN KEY ("productionRecordId") REFERENCES "ProductionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputTraceability" ADD CONSTRAINT "InputTraceability_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputTraceability" ADD CONSTRAINT "InputTraceability_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "FarmPlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "FarmPlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestRecord" ADD CONSTRAINT "HarvestRecord_productionRecordId_fkey" FOREIGN KEY ("productionRecordId") REFERENCES "ProductionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementLog" ADD CONSTRAINT "MovementLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseEntry" ADD CONSTRAINT "WarehouseEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseEntry" ADD CONSTRAINT "WarehouseEntry_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "HarvestRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityTest" ADD CONSTRAINT "QualityTest_harvestId_fkey" FOREIGN KEY ("harvestId") REFERENCES "HarvestRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
