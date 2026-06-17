import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { ActionTile } from "@/components/dashboard/action-tile";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function BuyerDashboardPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const user = await requireRole(["buyer"]);
  const orgBase = `/org/${orgSlug}`;
  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  const organizationId = organization?.id ?? "";

  const [profile, activeOrders, pendingOrders, activeOffers] = await Promise.all([
    prisma.buyerProfile.findUnique({
      where: { userId: user.id },
    }),
    prisma.order.count({
      where: {
        buyerId: user.id,
        organizationId,
        status: { in: ["PENDING", "NEGOTIATING", "CONFIRMED", "DISPATCHED"] },
      },
    }),
    prisma.order.count({
      where: {
        buyerId: user.id,
        organizationId,
        status: "PENDING",
      },
    }),
    prisma.marketplaceListing.count({
      where: {
        organizationId,
        status: "ACTIVE",
      },
    }),
  ]);

  const hasProfile = !!profile;
  const marketplaceHref = hasProfile ? `${orgBase}/buyer/marketplace` : `${orgBase}/buyer/profile`;
  const ordersHref = hasProfile ? `${orgBase}/buyer/orders` : `${orgBase}/buyer/profile`;
  const chatHref = hasProfile ? `${orgBase}/buyer/chat` : `${orgBase}/buyer/profile`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Buyer workspace</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Buyer Dashboard</h1>
          <p className="max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
            Track sourcing readiness, orders, and traceability inside {organization?.name ?? "your organization"}.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl font-black">
          <Link href={`${orgBase}/buyer/profile`}>Edit Profile</Link>
        </Button>
      </div>

      {!hasProfile && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Setup Required</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Please complete your business profile before placing any orders.</span>
            <Button asChild variant="destructive" size="sm" className="w-full sm:w-auto">
              <Link href={`${orgBase}/buyer/profile`}>Setup Profile</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Profile"
          value={hasProfile ? "Ready" : "Blocked"}
          description={hasProfile ? "Business profile is ready for sourcing" : "Complete your profile to unlock ordering"}
          href={`${orgBase}/buyer/profile`}
          tone={hasProfile ? "emerald" : "amber"}
        />
        <MetricCard
          title="Active Orders"
          value={activeOrders}
          description="Orders currently moving through fulfillment"
          href={ordersHref}
          tone="blue"
        />
        <MetricCard
          title="Pending"
          value={pendingOrders}
          description="Requests still waiting for supplier response"
          href={ordersHref}
          tone="amber"
        />
        <MetricCard
          title="Live Offers"
          value={activeOffers}
          description="Marketplace listings available from this organization"
          href={marketplaceHref}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ActionTile
          title={hasProfile ? "Browse Marketplace" : "Complete Profile"}
          description={
            hasProfile
              ? "Source produce from this organization with current live offers."
              : "Finish your buyer profile before browsing and ordering."
          }
          href={marketplaceHref}
          eyebrow="Sourcing"
        />
        <ActionTile
          title="Track Orders"
          description={hasProfile ? "Review negotiations, confirmations, and deliveries." : "Unlock order tracking after profile setup."}
          href={ordersHref}
          eyebrow="Orders"
        />
        <ActionTile
          title="Open Chat"
          description={hasProfile ? "Continue supplier conversations and request updates." : "Profile setup comes first before messaging opens."}
          href={chatHref}
          eyebrow="Communication"
        />
        <ActionTile
          title="Trace Lookup"
          description="Verify a batch using its QR code or trace identifier."
          href="/trace"
          eyebrow="Trust"
        />
      </div>
    </div>
  );
}

