import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { ActionTile } from "@/components/dashboard/action-tile";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function GlobalBuyerDashboardPage() {
  const user = await requireRole(["buyer"]);

  const [profile, activeOrders, pendingOrders, activeOffers] = await Promise.all([
    prisma.buyerProfile.findUnique({
      where: { userId: user.id },
    }),
    prisma.order.count({
      where: {
        buyerId: user.id,
        status: { in: ["PENDING", "NEGOTIATING", "CONFIRMED", "DISPATCHED"] },
      },
    }),
    prisma.order.count({
      where: {
        buyerId: user.id,
        status: "PENDING",
      },
    }),
    prisma.marketplaceListing.count({
      where: {
        status: "ACTIVE",
      },
    }),
  ]);

  const hasProfile = !!profile;
  const marketplaceHref = hasProfile ? "/buyer/marketplace" : "/buyer/profile";
  const ordersHref = hasProfile ? "/buyer/orders" : "/buyer/profile";
  const chatHref = hasProfile ? "/buyer/chat" : "/buyer/profile";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Global sourcing</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Global Buyer Dashboard</h1>
          <p className="max-w-2xl text-sm font-medium text-slate-500 sm:text-base">
            Source across verified organizations, track multi-seller orders, and verify traceability from one hub.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl font-black">
          <Link href="/buyer/profile">Edit Profile</Link>
        </Button>
      </div>

      {!hasProfile && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Setup Required</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Please complete your business profile before placing any orders.</span>
            <Button asChild variant="destructive" size="sm" className="w-full sm:w-auto">
              <Link href="/buyer/profile">Setup Profile</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Profile"
          value={hasProfile ? "Ready" : "Blocked"}
          description={hasProfile ? "Your buyer account is ready for global sourcing" : "Complete your profile to unlock marketplace access"}
          href="/buyer/profile"
          tone={hasProfile ? "emerald" : "amber"}
        />
        <MetricCard
          title="Active Orders"
          value={activeOrders}
          description="Orders in motion across all verified sellers"
          href={ordersHref}
          tone="blue"
        />
        <MetricCard
          title="Pending"
          value={pendingOrders}
          description="Negotiations and requests awaiting confirmation"
          href={ordersHref}
          tone="amber"
        />
        <MetricCard
          title="Active Offers"
          value={activeOffers}
          description="Live marketplace listings available across the network"
          href={marketplaceHref}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ActionTile
          title={hasProfile ? "Open Global Marketplace" : "Complete Profile"}
          description={
            hasProfile
              ? "Browse produce across verified organizations and compare supply."
              : "Finish your buyer profile before accessing global sourcing."
          }
          href={marketplaceHref}
          eyebrow="Global sourcing"
        />
        <ActionTile
          title="Track Orders"
          description={hasProfile ? "Follow every order from quote to delivery across sellers." : "Unlock global order tracking after profile setup."}
          href={ordersHref}
          eyebrow="Orders"
        />
        <ActionTile
          title="Open Chat"
          description={hasProfile ? "Continue cross-network conversations and procurement follow-ups." : "Profile setup comes first before messaging opens."}
          href={chatHref}
          eyebrow="Communication"
        />
        <ActionTile
          title="Trace Lookup"
          description="Verify any batch with its QR code or trace identifier."
          href="/trace"
          eyebrow="Trust"
        />
      </div>
    </div>
  );
}
