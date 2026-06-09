import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ testId: string }>;
};

function preprocessEmpty(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

const optionalNumber = z.preprocess(preprocessEmpty, z.coerce.number().nonnegative()).optional();

const updateSchema = z.object({
  dateTested: z.string().datetime().optional(),
  moisturePct: optionalNumber.nullable().optional(),
  foreignMatterPct: optionalNumber.nullable().optional(),
  brokenGrainPct: optionalNumber.nullable().optional(),
  colorGrade: z.string().trim().min(1).optional().nullable(),
  pestDamage: z.string().trim().min(1).optional().nullable(),
  aflatoxinTest: z.string().trim().min(1).optional().nullable(),
  passed: z.boolean().optional(),
  testedBy: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

async function getAuthorizedTest(authUser: { id: string; roles: string[]; organizationId: string }, testId: string) {
  const whereClause: any = { id: testId, organizationId: authUser.organizationId };
  if (authUser.roles.includes("agronomist") && !authUser.roles.includes("admin") && !authUser.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: authUser.id, organizationId: authUser.organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.harvest = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  return prisma.qualityTest.findFirst({
    where: whereClause,
    include: {
      harvest: {
        include: {
          farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
          plot: true,
        },
      },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { testId } = await context.params;
  const test = await getAuthorizedTest({ id: auth.user.id, roles: auth.user.roles, organizationId }, testId);
  if (!test) return NextResponse.json({ message: "Test not found or unauthorized." }, { status: 404 });

  return NextResponse.json({ test });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { testId } = await context.params;
  const existing = await getAuthorizedTest({ id: auth.user.id, roles: auth.user.roles, organizationId }, testId);
  if (!existing) return NextResponse.json({ message: "Test not found or unauthorized." }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.qualityTest.update({
    where: { id: testId, organizationId },
    data: {
      dateTested: data.dateTested ? new Date(data.dateTested) : undefined,
      moisturePct: data.moisturePct ?? undefined,
      foreignMatterPct: data.foreignMatterPct ?? undefined,
      brokenGrainPct: data.brokenGrainPct ?? undefined,
      colorGrade: data.colorGrade ?? undefined,
      pestDamage: data.pestDamage ?? undefined,
      aflatoxinTest: data.aflatoxinTest ?? undefined,
      passed: data.passed ?? undefined,
      testedBy: data.testedBy ?? undefined,
      notes: data.notes ?? undefined,
    },
  });

  return NextResponse.json({ test: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { testId } = await context.params;
  const existing = await getAuthorizedTest({ id: auth.user.id, roles: auth.user.roles, organizationId }, testId);
  if (!existing) return NextResponse.json({ message: "Test not found or unauthorized." }, { status: 404 });

  await prisma.qualityTest.delete({ 
    where: { id: testId, organizationId } 
  });
  return NextResponse.json({ ok: true });
}
