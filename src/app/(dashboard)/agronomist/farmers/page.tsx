import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { 
  Users, 
  Search, 
  Filter,
  Plus,
  ArrowUpRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PageProps = {
  searchParams?: Promise<{
    districtId?: string;
    communityId?: string;
    status?: string;
    q?: string;
  }>;
};

export default async function AgronomistFarmersPage({ searchParams }: PageProps) {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const sp = (searchParams ? await searchParams : {}) ?? {};
  const districtId = sp.districtId?.trim() ? sp.districtId.trim() : "";
  const communityId = sp.communityId?.trim() ? sp.communityId.trim() : "";
  const status = sp.status?.trim() ? sp.status.trim() : "";
  const q = sp.q?.trim() ? sp.q.trim() : "";

  const districtWhere =
    user.roles.includes("admin") || user.roles.includes("ops")
      ? {}
      : { agronomistDistricts: { some: { agronomistId: user.id } } };

  const farmerWhere: any = {};
  if (districtId) {
    farmerWhere.community = { districtId };
  }
  if (communityId) {
    farmerWhere.communityId = communityId;
  }
  if (!user.roles.includes("admin") && !user.roles.includes("ops")) {
    farmerWhere.community = {
      ...(farmerWhere.community ?? {}),
      district: { agronomistDistricts: { some: { agronomistId: user.id } } },
    };
  }
  if (q) {
    farmerWhere.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { ghanaCardNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) {
    farmerWhere.submissions = { some: { status } };
  }

  const [districts, communityOptions, farmers] = await Promise.all([
    prisma.district.findMany({
      where: {
        ...districtWhere,
        ...(districtId ? { id: districtId } : {}),
      },
      include: { region: true },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
    }),
    districtId
      ? prisma.community.findMany({
          where: {
            districtId,
            district: districtWhere,
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.farmer.findMany({
      where: farmerWhere,
      include: {
        community: {
          include: {
            district: {
              include: { region: true },
            },
          },
        },
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
        farmProfiles: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const totalFarmers = farmers.length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Farmer Directory
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Operational list of farmers in your current scope. Total:{" "}
            <span className="text-primary font-bold">{totalFarmers}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="rounded-2xl h-12 px-6 shadow-xl shadow-primary/20">
            <Link href="/agronomist/onboarding">
              <Plus className="w-4 h-4 mr-2" />
              Register New
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Name, phone, or Ghana Card..."
                  className="pl-12 h-11 rounded-xl bg-white border-slate-200 shadow-sm text-sm font-medium focus-visible:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">District</label>
              <select
                name="districtId"
                defaultValue={districtId}
                className="h-11 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm font-semibold"
              >
                <option value="">All assigned districts</option>
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
                {communityOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                href="/agronomist/farmers"
                className="h-11 px-5 rounded-xl border border-slate-200 bg-white font-black flex items-center"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {districts.length === 0 && !user.roles.includes("admin") && !user.roles.includes("ops") ? (
        <Card className="border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/30">
          <CardHeader>
            <CardTitle className="text-lg font-black">No assigned districts</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-500 font-medium">
            Ask an admin to assign you to one or more districts.
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
          <CardTitle className="text-lg font-black tracking-tight">Farmers Table</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {farmers.length === 0 ? (
            <div className="p-10 text-center text-slate-500 font-medium">
              No farmers match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/40">
                  <TableHead className="px-4">Farmer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Farm Snapshot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quality</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmers.map((f) => {
                  const latestSub = f.submissions[0];
                  const primaryProfile = f.farmProfiles[0];
                  const communityName = f.community?.name ?? "No community";
                  const districtName = f.community?.district.name ?? "No district";
                  const regionName = f.community?.district.region.name ?? "No region";
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="px-4">
                        <div className="font-bold text-slate-900">{f.fullName}</div>
                        <div className="text-xs text-slate-500 font-medium">
                          ID: {f.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{f.phone || "No phone"}</div>
                        <div className="text-xs text-slate-500">{f.ghanaCardNumber || "No Ghana Card"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{communityName}</div>
                        <div className="text-xs text-slate-500">
                          {districtName} · {regionName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{primaryProfile?.farmName || "No farm profile"}</div>
                        <div className="text-xs text-slate-500">
                          {primaryProfile?.farmType || "No farm type"} ·{" "}
                          {primaryProfile?.totalAreaHectare ? `${primaryProfile.totalAreaHectare.toString()} ha` : "No area"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
                        >
                          {latestSub?.status || "NO STATUS"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900">
                        {f.qualityScore}/100
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs font-semibold">
                        {format(new Date(f.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button asChild variant="outline" className="rounded-xl font-bold">
                          <Link href={`/agronomist/farmers/${f.id}`}>
                            View
                            <ArrowUpRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
