import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MapPin, ArrowUpRight, CheckCircle2, AlertCircle, Navigation } from "lucide-react";
import { LocationValidateButton } from "@/components/agronomist/location-validate-button";

export default async function AgronomistLocationsPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const whereClause: any = {};
  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmProfile = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  const locations = await prisma.farmLocation.findMany({
    where: whereClause,
    include: {
      farmProfile: {
        include: { farmer: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-primary" />
            Farm Locations
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Validate GPS coordinates and keep location data clean for traceability.
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Location Registry
          </CardTitle>
          <CardDescription className="font-medium">
            Click “Open Map” to inspect the GPS point, then validate it.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {locations.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-slate-50/30">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-400 font-bold text-lg uppercase tracking-widest">
                No locations yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {locations.map((loc) => {
                const lat = Number(loc.latitude);
                const lng = Number(loc.longitude);
                const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

                return (
                  <div key={loc.id} className="p-6 hover:bg-slate-50/30 transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900 tracking-tight">
                            {loc.farmProfile.farmer.fullName}
                          </h3>
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-600">
                            {loc.farmProfile.farmName}
                          </Badge>
                          {loc.isValidated ? (
                            <Badge variant="outline" className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Validated
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full font-black text-[10px] bg-amber-50 border-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Unvalidated
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 font-medium">
                          {(loc.community || "").trim() ? `${loc.community}, ` : ""}
                          {(loc.district || "").trim() ? `${loc.district}, ` : ""}
                          {loc.region || "Ghana"}
                        </p>

                        <p className="text-[11px] font-mono text-slate-400">
                          LAT {lat.toFixed(7)} · LNG {lng.toFixed(7)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-2xl border-slate-200 font-black h-10"
                        >
                          <Link href={mapUrl} target="_blank">
                            Open Map
                            <ArrowUpRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>

                        <LocationValidateButton locationId={loc.id} isValidated={loc.isValidated} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
