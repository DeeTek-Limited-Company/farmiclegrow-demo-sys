import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { GlobalTraceabilityManager } from "@/components/super-admin/global-traceability-manager";

export default async function GlobalTraceabilityPage() {
  await requireRole(["super_admin"]);

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Global Traceability Center</h1>
        <p className="text-slate-500 mt-1 font-medium">Monitor batch lifecycle and QR verification status across all tenant organizations.</p>
      </div>

      <GlobalTraceabilityManager organizations={organizations} />
    </div>
  );
}
