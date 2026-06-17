import { requireRole } from "@/lib/auth/server";
import { GlobalBillingManager } from "@/components/super-admin/global-billing-manager";

export default async function BillingPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Billing & Ecosystem Subscriptions</h1>
        <p className="text-slate-500 mt-1 font-medium">Monitor subscription health and resource consumption across all tenant organizations.</p>
      </div>

      <GlobalBillingManager />
    </div>
  );
}
