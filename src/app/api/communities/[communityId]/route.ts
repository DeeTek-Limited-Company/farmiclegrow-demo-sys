import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ communityId: string }>;
};

const updateSchema = z.object({
  name: z.string().min(2, "Community name is required"),
  districtId: z.string().cuid("Invalid districtId"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
});

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);
  const { communityId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const community = await prisma.community.update({
    where: { id: communityId, organizationId },
    data: {
      name: parsed.data.name.trim(),
      districtId: parsed.data.districtId,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      description: parsed.data.description?.trim() || undefined,
    },
    include: { district: { include: { region: true } } },
  });

  return NextResponse.json({ community });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);
  const { communityId } = await context.params;

  const farmerCount = await prisma.farmer.count({ 
    where: { communityId, organizationId } 
  });
  if (farmerCount > 0) {
    return NextResponse.json({ message: "Cannot delete community with linked farmers." }, { status: 400 });
  }

  await prisma.community.delete({ 
    where: { id: communityId, organizationId } 
  });
  return NextResponse.json({ ok: true });
}
