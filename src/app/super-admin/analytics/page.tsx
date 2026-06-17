import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, PieChart, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AnalyticsPage() {
  await requireRole(["super_admin"]);

  const [totalTonnage, totalFarmers, totalOrgs] = await Promise.all([
    prisma.productionRecord.aggregate({ _sum: { quantityTon: true } }),
    prisma.farmer.count(),
    prisma.organization.count(),
  ]);

  const stats = [
    { label: "Global Tonnage", value: `${Number(totalTonnage._sum.quantityTon || 0).toLocaleString()} MT`, icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Farmers", value: totalFarmers.toLocaleString(), icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Organizations", value: totalOrgs.toLocaleString(), icon: TrendingUp, color: "text-primary", bg: "bg-primary/5" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Platform Analytics</h1>
        <p className="text-slate-500 mt-1 font-medium">Global ecosystem performance and impact metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-[2rem] border-primary/5 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">{s.label}</CardTitle>
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[3rem] border-primary/5 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center p-12">
          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Growth Trends</h3>
          <p className="text-slate-500 font-medium">Monthly onboarding and production growth visualizations are being generated.</p>
        </Card>

        <Card className="rounded-[3rem] border-primary/5 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center p-12">
          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
            <PieChart className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Regional Distribution</h3>
          <p className="text-slate-500 font-medium">Geographic concentration analysis across all tenant organizations.</p>
        </Card>
      </div>
    </div>
  );
}
