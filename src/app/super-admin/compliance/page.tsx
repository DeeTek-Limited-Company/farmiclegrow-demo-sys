import { requireRole } from "@/lib/auth/server";
import { GlobalComplianceManager } from "@/components/super-admin/global-compliance-manager";

export default async function CompliancePage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Compliance & Quality Control</h1>
        <p className="text-slate-500 mt-1 font-medium">Monitor ecosystem-wide data quality, KYC status, and documentation standards.</p>
      </div>

      <GlobalComplianceManager />
    </div>
  );
}
