import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

export async function GET() {
  const auth = await requireApiRole(["admin", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const submissions = await prisma.farmerSubmission.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      farmer: {
        include: {
          farmProfiles: {
            include: { locations: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      submittedBy: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json({ submissions });
}
