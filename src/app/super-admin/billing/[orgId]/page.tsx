import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatMoney(amountCents: number, currency: string) {
  const amount = amountCents / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function BillingOrgPage({ params }: { params: Promise<{ orgId: string }> }) {
  await requireRole(["super_admin"]);
  const { orgId } = await params;

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      createdAt: true,
      _count: { select: { users: true, farmers: true, batches: true } },
    },
  });

  if (!organization) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Organization not found</h1>
      </div>
    );
  }

  const plan = await prisma.billingPlan.findUnique({
    where: { key: organization.subscriptionPlan },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{organization.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="font-black text-[10px] bg-slate-100 text-slate-700 border-slate-200">
              {organization.slug}
            </Badge>
            <Badge variant="outline" className="font-black text-[10px]">
              Org: {organization.status}
            </Badge>
            <Badge variant="outline" className="font-black text-[10px]">
              Subscription: {organization.subscriptionStatus}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{organization.subscriptionPlan}</div>
          {plan ? (
            <div className="text-sm font-bold text-slate-500 mt-1">
              {formatMoney(plan.priceCents, plan.currency)}/{plan.interval}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[1.5rem] border-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{organization._count.users}</div>
            <div className="text-xs font-bold text-slate-500 mt-1">Limit: {plan?.usersLimit ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Farmers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{organization._count.farmers}</div>
            <div className="text-xs font-bold text-slate-500 mt-1">Limit: {plan?.farmersLimit ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{organization._count.batches}</div>
            <div className="text-xs font-bold text-slate-500 mt-1">Limit: {plan?.batchesLimit ?? "—"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

