import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Table, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ExportCenterPage() {
  await requireRole(["super_admin"]);

  const exportTypes = [
    { name: "Organization Directory", description: "Full list of tenants with contact and status info.", icon: Table, format: "CSV/XLSX" },
    { name: "Global Production Data", description: "Aggregate harvest and batch data across all tenants.", icon: FileDown, format: "CSV/JSON" },
    { name: "Audit Trail (Full)", description: "Complete history of system events for compliance.", icon: FileText, format: "XLSX" },
    { name: "Ecosystem KPIs", description: "Summary metrics for stakeholders and government reporting.", icon: FileJson, format: "PDF/JSON" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Export Center</h1>
        <p className="text-slate-500 mt-1 font-medium">Generate and download ecosystem-wide data reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportTypes.map((type) => (
          <Card key={type.name} className="rounded-[2.5rem] border-primary/5 shadow-sm p-8 hover:border-primary/20 transition-colors">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                  <type.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{type.name}</h3>
                  <p className="text-slate-500 font-medium mt-1">{type.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Formats:</span>
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">{type.format}</span>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl font-bold">Generate</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
