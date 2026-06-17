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
  harvestId: z.string().cuid(),
  dateTested: z.string().datetime(),
  moisturePct: optionalNumber.nullable().optional(),
  foreignMatterPct: optionalNumber.nullable().optional(),
  brokenGrainPct: optionalNumber.nullable().optional(),
  colorGrade: z.string().trim().min(1).optional().nullable(),
  pestDamage: z.string().trim().min(1).optional().nullable(),
  aflatoxinTest: z.string().trim().min(1).optional().nullable(),
  passed: z.boolean(),
  testedBy: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const url = new URL(request.url);
  const harvestId = url.searchParams.get("harvestId");

  const whereClause: any = {
    organizationId,
  };
  if (harvestId) whereClause.harvestId = harvestId;

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { 
        agronomistId: auth.user.id,
        organizationId
      },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.harvest = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  const tests = await prisma.qualityTest.findMany({
    where: whereClause,
    include: {
      harvest: {
        include: {
          farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
          plot: true,
        },
      },
    },
    orderBy: { dateTested: "desc" },
    take: 800,
  });

  return NextResponse.json({ tests });
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

  const harvest = await prisma.harvestRecord.findUnique({
    where: { id: data.harvestId },
    select: { id: true, farmerId: true, organizationId: true, farmer: { select: { communityId: true } } },
  });
  if (!harvest) return NextResponse.json({ message: "Harvest record not found." }, { status: 404 });
  if (harvest.organizationId !== organizationId) {
    return NextResponse.json({ message: "Access denied." }, { status: 403 });
  }

  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { 
        agronomistId: auth.user.id,
        organizationId
      },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = harvest.farmer.communityId
      ? (await prisma.community.findUnique({ 
          where: { id: harvest.farmer.communityId, organizationId }, 
          select: { districtId: true } 
        }))?.districtId
      : null;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "You are not assigned to this farmer's district." }, { status: 403 });
    }
  }

  const created = await prisma.qualityTest.create({
    data: {
      organizationId: harvest.organizationId,
      harvestId: data.harvestId,
      dateTested: new Date(data.dateTested),
      moisturePct: data.moisturePct ?? null,
      foreignMatterPct: data.foreignMatterPct ?? null,
      brokenGrainPct: data.brokenGrainPct ?? null,
      colorGrade: data.colorGrade || null,
      pestDamage: data.pestDamage || null,
      aflatoxinTest: data.aflatoxinTest || null,
      passed: data.passed,
      testedBy: data.testedBy || null,
      notes: data.notes || null,
    },
  });

  return NextResponse.json({ test: created }, { status: 201 });
}
