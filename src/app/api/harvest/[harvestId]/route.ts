import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ harvestId: string }>;
};

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const updateSchema = z.object({
  productionRecordId: z.string().cuid().optional().nullable(),
  harvestDate: z.string().datetime().optional(),
  crop: z.string().trim().min(1).optional(),
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

async function getAuthorizedHarvest(authUser: { id: string; roles: string[]; organizationId: string }, harvestId: string) {
  const whereClause: any = { id: harvestId, organizationId: authUser.organizationId };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id, organizationId: authUser.organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  return prisma.harvestRecord.findFirst({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
      productionRecord: true,
      qualityTests: { orderBy: { dateTested: "desc" } },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const user = auth.user;
  const organizationId = requireOrgScope(user);
  const actor = { id: user.id, roles: user.roles, organizationId };

  const { harvestId } = await context.params;
  const harvest = await getAuthorizedHarvest(actor, harvestId);
  if (!harvest) return NextResponse.json({ message: "Harvest record not found or unauthorized." }, { status: 404 });

  return NextResponse.json({ harvest });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const user = auth.user;
  const organizationId = requireOrgScope(user);
  const actor = { id: user.id, roles: user.roles, organizationId };

  const { harvestId } = await context.params;
  const existing = await getAuthorizedHarvest(actor, harvestId);
  if (!existing) return NextResponse.json({ message: "Harvest record not found or unauthorized." }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const prevProductionRecordId = existing.productionRecordId;

  if (data.productionRecordId) {
    const pr = await prisma.productionRecord.findFirst({
      where: { id: data.productionRecordId, organizationId },
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
    const updateResult = await tx.harvestRecord.updateMany({
      where: { id: harvestId, organizationId },
      data: {
        productionRecordId: data.productionRecordId ?? undefined,
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : undefined,
        crop: data.crop ?? undefined,
        variety: data.variety ?? undefined,
        quantityHarvested: data.quantityHarvested ?? undefined,
        unit: data.unit ?? undefined,
        harvestMethod: data.harvestMethod ?? undefined,
        harvestTeam: data.harvestTeam ?? undefined,
        initialQualityGrade: data.initialQualityGrade ?? undefined,
        moistureReading: data.moistureReading ?? undefined,
        photos: data.photos ?? undefined,
        supervisorApproved: data.supervisorApproved ?? undefined,
        supervisorName: data.supervisorName ?? undefined,
        notes: data.notes ?? undefined,
      },
    });

    if (updateResult.count !== 1) {
      throw new Error("Harvest record not found or unauthorized.");
    }

    const next = await tx.harvestRecord.findFirst({
      where: { id: harvestId, organizationId },
    });

    if (!next) {
      throw new Error("Harvest record not found or unauthorized.");
    }

    const ids = new Set<string>();
    if (prevProductionRecordId) ids.add(prevProductionRecordId);
    if (next.productionRecordId) ids.add(next.productionRecordId);

    for (const id of ids) {
      const agg = await tx.harvestRecord.aggregate({
        where: { productionRecordId: id, organizationId },
        _max: { harvestDate: true },
      });
      try {
        await tx.productionRecord.updateMany({
          where: { id, organizationId },
          data: { actualHarvestDate: agg._max?.harvestDate ?? null } as any,
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.includes("Unknown argument `actualHarvestDate`")) throw err;
        await tx.productionRecord.updateMany({
          where: { id, organizationId },
          data: { harvestDate: agg._max?.harvestDate ?? null } as any,
        });
      }
    }

    return next;
  });

  return NextResponse.json({ harvest: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const user = auth.user;
  const organizationId = requireOrgScope(user);
  const actor = { id: user.id, roles: user.roles, organizationId };

  const { harvestId } = await context.params;
  const existing = await getAuthorizedHarvest(actor, harvestId);
  if (!existing) return NextResponse.json({ message: "Harvest record not found or unauthorized." }, { status: 404 });

  const hasBatches = await prisma.batch.findFirst({
    where: { productionRecordId: existing.productionRecordId || "__none__", organizationId },
    select: { id: true },
  });
  if (existing.productionRecordId && hasBatches) {
    return NextResponse.json({ message: "Cannot delete harvest record linked to batches." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.harvestRecord.deleteMany({ where: { id: harvestId, organizationId } });
    if (existing.productionRecordId) {
      const agg = await tx.harvestRecord.aggregate({
        where: { productionRecordId: existing.productionRecordId, organizationId },
        _max: { harvestDate: true },
      });
      try {
        await tx.productionRecord.updateMany({
          where: { id: existing.productionRecordId, organizationId },
          data: { actualHarvestDate: agg._max?.harvestDate ?? null } as any,
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.includes("Unknown argument `actualHarvestDate`")) throw err;
        await tx.productionRecord.updateMany({
          where: { id: existing.productionRecordId, organizationId },
          data: { harvestDate: agg._max?.harvestDate ?? null } as any,
        });
      }
    }
  });
  return NextResponse.json({ ok: true });
}
