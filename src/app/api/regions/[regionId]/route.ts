import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{ regionId: string }>;
};

const updateSchema = z.object({
  name: z.string().min(2, "Region name is required"),
});

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { regionId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const region = await prisma.region.update({
    where: { id: regionId },
    data: { name: parsed.data.name.trim() },
  });

  return NextResponse.json({ region });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { regionId } = await context.params;

  const districtCount = await prisma.district.count({ where: { regionId } });
  if (districtCount > 0) {
    return NextResponse.json({ message: "Cannot delete region with districts." }, { status: 400 });
  }

  await prisma.region.delete({ where: { id: regionId } });
  return NextResponse.json({ ok: true });
}

