import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Sprout, ArrowUpRight, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AgronomistFarmProfilesPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const whereClause: any = {};
  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const profiles = await prisma.farmProfile.findMany({
    where: whereClause,
    include: {
      farmer: {
        include: {
          community: { include: { district: { include: { region: true } } } },
        },
      },
      locations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 600,
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Sprout className="w-8 h-8 text-primary" />
            Farm Profiles
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Static farm details captured at onboarding. Production cycles live separately under Production.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
          Total: {profiles.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profiles.map((p) => {
          const community = p.farmer.community;
          const district = community?.district;
          const region = district?.region;
          const loc = p.locations[0] || null;

          const area =
            p.farmSize !== null && p.farmSize !== undefined
              ? `${Number(p.farmSize).toFixed(2)} ${p.farmSizeUnit || ""}`.trim()
              : null;

          return (
            <Card key={p.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">
                      {p.farmName || "Unnamed farm"}
                    </CardTitle>
                    <CardDescription className="font-medium">
                      {p.farmer.fullName}
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" className="rounded-2xl font-black">
                    <Link href={`/agronomist/farmers/${p.farmerId}`}>
                      View Farmer <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {area && (
                    <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                      {area}
                    </Badge>
                  )}
                  {p.ownershipType && (
                    <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                      {p.ownershipType}
                    </Badge>
                  )}
                  {p.irrigationType && (
                    <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                      {p.irrigationType}
                    </Badge>
                  )}
                  {p.numberOfPlots !== null && p.numberOfPlots !== undefined && (
                    <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                      Plots: {p.numberOfPlots}
                    </Badge>
                  )}
                </div>

                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="mt-0.5 text-primary">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="font-medium">
                    <div>
                      {(community?.name || loc?.community || "Community?")}, {(district?.name || loc?.district || "District?")}
                    </div>
                    <div className="text-slate-500 font-bold text-xs">
                      {(region?.name || loc?.region || "Region?")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {profiles.length === 0 && (
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-black tracking-tight">No farm profiles yet</CardTitle>
            <CardDescription className="font-medium">
              Create farmers first — a farm profile is created during onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Button asChild className="rounded-2xl font-black h-12">
              <Link href="/agronomist/onboarding">Register Farmer</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

