import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { requireOrgScope } from "@/lib/tenant/scope";

function preprocessEmptyNumeric(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

function preprocessEmptyString(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNonNegativeNumber = z
  .preprocess(preprocessEmptyNumeric, z.coerce.number().nonnegative())
  .optional()
  .nullable();
const optionalCuid = z.preprocess(preprocessEmptyString, z.string().cuid().optional()).nullable();

const productionSchema = z.object({
  farmerId: z.string().cuid(),
  plotId: optionalCuid,
  farmProfileId: optionalCuid,
  season: z.string().min(1, "Season is required"),
  cropType: z.string().min(1, "Crop type is required"),
  cropVariety: z.string().optional().nullable(),
  status: z.enum(["PLANNED", "ACTIVE", "HARVESTED", "COMPLETED"]).default("PLANNED"),
  plantingDate: z.string().datetime().optional().nullable(),
  expectedHarvestDate: z.string().datetime().optional().nullable(),
  actualHarvestDate: z.string().datetime().optional().nullable(),
  harvestDate: z.string().datetime().optional().nullable(),
  expectedYieldTon: optionalNonNegativeNumber,
  quantityTon: optionalNonNegativeNumber,
  actualYieldTon: optionalNonNegativeNumber,
  farmSizeHectares: optionalNonNegativeNumber,
  farmingMethod: z.string().optional().nullable(),
  irrigationType: z.string().optional().nullable(),
  inputsUsed: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops", "farmer"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  const { searchParams } = new URL(request.url);
  const farmerId = searchParams.get("farmerId");

  // Ownership Filtering
  let whereClause: any = { organizationId };

  // Farmers can only see their own records
  if (auth.user.roles.includes("farmer")) {
    const farmer = await prisma.farmer.findFirst({
      where: { externalRef: auth.user.id, organizationId },
      select: { id: true }
    });
    if (!farmer) {
      return NextResponse.json({ records: [] });
    }
    whereClause.farmerId = farmer.id;
  } else if (farmerId) {
    // Agronomists/Admins can filter by farmerId
    whereClause.farmerId = farmerId;
  }

  // Admin/Ops sees all, Agronomist sees their assigned farmers
  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = {
      community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } },
    };
  }

  const records = await prisma.productionRecord.findMany({
    where: whereClause,
    include: {
      farmer: {
        select: { fullName: true, phone: true, ghanaCardNumber: true, primaryCrop: true }
      },
      farmProfile: {
        select: { farmName: true, totalAreaHectare: true }
      },
      plot: {
        select: { id: true, plotName: true, plotSizeHectare: true }
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "farmer"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = productionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { 
    farmerId, 
    plotId,
    farmProfileId, 
    season, 
    cropType, 
    cropVariety, 
    status,
    plantingDate, 
    expectedHarvestDate,
    actualHarvestDate,
    harvestDate,
    expectedYieldTon,
    quantityTon, 
    actualYieldTon, 
    farmSizeHectares,
    farmingMethod,
    irrigationType,
    inputsUsed,
    notes 
  } = parsed.data;
  const resolvedActualHarvestDate = actualHarvestDate ?? harvestDate;

  // Ownership Filtering
  if (auth.user.roles.includes("farmer")) {
    const farmer = await prisma.farmer.findFirst({
      where: { externalRef: auth.user.id, organizationId },
      select: { id: true },
    });
    if (!farmer || farmer.id !== farmerId) {
      return NextResponse.json({ message: "Unauthorized to create records for this farmer." }, { status: 403 });
    }
  }

  const targetFarmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId },
    include: { community: { select: { districtId: true } } },
  });

  if (!targetFarmer) {
    return NextResponse.json({ message: "Farmer not found." }, { status: 404 });
  }

  if (plotId) {
    const plot = await prisma.farmPlot.findFirst({
      where: { id: plotId, organizationId },
      select: { id: true, farmerId: true },
    });
    if (!plot) {
      return NextResponse.json({ message: "Plot not found." }, { status: 404 });
    }
    if (plot.farmerId !== farmerId) {
      return NextResponse.json({ message: "Plot does not belong to this farmer." }, { status: 400 });
    }
  }

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = targetFarmer.community?.districtId;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "You are not assigned to this farmer's district." }, { status: 403 });
    }
  }

  try {
    const record = await prisma.$transaction(async (tx) => {
      const baseData: any = {
        organizationId: targetFarmer.organizationId,
        farmerId,
        plotId: plotId || null,
        farmProfileId: farmProfileId || null,
        season,
        cropType,
        cropVariety: cropVariety || null,
        status: status as any,
        plantingDate: plantingDate ? new Date(plantingDate) : null,
        expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : null,
        expectedYieldTon: expectedYieldTon ?? null,
        quantityTon: quantityTon ?? null,
        actualYieldTon: actualYieldTon ?? null,
        farmSizeHectares: farmSizeHectares ?? null,
        farmingMethod: farmingMethod || null,
        irrigationType: irrigationType || null,
        inputsUsed: inputsUsed || null,
        notes: notes || null,
      };

      const harvestValue = resolvedActualHarvestDate ? new Date(resolvedActualHarvestDate) : null;
      let created: any;
      try {
        created = await tx.productionRecord.create({
          data: {
            ...baseData,
            actualHarvestDate: harvestValue,
          },
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.includes("Unknown argument `actualHarvestDate`")) throw err;
        created = await tx.productionRecord.create({
          data: {
            ...baseData,
            harvestDate: harvestValue,
          },
        });
      }

      await recomputeFarmerQualityScore(tx, farmerId);

      const farmer = await tx.farmer.findFirst({
        where: { id: farmerId, organizationId: targetFarmer.organizationId },
        select: { externalRef: true, fullName: true },
      });

      const adminIds = await tx.userRole.findMany({
        where: { role: { key: "admin" }, user: { organizationId: targetFarmer.organizationId } },
        select: { userId: true },
      });
      const opsIds = await tx.userRole.findMany({
        where: { role: { key: "ops" }, user: { organizationId: targetFarmer.organizationId } },
        select: { userId: true },
      });

      const recipients = new Set<string>();
      recipients.add(auth.user.id);
      adminIds.forEach((a) => recipients.add(a.userId));
      opsIds.forEach((o) => recipients.add(o.userId));
      if (farmer?.externalRef) recipients.add(farmer.externalRef);

      await tx.notification.createMany({
        data: Array.from(recipients).map((userId) => ({
          organizationId: created.organizationId,
          userId,
          type: "SYSTEM",
          title: "Production cycle created",
          body: `${farmer?.fullName ?? "Farmer"}: ${cropType} · ${season} (${status})`,
          metadata: {
            farmerId,
            productionRecordId: created.id,
            status,
          },
        })),
      });

      return created;
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to create production record." }, { status: 500 });
  }
}
