import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Search } from "lucide-react";

export default async function QRMonitoringPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <QrCode className="w-10 h-10 text-primary" />
          QR Monitoring
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Global scan metrics and verification status for all production batches.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900">0</div>
            <p className="text-xs text-slate-400 mt-1">Across all tenants</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 border-2 border-dashed border-slate-100 rounded-[3rem]">
        <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center">
          <Search className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">QR Analytics Coming Soon</h2>
          <p className="text-slate-500 font-medium max-w-md">Detailed scan heatmaps, device breakdown, and verification success rates are being integrated.</p>
        </div>
      </div>
    </div>
  );
}
