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
  const visibility = searchParams.get("visibility");
  const { limit, cursor } = parseCursorPageParams(request, { defaultLimit: 100, maxLimit: 500 });

  try {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (visibility) where.publicTraceVisibility = visibility;

    const [batchesWithExtra, stats] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          organization: {
            select: {
              name: true,
              slug: true,
            },
          },
          farmer: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...cursorFindManyArgs({ limit, cursor }),
      }),
      prisma.$transaction([
        prisma.batch.count({ where: { publicTraceVisibility: "INHERIT" } }),
        prisma.batch.count({ where: { publicTraceVisibility: "PUBLIC" } }),
        prisma.batch.count({ where: { publicTraceVisibility: "PRIVATE" } }),
        prisma.batch.count({ where: { publicTraceVisibility: "LIMITED" } }),
      ]),
    ]);

    const { page: batches, pageInfo } = toCursorPage(batchesWithExtra, limit);
    return NextResponse.json({ 
      batches,
      pageInfo,
      stats: {
        inherit: stats[0],
        public: stats[1],
        private: stats[2],
        limited: stats[3],
        total: stats[0] + stats[1] + stats[2] + stats[3],
      }
    });
  } catch (error) {
    console.error("Failed to fetch global batches:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
