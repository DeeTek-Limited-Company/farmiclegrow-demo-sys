import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { toCursorPage } from "@/lib/pagination/cursor";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  plan: z.string().trim().min(1).max(80).optional(),
  status: z.string().trim().min(1).max(40).optional(),
});

function moneyFromCents(amountCents: number, currency: string) {
  return { amountCents, currency };
}

export async function GET(request: Request) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const parsedQuery = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsedQuery.success) {
      return NextResponse.json(
        { message: "Invalid query", errors: parsedQuery.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { limit, cursor, q, plan, status } = parsedQuery.data;

    const plans = await prisma.billingPlan.findMany({
      select: {
        key: true,
        name: true,
        priceCents: true,
        currency: true,
        interval: true,
        usersLimit: true,
        farmersLimit: true,
        batchesLimit: true,
      },
    });

    const planMap = new Map<string, (typeof plans)[number]>(plans.map((p) => [p.key, p]));

    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(plan ? { subscriptionPlan: plan } : {}),
      ...(status ? { subscriptionStatus: status } : {}),
    };

    const organizations = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            farmers: true,
            batches: true,
          },
        },
      },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const projectedMrr = await prisma.organization.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        subscriptionStatus: "ACTIVE",
      },
      select: { subscriptionPlan: true },
    });

    const projectedMrrCents = projectedMrr.reduce((sum, org) => {
      const p = planMap.get(org.subscriptionPlan);
      if (!p) return sum;
      if (p.interval !== "month") return sum;
      return sum + p.priceCents;
    }, 0);

    const activePayingOrgs = await prisma.organization.count({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        subscriptionStatus: "ACTIVE",
      },
    });

    const { page: edges, pageInfo } = toCursorPage(organizations, limit);

    const billingEdges = edges.map((org) => {
      const p = planMap.get(org.subscriptionPlan);
      const usersLimit = p?.usersLimit ?? 0;
      const farmersLimit = p?.farmersLimit ?? 0;
      const batchesLimit = p?.batchesLimit ?? 0;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        orgStatus: org.status,
        plan: org.subscriptionPlan,
        status: org.subscriptionStatus,
        createdAt: org.createdAt,
        price: p ? moneyFromCents(p.priceCents, p.currency) : null,
        interval: p?.interval ?? null,
        usage: {
          users: { current: org._count.users, limit: usersLimit },
          farmers: { current: org._count.farmers, limit: farmersLimit },
          batches: { current: org._count.batches, limit: batchesLimit },
        },
      };
    });

    return NextResponse.json({
      plans,
      billing: { edges: billingEdges, pageInfo },
      metrics: {
        projectedMRR: moneyFromCents(projectedMrrCents, "USD"),
        projectedRevenue: moneyFromCents(projectedMrrCents, "USD"),
        activePayingOrgs,
      },
    });
  } catch (error) {
    console.error("Failed to fetch billing data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
