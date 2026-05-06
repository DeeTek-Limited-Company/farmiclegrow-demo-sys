import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{ activityId: string }>;
};

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const updateSchema = z.object({
  productionRecordId: z.string().cuid().optional().nullable(),
  activityType: z.string().trim().min(1).optional(),
  activityDate: z.string().datetime().optional(),
  labourUsed: z.string().trim().min(1).optional().nullable(),
  inputUsed: z.string().trim().min(1).optional().nullable(),
  quantityApplied: optionalNumber.nullable().optional(),
  quantityUnit: z.string().trim().min(1).optional().nullable(),
  weatherCondition: z.string().trim().min(1).optional().nullable(),
  performedBy: z.string().trim().min(1).optional().nullable(),
  supervisorVerified: z.boolean().optional(),
  geoTaggedPhoto: z.any().optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

async function getAuthorizedActivity(authUser: { id: string; roles: string[] }, id: string) {
  const whereClause: any = { id };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  return prisma.fieldActivity.findFirst({
    where: whereClause,
    include: {
      farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      plot: true,
      productionRecord: true,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { activityId } = await context.params;
  const activity = await getAuthorizedActivity(auth.user, activityId);
  if (!activity) return NextResponse.json({ message: "Activity not found or unauthorized." }, { status: 404 });

  return NextResponse.json({ activity });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { activityId } = await context.params;
  const existing = await getAuthorizedActivity(auth.user, activityId);
  if (!existing) return NextResponse.json({ message: "Activity not found or unauthorized." }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.productionRecordId) {
    const pr = await prisma.productionRecord.findUnique({
      where: { id: data.productionRecordId },
      select: { id: true, farmerId: true, plotId: true },
    });
    if (!pr) return NextResponse.json({ message: "Production record not found." }, { status: 404 });
    if (pr.farmerId !== existing.farmerId) {
      return NextResponse.json({ message: "Production record does not belong to this farmer." }, { status: 400 });
    }
    if (pr.plotId && pr.plotId !== existing.plotId) {
      return NextResponse.json({ message: "Production record is linked to a different plot." }, { status: 400 });
    }
  }

  const updated = await prisma.fieldActivity.update({
    where: { id: activityId },
    data: {
      productionRecordId: data.productionRecordId ?? undefined,
      activityType: data.activityType ?? undefined,
      activityDate: data.activityDate ? new Date(data.activityDate) : undefined,
      labourUsed: data.labourUsed ?? undefined,
      inputUsed: data.inputUsed ?? undefined,
      quantityApplied: data.quantityApplied ?? undefined,
      quantityUnit: data.quantityUnit ?? undefined,
      weatherCondition: data.weatherCondition ?? undefined,
      performedBy: data.performedBy ?? undefined,
      supervisorVerified: data.supervisorVerified ?? undefined,
      geoTaggedPhoto: data.geoTaggedPhoto ?? undefined,
      notes: data.notes ?? undefined,
    },
  });

  return NextResponse.json({ activity: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { activityId } = await context.params;
  const existing = await getAuthorizedActivity(auth.user, activityId);
  if (!existing) return NextResponse.json({ message: "Activity not found or unauthorized." }, { status: 404 });

  await prisma.fieldActivity.delete({ where: { id: activityId } });
  return NextResponse.json({ ok: true });
}

