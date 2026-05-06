import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AgronomistDistrictsPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const districtWhere =
    user.roles.includes("admin") || user.roles.includes("ops")
      ? {}
      : { agronomistDistricts: { some: { agronomistId: user.id } } };

  const districts = await prisma.district.findMany({
    where: districtWhere,
    include: {
      region: true,
      communities: { include: { _count: { select: { farmers: true } } }, orderBy: { name: "asc" } },
    },
    orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <MapPin className="w-8 h-8 text-primary" />
          My Districts
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          These are the districts you are authorized to work in.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {districts.map((d) => {
          const farmerCount = d.communities.reduce((sum, c) => sum + c._count.farmers, 0);
          return (
            <Card key={d.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                <CardTitle className="text-xl font-black tracking-tight">
                  {d.name}
                </CardTitle>
                <CardDescription className="font-medium">
                  {d.region.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                    {d.communities.length} communities
                  </Badge>
                  <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                    {farmerCount} farmers
                  </Badge>
                </div>
                <div className="space-y-2">
                  {d.communities.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-2xl bg-white border border-slate-100 p-4">
                      <div className="font-black text-slate-800">{c.name}</div>
                      <Badge variant="outline" className="rounded-full text-[10px] font-black">
                        {c._count.farmers} farmers
                      </Badge>
                    </div>
                  ))}
                  {d.communities.length === 0 ? (
                    <div className="text-sm text-slate-500 font-medium">No communities created yet.</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {districts.length === 0 ? (
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden lg:col-span-2">
            <CardContent className="p-12 text-center text-slate-500 font-medium">
              No districts assigned yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

