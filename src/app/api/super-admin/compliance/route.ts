import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

export async function GET() {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const [organizations, farmers, qualityAgg] = await Promise.all([
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              farmers: true,
              batches: true,
              documents: true,
            },
          },
        },
      }),
      prisma.farmer.findMany({
        select: {
          id: true,
          fullName: true,
          qualityScore: true,
          organization: { select: { name: true } },
          _count: { select: { documents: true } },
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.qualityTest.aggregate({
        _avg: {
          moisturePct: true,
        },
      }),
    ]);

    // Calculate score per organization
    const orgCompliance = organizations.map(org => {
      const docRatio = org._count.batches > 0 ? org._count.documents / org._count.batches : 0;
      const score = Math.min(100, (docRatio * 50) + 50); // Simple heuristic
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        score: Math.round(score),
        farmerCount: org._count.farmers,
        batchCount: org._count.batches,
      };
    });

    return NextResponse.json({
      organizations: orgCompliance,
      recentFarmers: farmers,
      globalAvgScore: Math.round(Number(qualityAgg._avg.moisturePct ?? 0)),
    });
  } catch (error) {
    console.error("Failed to fetch compliance data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
