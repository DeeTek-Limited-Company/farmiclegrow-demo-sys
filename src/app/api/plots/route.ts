import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

const createPlotSchema = z.object({
  farmerId: z.string().cuid(),
  plotName: z.string().trim().min(1).optional().nullable(),
  gpsPolygon: z.any().optional().nullable(),
  plotSizeHectare: z.coerce.number().positive().optional().nullable(),
  soilType: z.string().trim().min(1).optional().nullable(),
  irrigationSource: z.string().trim().min(1).optional().nullable(),
  previousCrop: z.string().trim().min(1).optional().nullable(),
  currentCrop: z.string().trim().min(1).optional().nullable(),
  plantingSeason: z.string().trim().min(1).optional().nullable(),
  ownershipType: z.string().trim().min(1).optional().nullable(),
  landDocumentAvailable: z.boolean().optional().nullable(),
  environmentalRiskLevel: z.string().trim().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const farmerId = url.searchParams.get("farmerId");

  const whereClause: any = {};
  if (farmerId) {
    whereClause.farmerId = farmerId;
  }

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const plots = await prisma.farmPlot.findMany({
    where: whereClause,
    include: {
      farmer: {
        include: {
          community: { include: { district: { include: { region: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ plots });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createPlotSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const allowed = await prisma.farmer.findFirst({
      where: {
        id: data.farmerId,
        community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } },
      },
      select: { id: true },
    });
    if (!allowed) {
      return NextResponse.json({ message: "You are not assigned to this farmer's district." }, { status: 403 });
    }
  }

  const plot = await prisma.farmPlot.create({
    data: {
      farmerId: data.farmerId,
      plotName: data.plotName || null,
      gpsPolygon: data.gpsPolygon ?? null,
      plotSizeHectare: data.plotSizeHectare ?? null,
      soilType: data.soilType || null,
      irrigationSource: data.irrigationSource || null,
      previousCrop: data.previousCrop || null,
      currentCrop: data.currentCrop || null,
      plantingSeason: data.plantingSeason || null,
      ownershipType: data.ownershipType || null,
      landDocumentAvailable: data.landDocumentAvailable ?? false,
      environmentalRiskLevel: data.environmentalRiskLevel || null,
    },
  });

  return NextResponse.json({ plot }, { status: 201 });
}

