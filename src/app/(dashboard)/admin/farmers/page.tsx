import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PageProps = {
  searchParams?: Promise<{
    regionId?: string;
    districtId?: string;
    communityId?: string;
    status?: string;
  }>;
};

export default async function AdminFarmersPage({ searchParams }: PageProps) {
  await requireRole(["admin"]);

  const sp = (searchParams ? await searchParams : {}) ?? {};
  const regionId = sp.regionId?.trim() ? sp.regionId.trim() : "";
  const districtId = sp.districtId?.trim() ? sp.districtId.trim() : "";
  const communityId = sp.communityId?.trim() ? sp.communityId.trim() : "";
  const status = sp.status?.trim() ? sp.status.trim() : "";

  const [regions, districts, communities] = await Promise.all([
    prisma.region.findMany({ orderBy: { name: "asc" } }),
    prisma.district.findMany({
      where: regionId ? { regionId } : {},
      include: { region: true },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
    }),
    districtId
      ? prisma.community.findMany({
          where: { districtId },
          include: { district: { include: { region: true } }, _count: { select: { farmers: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const districtTree = await prisma.district.findMany({
    where: {
      ...(regionId ? { regionId } : {}),
      ...(districtId ? { id: districtId } : {}),
    },
    include: {
      region: true,
      communities: {
        include: { _count: { select: { farmers: true } } },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
  });

  const farmerWhere: any = communityId ? { communityId } : null;
  if (farmerWhere && status) {
    farmerWhere.submissions = { some: { status } };
  }

  const farmers =
    farmerWhere
      ? await prisma.farmer.findMany({
          where: farmerWhere,
          include: {
            community: { include: { district: { include: { region: true } } } },
            farmProfiles: { orderBy: { createdAt: "desc" }, take: 1 },
            submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Registered Farmers
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          Browse farmers by Region → District → Community. Use filters to narrow down lists.
        </p>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-black tracking-tight">Filters</CardTitle>
          <CardDescription className="font-medium">
            Select a community to view farmers. Region and district filters control the hierarchy view.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Region</label>
              <select
                name="regionId"
                defaultValue={regionId}
                className="h-11 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-semibold"
              >
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">District</label>
              <select
                name="districtId"
                defaultValue={districtId}
                className="h-11 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-semibold"
              >
                <option value="">All districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.region.name} · {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Community</label>
              <select
                name="communityId"
                defaultValue={communityId}
                className="h-11 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-semibold"
              >
                <option value="">{districtId ? "All communities" : "Select a district first"}</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c._count.farmers})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
              <select
                name="status"
                defaultValue={status}
                className="h-11 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-semibold"
              >
                <option value="">All statuses</option>
                <option value="PENDING_REVIEW">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            <div className="md:col-span-4 flex gap-3">
              <button className="h-11 px-5 rounded-xl bg-primary text-white font-black shadow-lg shadow-primary/20">
                Apply
              </button>
              <Link
                href="/admin/farmers"
                className="h-11 px-5 rounded-xl border border-slate-200 bg-white font-black flex items-center"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {districtTree.map((d) => (
          <Card key={d.id} className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black tracking-tight">
                {d.region.name} · {d.name}
              </CardTitle>
              <CardDescription className="font-medium">
                {d.communities.length} communities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {d.communities.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="min-w-0">
                    <div className="font-black text-slate-800 truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                      <Badge variant="outline" className="rounded-full text-[10px] font-black">
                        {c._count.farmers} farmers
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href={`/admin/farmers?regionId=${regionId || d.regionId}&districtId=${districtId || d.id}&communityId=${c.id}${status ? `&status=${encodeURIComponent(status)}` : ""}`}
                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-black text-xs"
                  >
                    View farmers
                  </Link>
                </div>
              ))}
              {d.communities.length === 0 ? (
                <div className="text-sm text-muted-foreground font-medium">No communities yet.</div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {communityId ? (
        <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xl font-black tracking-tight">Farmers</CardTitle>
            <CardDescription className="font-medium">
              Showing {farmers.length} farmers in the selected community.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {farmers.map((f) => (
              <Link
                key={f.id}
                href={`/admin/farmers/${f.id}`}
                className="block rounded-2xl border border-slate-100 bg-white p-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">{f.fullName}</div>
                    <div className="text-xs text-muted-foreground font-bold mt-1">
                      {f.community?.name ? `${f.community.name} · ${f.community.district.name} · ${f.community.district.region.name}` : "No community assigned"}
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px] font-black">
                    {f.submissions[0]?.status || "DRAFT"}
                  </Badge>
                </div>
              </Link>
            ))}
            {farmers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-bold">No farmers found.</div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
