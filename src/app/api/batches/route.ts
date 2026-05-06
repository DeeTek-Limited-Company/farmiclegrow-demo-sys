import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { logAudit } from "@/lib/security/audit";

const createBatchSchema = z.object({
  productionRecordId: z.string().cuid(),
  quantityTon: z.coerce.number().positive(),
  harvestDate: z.string().datetime().optional().nullable(),
});

function toCropCode(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) return "CROP";
  return cleaned.slice(0, 4).padEnd(4, "X");
}

function formatSequence(value: number) {
  return value.toString().padStart(4, "0");
}

async function generateBatchId(year: number, cropType: string, attempt: number) {
  const cropCode = toCropCode(cropType);
  const prefix = `FG-${year}-${cropCode}-`;
  const existingCount = await prisma.batch.count({
    where: { batchId: { startsWith: prefix } },
  });
  const seq = existingCount + 1 + attempt;
  return `${prefix}${formatSequence(seq)}`;
}

export async function GET() {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const whereClause: any = {};
  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const batches = await prisma.batch.findMany({
    where: whereClause,
    include: {
      farmer: true,
      productionRecord: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ batches });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const payload = await request.json().catch(() => null);
  const parsed = createBatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { productionRecordId, quantityTon, harvestDate } = parsed.data;

  const record = await prisma.productionRecord.findUnique({
    where: { id: productionRecordId },
    include: {
      farmer: {
        include: { community: true },
      },
      batches: true,
    },
  });

  if (!record) {
    return NextResponse.json({ message: "Production record not found." }, { status: 404 });
  }

  if (
    auth.user.roles.includes("agronomist") &&
    !auth.user.roles.includes("admin") &&
    !auth.user.roles.includes("ops")
  ) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = record.farmer.community?.districtId;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }
  }

  if (record.status !== "HARVESTED" && record.status !== "COMPLETED") {
    return NextResponse.json(
      { message: "Batches can only be created for HARVESTED or COMPLETED cycles." },
      { status: 400 }
    );
  }

  const resolvedHarvestDate = harvestDate
    ? new Date(harvestDate)
    : (record as any).actualHarvestDate
      ? new Date((record as any).actualHarvestDate)
      : (record as any).harvestDate
        ? new Date((record as any).harvestDate)
      : null;

  if (!resolvedHarvestDate || Number.isNaN(resolvedHarvestDate.getTime())) {
    return NextResponse.json(
      { message: "Harvest date is required to create a batch." },
      { status: 400 }
    );
  }

  const existingBatched = record.batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  const plannedHarvest = record.quantityTon ? Number(record.quantityTon) : null;
  if (plannedHarvest !== null && quantityTon > plannedHarvest - existingBatched + 1e-9) {
    return NextResponse.json(
      { message: "Batch quantity exceeds remaining harvest quantity." },
      { status: 400 }
    );
  }

  const year = resolvedHarvestDate.getFullYear();

  for (let attempt = 0; attempt < 10; attempt++) {
    const batchId = await generateBatchId(year, record.cropType, attempt);

    try {
      const batch = await prisma.$transaction(async (tx) => {
        const created = await tx.batch.create({
          data: {
            batchId,
            farmerId: record.farmerId,
            productionRecordId: record.id,
            crop: record.cropType,
            quantity: quantityTon,
            harvestDate: resolvedHarvestDate,
            qrCode: `/trace/${batchId}`,
          },
          include: {
            farmer: true,
            productionRecord: true,
          },
        });

        await recomputeFarmerQualityScore(tx, record.farmerId);

        const adminIds = await tx.userRole.findMany({
          where: { role: { key: "admin" } },
          select: { userId: true },
        });
        const opsIds = await tx.userRole.findMany({
          where: { role: { key: "ops" } },
          select: { userId: true },
        });

        const recipients = new Set<string>();
        recipients.add(auth.user.id);
        adminIds.forEach((a) => recipients.add(a.userId));
        opsIds.forEach((o) => recipients.add(o.userId));
        if (created.farmer.externalRef) recipients.add(created.farmer.externalRef);

        await tx.notification.createMany({
          data: Array.from(recipients).map((userId) => ({
            userId,
            type: "SYSTEM",
            title: "New batch created",
            body: `Batch ${created.batchId} created for ${created.crop} (${Number(created.quantity).toFixed(2)}T).`,
            metadata: {
              batchId: created.batchId,
              productionRecordId: created.productionRecordId,
              farmerId: created.farmerId,
            },
          })),
        });

        return created;
      });

      await logAudit({
        action: "BATCH_CREATED",
        userId: auth.user.id,
        details: {
          batchId: batch.batchId,
          batchDbId: batch.id,
          farmerId: batch.farmerId,
          productionRecordId: batch.productionRecordId,
          quantityTon: Number(batch.quantity),
        },
        ip,
        userAgent,
        status: "SUCCESS",
      });

      return NextResponse.json({ batch }, { status: 201 });
    } catch (error: any) {
      if (error?.code !== "P2002") {
        console.error(error);
        await logAudit({
          action: "BATCH_CREATED",
          userId: auth.user.id,
          details: {
            productionRecordId,
            error: error?.message || String(error),
          },
          ip,
          userAgent,
          status: "FAILURE",
        });
        return NextResponse.json({ message: "Failed to create batch." }, { status: 500 });
      }
    }
  }

  return NextResponse.json(
    { message: "Failed to allocate a unique batch ID. Please retry." },
    { status: 500 }
  );
}
