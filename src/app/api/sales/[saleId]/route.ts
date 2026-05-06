import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{ saleId: string }>;
};

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const updateSchema = z.object({
  buyerName: z.string().trim().min(1).optional(),
  buyerType: z.string().trim().min(1).optional().nullable(),
  quantitySold: optionalNumber.nullable().optional(),
  pricePerUnit: optionalNumber.nullable().optional(),
  totalValue: optionalNumber.nullable().optional(),
  dateSold: z.string().datetime().optional(),
  destination: z.string().trim().min(1).optional().nullable(),
  paymentStatus: z.string().trim().min(1).optional().nullable(),
});

async function getAuthorizedSale(authUser: { id: string; roles: string[] }, saleId: string) {
  const whereClause: any = { id: saleId };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.batch = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  return prisma.salesRecord.findFirst({
    where: whereClause,
    include: {
      batch: { include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } } },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { saleId } = await context.params;
  const sale = await getAuthorizedSale(auth.user, saleId);
  if (!sale) return NextResponse.json({ message: "Sale not found or unauthorized." }, { status: 404 });

  return NextResponse.json({ sale });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { saleId } = await context.params;
  const existing = await getAuthorizedSale(auth.user, saleId);
  if (!existing) return NextResponse.json({ message: "Sale not found or unauthorized." }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.salesRecord.update({
    where: { id: saleId },
    data: {
      buyerName: data.buyerName ?? undefined,
      buyerType: data.buyerType ?? undefined,
      quantitySold: data.quantitySold ?? undefined,
      pricePerUnit: data.pricePerUnit ?? undefined,
      totalValue: data.totalValue ?? undefined,
      dateSold: data.dateSold ? new Date(data.dateSold) : undefined,
      destination: data.destination ?? undefined,
      paymentStatus: data.paymentStatus ?? undefined,
    },
  });

  return NextResponse.json({ sale: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { saleId } = await context.params;
  const existing = await getAuthorizedSale(auth.user, saleId);
  if (!existing) return NextResponse.json({ message: "Sale not found or unauthorized." }, { status: 404 });

  await prisma.salesRecord.delete({ where: { id: saleId } });
  return NextResponse.json({ ok: true });
}

