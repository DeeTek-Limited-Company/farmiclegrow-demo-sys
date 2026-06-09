import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Activity,
  ArrowUpRight,
  Plus,
  ArrowRight,
  MapPin,
  Package,
  Wheat,
  Sprout
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { requireOrgScope } from "@/lib/tenant/scope";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function AgronomistPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const user = await requireRole(["admin", "agronomist"]);
  const organizationId = requireOrgScope(user);
  const orgBase = `/org/${orgSlug}`;

  const assignedDistrictIds =
    user.roles.includes("agronomist") && !user.roles.includes("admin")
      ? (await prisma.agronomistDistrict.findMany({
          where: { agronomistId: user.id, organizationId },
          select: { districtId: true },
        })).map((a) => a.districtId)
      : null;

  const scopedDistrictIds = assignedDistrictIds?.length ? assignedDistrictIds : assignedDistrictIds ? ["__none__"] : null;
  const farmerScopeWhere = scopedDistrictIds
    ? { organizationId, community: { districtId: { in: scopedDistrictIds } } }
    : { organizationId };
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const [
    totalFarmers,
    pendingSubmissions,
    approvedFarmers,
    recentSubmissions,
    incompleteFarmers,
    districtCount,
    districtPreview,
    phoneComplete,
    dobComplete,
    bioComplete,
    ghanaComplete,
    gpsComplete,
    unvalidatedLocations,
    plannedNoPlanting,
    activeNoPlanting,
    harvestedNoBatch,
  ] = await Promise.all([
    prisma.farmer.count({ where: farmerScopeWhere }),
    prisma.farmerSubmission.count({
      where: {
        status: "PENDING_REVIEW",
        organizationId,
        ...(user.roles.includes("admin") ? {} : { submittedById: user.id }),
      },
    }),
    prisma.farmerSubmission.count({
      where: {
        status: "APPROVED",
        organizationId,
        ...(user.roles.includes("admin") ? {} : { submittedById: user.id }),
      },
    }),
    prisma.farmerSubmission.findMany({
      where: { organizationId, ...(user.roles.includes("admin") ? {} : { submittedById: user.id }) },
      include: { farmer: true },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
    prisma.farmer.findMany({
      where: {
        ...farmerScopeWhere,
        OR: [{ phone: null }, { dateOfBirth: null }, { bio: null }, { ghanaCardNumber: null }],
      },
      include: {
        community: { include: { district: { include: { region: true } } } },
        farmProfiles: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            locations: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ qualityScore: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    scopedDistrictIds
      ? prisma.district.count({ where: { id: { in: scopedDistrictIds }, organizationId } })
      : prisma.district.count({ where: { organizationId } }),
    scopedDistrictIds
      ? prisma.district.findMany({
          where: { id: { in: scopedDistrictIds }, organizationId },
          include: { region: true },
          orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
          take: 6,
        })
      : Promise.resolve([]),
    prisma.farmer.count({ where: { ...farmerScopeWhere, phone: { not: null } } }),
    prisma.farmer.count({ where: { ...farmerScopeWhere, dateOfBirth: { not: null } } }),
    prisma.farmer.count({ where: { ...farmerScopeWhere, bio: { not: null } } }),
    prisma.farmer.count({ where: { ...farmerScopeWhere, ghanaCardNumber: { not: null } } }),
    prisma.farmer.count({
      where: {
        ...farmerScopeWhere,
        farmProfiles: {
          some: {
            locations: {
              some: {
                latitude: { not: null },
                longitude: { not: null },
              },
            },
          },
        },
      },
    }),
    prisma.farmLocation.count({
      where: {
        isValidated: false,
        organizationId,
        farmProfile: { farmer: farmerScopeWhere },
      },
    }),
    prisma.productionRecord.count({
      where: {
        status: "PLANNED",
        createdAt: { lt: twoWeeksAgo },
        plantingActivities: { none: {} },
        organizationId,
        farmer: farmerScopeWhere,
      },
    }),
    prisma.productionRecord.count({
      where: {
        status: "ACTIVE",
        plantingActivities: { none: {} },
        organizationId,
        farmer: farmerScopeWhere,
      },
    }),
    prisma.productionRecord.count({
      where: {
        status: "HARVESTED",
        batches: { none: {} },
        organizationId,
        farmer: farmerScopeWhere,
      },
    }),
  ]);

  const completenessChecks = 5;
  const completenessPct =
    totalFarmers === 0
      ? 0
      : Math.round(
          (100 * (phoneComplete + dobComplete + bioComplete + ghanaComplete + gpsComplete)) /
            (totalFarmers * completenessChecks),
        );

  const districtLabel = scopedDistrictIds ? "Assigned districts" : "All districts";

  const alertRows = incompleteFarmers.map((f) => {
    const missing: string[] = [];
    if (!f.phone) missing.push("Phone");
    if (!f.dateOfBirth) missing.push("DOB");
    if (!f.bio) missing.push("Bio");
    if (!f.ghanaCardNumber) missing.push("Ghana Card");
    const loc = f.farmProfiles[0]?.locations[0];
    const hasGps = Boolean(loc?.latitude != null && loc?.longitude != null);
    if (!hasGps) missing.push("GPS");
    const locationLabel = f.community
      ? `${f.community.name} · ${f.community.district.name}`
      : "No community";
    return { id: f.id, name: f.fullName, missing, locationLabel };
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Field Overview</h1>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            Welcome back, <span className="text-primary font-bold">{user.name}</span>. 
            Here's what's happening in your territory today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="rounded-2xl h-12 px-6 shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Link href={`${orgBase}/agronomist/onboarding`}>
              <Plus className="w-5 h-5 mr-2" />
              Onboard Farmer
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">{districtLabel}</div>
              <div className="text-xl font-black text-slate-900">{districtCount}</div>
              {districtPreview.length ? (
                <div className="text-xs text-slate-500 font-medium mt-1">
                  {districtPreview
                    .map((d) => `${d.region.name} · ${d.name}`)
                    .slice(0, 3)
                    .join(" • ")}
                  {districtCount > 3 ? " …" : ""}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="rounded-2xl font-black">
              <Link href={`${orgBase}/agronomist/districts`}>Open districts</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl font-black">
              <Link href={`${orgBase}/agronomist/locations`}>GPS validations</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Farmers" 
          value={totalFarmers} 
          icon={<Users className="w-6 h-6 text-blue-600" />} 
          tone="blue"
          description="Farmers in your portfolio"
        />
        <StatsCard 
          title="Pending Review" 
          value={pendingSubmissions} 
          icon={<Clock className="w-6 h-6 text-amber-600" />} 
          tone="amber"
          description="Awaiting admin approval"
        />
        <StatsCard 
          title="Approved" 
          value={approvedFarmers} 
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />} 
          tone="emerald"
          description="Verified and active profiles"
        />
        <StatsCard 
          title="Data Quality" 
          value={`${completenessPct}%`} 
          icon={<Activity className="w-6 h-6 text-primary" />} 
          tone="primary"
          description="Avg. profile completeness (5 checks)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ActionCard
          title="Unvalidated GPS"
          value={unvalidatedLocations}
          href={`${orgBase}/agronomist/locations`}
          icon={<MapPin className="w-6 h-6 text-amber-700" />}
          tone="amber"
          description="Locations needing validation"
        />
        <ActionCard
          title="Planned → No Planting"
          value={plannedNoPlanting}
          href={`${orgBase}/agronomist/production`}
          icon={<Sprout className="w-6 h-6 text-blue-700" />}
          tone="blue"
          description="Stale planned cycles"
        />
        <ActionCard
          title="Active → Missing Planting"
          value={activeNoPlanting}
          href={`${orgBase}/agronomist/planting`}
          icon={<Wheat className="w-6 h-6 text-primary" />}
          tone="primary"
          description="Needs planting records"
        />
        <ActionCard
          title="Harvested → No Batch"
          value={harvestedNoBatch}
          href={`${orgBase}/agronomist/batches`}
          icon={<Package className="w-6 h-6 text-emerald-700" />}
          tone="emerald"
          description="Ready for batch creation"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Recent Activity</CardTitle>
                <CardDescription className="font-medium mt-1">Your latest onboarding submissions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="rounded-xl font-bold text-primary hover:bg-primary/5">
                <Link href={`${orgBase}/agronomist/farmers`}>View All <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentSubmissions.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="p-6 hover:bg-slate-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm shrink-0 ${
                        sub.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                        sub.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {sub.farmer.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 group-hover:text-primary transition-colors truncate">{sub.farmer.fullName}</h4>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                          Submitted {format(new Date(sub.submittedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <StatusBadge status={sub.status} />
                      <Button variant="ghost" size="icon" className="rounded-xl sm:opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <Link href={`${orgBase}/agronomist/farmers/${sub.farmerId}`}>
                          <ArrowUpRight className="w-5 h-5 text-slate-400" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-400 font-medium">No recent submissions found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts & Data Quality */}
        <div className="space-y-8">
          <Card className="border-0 bg-red-50/50 shadow-xl shadow-red-100/20 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-bold text-red-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Critical Alerts
              </CardTitle>
              <CardDescription className="text-red-700/60 font-medium italic">Profiles requiring your attention</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              {alertRows.length > 0 ? (
                alertRows.map((row) => (
                  <Link
                    key={row.id}
                    href={`${orgBase}/agronomist/farmers/${row.id}`}
                    className="block p-4 rounded-2xl bg-white border border-red-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-row items-start justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{row.name}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 truncate">
                          {row.locationLabel}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-red-400 shrink-0 mt-1 sm:opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.missing.map((m) => (
                        <Badge
                          key={m}
                          variant="outline"
                          className="rounded-full text-[10px] font-black uppercase tracking-widest bg-white border-red-200 text-red-700"
                        >
                          Missing {m}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center p-4">
                  <p className="text-red-600/50 text-sm font-medium italic">All profiles are healthy!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-primary/5 shadow-xl shadow-primary/5 rounded-[2.5rem] p-8">
            <h4 className="font-bold text-slate-800 mb-2">Quick Tip</h4>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              High-quality profiles with GPS data and Ghana Card uploads are 3x more likely to be approved quickly.
            </p>
          </Card>

          <Card className="border-0 bg-white shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">Quick Actions</CardTitle>
              <CardDescription className="font-medium">Jump into daily field workflows</CardDescription>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="rounded-2xl font-black justify-between">
                <Link href={`${orgBase}/agronomist/onboarding`}>
                  Register farmer <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl font-black justify-between">
                <Link href={`${orgBase}/agronomist/production`}>
                  Production cycles <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl font-black justify-between">
                <Link href={`${orgBase}/agronomist/planting`}>
                  Planting log <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl font-black justify-between">
                <Link href={`${orgBase}/agronomist/harvest`}>
                  Harvest log <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl font-black justify-between">
                <Link href={`${orgBase}/agronomist/batches`}>
                  Create batches <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl font-black justify-between">
                <Link href={`${orgBase}/agronomist/locations`}>
                  Validate GPS <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, tone, description }: any) {
  const toneClass: Record<string, string> = {
    blue: "bg-blue-50",
    amber: "bg-amber-50",
    emerald: "bg-emerald-50",
    primary: "bg-primary/10",
    slate: "bg-slate-50",
  };

  return (
    <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${toneClass[tone] ?? toneClass.slate}`}>
            {icon}
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
          </div>
        </div>
        <p className="text-xs font-bold text-slate-500 leading-relaxed italic border-t border-slate-50 pt-3 mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, value, icon, tone, description, href }: any) {
  const toneClass: Record<string, string> = {
    blue: "bg-blue-50/70 border-blue-100",
    amber: "bg-amber-50/70 border-amber-100",
    emerald: "bg-emerald-50/70 border-emerald-100",
    primary: "bg-primary/5 border-primary/10",
    slate: "bg-slate-50/70 border-slate-100",
  };

  return (
    <Card className={`border shadow-xl shadow-slate-200/30 rounded-[2rem] overflow-hidden ${toneClass[tone] ?? toneClass.slate}`}>
      <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-white/70 border border-white/60 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-widest text-slate-500 truncate">{title}</div>
            <div className="text-2xl font-black text-slate-900">{value}</div>
            <div className="text-[11px] text-slate-500 font-medium truncate">{description}</div>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-2xl font-black w-full sm:w-auto shrink-0">
          <Link href={href}>
            Open <ArrowUpRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
    REJECTED: "bg-red-50 text-red-700 border-red-100",
    PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  };
  
  return (
    <Badge variant="outline" className={`rounded-lg font-black text-[10px] px-2 py-0.5 shadow-sm ${styles[status] || ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
