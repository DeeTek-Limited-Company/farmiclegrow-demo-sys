import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AgronomistCommunitiesPage() {
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
          <Users className="w-8 h-8 text-primary" />
          Communities
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Communities available within your assigned districts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {districts.map((d) => (
          <Card key={d.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-black tracking-tight">
                {d.name}
              </CardTitle>
              <CardDescription className="font-medium">{d.region.name}</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-3">
              {d.communities.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="min-w-0">
                    <div className="font-black text-slate-800 truncate">{c.name}</div>
                    <div className="mt-1">
                      <Badge variant="outline" className="rounded-full text-[10px] font-black">
                        {c._count.farmers} farmers
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href={`/agronomist/farmers?districtId=${d.id}&communityId=${c.id}`}
                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-black text-xs"
                  >
                    View farmers
                  </Link>
                </div>
              ))}
              {d.communities.length === 0 ? (
                <div className="text-sm text-slate-500 font-medium">No communities created yet.</div>
              ) : null}
            </CardContent>
          </Card>
        ))}

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

