import { requireRole } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Globe, Shield, Database, Lock, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PlatformSettingsPage() {
  await requireRole(["super_admin"]);

  const sections = [
    { title: "General Settings", description: "Platform name, logo, and global contact details.", icon: Globe },
    { title: "Authentication", description: "SSO, MFA requirements, and session policies.", icon: Lock },
    { title: "Security & Privacy", description: "Encryption, data retention, and compliance standards.", icon: Shield },
    { title: "System Health", description: "Database status, API latency, and server logs.", icon: Server },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 leading-none">Platform Settings</h1>
        <p className="text-slate-500 mt-2 font-medium">Configure global parameters and security policies for the entire ecosystem.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((s) => (
          <Card key={s.title} className="rounded-[3rem] border-primary/5 shadow-sm p-8 hover:bg-slate-50/50 transition-colors group cursor-pointer">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
                <s.icon className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 leading-tight">{s.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{s.description}</p>
                <div className="pt-4 flex items-center gap-2">
                  <Button variant="link" className="p-0 h-auto text-xs font-black uppercase tracking-widest text-primary hover:no-underline">Configure Section →</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[3rem] border-primary/5 shadow-sm overflow-hidden border-rose-100">
        <div className="p-8 bg-rose-50/50 border-b border-rose-100">
          <h3 className="text-xl font-black text-rose-600 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Critical Infrastructure
          </h3>
        </div>
        <CardContent className="p-8 space-y-6">
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            Actions here affect all tenants and data integrity. Use extreme caution when modifying database connection strings or global encryption keys.
          </p>
          <div className="flex gap-4">
            <Button variant="destructive" className="rounded-xl font-black shadow-lg shadow-rose-100">Flush Platform Cache</Button>
            <Button variant="outline" className="rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50">Maintenance Mode</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
