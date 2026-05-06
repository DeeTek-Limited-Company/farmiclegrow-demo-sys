import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function recomputeFarmerQualityScore(db: Db, farmerId: string) {
  const farmer = await db.farmer.findUnique({
    where: { id: farmerId },
    include: {
      farmProfiles: { include: { locations: true } },
      productionRecords: { select: { plantingDate: true, status: true, quantityTon: true, actualYieldTon: true, actualHarvestDate: true } as any },
      documents: { select: { status: true } },
      certifications: { select: { id: true } },
      batches: { select: { id: true } },
      _count: {
        select: {
          plantingActivities: true,
          fieldActivities: true,
          inputTraceabilities: true,
          harvestRecords: true,
        },
      },
      submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });

  if (!farmer) return null;

  let score = 0;

  if (farmer.phone) score += 10;
  if (farmer.gender) score += 5;
  if (farmer.dateOfBirth) score += 5;
  if (farmer.bio) score += 5;
  if (farmer.ghanaCardNumber) score += 15;

  const profile = farmer.farmProfiles[0];
  if (profile?.farmName) score += 5;
  if (farmer.primaryCrop) score += 5;
  if (profile?.farmSize) score += 10;
  if (profile?.ownershipType) score += 5;
  if (profile?.irrigationType) score += 5;
  if (profile?.totalAreaHectare) score += 5;

  const locations = farmer.farmProfiles.flatMap((p) => p.locations);
  if (locations.length > 0) score += 5;
  if (locations.some((l) => l.isValidated)) score += 15;
  if (locations.some((l) => l.latitude !== null && l.latitude !== undefined && l.longitude !== null && l.longitude !== undefined)) score += 5;

  const hasProduction = farmer.productionRecords.length > 0;
  if (hasProduction) score += 5;
  if (farmer.productionRecords.some((r: any) => r.plantingDate)) score += 5;
  if (farmer.productionRecords.some((r: any) => r.status === "ACTIVE" || r.status === "HARVESTED" || r.status === "COMPLETED")) score += 5;
  if (farmer.productionRecords.some((r: any) => r.actualHarvestDate || r.quantityTon || r.actualYieldTon)) score += 5;

  if (farmer._count.plantingActivities > 0) score += 5;
  if (farmer._count.fieldActivities > 0) score += 3;
  if (farmer._count.inputTraceabilities > 0) score += 3;
  if (farmer._count.harvestRecords > 0) score += 5;

  if (farmer.certifications.length > 0) score += 5;
  const verifiedDocs = farmer.documents.filter((d) => d.status === "VERIFIED").length;
  if (verifiedDocs > 0) score += 10;

  if (farmer.batches.length > 0) score += 10;

  const latestStatus = farmer.submissions[0]?.status;
  if (latestStatus === "APPROVED") score += 5;

  if (score > 100) score = 100;

  await db.farmer.update({
    where: { id: farmerId },
    data: { qualityScore: score },
  });

  return score;
}
