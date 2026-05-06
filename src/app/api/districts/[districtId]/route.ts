import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{ districtId: string }>;
};

const updateSchema = z.object({
  name: z.string().min(2, "District name is required"),
  regionId: z.string().cuid("Invalid regionId"),
});

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { districtId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const district = await prisma.district.update({
    where: { id: districtId },
    data: { name: parsed.data.name.trim(), regionId: parsed.data.regionId },
    include: { region: true },
  });

  return NextResponse.json({ district });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { districtId } = await context.params;

  const hasCommunities = await prisma.community.count({ where: { districtId } });
  if (hasCommunities > 0) {
    return NextResponse.json({ message: "Cannot delete district with communities." }, { status: 400 });
  }

  const assigned = await prisma.agronomistDistrict.count({ where: { districtId } });
  if (assigned > 0) {
    return NextResponse.json({ message: "Cannot delete district with agronomist assignments." }, { status: 400 });
  }

  await prisma.district.delete({ where: { id: districtId } });
  return NextResponse.json({ ok: true });
}

