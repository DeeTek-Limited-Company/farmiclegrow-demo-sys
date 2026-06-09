import { requireRole } from "@/lib/auth/server";
import { BillingPlanManager } from "@/components/super-admin/billing-plan-manager";

export default async function SubscriptionPlansPage() {
  await requireRole(["super_admin"]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <BillingPlanManager />
    </div>
  );
}
