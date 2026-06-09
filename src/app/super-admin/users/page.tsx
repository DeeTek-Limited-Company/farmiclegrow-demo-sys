import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { GlobalUserManager } from "@/components/super-admin/global-user-manager";

export default async function GlobalUsersPage() {
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
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Global User Management</h1>
        <p className="text-slate-500 mt-1 font-medium">Monitor and manage all users across the entire FarmicleGrow ecosystem.</p>
      </div>

      <GlobalUserManager organizations={organizations} />
    </div>
  );
}
