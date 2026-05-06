import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const putSchema = z.object({
  districtIds: z.array(z.string().cuid()).max(50),
});

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { userId } = await context.params;

  const assignments = await prisma.agronomistDistrict.findMany({
    where: { agronomistId: userId },
    include: { district: { include: { region: true } } },
    orderBy: [{ district: { region: { name: "asc" } } }, { district: { name: "asc" } }],
  });

  return NextResponse.json({
    districtIds: assignments.map((a) => a.districtId),
    districts: assignments.map((a) => a.district),
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const { userId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const districtIds = Array.from(new Set(parsed.data.districtIds));

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const existingDistricts = await prisma.district.findMany({
    where: { id: { in: districtIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingDistricts.map((d) => d.id));
  const missing = districtIds.filter((id) => !existingIds.has(id));
  if (missing.length > 0) {
    return NextResponse.json({ message: "One or more districts do not exist." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.agronomistDistrict.deleteMany({ where: { agronomistId: userId } });
    if (districtIds.length > 0) {
      await tx.agronomistDistrict.createMany({
        data: districtIds.map((districtId) => ({ agronomistId: userId, districtId })),
      });
    }
  });

  await logAudit({
    action: "AGRONOMIST_ASSIGNMENTS_UPDATED",
    userId: auth.user.id,
    details: { agronomistId: userId, districtIds },
    ip,
    userAgent,
    status: "SUCCESS",
  });

  return NextResponse.json({ ok: true, districtIds });
}
