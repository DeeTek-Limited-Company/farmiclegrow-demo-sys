import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{ activityId: string }>;
};

function preprocessEmptyNumeric(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNonNegativeNumber = z.preprocess(preprocessEmptyNumeric, z.coerce.number().nonnegative()).optional();

const updatePlantingSchema = z.object({
  productionRecordId: z.string().cuid().optional().nullable(),
  cropType: z.string().min(1).optional(),
  varietyName: z.string().optional().nullable(),
  seedSource: z.string().optional().nullable(),
  seedBatchNumber: z.string().optional().nullable(),
  seedQuantityUsed: optionalNonNegativeNumber.nullable().optional(),
  plantingDate: z.string().datetime().optional(),
  spacingUsed: z.string().optional().nullable(),
  germinationRate: optionalNonNegativeNumber.nullable().optional(),
  fieldOfficerName: z.string().optional().nullable(),
  photosUploaded: z.any().optional().nullable(),
});

async function getAuthorizedActivity(authUser: { id: string; roles: string[] }, id: string) {
  const whereClause: any = { id };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  return prisma.plantingActivity.findFirst({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
      productionRecord: true,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { activityId } = await context.params;
  const activity = await getAuthorizedActivity(auth.user, activityId);
  if (!activity) {
    return NextResponse.json({ message: "Activity not found or unauthorized." }, { status: 404 });
  }

  return NextResponse.json({ activity });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { activityId } = await context.params;
  const existing = await getAuthorizedActivity(auth.user, activityId);
  if (!existing) {
    return NextResponse.json({ message: "Activity not found or unauthorized." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updatePlantingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const prevProductionRecordId = existing.productionRecordId;

  if (data.productionRecordId) {
    const pr = await prisma.productionRecord.findUnique({
      where: { id: data.productionRecordId },
      select: { id: true, farmerId: true, plotId: true },
    });
    if (!pr) return NextResponse.json({ message: "Production record not found." }, { status: 404 });
    if (pr.farmerId !== existing.farmerId) {
      return NextResponse.json({ message: "Production record does not belong to this farmer." }, { status: 400 });
    }
    if (pr.plotId && pr.plotId !== existing.plotId) {
      return NextResponse.json({ message: "Production record is linked to a different plot." }, { status: 400 });
    }
  }
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.plantingActivity.update({
      where: { id: activityId },
      data: {
        productionRecordId: data.productionRecordId ?? undefined,
        cropType: data.cropType ?? undefined,
        varietyName: data.varietyName ?? undefined,
        seedSource: data.seedSource ?? undefined,
        seedBatchNumber: data.seedBatchNumber ?? undefined,
        seedQuantityUsed: data.seedQuantityUsed ?? undefined,
        plantingDate: data.plantingDate ? new Date(data.plantingDate) : undefined,
        spacingUsed: data.spacingUsed ?? undefined,
        germinationRate: data.germinationRate ?? undefined,
        fieldOfficerName: data.fieldOfficerName ?? undefined,
        photosUploaded: data.photosUploaded ?? undefined,
      },
    });

    const ids = new Set<string>();
    if (prevProductionRecordId) ids.add(prevProductionRecordId);
    if (next.productionRecordId) ids.add(next.productionRecordId);

    for (const id of ids) {
      const agg = await tx.plantingActivity.aggregate({
        where: { productionRecordId: id },
        _min: { plantingDate: true },
      });
      await tx.productionRecord.update({
        where: { id },
        data: { plantingDate: agg._min.plantingDate ?? null },
      });
    }

    return next;
  });
  return NextResponse.json({ activity: updated });
}


export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { activityId } = await context.params;
  const existing = await getAuthorizedActivity(auth.user, activityId);
  if (!existing) {
    return NextResponse.json({ message: "Activity not found or unauthorized." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.plantingActivity.delete({ where: { id: activityId } });
    if (existing.productionRecordId) {
      const agg = await tx.plantingActivity.aggregate({
        where: { productionRecordId: existing.productionRecordId },
        _min: { plantingDate: true },
      });
      await tx.productionRecord.update({
        where: { id: existing.productionRecordId },
        data: { plantingDate: agg._min.plantingDate ?? null },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
