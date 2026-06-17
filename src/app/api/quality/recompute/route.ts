import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { requireOrgScope } from "@/lib/tenant/scope";

const schema = z.object({
  farmerId: z.string().cuid().optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { farmerId, all } = parsed.data;

  if (!farmerId && !all) {
    return NextResponse.json({ message: "Provide farmerId or all=true" }, { status: 400 });
  }

  if (farmerId) {
    const farmer = await prisma.farmer.findFirst({
      where: { id: farmerId, organizationId },
      select: { id: true },
    });
    if (!farmer) {
      return NextResponse.json({ message: "Farmer not found" }, { status: 404 });
    }

    const score = await recomputeFarmerQualityScore(prisma, farmerId);
    return NextResponse.json({ updated: 1, farmerId, score });
  }

  const farmers = await prisma.farmer.findMany({ 
    where: { organizationId },
    select: { id: true } 
  });
  let updated = 0;
  for (const f of farmers) {
    await recomputeFarmerQualityScore(prisma, f.id);
    updated++;
  }

  return NextResponse.json({ updated });
}
