import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { cursorFindManyArgs, parseCursorPageParams, toCursorPage } from "@/lib/pagination/cursor";

export async function GET(request: Request) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  const role = searchParams.get("role");
  const { limit, cursor } = parseCursorPageParams(request, { defaultLimit: 200, maxLimit: 1000 });

  try {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (role) {
      where.userRoles = {
        some: {
          role: {
            key: role,
          },
        },
      };
    }

    const usersWithExtra = await prisma.user.findMany({
      where,
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorFindManyArgs({ limit, cursor }),
    });

    const { page: users, pageInfo } = toCursorPage(usersWithExtra, limit);
    return NextResponse.json({ users, pageInfo });
  } catch (error) {
    console.error("Failed to fetch global users:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
