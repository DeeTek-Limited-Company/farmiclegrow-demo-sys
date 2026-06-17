import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ entryId: string }>;
};

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const updateSchema = z.object({
  harvestId: z.string().cuid().optional().nullable(),
  warehouseName: z.string().trim().min(1).optional(),
  warehouseLocation: z.string().trim().min(1).optional().nullable(),
  dateIn: z.string().datetime().optional(),
  dateOut: z.string().datetime().optional().nullable(),
  quantityStored: optionalNumber.nullable().optional(),
  stackNumber: z.string().trim().min(1).optional().nullable(),
  temperature: optionalNumber.nullable().optional(),
  humidity: optionalNumber.nullable().optional(),
});

async function getAuthorizedEntry(authUser: { id: string; roles: string[]; organizationId: string }, entryId: string) {
  const whereClause: any = { id: entryId, organizationId: authUser.organizationId };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id, organizationId: authUser.organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.batch = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  return prisma.warehouseEntry.findFirst({
    where: whereClause,
    include: {
      batch: { include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } } },
      harvest: true,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { entryId } = await context.params;
  const entry = await getAuthorizedEntry({ id: auth.user.id, roles: auth.user.roles, organizationId }, entryId);
  if (!entry) return NextResponse.json({ message: "Warehouse entry not found or unauthorized." }, { status: 404 });

  return NextResponse.json({ entry });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { entryId } = await context.params;
  const existing = await getAuthorizedEntry({ id: auth.user.id, roles: auth.user.roles, organizationId }, entryId);
  if (!existing) return NextResponse.json({ message: "Warehouse entry not found or unauthorized." }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.harvestId) {
    const harvest = await prisma.harvestRecord.findUnique({
      where: { id: data.harvestId, organizationId },
      select: { id: true, farmerId: true },
    });
    if (!harvest) return NextResponse.json({ message: "Harvest record not found." }, { status: 404 });
    if (harvest.farmerId !== existing.batch.farmerId) {
      return NextResponse.json({ message: "Harvest record does not belong to the same farmer as this batch." }, { status: 400 });
    }
  }

  const updated = await prisma.warehouseEntry.update({
    where: { id: entryId, organizationId },
    data: {
      harvestId: data.harvestId ?? undefined,
      warehouseName: data.warehouseName ?? undefined,
      warehouseLocation: data.warehouseLocation ?? undefined,
      dateIn: data.dateIn ? new Date(data.dateIn) : undefined,
      dateOut: data.dateOut ? new Date(data.dateOut) : data.dateOut === null ? null : undefined,
      quantityStored: data.quantityStored ?? undefined,
      stackNumber: data.stackNumber ?? undefined,
      temperature: data.temperature ?? undefined,
      humidity: data.humidity ?? undefined,
    },
  });

  return NextResponse.json({ entry: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { entryId } = await context.params;
  const existing = await getAuthorizedEntry({ id: auth.user.id, roles: auth.user.roles, organizationId }, entryId);
  if (!existing) return NextResponse.json({ message: "Warehouse entry not found or unauthorized." }, { status: 404 });

  await prisma.warehouseEntry.delete({ 
    where: { id: entryId, organizationId } 
  });
  return NextResponse.json({ ok: true });
}
