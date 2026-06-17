import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ inputId: string }>;
};

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const updateSchema = z.object({
  inputCategory: z.string().trim().min(1).optional(),
  productName: z.string().trim().min(1).optional(),
  manufacturer: z.string().trim().min(1).optional().nullable(),
  batchNumber: z.string().trim().min(1).optional().nullable(),
  supplier: z.string().trim().min(1).optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  quantityUsed: optionalNumber.nullable().optional(),
  quantityUnit: z.string().trim().min(1).optional().nullable(),
  applicationDate: z.string().datetime().optional().nullable(),
});

async function getAuthorizedInput(authUser: { id: string; roles: string[]; organizationId: string }, inputId: string) {
  const whereClause: any = { id: inputId, organizationId: authUser.organizationId };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id, organizationId: authUser.organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  return prisma.inputTraceability.findFirst({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { inputId } = await context.params;
  const input = await getAuthorizedInput({ id: auth.user.id, roles: auth.user.roles, organizationId }, inputId);
  if (!input) return NextResponse.json({ message: "Input record not found or unauthorized." }, { status: 404 });

  return NextResponse.json({ input });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { inputId } = await context.params;
  const existing = await getAuthorizedInput({ id: auth.user.id, roles: auth.user.roles, organizationId }, inputId);
  if (!existing) return NextResponse.json({ message: "Input record not found or unauthorized." }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.inputTraceability.update({
    where: { id: inputId, organizationId },
    data: {
      inputCategory: data.inputCategory ?? undefined,
      productName: data.productName ?? undefined,
      manufacturer: data.manufacturer ?? undefined,
      batchNumber: data.batchNumber ?? undefined,
      supplier: data.supplier ?? undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : data.purchaseDate === null ? null : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : data.expiryDate === null ? null : undefined,
      quantityUsed: data.quantityUsed ?? undefined,
      quantityUnit: data.quantityUnit ?? undefined,
      applicationDate: data.applicationDate ? new Date(data.applicationDate) : data.applicationDate === null ? null : undefined,
    },
  });

  return NextResponse.json({ input: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { inputId } = await context.params;
  const existing = await getAuthorizedInput({ id: auth.user.id, roles: auth.user.roles, organizationId }, inputId);
  if (!existing) return NextResponse.json({ message: "Input record not found or unauthorized." }, { status: 404 });

  await prisma.inputTraceability.delete({ 
    where: { id: inputId, organizationId } 
  });
  return NextResponse.json({ ok: true });
}
