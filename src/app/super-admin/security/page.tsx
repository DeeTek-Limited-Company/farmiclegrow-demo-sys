import { requireRole } from "@/lib/auth/server";
import { GlobalSecurityManager } from "@/components/super-admin/global-security-manager";

export default async function SecurityCenterPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Platform Security Center</h1>
        <p className="text-slate-500 mt-1 font-medium">Global monitoring of authentication trends, session health, and sensitive system events.</p>
      </div>

      <GlobalSecurityManager />
    </div>
  );
}
