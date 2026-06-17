import { prisma } from "@/lib/prisma";

export type BillableResource = "users" | "farmers" | "batches";

export async function getBillingPlanForOrg(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionPlan: true },
  });

  if (!org) return null;

  return prisma.billingPlan.findUnique({
    where: { key: org.subscriptionPlan },
    select: {
      key: true,
      usersLimit: true,
      farmersLimit: true,
      batchesLimit: true,
    },
  });
}

export async function checkPlanLimit(organizationId: string, resource: BillableResource) {
  const plan = await getBillingPlanForOrg(organizationId);
  if (!plan) {
    return { ok: false as const, reason: "missing_plan" as const };
  }

  const limit =
    resource === "users"
      ? plan.usersLimit
      : resource === "farmers"
        ? plan.farmersLimit
        : plan.batchesLimit;

  if (limit <= 0) return { ok: true as const, current: 0, limit };

  const current =
    resource === "users"
      ? await prisma.user.count({ where: { organizationId } })
      : resource === "farmers"
        ? await prisma.farmer.count({ where: { organizationId } })
        : await prisma.batch.count({ where: { organizationId } });

  if (current >= limit) {
    return { ok: false as const, reason: "limit_exceeded" as const, current, limit, planKey: plan.key };
  }

  return { ok: true as const, current, limit, planKey: plan.key };
}

