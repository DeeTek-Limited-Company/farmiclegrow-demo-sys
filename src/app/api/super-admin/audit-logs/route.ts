import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { cursorFindManyArgs, parseCursorPageParams, toCursorPage } from "@/lib/pagination/cursor";

export async function GET(request: Request) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { limit, cursor } = parseCursorPageParams(request, { defaultLimit: 100, maxLimit: 500 });

  try {
    const logsWithExtra = await prisma.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorFindManyArgs({ limit, cursor }),
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    const { page: logs, pageInfo } = toCursorPage(logsWithExtra, limit);
    return NextResponse.json({ logs, pageInfo });
  } catch (error) {
    console.error("Failed to fetch platform audit logs:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
