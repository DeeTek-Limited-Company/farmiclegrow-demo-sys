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

const optionalNonNegativeNumber = z.preprocess(preprocessEmptyNumeric, z.coerce.number().nonnegative()).optional();

const createPlantingSchema = z.object({
  plotId: z.string().cuid(),
  farmerId: z.string().cuid(),
  productionRecordId: z.string().cuid().optional().nullable(),
  cropType: z.string().min(1),
  varietyName: z.string().optional().nullable(),
  seedSource: z.string().optional().nullable(),
  seedBatchNumber: z.string().optional().nullable(),
  seedQuantityUsed: optionalNonNegativeNumber.nullable().optional(),
  plantingDate: z.string().datetime(),
  spacingUsed: z.string().optional().nullable(),
  germinationRate: optionalNonNegativeNumber.nullable().optional(),
  fieldOfficerName: z.string().optional().nullable(),
  photosUploaded: z.any().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const url = new URL(request.url);
  const farmerId = url.searchParams.get("farmerId");
  const plotId = url.searchParams.get("plotId");
  const productionRecordId = url.searchParams.get("productionRecordId");

  const whereClause: any = { organizationId };
  if (farmerId) whereClause.farmerId = farmerId;
  if (plotId) whereClause.plotId = plotId;
  if (productionRecordId) whereClause.productionRecordId = productionRecordId;

  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin") && !actor.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: actor.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const activities = await prisma.plantingActivity.findMany({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
      productionRecord: true,
    },
    orderBy: { plantingDate: "desc" },
    take: 500,
  });

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const payload = await request.json().catch(() => null);
  const parsed = createPlantingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const plot = await prisma.farmPlot.findFirst({
    where: { id: data.plotId, organizationId },
    include: { farmer: { select: { communityId: true } } },
  });
  if (!plot) {
    return NextResponse.json({ message: "Plot not found." }, { status: 404 });
  }
  if (plot.farmerId !== data.farmerId) {
    return NextResponse.json({ message: "Plot does not belong to this farmer." }, { status: 400 });
  }

  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin") && !actor.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: actor.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);

    const communityId = plot.farmer.communityId;
    const districtId = !communityId
      ? null
      : (await prisma.community.findFirst({
          where: { id: communityId, organizationId },
          select: { districtId: true },
        }))?.districtId ?? null;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "You are not assigned to this farmer's district." }, { status: 403 });
    }
  }

  if (data.productionRecordId) {
    const pr = await prisma.productionRecord.findFirst({
      where: { id: data.productionRecordId, organizationId },
      select: { id: true, farmerId: true, plotId: true },
    });
    if (!pr) return NextResponse.json({ message: "Production record not found." }, { status: 404 });
    if (pr.farmerId !== data.farmerId) {
      return NextResponse.json({ message: "Production record does not belong to this farmer." }, { status: 400 });
    }
    if (pr.plotId && pr.plotId !== data.plotId) {
      return NextResponse.json({ message: "Production record is linked to a different plot." }, { status: 400 });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const activity = await tx.plantingActivity.create({
      data: {
        organizationId,
        plotId: data.plotId,
        farmerId: data.farmerId,
        productionRecordId: data.productionRecordId || null,
        cropType: data.cropType,
        varietyName: data.varietyName || null,
        seedSource: data.seedSource || null,
        seedBatchNumber: data.seedBatchNumber || null,
        seedQuantityUsed: data.seedQuantityUsed ?? null,
        plantingDate: new Date(data.plantingDate),
        spacingUsed: data.spacingUsed || null,
        germinationRate: data.germinationRate ?? null,
        fieldOfficerName: data.fieldOfficerName || null,
        photosUploaded: data.photosUploaded ?? null,
      },
    });

    if (activity.productionRecordId) {
      const agg = await tx.plantingActivity.aggregate({
        where: { productionRecordId: activity.productionRecordId, organizationId },
        _min: { plantingDate: true },
      });
      await tx.productionRecord.updateMany({
        where: { id: activity.productionRecordId, organizationId },
        data: { plantingDate: agg._min?.plantingDate ?? null },
      });
    }

    await recomputeFarmerQualityScore(tx, activity.farmerId);
    return activity;
  });

  return NextResponse.json({ activity: created }, { status: 201 });
}
