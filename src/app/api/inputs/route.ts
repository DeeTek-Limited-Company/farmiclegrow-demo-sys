import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const createSchema = z.object({
  farmerId: z.string().cuid(),
  plotId: z.string().cuid(),
  inputCategory: z.string().trim().min(1),
  productName: z.string().trim().min(1),
  manufacturer: z.string().trim().min(1).optional().nullable(),
  batchNumber: z.string().trim().min(1).optional().nullable(),
  supplier: z.string().trim().min(1).optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  quantityUsed: optionalNumber.nullable().optional(),
  quantityUnit: z.string().trim().min(1).optional().nullable(),
  applicationDate: z.string().datetime().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const url = new URL(request.url);
  const farmerId = url.searchParams.get("farmerId");
  const plotId = url.searchParams.get("plotId");

  const whereClause: any = {};
  if (farmerId) whereClause.farmerId = farmerId;
  if (plotId) whereClause.plotId = plotId;

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const inputs = await prisma.inputTraceability.findMany({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
    },
    orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
    take: 800,
  });

  return NextResponse.json({ inputs });
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

  const plot = await prisma.farmPlot.findUnique({
    where: { id: data.plotId },
    select: { id: true, farmerId: true, farmer: { select: { communityId: true } } },
  });
  if (!plot) return NextResponse.json({ message: "Plot not found." }, { status: 404 });
  if (plot.farmerId !== data.farmerId) {
    return NextResponse.json({ message: "Plot does not belong to this farmer." }, { status: 400 });
  }

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = plot.farmer.communityId
      ? (await prisma.community.findUnique({ where: { id: plot.farmer.communityId }, select: { districtId: true } }))?.districtId
      : null;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "You are not assigned to this farmer's district." }, { status: 403 });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const input = await tx.inputTraceability.create({
      data: {
        farmerId: data.farmerId,
        plotId: data.plotId,
        inputCategory: data.inputCategory,
        productName: data.productName,
        manufacturer: data.manufacturer || null,
        batchNumber: data.batchNumber || null,
        supplier: data.supplier || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        quantityUsed: data.quantityUsed ?? null,
        quantityUnit: data.quantityUnit || null,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : null,
      },
    });

    await recomputeFarmerQualityScore(tx, input.farmerId);
    return input;
  });

  return NextResponse.json({ input: created }, { status: 201 });
}
