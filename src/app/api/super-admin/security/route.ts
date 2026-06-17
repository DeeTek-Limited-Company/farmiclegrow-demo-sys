import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { subDays } from "date-fns";

export async function GET() {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const sevenDaysAgo = subDays(new Date(), 7);

    const [failedLogins, activeSessions, highRiskLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          action: "USER_LOGIN_FAILED",
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        include: {
          organization: { select: { name: true, slug: true } },
        },
      }),
      prisma.session.count({
        where: { expiresAt: { gte: new Date() } },
      }),
      prisma.auditLog.findMany({
        where: {
          action: {
            in: ["ORG_DELETED", "USER_DELETED", "ORG_SETTINGS_UPDATED", "PASSWORD_CHANGED"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          organization: { select: { name: true, slug: true } },
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      failedLogins,
      activeSessions,
      highRiskLogs,
    });
  } catch (error) {
    console.error("Failed to fetch security data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
