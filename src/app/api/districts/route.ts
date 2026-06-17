import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

const createSchema = z.object({
  name: z.string().min(2, "District name is required"),
  regionId: z.string().cuid("Invalid regionId"),
});

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "ops", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const url = new URL(request.url);
  const regionId = url.searchParams.get("regionId") || undefined;

  let whereClause: any = { organizationId };

  if (regionId) {
    whereClause.regionId = regionId;
  }

  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin") && !actor.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { 
        agronomistId: actor.id,
        organizationId
      },
      select: { districtId: true },
    });
    const allowedDistrictIds = assignments.map((a) => a.districtId);

    if (whereClause.regionId) {
      // If filtering by region, still must be within assigned districts
      whereClause.id = { in: allowedDistrictIds.length ? allowedDistrictIds : ["__none__"] };
    } else {
      whereClause.id = { in: allowedDistrictIds.length ? allowedDistrictIds : ["__none__"] };
    }
  }

  const districts = await prisma.district.findMany({
    where: whereClause,
    include: { region: true },
    orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ districts });
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

  const district = await prisma.district.create({
    data: { organizationId, name: parsed.data.name.trim(), regionId: parsed.data.regionId },
    include: { region: true },
  });

  return NextResponse.json({ district }, { status: 201 });
}
