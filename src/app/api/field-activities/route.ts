import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { requireOrgScope } from "@/lib/tenant/scope";

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const createSchema = z.object({
  plotId: z.string().cuid(),
  farmerId: z.string().cuid(),
  productionRecordId: z.string().cuid().optional().nullable(),
  activityType: z.string().trim().min(1),
  activityDate: z.string().datetime(),
  labourUsed: z.string().trim().min(1).optional().nullable(),
  inputUsed: z.string().trim().min(1).optional().nullable(),
  quantityApplied: optionalNumber.nullable().optional(),
  quantityUnit: z.string().trim().min(1).optional().nullable(),
  weatherCondition: z.string().trim().min(1).optional().nullable(),
  performedBy: z.string().trim().min(1).optional().nullable(),
  supervisorVerified: z.boolean().optional(),
  geoTaggedPhoto: z.any().optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

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

  const activities = await prisma.fieldActivity.findMany({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
      productionRecord: true,
    },
    orderBy: { activityDate: "desc" },
    take: 800,
  });

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
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
  if (!plot) return NextResponse.json({ message: "Plot not found." }, { status: 404 });
  if (plot.farmerId !== data.farmerId) {
    return NextResponse.json({ message: "Plot does not belong to this farmer." }, { status: 400 });
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

  const created = await prisma.$transaction(async (tx) => {
    const activity = await tx.fieldActivity.create({
      data: {
        organizationId,
        plotId: data.plotId,
        farmerId: data.farmerId,
        productionRecordId: data.productionRecordId || null,
        activityType: data.activityType,
        activityDate: new Date(data.activityDate),
        labourUsed: data.labourUsed || null,
        inputUsed: data.inputUsed || null,
        quantityApplied: data.quantityApplied ?? null,
        quantityUnit: data.quantityUnit || null,
        weatherCondition: data.weatherCondition || null,
        performedBy: data.performedBy || null,
        supervisorVerified: data.supervisorVerified ?? false,
        geoTaggedPhoto: data.geoTaggedPhoto ?? null,
        notes: data.notes || null,
      },
    });

    await recomputeFarmerQualityScore(tx, activity.farmerId);
    return activity;
  });

  return NextResponse.json({ activity: created }, { status: 201 });
}
