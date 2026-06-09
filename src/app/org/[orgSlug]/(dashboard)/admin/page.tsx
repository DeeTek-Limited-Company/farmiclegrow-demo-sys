import { requireRole } from "@/lib/auth/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { ReviewQueue } from "@/components/admin/review-queue";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationValidateButton } from "@/components/agronomist/location-validate-button";
import { format } from "date-fns";
import { ArrowUpRight, MapPin, Package, ShieldCheck, TrendingUp, Users, Bell, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { requireOrgScope } from "@/lib/tenant/scope";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function AdminPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const user = await requireRole(["admin"]);
  const organizationId = requireOrgScope(user);
  const orgBase = `/org/${orgSlug}`;
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const results = await Promise.all([
    prisma.farmerSubmission.count({ where: { status: "PENDING_REVIEW", organizationId } }),
    prisma.farmerSubmission.count({ where: { status: "APPROVED", organizationId } }),
    prisma.farmerSubmission.count({ where: { status: "REJECTED", organizationId } }),
    prisma.approvalAction.findMany({
      where: { organizationId },
      include: {
        actor: true,
        submission: {
          include: { farmer: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.farmerSubmission.findMany({
      where: { status: "PENDING_REVIEW", organizationId },
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
    }),
    prisma.farmer.count({ where: { organizationId } }),
    prisma.productionRecord.aggregate({ where: { organizationId }, _sum: { quantityTon: true } }),
    prisma.farmer.findMany({ where: { organizationId }, select: { createdAt: true } }),
    prisma.farmer.groupBy({
      where: { organizationId },
      by: ["primaryCrop"],
      _count: { _all: true },
    }),
    prisma.productionRecord.count({ where: { status: "ACTIVE", organizationId } }),
    prisma.batch.count({ where: { organizationId } }),
    prisma.batch.aggregate({ where: { organizationId }, _sum: { quantity: true } }),
    prisma.farmLocation.count({ where: { isValidated: false, organizationId } }),
    prisma.farmer.aggregate({ where: { organizationId }, _avg: { qualityScore: true } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false, organizationId } }),
    prisma.notification.findMany({ where: { userId: user.id, organizationId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.farmLocation.findMany({
      where: { isValidated: false, organizationId },
      include: { farmProfile: { include: { farmer: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.productionRecord.findMany({
      where: { status: { in: ["HARVESTED", "COMPLETED"] }, organizationId },
      include: { farmer: true, batches: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.farmer.findMany({
      where: { qualityScore: { lt: 50 }, organizationId },
      include: { submissions: { orderBy: { submittedAt: "desc" }, take: 1 } },
      orderBy: { qualityScore: "asc" },
      take: 5,
    }),
    prisma.productionRecord.findMany({
      where: {
        status: "PLANNED",
        createdAt: { lt: twoWeeksAgo },
        plantingActivities: { none: {} },
        organizationId,
      },
      include: { farmer: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.productionRecord.findMany({
      where: {
        status: "ACTIVE",
        plantingActivities: { none: {} },
        organizationId,
      },
      include: { farmer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.productionRecord.findMany({
      where: {
        status: "HARVESTED",
        batches: { none: {} },
        organizationId,
      },
      include: { farmer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.batch.findMany({
      where: {
        marketplaceListing: null,
        organizationId,
      },
      include: {
        farmer: true,
        productionRecord: true
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.marketplaceListing.count({ where: { organizationId } })
  ]) as unknown as [
      number,
      number,
      number,
      any[],
      any[],
      number,
      any,
      any[],
      any[],
      number,
      number,
      any,
      number,
      any,
      number,
      any[],
      any[],
      any[],
      any[],
      any[],
      any[],
      any[],
      any[],
      any[],
      number,
    ];

  const [
    pendingCount,
    approvedCount,
    rejectedCount,
    latestActions,
    pendingSubmissions,
    totalFarmers,
    prodSum,
    allFarmersDates,
    cropGrouped,
    activeCycles,
    totalBatches,
    batchSum,
    unvalidatedLocationsCount,
    avgQualityAgg,
    unreadNotifications,
    recentNotifications,
    unvalidatedLocations,
    harvestedCandidates,
    lowQualityFarmers,
    plannedStaleCycles,
    activeNoPlantingCycles,
    harvestedNoBatchCycles,
    unlistedBatches,
    activeListingsCount
  ] = results;
  const serializedPendingSubmissions = JSON.parse(JSON.stringify(pendingSubmissions));

  const totalYield = prodSum._sum.quantityTon?.toNumber() || 0;
  const totalBatchQuantity = batchSum._sum.quantity?.toNumber() || 0;
  const avgQuality = Math.round(avgQualityAgg._avg.qualityScore ?? 0);
  const annualTargetTon = 50000;

  // Process registration data
  const regMap = allFarmersDates.reduce((acc: Record<string, number>, f) => {
    const date = new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const registrationData = Object.entries(regMap)
    .map(([date, count]) => ({ date, count }))
    .slice(-7); // Last 7 active days

  const cropData = cropGrouped.map(c => ({
    name: c.primaryCrop || "Unknown",
    value: c._count._all
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const harvestBacklog = harvestedCandidates
    .map((r: any) => {
      const harvested = r.quantityTon ? Number(r.quantityTon) : null;
      const batched = (r.batches || []).reduce((sum: number, b: any) => sum + Number(b.quantity || 0), 0);
      const remaining = harvested === null ? null : Math.max(0, harvested - batched);
      return { ...r, harvested, batched, remaining };
    })
    .filter((r: any) => r.remaining !== null && r.remaining > 0)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Platform oversight and application review.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Farmers" value={totalFarmers.toLocaleString()} href={`${orgBase}/admin/farmers`} icon={<Users className="w-4 h-4" />} />
        <KpiCard title="Pending Reviews" value={pendingCount.toLocaleString()} href={`${orgBase}/admin`} tone="amber" icon={<AlertCircle className="w-4 h-4" />} />
        <KpiCard title="Active Cycles" value={activeCycles.toLocaleString()} href={`${orgBase}/agronomist/production`} tone="blue" icon={<TrendingUp className="w-4 h-4" />} />
        <KpiCard title="Batches" value={totalBatches.toLocaleString()} href={`${orgBase}/agronomist/batches`} tone="slate" icon={<Package className="w-4 h-4" />} />
        <KpiCard title="Unvalidated GPS" value={unvalidatedLocationsCount.toLocaleString()} href={`${orgBase}/agronomist/locations`} tone="amber" icon={<MapPin className="w-4 h-4" />} />
        <KpiCard title="Avg Quality" value={`${avgQuality}/100`} href={`${orgBase}/admin/farmers`} tone="emerald" icon={<ShieldCheck className="w-4 h-4" />} />
        <KpiCard title="Market Listings" value={activeListingsCount.toLocaleString()} href={`${orgBase}/admin/inventory`} tone="blue" icon={<TrendingUp className="w-4 h-4" />} />
        <KpiCard title="Orders" value={totalBatches.toLocaleString()} href={`${orgBase}/admin/orders`} tone="slate" icon={<Package className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black text-slate-900">{unreadNotifications}</div>
              <Badge variant="outline" className="bg-muted/30">
                <Bell className="w-3 h-3 mr-1" />
                Unread
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Recent activity messages for your admin account.
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl font-bold mt-2">
              <Link href={`${orgBase}/admin/notifications`}>
                Open inbox
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Total Yield</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-black text-slate-900">{totalYield.toLocaleString()}T</div>
            <div className="text-xs text-muted-foreground font-medium">
              Sum of harvested quantity across all production records.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Batch Quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-black text-slate-900">{totalBatchQuantity.toLocaleString()}T</div>
            <div className="text-xs text-muted-foreground font-medium">
              Sum of batch weights created so far.
            </div>
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts registrationData={registrationData} cropData={cropData} currentYieldTon={totalYield} targetYieldTon={annualTargetTon} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Unvalidated Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unvalidatedLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending validations.</p>
            ) : (
              unvalidatedLocations.map((loc: any) => (
                <div key={loc.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate text-sm">{loc.farmProfile.farmer.fullName}</div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {loc.farmProfile.farmName} · {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                    </div>
                  </div>
                  <LocationValidateButton locationId={loc.id} isValidated={loc.isValidated} />
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full rounded-xl font-bold h-8 text-xs">
              <Link href={`${orgBase}/agronomist/locations`}>
                View all
                <ArrowUpRight className="w-3 h-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Harvest → Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {harvestBacklog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No backlog detected.</p>
            ) : (
              harvestBacklog.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate text-sm">{r.farmer.fullName}</div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {r.cropType} · {r.season} · {Number(r.remaining).toFixed(1)}T
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl font-bold h-8 text-xs px-3">
                    <Link href={`${orgBase}/agronomist/batches`}>
                      Create
                    </Link>
                  </Button>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full rounded-xl font-bold h-8 text-xs">
              <Link href={`${orgBase}/agronomist/batches`}>
                Open batches
                <ArrowUpRight className="w-3 h-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Unlisted Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unlistedBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unlisted batches.</p>
            ) : (
              unlistedBatches.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate text-sm">{b.batchId}</div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {b.productionRecord.cropType} · {Number(b.quantity).toFixed(1)}T · {b.farmer.fullName}
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl font-bold h-8 text-xs px-3">
                    <Link href={`${orgBase}/admin/inventory/new?batchId=${b.id}`}>
                      List
                    </Link>
                  </Button>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full rounded-xl font-bold h-8 text-xs">
              <Link href={`${orgBase}/admin/inventory`}>
                View inventory
                <ArrowUpRight className="w-3 h-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Stale Cycles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plannedStaleCycles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stale cycles.</p>
            ) : (
              plannedStaleCycles.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate text-sm">{r.farmer.fullName}</div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {r.cropType} · Planned {format(new Date(r.createdAt), "MMM d")}
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl font-bold h-8 text-xs px-3">
                    <Link href={`${orgBase}/admin/farmers/${r.farmerId}`}>
                      Open
                    </Link>
                  </Button>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full rounded-xl font-bold h-8 text-xs">
              <Link href={`${orgBase}/agronomist/production`}>
                All cycles
                <ArrowUpRight className="w-3 h-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Missing Planting Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeNoPlantingCycles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active cycles missing planting records.</p>
            ) : (
              activeNoPlantingCycles.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate text-sm">{r.farmer.fullName}</div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {r.cropType} · {r.season} · Active {format(new Date(r.createdAt), "MMM d")}
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl font-bold h-8 text-xs px-3">
                    <Link href={`${orgBase}/admin/farmers/${r.farmerId}`}>
                      Open
                    </Link>
                  </Button>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full rounded-xl font-bold h-8 text-xs">
              <Link href={`${orgBase}/agronomist/production`}>
                Open cycles
                <ArrowUpRight className="w-3 h-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Harvested → No Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {harvestedNoBatchCycles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No harvested cycles missing batches.</p>
            ) : (
              harvestedNoBatchCycles.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate text-sm">{r.farmer.fullName}</div>
                    <div className="text-[10px] text-muted-foreground font-medium truncate">
                      {r.cropType} · {r.season}
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl font-bold h-8 text-xs px-3">
                    <Link href={`${orgBase}/agronomist/batches`}>
                      Create
                    </Link>
                  </Button>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full rounded-xl font-bold h-8 text-xs">
              <Link href={`${orgBase}/agronomist/batches`}>
                Open batches
                <ArrowUpRight className="w-3 h-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* The Review Queue uses the actual database structure. It needs to be styled properly, but it functions securely. */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewQueue initialQueue={serializedPendingSubmissions} />
        </CardContent>
      </Card>

      <Card className="shadow-sm border-primary/5">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentNotifications.length === 0 ? (
            <p className="text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((n: any) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.body ?? ""}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-bold whitespace-nowrap">
                    {format(new Date(n.createdAt), "MMM d, h:mm a")}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="outline" className="rounded-xl font-bold">
              <Link href={`${orgBase}/admin/reports`}>
                Reports
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl font-bold">
              <Link href={`${orgBase}/admin/audit`}>
                Audit logs
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent approval audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {latestActions.length === 0 ? <p className="text-muted-foreground">No approval actions logged yet.</p> : null}
          {latestActions.length > 0 ? (
            <ul className="space-y-2">
              {latestActions.map((action) => (
                <li key={action.id} className="text-sm border-b pb-2 last:border-0">
                  <span className="font-medium">{action.actor.fullName}</span> marked <span className="font-medium">{action.submission.farmer.fullName}</span> as <span className="font-bold">{action.action}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  href,
  icon,
  tone = "slate",
}: {
  title: string;
  value: string;
  href: string;
  icon: ReactNode;
  tone?: "slate" | "emerald" | "amber" | "blue";
}) {
  const toneClasses: Record<string, string> = {
    slate: "bg-slate-50/60 border-slate-200 text-slate-900",
    emerald: "bg-emerald-50/60 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50/60 border-amber-200 text-amber-900",
    blue: "bg-blue-50/60 border-blue-200 text-blue-900",
  };

  return (
    <Card className={`shadow-sm ${toneClasses[tone]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="text-2xl font-black">{value}</div>
        <Button asChild variant="ghost" className="h-8 px-3 rounded-xl font-bold">
          <Link href={href}>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
