import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const createSchema = z.object({
  plotId: z.string().cuid(),
  farmerId: z.string().cuid(),
  productionRecordId: z.string().cuid().optional().nullable(),
  harvestDate: z.string().datetime(),
  crop: z.string().trim().min(1),
  variety: z.string().trim().min(1).optional().nullable(),
  quantityHarvested: optionalNumber.nullable().optional(),
  unit: z.string().trim().min(1).optional().nullable(),
  harvestMethod: z.string().trim().min(1).optional().nullable(),
  harvestTeam: z.string().trim().min(1).optional().nullable(),
  initialQualityGrade: z.string().trim().min(1).optional().nullable(),
  moistureReading: optionalNumber.nullable().optional(),
  photos: z.any().optional().nullable(),
  supervisorApproved: z.boolean().optional(),
  supervisorName: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const url = new URL(request.url);
  const farmerId = url.searchParams.get("farmerId");
  const plotId = url.searchParams.get("plotId");
  const productionRecordId = url.searchParams.get("productionRecordId");

  const whereClause: any = {};
  if (farmerId) whereClause.farmerId = farmerId;
  if (plotId) whereClause.plotId = plotId;
  if (productionRecordId) whereClause.productionRecordId = productionRecordId;

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const harvests = await prisma.harvestRecord.findMany({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
      productionRecord: true,
      qualityTests: { orderBy: { dateTested: "desc" }, take: 1 },
    },
    orderBy: { harvestDate: "desc" },
    take: 600,
  });

  return NextResponse.json({ harvests });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const plot = await prisma.farmPlot.findUnique({
    where: { id: data.plotId },
    select: { id: true, farmerId: true, farmer: { select: { communityId: true } } },
  });
  if (!plot) return NextResponse.json({ message: "Plot not found." }, { status: 404 });
  if (plot.farmerId !== data.farmerId) {
    return NextResponse.json({ message: "Plot does not belong to this farmer." }, { status: 400 });
  }

  if (data.productionRecordId) {
    const pr = await prisma.productionRecord.findUnique({
      where: { id: data.productionRecordId },
      select: { id: true, farmerId: true, plotId: true, cropType: true, cropVariety: true },
    });
    if (!pr) return NextResponse.json({ message: "Production record not found." }, { status: 404 });
    if (pr.farmerId !== data.farmerId) {
      return NextResponse.json({ message: "Production record does not belong to this farmer." }, { status: 400 });
    }
    if (pr.plotId && pr.plotId !== data.plotId) {
      return NextResponse.json({ message: "Production record is linked to a different plot." }, { status: 400 });
    }
  }

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = plot.farmer.communityId
      ? (await prisma.community.findUnique({ where: { id: plot.farmer.communityId }, select: { districtId: true } }))?.districtId
      : null;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "You are not assigned to this farmer's district." }, { status: 403 });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const harvest = await tx.harvestRecord.create({
      data: {
        plotId: data.plotId,
        farmerId: data.farmerId,
        productionRecordId: data.productionRecordId || null,
        harvestDate: new Date(data.harvestDate),
        crop: data.crop,
        variety: data.variety || null,
        quantityHarvested: data.quantityHarvested ?? null,
        unit: data.unit || null,
        harvestMethod: data.harvestMethod || null,
        harvestTeam: data.harvestTeam || null,
        initialQualityGrade: data.initialQualityGrade || null,
        moistureReading: data.moistureReading ?? null,
        photos: data.photos ?? null,
        supervisorApproved: data.supervisorApproved ?? false,
        supervisorName: data.supervisorName || null,
        notes: data.notes || null,
      },
    });

    if (harvest.productionRecordId) {
      const agg = await tx.harvestRecord.aggregate({
        where: { productionRecordId: harvest.productionRecordId },
        _max: { harvestDate: true },
      });
      try {
        await tx.productionRecord.update({
          where: { id: harvest.productionRecordId },
          data: { actualHarvestDate: agg._max.harvestDate ?? null } as any,
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.includes("Unknown argument `actualHarvestDate`")) throw err;
        await tx.productionRecord.update({
          where: { id: harvest.productionRecordId },
          data: { harvestDate: agg._max.harvestDate ?? null } as any,
        });
      }
    }

    await recomputeFarmerQualityScore(tx, harvest.farmerId);
    return harvest;
  });

  return NextResponse.json({ harvest: created }, { status: 201 });
}
