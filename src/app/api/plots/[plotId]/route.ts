import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ plotId: string }>;
};

const updatePlotSchema = z.object({
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

async function getAuthorizedPlot(authUser: { id: string; roles: string[]; organizationId: string }, plotId: string) {
  const whereClause: any = { id: plotId, organizationId: authUser.organizationId };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id, organizationId: authUser.organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  return prisma.farmPlot.findFirst({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const user = auth.user;
  const organizationId = requireOrgScope(user);
  const actor = { id: user.id, roles: user.roles, organizationId };

  const { plotId } = await context.params;
  const plot = await getAuthorizedPlot(actor, plotId);
  if (!plot) {
    return NextResponse.json({ message: "Plot not found or unauthorized." }, { status: 404 });
  }

  return NextResponse.json({ plot });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const user = auth.user;
  const organizationId = requireOrgScope(user);
  const actor = { id: user.id, roles: user.roles, organizationId };

  const { plotId } = await context.params;
  const existing = await getAuthorizedPlot(actor, plotId);
  if (!existing) {
    return NextResponse.json({ message: "Plot not found or unauthorized." }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updatePlotSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.farmPlot.update({
    where: { id: plotId, organizationId },
    data: {
      plotName: data.plotName ?? undefined,
      gpsPolygon: data.gpsPolygon ?? undefined,
      plotSizeHectare: data.plotSizeHectare ?? undefined,
      soilType: data.soilType ?? undefined,
      irrigationSource: data.irrigationSource ?? undefined,
      previousCrop: data.previousCrop ?? undefined,
      currentCrop: data.currentCrop ?? undefined,
      plantingSeason: data.plantingSeason ?? undefined,
      ownershipType: data.ownershipType ?? undefined,
      landDocumentAvailable: data.landDocumentAvailable ?? undefined,
      environmentalRiskLevel: data.environmentalRiskLevel ?? undefined,
    },
  });

  return NextResponse.json({ plot: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const user = auth.user;
  const organizationId = requireOrgScope(user);
  const actor = { id: user.id, roles: user.roles, organizationId };

  const { plotId } = await context.params;
  const existing = await getAuthorizedPlot(actor, plotId);
  if (!existing) {
    return NextResponse.json({ message: "Plot not found or unauthorized." }, { status: 404 });
  }

  const used = await prisma.productionRecord.findFirst({
    where: { plotId, organizationId },
    select: { id: true },
  });
  if (used) {
    return NextResponse.json({ message: "Cannot delete plot with linked production cycles." }, { status: 400 });
  }

  await prisma.farmPlot.delete({ 
    where: { id: plotId, organizationId } 
  });
  return NextResponse.json({ ok: true });
}
