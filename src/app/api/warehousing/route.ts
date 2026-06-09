import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const createSchema = z.object({
  batchId: z.string().cuid(),
  harvestId: z.string().cuid().optional().nullable(),
  warehouseName: z.string().trim().min(1),
  warehouseLocation: z.string().trim().min(1).optional().nullable(),
  dateIn: z.string().datetime(),
  dateOut: z.string().datetime().optional().nullable(),
  quantityStored: optionalNumber.nullable().optional(),
  stackNumber: z.string().trim().min(1).optional().nullable(),
  temperature: optionalNumber.nullable().optional(),
  humidity: optionalNumber.nullable().optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const url = new URL(request.url);
  const batchId = url.searchParams.get("batchId");

  const whereClause: any = { organizationId };
  if (batchId) whereClause.batchId = batchId;

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.batch = {
      organizationId,
      farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } },
    };
  }

  const entries = await prisma.warehouseEntry.findMany({
    where: whereClause,
    include: {
      batch: { include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } } },
      harvest: true,
    },
    orderBy: { dateIn: "desc" },
    take: 800,
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const batch = await prisma.batch.findFirst({
    where: { id: data.batchId, organizationId },
    include: { farmer: { select: { communityId: true } } },
  });
  if (!batch) return NextResponse.json({ message: "Batch not found." }, { status: 404 });

  if (data.harvestId) {
    const harvest = await prisma.harvestRecord.findFirst({
      where: { id: data.harvestId, organizationId },
      select: { id: true, farmerId: true },
    });
    if (!harvest) return NextResponse.json({ message: "Harvest record not found." }, { status: 404 });
    if (harvest.farmerId !== batch.farmerId) {
      return NextResponse.json({ message: "Harvest record does not belong to the same farmer as this batch." }, { status: 400 });
    }
  }

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = batch.farmer.communityId
      ? (
          await prisma.community.findFirst({
            where: { id: batch.farmer.communityId, organizationId },
            select: { districtId: true },
          })
        )?.districtId
      : null;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "You are not assigned to this batch's district." }, { status: 403 });
    }
  }

  const created = await prisma.warehouseEntry.create({
    data: {
      organizationId: batch.organizationId,
      batchId: data.batchId,
      harvestId: data.harvestId || null,
      warehouseName: data.warehouseName,
      warehouseLocation: data.warehouseLocation || null,
      dateIn: new Date(data.dateIn),
      dateOut: data.dateOut ? new Date(data.dateOut) : null,
      quantityStored: data.quantityStored ?? null,
      stackNumber: data.stackNumber || null,
      temperature: data.temperature ?? null,
      humidity: data.humidity ?? null,
    },
  });

  return NextResponse.json({ entry: created }, { status: 201 });
}
