import { requireRole } from "@/lib/auth/server";
import { PlatformAuditLogs } from "@/components/super-admin/platform-audit-logs";

export default async function AuditLogsPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Ecosystem Audit Trail</h1>
        <p className="text-slate-500 mt-1 font-medium">A unified ledger of every administrative and security event across all organizations.</p>
      </div>

      <PlatformAuditLogs />
    </div>
  );
}
