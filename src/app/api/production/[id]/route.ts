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

const optionalNonNegativeNumber = z
  .preprocess(preprocessEmptyNumeric, z.coerce.number().nonnegative())
  .optional()
  .nullable();

const updateSchema = z.object({
  plotId: z.string().cuid().optional().nullable(),
  farmProfileId: z.string().cuid().optional().nullable(),
  season: z.string().min(1).optional(),
  cropType: z.string().min(1).optional(),
  cropVariety: z.string().optional().nullable(),
  status: z.enum(["PLANNED", "ACTIVE", "HARVESTED", "COMPLETED"]).optional(),
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

type RouteCtx = { params: Promise<{ id: string }> };

async function updateProductionRecord(request: Request, context: RouteCtx) {
  const { id } = await context.params;
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const existing = await prisma.productionRecord.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ message: "Record not found" }, { status: 404 });
    }

    if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
      const assignments = await prisma.agronomistDistrict.findMany({
        where: { agronomistId: auth.user.id, organizationId },
        select: { districtId: true },
      });
      const districtIds = assignments.map((a) => a.districtId);
      const isAssigned = await prisma.farmer.findFirst({
        where: {
          id: existing.farmerId,
          organizationId,
          community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } },
        },
        select: { id: true },
      });
      if (!isAssigned) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const data: Record<string, unknown> = { ...parsed.data };

    if (data.plotId) {
      const plotId = data.plotId as string | null;
      if (plotId === null) {
        data.plotId = null;
      } else {
        const plot = await prisma.farmPlot.findFirst({
          where: { id: plotId, organizationId },
          select: { id: true, farmerId: true },
        });
        if (!plot) {
          return NextResponse.json({ message: "Plot not found." }, { status: 404 });
        }
        if (plot.farmerId !== existing.farmerId) {
          return NextResponse.json({ message: "Plot does not belong to this farmer." }, { status: 400 });
        }
      }
    }

    if (data.plantingDate) data.plantingDate = new Date(data.plantingDate as string);
    if (data.expectedHarvestDate) data.expectedHarvestDate = new Date(data.expectedHarvestDate as string);
    if (data.actualHarvestDate) data.actualHarvestDate = new Date(data.actualHarvestDate as string);
    if (data.harvestDate && !data.actualHarvestDate) {
      data.actualHarvestDate = new Date(data.harvestDate as string);
    }
    delete data.harvestDate;

    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });

    const previousStatus = existing.status;

    const record = await prisma.$transaction(async (tx) => {
      let updated: any;
      try {
        const updateResult = await tx.productionRecord.updateMany({
          where: { id, organizationId },
          data: data as any,
        });
        if (updateResult.count !== 1) {
          throw new Error("Record not found");
        }
        updated = await tx.productionRecord.findFirst({
          where: { id, organizationId },
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (!msg.includes("Unknown argument `actualHarvestDate`")) throw err;
        if ("actualHarvestDate" in data) {
          const value = (data as any).actualHarvestDate;
          delete (data as any).actualHarvestDate;
          (data as any).harvestDate = value;
        }
        const updateResult = await tx.productionRecord.updateMany({
          where: { id, organizationId },
          data: data as any,
        });
        if (updateResult.count !== 1) {
          throw new Error("Record not found");
        }
        updated = await tx.productionRecord.findFirst({
          where: { id, organizationId },
        });
      }

      if (!updated) {
        throw new Error("Record not found");
      }

      await recomputeFarmerQualityScore(tx, existing.farmerId);

      if (data.status && previousStatus !== updated.status) {
        const farmer = await tx.farmer.findFirst({
          where: { id: existing.farmerId, organizationId },
          select: { fullName: true },
        });

        const adminIds = await tx.userRole.findMany({
          where: { role: { key: "admin" }, user: { organizationId } },
          select: { userId: true },
        });
        const opsIds = await tx.userRole.findMany({
          where: { role: { key: "ops" }, user: { organizationId } },
          select: { userId: true },
        });

        const recipients = new Set<string>();
        recipients.add(auth.user.id);
        adminIds.forEach((a) => recipients.add(a.userId));
        opsIds.forEach((o) => recipients.add(o.userId));

        await tx.notification.createMany({
          data: Array.from(recipients).map((userId) => ({
            organizationId: updated.organizationId,
            userId,
            type: "SYSTEM",
            title: "Production cycle status updated",
            body: `${farmer?.fullName ?? "Farmer"}: ${previousStatus} → ${updated.status}`,
            metadata: {
              farmerId: existing.farmerId,
              productionRecordId: updated.id,
              from: previousStatus,
              to: updated.status,
            },
          })),
        });
      }

      return updated;
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Failed to update record" }, { status: 500 });
  }
}

export async function GET(request: Request, context: RouteCtx) {
  const { id } = await context.params;
  const auth = await requireApiRole(["admin", "agronomist", "ops", "farmer"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);
  if (auth.user.roles.includes("farmer")) {
    return NextResponse.json(
      { message: "Farmer self-service is not supported in this release." },
      { status: 403 },
    );
  }

  const record = await prisma.productionRecord.findFirst({
    where: { id, organizationId },
    include: {
      farmer: true,
      farmProfile: true,
      plot: true,
    },
  });

  if (!record) {
    return NextResponse.json({ message: "Record not found" }, { status: 404 });
  }

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const isAssigned = await prisma.farmer.findFirst({
      where: {
        id: record.farmerId,
        organizationId,
        community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } },
      },
      select: { id: true },
    });
    if (!isAssigned) return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ record });
}

export async function PUT(request: Request, context: RouteCtx) {
  return updateProductionRecord(request, context);
}

export async function PATCH(request: Request, context: RouteCtx) {
  return updateProductionRecord(request, context);
}

export async function DELETE(request: Request, context: RouteCtx) {
  const { id } = await context.params;
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  try {
    await prisma.productionRecord.deleteMany({
      where: { id, organizationId },
    });
    return NextResponse.json({ message: "Record deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete record" }, { status: 500 });
  }
}
