import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ movementId: string }>;
};

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const updateSchema = z.object({
  fromLocation: z.string().trim().min(1).optional(),
  toLocation: z.string().trim().min(1).optional(),
  driverName: z.string().trim().min(1).optional().nullable(),
  vehicleNumber: z.string().trim().min(1).optional().nullable(),
  dispatchDate: z.string().datetime().optional(),
  arrivalDate: z.string().datetime().optional().nullable(),
  quantitySent: optionalNumber.nullable().optional(),
  quantityReceived: optionalNumber.nullable().optional(),
  conditionOnArrival: z.string().trim().min(1).optional().nullable(),
});

async function getAuthorizedMovement(authUser: { id: string; roles: string[]; organizationId: string }, movementId: string) {
  const whereClause: any = { id: movementId, organizationId: authUser.organizationId };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id, organizationId: authUser.organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.batch = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  return prisma.movementLog.findFirst({
    where: whereClause,
    include: {
      batch: {
        include: {
          farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
        },
      },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { movementId } = await context.params;
  const movement = await getAuthorizedMovement({ id: auth.user.id, roles: auth.user.roles, organizationId }, movementId);
  if (!movement) return NextResponse.json({ message: "Movement not found or unauthorized." }, { status: 404 });

  return NextResponse.json({ movement });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { movementId } = await context.params;
  const existing = await getAuthorizedMovement({ id: auth.user.id, roles: auth.user.roles, organizationId }, movementId);
  if (!existing) return NextResponse.json({ message: "Movement not found or unauthorized." }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.movementLog.update({
    where: { id: movementId, organizationId },
    data: {
      fromLocation: data.fromLocation ?? undefined,
      toLocation: data.toLocation ?? undefined,
      driverName: data.driverName ?? undefined,
      vehicleNumber: data.vehicleNumber ?? undefined,
      dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : undefined,
      arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : data.arrivalDate === null ? null : undefined,
      quantitySent: data.quantitySent ?? undefined,
      quantityReceived: data.quantityReceived ?? undefined,
      conditionOnArrival: data.conditionOnArrival ?? undefined,
    },
  });

  return NextResponse.json({ movement: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { movementId } = await context.params;
  const existing = await getAuthorizedMovement({ id: auth.user.id, roles: auth.user.roles, organizationId }, movementId);
  if (!existing) return NextResponse.json({ message: "Movement not found or unauthorized." }, { status: 404 });

  await prisma.movementLog.delete({ 
    where: { id: movementId, organizationId } 
  });
  return NextResponse.json({ ok: true });
}
