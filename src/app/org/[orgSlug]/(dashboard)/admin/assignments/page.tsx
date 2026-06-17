import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";
import { AgronomistAssignmentManager } from "@/components/admin/agronomist-assignment-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminAssignmentsPage() {
  await requireRole(["admin"]);

  const [agronomists, districts, perDistrict, perAgronomist] = await Promise.all([
    prisma.user.findMany({
      where: { userRoles: { some: { role: { key: "agronomist" } } } },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.district.findMany({
      include: { region: true },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.agronomistDistrict.groupBy({
      by: ["districtId"],
      _count: { _all: true },
    }),
    prisma.agronomistDistrict.groupBy({
      by: ["agronomistId"],
      _count: { _all: true },
    }),
  ]);

  const districtCountMap = new Map(perDistrict.map((r) => [r.districtId, r._count._all]));
  const unassignedDistricts = districts.filter((d) => (districtCountMap.get(d.id) ?? 0) === 0).slice(0, 12);
  const agronomistCountMap = new Map(perAgronomist.map((r) => [r.agronomistId, r._count._all]));

  const agronomistsWithCounts = agronomists
    .map((a) => ({ ...a, districtCount: agronomistCountMap.get(a.id) ?? 0 }))
    .sort((a, b) => b.districtCount - a.districtCount)
    .slice(0, 8);

  const totalAssignments = perAgronomist.reduce((sum, r) => sum + r._count._all, 0);
  const avgPerAgronomist = agronomists.length ? Math.round((totalAssignments / agronomists.length) * 10) / 10 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-primary" />
          Agronomist Assignment
        </h1>
        <p className="text-muted-foreground mt-2">
          Assign agronomists to one or more districts. This controls which communities and farmers they can access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 bg-primary/[0.01]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Districts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{districts.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Unassigned Districts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-700">
              {districts.filter((d) => (districtCountMap.get(d.id) ?? 0) === 0).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Avg Districts / Agronomist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{avgPerAgronomist}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold">Coverage Gaps</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {districts.filter((d) => (districtCountMap.get(d.id) ?? 0) === 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">All districts have at least one agronomist assigned.</p>
            ) : (
              unassignedDistricts.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{d.region.name} · {d.name}</div>
                    <div className="text-xs text-muted-foreground font-medium truncate">No agronomist assigned</div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800">
                    Unassigned
                  </Badge>
                </div>
              ))
            )}
            {districts.filter((d) => (districtCountMap.get(d.id) ?? 0) === 0).length > unassignedDistricts.length ? (
              <p className="text-xs text-muted-foreground font-medium">
                Showing {unassignedDistricts.length} of {districts.filter((d) => (districtCountMap.get(d.id) ?? 0) === 0).length}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <CardTitle className="text-lg font-bold">Top Assigned Agronomists</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {agronomistsWithCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agronomists found.</p>
            ) : (
              agronomistsWithCounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{a.fullName}</div>
                    <div className="text-xs text-muted-foreground font-medium truncate">{a.email}</div>
                  </div>
                  <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-800">
                    {a.districtCount} districts
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AgronomistAssignmentManager
        agronomists={JSON.parse(JSON.stringify(agronomists))}
        districts={JSON.parse(JSON.stringify(districts))}
      />
    </div>
  );
}
