import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const createSchema = z.object({
  batchId: z.string().cuid(),
  buyerName: z.string().trim().min(1),
  buyerType: z.string().trim().min(1).optional().nullable(),
  quantitySold: optionalNumber.nullable().optional(),
  pricePerUnit: optionalNumber.nullable().optional(),
  totalValue: optionalNumber.nullable().optional(),
  dateSold: z.string().datetime(),
  destination: z.string().trim().min(1).optional().nullable(),
  paymentStatus: z.string().trim().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const url = new URL(request.url);
  const batchId = url.searchParams.get("batchId");

  const whereClause: any = {};
  if (batchId) whereClause.batchId = batchId;

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.batch = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  const sales = await prisma.salesRecord.findMany({
    where: whereClause,
    include: {
      batch: { include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } } },
    },
    orderBy: { dateSold: "desc" },
    take: 800,
  });

  return NextResponse.json({ sales });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const batch = await prisma.batch.findUnique({
    where: { id: data.batchId },
    include: { farmer: { select: { communityId: true } } },
  });
  if (!batch) return NextResponse.json({ message: "Batch not found." }, { status: 404 });

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = batch.farmer.communityId
      ? (await prisma.community.findUnique({ where: { id: batch.farmer.communityId }, select: { districtId: true } }))?.districtId
      : null;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "You are not assigned to this batch's district." }, { status: 403 });
    }
  }

  const created = await prisma.salesRecord.create({
    data: {
      batchId: data.batchId,
      buyerName: data.buyerName,
      buyerType: data.buyerType || null,
      quantitySold: data.quantitySold ?? null,
      pricePerUnit: data.pricePerUnit ?? null,
      totalValue: data.totalValue ?? null,
      dateSold: new Date(data.dateSold),
      destination: data.destination || null,
      paymentStatus: data.paymentStatus || null,
    },
  });

  return NextResponse.json({ sale: created }, { status: 201 });
}

