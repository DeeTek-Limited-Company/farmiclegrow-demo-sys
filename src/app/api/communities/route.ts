import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

const createSchema = z.object({
  name: z.string().min(2, "Community name is required"),
  districtId: z.string().cuid("Invalid districtId"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "ops", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const url = new URL(request.url);
  const districtId = url.searchParams.get("districtId") || undefined;

  let whereClause: any = { organizationId };

  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin") && !actor.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { 
        agronomistId: actor.id,
        organizationId
      },
      select: { districtId: true },
    });
    const allowedDistrictIds = assignments.map((a) => a.districtId);
    
    if (districtId) {
      // If a specific district is requested, ensure it's in the allowed list
      if (!allowedDistrictIds.includes(districtId)) {
        return NextResponse.json({ communities: [] });
      }
      whereClause.districtId = districtId;
    } else {
      // Otherwise return all communities in all allowed districts
      whereClause.districtId = { in: allowedDistrictIds.length ? allowedDistrictIds : ["__none__"] };
    }
  } else if (districtId) {
    whereClause.districtId = districtId;
  }

  const communities = await prisma.community.findMany({
    where: whereClause,
    include: {
      district: { include: { region: true } },
      _count: { select: { farmers: true } },
    },
    orderBy: [{ district: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ communities });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const community = await prisma.community.create({
    data: {
      organizationId,
      name: parsed.data.name.trim(),
      districtId: parsed.data.districtId,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      description: parsed.data.description?.trim() || undefined,
    },
    include: { district: { include: { region: true } } },
  });

  return NextResponse.json({ community }, { status: 201 });
}
